"""
Extract STT transcriptions for all 619 native voice recordings.
Runs local Faster-Whisper on every audio file in the dataset,
capturing the exact phonetic text spoken by native speakers.
"""

import os
import re
import json
import time
from faster_whisper import WhisperModel
from services.vector_store.vocab_store import vocab_store

def clean_stt_word(text: str) -> str:
    cleaned = re.sub(r"[^\w\s\u0B80-\u0BFF]", " ", text.lower())
    return " ".join(cleaned.split()).strip()

def run_extraction():
    print("Initializing Faster-Whisper for full dataset extraction...")
    model_root = os.path.abspath("models/whisper")
    whisper = WhisperModel("base", device="cpu", compute_type="int8", download_root=model_root)
    
    records = vocab_store.get_all_records_for_embedding()
    print(f"Total audio recordings to process: {len(records)}")
    
    output_path = "storage/dataset_stt_transcriptions.json"
    os.makedirs("storage", exist_ok=True)
    
    existing = {}
    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
            print(f"Loaded {len(existing)} previously extracted transcriptions.")
        except Exception:
            existing = {}
            
    results_by_word = existing
    t0 = time.time()
    
    for idx, r in enumerate(records):
        fn = r["filename"]
        wid = r["word_id"]
        lang = r["language_code"]
        file_path = r["file_path"]
        
        if not file_path or not os.path.exists(file_path):
            continue
            
        key = f"{lang}_{wid}"
        if key not in results_by_word:
            results_by_word[key] = {
                "word_id": wid,
                "language_code": lang,
                "english_meaning": r["english_meaning"],
                "tamil_meaning": r["tamil_meaning"],
                "source_word": r.get("source_word"),
                "spoken_transcriptions": []
            }
            
        # Check if file already processed
        if any(item.get("filename") == fn for item in results_by_word[key]["spoken_transcriptions"]):
            continue
            
        try:
            # Transcribe with auto beam search
            segs, info = whisper.transcribe(file_path, beam_size=5)
            auto_txt = " ".join([s.text for s in segs]).strip()
            
            # Clean text
            clean_auto = clean_stt_word(auto_txt)
            
            results_by_word[key]["spoken_transcriptions"].append({
                "filename": fn,
                "raw_text": auto_txt,
                "clean_text": clean_auto,
                "detected_lang": info.language
            })
            
            if (idx + 1) % 25 == 0 or (idx + 1) == len(records):
                dur = time.time() - t0
                print(f"[{idx+1}/{len(records)}] Processed {fn} -> \"{auto_txt}\" (Elapsed: {dur:.1f}s)")
                # Save progress periodically
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(results_by_word, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error processing {fn}: {e}")
            
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results_by_word, f, ensure_ascii=False, indent=2)
        
    print(f"Extraction complete! Saved to {output_path} in {time.time()-t0:.1f}s")

if __name__ == "__main__":
    run_extraction()
