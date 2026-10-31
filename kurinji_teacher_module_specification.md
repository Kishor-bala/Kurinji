# KURINJI — Teacher Module & Interface Specification

**Target User:** Class 1–2 Teachers in Hill/Tribal Primary Schools (Multi-grade Context)

**Core Objective:** Zero-typing, ultra-low complexity interface for managing, creating, and running offline bilingual bridge lessons.

## 1. 📦 Packages Tab (Official & Shared Content)

The central repository for downloading, previewing, and managing official state-curriculum packs and shared community bridge decks.

### Key Capabilities & UI Workflow

* **Network State Awareness:**

  * Displays real-time sync indicators: `🟢 Ready Offline`, `🟡 Update Available (1.8 MB)`, or `☁️ Online Only`.

  * Allows one-tap bulk downloads for all 4 weeks of the current month during town syncs.

* **Curated Official Decks:**

  * Categorized by State FLN targets (e.g., *Week 6: Target Letter "ம" & Numbers 1–5*).

  * Includes community-contributed regional variants (e.g., *Nilgiris - Kotagiri Dialect Deck*).

* **Card-by-Card Interactive Preview:**

  * Tap any pack to launch a full-screen interactive modal before downloading. Teachers can:

    * Cycle through lesson cards.

    * Play the local elder home-language audio snippet (`badaga_neeru.mp3`).

    * Review target Tamil script and phonetics.

    * Test the teacher's audio prompt script.

    * **Demo Class Mode:** Run a 1-card mock activity to test audio volume before saving.

* **Storage Footprint & Device Guard:**

  * Shows explicit storage impact (e.g., `Memory footprint: 2.1 MB`).

  * Triggers a visual warning if phone internal storage drops below 500 MB.

* **Post-Download Unlock & Forking:**

  * Downloaded official packs can be "unlocked" with 1 tap.

  * Teachers can save a local duplicate, replace specific words or pictures with local hamlet variations, and preserve the original official pack intact.

## 2. 🛠️ Package Builder Tab (Custom Content Studio)

