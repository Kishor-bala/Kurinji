# MASTER BUILD PROMPT: PRODUCTION-READY BADAGA & MARWARI VOICE-BASED VOCABULARY LEARNING PLATFORM

---

## ⚡ STEP 0: MANDATORY PRE-FLIGHT CREDENTIALS INTERVIEW & VALIDATION (DO NOT PROCEED WITHOUT THIS)

> ### 🛑 ABSOLUTE HALT & VERIFICATION DIRECTIVE FOR ANY AI ASSISTANT OR DEVELOPER
> **HALT IMMEDIATELY. DO NOT WRITE CODE, DO NOT SCAFFOLD DIRECTORIES, DO NOT CREATE MOCK DATABASES, AND DO NOT GENERATE DUMMY IMPLEMENTATIONS.**
>
> If this document is provided to an AI coding assistant (or human developer) to clone, reproduce, or build this application:
> **The AI MUST FIRST pause, output the pre-flight credentials questionnaire below, and collect ALL ORIGINAL AND REAL credentials from the user.**
>
> ### 🚫 STRICT ZERO-TOLERANCE RULES:
> 1. **NO DUMMY OR PLACEHOLDER CREDENTIALS**: Never populate `.env`, configuration files, or scripts with fake values like `'xxxx'`, `'dummy_token'`, `'test_secret'`, or `'mock_key'`.
> 2. **NO DUMMY MOCK DATABASES**: Never replace PostgreSQL with SQLite, or mock out Zilliz/Qdrant vector stores with in-memory Python dictionaries. The application is designed for real production vector engines and authentic relational data.
> 3. **MANDATORY USER CONFIRMATION**: You must explicitly ask the user for each credential listed below and confirm they are live and operational before proceeding to Step 1.

### 📋 Required Real Credentials, Formats, and Examples:

| Environment Variable | Description | Realistic Production Example |
| :--- | :--- | :--- |
| `POSTGRES_SERVER` | Live PostgreSQL host or cloud endpoint | `aws-0-ap-south-1.pooler.supabase.com` or `localhost` |
| `POSTGRES_PORT` | PostgreSQL connection port | `5432` or `6543` |
| `POSTGRES_DB` | Production database name | `language_ai_prod` or `postgres` |
| `POSTGRES_USER` | Production database username | `postgres` or `admin_user` |
| `POSTGRES_PASSWORD` | Secure production database password | `K9#m$X8!vQ2@zL5*` *(minimum 16 chars)* |
| `DATABASE_URL` | Complete SQLAlchemy connection string | `postgresql://postgres:K9#m$X8!vQ2@zL5*@localhost:5432/language_ai_prod` |
| `MILVUS_URI` | Live Zilliz Cloud endpoint or native Milvus URI | `https://in03-7a91c8f47de48c1.serverless.gcp-us-west1.zillizcloud.com` or `./milvus_vectors.db` |
| `MILVUS_TOKEN` | Live Zilliz Cloud API token / credentials | `db_admin:7f9a8b1c4e2d3f6a5b8c9d0e1f2a3b4c5d6e` |
| `QDRANT_URL` | Live Qdrant Cloud URL or native persistent path | `https://8f4a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c.us-east4-0.gcp.cloud.qdrant.io:6333` or `./qdrant_vectors` |
| `QDRANT_API_API_KEY` | Live Qdrant Cloud API key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.thIsIsAReAlQdrAntClOuDApiKey...` |
| `GEMINI_API_KEY` | Live Google AI Studio API key (Primary AI Tutor) | `AIzaSyD-7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2` |
| `GROQ_API_KEY` | Live Groq Console API key (Secondary AI Fallback) | `gsk_4x9Y1z7w8v9u0t1s2r3q4p5o6n7m8l9k0j1i2h3g4f` |
| `SECRET_KEY` | High-entropy JWT signing secret | `8f9e7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f` |

### 💬 Mandatory Interactive Prompt to Output to the User Before Any Build:
```markdown
Before I begin building the Badaga & Marwari Voice Vocabulary Learning Platform, 
I need your verified production credentials. This platform requires real databases 
and genuine AI APIs (no fake or placeholder credentials will be used).

Please provide your connection details:
1. PostgreSQL Database URL (or Server, Port, User, Password, DB):
2. Zilliz Cloud / Milvus URI and Token:
3. Qdrant Cloud URL and API Key:
4. Google Gemini API Key:
5. Groq API Key:
6. Desired JWT Secret Key (or I can generate a 64-char high-entropy secret):

Once provided, I will validate the connections and immediately start building Phase 1.
```

---

1. YOUR ROLE
Act as a Senior Software Architect, Machine Learning Engineer, Python Backend Engineer, Audio Processing Engineer, AI Engineer, Database Architect, DevOps Engineer, and Security Engineer.
Your responsibility is to design, implement, test, and prepare a production-grade voice-based vocabulary learning platform supporting:
1. Badaga (Baduga) language.
2. Marwari language.
This is not a simple chatbot or a college-level demonstration project. Build a reliable, scalable, maintainable, secure, and carefully evaluated application.
The most important requirement is accuracy and reliability over confident guessing.
You must understand the complete architecture before implementation. Inspect the actual dataset, identify potential problems, document technical decisions, and implement the application in controlled phases.
Do not generate the entire application in one massive implementation. Build, test, validate, and document every phase before proceeding.

2. PROJECT OBJECTIVE
Build an AI-powered language-learning platform that allows students and teachers to learn Badaga and Marwari vocabulary through voice interaction.
The application must:
- Recognise spoken vocabulary using XLS-R 300M audio embeddings.
- Support both original and denoised audio processing.
- Search embeddings using Zilliz Cloud as the primary vector database.
- Use Qdrant as the fallback vector database.
- Retrieve verified Tamil and English meanings from PostgreSQL.
- Provide an AI teaching assistant powered by Gemini and Groq.
- Support student and teacher modes.
- Support audio recording, uploading, recognition, pronunciation playback, vocabulary learning, quizzes, and progress tracking.
- Support dataset ingestion from Excel workbooks and associated audio files.
- Preserve original recordings.
- Maintain reliable recognition through candidate fusion, reranking, confidence calibration, and abstention.
- Support future dataset expansion, additional recordings, and model improvements.
The application must never invent dictionary meanings or pretend that an uncertain recognition result is correct.

3. NON-NEGOTIABLE ARCHITECTURAL PRINCIPLES
Follow these rules throughout development.
1. PostgreSQL is the canonical source of truth for vocabulary and meanings.
2. XLS-R is the audio embedding encoder for vocabulary recognition.
3. Zilliz Cloud is the primary vector database.
4. Qdrant is the fallback vector database.
5. Original and denoised audio must have separate processing and embedding paths.
6. The original recording must never be overwritten.
7. Gemini is the preferred AI provider.
8. Groq is the secondary AI provider and configurable fallback.
9. LLMs must not directly create or modify canonical dictionary entries.
10. Every dictionary fact displayed to a learner must originate from an approved PostgreSQL record.
11. The application must support unknown and ambiguous recognition results.
12. Similarity scores must never be presented as probabilities without calibration.
13. Dataset ingestion must be repeatable and idempotent.
14. Model versions, embedding configurations, and preprocessing versions must be recorded.
15. Every major operation must be testable and observable.
16. Do not introduce unnecessary microservices or infrastructure complexity.
17. Do not assume that denoising always improves speech recognition.
18. Do not assume Ollama automatically supports Badaga or Marwari speech recognition or synthesis.
19. Do not claim production accuracy without a speaker-independent evaluation.
20. Never fabricate successful tests, dataset contents, credentials, or model capabilities.

4. EXACT TECHNOLOGY STACK
Use the following stack unless an incompatibility is demonstrated and documented.
4.1 Backend
ComponentTechnologyProgramming languagePython 3.11API frameworkFastAPIASGI serverUvicornData validationPydantic v2ORMSQLAlchemy 2.xDatabase migrationsAlembicPrimary databasePostgreSQL 16Background jobsCeleryMessage brokerRedis 7CachingRedisConfigurationpydantic-settingsLoggingstructlogAPI documentationFastAPI OpenAPI
Use a modular backend architecture.
4.2 Audio processing and machine learning
ComponentTechnologyML frameworkPyTorchSpeech modelXLS-R 300MModel integrationHugging Face TransformersModel managementHugging Face HubNumerical operationsNumPySignal processingSciPyAudio reading/writingSoundFileAudio analysislibrosaNoise reductionnoisereduceVoice activity detectionSilero VADAlternative VADWebRTC VADEvaluationscikit-learnTestingpytest
Use a specific XLS-R 300M checkpoint and pin its immutable model revision.
Do not assume the model's hidden dimension or expected sampling rate. Inspect its actual configuration and processor. Ensure zero-padding from feature extraction is explicitly accounted for using PyTorch attention masks during pooling operations.
4.3 Vector databases
ComponentTechnologyResponsibilityPrimary vector databaseZilliz CloudProduction vector retrievalVector engineMilvusVector indexing and similarity searchPython clientPyMilvusZilliz/Milvus integrationFallback databaseQdrantSearch during genuine Zilliz outagesPython clientqdrant-clientQdrant integration
Maintain equivalent indexed data in both vector stores.
Use a versioned collection strategy.
Recommended collections:
- badaga_original_v1
- badaga_denoised_v1
- marwari_original_v1
- marwari_denoised_v1
Create equivalent collections in Qdrant.
4.4 AI providers
ComponentTechnologyPrimary LLMGoogle Gemini APISecondary LLMGroq APIOutput validationPydantic v2Provider routingCustom Python provider abstraction
Use configurable model identifiers.
Verify the current availability, capabilities, context limits, structured-output support, pricing, and rate limits of the selected Gemini and Groq models before production deployment.
Do not hardcode model names throughout the application.
4.5 Speech recognition and speech synthesis
Implement separate interfaces:
- SpeechToTextProvider
- TextToSpeechProvider
Evaluate (strictly marked as experimental / secondary modules):
- faster-whisper
- Whisper models
- Ollama-compatible models where appropriate
- Piper or another local TTS runtime where a suitable voice exists
Important:
General-purpose STT is not the authoritative vocabulary recognition engine.
XLS-R-based retrieval must remain the authoritative vocabulary recognition path.
For native Badaga and Marwari pronunciation, verified native-speaker recordings stored in the dataset must remain the sole authoritative playback path.
Synthetic speech or general-purpose STT modules are strictly opt-in, must be labelled as unverified/synthetic, and must never replace native recordings.
4.6 Frontend
For a new frontend, use:
ComponentTechnologyFrameworkNext.jsLanguageTypeScriptUIReactStylingTailwind CSSComponentsshadcn/uiAPI stateTanStack QueryFormsReact Hook FormSchema validationZodAudio recordingBrowser MediaRecorder APIE2E testingPlaywrightUnit testingVitest
If a frontend already exists, inspect it first and preserve its established architecture where appropriate.
4.7 Infrastructure and DevOps
ComponentTechnologyContainersDockerLocal orchestrationDocker ComposeObject storageS3-compatible storageLocal object storageMinIOReverse proxyNginxCI/CDGitHub ActionsMetricsPrometheusDashboardsGrafanaDistributed tracingOpenTelemetryError monitoringSentryPython package managementuvCode qualityRuffType checkingmypy or Pyright
Use pinned dependency versions and maintain a lockfile.

5. COMPLETE SYSTEM ARCHITECTURE AND WORKING FLOWS

5.1 End-to-End System Topology
```text
                            +-------------------------------------------------------+
                            |                 STUDENT / TEACHER                     |
                            +-------------------------------------------------------+
                                                       |
                                                       | (HTTP / SSE / WebSockets)
                                                       v
                            +-------------------------------------------------------+
                            |     NEXT.JS 16 FRONTEND (Light Theme, Black Buttons)   |
                            |  [AI Tutor Tab]             [Learn Tab]               |
                            |  WebAudio VAD & Speech      396 Photographic Concepts |
                            |  MediaRecorder              Dual Dialect & Neural TTS |
                            +-------------------------------------------------------+
                                                       |
                                                       | (REST API Calls /api/v1)
                                                       v
                            +-------------------------------------------------------+
                            |             FASTAPI PRODUCTION BACKEND                |
                            |  CORS Middleware | Lifespan Manager | Pydantic V2     |
                            +-------------------------------------------------------+
                               |                       |                       |
            +------------------+                       |                       +------------------+
            |                                          |                                          |
            v                                          v                                          v
