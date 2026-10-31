# VaniVoice — Heritage Language AI Platform (Badaga & Marwari)

A production-grade, voice-first heritage language learning and dictionary platform for **Badaga (படகு)** and **Marwari (मारवाड़ी)** with Tamil script literacy grounding, real photographic flashcards, and native acoustic verification.

---

## 🌟 Key Features

1. **Deduplicated Canonical Dictionary**:
   - **396 Unified Flashcard Concepts** across 20 pedagogical categories (Body Parts, Family & Relations, House & Objects, Kitchen & Vessels, etc.).
   - Multi-dialect support: Single unified concept cards for shared words (e.g., Head, Eye, Mother, Father) featuring both Badaga and Marwari native audio samples.
   - Distinct language filtering: Filter to 285 Badaga words or 214 Marwari words with one click.
   - **100% Real Photographic Flashcards**: Isolated, focused, real-world photographs for every single concept card.
   - **Mother-Tongue Tamil Script Breakdown**: Syllabic segmentation in Tamil script with equation formulas (e.g. `த + லை` = `தலை`) without Latin phonetic splitting.

2. **Native Audio Experience**:
   - Discrete audio player with sample selection dropdown when multiple native recordings exist.
   - Tamil and English audio pronunciation buttons.
   - Native audio streaming directly from edge CDN (`/audio/*.wav`).

3. **Ground-Truth AI Tutor**:
   - Pure VectorDB grounding (Milvus / Qdrant) with secondary LLM fallback (Groq LLaMA 3.3 / Google Gemini).
   - Zero hallucination: Strictly answers within verified vocabulary.

4. **Adaptive Quiz Practice**:
   - Real-time quiz generation with dynamic distractors and audio listening exercises.

---

## 🚀 One-Click Deploy to Vercel via GitHub

This repository is optimized for zero-configuration, production-level deployment to **Vercel** with Next.js 16 and native Serverless Route Handlers.

### Steps to Deploy:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Production release: deduplicated dictionary & Vercel deployment readiness"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Import your GitHub repository.
   - **Root Directory**: Leave as default root `./` (the root `vercel.json` and `package.json` handle building `apps/web`), OR set to `apps/web`.
   - **Framework Preset**: Next.js.

3. **Environment Variables on Vercel** (Optional):
   | Variable | Description | Default |
   |---|---|---|
   | `GROQ_API_KEY` | Groq API Key for AI Tutor conversational responses | *(Optional)* |
   | `GEMINI_API_KEY` | Google Gemini API Key | *(Optional)* |
   | `PYTHON_BACKEND_URL` | URL of external Python backend if hosting FastAPI separately | *(Optional - Next.js handles all routes natively)* |

4. **Deploy**: Click **"Deploy"**. Your application will be live at `https://<your-project>.vercel.app` in under 2 minutes.

---

## 💻 Local Development

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (for running the full-stack acoustic vector pipeline)

### Quick Start (Frontend & Built-in Serverless API)
```bash
# Install dependencies
npm install

# Run Next.js web application
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Running Full Full-Stack Environment (FastAPI + Next.js)
```bash
# Start both backend and frontend concurrently
node scripts/dev.js
```
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`

---

## 📁 Repository Structure

```
├── apps/
│   ├── api/                     # FastAPI backend service (Python)
│   └── web/                     # Next.js 16 web application (TypeScript, Tailwind CSS)
│       ├── app/                 # Next.js App Router & Serverless API Routes
│       │   ├── api/v1/          # Built-in Edge/Serverless Route Handlers
│       │   └── page.tsx         # Main interactive UI (Tutor, Dictionary, Quiz)
│       └── public/
│           ├── audio/           # 619 Native WAV audio recordings
│           ├── vocab-images/    # 396 Photographic flashcards
│           └── data/            # Pre-compiled canonical vocabulary JSON
├── services/                    # Vector store (Milvus & Qdrant) & acoustic pipelines
├── Badaga/                      # Source audio recordings organized by Pack
├── Marwari/                     # Source audio recordings organized by Pack
├── scripts/                     # Data processing, image sourcing & dev utilities
├── vercel.json                  # Production Vercel deployment configuration
├── .gitignore                   # Secrets and large binary exclusion rules
└── package.json                 # Monorepo build and development scripts
```

---

## 🔒 Security & Privacy
- Sensitive keys (`Credentials.txt`, `.env`) are excluded from version control via `.gitignore`.
- Vector embeddings and database connections are parameterized via environment variables.
- Audio and image assets are served securely via CDN with range requests enabled.
