"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Mic,
  Square,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Layers,
  Search,
  Sparkles,
  BookOpen,
  RotateCcw,
  Send,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Volume1,
  Shuffle,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  FolderPlus,
  Puzzle,
  GraduationCap,
} from "lucide-react";
import KurinjiAITutor from "@/components/kurinji/KurinjiAITutor";
import PackageBuilder, { CustomLanguagePackage } from "@/components/kurinji/PackageBuilder";
import AssessmentCenter from "@/components/kurinji/AssessmentCenter";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

interface VocabularyItem {
  id: string;
  external_word_id: string;
  language_code: string;
  language_name: string;
  category?: string;
  source_word?: string;
  badaga_source_word?: string;
  marwari_source_word?: string;
  tamil_meaning: string;
  tamil_syllables?: string;
  tamil_phonetics?: string;
  english_meaning: string;
  image_url?: string;
  notes?: string;
  audio_assets: Array<{
    id: string;
    filename: string;
    duration: number;
    speaker_id?: string;
    speaker_name?: string;
    audio_url: string;
  }>;
  badaga_audio_assets?: Array<{
    id: string;
    filename: string;
    duration: number;
    speaker_id?: string;
    speaker_name?: string;
    audio_url: string;
  }>;
  marwari_audio_assets?: Array<{
    id: string;
    filename: string;
    duration: number;
    speaker_id?: string;
    speaker_name?: string;
    audio_url: string;
  }>;
}

const CATEGORY_ORDER = [
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
  "Village & Settlement",
  "Numbers & Quantities",
  "Colors & Shapes",
  "Time, Nature & Festivals",
  "Daily Life Actions",
  "Activities & Verbs",
  "Sizes & Adjectives",
  "General Vocabulary",
];

const CATEGORY_ICONS: Record<string, string> = {
  "Body Parts": "👤",
  "Family & Relations": "👨‍👩‍👧",
  "House & Objects": "🏠",
  "Kitchen & Vessels": "🍳",
  "Daily Tools & Utensils": "🧹",
  "Food & Grains": "🍚",
  "Fruits & Nature": "🍎",
  "Water & Elements": "💧",
  "Forest & Environment": "🌲",
  "Animals & Livestock": "🐄",
  "Birds & Wildlife": "🦅",
  "Clothing & Wearables": "👕",
  "Community & Places": "🏛️",
  "Village & Settlement": "🏡",
  "Numbers & Quantities": "🔢",
  "Colors & Shapes": "🎨",
  "Time, Nature & Festivals": "☀️",
  "Daily Life Actions": "🍽️",
  "Activities & Verbs": "🏃",
  "Sizes & Adjectives": "📏",
  "General Vocabulary": "📚",
};

const CATEGORY_META: Record<string, { icon: string; desc: string }> = {
  "Body Parts": { icon: "👤", desc: "Head, face, limbs, organs & physical anatomy" },
  "Family & Relations": { icon: "👨‍👩‍👧", desc: "Kinship, parents, siblings, guests, neighbours & occupations" },
  "House & Objects": { icon: "🏠", desc: "Living rooms, furniture, bedding, lights & interior essentials" },
  "Kitchen & Vessels": { icon: "🍳", desc: "Cookware, plates, cups, spoons, stoves, spices & kitchen equipment" },
  "Daily Tools & Utensils": { icon: "🧹", desc: "Brooms, agricultural implements & everyday working gear" },
  "Food & Grains": { icon: "🌾", desc: "Ragi, wheat, rice, millets, pulses & prepared meals" },
  "Fruits & Nature": { icon: "🍎", desc: "Fresh fruits, plants, trees, botanical growth & harvests" },
  "Water & Elements": { icon: "💧", desc: "Water springs, streams, rainfall, wells & natural elements" },
  "Forest & Environment": { icon: "🌲", desc: "Nilgiri shola forests, hills, wilderness & landscapes" },
  "Animals & Livestock": { icon: "🐄", desc: "Cattle, dairy cows, working farm animals & domestic pets" },
  "Birds & Wildlife": { icon: "🦅", desc: "Wild fauna, birds of the Nilgiris & biodiversity" },
  "Clothing & Wearables": { icon: "👕", desc: "Traditional badaga dress, daily shawls & woven fabrics" },
  "Community & Places": { icon: "🏛️", desc: "Schools, angadwas, clinics, community gathering grounds" },
  "Village & Settlement": { icon: "🏡", desc: "Traditional hattis, streets, cottages & village settlements" },
  "Numbers & Quantities": { icon: "🔢", desc: "Counting numbers, numerals & cardinal measurements" },
  "Colors & Shapes": { icon: "🎨", desc: "Primary hues, natural color tones & spatial patterns" },
  "Time, Nature & Festivals": { icon: "☀️", desc: "Day, night, seasons, calendar intervals & heritage festivals" },
  "Daily Life Actions": { icon: "🏃", desc: "Morning to evening routines, domestic chores & habitual deeds" },
  "Activities & Verbs": { icon: "⚡", desc: "Physical movements, conversations, tasks & active verbs" },
  "Sizes & Adjectives": { icon: "📏", desc: "Dimensions, sensory traits, qualities & comparisons" },
  "General Vocabulary": { icon: "📚", desc: "Essential heritage expressions & conversational foundations" },
};

/**
 * Dedicated Badaga Audio Player Component:
 * - Only has the audio symbol (Volume2) in the button
 * - If 2 or more audio samples, provides a clean down arrow dropdown to choose sample
 * - Strictly NO speaker names displayed in button or menu, only "Sample 1", "Sample 2", etc.
 */