+-----------------------+              +-------------------------------+              +-----------------------+
|  CANONICAL DATA STORE |              |   HIGH-PERFORMANCE CACHE      |              | OBJECT / FILE STORAGE |
|  PostgreSQL 16        |              |   Redis 7 / Memory Cache      |              | storage/original/     |
|  2,362 Vocab Records  |              |   Rate Limiting & TTS Cache   |              | storage/denoised/     |
|  Users & Attempts DB  |              |   Outbox Queue & Statuses     |              | 619 Native WAV Files  |
+-----------------------+              +-------------------------------+              +-----------------------+
            ^                                          ^                                          ^
            |                                          |                                          |
            +------------------------------------------+------------------------------------------+
                                                       |
                                                       v
                            +-------------------------------------------------------+
                            |            AUDIO PREPROCESSING ENGINE                 |
                            |  services/audio/preprocessing.py                      |
                            |  - 4th-order Butterworth 80Hz High-Pass Filter        |
                            |  - Volume Peak Normalization (0.90 max amplitude)     |
                            |  - Energy VAD with Segment Ranking (NP.Sum Energy)    |
                            |  - Stationary Spectral Denoising (noisereduce 0.85)   |
                            +-------------------------------------------------------+
                               |                                       |
                   [Clean Raw Utterance]                   [Denoised Utterance]
                               |                                       |
                               v                                       v
                     +-------------------+                   +-------------------+
                     | XLS-R 300M ENCODER|                   | XLS-R 300M ENCODER|
                     | services/embeddings|                  | services/embeddings|
                     | Last Hidden State |                   | Last Hidden State |
                     | Masked Mean Pool  |                   | Masked Mean Pool  |
                     | L2 Normalize      |                   | L2 Normalize      |
                     +-------------------+                   +-------------------+
                               |                                       |
                      (1024-d Vector A)                       (1024-d Vector B)
                               |                                       |
                               +-------------------+-------------------+
                                                   |
                                                   v
                            +-------------------------------------------------------+
                            |         4-WAY CROSS-PATH VECTOR DB RETRIEVAL          |
                            |  services/vector_store/manager.py                     |
                            |  Primary: Milvus Lite / Zilliz Cloud                  |
                            |  Fallback: Native Qdrant VectorDB                     |
                            |                                                       |
                            |  Path 1: Vector A vs {lang}_original_v1               |
                            |  Path 2: Vector A vs {lang}_denoised_v1               |
                            |  Path 3: Vector B vs {lang}_original_v1               |
                            |  Path 4: Vector B vs {lang}_denoised_v1               |
                            +-------------------------------------------------------+
                                                       |
                                                       v
                            +-------------------------------------------------------+
                            |         RECIPROCAL RANK FUSION & CALIBRATION          |
                            |  services/recognition/engine.py                       |
                            |  - Candidate Deduplication across 4 search lists      |
                            |  - Score: 0.92 * Cosine Sim + 0.08 * Multi-Ref RRF    |
                            |  - Decision Calibration: ACCEPTED / AMBIGUOUS / UNK   |
                            +-------------------------------------------------------+
                                                       |
                                                       v
                            +-------------------------------------------------------+
                            |             GROUNDED AI TUTOR SERVICE                 |
                            |  services/tutor/service.py                            |
                            |  - Multi-Provider Router: Gemini 2.5 + Groq Llama 3.3 |
                            |  - Strict Grounding: Canonical Dictionary Context     |
                            |  - Verbal Speech Synthesis via Edge TTS / gTTS        |
                            +-------------------------------------------------------+
