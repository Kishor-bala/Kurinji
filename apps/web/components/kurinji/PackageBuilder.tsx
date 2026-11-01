"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Mic,
  Square,
  Volume2,
  Download,
  Upload,
  CheckCircle2,
  Layers,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  FolderPlus,
  Globe,
  Tag,
  BookOpen,
  Info,
  Check,
  Play,
  RotateCcw,
} from "lucide-react";

export interface CustomLetter {
  id: string;
  symbol: string;
  phonetic: string;
  sampleWord?: string;
  audioData?: string; // Base64 data URL
}

export interface CustomWord {
  id: string;
  nativeWord: string;
  englishMeaning: string;
  tamilMeaning: string;
  category: string;
  tamilSyllables?: string;
  englishSyllables?: string;
  audioData?: string; // Base64 data URL
}

export interface CustomLanguagePackage {
  id: string;
  name: string;
  nativeName?: string;
  region: string;
  description: string;
  scriptType: "tamil" | "roman" | "devanagari" | "oral";
  speakerName?: string;
  letters: CustomLetter[];
  vocabulary: CustomWord[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

const CATEGORIES = [
  "Body Parts",
  "Family & Relations",
  "House & Objects",
  "Kitchen & Vessels",
  "Daily Tools & Utensils",
  "Food & Grains",
  "Fruits & Nature",
  "Water & Elements",
  "Forest & Environment",
  "Animals & Livestock",
  "Birds & Wildlife",
  "Clothing & Wearables",
  "Community & Places",
  "Numbers & Quantities",
  "Colors & Shapes",
  "Time, Nature & Festivals",
  "Activities & Verbs",
  "General Vocabulary",
];

// Default empty package draft
const EMPTY_PACKAGE_TEMPLATE: CustomLanguagePackage = {
  id: "custom_lang",
  name: "",
  nativeName: "",
  region: "",
  description: "",
  scriptType: "tamil",
  letters: [],
  vocabulary: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isActive: false,
};

const STORAGE_KEY = "kurinji_custom_language_packages";

interface PackageBuilderProps {
  onActivatePackage?: (pkg: CustomLanguagePackage) => void;
  activePackageId?: string;
}

export default function PackageBuilder({
  onActivatePackage,
  activePackageId,
}: PackageBuilderProps) {
  const [packages, setPackages] = useState<CustomLanguagePackage[]>([]);
  const [activePkgId, setActivePkgId] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<"list" | "details" | "letters" | "words" | "test">("list");

  // Working package draft in editor
  const [editingPkg, setEditingPkg] = useState<CustomLanguagePackage>(EMPTY_PACKAGE_TEMPLATE);

  // New Letter Form State
  const [newLetterSymbol, setNewLetterSymbol] = useState("");
  const [newLetterPhonetic, setNewLetterPhonetic] = useState("");
  const [newLetterSample, setNewLetterSample] = useState("");

  // New Word Form State
  const [newNativeWord, setNewNativeWord] = useState("");
  const [newEnglishMeaning, setNewEnglishMeaning] = useState("");
  const [newTamilMeaning, setNewTamilMeaning] = useState("");
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<{ type: "letter" | "word"; id: string } | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Playback
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // STT Testing State
  const [testSpeechResult, setTestSpeechResult] = useState<string | null>(null);
  const [isTestingMic, setIsTestingMic] = useState(false);

  // Load packages from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: CustomLanguagePackage[] = JSON.parse(saved);
        // Purge Toda from saved packages
        const filtered = parsed.filter(
          (p) => p.id !== "toda_heritage" && p.name.toLowerCase() !== "toda"
        );
        setPackages(filtered);
        const active = filtered.find((p) => p.isActive) || filtered[0];
        if (active) {
          setActivePkgId(active.id);
        } else {
          setActivePkgId("");
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return;
      }
    } catch (e) {
      console.warn("Could not load custom packages from localStorage:", e);
    }
    setPackages([]);
    setActivePkgId("");
  }, []);

  // Save packages to localStorage whenever they change
  const persistPackages = (updated: CustomLanguagePackage[]) => {
    setPackages(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Storage quota or error saving packages:", e);
    }
  };

  const startNewPackage = () => {
    const newPkg: CustomLanguagePackage = {
      id: `custom_${Date.now()}`,
      name: "",
      nativeName: "",
      region: "",
      description: "",
      scriptType: "tamil",
      letters: [],
      vocabulary: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: false,
    };
    setEditingPkg(newPkg);
    setCurrentStep("details");
  };

  const editPackage = (pkg: CustomLanguagePackage) => {
    setEditingPkg(JSON.parse(JSON.stringify(pkg)));
    setCurrentStep("details");
  };

  const handleSaveCurrentPackage = () => {
    if (!editingPkg.name.trim()) {
      alert("Please provide a name for your language package.");
      return;
    }
    const updatedDraft: CustomLanguagePackage = {
      ...editingPkg,
      updatedAt: Date.now(),
    };

    const exists = packages.some((p) => p.id === updatedDraft.id);
    let updatedList: CustomLanguagePackage[];
    if (exists) {
      updatedList = packages.map((p) => (p.id === updatedDraft.id ? updatedDraft : p));
    } else {
      updatedList = [...packages, updatedDraft];
    }
    persistPackages(updatedList);
  };

  const activatePackage = (pkg: CustomLanguagePackage) => {
    const updated = packages.map((p) => ({
      ...p,
      isActive: p.id === pkg.id,
    }));
    persistPackages(updated);
    setActivePkgId(pkg.id);
    if (onActivatePackage) {
      onActivatePackage(pkg);
    }
  };

  const deletePackage = (id: string) => {
    if (packages.length <= 1) {
      alert("You must keep at least one package.");
      return;
    }
    if (confirm("Are you sure you want to delete this package?")) {
      const updated = packages.filter((p) => p.id !== id);
      persistPackages(updated);
      if (activePkgId === id && updated.length > 0) {
        activatePackage(updated[0]);
      }
    }
  };

  // --- AUDIO RECORDING (Letters & Words) ---
  const startRecording = async (type: "letter" | "word", id: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          if (type === "letter") {
            setEditingPkg((prev) => ({
              ...prev,
              letters: prev.letters.map((l) =>
                l.id === id ? { ...l, audioData: base64Audio } : l
              ),
            }));
          } else {
            setEditingPkg((prev) => ({
              ...prev,
              vocabulary: prev.vocabulary.map((w) =>
                w.id === id ? { ...w, audioData: base64Audio } : w
              ),
            }));
          }
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTarget({ type, id });
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Unable to access microphone. Please grant audio permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTarget(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Play audio (from base64 or synthesis)
  const playAudio = (audioData?: string, fallbackText?: string, lang = "ta") => {
    if (audioData) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(audioData);
      audioPlayerRef.current = audio;
      setPlayingKey(audioData.slice(0, 32));
      audio.onended = () => setPlayingKey(null);
      audio.onerror = () => setPlayingKey(null);
      audio.play().catch(() => setPlayingKey(null));
    } else if (fallbackText) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(fallbackText);
        utterance.lang = lang === "ta" ? "ta-IN" : "en-US";
        utterance.rate = 0.9;
        setPlayingKey(fallbackText);
        utterance.onend = () => setPlayingKey(null);
        utterance.onerror = () => setPlayingKey(null);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // --- LETTER OPERATIONS ---
  const handleAddLetter = () => {
    if (!newLetterSymbol.trim()) return;
    const newLetter: CustomLetter = {
      id: `l_${Date.now()}`,
      symbol: newLetterSymbol.trim(),
      phonetic: newLetterPhonetic.trim() || newLetterSymbol.trim(),
      sampleWord: newLetterSample.trim() || undefined,
    };
    setEditingPkg((prev) => ({
      ...prev,
      letters: [...prev.letters, newLetter],
    }));
    setNewLetterSymbol("");
    setNewLetterPhonetic("");
    setNewLetterSample("");
  };

  const handleDeleteLetter = (id: string) => {
    setEditingPkg((prev) => ({
      ...prev,
      letters: prev.letters.filter((l) => l.id !== id),
    }));
  };

  // --- WORD OPERATIONS ---
  const handleAddWord = () => {
    if (!newNativeWord.trim() || !newEnglishMeaning.trim()) return;

    // Auto-generate syllabification for Tamil and English
    const tamilSyllables = newTamilMeaning
      ? newTamilMeaning.split("").join(" + ")
      : undefined;
    const englishSyllables = newNativeWord
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .split("")
      .join(" + ");

    const newWord: CustomWord = {
      id: `w_${Date.now()}`,
      nativeWord: newNativeWord.trim(),
      englishMeaning: newEnglishMeaning.trim(),
      tamilMeaning: newTamilMeaning.trim(),
      category: newCategory,
      tamilSyllables,
      englishSyllables,
    };

    setEditingPkg((prev) => ({
      ...prev,
      vocabulary: [...prev.vocabulary, newWord],
    }));

    setNewNativeWord("");
    setNewEnglishMeaning("");
    setNewTamilMeaning("");
  };

  const handleDeleteWord = (id: string) => {
    setEditingPkg((prev) => ({
      ...prev,
      vocabulary: prev.vocabulary.filter((w) => w.id !== id),
    }));
  };

  // --- EXPORT & IMPORT ---
  const handleExportPackage = (pkg: CustomLanguagePackage) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pkg, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${pkg.name.toLowerCase().replace(/\s+/g, "_")}_kurinji_package.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported: CustomLanguagePackage = JSON.parse(event.target?.result as string);
        if (!imported.name || !Array.isArray(imported.vocabulary)) {
          alert("Invalid Kurinji package format.");
          return;
        }
        imported.id = `imported_${Date.now()}`;
        imported.isActive = true;
        const updated = [...packages.map((p) => ({ ...p, isActive: false })), imported];
        persistPackages(updated);
        setActivePkgId(imported.id);
        if (onActivatePackage) onActivatePackage(imported);
        alert(`Successfully imported package: ${imported.name}!`);
      } catch (err) {
        console.error("Import error:", err);
        alert("Failed to parse package JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // --- STT DICTATION TESTING ---
  const testDictation = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isTestingMic) {
      setIsTestingMic(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsTestingMic(true);
      setTestSpeechResult("Listening... Speak a word from your package now...");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      // Match against package vocabulary
      const matched = editingPkg.vocabulary.find(
        (w) =>
          w.nativeWord.toLowerCase() === transcript ||
          w.englishMeaning.toLowerCase() === transcript ||
          transcript.includes(w.nativeWord.toLowerCase())
      );

      if (matched) {
        setTestSpeechResult(
          `✅ Recognized: "${matched.nativeWord}" (${matched.englishMeaning}) | Tamil: ${matched.tamilMeaning}`
        );
      } else {
        setTestSpeechResult(
          `Heard: "${transcript}" — (Not an exact match in this package's wordbank)`
        );
      }
      setIsTestingMic(false);
    };

    recognition.onerror = () => {
      setTestSpeechResult("Recognition stopped or no speech heard.");
      setIsTestingMic(false);
    };

    recognition.onend = () => {
      setIsTestingMic(false);
    };

    recognition.start();
  };

  return (
    <div className="w-full h-full max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Language Package Builder
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Build, record, and preserve any indigenous or mother-tongue language. Record authentic letter sounds &amp; words; TTS and STT adapt automatically!
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
          {currentStep === "list" ? (
            <>
              <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors border border-slate-200">
                <Upload className="w-3.5 h-3.5" />
                <span>Import Package</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </label>
              <button
                type="button"
                onClick={startNewPackage}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-black hover:bg-slate-800 text-white shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Language</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  handleSaveCurrentPackage();
                  setCurrentStep("list");
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Packages</span>
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentPackage}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Save Package</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* STEP NAVIGATION IF EDITING A PACKAGE */}
      {currentStep !== "list" && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1.5 overflow-x-auto shadow-2xs">
          <div className="flex items-center space-x-1 min-w-max">
            <button
              type="button"
              onClick={() => setCurrentStep("details")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentStep === "details"
                  ? "bg-black text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              1. Identity &amp; Region
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep("letters")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                currentStep === "letters"
                  ? "bg-black text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>2. Letters &amp; Sounds</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-mono">
                {editingPkg.letters.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep("words")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                currentStep === "words"
                  ? "bg-black text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>3. Wordbank Studio</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-mono">
                {editingPkg.vocabulary.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep("test")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                currentStep === "test"
                  ? "bg-black text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>4. TTS / STT Test &amp; Activate</span>
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-400 pr-2 hidden sm:block">
            Editing: <strong>{editingPkg.name || "Untitled Language"}</strong>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 1: PACKAGES LIST (DASHBOARD)
          ========================================================================= */}
      {currentStep === "list" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Installed Language Packages ({packages.length})
            </h2>
            <span className="text-xs text-slate-500">
              Active Package:{" "}
              <strong>
                {packages.find((p) => p.isActive)?.name || "Badaga canonical"}
              </strong>
            </span>
          </div>

          {packages.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <FolderPlus className="w-7 h-7 text-slate-500" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">No Custom Packages Yet</h3>
                <p className="text-xs text-slate-500">
                  Create your own mother tongue package to record letters, words, and build an adaptive voice dataset.
                </p>
              </div>
              <button
                type="button"
                onClick={startNewPackage}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-slate-800 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Language Package</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => {
                const isActive = pkg.id === activePkgId;
                const letterRecordingsCount = pkg.letters.filter((l) => l.audioData).length;
                const wordRecordingsCount = pkg.vocabulary.filter((w) => w.audioData).length;

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                      isActive
                        ? "border-emerald-500 ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🌿</span>
                          <h3 className="text-base font-bold text-slate-900">
                            {pkg.name || "Untitled Package"}
                          </h3>
                          {pkg.nativeName && (
                            <span className="text-xs font-bold text-slate-600">
                              ({pkg.nativeName})
                            </span>
                          )}
                        </div>

                        {isActive && (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {pkg.description || "No description provided."}
                      </p>

                      <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                        <div>
                          📍 Region: <strong>{pkg.region || "Nilgiri Region"}</strong>
                        </div>
                        <div>
                          ✍️ Script: <span className="capitalize">{pkg.scriptType}</span>
                        </div>
                      </div>

                      {/* Stats Pill Row */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                          <span className="block text-sm font-black text-slate-900">
                            {pkg.letters.length}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Letters ({letterRecordingsCount} voiced)
                          </span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                          <span className="block text-sm font-black text-slate-900">
                            {pkg.vocabulary.length}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Words ({wordRecordingsCount} voiced)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => activatePackage(pkg)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-black text-white hover:bg-slate-800 transition-colors shadow-2xs"
                          >
                            Activate
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-700 font-bold px-2 py-1">
                            In Use
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => editPackage(pkg)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                        >
                          Edit
                        </button>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleExportPackage(pkg)}
                          title="Download package archive (.json)"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePackage(pkg.id)}
                          title="Delete package"
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 2: STEP 1 - DETAILS & IDENTITY
          ========================================================================= */}
      {currentStep === "details" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">
              1. Language Identity &amp; Heritage Origin
            </h2>
            <p className="text-xs text-slate-500">
              Provide the canonical name, region, and script characteristics of your mother tongue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Language / Mother Tongue Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editingPkg.name}
                onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })}
                placeholder="e.g. Kota, Irula, Kurumba, Saurashtra, Konkani..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Native Script Name (Optional)
              </label>
              <input
                type="text"
                value={editingPkg.nativeName || ""}
                onChange={(e) => setEditingPkg({ ...editingPkg, nativeName: e.target.value })}
                placeholder="e.g. தோடா, मारवाड़ी, கொங்கணி..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Geographic Region / Community
              </label>
              <input
                type="text"
                value={editingPkg.region}
                onChange={(e) => setEditingPkg({ ...editingPkg, region: e.target.value })}
                placeholder="e.g. Nilgiri Hills, Western Ghats, Ooty..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Writing Script Preference
              </label>
              <select
                value={editingPkg.scriptType}
                onChange={(e) =>
                  setEditingPkg({
                    ...editingPkg,
                    scriptType: e.target.value as "tamil" | "roman" | "devanagari" | "oral",
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-1 focus:ring-black focus:outline-none"
              >
                <option value="tamil">Tamil Script (தமிழ் எழுத்துமுறை)</option>
                <option value="roman">Roman / English Phonetic Transliteration</option>
                <option value="devanagari">Devanagari Script (देवनागरी)</option>
                <option value="oral">Oral Only (Purely Voiced, No Fixed Script)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Heritage Description &amp; Background Notes
              </label>
              <textarea
                value={editingPkg.description}
                onChange={(e) => setEditingPkg({ ...editingPkg, description: e.target.value })}
                rows={3}
                placeholder="Describe the community, unique phonetic traits, or cultural significance of this package..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                handleSaveCurrentPackage();
                setCurrentStep("letters");
              }}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-black text-white hover:bg-slate-800 transition-all shadow-xs"
            >
              <span>Next: Record Letters &amp; Sounds</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: STEP 2 - LETTER INVENTORY & SOUND RECORDING
          ========================================================================= */}
      {currentStep === "letters" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                2. Letter &amp; Phonetic Sound Studio
              </h2>
              <p className="text-xs text-slate-500">
                Add each letter of your language. Tap the mic to record authentic native pronunciations! The system automatically adapts its speech synthesis to play these recorded letter sounds.
              </p>
            </div>

            {/* Quick Helper Button to Populate Core Alphabet */}
            <button
              type="button"
              onClick={() => {
                const sampleTamil = [
                  { id: "sl1", symbol: "அ", phonetic: "a" },
                  { id: "sl2", symbol: "ஆ", phonetic: "aa" },
                  { id: "sl3", symbol: "இ", phonetic: "i" },
                  { id: "sl4", symbol: "ஈ", phonetic: "ee" },
                  { id: "sl5", symbol: "உ", phonetic: "u" },
                  { id: "sl6", symbol: "ஊ", phonetic: "oo" },
                  { id: "sl7", symbol: "எ", phonetic: "e" },
                  { id: "sl8", symbol: "ஏ", phonetic: "ae" },
                  { id: "sl9", symbol: "ஐ", phonetic: "ai" },
                  { id: "sl10", symbol: "ஒ", phonetic: "o" },
                  { id: "sl11", symbol: "ஓ", phonetic: "oa" },
                  { id: "sl12", symbol: "ஔ", phonetic: "au" },
                  { id: "sl13", symbol: "க்", phonetic: "k" },
                  { id: "sl14", symbol: "ங்", phonetic: "ng" },
                  { id: "sl15", symbol: "ச்", phonetic: "ch" },
                  { id: "sl16", symbol: "ஞ்", phonetic: "nj" },
                  { id: "sl17", symbol: "ட்", phonetic: "t" },
                  { id: "sl18", symbol: "ண்", phonetic: "n" },
                  { id: "sl19", symbol: "த்", phonetic: "th" },
                  { id: "sl20", symbol: "ந்", phonetic: "n" },
                  { id: "sl21", symbol: "ப்", phonetic: "p" },
                  { id: "sl22", symbol: "ம்", phonetic: "m" },
                  { id: "sl23", symbol: "ய்", phonetic: "y" },
                  { id: "sl24", symbol: "ர்", phonetic: "r" },
                  { id: "sl25", symbol: "ல்", phonetic: "l" },
                  { id: "sl26", symbol: "வ்", phonetic: "v" },
                  { id: "sl27", symbol: "ழ்", phonetic: "zh" },
                  { id: "sl28", symbol: "ள்", phonetic: "L" },
                  { id: "sl29", symbol: "ற்", phonetic: "R" },
                  { id: "sl30", symbol: "ன்", phonetic: "n" },
                ];
                setEditingPkg({
                  ...editingPkg,
                  letters: sampleTamil,
                });
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              + Load Core Dravidian Alphabet (30 Letters)
            </button>
          </div>

          {/* Add Letter Row */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
            <div className="w-24">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Letter Symbol
              </label>
              <input
                type="text"
                value={newLetterSymbol}
                onChange={(e) => setNewLetterSymbol(e.target.value)}
                placeholder="ம / K"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-center focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Phonetic Pronunciation
              </label>
              <input
                type="text"
                value={newLetterPhonetic}
                onChange={(e) => setNewLetterPhonetic(e.target.value)}
                placeholder="e.g. ma, ka, zha, retroflex-r..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Example Word (Optional)
              </label>
              <input
                type="text"
                value={newLetterSample}
                onChange={(e) => setNewLetterSample(e.target.value)}
                placeholder="e.g. maram, thale..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAddLetter}
              disabled={!newLetterSymbol.trim()}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-all shadow-xs"
            >
              Add Letter
            </button>
          </div>

          {/* Letters Grid */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Alphabet &amp; Sounds Inventory ({editingPkg.letters.length})
            </div>

            {editingPkg.letters.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No letters added yet. Type a letter above or click &ldquo;Load Core Dravidian Alphabet&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {editingPkg.letters.map((letter) => {
                  const isRecThis =
                    isRecording &&
                    recordingTarget?.type === "letter" &&
                    recordingTarget?.id === letter.id;

                  return (
                    <div
                      key={letter.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col justify-between space-y-2 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-2xl font-black text-slate-900 leading-none">
                          {letter.symbol}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteLetter(letter.id)}
                          className="text-slate-300 hover:text-rose-600 transition-colors"
                          title="Remove letter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-slate-600 font-mono block">
                          /{letter.phonetic}/
                        </span>
                        {letter.sampleWord && (
                          <span className="text-[10px] text-slate-400 truncate block">
                            ex: {letter.sampleWord}
                          </span>
                        )}
                      </div>

                      {/* Letter Audio Recorder / Playback Controls */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        {/* Play Sound Button */}
                        <button
                          type="button"
                          onClick={() =>
                            playAudio(letter.audioData, letter.symbol, "ta")
                          }
                          title="Listen to this letter sound"
                          className={`p-1.5 rounded-md border flex items-center justify-center transition-all ${
                            letter.audioData
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Record Sound Button */}
                        {isRecThis ? (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-rose-600 text-white text-[10px] font-bold animate-pulse"
                          >
                            <Square className="w-2.5 h-2.5" />
                            <span>Stop ({recordingSeconds}s)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startRecording("letter", letter.id)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all"
                            title="Record authentic voice for this letter"
                          >
                            <Mic className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep("details")}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleSaveCurrentPackage();
                setCurrentStep("words");
              }}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-black text-white hover:bg-slate-800 transition-all shadow-xs"
            >
              <span>Next: Build Vocabulary Wordbank</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: STEP 3 - WORDBANK & ORAL RECORDINGS
          ========================================================================= */}
      {currentStep === "words" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              3. Vocabulary Wordbank Studio
            </h2>
            <p className="text-xs text-slate-500">
              Add words in your indigenous language. Record the authentic pronunciation so students hear native speakers!
            </p>
          </div>

          {/* Add Word Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Oral Word in Mother Tongue <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newNativeWord}
                onChange={(e) => setNewNativeWord(e.target.value)}
                placeholder="e.g. thale, irp, modh..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                English Meaning <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newEnglishMeaning}
                onChange={(e) => setNewEnglishMeaning(e.target.value)}
                placeholder="e.g. Head, Sacred Buffalo..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tamil Script Meaning
              </label>
              <input
                type="text"
                value={newTamilMeaning}
                onChange={(e) => setNewTamilMeaning(e.target.value)}
                placeholder="e.g. தலை, எருமை..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-black focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-4 flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddWord}
                disabled={!newNativeWord.trim() || !newEnglishMeaning.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-all shadow-xs"
              >
                + Add Word to Wordbank
              </button>
            </div>
          </div>

          {/* Words Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Current Vocabulary Entries ({editingPkg.vocabulary.length})
            </div>

            {editingPkg.vocabulary.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No words created yet. Add a word using the form above!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {editingPkg.vocabulary.map((w, idx) => {
                  const isRecThis =
                    isRecording &&
                    recordingTarget?.type === "word" &&
                    recordingTarget?.id === w.id;

                  return (
                    <div
                      key={w.id}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="text-base font-black text-slate-900">
                            {w.nativeWord}
                          </span>
                          {w.tamilMeaning && (
                            <span className="text-sm font-bold text-slate-700">
                              ({w.tamilMeaning})
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
                            {w.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          English: <strong>{w.englishMeaning}</strong>
                        </p>
                        {w.tamilSyllables && (
                          <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1">
                            <span>Syllables:</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                              {w.tamilSyllables}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Audio Controls for this Word */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Play Recorded Audio or Fallback */}
                        <button
                          type="button"
                          onClick={() => playAudio(w.audioData, w.tamilMeaning || w.nativeWord, "ta")}
                          title="Listen to native pronunciation"
                          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-2xs ${
                            w.audioData
                              ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{w.audioData ? "Native Audio" : "Synthesized"}</span>
                        </button>

                        {/* Record Native Audio Button */}
                        {isRecThis ? (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold animate-pulse shadow-sm"
                          >
                            <Square className="w-3.5 h-3.5" />
                            <span>Stop ({recordingSeconds}s)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startRecording("word", w.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 transition-all text-xs font-bold"
                            title="Record authentic pronunciation for this word"
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>{w.audioData ? "Re-record" : "Record Voice"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteWord(w.id)}
                          className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                          title="Delete word"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep("letters")}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Letters</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleSaveCurrentPackage();
                setCurrentStep("test");
              }}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-black text-white hover:bg-slate-800 transition-all shadow-xs"
            >
              <span>Next: TTS &amp; STT Test &amp; Activate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 5: STEP 4 - AUTOMATIC ADAPTATION & TESTING PLAYGROUND
          ========================================================================= */}
      {currentStep === "test" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">
              4. Automatic TTS &amp; STT Adaptation Sandbox
            </h2>
            <p className="text-xs text-slate-500">
              Kurinji automatically adapts its speech recognition and text-to-speech to your new language package. Test live speech recognition and pronunciation here!
            </p>
          </div>

          {/* Adaptation Status Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>TTS Automatic Adaptation</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Letters and words with recorded human audio will automatically play authentic native recordings. Unrecorded items smoothly fall back to high-fidelity phonetic synthesis.
              </p>
              <div className="text-[11px] font-mono text-slate-500 pt-1">
                Audio Coverage:{" "}
                <strong>
                  {editingPkg.vocabulary.filter((w) => w.audioData).length} of{" "}
                  {editingPkg.vocabulary.length} words voiced
                </strong>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>STT Automatic Adaptation</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The speech recognition engine adds all words and phonetic transliterations from{" "}
                <strong>{editingPkg.name}</strong> to the local closed-vocabulary matcher.
              </p>
              <div className="text-[11px] font-mono text-slate-500 pt-1">
                Grounded Index:{" "}
                <strong>{editingPkg.vocabulary.length} active terms ready</strong>
              </div>
            </div>
          </div>

          {/* Interactive STT Testing Bar */}
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Live Speech Recognition (STT) Test
                </h3>
                <p className="text-xs text-slate-500">
                  Tap the mic and speak any word from <strong>{editingPkg.name}</strong> (e.g. &ldquo;
                  {editingPkg.vocabulary[0]?.nativeWord || "thale"}&rdquo;):
                </p>
              </div>

              <button
                type="button"
                onClick={testDictation}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                  isTestingMic
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-black text-white hover:bg-slate-800"
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{isTestingMic ? "Listening..." : "Test Mic Dictation"}</span>
              </button>
            </div>

            {testSpeechResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800">
                {testSpeechResult}
              </div>
            )}
          </div>

          {/* Interactive TTS Vocabulary Flashcard Preview */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Preview Card Breakdown &amp; Syllables:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {editingPkg.vocabulary.slice(0, 4).map((w) => (
                <div
                  key={w.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900">{w.nativeWord}</span>
                    <button
                      type="button"
                      onClick={() => playAudio(w.audioData, w.tamilMeaning || w.nativeWord, "ta")}
                      className="p-1.5 rounded-lg bg-black text-white hover:bg-slate-800 shadow-2xs"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    {w.englishMeaning} — {w.tamilMeaning}
                  </p>
                  {w.tamilSyllables && (
                    <div className="flex items-center gap-1 text-xs">
                      {w.tamilSyllables.split(" + ").map((syl, i, arr) => (
                        <React.Fragment key={i}>
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-bold border border-slate-200 text-slate-800">
                            {syl}
                          </span>
                          {i < arr.length - 1 && <span className="text-slate-400">+</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activate / Save Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep("words")}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Wordbank</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleExportPackage(editingPkg)}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Package (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSaveCurrentPackage();
                  activatePackage(editingPkg);
                  setCurrentStep("list");
                  alert(`✨ Language package "${editingPkg.name}" is now ACTIVE across Kurinji!`);
                }}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Activate in Kurinji Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
