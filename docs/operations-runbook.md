# OPERATIONS RUNBOOK
## Badaga & Marwari Voice-Based Vocabulary Learning Platform

### 1. Service Startup & Local Execution

#### Backend API (FastAPI)
```bash
source .venv/bin/activate
uvicorn apps.api.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Swagger UI documentation will be live at: `http://localhost:8000/docs`

#### Frontend (Next.js 14)
```bash
cd apps/web
npm run dev
```
Web client will be live at: `http://localhost:3000`

#### Background Worker (Celery + Redis)
```bash
celery -A workers.celery_app.celery_app worker --loglevel=info --concurrency=2
```

---

### 2. Dataset Ingestion & Maintenance
To run or resume idempotent dataset ingestion from `Mother Tongue Recordings Log.xlsx`:
```bash
.venv/bin/python scripts/import_dataset.py
```
- Validates Excel structure and column headers
- Computes SHA-256 checksums
- Performs Silero VAD segmentation (300ms - 4000ms)
- Creates and stores conservative denoised audio derivatives in `storage/denoised/`
- Computes deterministic UUIDv5 vector keys
- Replicates across Zilliz Cloud and Qdrant

---

### 3. Speaker-Independent Evaluation
To evaluate acoustic recognition accuracy without speaker leakage:
```bash
.venv/bin/python scripts/evaluate_recognition.py
```
Outputs machine-readable metrics to `docs/speaker-independent-evaluation-report.json` and human-readable analysis to `docs/speaker-independent-evaluation-report.md`.

---

### 4. Vector Failover & Degradation Recovery
- **Primary Store:** Zilliz Cloud (`badaga_original_v1`, `marwari_original_v1`)
- **Fallback Store:** Qdrant Cloud
- When Zilliz encounters network timeouts or connection drops, `VectorStoreRouter` automatically redirects similarity queries to Qdrant without application disruption.
- Failed replications are tracked in the PostgreSQL `vector_replication_status` table.
- To reconcile pending vector writes, execute:
```bash
curl -X POST http://localhost:8000/api/v1/admin/vector-replication/reconcile \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
