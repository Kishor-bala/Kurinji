"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Mic,
  Square,
  Volume2,
  VolumeX,
  ChevronDown,
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
} from "lucide-react";
import KurinjiAITutor from "@/components/kurinji/KurinjiAITutor";

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
  // Navigation tabs in left sidebar: tutor, learn
  const [activeTab, setActiveTab] = useState<"tutor" | "learn">("tutor");
  const [selectedLang, setSelectedLang] = useState<"all" | "badaga" | "marwari">("all");

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
      provider: "Google Gemini",
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
    audioInstanceRef.current = audio;
    audio.onended = () => setActiveAudioKey(null);
    audio.onerror = () => setActiveAudioKey(null);
    audio.play().catch((err) => {
      console.warn("Audio playback error:", err);
      setActiveAudioKey(null);
    });
  };

  // Text-to-speech helper (pronounces English or Tamil using backend synthesis or Web Speech)
  const speakText = (text: string, lang = "en", key?: string) => {
    if (!text) return;
    const trackKey = key || `tts_${lang}_${text}`;
    setActiveAudioKey(trackKey);

    const directTtsUrl = `${API_BASE}/vocabulary/tts/synthesize?text=${encodeURIComponent(text)}&lang=${lang}`;
    const audio = new Audio(directTtsUrl);
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
    }
    audioInstanceRef.current = audio;

    audio.onended = () => setActiveAudioKey(null);
    audio.onerror = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === "ta" ? "ta-IN" : "en-US";
        utterance.rate = 0.95;
        utterance.onend = () => setActiveAudioKey(null);
        utterance.onerror = () => setActiveAudioKey(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setActiveAudioKey(null);
      }
    };

    audio.play().catch(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === "ta" ? "ta-IN" : "en-US";
        utterance.onend = () => setActiveAudioKey(null);
        utterance.onerror = () => setActiveAudioKey(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setActiveAudioKey(null);
      }
    });
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
            provider: data.provider_used === "gemini" ? "Google Gemini" : data.provider_used === "groq" ? "Groq Llama 3.3" : data.provider_used,
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
            provider: "Voice Assistant",
          },
        ]);
      }
    } catch (err) {
      console.error("Error sending voice query:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error processing voice audio. Please check that the server is active.",
          provider: "Offline",
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
            provider: data.provider_used === "gemini" ? "Google Gemini" : data.provider_used === "groq" ? "Groq Llama 3.3" : data.provider_used,
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
            provider: "System Error",
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Could not reach the tutor service. Please check your backend connection.",
          provider: "Offline",
        },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Deduplicate vocabulary when viewing "All Languages" so overlapping concepts are merged into one clean card
  const displayVocab = useMemo(() => {
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

    return Object.values(unifiedMap);
  }, [vocabulary, selectedLang]);

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

  // Helper to render individual vocabulary card
  const renderVocabCard = (item: VocabularyItem) => (
    <div
      key={item.id || `${item.language_code}_${item.external_word_id}`}
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-3.5"
    >
      <div>
        {/* Top Photographic Flashcard Image (100% of all words) */}
        {item.image_url ? (
          <div className="relative w-full h-44 bg-slate-100 rounded-lg overflow-hidden border border-slate-200/90 mb-3.5 group shadow-inner">
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
          <div className="relative w-full h-44 bg-slate-100 rounded-lg overflow-hidden border border-slate-200/90 mb-3.5 flex flex-col items-center justify-center text-slate-400">
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

        {/* Mother Tongue -> Tamil Script Literacy Breakdown (Tamil script only, strictly no English phonetic splitting) */}
        {item.tamil_syllables && (
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700 tracking-tight flex items-center space-x-1">
                <span>📖 Tamil Script Breakdown</span>
              </span>
              <span className="text-[9px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                Tamil Syllables
              </span>
            </div>

            {/* Syllable Letters Breakdown with + (Tamil script only) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {item.tamil_syllables.split(" + ").map((syl, sIdx, arr) => (
                <React.Fragment key={sIdx}>
                  <div className="flex items-center justify-center bg-white border border-slate-300 rounded px-2.5 py-1 shadow-xs">
                    <span className="text-base font-bold text-slate-900 leading-none">
                      {syl}
                    </span>
                  </div>
                  {sIdx < arr.length - 1 && (
                    <span className="text-xs font-black text-slate-400 select-none">+</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Syllable Word Formula (Tamil script only) */}
            <div className="text-[11px] font-medium text-slate-700 bg-white/80 border border-slate-200/80 rounded px-2.5 py-1 flex items-center justify-between">
              <span>{item.tamil_syllables} = <strong className="text-slate-900 font-bold">{item.tamil_meaning}</strong></span>
            </div>
          </div>
        )}
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
      {/* =========================================================================
          LEFT PANEL / SIDEBAR (All Navigation in Left Panel, strictly 2 tabs)
          ========================================================================= */}
      <aside className="w-64 sm:w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none z-20">
        <div>
          {/* Brand Header */}
          <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
                V
              </div>
              <div>
                <h1 className="font-semibold text-slate-900 text-sm tracking-tight leading-none">
                  VaniVoice
                </h1>
                <p className="text-[11px] text-slate-500 mt-1">Heritage Language AI</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              v1.0
            </span>
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
            </div>
          </div>

          {/* STRICTLY ONLY 2 TABS IN LEFT PANEL */}
          <div className="px-4 py-4 space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 px-1">
              Navigation
            </div>

            {/* TAB 1: AI TUTOR */}
            <button
              onClick={() => setActiveTab("tutor")}
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
              onClick={() => setActiveTab("learn")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "learn"
                  ? "bg-black text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="font-semibold">Learn</span>
            </button>

          </div>
        </div>

        {/* Sidebar Footer Status */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Pure VectorDB Grounding</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Milvus Lite & Qdrant Active</p>
        </div>
      </aside>

      {/* =========================================================================
          MAIN CONTENT AREA (Right of Sidebar, Clean Light Theme)
          ========================================================================= */}
      <main className="flex-1 h-full overflow-y-auto bg-slate-50 flex flex-col">
        {/* Top Header Bar for Learn View */}
        {activeTab === "learn" && (
          <header className="h-16 border-b border-slate-200 bg-white px-6 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Learn
              </h2>
              <p className="text-xs text-slate-500">
                {`${filteredVocab.length} verified concepts loaded`}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
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
            />
          </div>
        )}

        {/* =====================================================================
            VIEW 2: LEARN TAB
            ===================================================================== */}
        {activeTab === "learn" && (
          <div className="flex-1 p-6 sm:p-8 space-y-6">
            {/* Search Input Bar */}
            <div className="max-w-3xl flex items-center space-x-3">
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
                      ? "⚡ Matching voice with noise cancellation & vector similarity..."
                      : "Search by Badaga, Tamil, English, or Word ID (e.g., 'mande', 'தலை', 'W0001')..."
                  }
                  className={`w-full bg-white border rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black shadow-sm ${
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

            {/* Category Filter Pills Bar */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs select-none">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all shadow-xs flex items-center space-x-1.5 ${
                  selectedCategory === "all"
                    ? "bg-black text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Categories</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {displayVocab.length}
                </span>
              </button>

              {CATEGORY_ORDER.map((catName) => {
                const count = categoryCounts[catName] || 0;
                if (count === 0) return null;
                const isSelected = selectedCategory === catName;
                const icon = CATEGORY_META[catName]?.icon || CATEGORY_ICONS[catName] || "📁";
                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? "all" : catName)}
                    className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all shadow-xs flex items-center space-x-1.5 ${
                      isSelected
                        ? "bg-black text-white font-semibold"
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{catName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dedicated Category Banner when a category is selected */}
            {selectedCategory !== "all" && !searchQuery && (
              <div className="bg-white border-2 border-slate-900 rounded-xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-black text-white flex items-center justify-center text-xl shadow-xs">
                    {CATEGORY_META[selectedCategory]?.icon || CATEGORY_ICONS[selectedCategory] || "📁"}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">{selectedCategory}</h3>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                        {filteredVocab.length} words
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      {CATEGORY_META[selectedCategory]?.desc || "Verified pedagogical vocabulary category"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                >
                  ← Show All Categories
                </button>
              </div>
            )}

            {/* Word Grid / Category Sections */}
            {isLoadingVocab ? (
              <div className="flex items-center space-x-2 text-sm text-slate-500 py-12">
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Loading verified vocabulary records...</span>
              </div>
            ) : filteredVocab.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl max-w-xl mx-auto p-8 shadow-sm">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900">No words match &ldquo;{searchQuery}&rdquo;</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Try searching by English meaning, Tamil spelling, or native phonetics.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="mt-4 bg-black text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-slate-800"
                >
                  Reset Filters
                </button>
              </div>
            ) : selectedCategory === "all" && !searchQuery ? (
              /* Grouped by Category with Sticky Category Headers */
              <div className="space-y-12">
                {Object.entries(groupedVocab).map(([catName, catItems]) => (
                  <section
                    key={catName}
                    id={`cat-${catName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    className="space-y-4"
                  >
                    {/* Sticky Category Section Header */}
                    <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md py-3.5 border-b-2 border-slate-900 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-base shadow-xs">
                          {CATEGORY_META[catName]?.icon || CATEGORY_ICONS[catName] || "📁"}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                              {catName}
                            </h3>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                              {catItems.length} words
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                            {CATEGORY_META[catName]?.desc || "Verified heritage vocabulary group"}
                          </p>
                        </div>
                      </div>

                      {/* Language distribution badges & direct filter button */}
                      <div className="flex items-center space-x-2 text-xs">
                        {(() => {
                          const badagaCount = catItems.filter((i) => i.language_code === "badaga").length;
                          const marwariCount = catItems.filter((i) => i.language_code === "marwari").length;
                          return (
                            <>
                              {badagaCount > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium">
                                  Badaga: <strong>{badagaCount}</strong>
                                </span>
                              )}
                              {marwariCount > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium">
                                  Marwari: <strong>{marwariCount}</strong>
                                </span>
                              )}
                            </>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => setSelectedCategory(catName)}
                          className="text-[11px] font-bold text-black hover:underline px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 transition-colors"
                        >
                          Focus Category →
                        </button>
                      </div>
                    </div>

                    {/* Word cards grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                      {catItems.map((item) => renderVocabCard(item))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              /* Filtered / Search Results grid */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {selectedCategory !== "all" ? CATEGORY_META[selectedCategory]?.icon || "📁" : "🔍"}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedCategory !== "all" ? selectedCategory : `Search Results for "${searchQuery}"`}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {filteredVocab.length} words found
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVocab.map((item) => renderVocabCard(item))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
