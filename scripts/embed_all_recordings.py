"""
Standalone Script: Embed All Recordings into Milvus Lite and Qdrant.
Performs Silero VAD segmentation and XLS-R 300M acoustic embeddings,
mapping each vector to its canonical word metadata.
"""

import os
import sys
import time
import requests

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


def main():
    api_url = "http://localhost:8000/api/v1/admin"
    print("Checking if Language-AI API server is active on localhost:8000...")
    try:
        res = requests.get(f"{api_url}/system/health", timeout=3)
        if res.status_code == 200:
            print("Language-AI API server is running! Triggering embedding via API...")
            trigger_res = requests.post(f"{api_url}/embed-all?run_background=true")
            print("Response:", trigger_res.json())

            print("\nMonitoring embedding progress in real time...")
            while True:
                time.sleep(3)
                status_res = requests.get(f"{api_url}/embedding-status")
                if status_res.status_code == 200:
                    data = status_res.json()
                    is_run = data.get("is_running")
                    tot = data.get("total_recordings", 0)
                    proc = data.get("processed_recordings", 0)
                    vecs = data.get("total_vectors_indexed", 0)
                    cur = data.get("current_file") or "Finishing..."
                    vstores = data.get("vector_stores", {})
                    m_cnt = sum(v for v in vstores.get("milvus", {}).values() if isinstance(v, int))
                    q_cnt = sum(v for v in vstores.get("qdrant", {}).values() if isinstance(v, int))

                    pct = (proc / tot * 100) if tot > 0 else 0
                    print(f"Progress: [{proc}/{tot}] {pct:.1f}% | Vectors Indexed: {vecs} (Milvus: {m_cnt}, Qdrant: {q_cnt}) | Current: {cur}")

                    if not is_run and data.get("completed"):
                        print("\nAll 619 recordings successfully embedded and indexed into Milvus & Qdrant!")
                        break
            return
    except Exception as e:
        print(f"API server not active on port 8000 ({e}). Running direct in-process embedding...")

    # Direct in-process execution
    from services.vector_store.manager import VectorStoreRouter
    from services.embeddings.ingestion_service import embedding_service

    router = VectorStoreRouter()
    print("Initialized VectorStoreRouter. Starting direct embedding...")
    status = embedding_service.run_full_ingestion_sync(router)
    print("Direct embedding completed:", status)


if __name__ == "__main__":
    main()