```

5.2 Flow 1: High-Fidelity Audio Preprocessing & Noise Cancellation Pipeline
- **Input**: User spoken voice captured via web browser or raw uploaded WAV/WebM audio buffer.
- **Functions & Execution Sequence**:
  1. `AudioPreprocessor.load_and_validate_audio(audio_source)`:
     - Formats supported: WAV, WebM Opus, OGG, MP3.
     - System `ffmpeg` subprocess decodes arbitrary browser WebM chunks into standard 16kHz mono PCM float32.
     - Multi-channel audio is downmixed to mono via documented channel averaging: `np.mean(waveform, axis=1)`.
     - Validates minimum duration (0.2s) and maximum duration (15.0s).
     - Checks amplitude thresholds (`max_amp >= 0.01` and `rms >= 0.005`) to reject dead silence.
     - **Butterworth 80Hz High-Pass Filtering**: Passes the signal through a 4th-order Butterworth high-pass filter with an 80Hz cutoff frequency using `scipy.signal.butter` and `scipy.signal.sosfilt`. This removes DC bias, sub-bass air-conditioning rumble, laptop fan vibration, and low-frequency microphone pops without altering fundamental speech formants.
     - **Volume Peak Normalization**: Scales peak amplitude to `0.90` (`waveform / max_amp * 0.90`), standardizing input loudness across disparate user hardware and microphones.
  2. `AudioPreprocessor.detect_speech_segments(waveform, sr)`:
     - Frames waveform into 30ms windows with 10ms hop steps.
     - Computes frame RMS energy envelope.
     - Applies adaptive threshold: `thresh = max(peak_energy * 0.12, 0.008)`.
     - Merges contiguous speech bursts separated by less than 250ms of silence to preserve natural multi-syllabic words intact.
     - Enforces 60ms pre-roll and 100ms post-roll to preserve initial stop consonants (p, t, k) and trailing fricatives/vowels.
     - **Total Energy Ranking**: Calculates total speech energy for each segment: `energy = np.sum(waveform[s_idx:e_idx] ** 2)`. Sorts segments descending so that `segments[0]` is guaranteed to be the primary, most resonant speech utterance.
  3. `AudioPreprocessor.create_denoised_derivative(waveform, sr)`:
     - Applies stationary spectral gating noise reduction using `noisereduce.reduce_noise` (`prop_decrease=0.85`, `stationary=True`, `n_std_thresh_stationary=1.5`, `time_mask_smooth_ms=64`).
     - Returns a pristine, background-noise-free derivative waveform for dual-path representation matching.

5.3 Flow 2: 4-Way Cross-Path Vector Embedding & Acoustic Retrieval Pipeline
- **Input**: Clean primary user waveform and its denoised derivative.
- **Functions & Execution Sequence**:
  1. `XLSREncoder.encode_waveform(waveform, sr)`:
     - Inputs waveform to frozen backbone `facebook/wav2vec2-xls-r-300m`.
     - Generates attention mask corresponding to valid speech duration.
     - Extracts last hidden states `[batch_size, seq_len, 1024]`.
     - Applies masked mean pooling across speech timeframes.
     - Applies L2 normalization: `vector = pooled / torch.norm(pooled, p=2)`.
     - Produces unit-length 1024-dimensional representation vector.
  2. `RecognitionEngine.process_and_recognize(audio_source, language_code)`:
     - Produces `orig_vector` (from clean user voice) and `denoised_vector` (from denoised user voice).
     - Queries the active vector store via `VectorStoreRouter.search` across **all 4 acoustic permutations**:
       - **Path 1 (`orig_orig`)**: `orig_vector` queried against `{lang}_original_v1` (compares user full voice against project original native recordings).
       - **Path 2 (`orig_den`)**: `orig_vector` queried against `{lang}_denoised_v1` (compares user full voice against project denoised native recordings).
       - **Path 3 (`den_orig`)**: `denoised_vector` queried against `{lang}_original_v1` (compares user denoised voice against project original native recordings).
       - **Path 4 (`den_den`)**: `denoised_vector` queried against `{lang}_denoised_v1` (compares user denoised voice against project denoised native recordings).
     - Retrieval parameter: `top_k = 35` per channel.
  3. `RecognitionEngine.compute_rrf(...)`:
     - Fuses all candidate lists with entity deduplication.
     - For each unique `word_id`, aggregates its rank across all 4 channels: `rrf_sc = sum(1.0 / (40 + rank))`.
     - Computes the highest raw cosine similarity across all channels: `raw_sim = max(cand.score)`.
     - Evaluates composite acoustic score:
       `composite = (0.92 * raw_sim) + (0.08 * (rrf_sc / max_possible_rrf))`
     - Sorts candidates primarily by raw acoustic similarity `raw_sim`, using multi-reference consensus for tie-breaking.
  4. Decision & Confidence Calibration:
     - `raw_sim >= 0.70`: `ACCEPTED` — High-confidence acoustic match.
     - `0.50 <= raw_sim < 0.70`: `AMBIGUOUS` — Closely matched acoustics; top alternative candidates presented.
     - `raw_sim < 0.50`: `UNKNOWN` — Spoken audio does not match verified vocabulary.

5.4 Flow 3: Grounded Multimodal AI Tutor Interaction Pipeline
- **Input**: Spoken audio query via `/api/v1/tutor/voice-query` or natural text message via `/api/v1/tutor/chat`.
- **Functions & Execution Sequence**:
  1. `tutor_voice_query(...)` (`apps/api/app/api/v1/endpoints/tutor.py`):
     - Receives audio upload, triggers `recognition_engine.process_and_recognize`.
     - `extract_full_utterance` captures the complete speech span from first phoneme to trailing sound without syllable truncation.
     - Faster-Whisper transcribes speech using domain vocabulary prompts (`BADAGA_PROMPT` / `MARWARI_PROMPT`), automatically rejecting foreign language hallucinations (e.g. Japanese/Welsh) and falling back to English/Tamil phonetic transliteration.
     - **Intent Classification & Routing**:
       - If the user asks a conversational question (e.g. "What is the word for water in Badaga?", "How do you say eye?", or contains question indicators/length >= 3 words): The system extracts the target vocabulary keyword from the transcribed question using `lexical_matcher.find_match` (e.g. "water" -> `W0352` / 'தண்ணீர்'). This ensures conversational questions are NEVER hijacked by raw acoustic vector similarity of English speech!
       - If the user speaks a single heritage vocabulary word (e.g. "mande", "kannu", "head", "eye"): The system uses `lexical_matcher` (with prioritized curated phonetic dictionary and repeated syllable normalization) or 4-way cross-path acoustic matching.
     - Constructs grounded query prompt containing verified vocabulary context.
  2. `TutorService.chat_with_tutor(user_message, language_code, active_word_id)`:
     - Injects strict system prompt: AI is forbidden from fabricating vocabulary, meanings, or grammar rules.
     - Formats verified vocabulary context into the LLM system prompt.
     - Queries primary LLM: Google Gemini API (model `gemini-2.5-flash` or configurable).
     - Automatic Fallback: If Gemini times out or fails, queries Groq API (model `llama-3.3-70b-versatile`).
  3. Verbal Speech Synthesis:
     - Generates response TTS streaming URL: `/api/v1/vocabulary/tts/synthesize?text=...&lang=...`.
     - Uses Edge TTS / gTTS to speak explanations in Tamil or English.
     - Returns verified native speaker audio URL (`/api/v1/vocabulary/audio/stream/{filename}`) for native word pronunciation.

5.5 Flow 4: Clean, Professional UI Architecture
- **Tech Stack**: Next.js 15, React 19, TypeScript, Vanilla/Tailwind CSS tokens.
- **Aesthetic Principles**:
  - Light theme (`bg-slate-50 text-slate-900`) — high readability, zero distracting neon gradients or glowing shadows.
  - Buttons: Pure black with crisp white typography (`bg-black text-white hover:bg-slate-800`), standard rounded corners (`rounded-lg`).
  - Left Sidebar Navigation with strictly 2 tabs:
    1. **AI Tutor**: KURINJI Multimodal Indigenous Hill Speech Recognition & Translation System featuring dual input modes: Type/Speak (transliteration search with live speech dictation & quick suggestion chips) and Audio File/Waveform (16-bit 16kHz PCM WAV encoding & file upload), powered by Google Gemini Multimodal Audio understanding constrained strictly to the 3,318-word verified dictionary, verified Tamil/English meanings, neural TTS, authentic native speaker reference audio playback, match quality indicators, and full Wordbank management.
    2. **Learn**: Category-split 3-column grid displaying the authentic verified vocabulary (499 canonical records: 285 Badaga words [284 with native audio] + 214 Marwari words) deduplicated into 396 unified concept flashcards in "All Languages" view, grouped into pedagogical categories (Body Parts, Family & Relations, House & Objects, Numbers & Quantities, Time/Nature/Festivals, Daily Life Actions, Activities & Verbs, Sizes & Adjectives) with category filter pills, focused authentic photographic pictures (`apps/web/public/vocab-images/*.jpg`), whole English & Tamil words, Tamil syllabic script breakdown (`த + லை` = `தலை` without English letter splitting), Badaga audio buttons with pure audio symbols and sample dropdown arrow for multi-sample recordings (strictly without speaker names), and Tamil & English audio buttons featuring audio symbols alongside the word script spelling.
- **Audio Capture Implementation**:
  - Calls `navigator.mediaDevices.getUserMedia` with:
    `channelCount: 1`, `echoCancellation: true`, `noiseSuppression: true`, `autoGainControl: true`, `sampleRate: 16000`.
  - MediaRecorder uses 100ms time-slice buffering (`mediaRecorder.start(100)`) to avoid dropped buffers.
  - 250ms grace period on stop to prevent cutting off trailing consonants/vowels when the user clicks the stop button.

5.6 Flow 5: Comprehensive Function Connection Matrix

| Function Name | File Path | Inputs | Outputs | Callers | Callees | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `load_and_validate_audio` | `services/audio/preprocessing.py` | Audio file/bytes | `(waveform, sr, metadata)` | `RecognitionEngine`, `IngestionService` | `soundfile`, `ffmpeg`, `scipy.signal` | Decodes audio, applies 80Hz Butterworth filter, peak normalizes to 0.90. |
| `extract_full_utterance` | `services/audio/preprocessing.py` | `waveform, sr` | `(utterance, start_ms, end_ms)` | `RecognitionEngine.process_and_recognize` | `np.where`, `np.sqrt` | Extracts full active speech span from first phoneme to trailing sound without syllable truncation. |
| `detect_speech_segments` | `services/audio/preprocessing.py` | `waveform, sr` | `List[(start_ms, end_ms)]` | `IngestionService` | `np.mean`, `np.sum` | Detects speech boundaries and sorts segments by total speech energy descending. |
| `create_denoised_derivative` | `services/audio/preprocessing.py` | `waveform, sr` | `denoised_waveform` | `RecognitionEngine`, `IngestionService` | `noisereduce.reduce_noise` | Generates stationary spectral noise-cancelled derivative audio. |
| `transcribe` | `services/recognition/whisper_service.py` | `waveform, lang_code` | `dict(text, raw_text, lang)` | `RecognitionEngine.process_and_recognize` | `faster_whisper.WhisperModel` | Transcribes speech with domain vocabulary prompts and automatic foreign-language re-transcription. |
| `find_match` | `services/recognition/lexical_matcher.py` | `transcription, lang_code` | `(vocab_item, confidence, alts)` | `RecognitionEngine`, `tutor_voice_query` | `BADAGA_PHONETIC_MAP`, `comprehensive_index` | Matches transcribed text with repeated word deduplication and curated core vocabulary priority. |
| `segment_tamil_syllables` | `services/vector_store/vocab_store.py` | `tamil_text` (str) | `(syllables_str, phonetics_str)` | `VectorVocabStore._ensure_loaded` | Tamil Unicode decomposition, `TAMIL_CONSONANT_MAP`, `TAMIL_VOWEL_MAP` | Decomposes Tamil words into phonetically segmented letter tokens joined with `+` (e.g. `ம + ர + ம்` / `ma + ra + m`) to teach Tamil literacy via Badaga oral mother tongue. |
| `encode_waveform` | `services/embeddings/xlsr_encoder.py` | `waveform, sr` | `(vector_1024d, metadata)` | `RecognitionEngine`, `IngestionService` | `Wav2Vec2Model`, `torch.norm` | Extracts L2-normalized 1024-d acoustic representation vector via masked mean pooling. |
| `search` | `services/vector_store/manager.py` | `col_name, query_vec, top_k` | `(List[SearchCandidate], store)` | `RecognitionEngine.process_and_recognize` | `MilvusClient.search`, `QdrantClient.search` | Executes cosine vector similarity retrieval across Milvus Lite / Qdrant. |
| `compute_rrf` | `services/recognition/engine.py` | 4 Candidate Lists | `List[(word_id, rrf, sim, cand)]` | `process_and_recognize` | `defaultdict` | Merges 4-way cross-path search results, prioritizing raw acoustic similarity with RRF rank consensus. |
| `process_and_recognize` | `services/recognition/engine.py` | Audio bytes, lang | `RecognitionResult` | `/api/v1/recognition`, `/tutor/voice-query` | `load_and_validate`, `extract_full_utterance`, `transcribe`, `find_match`, `encode_waveform`, `compute_rrf` | Core speech recognition orchestrator executing the 4-way cross-comparison matching. |
| `chat_with_tutor` | `services/tutor/service.py` | `message, lang, word_id` | `TutorServiceResponse` | `/api/v1/tutor/chat`, `/tutor/voice-query` | `GeminiProvider`, `GroqProvider`, `vocab_store` | AI Tutor conversation generator grounded strictly in verified vocabulary context. |
| `recognize_audio` | `apps/api/app/api/v1/endpoints/recognition.py` | UploadFile, lang | `RecognitionResult` | Frontend Voice Search, External API clients | `recognition_engine.process_and_recognize` | HTTP REST endpoint for voice vocabulary recognition. |
| `tutor_voice_query` | `apps/api/app/api/v1/endpoints/tutor.py` | UploadFile, lang | `TutorVoiceQueryResponse` | Frontend Mic button (`submitTutorVoiceQuery`) | `process_and_recognize`, `chat_with_tutor`, `synthesize_speech` | Multimodal endpoint accepting voice, matching acoustics, and synthesizing verbal response. |
| `startTutorVoiceRecording` | `apps/web/app/page.tsx` | User Click Event | Void | User UI Mic Click in Tutor | `navigator.mediaDevices.getUserMedia`, `MediaRecorder` | Initiates continuous 100ms timesliced audio recording with noise cancellation constraints. |
| `startDictVoiceRecording` | `apps/web/app/page.tsx` | User Click Event | Void | User UI Mic Click in Dictionary | `navigator.mediaDevices.getUserMedia`, `MediaRecorder` | Initiates voice search recording for instantaneous dictionary keyword lookup. |
| `submitTutorVoiceQuery` | `apps/web/app/page.tsx` | `audioBlob` | Void | `mediaRecorder.onstop` | `fetch(/api/v1/tutor/voice-query)` | Submits captured voice blob to backend and plays returned native speaker or TTS audio. |
| `submitDictVoiceSearch` | `apps/web/app/page.tsx` | `audioBlob` | Void | `dictMediaRecorder.onstop` | `fetch(/api/v1/recognition)` | Submits captured voice blob to recognition endpoint and populates dictionary search input. |

---

6. DATASET INSPECTION AND INGESTION
The source dataset consists of an Excel workbook containing vocabulary information and associated audio recordings.
Expected information includes:
- Word ID.
- Language.
- Badaga or Marwari word.
- Tamil meaning.
- English meaning.
- Audio file reference.
- Optional speaker information.
- Optional dialect or recording information.
Do not assume the actual Excel columns match these names.
First inspect the real workbook.
6.1 Initial dataset inspection
Create a script:
scripts/inspect_dataset.py
It must report:
- Workbook sheets.
- Column names.
- Total rows.
- Missing values.
- Duplicate IDs.
- Duplicate words.
- Missing Tamil meanings.
- Missing English meanings.
- Audio references.
- Unmatched audio files.
- Duplicate audio files.
- Invalid audio references.
- Language distribution.
- Available recording formats.
Generate a dataset inspection report.
If column mapping is ambiguous, request administrator confirmation.
Never silently map uncertain columns.
6.2 Audio mapping
The audio dataset may contain:
- One recording per word.
- Multiple recordings per word.
- Two repetitions in one recording.
- Different speakers.
- Different recording conditions.
Implement deterministic audio matching.
If a single recording contains multiple repetitions, use VAD to identify speech segments with strict duration constraints:
- Minimum valid utterance threshold: 300ms.
- Maximum single word duration: 4000ms.
If VAD fails to find valid segments or returns 0 segments, flag for administrative review rather than raising silent errors or processing empty waveforms.
Store:
- Original recording ID.
- Segment ID.
- Segment start time.
- Segment end time.
- Speaker reference where permitted.
- Associated word ID.
- Recording metadata.
Do not assume every VAD segment corresponds to a separate word. Validate segmentation and provide a manual review mechanism.
6.3 Ingestion pipeline
Implement this pipeline:
1. Upload workbook.
2. Upload or identify associated audio files.
3. Store source files.
4. Calculate SHA-256 checksums.
5. Inspect workbook structure.
6. Validate column mappings.
7. Validate word IDs.
8. Detect duplicates.
9. Match audio files.
10. Identify missing and ambiguous mappings.
11. Decode audio safely.
12. Inspect sample rate and duration.
13. Detect clipping and silence.
14. Detect speech segments.
15. Preserve original audio.
16. Create denoised derivative.
17. Store denoised audio separately.
18. Generate original embeddings.
19. Generate denoised embeddings.
20. Write vectors to Zilliz.
21. Replicate vectors to Qdrant.
22. Record indexing and replication status.
23. Run post-ingestion validation.
24. Produce a detailed ingestion report.
25. Require administrator approval before activating the dataset version.
Every step must be resumable.
Repeated ingestion must not create duplicate records.

7. AUDIO PREPROCESSING & NOISE CANCELLATION
Implement an independent, high-fidelity audio processing module.
Recommended module:
services/audio/preprocessing.py
Use:
- NumPy
- SciPy (Signal processing & Butterworth filters)
- SoundFile
- librosa
- noisereduce (Stationary spectral gating)
- Energy & Silero-compatible VAD

7.1 Original audio path & Butterworth High-Pass Filtering
Preserve the authentic acoustic properties while eliminating acoustic noise:
1. Decode arbitrary audio (WAV, MP3, WebM Opus) via SoundFile with system FFmpeg fallback.
2. Downmix multi-channel audio to mono: `waveform = np.mean(waveform, axis=1)`.
3. Resample to 16,000 Hz.
4. **4th-Order Butterworth 80Hz High-Pass Filter**:
   Apply `scipy.signal.butter(4, 80.0, btype="highpass", fs=sr, output="sos")` followed by `scipy.signal.sosfilt`.
   This eliminates sub-bass acoustic rumble, DC bias, desk tapping, laptop fan hum, and breath pops without touching fundamental speech formants (human fundamental frequency F0 is typically 85Hz–255Hz).
5. **Volume Peak Normalization**:
   Normalize amplitude so that peak amplitude equals `0.90` (`waveform / max_amp * 0.90`).
   This ensures identical input dynamic range across disparate microphones, mobile devices, and recording levels.
The original waveform must never be modified in place on disk.

7.2 Denoised audio path & Spectral Noise Cancellation
Create a separate, pristine denoised derivative:
1. Apply stationary spectral gating noise reduction using `noisereduce.reduce_noise`:
   - `prop_decrease=0.85` (attenuates background noise floor by 15-20 dB).
   - `stationary=True`.
   - `n_std_thresh_stationary=1.5`.
   - `time_mask_smooth_ms=64` (smooths spectral artifacts to prevent 'musical noise' distortion).
2. Store the denoised version separately in `storage/denoised/`.
3. The application maintains both paths and executes 4-way cross-path comparison at runtime.

7.3 VAD & Primary Utterance Speech Extraction
1. Compute short-term energy profile over 30ms windows with 10ms hops.
2. Set adaptive threshold: `thresh = max(peak_energy * 0.12, 0.008)`.
3. Merge active frames separated by less than 250ms of silence to preserve full multi-syllabic words intact.
4. Enforce 60ms pre-roll and 100ms post-roll padding.
5. **Total Speech Energy Ranking**:
   Calculate the total acoustic energy of each detected segment:
   `energy = np.sum(waveform[s_idx:e_idx] ** 2)`
   Sort segments descending by total energy.
   This guarantees that the primary, most resonant spoken utterance is selected first at index 0, preventing accidental capture of background clicks or brief inhalation sighs.

7.4 Audio validation
Validate:
- Actual file format and codec.
- Duration (0.2s minimum, 15.0s maximum).
- Minimum amplitude (`max_amp >= 0.01` and `rms >= 0.005`) to reject dead silence.
- Resampling integrity and finite value verification.
- Reject malformed audio safely with user-friendly error messages.

8. XLS-R 300M EMBEDDING IMPLEMENTATION
This is one of the most important components.
Do not implement XLS-R as a simple classification model.
XLS-R produces frame-level contextual representations. A pooling strategy is required to obtain fixed-size utterance embeddings.
8.1 Model setup
Use:
- PyTorch
- Hugging Face Transformers
- Hugging Face Hub
Requirements:
- Select the exact XLS-R 300M checkpoint.
- Pin the model revision.
- Load the correct feature extractor.
- Inspect model configuration.
- Inspect expected sample rate.
- Inspect hidden dimension.
- Use inference mode.
- Disable gradients.
- Load model once per worker process during warm initialization (e.g. `@worker_process_init.connect` in Celery) to prevent process-forking OOM issues.
- Support CUDA when available.
- Support CPU inference as a fallback.
Do not train from scratch.
Start with a frozen pretrained model.
8.2 Embedding extraction
Implement:
services/embeddings/xlsr_encoder.py
Processing:
1. Accept validated waveform.
2. Resample using the actual processor requirements.
3. Apply the correct input normalization and generate attention masks for padded lengths.
4. Run XLS-R inference.
5. Extract the selected hidden states.
6. Apply masked mean pooling over valid non-padded speech frames using the attention mask to prevent zero-padding vector contamination.
7. L2-normalize the resulting embedding if using cosine similarity.
8. Validate dimension and finite values.
9. Return vector and metadata.
Metadata must include:
- Model ID.
- Model revision.
- Processor configuration.
- Pooling method.
- Embedding pipeline version.
- Sampling rate.
- Audio duration.
- Vector dimension.
- Normalization method.
The pooling implementation must be configurable and versioned.
Do not silently change pooling once production vectors have been indexed.
8.3 Separate embedding paths
For every valid recording:
Original waveform
      |
      v
XLS-R encoder
      |
      v
Original embedding


Denoised waveform
      |
      v
XLS-R encoder
      |
      v
Denoised embedding
Never combine the two waveforms before embedding.
Maintain separate records and vector collections.

9. VECTOR DATABASE IMPLEMENTATION
9.1 Primary database: Zilliz Cloud
Use Zilliz Cloud through PyMilvus.
Responsibilities:
- Store embeddings.
- Perform similarity search.
- Filter by language.
- Filter by dataset version.
- Filter by embedding version.
- Filter by audio variant.
- Return nearest recording candidates.
9.2 Fallback database: Qdrant
Use qdrant-client.
Maintain equivalent vectors and metadata.
Qdrant must be able to support recognition when Zilliz is genuinely unavailable.
9.3 Vector record metadata
Each vector must represent one audio recording or segment.
Required fields:
- vector_id
- word_id
- language_code
- audio_asset_id
- recording_id
- speaker_id where permitted
- segment_start_ms
- segment_end_ms
- audio_variant
- dataset_version
- embedding_model_id
- embedding_model_revision
- embedding_pipeline_version
- pooling_method
- sample_rate
- duration_ms
- created_at
The dictionary meanings must remain authoritative in PostgreSQL.
9.4 Search configuration
Use cosine similarity with normalized embeddings as the initial baseline.
Read the vector dimension from the actual model output.
Never hardcode the dimension.
Benchmark index parameters using the actual dataset.
Use versioned collections when incompatible embedding changes are introduced.
9.5 Primary and fallback behaviour
Implement:
VectorStore
    |
    +-- MilvusVectorStore
    |
    +-- QdrantVectorStore
Rules:
- Zilliz is primary.
- Qdrant is fallback.
- A successful empty search is not an outage.
- A connection failure is an outage condition.
- A timeout may trigger fallback.
- Server errors may trigger fallback.
- Circuit-breaker state must be tracked.
- Record which vector store served each query.
- Do not silently hide degraded mode.
9.6 Dual-store consistency
Do not assume writes to both stores are transactional.
Vector IDs must be generated using `UUIDv5` deterministically computed from `(dataset_version_id + word_id + audio_asset_id + audio_variant)` to ensure byte-for-byte primary key alignment across Zilliz and Qdrant.
Implement:
- Durable outbox.
- Idempotent vector IDs (UUIDv5).
- Retry with exponential backoff and jitter.
- Per-store indexing status.
- Replication failure tracking.
- Reconciliation jobs.
- Dead-letter handling.
- Administrative repair tools.
Never mark a vector as replicated to both databases until both writes have actually succeeded.

10. VOICE RECOGNITION PIPELINE (4-WAY CROSS-PATH RETRIEVAL)
Implement:
services/recognition/engine.py
The runtime acoustic retrieval flow is:
Incoming User Audio (WAV / WebM)
      |
      v
Butterworth 80Hz Highpass & Peak Normalization
      |
      v
VAD Primary Utterance Speech Extraction
      |
      +---------------------+
      |                     |
      v                     v
User Clean Raw Audio    User Denoised Derivative (noisereduce)
      |                     |
      v                     v
XLS-R 300M Encoder     XLS-R 300M Encoder
      |                     |
      v                     v
User Vector A          User Vector B
(1024-d Clean)         (1024-d Denoised)
      |                     |
      +----------+----------+
                 |
                 v
   4-Way Cross-Path Vector Search
   Path 1: Vector A vs {lang}_original_v1
   Path 2: Vector A vs {lang}_denoised_v1
   Path 3: Vector B vs {lang}_original_v1
   Path 4: Vector B vs {lang}_denoised_v1
                 |
                 v
Candidate Deduplication across All 4 Lists
                 |
                 v
Composite Acoustic Scoring (0.92 * Raw Sim + 0.08 * RRF)
                 |
                 v
Confidence Calibration & Decision Gate
                 |
                 v
PostgreSQL / Memory Cache Canonical Word Lookup
                 |
                 v
Final Recognition Result with Native Audio & Verified Meanings

10.1 4-Way Cross-Path Candidate Retrieval
Retrieve top-K candidates (K = 35) from each of the 4 retrieval channels:
1. `cands_orig_orig`: User raw vector against project original collection.
2. `cands_orig_den`: User raw vector against project denoised collection.
3. `cands_den_orig`: User denoised vector against project original collection.
4. `cands_den_den`: User denoised vector against project denoised collection.
Search strictly within the selected language's collection scope (`badaga_*` or `marwari_*`).
Each returned hit contains:
- `word_id`: Canonical word ID (e.g. `W0001`).
- `score`: Cosine similarity score in range [-1.0, 1.0].
- `audio_asset_id`: Specific recording filename.
- `speaker_id`: Native speaker ID (e.g. `S01`, `S03`).
- `audio_variant`: `'original'` or `'denoised'`.

10.2 Candidate Deduplication & Reciprocal Rank Fusion
1. Group all hits across the 4 candidate lists by `word_id`.
2. For each unique word:
   - Identify its best rank in each channel: $rank_{channel}(w)$.
   - Compute channel coverage: how many of the 4 channels retrieved this word in their top tier.
   - Calculate RRF score:
     $$RRF(w) = \sum_{c \in Channels} \frac{1}{K + rank_c(w)}$$ where $K = 40$.
   - Extract maximum raw cosine similarity across all channels:
     $$raw\_sim(w) = \max_{hit \in hits(w)} hit.score$$
3. Compute Composite Acoustic Score:
   $$composite(w) = 0.92 \times raw\_sim(w) + 0.08 \times \left(\frac{RRF(w)}{RRF_{max}}\right)$$
   **Critical Rationale**: In XLS-R acoustic space, cosine similarity directly measures phonetic/vocal proximity. Pure RRF can artificially inflate words simply due to list position variance. Giving 92% weight to raw cosine similarity ensures that the acoustically closest word is never displaced by rank jitter.
4. Sort candidates primarily by `(round(raw_sim, 4), composite)` descending.

10.3 Recognition Decision & Confidence Calibration
Four deterministic decision states:
1. `ACCEPTED` ($raw\_sim \ge 0.70$):
   High-confidence acoustic match. Returns top canonical word, Badaga native script, Tamil translation, English meaning, and authentic native speaker audio playback URL.
2. `AMBIGUOUS` ($0.50 \le raw\_sim < 0.70$):
   Acoustic characteristics are in close proximity to multiple words. Displays top candidate with up to 5 ranked alternatives for user selection.
3. `UNKNOWN` ($raw\_sim < 0.50$):
   Spoken audio does not match verified vocabulary. Abstains cleanly without fabricating a match.
4. `RETRY_REQUIRED`:
   Audio is silent, too short (< 200ms), clipped, or corrupted. Returns clear, helpful microphone guidance.
10.5 Confidence calibration
Do not hardcode thresholds based on intuition.
Build a validation dataset with:
- Correct examples.
- Hard negatives.
- Unknown words.
- Different speakers.
- Different recording conditions.
- Noisy recordings.
- Short utterances.
Evaluate:
- Top-1 accuracy.
- Top-3 accuracy.
- Mean reciprocal rank.
- False acceptance rate.
- False rejection rate.
- Ambiguous rate.
- Calibration error.
- Language-specific performance.
- Speaker-specific performance.
- p50 latency.
- p95 latency.
Select thresholds using validation data and report performance on an untouched test set.
Do not label cosine similarity as percentage confidence.

11. SPEAKER-INDEPENDENT EVALUATION
This is mandatory.
Do not randomly split recordings when recordings from the same speaker could appear in both training and testing.
Use:
- Development speakers.
- Validation speakers.
- Held-out test speakers.
All recordings from a speaker must remain within the same split.
Evaluate:
- Badaga performance.
- Marwari performance.
- Per-speaker accuracy.
- Per-word accuracy.
- Dialect variation where labelled.
- Microphone variation.
- Background noise.
- Recording distance.
- Unknown-word rejection.
If the dataset contains too few speakers, document this limitation.
Do not claim generalisation to unseen speakers without suitable evidence.
Create:
scripts/evaluate_recognition.py
The script must generate a machine-readable report and a human-readable evaluation summary.

12. POSTGRESQL DATABASE DESIGN
Use PostgreSQL as the canonical source of truth.
Implement the following logical tables.
users
- id
- email
- username
- password_hash or identity_provider_reference
- display_name
- status
- created_at
- updated_at
roles
- id
- role_name
Roles:
- student
- teacher
- admin
user_roles
- user_id
- role_id
languages
- id
- code
- canonical_name
- alternate_names
- status
vocabulary_entries
- id
- external_word_id
- language_id
- source_word
- tamil_meaning
- english_meaning
- notes
- status
- dataset_version_id
- created_at
- updated_at
audio_assets
- id
- vocabulary_entry_id
- language_id
- speaker_id
- original_object_key
- denoised_object_key
- checksum
- duration
- sample_rate
- channel_count
- codec
- consent_metadata
- created_at
audio_segments
- id
- audio_asset_id
- start_ms
- end_ms
- segment_index
- review_status
embedding_records
- id
- audio_segment_id
- vector_id
- audio_variant
- model_id
- model_revision
- pipeline_version
- collection_name
- dimension
- status
vector_replication_status
- id
- vector_id
- store_name
- status
- attempt_count
- last_error_code
- last_attempt_at
- replicated_at
dataset_versions
- id
- version_name
- source_checksum
- manifest_checksum
- preprocessing_version
- model_version
- status
- approved_by
- approved_at
- created_at
lessons
Store teacher-created learning lessons.
lesson_items
Store approved vocabulary references in lessons.
assignments
Store student lesson assignments.
practice_attempts
Store:
- user_id
- vocabulary_entry_id
- recognition result
- selected candidate
- attempt time
- feedback status
quizzes
Store quiz definitions.
quiz_attempts
Store student quiz attempts.
quiz_responses
Store individual answers.
correction_reports
Store reported incorrect vocabulary, meanings, or recognition results.
audit_logs
Store important administrative operations and approval history.
Use:
- Foreign keys.
- Unique constraints.
- Check constraints.
- Appropriate indexes.
- Transactions.
- Consistent UUID strategy.
- UTC timestamps.
Use SQLAlchemy 2 and Alembic.

13. GEMINI AND GROQ AI TEACHING ASSISTANT
The teaching assistant must be accurate, direct, and educational.
It must not behave like an unrestricted chatbot that invents language information.
13.1 Provider architecture
Implement:
LLMProvider
    |
    +-- GeminiProvider
    |
    +-- GroqProvider

LLMRouter
    |
    +-- Primary provider
    +-- Provider health
    +-- Timeout handling
    +-- Retry policy
    +-- Circuit breaker
    +-- Fallback provider
Use Gemini by default.
Use Groq when Gemini is unavailable or when explicitly configured for a particular task.
Do not send every request to both providers.
13.2 Grounded response pipeline
Every tutor response must follow:
1. Identify user intent.
2. Identify language.
3. Retrieve relevant approved vocabulary.
4. Retrieve approved lesson content.
5. Construct constrained context.
6. Call the selected LLM.
7. Validate structured output.
8. Verify all vocabulary IDs.
9. Retrieve canonical dictionary fields from PostgreSQL.
10. Replace model-generated dictionary values with canonical values.
11. Mark generated examples as unverified when necessary.
12. Return the response.
13.3 Tutor behaviour
The tutor must:
- Explain words clearly.
- Show verified Tamil meanings.
- Show verified English meanings.
- Provide simple learning examples.
- Explain approved lesson content.
- Generate vocabulary exercises.
- Generate quizzes using approved records.
- Help teachers prepare learning materials.
- Provide pronunciation playback.
- Admit when information is unavailable.
- Ask for clarification when a language or word is ambiguous.
- Avoid excessive formatting, emojis, and unnecessary bold text.
The tutor must never:
- Invent a dictionary meaning.
- Fabricate a Badaga or Marwari word.
- Claim an unverified sentence is authentic native usage.
- Invent grammar rules.
- Pretend to have processed audio that was not processed.
- Fabricate sources or citations.
- Modify approved dictionary records.
- Expose another student's private learning data.
13.4 Structured output
Use Pydantic schemas for model responses.
Suggested fields:
- response_text
- intent
- vocabulary_references
- examples
- quiz_items
- uncertainty_notes
- requires_teacher_review
Validate every response.
If output is malformed or contains unsupported vocabulary references, reject or safely repair it using canonical records.
13.5 Prompt injection protection
Treat user prompts, uploaded documents, workbook content, and retrieved records as untrusted data.
- Keep system instructions separate from retrieved context.
- Never allow retrieved content to override security policy.
- Enforce permissions in backend code.
- Do not provide direct database write tools to the LLM.
- Require human approval for dictionary corrections.
- Validate all tool calls.
- Prevent students from invoking teacher/admin operations through prompt manipulation.

14. STUDENT AND TEACHER FEATURES
14.1 Student mode
Implement:
- Student registration/login where approved.
- Language selection.
- Voice-based word search.
- Audio upload.
- Browser recording.
- Recognised vocabulary display.
- Tamil meaning.
- English meaning.
- Original pronunciation playback.
- Alternative candidate display.
- Unknown word handling.
- Retry instructions.
- Vocabulary lessons.
- Practice exercises.
- AI tutor.
- Quizzes.
- Practice history.
- Progress tracking.
14.2 Teacher mode
Implement:
- Teacher dashboard.
- Vocabulary search.
- Lesson creation.
- Lesson editing.
- Student/group assignments.
- Quiz creation.
- AI-assisted worksheets.
- Student progress reports.
- Recognition correction review.
- Vocabulary correction proposals.
- Approval/rejection workflow.
- Audit history.
Teacher-generated corrections must not directly alter approved canonical vocabulary until the authorised approval process is completed.
14.3 Administrator mode
Implement:
- User management.
- Role management.
- Dataset imports.
- Dataset inspection.
- Audio mapping review.
- Dataset approval.
- Model configuration.
- Vector database health.
- Replication monitoring.
- Failed job management.
- Provider configuration.
- Audit logs.
- System health.
- Data retention controls.

15. FRONTEND REQUIREMENTS & USER EXPERIENCE
Use Next.js 15, TypeScript, React 19, and Tailwind CSS.
Build a clean, modern, professional interface that completely avoids generic "AI-generated slope" aesthetics (no dark-mode neon glows, tacky colored blobs, or floating purple glassmorphism).

15.1 Aesthetic Architecture & Styling Standards
- **Theme**: Clean, crisp Light Theme (`bg-slate-50 text-slate-900` with subtle border lines `border-slate-200`).
- **Button Styling**: Pure black buttons with crisp white typography (`bg-black text-white hover:bg-slate-800 rounded-lg text-xs font-semibold`), with subtle hover scaling and clear focus rings.
- **Typography**: Clean modern sans-serif (`Inter`, `system-ui`).
- **Layout**: Fixed Left-Sidebar with main content stage.

15.2 Strictly 3 Navigation Tabs (Left Sidebar)
The platform interface is consolidated into exactly three dedicated functional views:
1. **AI Tutor Tab (`tutor`)**:
   - Conversational AI tutor interface supporting natural language queries in English and Tamil.
   - Microphone Voice Query button (`<Mic>` / active pulsing `<Square>`) for direct acoustic voice search.
   - Interactive chat history with distinct user and tutor message cards.
   - Verified vocabulary pill badges with audio playback buttons.
   - Real-time verbal explanation audio via TTS.
2. **Dictionary Tab (`dict`)**:
   - High-performance, searchable lexicon containing all 2,362 verified words (2,148 Badaga + 214 Marwari).
   - Real-time instant filtering by English meaning, Tamil meaning, and Badaga native word.
   - Language selector: `All (2362)`, `Badaga (2148)`, `Marwari (214)`.
   - Rich word cards displaying:
     - Word ID badge (e.g. `W0001`) and language badge.
     - English meaning and Tamil meaning.
     - Badaga native script where documented.
     - Native speaker audio playback buttons (`Play Voice`).
     - Web Speech / TTS pronunciation buttons for Tamil (`தமிழ்`) and English (`EN`).

15.3 Browser Voice Capture Requirements
- `navigator.mediaDevices.getUserMedia` constraints:
  ```typescript
  audio: {
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000,
  }
  ```
- MIME type detection: uses `audio/webm;codecs=opus` where supported, falling back to `audio/webm`.
- Timesliced recording: `mediaRecorder.start(100)` buffers audio continuously in 100ms chunks to prevent buffer loss.
- Grace period on stop: introduces a 200ms stop delay on button release so trailing consonants and vowels are never cut off.

15.4 Security Constraints
The frontend must never contain:
- Gemini API keys.
- Groq API keys.
- Zilliz Cloud credentials.
- Qdrant API keys.
- Database connection strings.
All operations must route strictly through the authenticated FastAPI `/api/v1` backend.

16. API DESIGN
Use:
/api/v1
Suggested endpoints:
Authentication
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET /users/me
Languages and vocabulary
- GET /languages
- GET /vocabulary
- GET /vocabulary/{word_id}
- GET /vocabulary/{word_id}/audio
- POST /vocabulary/{word_id}/corrections
Recognition
- POST /recognition
- GET /recognition/{job_id}
- GET /recognition/{job_id}/result
Lessons
- GET /lessons
- GET /lessons/{lesson_id}
- POST /lessons
- PATCH /lessons/{lesson_id}
- POST /lessons/{lesson_id}/assignments
Student learning
- GET /students/me/progress
- POST /quizzes
- POST /quizzes/{quiz_id}/attempts
AI tutor
- POST /tutor/chat
- POST /tutor/quiz-generation
- POST /tutor/lesson-assistance
Administration
- POST /admin/datasets/import
- GET /admin/datasets/{dataset_id}
- POST /admin/datasets/{dataset_id}/validate
- POST /admin/datasets/{dataset_id}/approve
- GET /admin/jobs
- GET /admin/vector-replication
- POST /admin/vector-replication/reconcile
- GET /admin/system/health
Use consistent error responses.
Include:
- Error code.
- Human-readable message.
- Request ID.
- Appropriate HTTP status.
Never expose internal stack traces or secrets to users.

17. FILE STORAGE
Use S3-compatible object storage.
Use MinIO during local development.
Store:
- Original audio.
- Denoised audio.
- Source Excel files.
- Dataset manifests.
- Generated reports.
- Approved learning resources.
Do not store large audio binaries directly inside vector databases.
Use random object keys.
Never trust user-supplied file paths.
Implement access-controlled signed URLs for audio playback.
Preserve original recordings.

18. SECURITY AND PRIVACY
Implement:
- HTTPS.
- Role-based access control.
- Secure authentication.
- Argon2id password hashing if passwords are managed directly.
- HttpOnly and Secure cookies where appropriate.
- CSRF protection when required.
- CORS allowlists.
- Rate limiting.
- Upload size limits.
- Audio validation.
- Path traversal prevention.
- Secret management.
- Database least privilege.
- Secure object storage.
- Audit logging.
- Data retention policies.
- Backup and restoration.
- Dependency scanning.
Voice recordings are sensitive data.
Obtain appropriate consent.
Use pseudonymous speaker identifiers.
Do not infer a person's identity from their voice.
Do not use recordings for model training without explicit authorisation.
Do not log raw audio or sensitive personal information.

19. BACKGROUND JOBS AND RELIABILITY
Use Celery and Redis.
Initialize heavy models (PyTorch / XLS-R) once during worker process startup hooks (`@worker_process_init.connect`) to prevent memory leaks and out-of-memory worker crashes.
Create background tasks for:
- Dataset import.
- Workbook inspection.
- Audio validation.
- Audio preprocessing.
- VAD.
- Embedding generation.
- Vector indexing.
- Vector replication.
- Vector reconciliation.
- Evaluation reports.
- Large exports.
Implement:
- Retry policies.
- Exponential backoff.
- Jitter.
- Idempotency.
- Dead-letter handling.
- Job status tracking.
- Worker health checks.
- Failure reporting.
A worker restart must not corrupt an ingestion job.
Long-running jobs must be resumable.
Use Redis as infrastructure, not as the canonical source of application data.

20. MONITORING AND OBSERVABILITY
Use:
- structlog.
- OpenTelemetry.
- Prometheus.
- Grafana.
- Sentry.
Monitor:
- API latency.
- API error rate.
- Recognition latency.
- XLS-R inference latency.
- Audio processing latency.
- Vector search latency.
- Zilliz availability.
- Qdrant availability.
- Fallback frequency.
- Replication lag.
- Celery queue depth.
- Failed ingestion jobs.
- LLM provider latency.
- LLM provider failures.
- Token usage.
- Estimated LLM cost.
- Unknown recognition rate.
- Ambiguous recognition rate.
- Recognition evaluation metrics.
Use structured logs.
Include request IDs and job IDs.
Do not log secrets, raw recordings, or unnecessary personal information.

21. TESTING STRATEGY
Use pytest, pytest-asyncio, HTTPX, Vitest, and Playwright.
Unit tests
Test:
- Audio decoding.
- Audio validation.
- Resampling.
- Mono conversion.
- VAD.
- Segmentation.
- Denoising.
- XLS-R embedding extraction.
- Embedding normalization.
- Vector ID generation.
- Rank fusion.
- Candidate aggregation.
- Confidence policy.
- Provider routing.
- LLM output validation.
- Permission enforcement.
Integration tests
Test:
- PostgreSQL.
- Redis.
- MinIO.
- Milvus/Zilliz adapter.
- Qdrant adapter.
- Vector replication.
- Vector reconciliation.
- Gemini adapter.
- Groq adapter.
- Authentication.
- API workflows.
Use mocks for external APIs in ordinary CI tests. Run separate controlled integration tests against real services before release.
End-to-end tests
Test:
1. Administrator imports dataset.
2. Workbook is inspected.
3. Audio is mapped.
4. Dataset is validated.
5. Dataset is approved.
6. Original audio is preserved.
7. Denoised audio is generated.
8. Embeddings are created.
9. Vectors are indexed.
10. Student records an audio sample.
11. Recognition is executed.
12. Verified dictionary information is returned.
13. Student practises vocabulary.
14. Teacher creates a lesson.
15. Student completes a quiz.
16. Teacher reviews a correction.
Security tests
Test:
- Unauthorised access.
- Role escalation.
- IDOR.
- Path traversal.
- Oversized uploads.
- MIME spoofing.
- Malformed audio.
- Prompt injection.
- Rate-limit bypass.
- CSRF where applicable.
- Secret leakage.
- Dependency vulnerabilities.

22. PERFORMANCE AND SCALABILITY
Do not claim a user capacity without testing.
Benchmark:
- Audio processing time.
- XLS-R inference time.
- Vector search time.
- Database query time.
- End-to-end recognition latency.
- Concurrent uploads.
- Concurrent recognition jobs.
- GPU memory consumption.
- CPU fallback performance.
- LLM latency.
Optimise based on measured bottlenecks.
Requirements:
- Load the XLS-R model once per worker using pre-warmed worker process signals.
- Use bounded worker concurrency.
- Avoid unnecessary model reloads.
- Use database connection pooling.
- Use pagination.
- Use asynchronous API operations where appropriate.
- Use background jobs for long-running work.
- Apply rate limits.
- Monitor queue saturation.
Support CUDA if available and CPU inference as a development fallback.

23. REPOSITORY STRUCTURE
Use this as the initial structure, adapting it to the actual repository.
project/
|
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── api/v1/
│   │   │   ├── core/
│   │   │   ├── schemas/
│   │   │   ├── dependencies/
│   │   │   └── main.py
│   │   └── tests/
│   |
│   └── web/
|
├── services/
│   ├── vocabulary/
│   ├── ingestion/
│   ├── audio/
│   ├── embeddings/
│   ├── recognition/
│   ├── vector_store/
│   ├── tutor/
│   ├── learning/
│   └── identity/
|
├── workers/
│   ├── celery_app.py
│   └── tasks/
|
├── models/
│   ├── model_manifest.yaml
│   └── evaluation/
|
├── migrations/
|
├── scripts/
│   ├── inspect_dataset.py
│   ├── import_dataset.py
│   ├── evaluate_recognition.py
│   ├── reindex_vectors.py
│   └── reconcile_vectors.py
|
├── tests/
│   ├── fixtures/
│   ├── integration/
│   └── e2e/
|
├── infra/
│   ├── docker/
│   ├── compose/
│   ├── monitoring/
│   └── deployment/
|
├── docs/
│   ├── architecture.md
│   ├── dataset-format.md
│   ├── model-card.md
│   ├── security.md
│   ├── operations-runbook.md
│   └── evaluation-report-template.md
|
├── .env.example
├── pyproject.toml
├── uv.lock
├── docker-compose.yml
└── README.md
Use uv for Python dependency management and locking.
Do not introduce multiple competing Python package managers.

24. CONFIGURATION
Use pydantic-settings.
Provide .env.example containing placeholders only.
Required configuration categories:
APP_ENV=development
APP_NAME=voice-vocabulary-platform
API_V1_PREFIX=/api/v1

DATABASE_URL=
REDIS_URL=

OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_BUCKET=
OBJECT_STORAGE_ACCESS_KEY=
OBJECT_STORAGE_SECRET_KEY=

MILVUS_URI=
MILVUS_TOKEN=
MILVUS_DATABASE=

QDRANT_URL=
QDRANT_API_KEY=

XLSR_MODEL_ID=
XLSR_MODEL_REVISION=
XLSR_DEVICE=auto
XLSR_POOLING=masked_mean

EMBEDDING_PIPELINE_VERSION=v1

GEMINI_API_KEY=
GEMINI_MODEL=

GROQ_API_KEY=
GROQ_MODEL=

MAX_UPLOAD_BYTES=
MAX_AUDIO_DURATION_SECONDS=

RECOGNITION_TOP_K=15
RRF_K=60

SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=
Do not put actual secrets in source control.
Validate required production configuration during startup.

25. IMPLEMENTATION ROADMAP
You must implement this project in the following phases.
Do not skip phases.
Do not start a later phase while critical tests in the current phase are failing.
PHASE 0: REPOSITORY AND DATASET DISCOVERY
Tasks:
- Inspect existing repository.
- Inspect actual Excel workbook.
- Inspect available audio files.
- Identify all workbook columns.
- Identify audio formats.
- Check whether files contain multiple repetitions.
- Identify duplicate and missing data.
- Confirm XLS-R checkpoint and processor requirements.
- Inspect available hardware.
- Document technical risks.
Deliverables:
- Dataset inspection report.
- Initial architecture document.
- Risk register.
- Model configuration decision.
Do not modify or delete the original dataset.
PHASE 1: PROJECT FOUNDATION
Tasks:
- Create Python environment.
- Install pinned dependencies.
- Create FastAPI project.
- Configure PostgreSQL.
- Configure Redis.
- Configure MinIO.
- Configure SQLAlchemy.
- Configure Alembic.
- Implement structured logging.
- Implement health endpoints.
- Add CI.
Test:
- Clean project startup.
- Database connection.
- Migrations.
- Redis connection.
- Object storage connection.
- CI pipeline.
PHASE 2: DATABASE AND AUTHENTICATION
Tasks:
- Create database models.
- Create migrations.
- Implement authentication.
- Implement student/teacher/admin roles.
- Implement permission checks.
- Implement vocabulary repositories.
- Add audit logging.
Test role isolation and database integrity.
PHASE 3: DATASET INGESTION
Tasks:
- Excel inspection.
- Column mapping.
- Audio matching.
- Checksum generation.
- Duplicate detection.
- Validation reporting.
- Background ingestion.
- Dataset versioning.
- Admin approval.
Test repeatable and idempotent imports.
PHASE 4: AUDIO PREPROCESSING
Tasks:
- Audio decoding.
- Validation.
- Resampling.
- Mono conversion.
- VAD (with 300ms–4000ms thresholds).
- Segmentation.
- Denoising.
- Original and denoised storage.
Test with:
- Clean audio.
- Noisy audio.
- Silent audio.
- Clipped audio.
- Stereo audio.
- Corrupted audio.
- Multiple repetitions.
PHASE 5: XLS-R EMBEDDING SERVICE
Tasks:
- Load pinned XLS-R model.
- Load correct processor.
- Implement inference.
- Implement attention-masked mean pooling over valid non-padded frames.
- Implement normalization.
- Validate dimensions.
- Record model metadata.
- Add performance benchmarks.
Test both original and denoised embedding generation.
PHASE 6: VECTOR DATABASES
Tasks:
- Implement Milvus adapter.
- Implement Qdrant adapter.
- Create collections.
- Configure similarity metrics.
- Implement deterministic vector IDs using UUIDv5.
- Implement dual-store replication.
- Implement retries.
- Implement circuit breakers.
- Implement reconciliation.
Test:
- Zilliz success.
- Zilliz timeout.
- Zilliz connection failure.
- Qdrant fallback.
- Successful empty search.
- Duplicate vector writes.
- Recovery and reconciliation.
PHASE 7: RECOGNITION ENGINE
Tasks:
- Dual-path embeddings.
- Dual-path retrieval.
- Candidate aggregation.
- RRF.
- Reranking.
- Confidence calibration.
- Unknown detection.
- Ambiguous detection.
- Retry handling.
- Evaluation tooling.
Produce actual evaluation reports.
Do not claim accuracy without a held-out test set.
PHASE 8: AI TUTOR
Tasks:
- Gemini adapter.
- Groq adapter.
- Provider router.
- Fallback policy.
- Structured output schemas.
- Grounded context retrieval.
- Student tutor.
- Teacher tutor.
- Quiz generation.
- Prompt injection protection.
Test hallucination prevention and database grounding.
PHASE 9: FRONTEND
Tasks:
- Authentication.
- Student dashboard.
- Teacher dashboard.
- Admin dashboard.
- Voice recording.
- Audio upload.
- Recognition results.
- Vocabulary display.
- Audio playback.
- Lessons.
- Quizzes.
- AI tutor.
- Progress tracking.
- Correction review.
Run frontend tests and end-to-end workflows.
PHASE 10: PRODUCTION HARDENING
Tasks:
- Security testing.
- Rate limiting.
- Monitoring.
- Logging.
- Backup configuration.
- Restore testing.
- Load testing.
- Deployment documentation.
- Rollback documentation.
- Production readiness review.
Do not declare the application production-ready until all release gates pass.

26. CODING AGENT RULES
These instructions are mandatory.
Before coding
1. Inspect the entire existing repository.
2. Understand existing dependencies.
3. Inspect available dataset files.
4. Identify missing inputs.
5. Document the architecture.
6. Identify technical risks.
7. Propose the phase implementation plan.
During coding
1. Work phase by phase.
2. Write modular, readable code.
3. Follow Python typing conventions.
4. Use dependency injection where appropriate.
5. Keep business logic out of API route handlers.
6. Use SQLAlchemy repositories and service layers.
7. Validate external inputs.
8. Add tests with every major feature.
9. Run tests after meaningful changes.
10. Keep dependencies pinned.
11. Avoid unnecessary abstractions.
12. Avoid giant files.
13. Avoid duplicated business logic.
14. Avoid hardcoded credentials.
15. Avoid hardcoded recognition thresholds.
16. Avoid hardcoded model dimensions.
17. Avoid fabricated dataset records.
18. Avoid untested model assumptions.
After every phase
Report:
- Features implemented.
- Files created.
- Files modified.
- Architecture decisions.
- Commands executed.
- Tests executed.
- Test results.
- Known limitations.
- Security considerations.
- Remaining blockers.
- Next phase.
Never report a successful test unless you actually ran it.
If a required cloud credential or dataset is unavailable, implement the appropriate adapter and test with mocks or fixtures, clearly documenting that live integration remains unverified.
Do not fabricate cloud connectivity or production test results.
Architecture change policy
Do not silently replace:
- XLS-R.
- Zilliz.
- Qdrant.
- PostgreSQL.
- Gemini.
- Groq.
- Audio processing tools.
If a technology is incompatible, provide:
1. The exact incompatibility.
2. Evidence.
3. The proposed alternative.
4. Architectural impact.
5. Migration implications.
Wait for approval before making a major architecture change.

27. PRODUCTION ACCEPTANCE CRITERIA
The application can be considered a production candidate only when:
- The real workbook can be imported.
- Audio references can be validated.
- Word IDs are stable.
- Tamil meanings are preserved correctly.
- English meanings are preserved correctly.
- Original audio is retained.
- Denoised audio is stored independently.
- XLS-R embeddings are reproducible.
- Original and denoised vector paths work.
- Zilliz is the primary vector database.
- Qdrant works as the genuine outage fallback.
- Vector replication is monitored and repairable.
- Recognition uses candidate fusion and reranking.
- Recognition can return unknown or ambiguous.
- Confidence thresholds are calibrated using held-out data.
- Dictionary values are fetched from PostgreSQL.
- Student and teacher permissions are enforced.
- Gemini and Groq provider routing works.
- AI tutor responses are grounded in approved records.
- The AI can admit uncertainty.
- Audio uploads are secured.
- API rate limiting works.
- Monitoring is operational.
- Backups and restoration are tested.
- Automated tests pass.
- Deployment and rollback procedures are documented.

28. IMPORTANT TECHNICAL RISKS
You must actively monitor these risks.
1. Limited recordings per word may cause poor recognition for unseen speakers.
2. Two repetitions in one recording may require careful segmentation.
3. Denoising can remove phonetic information.
4. XLS-R is not automatically a word-level classifier.
5. Very short words may be difficult to distinguish acoustically.
6. Dialect variation may affect recognition.
7. Random recording splits can cause speaker leakage.
8. Zilliz and Qdrant are not transactionally consistent.
9. Gemini and Groq can hallucinate low-resource language information.
10. Local STT/TTS models may not support Badaga or Marwari.
11. High-dimensional embeddings may require significant memory and indexing resources.
12. GPU inference capacity must be measured rather than assumed.
Document these risks.
Do not hide them behind a polished UI.

29. FINAL BUILD DIRECTIVE
Your primary objective is to deliver a production-grade Badaga and Marwari voice-based vocabulary learning application.
The architecture must preserve this division of responsibility:
XLS-R 300M: Generates speech embeddings and helps identify vocabulary candidates.
Zilliz Cloud: Primary vector similarity search.
Qdrant: Fallback vector search during genuine primary-store outages.
PostgreSQL: Authoritative vocabulary IDs, Badaga/Marwari words, Tamil meanings, and English meanings.
Gemini: Primary AI teaching and conversational intelligence.
Groq: Secondary LLM provider and configurable fallback.
Redis + Celery: Caching and reliable background processing.
S3-compatible storage: Original recordings, denoised recordings, and dataset files.
Next.js: Student, teacher, and administrator interface.
PyTorch + Hugging Face Transformers: XLS-R inference and embedding extraction.
The system's defining principle is:
NEVER GUESS WHEN THE DATA DOES NOT SUPPORT A RELIABLE ANSWER.
When a spoken word cannot be identified confidently, return an unknown or ambiguous result.
When the dictionary does not contain a meaning, explicitly state that the information is unavailable.
When an AI-generated teaching example is not verified by a qualified speaker, label it accordingly.
Start with PHASE 0. Inspect the actual repository and dataset, produce the discovery report, and wait for the phase review before proceeding.
Build carefully, test continuously, document decisions, and prioritise correctness over implementation speed.