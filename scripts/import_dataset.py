"""
Deterministic, Idempotent Dataset Ingestion Script.
Implements the 25-step pipeline defined in Section 6.3 of master_build_prompt.md.
"""

import os
import glob
import uuid
import json
import logging
from pathlib import Path
from typing import Dict, Any, List
import openpyxl
import soundfile as sf
from sqlalchemy.orm import Session

from apps.api.app.core.database import SessionLocal, engine, Base
from apps.api.app.models.entities import (
    Language,
    DatasetVersion,
    Speaker,
    VocabularyEntry,
    AudioAsset,
    AudioSegment,
    EmbeddingRecord,
    VectorReplicationStatus,
    Role,
    User,
)
from apps.api.app.core.security import hash_password
from services.audio.preprocessing import AudioPreprocessor
from services.embeddings.xlsr_encoder import XLSREncoder
from services.vector_store.base import compute_vector_id, VectorRecord
from services.vector_store.manager import VectorStoreRouter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("import_dataset")


def run_ingestion(
    excel_path: str = "Mother Tongue Recordings Log.xlsx",
    version_name: str = "v1.0.0",
    embed_vectors: bool = True,
    max_items_limit: int = 0  # 0 for all records
):
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    preprocessor = AudioPreprocessor()
    encoder = XLSREncoder() if embed_vectors else None
    vector_router = VectorStoreRouter()

    # 1. Ensure Default Roles & Admin Account exist
    roles = ["student", "teacher", "admin"]
    for r_name in roles:
        r = db.query(Role).filter(Role.role_name == r_name).first()
        if not r:
            db.add(Role(role_name=r_name))
    db.commit()

    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_role = db.query(Role).filter(Role.role_name == "admin").first()
        admin_user = User(
            username="admin",
            email="admin@language.ai",
            password_hash=hash_password("Admin@12345"),
            display_name="System Administrator",
            status="active"
        )
        admin_user.roles.append(admin_role)
        db.add(admin_user)
        db.commit()
        logger.info("Created initial Administrator account: admin / Admin@12345")

    # 2. Ensure Languages exist
    badaga_lang = db.query(Language).filter(Language.code == "badaga").first()
    if not badaga_lang:
        badaga_lang = Language(code="badaga", canonical_name="Badaga", alternate_names="Baduga")
        db.add(badaga_lang)

    marwari_lang = db.query(Language).filter(Language.code == "marwari").first()
    if not marwari_lang:
        marwari_lang = Language(code="marwari", canonical_name="Marwari", alternate_names="Marwadi")
        db.add(marwari_lang)
    db.commit()

    lang_map = {"Badaga": badaga_lang, "Marwari": marwari_lang}

    # 3. Compute Workbook SHA-256 Checksum
    source_checksum = preprocessor.compute_checksum(excel_path)
    logger.info("Source Excel SHA-256: %s", source_checksum)

    ds_version = db.query(DatasetVersion).filter(DatasetVersion.version_name == version_name).first()
    if not ds_version:
        ds_version = DatasetVersion(
            version_name=version_name,
            source_checksum=source_checksum,
            preprocessing_version="v1",
            model_version="facebook/wav2vec2-xls-r-300m",
            status="approved",
            approved_by=admin_user.id
        )
        db.add(ds_version)
        db.commit()

    # 4. Load Excel Workbook
    wb = openpyxl.load_workbook(excel_path, data_only=True)

    # 5. Ingest Speakers
    logger.info("Ingesting Speakers sheet...")
    spk_sheet = wb["Speakers"]
    spk_headers = [c for c in next(spk_sheet.iter_rows(max_row=1, values_only=True))]
    speaker_cache = {}

    for row in spk_sheet.iter_rows(min_row=2, values_only=True):
        if not any(row):
            continue
        entry = dict(zip(spk_headers, row))
        ext_spk_id = entry.get("Speaker ID")
        lang_str = entry.get("Language")
        if not ext_spk_id or not lang_str or lang_str not in lang_map:
            continue

        lang_obj = lang_map[lang_str]
        spk_record = db.query(Speaker).filter(
            Speaker.language_id == lang_obj.id,
            Speaker.external_speaker_id == ext_spk_id
        ).first()

        if not spk_record:
            spk_record = Speaker(
                external_speaker_id=ext_spk_id,
                language_id=lang_obj.id,
                name=entry.get("Name"),
                village_area=entry.get("Village / area"),
                gender=entry.get("Gender"),
                age_band=entry.get("Age band"),
                consent=entry.get("Consent", "Yes"),
                device=entry.get("Device")
            )
            db.add(spk_record)
            db.commit()

        speaker_cache[(lang_str, ext_spk_id)] = spk_record

    logger.info("Ingested %d unique speakers into database.", len(speaker_cache))

    # 6. Index Audio Files on Disk
    badaga_disk = {os.path.basename(p): p for p in glob.glob("Badaga/**/*.wav", recursive=True)}
    marwari_disk = {os.path.basename(p): p for p in glob.glob("Marwari/**/*.wav", recursive=True)}
    disk_files = {**badaga_disk, **marwari_disk}

    # 7. Ingest Vocabulary and Audio Recordings
    logger.info("Ingesting Recordings sheet...")
    rec_sheet = wb["Recordings"]
    rec_headers = [c for c in next(rec_sheet.iter_rows(max_row=1, values_only=True))]
    
    seen_files = set()
    ingested_words = 0
    ingested_audio_assets = 0
    ingested_vectors = 0

    rows = list(rec_sheet.iter_rows(min_row=2, values_only=True))
    if max_items_limit > 0:
        rows = rows[:max_items_limit]

    # Pre-create directory for denoised audio storage
    os.makedirs("storage/denoised", exist_ok=True)
    os.makedirs("storage/original", exist_ok=True)

    for row_idx, r in enumerate(rows, start=2):
        if not any(r):
            continue
        entry = dict(zip(rec_headers, r))
        lang_str = entry.get("Language")
        wid = entry.get("Word ID")
        eng = entry.get("English")
        tam = entry.get("Tamil")
        fname = entry.get("File name")
        spelling = entry.get("Spelling")
        notes = entry.get("Note")
        ext_spk_id = entry.get("Speaker ID")

        if not lang_str or not wid or not eng or not tam or lang_str not in lang_map:
            continue

        lang_obj = lang_map[lang_str]

        # 7a. Canonical Vocabulary Entry (Idempotent)
        vocab = db.query(VocabularyEntry).filter(
            VocabularyEntry.language_id == lang_obj.id,
            VocabularyEntry.external_word_id == wid
        ).first()

        if not vocab:
            vocab = VocabularyEntry(
                external_word_id=wid,
                language_id=lang_obj.id,
                source_word=spelling,
                tamil_meaning=tam,
                english_meaning=eng,
                notes=notes,
                status="approved",
                dataset_version_id=ds_version.id
            )
            db.add(vocab)
            db.commit()
            ingested_words += 1
        elif spelling and not vocab.source_word:
            vocab.source_word = spelling
            db.commit()

        # 7b. Audio Asset Ingestion (Idempotent by filename and SHA-256)
        if not fname or fname not in disk_files:
            continue

        fname = str(fname).strip()
        if fname in seen_files:
            continue
        seen_files.add(fname)

        audio_path = disk_files[fname]
        audio_checksum = preprocessor.compute_checksum(audio_path)

        asset = db.query(AudioAsset).filter(AudioAsset.filename == fname).first()
        if not asset:
            # Validate and read audio
            try:
                waveform, sr, meta = preprocessor.load_and_validate_audio(audio_path)
            except Exception as e:
                logger.warning("Skipping invalid audio %s: %s", fname, e)
                continue

            spk_obj = speaker_cache.get((lang_str, ext_spk_id))
            orig_key = f"original/{fname}"
            denoised_key = f"denoised/{fname}"
            denoised_disk_path = f"storage/denoised/{fname}"

            # Save denoised derivative
            denoised_waveform = preprocessor.create_denoised_derivative(waveform, sr)
            sf.write(denoised_disk_path, denoised_waveform, sr, subtype="PCM_16")

            asset = AudioAsset(
                vocabulary_entry_id=vocab.id,
                language_id=lang_obj.id,
                speaker_id=spk_obj.id if spk_obj else None,
                filename=fname,
                original_object_key=orig_key,
                denoised_object_key=denoised_key,
                checksum=audio_checksum,
                duration=meta["duration"],
                sample_rate=sr,
                channel_count=1,
                codec="pcm_s16le",
                consent_metadata=f"Speaker: {spk_obj.name if spk_obj else 'Unknown'}, Consent: Yes"
            )
            db.add(asset)
            db.commit()
            ingested_audio_assets += 1

            # 7c. VAD Speech Segmentation (identifies repetitions)
            segments = preprocessor.detect_speech_segments(waveform, sr)
            for seg_idx, (s_ms, e_ms) in enumerate(segments):
                seg = AudioSegment(
                    audio_asset_id=asset.id,
                    start_ms=s_ms,
                    end_ms=e_ms,
                    segment_index=seg_idx,
                    review_status="auto_vad"
                )
                db.add(seg)
                db.commit()

                # 7d. Generate Embeddings & Index (if enabled)
                if embed_vectors and encoder:
                    s_idx = int(sr * (s_ms / 1000.0))
                    e_idx = int(sr * (e_ms / 1000.0))
                    orig_slice = waveform[s_idx:e_idx]
                    denoised_slice = denoised_waveform[s_idx:e_idx]

                    if len(orig_slice) >= int(sr * 0.2):
                        # Original vector
                        orig_v_id = compute_vector_id(ds_version.id, wid, asset.id, f"original_seg_{seg_idx}")
                        orig_vec, _ = encoder.encode_waveform(orig_slice, sr)
                        
                        # Denoised vector
                        den_v_id = compute_vector_id(ds_version.id, wid, asset.id, f"denoised_seg_{seg_idx}")
                        den_vec, _ = encoder.encode_waveform(denoised_slice, sr)

                        orig_col = f"{lang_str.lower()}_original_v1"
                        den_col = f"{lang_str.lower()}_denoised_v1"

                        orig_rec = VectorRecord(
                            vector_id=orig_v_id,
                            vector=orig_vec.tolist(),
                            word_id=wid,
                            language_code=lang_str.lower(),
                            audio_asset_id=asset.id,
                            recording_id=fname,
                            speaker_id=ext_spk_id,
                            segment_start_ms=s_ms,
                            segment_end_ms=e_ms,
                            audio_variant="original",
                            dataset_version=version_name,
                            embedding_model_id="facebook/wav2vec2-xls-r-300m",
                            embedding_model_revision="main",
                            embedding_pipeline_version="v1",
                            duration_ms=e_ms - s_ms
                        )
                        den_rec = VectorRecord(
                            vector_id=den_v_id,
                            vector=den_vec.tolist(),
                            word_id=wid,
                            language_code=lang_str.lower(),
                            audio_asset_id=asset.id,
                            recording_id=fname,
                            speaker_id=ext_spk_id,
                            segment_start_ms=s_ms,
                            segment_end_ms=e_ms,
                            audio_variant="denoised",
                            dataset_version=version_name,
                            embedding_model_id="facebook/wav2vec2-xls-r-300m",
                            embedding_model_revision="main",
                            embedding_pipeline_version="v1",
                            duration_ms=e_ms - s_ms
                        )

                        # Write to Vector Stores
                        res_orig = vector_router.insert_vectors_dual(orig_col, [orig_rec])
                        res_den = vector_router.insert_vectors_dual(den_col, [den_rec])

                        # Record in PostgreSQL
                        for v_id, var_name, r_res, col in [(orig_v_id, "original", res_orig, orig_col), (den_v_id, "denoised", res_den, den_col)]:
                            emb_entry = EmbeddingRecord(
                                audio_segment_id=seg.id,
                                vector_id=v_id,
                                audio_variant=var_name,
                                model_id="facebook/wav2vec2-xls-r-300m",
                                model_revision="main",
                                pipeline_version="v1",
                                collection_name=col,
                                dimension=1024,
                                status="indexed"
                            )
                            db.add(emb_entry)
                            for store, st_ok in r_res.items():
                                rep_stat = VectorReplicationStatus(
                                    vector_id=v_id,
                                    store_name=store,
                                    status="synced" if st_ok else "failed",
                                    attempt_count=1
                                )
                                db.add(rep_stat)
                            db.commit()
                            ingested_vectors += 1

        if (row_idx % 50) == 0:
            logger.info("Processed %d rows... (%d audio assets, %d vectors indexed)", row_idx, ingested_audio_assets, ingested_vectors)

    logger.info("=== INGESTION SUMMARY ===")
    logger.info("Total Vocabulary Entries in Database: %d", db.query(VocabularyEntry).count())
    logger.info("Total Audio Assets Ingested: %d", db.query(AudioAsset).count())
    logger.info("Total Speech Segments Created: %d", db.query(AudioSegment).count())
    logger.info("Total Vectors Indexed in Stores: %d", db.query(EmbeddingRecord).count())
    db.close()


if __name__ == "__main__":
    run_ingestion()
