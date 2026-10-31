# PRODUCTION ARCHITECTURE SPECIFICATION
## Badaga & Marwari Voice-Based Vocabulary Learning Platform

```mermaid
graph TD
    Client[Next.js 14 Frontend<br/>TypeScript / Tailwind / shadcn/ui] -->|REST / OpenAPI| API[FastAPI Backend]
    
    subgraph Storage & Infrastructure
        API --> DB[(PostgreSQL 16<br/>Canonical Dictionary & Records)]
        API --> Redis[(Redis 7<br/>Cache & Celery Broker)]
        API --> MinIO[(S3 / MinIO<br/>Original & Denoised Audio)]
    end

    subgraph Audio Recognition Pipeline
        API --> AudioProc[Audio Preprocessing & VAD<br/>Silero VAD / SciPy / noisereduce]
        AudioProc -->|Original Audio| XLSR_Orig[XLS-R 300M Encoder<br/>Masked Mean Pooling]
        AudioProc -->|Denoised Audio| XLSR_Denoised[XLS-R 300M Encoder<br/>Masked Mean Pooling]
        
        XLSR_Orig --> EmbA[Original Vector 1024-d]
        XLSR_Denoised --> EmbB[Denoised Vector 1024-d]
        
        EmbA --> PrimZilliz[Zilliz Cloud / Milvus<br/>Primary Vector Store]
        EmbB --> PrimZilliz
        
        PrimZilliz -.->|Outage Fallback| FallbackQdrant[Qdrant Cloud<br/>Fallback Vector Store]
        
        PrimZilliz --> Fusion[Candidate Fusion & RRF<br/>Reciprocal Rank Fusion k=60]
        FallbackQdrant --> Fusion
        
        Fusion --> Calib[Confidence Calibration<br/>Accepted / Ambiguous / Unknown]
        Calib --> DB
    end

    subgraph AI Teaching Assistant
        API --> TutorRouter[LLM Provider Router]
        TutorRouter -->|Primary| Gemini[Google Gemini API]
        TutorRouter -->|Secondary Fallback| Groq[Groq Llama 3.3 70B]
        Gemini --> ValidLayer[Pydantic Validation &<br/>PostgreSQL Grounding Layer]
        Groq --> ValidLayer
    end
```

### 1. Architectural Boundaries & Division of Responsibility
1. **PostgreSQL 16**: Authoritative canonical source of truth for all vocabulary records, English/Tamil translations, user accounts, lessons, quizzes, practice history, and vector replication audit logs.
2. **XLS-R 300M (`facebook/wav2vec2-xls-r-300m`)**: Frame-level acoustic encoder producing 1024-dimensional speech embeddings with attention-masked mean pooling.
3. **Zilliz Cloud (PyMilvus)**: Primary vector similarity search across versioned collections (`badaga_original_v1`, `badaga_denoised_v1`, `marwari_original_v1`, `marwari_denoised_v1`).
4. **Qdrant Cloud (`qdrant-client`)**: Dedicated fallback vector database when Zilliz Cloud experiences outages.
5. **Google Gemini API & Groq API**: Generative tutoring, explanation, and quiz generation strictly grounded in approved PostgreSQL records.
6. **Object Storage (S3 / MinIO)**: Storage of pristine original recordings and denoised derivatives.
7. **Next.js Web Client**: Accessible, responsive student, teacher, and administrator portal with audio recording and verified pronunciation playback.