function BadagaAudioPlayer({
  assets,
  activeAudioKey,
  onPlay,
}: {
  assets: VocabularyItem["audio_assets"];
  activeAudioKey: string | null;
  onPlay: (url: string, id: string) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  if (!assets || assets.length === 0) {
    return (
      <div
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
        title="No Badaga native audio recorded"
      >
        <VolumeX className="w-4 h-4" />
      </div>
    );
  }

  const currentAsset = assets[selectedIndex] || assets[0];
  const isPlaying = activeAudioKey === currentAsset.id;

  // Single sample: clean button with ONLY audio symbol
  if (assets.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onPlay(currentAsset.audio_url, currentAsset.id)}
        title="Play native audio"
        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shadow-xs transition-all active:scale-95 ${
          isPlaying
            ? "bg-emerald-600 text-white animate-pulse"
            : "bg-black text-white hover:bg-slate-800"
        }`}
      >
        <Volume2 className="w-4 h-4 text-white" />
      </button>
    );
  }

  // 2 or more samples: audio symbol button + down arrow dropdown
  return (
    <div ref={menuRef} className="relative inline-flex items-center rounded-lg shadow-xs">
      <button
        type="button"
        onClick={() => onPlay(currentAsset.audio_url, currentAsset.id)}
        title={`Play native audio (Sample ${selectedIndex + 1})`}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-l-lg border-r border-slate-800 transition-all active:scale-95 ${
          isPlaying
            ? "bg-emerald-600 text-white animate-pulse"
            : "bg-black text-white hover:bg-slate-800"
        }`}
      >
        <Volume2 className="w-4 h-4 text-white" />
      </button>

      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        title="Select audio sample"
        className={`inline-flex items-center justify-center w-6 h-9 rounded-r-lg transition-all ${
          isPlaying
            ? "bg-emerald-700 text-white"
            : "bg-black text-white hover:bg-slate-800"
        }`}
      >
        <ChevronDown className={`w-3.5 h-3.5 text-white transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      {menuOpen && (
        <div className="absolute left-0 bottom-full mb-1.5 z-40 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[120px]">
          <div className="px-2.5 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            Audio Samples
          </div>
          {assets.map((asset, idx) => (
            <button
              key={asset.id || idx}
              type="button"
              onClick={() => {
                setSelectedIndex(idx);
                setMenuOpen(false);
                onPlay(asset.audio_url, asset.id);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-100 transition-colors ${
                selectedIndex === idx ? "font-bold text-slate-900 bg-slate-50" : "text-slate-700"
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <Volume2 className="w-3 h-3 text-slate-500" />
                <span>Sample {idx + 1}</span>
              </span>
              {selectedIndex === idx && <span className="text-[10px] text-emerald-600 font-bold">●</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Robust Tamil Grapheme / Syllable segmentation:
 * Splits words into true orthographic syllables (e.g. "மரம்" -> ["ம", "ர", "ம்"])
 */
function getTamilSyllables(tamilWord: string, presetSyllables?: string): string[] {
  if (presetSyllables && presetSyllables.includes(" + ")) {
    return presetSyllables.split(" + ").map((s) => s.trim()).filter(Boolean);
  }
  if (!tamilWord) return [];
  if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter("ta", { granularity: "grapheme" });
      const segments = Array.from(segmenter.segment(tamilWord))
        .map((s: any) => s.segment.trim())
        .filter((s: string) => s.length > 0);
      if (segments.length > 0) return segments;
    } catch {}
  }
  // Regex fallback: Consonant followed by optional virama or vowel matras
  const matches = tamilWord.match(/[\u0B85-\u0B94]|[\u0B95-\u0BB9][\u0BCB-\u0BCD\u0BBE-\u0BC8\u0BD7]?/g);
  return matches && matches.length > 0 ? matches : tamilWord.split("");
}

/**
 * English Letter extraction:
 * Splits any word into uppercase A-Z characters (e.g. "maram" -> ["M", "A", "R", "A", "M"])
 */
function getEnglishLetters(word: string): string[] {
  if (!word) return [];
  return word
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .filter(Boolean);
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  verified_vocab?: any[];
  audio_url?: string;
  audio_assets?: any[];
  tts_url?: string;
  is_voice?: boolean;
}

export default function Home() {
  // Navigation tabs in left sidebar: tutor, learn, assessment, builder
  const [activeTab, setActiveTab] = useState<"tutor" | "learn" | "assessment" | "builder">("tutor");
  const [selectedLang, setSelectedLang] = useState<string>("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Custom Language Packages (Mother Tongue Builder)
  const [customPackages, setCustomPackages] = useState<CustomLanguagePackage[]>([]);
  const [activePackageId, setActivePackageId] = useState<string>("");

  // Card Literacy Teaching State (Tamil/English switching & letter-by-letter spelling)
  const [cardScriptMode, setCardScriptMode] = useState<Record<string, "ta" | "en">>({});
  const [activeSpellCardId, setActiveSpellCardId] = useState<string | null>(null);
  const [activeSpellIndex, setActiveSpellIndex] = useState<number | null>(null);
  const spellCancelRef = useRef(false);

  // Slow Motion Audio State (0.65x speed for heritage clarity)
  const [isSlowAudio, setIsSlowAudio] = useState<boolean>(false);

  // Syllable Assembly Game State
  const [assemblyCardId, setAssemblyCardId] = useState<string | null>(null);
  const [assemblyTargetUnits, setAssemblyTargetUnits] = useState<string[]>([]);
  const [assemblyTargetWord, setAssemblyTargetWord] = useState<string>("");
  const [assemblyTargetLang, setAssemblyTargetLang] = useState<"ta" | "en">("ta");
  const [assemblyAssembled, setAssemblyAssembled] = useState<{ id: string; char: string }[]>([]);
  const [assemblyAvailable, setAssemblyAvailable] = useState<{ id: string; char: string }[]>([]);
  const [assemblyStatus, setAssemblyStatus] = useState<"playing" | "success" | "wrong">("playing");

  // Global Audio Playback State
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null);
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);

  // Dictionary state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [isLoadingVocab, setIsLoadingVocab] = useState(false);

  // AI Tutor chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Namaskara! I am your AI Teaching Assistant for Badaga and Marwari. Ask me about vocabulary definitions, pronunciations, or practice sentences. Everything I teach is strictly verified against canonical records.",
      provider: "Kurinji AI",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // AI Tutor STT / Voice Query state
  const [isTutorRecording, setIsTutorRecording] = useState(false);
  const [tutorRecordTime, setTutorRecordTime] = useState(0);
  const tutorMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const tutorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isTutorProcessingVoice, setIsTutorProcessingVoice] = useState(false);

  // Dictionary Voice Search state
  const [isDictRecording, setIsDictRecording] = useState(false);
  const [isDictProcessingVoice, setIsDictProcessingVoice] = useState(false);
  const dictMediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Language count badges (deduplicated concepts in All Languages view)
  const [langCounts, setLangCounts] = useState<{ all: number; badaga: number; marwari: number }>({
    all: 396,
    badaga: 285,
    marwari: 214,
  });

  // Vocabulary Card slide deck state for Learn mode
  const [swiperIndex, setSwiperIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [slideAnim, setSlideAnim] = useState<"exit-left" | "exit-right" | "enter-left" | "enter-right" | null>(null);
  const [isAnimatingCard, setIsAnimatingCard] = useState(false);

  const fetchLanguages = async () => {
    try {
      const res = await fetch(`${API_BASE}/languages`);
      if (res.ok) {
        const data = await res.json();
        let b = 285;
        let m = 214;
        data.forEach((l: any) => {
          if (l.code === "badaga") b = l.word_count || b;
          if (l.code === "marwari") m = l.word_count || m;
        });
        setLangCounts({ all: 396, badaga: b, marwari: m });
      }
    } catch {}
  };

  // Load custom packages from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kurinji_custom_language_packages");
      if (saved) {
        const parsed: CustomLanguagePackage[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Explicitly purge Toda from saved packages
          const filtered = parsed.filter(
            (p) => p.id !== "toda_heritage" && p.name.toLowerCase() !== "toda"
          );
          setCustomPackages(filtered);
          const active = filtered.find((p) => p.isActive);
          if (active) {
            setActivePackageId(active.id);
          } else {
            setActivePackageId("");
          }
          localStorage.setItem("kurinji_custom_language_packages", JSON.stringify(filtered));
        }
      }
    } catch (e) {
      console.warn("Could not load custom packages from localStorage:", e);
    }
  }, [activeTab]);

  // Reset selectedLang if it was set to toda_heritage
  useEffect(() => {
    if (selectedLang === "toda_heritage") {
      setSelectedLang("all");
    }
  }, [selectedLang]);

  // Dynamically synchronize active audio playback rate when slow motion is toggled
  useEffect(() => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.playbackRate = isSlowAudio ? 0.65 : 1.0;
      audioInstanceRef.current.defaultPlaybackRate = isSlowAudio ? 0.65 : 1.0;
    }
  }, [isSlowAudio]);

  useEffect(() => {
    fetchLanguages();
    fetchVocabulary();
  }, [selectedLang]);

  const fetchVocabulary = async (retries = 3) => {
    setIsLoadingVocab(true);
    try {
      const langParam = selectedLang === "all" ? "" : `&language=${selectedLang}`;
      const res = await fetch(`${API_BASE}/vocabulary?limit=3000${langParam}`);
      if (res.ok) {
        const data = await res.json();
        setVocabulary(data);
      } else if (retries > 0) {
        setTimeout(() => fetchVocabulary(retries - 1), 1000);
      }
    } catch {
      if (retries > 0) {
        setTimeout(() => fetchVocabulary(retries - 1), 1500);
      }
    } finally {
      setIsLoadingVocab(false);
    }
  };

  // Play audio file directly with active state tracking
  const playAudio = (url: string, key?: string) => {
    if (!url) return;
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current = null;
    }
    const trackKey = key || url;
    setActiveAudioKey(trackKey);
    const fullUrl = url.startsWith("http") ? url : url;
    const audio = new Audio(fullUrl);
    audio.defaultPlaybackRate = isSlowAudio ? 0.65 : 1.0;
    audio.playbackRate = isSlowAudio ? 0.65 : 1.0;
    audioInstanceRef.current = audio;
    audio.onended = () => setActiveAudioKey(null);
    audio.onerror = () => setActiveAudioKey(null);
    audio.play().catch((err) => {
      console.warn("Audio playback error:", err);
      setActiveAudioKey(null);
    });
  };

  // Core resilient audio player for words & letters (returns a Promise that resolves when audio completes)
  const playTtsAudio = (text: string, lang: "ta" | "en" = "en"): Promise<void> => {
    return new Promise((resolve) => {
      const cleanText = text.trim();
      if (!cleanText) return resolve();

      let isResolved = false;
      const done = () => {
        if (isResolved) return;
        isResolved = true;
        resolve();
      };

      // Priority 1: High-fidelity Server Synthesize Endpoint (with multi-upstream fallbacks)
      const directTtsUrl = `${API_BASE}/vocabulary/tts/synthesize?text=${encodeURIComponent(cleanText)}&lang=${lang}`;
      const audio = new Audio(directTtsUrl);
      audio.defaultPlaybackRate = isSlowAudio ? 0.65 : 1.0;
      audio.playbackRate = isSlowAudio ? 0.65 : 1.0;

      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current = null;
      }
      audioInstanceRef.current = audio;

      audio.onended = () => done();

      // If Server synthesis has network error or blocked, use resilient client fallback
      audio.onerror = () => {
        // Priority 2: Direct Google Translate TTS endpoint from client browser
        const targetLang = lang === "ta" ? "ta" : "en";
        const directClientUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodeURIComponent(cleanText)}`;
        const fallbackAudio = new Audio(directClientUrl);
        fallbackAudio.defaultPlaybackRate = isSlowAudio ? 0.65 : 1.0;
        fallbackAudio.playbackRate = isSlowAudio ? 0.65 : 1.0;

        if (audioInstanceRef.current) {
          audioInstanceRef.current.pause();
        }
        audioInstanceRef.current = fallbackAudio;

        fallbackAudio.onended = () => done();
        fallbackAudio.onerror = () => {
          // Priority 3: Browser SpeechSynthesis
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            try {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(cleanText);
              utterance.lang = lang === "ta" ? "ta-IN" : "en-US";
              utterance.rate = isSlowAudio ? 0.55 : (lang === "en" ? 0.85 : 0.9);
              utterance.onend = () => done();
              utterance.onerror = () => done();
              window.speechSynthesis.speak(utterance);
            } catch {
              done();
            }
          } else {
            done();
          }
        };

        fallbackAudio.play().catch(() => {
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            try {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(cleanText);
              utterance.lang = lang === "ta" ? "ta-IN" : "en-US";
              utterance.rate = isSlowAudio ? 0.55 : (lang === "en" ? 0.85 : 0.9);
              utterance.onend = () => done();
              utterance.onerror = () => done();
              window.speechSynthesis.speak(utterance);
            } catch {
              done();
            }
          } else {
            done();
          }
        });
      };

      audio.play().catch((playErr) => {
        if (audio.onerror) {
          (audio.onerror as any)(playErr);
        } else {
          done();
        }
      });
    });
  };

  // Text-to-speech helper (pronounces English or Tamil using backend synthesis or Web Speech)
  const speakText = async (text: string, lang = "en", key?: string) => {
    if (!text) return;
    const trackKey = key || `tts_${lang}_${text}`;
    setActiveAudioKey(trackKey);
    try {
      await playTtsAudio(text, lang as "ta" | "en");
    } finally {
      setActiveAudioKey((current) => (current === trackKey ? null : current));
    }
  };

  // Helper to pronounce an individual letter or syllable (Tamil or English)
  const speakSyllable = async (syllable: string, lang: "ta" | "en", key?: string) => {
    if (!syllable || !syllable.trim()) return;
    const trackKey = key || `syl_${lang}_${syllable}`;
    setActiveAudioKey(trackKey);
    try {
      await playTtsAudio(syllable.trim(), lang);
    } finally {
      setActiveAudioKey((current) => (current === trackKey ? null : current));
    }
  };

  // Helper to sequentially pronounce each letter/syllable then the whole word (e.g. "ma + ra + m = maram")
  const playSpellSequence = async (
    cardId: string,
    syllables: string[],
    fullWord: string,
    lang: "ta" | "en"
  ) => {
    if (activeSpellCardId === cardId) {
      spellCancelRef.current = true;
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setActiveSpellCardId(null);
      setActiveSpellIndex(null);
      return;
    }

    spellCancelRef.current = false;
    setActiveSpellCardId(cardId);

    // 1. Speak each syllable / letter sequentially with visual illumination
    for (let i = 0; i < syllables.length; i++) {
      if (spellCancelRef.current) break;
      setActiveSpellIndex(i);
      await playTtsAudio(syllables[i], lang);
      if (spellCancelRef.current) break;
      // Brief natural pause between letters (longer in slow motion)
      await new Promise((r) => setTimeout(r, isSlowAudio ? 450 : 260));
    }

    // 2. Speak full word ("= maram" in Tamil, or "= nose" in English)
    if (!spellCancelRef.current) {
      setActiveSpellIndex(-1); // -1 signifies the full word formula badge
      await playTtsAudio(fullWord, lang);
      await new Promise((r) => setTimeout(r, isSlowAudio ? 550 : 400));
    }

    setActiveSpellCardId(null);
    setActiveSpellIndex(null);
  };

  // -------------------------------------------------------------
  // Syllable Assembly Game (Word Builder) Handlers
  // -------------------------------------------------------------
  const startAssemblyGame = (
    cardId: string,
    units: string[],
    targetWord: string,
    lang: "ta" | "en"
  ) => {
    // If spell sequence is running, cancel it
    if (activeSpellCardId) {
      spellCancelRef.current = true;
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setActiveSpellCardId(null);
      setActiveSpellIndex(null);
    }

    setAssemblyCardId(cardId);
    setAssemblyTargetUnits(units);
    setAssemblyTargetWord(targetWord);
    setAssemblyTargetLang(lang);
    setAssemblyAssembled([]);
    setAssemblyStatus("playing");

    // Scramble tiles with unique ids
    const tiles = units.map((char, index) => ({
      id: `${char}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      char,
    }));
    const shuffled = [...tiles].sort(() => Math.random() - 0.5);
    if (shuffled.map((t) => t.char).join("") === units.join("") && units.length > 1) {
      shuffled.reverse();
    }
    setAssemblyAvailable(shuffled);
  };

  const handlePickAssemblyTile = (tile: { id: string; char: string }) => {
    if (assemblyStatus === "success") return;

    // Immediately pronounce the selected syllable
    speakSyllable(tile.char, assemblyTargetLang);

    const newAvailable = assemblyAvailable.filter((t) => t.id !== tile.id);
    const newAssembled = [...assemblyAssembled, tile];
    setAssemblyAvailable(newAvailable);
    setAssemblyAssembled(newAssembled);

    // Evaluate on complete word assembly
    if (newAssembled.length === assemblyTargetUnits.length) {
      const assembledWord = newAssembled.map((t) => t.char).join("");
      const targetWord = assemblyTargetUnits.join("");
      if (assembledWord.toLowerCase() === targetWord.toLowerCase()) {
        setAssemblyStatus("success");
        setTimeout(() => {
          speakText(assemblyTargetWord, assemblyTargetLang);
        }, 320);
      } else {
        setAssemblyStatus("wrong");
      }
    } else {
      setAssemblyStatus("playing");
    }
  };

  const handleReturnAssemblyTile = (tile: { id: string; char: string }) => {
    const newAssembled = assemblyAssembled.filter((t) => t.id !== tile.id);
    const newAvailable = [...assemblyAvailable, tile];
    setAssemblyAssembled(newAssembled);
    setAssemblyAvailable(newAvailable);
    setAssemblyStatus("playing");
  };

  const resetAssemblyGame = () => {
    if (!assemblyTargetUnits || assemblyTargetUnits.length === 0) return;
    setAssemblyAssembled([]);
    setAssemblyStatus("playing");
    const tiles = assemblyTargetUnits.map((char, index) => ({
      id: `${char}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      char,
    }));
    const shuffled = [...tiles].sort(() => Math.random() - 0.5);
    if (shuffled.map((t) => t.char).join("") === assemblyTargetUnits.join("") && assemblyTargetUnits.length > 1) {
      shuffled.reverse();
    }
    setAssemblyAvailable(shuffled);
  };

  const exitAssemblyGame = () => {
    setAssemblyCardId(null);
    setAssemblyTargetUnits([]);
    setAssemblyTargetWord("");
    setAssemblyAssembled([]);
    setAssemblyAvailable([]);
    setAssemblyStatus("playing");
  };

  // AI Tutor Voice Query Recording
  const startTutorVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      const mimeType = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      tutorMediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(chunks, { type: mimeType });
        await submitTutorVoiceQuery(audioBlob);
      };

      // 100ms time slice ensures continuous stream buffering
      mediaRecorder.start(100);
      setIsTutorRecording(true);
      setTutorRecordTime(0);

      tutorTimerRef.current = setInterval(() => {
        setTutorRecordTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access denied or not available. Please allow mic permissions in your browser.");
    }
  };

  const stopTutorVoiceRecording = () => {
    if (tutorMediaRecorderRef.current && isTutorRecording) {
      setIsTutorRecording(false);
      if (tutorTimerRef.current) clearInterval(tutorTimerRef.current);
      // Small 200ms delay to ensure final spoken phoneme is not cut off by button click
      setTimeout(() => {
        if (tutorMediaRecorderRef.current && tutorMediaRecorderRef.current.state === "recording") {
          tutorMediaRecorderRef.current.stop();
        }
      }, 200);
    }
  };

  const submitTutorVoiceQuery = async (audioBlob: Blob) => {
    setIsTutorProcessingVoice(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "query.wav");
    formData.append("language_code", selectedLang === "all" ? "badaga" : selectedLang);

    try {
      const res = await fetch(`${API_BASE}/tutor/voice-query`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const userSpoken = data.transcription || "Spoken Voice Query";
        setChatMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: `🎙️ ${userSpoken}`,
            is_voice: true,
          },
          {
            role: "assistant",
            content: data.message,
            provider: "Kurinji AI",
            verified_vocab: data.verified_vocabulary,
            audio_url: data.audio_url,
            audio_assets: data.audio_assets,
            tts_url: data.response_tts_url,
          },
        ]);

        if (data.audio_url) {
          playAudio(data.audio_url, `tutor_voice_${data.audio_url}`);
        } else if (data.response_tts_url) {
          playAudio(data.response_tts_url, `tutor_tts_${data.response_tts_url}`);
        }
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I could not process your voice audio. Please ensure your microphone is working and speak clearly.",
            provider: "Kurinji AI",
          },
        ]);
      }
    } catch (err) {
      console.error("Error sending voice query:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Voice recognition is temporarily unavailable. Please try again.",
          provider: "Kurinji AI",
        },
      ]);
    } finally {
      setIsTutorProcessingVoice(false);
    }
  };

  // Dictionary Voice Search Handlers
  const startDictVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      const mimeType = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      dictMediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(chunks, { type: mimeType });
        await submitDictVoiceSearch(audioBlob);
      };

      mediaRecorder.start(100);
      setIsDictRecording(true);
    } catch (err) {
      console.error("Microphone access error in dictionary:", err);
      alert("Microphone access denied or not available. Please allow mic permissions in your browser.");
    }
  };

  const stopDictVoiceRecording = () => {
    if (dictMediaRecorderRef.current && isDictRecording) {
      setIsDictRecording(false);
      setTimeout(() => {
        if (dictMediaRecorderRef.current && dictMediaRecorderRef.current.state === "recording") {
          dictMediaRecorderRef.current.stop();
        }
      }, 250);
    }
  };

  const submitDictVoiceSearch = async (audioBlob: Blob) => {
    setIsDictProcessingVoice(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "query.wav");
    formData.append("language_code", selectedLang === "all" ? "badaga" : selectedLang);

    try {
      const res = await fetch(`${API_BASE}/recognition`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const term = data.english_meaning || data.transcription || data.source_word || "";
        if (term) {
          setSearchQuery(term);
          if (data.audio_asset_url) {
            playAudio(data.audio_asset_url, `dict_voice_${data.top_word_id}`);
          }
        }
      }
    } catch (err) {
      console.error("Error in dictionary voice search:", err);
    } finally {
      setIsDictProcessingVoice(false);
    }
  };

  // AI Tutor chat handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setInputMessage("");
    setChatMessages((prev) => [...prev, { role: "user", content: userText }]);
    setIsSendingMessage(true);

    try {
      const res = await fetch(`${API_BASE}/tutor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          language_code: selectedLang === "all" ? "badaga" : selectedLang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            provider: "Kurinji AI",
            verified_vocab: data.verified_vocabulary,
            audio_url: data.audio_url,
            audio_assets: data.audio_assets,
            tts_url: data.tamil_tts_url || data.english_tts_url,
          },
        ]);

        if (data.audio_url) {
          playAudio(data.audio_url, `tutor_${data.audio_url}`);
        }
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an issue retrieving that definition. Please try again.",
            provider: "Kurinji AI",
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Could not reach the AI tutor service at this time. Please try again in a moment.",
          provider: "Kurinji AI",
        },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Deduplicate vocabulary when viewing "All Languages" so overlapping concepts are merged into one clean card
  const displayVocab = useMemo<VocabularyItem[]>(() => {
    const convertCustomWord = (w: any, pkg: CustomLanguagePackage, idx: number): VocabularyItem => ({
      id: `custom_${pkg.id}_${w.id}`,
      external_word_id: `C${String(idx + 1).padStart(3, "0")}`,
      language_code: pkg.id,
      language_name: pkg.name + (pkg.nativeName ? ` (${pkg.nativeName})` : ""),
      category: w.category || "General Vocabulary",
      source_word: w.nativeWord,
      badaga_source_word: undefined,
      marwari_source_word: undefined,
      tamil_meaning: w.tamilMeaning,
      english_meaning: w.englishMeaning,
      tamil_syllables: w.tamilSyllables,
      audio_assets: w.audioData
        ? [{ id: `aud_${w.id}`, audio_url: w.audioData, filename: `${w.nativeWord}.webm`, duration: 1.0 }]
        : [],
      badaga_audio_assets: [],
      marwari_audio_assets: [],
      image_url: undefined,
    });

    // If a custom language package is selected directly
    const customMatch = customPackages.find((p) => p.id === selectedLang);
    if (customMatch) {
      return customMatch.vocabulary.map((w, idx) => convertCustomWord(w, customMatch, idx));
    }

    if (selectedLang !== "all") {
      return vocabulary.filter((i) => i.language_code === selectedLang);
    }

    const unifiedMap: Record<string, VocabularyItem> = {};
    vocabulary.forEach((item) => {
      const wid = item.external_word_id;
      if (!unifiedMap[wid]) {
        unifiedMap[wid] = {
          ...item,
          id: `unified_${wid}`,
          badaga_source_word: item.language_code === "badaga" ? item.source_word : undefined,
          marwari_source_word: item.language_code === "marwari" ? item.source_word : undefined,
          badaga_audio_assets: item.language_code === "badaga" ? item.audio_assets : [],
          marwari_audio_assets: item.language_code === "marwari" ? item.audio_assets : [],
        };
      } else {
        const u = unifiedMap[wid];
        u.language_name = "Badaga & Marwari";
        if (item.language_code === "badaga") {
          u.badaga_source_word = item.source_word;
          u.badaga_audio_assets = item.audio_assets;
        } else if (item.language_code === "marwari") {
          u.marwari_source_word = item.source_word;
          u.marwari_audio_assets = item.audio_assets;
        }
        // Merge audio assets without duplicate filenames
        const existing = new Set(u.audio_assets.map((a) => a.filename));
        item.audio_assets.forEach((a) => {
          if (!existing.has(a.filename)) {
            u.audio_assets.push(a);
            existing.add(a.filename);
          }
        });
      }
    });

    const result = Object.values(unifiedMap);

    // Also include custom package vocabulary items in "All Languages" view
    customPackages.forEach((pkg) => {
      pkg.vocabulary.forEach((w, idx) => {
        result.push(convertCustomWord(w, pkg, idx));
      });
    });

    return result;
  }, [vocabulary, selectedLang, customPackages]);

  // Filter dictionary items by search query and category
  const filteredVocab = useMemo(() => {
    return displayVocab.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        item.english_meaning.toLowerCase().includes(q) ||
        item.tamil_meaning.toLowerCase().includes(q) ||
        item.external_word_id.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.tamil_syllables && item.tamil_syllables.toLowerCase().includes(q)) ||
        (item.source_word && item.source_word.toLowerCase().includes(q)) ||
        (item.badaga_source_word && item.badaga_source_word.toLowerCase().includes(q)) ||
        (item.marwari_source_word && item.marwari_source_word.toLowerCase().includes(q))
      );
    });
  }, [displayVocab, searchQuery, selectedCategory]);

  // Extract categories with counts for filter tabs
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    displayVocab.forEach((item) => {
      const cat = item.category || "General Vocabulary";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [displayVocab]);

  // Group filtered items by category, sorted by canonical CATEGORY_ORDER and numeric Word ID
  const groupedVocab = useMemo(() => {
    const map: Record<string, VocabularyItem[]> = {};

    // Sort items numerically by Word ID within category
    const sorted = [...filteredVocab].sort((a, b) => {
      const numA = parseInt(a.external_word_id.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.external_word_id.replace(/\D/g, "")) || 0;
      return numA - numB;
    });

    sorted.forEach((item) => {
      const cat = item.category || "General Vocabulary";
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });

    // Return entries strictly ordered by canonical CATEGORY_ORDER
    const orderedMap: Record<string, VocabularyItem[]> = {};
    CATEGORY_ORDER.forEach((cat) => {
      if (map[cat] && map[cat].length > 0) {
        orderedMap[cat] = map[cat];
      }
    });
    // Add any remaining categories not explicitly in CATEGORY_ORDER
    Object.keys(map).forEach((cat) => {
      if (!orderedMap[cat]) {
        orderedMap[cat] = map[cat];
      }
    });

    return orderedMap;
  }, [filteredVocab]);

  // Group all displayVocab items into categories for the Category Container Decks
  const allCategoryDecks = useMemo(() => {
    const map: Record<string, VocabularyItem[]> = {};
    const sorted = [...displayVocab].sort((a, b) => {
      const numA = parseInt(a.external_word_id.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.external_word_id.replace(/\D/g, "")) || 0;
      return numA - numB;
    });
    sorted.forEach((item) => {
      const cat = item.category || "General Vocabulary";
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }, [displayVocab]);

  // The active deck being swiped: either the selected category's cards or filtered search cards
  const currentDeck = useMemo(() => {
    if (selectedCategory !== "all") {
      return allCategoryDecks[selectedCategory] || [];
    }
    return filteredVocab;
  }, [allCategoryDecks, selectedCategory, filteredVocab]);

  // Category navigation handlers
  const selectCategoryDeck = (catName: string) => {
    setSelectedCategory(catName);
    setSwiperIndex(0);
    setDragOffset({ x: 0, y: 0 });
    setSlideAnim(null);
    setIsAnimatingCard(false);
  };

  const backToCategoryContainers = () => {
    setSelectedCategory("all");
    setSwiperIndex(0);
    setDragOffset({ x: 0, y: 0 });
    setSlideAnim(null);
    setIsAnimatingCard(false);
  };

  // Card slide controls: directional slide-out then clean entrance slide-in
  const handleNextCard = () => {
    if (isAnimatingCard || swiperIndex >= currentDeck.length) return;
    setIsAnimatingCard(true);
    setSlideAnim("exit-left");
    setTimeout(() => {
      setSwiperIndex((prev) => Math.min(prev + 1, currentDeck.length));
      setSlideAnim("enter-right");
      setDragOffset({ x: 0, y: 0 });
      setTimeout(() => {
        setSlideAnim(null);
        setIsAnimatingCard(false);
      }, 260);
    }, 220);
  };

  const handlePrevCard = () => {
    if (isAnimatingCard || swiperIndex <= 0) return;
    setIsAnimatingCard(true);
    setSlideAnim("exit-right");
    setTimeout(() => {
      setSwiperIndex((prev) => Math.max(0, prev - 1));
      setSlideAnim("enter-left");
      setDragOffset({ x: 0, y: 0 });
      setTimeout(() => {
        setSlideAnim(null);
        setIsAnimatingCard(false);
      }, 260);
    }, 220);
  };

  const handleResetDeck = () => {
    setSwiperIndex(0);
    setDragOffset({ x: 0, y: 0 });
    setSlideAnim(null);
    setIsAnimatingCard(false);
  };

  // Touch & Mouse drag gestures for fluid card swiping
  const onTouchStart = (e: React.TouchEvent) => {
    if (isAnimatingCard) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("select") || target.closest("input")) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isAnimatingCard) return;
    const deltaX = e.touches[0].clientX - dragStart.x;
    const deltaY = e.touches[0].clientY - dragStart.y;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setDragOffset({ x: deltaX, y: deltaY });
    }
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset.x < -60) {
      // Swiped Left -> Next Card
      handleNextCard();
    } else if (dragOffset.x > 60) {
      // Swiped Right -> Previous Card if available, else Next
      if (swiperIndex > 0) {
        handlePrevCard();
      } else {
        handleNextCard();
      }
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (isAnimatingCard) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("select") || target.closest("input")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isAnimatingCard) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset.x < -60) {
      // Dragged Left -> Next Card
      handleNextCard();
    } else if (dragOffset.x > 60) {
      // Dragged Right -> Previous Card if available, else Next
      if (swiperIndex > 0) {
        handlePrevCard();
      } else {
        handleNextCard();
      }
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const onMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Keyboard navigation: Left/Right arrows for swiping, Space to pronounce
  useEffect(() => {
    if (activeTab !== "learn" || selectedCategory === "all") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevCard();
      } else if (e.key === " ") {
        e.preventDefault();
        const currentItem = currentDeck[swiperIndex];
        if (currentItem) {
          if (currentItem.badaga_audio_assets && currentItem.badaga_audio_assets.length > 0) {
            playAudio(currentItem.badaga_audio_assets[0].audio_url);
          } else if (currentItem.audio_assets && currentItem.audio_assets.length > 0) {
            playAudio(currentItem.audio_assets[0].audio_url);
          } else if (currentItem.tamil_meaning) {
            speakText(currentItem.tamil_meaning, "ta");
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, selectedCategory, swiperIndex, currentDeck]);

  // Helper to render individual vocabulary card (identical UI elements in both views)
  const renderVocabCard = (item: VocabularyItem, isSwiperMode = false) => (
    <div
      key={item.id || `${item.language_code}_${item.external_word_id}`}
      className={`bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xs transition-all flex flex-col justify-between space-y-3 sm:space-y-3.5 ${
        isSwiperMode ? "w-full shadow-xl border-slate-300" : "hover:shadow-md hover:border-slate-300"
      }`}
    >
      <div>
        {/* Top Photographic Flashcard Image (100% of all words) */}
        {item.image_url ? (
          <div className="relative w-full h-36 sm:h-44 bg-slate-100 rounded-lg overflow-hidden border border-slate-200/90 mb-3 sm:mb-3.5 group shadow-inner">
            <img
              src={item.image_url}
              alt={`${item.english_meaning} (${item.tamil_meaning})`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.endsWith(".jpg")) {
                  target.src = target.src.replace(".jpg", ".svg");
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
              {item.english_meaning}
            </div>
            {item.audio_assets && item.audio_assets.length > 0 && (
              <div className="absolute top-2 right-2 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-xs flex items-center space-x-1">
                <span>🎙️ Native Audio</span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full h-36 sm:h-44 bg-slate-100 rounded-lg overflow-hidden border border-slate-200/90 mb-3 sm:mb-3.5 flex flex-col items-center justify-center text-slate-400">
            <BookOpen className="w-8 h-8 text-slate-300 mb-1" />
            <span className="text-xs font-semibold text-slate-500 capitalize">{item.english_meaning}</span>
          </div>
        )}

        {/* Top Meta Badges */}
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center space-x-1.5">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {item.external_word_id}
            </span>
            {item.category && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {CATEGORY_META[item.category]?.icon || CATEGORY_ICONS[item.category] || "📁"} {item.category}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
              item.language_name === "Badaga & Marwari"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {item.language_name || item.language_code}
          </span>
        </div>

        {/* Main Meanings: Whole English Word & Whole Tamil Word */}
        <h3 className="text-base font-bold text-slate-900 capitalize leading-snug">
          {item.english_meaning}
        </h3>
        <div className="text-lg font-bold text-slate-800 mt-0.5">
          {item.tamil_meaning}
        </div>

        {/* Native Oral Pronunciations (Unified display for dual-dialect and single-dialect concepts) */}
        {item.badaga_source_word || item.marwari_source_word ? (
          <div className="space-y-1 mt-1.5 text-xs text-slate-600">
            {item.badaga_source_word && (
              <p>
                <span className="text-slate-400">Oral Badaga:</span>{" "}
                <span className="font-semibold text-slate-900 not-italic">&ldquo;{item.badaga_source_word}&rdquo;</span>
              </p>
            )}
            {item.marwari_source_word && (
              <p>
                <span className="text-slate-400">Oral Marwari:</span>{" "}
                <span className="font-semibold text-slate-900 not-italic">&ldquo;{item.marwari_source_word}&rdquo;</span>
              </p>
            )}
          </div>
        ) : item.source_word ? (
          <p className="text-xs text-slate-600 mt-1.5">
            <span className="text-slate-400">
              Oral {item.language_name || (item.language_code === "badaga" ? "Badaga" : "Marwari")}:
            </span>{" "}
            <span className="font-semibold text-slate-900 not-italic">&ldquo;{item.source_word}&rdquo;</span>
          </p>
        ) : null}

        {/* Mother Tongue Literacy Teaching: Tamil Script & English Letter Spelling with Audio on Each Letter */}
        {(() => {
          const cardId = item.id || `${item.language_code}_${item.external_word_id}`;
          const currentMode = cardScriptMode[cardId] || "ta";
          const isEnglishMode = currentMode === "en";

          // Extract letter/syllable units:
          const tamilLetters = item.tamil_syllables
            ? item.tamil_syllables.split(" + ").map((s) => s.trim()).filter(Boolean)
            : getTamilSyllables(item.tamil_meaning || "");

          const englishLetters = getEnglishLetters(item.english_meaning || "");
          const activeUnits = isEnglishMode ? englishLetters : tamilLetters;
          const fullWord = isEnglishMode ? (item.english_meaning || "").toUpperCase() : (item.tamil_meaning || "");
          const isCurrentSpelling = activeSpellCardId === cardId;

          if (activeUnits.length === 0) return null;

          return (
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 space-y-2.5 transition-all">
              {/* Header with Title, Slow Motion Toggle, & Script Switcher */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 tracking-tight flex items-center space-x-1">
                  <span>{isEnglishMode ? "🔤 English Spelling Breakdown" : "📖 Tamil Script Breakdown"}</span>
                </span>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {/* Slow Motion Audio Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsSlowAudio((prev) => !prev)}
                    title={isSlowAudio ? "Slow Motion ON (0.65x speed). Click for Normal (1.0x)" : "Click to activate Slow Motion (0.65x) pronunciation for maximum clarity"}
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border transition-all active:scale-95 shadow-2xs ${
                      isSlowAudio
                        ? "bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-400"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <span>{isSlowAudio ? "🐢 0.65x Slow" : "🐰 1.0x"}</span>
                  </button>

                  {/* Tamil / English Switcher */}
                  <button
                    type="button"
                    onClick={() =>
                      setCardScriptMode((prev) => ({
                        ...prev,
                        [cardId]: isEnglishMode ? "ta" : "en",
                      }))
                    }
                    title={isEnglishMode ? "Switch to Tamil Script" : "Switch to English Spelling"}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs transition-all active:scale-95"
                  >
                    <span>{isEnglishMode ? "🇮🇳 View Tamil" : "🔤 View English"}</span>
                  </button>
                </div>
              </div>

              {/* Check if Assembly Game is Active for this Card */}
              {assemblyCardId === cardId ? (
                <div className="bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/80 border-2 border-indigo-200 rounded-xl p-3 space-y-2.5 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-200">
                  {/* Game Sub-Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="p-1 rounded-md bg-indigo-600 text-white shadow-2xs">
                        <Puzzle className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-indigo-950">
                        Syllable Assembly Game
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={resetAssemblyGame}
                        title="Reshuffle syllables"
                        className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white border border-slate-200 text-xs transition-all active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={exitAssemblyGame}
                        title="Exit game"
                        className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-white border border-slate-200 text-xs transition-all active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Target Prompt */}
                  <div className="text-[11px] text-slate-600 flex items-center justify-between bg-white/80 px-2 py-1 rounded-lg border border-indigo-100">
                    <span>Spell target word:</span>
                    <span className="font-black text-indigo-950 text-xs">
                      {assemblyTargetWord}
                    </span>
                  </div>

                  {/* Assembled Word Dropzone */}
                  <div className="bg-white border border-indigo-100 rounded-xl p-2.5 shadow-inner">
                    <div className="text-[9px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>YOUR ASSEMBLED WORD:</span>
                      <span className="text-[8px] text-slate-400">(tap placed letter to return)</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 min-h-[44px]">
                      {assemblyTargetUnits.map((_, slotIdx) => {
                        const placedTile = assemblyAssembled[slotIdx];
                        return placedTile ? (
                          <button
                            key={`placed-${placedTile.id}`}
                            type="button"
                            onClick={() => handleReturnAssemblyTile(placedTile)}
                            title="Tap to return to bank"
                            className={`group px-3 py-1.5 rounded-lg border font-black text-base sm:text-lg shadow-xs transition-all active:scale-95 ${
                              assemblyStatus === "success"
                                ? "bg-emerald-600 border-emerald-600 text-white animate-bounce ring-2 ring-emerald-300"
                                : assemblyStatus === "wrong"
                                ? "bg-rose-50 border-rose-300 text-rose-800"
                                : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                          >
                            <span>{placedTile.char}</span>
                          </button>
                        ) : (
                          <div
                            key={`empty-slot-${slotIdx}`}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300 text-xs font-mono select-none"
                          >
                            {slotIdx + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Banner */}
                  {assemblyStatus === "success" && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between shadow-2xs">
                      <div className="flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-emerald-950">🎉 Correct Assembly!</p>
                          <p className="text-[9px] text-emerald-800">You mastered this word&apos;s syllable order.</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => speakText(assemblyTargetWord, assemblyTargetLang)}
                          className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 flex items-center space-x-1 shadow-2xs"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Hear</span>
                        </button>
                        <button
                          type="button"
                          onClick={resetAssemblyGame}
                          className="px-2 py-1 rounded bg-white border border-emerald-300 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100"
                        >
                          Play Again
                        </button>
                      </div>
                    </div>
                  )}

                  {assemblyStatus === "wrong" && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
                      <div className="flex items-center space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span className="text-[10px] font-medium">Not quite! Tap any tile above to take it back.</span>
                      </div>
                      <button
                        type="button"
                        onClick={resetAssemblyGame}
                        className="text-[10px] font-bold text-rose-700 underline hover:text-rose-900"
                      >
                        Reset
                      </button>
                    </div>
                  )}

                  {/* Scrambled Available Tile Bank */}
                  {assemblyAvailable.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 mb-1 flex items-center space-x-1">
                        <span>AVAILABLE SYLLABLES (TAP TO HEAR &amp; PLACE):</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {assemblyAvailable.map((tile) => (
                          <button
                            key={tile.id}
                            type="button"
                            onClick={() => handlePickAssemblyTile(tile)}
                            className="group px-3 py-1.5 rounded-xl bg-white border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50 text-slate-900 font-black text-base sm:text-lg shadow-2xs hover:shadow-xs transition-all active:scale-90 flex items-center space-x-1 cursor-pointer"
                          >
                            <span>{tile.char}</span>
                            <Volume1 className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Syllable Breakdown and Spelling Formula View */
                <>
                  {/* Syllables / Letters Breakdown with dedicated audio button for each individual letter */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {activeUnits.map((unit, uIdx, arr) => {
                      const isUnitLit = isCurrentSpelling && activeSpellIndex === uIdx;
                      return (
                        <React.Fragment key={uIdx}>
                          <div
                            className={`group relative inline-flex items-center space-x-1 rounded-lg px-2 py-1 transition-all border shadow-2xs select-none ${
                              isUnitLit
                                ? "bg-emerald-600 border-emerald-600 text-white scale-105 shadow-md ring-2 ring-emerald-300"
                                : "bg-white border-slate-300 text-slate-900 hover:border-slate-400 hover:shadow-xs"
                            }`}
                          >
                            <span className={`text-sm sm:text-base font-black leading-none ${isUnitLit ? "text-white" : "text-slate-900"}`}>
                              {unit}
                            </span>

                            {/* Individual letter audio button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakSyllable(unit, isEnglishMode ? "en" : "ta");
                              }}
                              title={`Listen to letter sound: ${unit}`}
                              className={`p-0.5 rounded transition-transform active:scale-90 ${
                                isUnitLit
                                  ? "text-white hover:bg-emerald-700"
                                  : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                              }`}
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          </div>

                          {uIdx < arr.length - 1 && (
                            <span className="text-xs font-black text-slate-400 select-none">+</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Syllable Word Formula, Syllable Assembly Game trigger & Sequential "Spell & Pronounce" */}
                  <div className="text-[10px] sm:text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center space-x-1 truncate max-w-[160px] sm:max-w-[210px]">
                      <span className="text-slate-500 font-mono text-[10px] truncate">
                        {activeUnits.join(" + ")} =
                      </span>
                      <span className={`font-bold ml-1 truncate ${isCurrentSpelling && activeSpellIndex === -1 ? "text-emerald-600 font-black" : "text-slate-900"}`}>
                        {fullWord}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {/* Syllable Assembly Game Button */}
                      <button
                        type="button"
                        onClick={() =>
                          startAssemblyGame(
                            cardId,
                            activeUnits,
                            fullWord,
                            isEnglishMode ? "en" : "ta"
                          )
                        }
                        title="Play interactive Syllable Assembly Game for this word"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all active:scale-95 shadow-2xs"
                      >
                        <Puzzle className="w-3 h-3 text-indigo-600" />
                        <span>Assemble</span>
                      </button>

                      {/* Spell & Pronounce Button */}
                      <button
                        type="button"
                        onClick={() =>
                          playSpellSequence(
                            cardId,
                            activeUnits,
                            fullWord,
                            isEnglishMode ? "en" : "ta"
                          )
                        }
                        title="Pronounce each letter one-by-one then the whole word"
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all active:scale-95 shadow-xs ${
                          isCurrentSpelling
                            ? "bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-300"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${isCurrentSpelling ? "animate-pulse text-amber-200" : ""}`} />
                        <span>{isCurrentSpelling ? "Stop" : "Spell & Pronounce"}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* Bottom Audio Controls */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        {/* Badaga / Native Audio Player: separate Badaga & Marwari controls if dual-language */}
        <div className="flex items-center space-x-1.5">
          {item.badaga_audio_assets && item.badaga_audio_assets.length > 0 ? (
            <div className="flex items-center space-x-1">
              <BadagaAudioPlayer
                assets={item.badaga_audio_assets}
                activeAudioKey={activeAudioKey}
                onPlay={playAudio}
              />
              {item.marwari_audio_assets && item.marwari_audio_assets.length > 0 && (
                <span className="text-[9px] font-bold text-slate-500 uppercase px-1 py-0.5 rounded bg-slate-100 border border-slate-200">
                  BDG
                </span>
              )}
            </div>
          ) : null}

          {item.marwari_audio_assets && item.marwari_audio_assets.length > 0 ? (
            <div className="flex items-center space-x-1">
              <BadagaAudioPlayer
                assets={item.marwari_audio_assets}
                activeAudioKey={activeAudioKey}
                onPlay={playAudio}
              />
              {item.badaga_audio_assets && item.badaga_audio_assets.length > 0 && (
                <span className="text-[9px] font-bold text-slate-500 uppercase px-1 py-0.5 rounded bg-slate-100 border border-slate-200">
                  MWR
                </span>
              )}
            </div>
          ) : null}

          {/* Fallback if single dialect */}
          {(!item.badaga_audio_assets || item.badaga_audio_assets.length === 0) &&
            (!item.marwari_audio_assets || item.marwari_audio_assets.length === 0) && (
              <BadagaAudioPlayer
                assets={item.audio_assets}
                activeAudioKey={activeAudioKey}
                onPlay={playAudio}
              />
            )}
        </div>

        {/* Tamil & English Audio Buttons with Audio Symbol and Word Spelling */}
        <div className="flex items-center space-x-1.5">
          {item.tamil_meaning && (
            <button
              type="button"
              onClick={() => speakText(item.tamil_meaning, "ta", `dict_ta_${item.external_word_id}`)}
              title={`Listen in Tamil: ${item.tamil_meaning}`}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-all active:scale-95 border border-slate-900"
            >
              <Volume2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
              <span className="leading-none text-[11px] max-w-[100px] truncate">{item.tamil_meaning}</span>
            </button>
          )}

          {item.english_meaning && (
            <button
              type="button"
              onClick={() => speakText(item.english_meaning, "en", `dict_en_${item.external_word_id}`)}
              title={`Listen in English: ${item.english_meaning}`}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-all active:scale-95 border border-slate-900"
            >
              <Volume2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
              <span className="capitalize leading-none text-[11px] max-w-[100px] truncate">{item.english_meaning}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* =========================================================================
          LEFT PANEL / SIDEBAR (All Navigation in Left Panel, strictly 2 tabs)
          ========================================================================= */}
      <aside
        className={`${
          isSidebarOpen
            ? "translate-x-0 w-72 md:w-64 lg:w-72"
            : "-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden md:opacity-0 md:pointer-events-none"
        } fixed md:relative inset-y-0 left-0 z-50 md:z-20 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none shadow-2xl md:shadow-none transition-all duration-300 ease-in-out`}
      >
        <div>
          {/* Brand Header */}
          <div className="px-5 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
                K
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-sm tracking-tight leading-none">
                  KURINJI
                </h1>
                <p className="text-[11px] text-slate-500 mt-1">Indigenous Hill Speech</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                v1.0
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Hide Left Panel"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Target Language Switcher (Left Panel) */}
          <div className="px-4 py-4 border-b border-slate-100">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 px-1">
              Language Filter
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedLang("all")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedLang === "all"
                    ? "bg-black text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>All Languages</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    selectedLang === "all" ? "bg-neutral-800 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {langCounts.all}
                </span>
              </button>

              <button
                onClick={() => setSelectedLang("badaga")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedLang === "badaga"
                    ? "bg-black text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Badaga (படக)</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    selectedLang === "badaga" ? "bg-neutral-800 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {langCounts.badaga}
                </span>
              </button>

              <button
                onClick={() => setSelectedLang("marwari")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedLang === "marwari"
                    ? "bg-black text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Marwari (मारवाड़ी)</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    selectedLang === "marwari" ? "bg-neutral-800 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {langCounts.marwari}
                </span>
              </button>

              {/* Custom Mother Tongue Packages (created by user) */}
              {customPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedLang(pkg.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedLang === pkg.id
                      ? "bg-black text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="truncate max-w-[130px]">
                    {pkg.name} {pkg.nativeName ? `(${pkg.nativeName})` : ""}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      selectedLang === pkg.id
                        ? "bg-neutral-800 text-white"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {pkg.vocabulary.length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SIDEBAR NAVIGATION TABS */}
          <div className="px-4 py-4 space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 px-1">
              Navigation
            </div>

            {/* TAB 1: AI TUTOR */}
            <button
              onClick={() => {
                setActiveTab("tutor");
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "tutor"
                  ? "bg-black text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="font-semibold">AI Tutor</span>
            </button>

            {/* TAB 2: LEARN */}
            <button
              onClick={() => {
                setActiveTab("learn");
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "learn"
                  ? "bg-black text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="font-semibold">Learn</span>
            </button>

            {/* TAB 3: ASSESSMENT (SYLLABLE WORD GAME & TEACHER PORTAL) */}
            <button
              onClick={() => {
                setActiveTab("assessment");
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "assessment"
                  ? "bg-black text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center space-x-3">
                <GraduationCap className="w-4 h-4 shrink-0 text-indigo-400" />
                <span className="font-semibold">Assessment</span>
              </div>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Quiz
              </span>
            </button>

            {/* TAB 4: PACKAGE BUILDER */}
            <button
              onClick={() => {
                setActiveTab("builder");
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "builder"
                  ? "bg-black text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center space-x-3">
                <FolderPlus className="w-4 h-4 shrink-0" />
                <span className="font-semibold">Package Builder</span>
              </div>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Studio
              </span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer Status */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Verified Heritage Wordbank</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Native Oral Pronunciations Active</p>
        </div>
      </aside>

      {/* =========================================================================
          MAIN CONTENT AREA (Right of Sidebar, Clean Light Theme)
          ========================================================================= */}
      <main className="flex-1 h-full overflow-y-auto bg-slate-50 flex flex-col w-full min-w-0">
        {/* Top Header Bar for Learn View */}
        {activeTab === "learn" && (
          <header className="min-h-14 sm:h-16 border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-10 w-full">
            <div className="flex items-center min-w-0 space-x-2 sm:space-x-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-black transition-colors shrink-0"
                title={isSidebarOpen ? "Hide left panel" : "Show left panel"}
              >
                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
              </button>

              {selectedCategory !== "all" && (
                <button
                  type="button"
                  onClick={backToCategoryContainers}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-black flex items-center space-x-1 text-xs font-bold border border-slate-200 transition-all active:scale-95 shadow-2xs shrink-0"
                  title="Back to Categories"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Categories</span>
                </button>
              )}

              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-1.5 truncate">
                  {selectedCategory !== "all" ? (
                    <>
                      <span>{CATEGORY_META[selectedCategory]?.icon || "📁"}</span>
                      <span className="truncate">{selectedCategory}</span>
                    </>
                  ) : (
                    <span>Learn</span>
                  )}
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                  {selectedCategory !== "all"
                    ? `${currentDeck.length} flashcards in deck`
                    : `${filteredVocab.length} concepts across ${CATEGORY_ORDER.length} categories`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                {selectedLang === "all" ? "All Languages" : selectedLang === "badaga" ? "Badaga" : "Marwari"}
              </span>
            </div>
          </header>
        )}

        {/* =====================================================================
            VIEW 1: AI TUTOR TAB (KURINJI AUDIO SPEECH RECOGNITION & TRANSLATION)
            ===================================================================== */}
        {activeTab === "tutor" && (
          <div className="flex-1 w-full h-full overflow-hidden">
            <KurinjiAITutor
              initialLanguage={selectedLang === "marwari" ? "Marwari" : "Badaga"}
              onLanguageChange={(lang) => setSelectedLang(lang.toLowerCase() as "badaga" | "marwari")}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              isSidebarOpen={isSidebarOpen}
            />
          </div>
        )}

        {/* =====================================================================
            VIEW 2: LEARN TAB
            ===================================================================== */}
        {activeTab === "learn" && (
          <div className="flex-1 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
            {/* Search Input Bar */}
            <div className="w-full max-w-2xl flex items-center space-x-2 sm:space-x-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isDictRecording
                      ? "🎙️ Listening... Speak Badaga, Tamil, or English word clearly..."
                      : isDictProcessingVoice
                      ? "⚡ Matching voice with clear audio filter & verified wordbank..."
                      : "Search by Badaga, Tamil, English, or Word ID (e.g., 'mande', 'தலை', 'W0001')..."
                  }
                  className={`w-full bg-white border rounded-lg pl-10 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black shadow-xs ${
                    isDictRecording ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-300"
                  }`}
                />
              </div>

              {/* Dictionary Voice Search Mic Button */}
              <button
                type="button"
                onClick={isDictRecording ? stopDictVoiceRecording : startDictVoiceRecording}
                disabled={isDictProcessingVoice}
                title="Voice Search (Speak word to search)"
                className={`p-2.5 rounded-lg border transition-all ${
                  isDictRecording
                    ? "bg-rose-600 text-white border-rose-600 animate-pulse shadow"
                    : isDictProcessingVoice
                    ? "bg-slate-100 text-slate-400 border-slate-200"
                    : "bg-white text-slate-700 hover:text-black hover:bg-slate-100 border-slate-300 shadow-sm"
                }`}
              >
                {isDictRecording ? <Square className="w-4 h-4" /> : isDictProcessingVoice ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Mic className="w-4 h-4" />}
              </button>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-slate-500 hover:text-black font-medium underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Search Result View (when user enters search query) */}
            {searchQuery ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🔍</span>
                    <h3 className="text-base font-bold text-slate-900">
                      Search Results for &ldquo;{searchQuery}&rdquo;
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {filteredVocab.length} words found
                    </span>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs font-bold text-slate-600 hover:text-black underline"
                    >
                      Clear Search
                    </button>
                  </div>
                </div>

                {filteredVocab.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl max-w-xl mx-auto p-8 shadow-sm">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-900">No words match &ldquo;{searchQuery}&rdquo;</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Try searching by English meaning, Tamil spelling, or native phonetics.
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-4 bg-black text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-slate-800"
                    >
                      Reset Search
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVocab.map((item) => renderVocabCard(item, false))}
                  </div>
                )}
              </div>
            ) : selectedCategory === "all" ? (
              /* =========================================================================
                 VIEW 2A: CATEGORY CONTAINERS (TILES / FOLDERS / DECKS OVERVIEW)
                 ========================================================================= */
              <div className="space-y-6">
                {/* Intro Title & Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Browse Category Flashcard Decks
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select any category container below to enter its Tinder-style swiping deck.
                    </p>
                  </div>
                  <span className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full bg-black text-white shadow-2xs">
                    {displayVocab.length} Total Verified Concepts
                  </span>
                </div>

                {/* Category Containers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 w-full">
                  {CATEGORY_ORDER.map((catName) => {
                    const catItems = allCategoryDecks[catName] || [];
                    if (catItems.length === 0) return null;
                    const meta = CATEGORY_META[catName] || {
                      icon: CATEGORY_ICONS[catName] || "📁",
                      desc: "Verified heritage vocabulary group",
                    };
                    const previewImages = catItems.filter((i) => i.image_url).slice(0, 4);
                    const audioCount = catItems.reduce(
                      (acc, i) =>
                        acc +
                        (i.audio_assets?.length || 0) +
                        (i.badaga_audio_assets?.length || 0) +
                        (i.marwari_audio_assets?.length || 0),
                      0
                    );

                    return (
                      <div
                        key={catName}
                        onClick={() => selectCategoryDeck(catName)}
                        className="group bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-3 sm:space-y-4"
                      >
                        <div>
                          {/* Top Row: Icon & Counts */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-xs">
                              {meta.icon}
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-900 text-white shadow-2xs">
                                {catItems.length} Cards
                              </span>
                              {audioCount > 0 && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  🎙️ {audioCount}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Category Title & Description */}
                          <h4 className="text-base font-bold text-slate-900 group-hover:text-black tracking-tight">
                            {catName}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {meta.desc}
                          </p>

                          {/* Preview Concept Images */}
                          {previewImages.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Concepts Preview:
                              </span>
                              <div className="flex items-center -space-x-2 overflow-hidden">
                                {previewImages.map((pItem, pIdx) => (
                                  <img
                                    key={pIdx}
                                    src={pItem.image_url}
                                    alt={pItem.english_meaning}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-2xs"
                                    loading="lazy"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Footer CTA */}
                        <div className="pt-2">
                          <div className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 group-hover:bg-black group-hover:text-white text-slate-700 text-xs font-bold transition-all duration-200 border border-slate-200/80 group-hover:border-black shadow-2xs">
                            <span>Open Swiper Deck</span>
                            <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* =========================================================================
                 VIEW 2B: TINDER-STYLE 1-BY-1 CARD SWIPING DECK FOR SELECTED CATEGORY
                 ========================================================================= */
              <div className="space-y-4 sm:space-y-5 max-w-xl mx-auto w-full px-0 sm:px-2">
                {/* Deck Navigation & Progress Header */}
                <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={backToCategoryContainers}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors shadow-2xs"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>All Categories</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black text-white">
                        {selectedCategory}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {Math.min(swiperIndex + 1, currentDeck.length)} / {currentDeck.length}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className="bg-black h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(((swiperIndex + 1) / Math.max(1, currentDeck.length)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Tinder Swiping Card Area */}
                {swiperIndex >= currentDeck.length ? (
                  /* Deck Completed State */
                  <div className="bg-white border-2 border-slate-900 rounded-2xl p-8 text-center shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center text-3xl mx-auto shadow-md">
                      🎉
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Deck Completed!</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                        You&apos;ve reviewed all <strong>{currentDeck.length}</strong> concepts in{" "}
                        <strong className="text-slate-900">{selectedCategory}</strong>.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleResetDeck}
                        className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-slate-800 shadow-sm transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Review Again from Card 1</span>
                      </button>
                      <button
                        type="button"
                        onClick={backToCategoryContainers}
                        className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 border border-slate-200 transition-all"
                      >
                        <Layers className="w-4 h-4" />
                        <span>Choose Another Category</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Active Vocabulary Card with Unmistakable Directional Slide Transition */
                  <div className="space-y-4">
                    {/* Visual Card Counter Header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-900 text-white shadow-xs">
                          Card {Math.min(swiperIndex + 1, currentDeck.length)} of {currentDeck.length}
                        </span>
                        <span className="text-xs text-slate-600 font-bold hidden sm:inline">
                          {selectedCategory}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-bold">
                        <span>Swipe or use arrows below</span>
                      </div>
                    </div>

                    <div className="relative w-full select-none overflow-hidden rounded-2xl">
                      {currentDeck[swiperIndex] && (
                        <div
                          key={`card-slide-${currentDeck[swiperIndex].id}-${swiperIndex}`}
                          className={`relative cursor-grab active:cursor-grabbing ${
                            slideAnim === "exit-left"
                              ? "card-slide-out-left"
                              : slideAnim === "exit-right"
                              ? "card-slide-out-right"
                              : slideAnim === "enter-right"
                              ? "card-slide-in-right"
                              : slideAnim === "enter-left"
                              ? "card-slide-in-left"
                              : ""
                          }`}
                          style={{
                            transform: !slideAnim && isDragging
                              ? `translate(${dragOffset.x}px, ${dragOffset.y * 0.2}px)`
                              : undefined,
                            transition: isDragging ? "none" : undefined,
                          }}
                          onTouchStart={onTouchStart}
                          onTouchMove={onTouchMove}
                          onTouchEnd={onTouchEnd}
                          onMouseDown={onMouseDown}
                          onMouseMove={onMouseMove}
                          onMouseUp={onMouseUp}
                          onMouseLeave={onMouseLeave}
                        >
                          {/* Swipe Hint Badges */}
                          {dragOffset.x > 35 && (
                            <div className="absolute top-4 left-4 z-30 px-3.5 py-1 rounded-lg border-2 border-emerald-500 bg-emerald-50/95 text-emerald-700 font-black text-sm uppercase tracking-widest shadow-md pointer-events-none">
                              {swiperIndex > 0 ? "← PREV" : "NEXT →"}
                            </div>
                          )}
                          {dragOffset.x < -35 && (
                            <div className="absolute top-4 right-4 z-30 px-3.5 py-1 rounded-lg border-2 border-blue-500 bg-blue-50/95 text-blue-700 font-black text-sm uppercase tracking-widest shadow-md pointer-events-none">
                              NEXT →
                            </div>
                          )}

                          {renderVocabCard(currentDeck[swiperIndex], true)}
                        </div>
                      )}
                    </div>

                    {/* Tinder Swiper Action Buttons Bar */}
                    <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col items-center space-y-2">
                      <div className="flex items-center justify-center space-x-3 sm:space-x-4">
                        {/* Previous Button */}
                        <button
                          type="button"
                          onClick={handlePrevCard}
                          disabled={swiperIndex <= 0 || isAnimatingCard}
                          title="Previous Card (Left Arrow)"
                          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center transition-all shadow-xs active:scale-95 ${
                            swiperIndex <= 0 || isAnimatingCard
                              ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-black hover:scale-105"
                          }`}
                        >
                          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>

                        {/* Pronounce Card Audio Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const current = currentDeck[swiperIndex];
                            if (current) {
                              if (current.badaga_audio_assets && current.badaga_audio_assets.length > 0) {
                                playAudio(current.badaga_audio_assets[0].audio_url);
                              } else if (current.audio_assets && current.audio_assets.length > 0) {
                                playAudio(current.audio_assets[0].audio_url);
                              } else if (current.tamil_meaning) {
                                speakText(current.tamil_meaning, "ta");
                              }
                            }
                          }}
                          title="Play Native Pronunciation (Spacebar)"
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md hover:bg-emerald-700 hover:scale-105 transition-all active:scale-95"
                        >
                          <Volume2 className="w-6 h-6 sm:w-7 sm:h-7" />
                        </button>

                        {/* Restart Deck Button */}
                        <button
                          type="button"
                          onClick={handleResetDeck}
                          title="Restart Deck"
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-slate-500 border border-slate-200 flex items-center justify-center shadow-xs hover:bg-slate-100 hover:text-slate-900 hover:scale-105 transition-all active:scale-95"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        {/* Next Card Button */}
                        <button
                          type="button"
                          onClick={handleNextCard}
                          disabled={swiperIndex >= currentDeck.length || isAnimatingCard}
                          title="Next Card (Right Arrow)"
                          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center transition-all shadow-md active:scale-95 ${
                            swiperIndex >= currentDeck.length || isAnimatingCard
                              ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                              : "bg-black text-white border-black hover:bg-slate-800 hover:scale-105"
                          }`}
                        >
                          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                      </div>

                      {/* Slow Motion Speed Toggle & Interaction Hints */}
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsSlowAudio((prev) => !prev)}
                          title={isSlowAudio ? "Slow Motion ON (0.65x). Tap for Normal Speed (1.0x)" : "Tap to activate Slow Motion (0.65x) pronunciation for extra clarity"}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all shadow-2xs active:scale-95 ${
                            isSlowAudio
                              ? "bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-300 shadow-xs"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <span>{isSlowAudio ? "🐢 Slow Motion (0.65x) Active" : "🐰 Speed: Normal (1.0x)"}</span>
                        </button>

                        <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium text-center">
                          💡 Swipe card left/right or use <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-slate-700">←</kbd> / <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-slate-700">→</kbd> keyboard arrows
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VIEW 3: ASSESSMENT CENTER (SYLLABLE ASSEMBLY GAME & TEACHER PORTAL)
            ===================================================================== */}
        {activeTab === "assessment" && (
          <div className="flex-1 w-full h-full overflow-y-auto bg-slate-50 flex flex-col">
            <AssessmentCenter
              vocabulary={vocabulary}
              customPackages={customPackages}
              playAudio={playAudio}
              playTtsAudio={playTtsAudio}
              speakSyllable={speakSyllable}
              speakText={speakText}
              isSlowAudio={isSlowAudio}
              setIsSlowAudio={setIsSlowAudio}
            />
          </div>
        )}

        {/* =====================================================================
            VIEW 4: PACKAGE BUILDER TAB (BUILD YOUR OWN MOTHER TONGUE PACKAGE)
            ===================================================================== */}
        {activeTab === "builder" && (
          <div className="flex-1 w-full h-full overflow-y-auto bg-slate-50 flex flex-col">
            {/* Header bar */}
            <header className="min-h-14 sm:h-16 border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-10 w-full shadow-2xs">
              <div className="flex items-center min-w-0 space-x-2 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-black transition-colors shrink-0"
                  title={isSidebarOpen ? "Hide left panel" : "Show left panel"}
                >
                  {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                </button>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-1.5 truncate">
                    <span>🎙️ Mother Tongue Package Builder Studio</span>
                  </h2>
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                    Create your own indigenous package • Record letters & words • Auto-adapted TTS & STT
                  </p>
                </div>
              </div>
            </header>

            <div className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
              <PackageBuilder
                activePackageId={activePackageId}
                onActivatePackage={(pkg) => {
                  setActivePackageId(pkg.id);
                  try {
                    const saved = localStorage.getItem("kurinji_custom_language_packages");
                    if (saved) {
                      const parsed = JSON.parse(saved);
                      setCustomPackages(parsed);
                    }
                  } catch {}
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
