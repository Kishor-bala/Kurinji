# DATASET INSPECTION & RECONCILIATION REPORT

## 1. Executive Summary
- **Inspection Date:** 2026-10-30
- **Primary Workbook:** `Mother Tongue Recordings Log.xlsx`
- **Workbook Sheets:** Recordings, Speakers
- **Total Non-Empty Vocabulary Rows:** 635
- **Total Registered Speakers:** 22
- **Total Audio Files on Disk:** 619 (343 Badaga, 276 Marwari)
- **Matched Audio Files:** 619 / 619 (100% on-disk match)
- **Unmatched Audio Files on Disk:** 0

## 2. Language & Vocabulary Distribution
| Language | Rows in Log | Unique Word IDs | Available Audio Files |
|---|---|---|---|
| Badaga | 348 | 285 | 343 |
| Marwari | 287 | 214 | 276 |

## 3. Data Integrity & Anomaly Analysis
- **Missing Word IDs:** 0 rows
- **Missing English Meanings:** 0 rows
- **Missing Tamil Meanings:** 0 rows
- **Vocabulary Rows without Audio Reference:** 7 rows

### Vocabulary Entries Pending Audio Recording:
| Language | Word ID | English | Tamil | Reason |
|---|---|---|---|---|
| Marwari | W0110 | mat | பாய் | Awaiting recording |
| Marwari | W0117 | bathroom | குளியலறை | Awaiting recording |
| Marwari | W0219 | mortar (ural) | உரல் | Awaiting recording |
| Badaga | W0839 | Holi | ஹோலி | Awaiting recording |
| Marwari | W0009 | hair | முடி | Awaiting recording |
| Marwari | W0010 | stomach | வயிறு | Awaiting recording |
| Marwari | W0951 | big | பெரிய | Awaiting recording |

## 4. Audio Reference Deduplication in Excel Log
There are **9 unique audio files** referenced across duplicate rows in the Excel log (total 18 rows).
All instances represent re-upload events or mobile network retries for the identical word and speaker with distinct `Upload ID`s.

| Audio Filename | Occurrences in Log | Resolution |
|---|---|---|
| `BDG_P01_W0047_S05.wav` | 2 | Idempotent deduplication by SHA-256 and unique canonical asset key |
| `BDG_P15_W0701_S04.wav` | 2 | Idempotent deduplication by SHA-256 and unique canonical asset key |
| `BDG_P15_W0719_S04.wav` | 2 | Idempotent deduplication by SHA-256 and unique canonical asset key |
| `BDG_P18_W0891_S03.wav` | 2 | Idempotent deduplication by SHA-256 and unique canonical asset key |
| `MWR_P01_W0002_S08.wav` | 2 | Idempotent deduplication by SHA-256 and unique canonical asset key |
| `MWR_P01_W0025_S08.wav` | 2 | Idempotent deduplication by SHA-256 and unique canonical asset key |
| `MWR_P01_W0001_S10.wav` | 2 | Idempotent deduplication by SHA-256 and unique canonical asset key |
| `MWR_P01_W0014_S11.wav` | 2 | Idempotent deduplication by SHA-256 and unique canonical asset key |
| `MWR_P01_W0032_S11.wav` | 2 | Idempotent deduplication by SHA-256 and unique canonical asset key |

## 5. Audio Acoustic Characteristics
- **Sampling Rate & Codec:** 16,000 Hz, 1-channel Mono, PCM 16-bit WAV (Native XLS-R 300M compatibility)
- **Average Utterance Duration:** 3.57 seconds
- **Duration Distribution:**

  - `5s - 8s`: 74 recordings
  - `3s - 5s`: 284 recordings
  - `1s - 3s`: 261 recordings

## 6. Critical Audio Observation: Repetitions & VAD
- Analysis of raw waveforms demonstrates that recorded utterances contain **two distinct spoken repetitions** separated by 1.5–2.5 seconds of silence/low noise.
- **Resolution Required:** Silero VAD segmentation with strict duration bounding (300ms–4000ms) will segment these into distinct speech instances to avoid embedding dilution.

## 7. Speaker Distribution
A total of 22 speakers are registered across Badaga and Marwari communities with full consent recorded.
Speaker IDs are scoped per language (`(Language, Speaker ID)`), ensuring proper speaker-independent split partitioning for validation and test splits.

---
*Report generated automatically by `scripts/inspect_dataset.py`*