A full creative studio enabling teachers to construct custom bridge packages using multi-source images, local audio capture, and automated AI text processing.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PACKAGE BUILDER WORKFLOW                        │
│                                                                        │
│   ┌────────────────┐      ┌────────────────┐      ┌────────────────┐   │
│   │ 1. VISUAL      │ ──►  │ 2. VISION AI   │ ──►  │ 3. AUDIO &     │   │
│   │    INGESTION   │      │    AUTO-TEXT   │      │    VOICE DB    │   │
│   │ (ZIP/Local/Web)│      │ (Bilingual Text│      │ (Record/STT)   │   │
│   └────────────────┘      └────────────────┘      └────────────────┘   │
│                                                           │            │
│                                                           ▼            │
│                           ┌────────────────┐      ┌────────────────┐   │
│                           │ 5. SAVE & SYNC │ ◄──  │ 4. FLOW & SKIP │   │
│                           │   (Pack JSON)  │      │    CONTROLS    │   │
│                           └────────────────┘      └────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘

```

### A. Multi-Source Image Ingestion Engine

1. **Local ZIP / Directory Import:**

   * Import compressed asset packs directly from phone storage or SD cards.

   * Auto-extracts image files (`.png`, `.jpg`, `.webp`) and parses attached `.csv` metadata if present.

2. **Local DB Vector Search:**

   * Query offline stock vector graphics stored locally on the phone's internal storage.

   * Categories: *Animals, Nature, Body Parts, Numbers, Food, Mountain Landscape*.

3. **In-App Web Browser with Floating Action Overlay:**

   * Opens an embedded web browser within the builder interface.

   * **Floating Overlay Tool:** When searching Google Images or web pages, a persistent floating bar appears: `[ ✂️ Select & Attach Image ]`.

   * **Auto-Processing:** Tapping an image on the web automatically crops it to a 1:1 aspect ratio, compresses it to WebP format ($<100\text{ KB}$), and links it to the active lesson card.

### B. Vision AI Auto-Text Processing Pipeline

* Attaching an image automatically passes the image tensor through an offline/online Vision AI model.

* **Multilingual Auto-Tagging:** Automatically populates three synchronized text fields:

  * **English Concept:** `Water`

  * **Tamil Target Word:** `தண்ணீர்`

  * **Mother Tongue Word (e.g., Badaga):** `நீரு` (Neeru)

* **Confidence & One-Tap Verification:**

  * Displays a green checkmark if visual confidence is high ($>90\%$).

  * If confidence is lower, the app presents 3 quick alternative suggestions (e.g., *1. Stream / 2. River / 3. Water*).

  * Teachers can tap to select or edit text using an easy on-screen Tamil/English keyboard.

### C. Audio Capture & Smart Search

1. **Voice Search in Audio DB (Local STT Engine):**

   * Teachers tap the mic search icon and speak naturally in Tamil, English, or mother tongue (e.g., saying *"Water"* or *"Thanneer"*).

   * The local **Ollama Speech-to-Text (STT)** engine transcribes the spoken phrase.

   * The app queries local database IDs and retrieves matching mother-tongue audio recordings (`badaga_neeru.mp3`).

2. **Direct Mic Capture & Waveform Studio:**

   * Integrated 1-tap mic button for recording village elders or native speakers on the spot.

   * Features automatic noise reduction and volume normalization.

   * Simple waveform view allows teachers to trim leading/trailing silence before saving.

### D. Sequence, Skip & Flow Customization

* **Drag-and-Drop Reordering:** Reorder cards in the lesson deck visually.

* **Flexible Skip Controls (Conditional Logic):**

  * **Skip at Start:** Bypass intro oral warm-up cards for advanced classes.

  * **Skip at Mid:** Skip home-language audio bridge cards if student analysis shows $>80\%$ mastery in Tamil.

  * **Skip at End:** Skip assessment cards during short practice runs.

## 3. 🏫 Offline Teaching Tab (Classroom Presentation Player)

A full-screen classroom presentation interface engineered for 100% offline execution.

* **100% Offline Execution:** Runs completely without cellular data or internet signals.

* **Un-Timed Flexible Flow:** No rigid timers. Teachers advance, pause, or repeat cards using simple **"Next"**, **"Previous"**, and **"Skip"** controls based on real-time classroom needs.

* **Tri-Modal Visual Card Layout:**

  * **Top:** High-contrast graphic pictogram card.

  * **Middle:** Large, accessible local audio playback button.

  * **Bottom:** Tamil target script display + simple bilingual teacher prompt (e.g., *"In Badaga: Neeru. In Tamil: Thanneer. First sound: 'Tha' (த)"*).

* **Embedded 1-Tap Counter:** Embedded picture-point check buttons to log child answers during or immediately after the activity.

## 4. 🔄 Sync & Manage Tab (Storage & Asset Control)

Gives teachers granular control over downloaded packs and media assets.

* **Storage Footprint Manager:** Displays consolidated storage usage across all downloaded packs.

* **Multi-Package Batch Selection:** Select multiple packages at once for batch operations.

* **Asset Splitting & Pruning:** Select and delete low-quality images across packages while preserving linked `.mp3` audio recordings and bilingual text fields.

* **Automatic Background Upload:** Automatically uploads locally created packs and evidence logs whenever an internet signal is detected.

## 5. 📊 Student Analysis Tab (Observational Evidence)

Provides clear progress tracking without requiring young children to take written tests or touch devices.

* **1-Tap Picture-Point Check:** Teacher holds up phone/cards with 3 pictures and taps student performance:

  * `[ + ] Correct (First Try)` $\rightarrow$ Direct Tamil Recognition

  * `[ + ] Needed Audio Hint` $\rightarrow$ Mother-Tongue Bridge Active

  * `[ + ] Needs Reinforcement` $\rightarrow$ Requires More Practice

* **Word Mastery Metrics:**

  * 🟢 **Mastered:** Identified directly in Tamil without home-language audio hints.

  * 🟡 **Bridging:** Progressing using mother-tongue audio bridge support.

  * 🔴 **Needs Practice:** Low recognition rate.

* **Adaptive Curriculum Feedback:** Assessment logs sync during online windows so the AI composer automatically fades out home-language audio support for words the class has already mastered.

## 6. 🤖 AI Helper Tab (Local Teaching Copilot)

An interactive voice/text teaching copilot for local classroom guidance.

* **Voice & Text Queries:** Driven by local Ollama STT and Gemini RAG processing.

* **Grounded Pedagogy:** Answers teacher questions (e.g., *"How do I explain 'த' using local hill contexts?"*) strictly referencing pre-approved cultural contexts.

## 7. 📩 Grievance & Feedback Tab (Community Support)

* **Audio Message Recorder:** Allows non-typing teachers to record voice notes detailing technical or linguistic issues.

* **1-Tap Audio Flagging:** Flag unclear audio recordings or incorrect translation mappings for community review.

* **Offline Staging:** Saves all feedback locally and uploads automatically during the next online sync window.