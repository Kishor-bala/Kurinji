"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Loader2,
  Menu,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  Globe,
} from "lucide-react";
import KurinjiLogo from "./KurinjiLogo";

interface VerifiedVocabItem {
  id?: string;
  external_word_id?: string;
  language_code?: string;
  language_name?: string;
  source_word?: string;
  tamil_meaning?: string;
  english_meaning?: string;
  audio_url?: string;
  audio_assets?: Array<{ audio_url: string }>;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isVoice?: boolean;
  verifiedVocab?: VerifiedVocabItem[];
  audioUrl?: string | null;
  ttsUrl?: string | null;
  timestamp: string;
}

interface KurinjiAITutorProps {
  initialLanguage?: "Badaga" | "Marwari";
  onLanguageChange?: (lang: "Badaga" | "Marwari") => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const QUICK_PROMPTS: Record<string, string[]> = {
  Badaga: [
    "What is 'head' in Badaga?",
    "How to say 'Eye' (கண்)?",
    "Pronounce 'mandhe' and 'kannu'",
    "Common body parts in Badaga",
    "Family relations in Badaga",
  ],
  Marwari: [
    "What is 'eye' in Marwari?",
    "How to say 'mother' in Marwari?",
    "Common Marwari daily greetings",
    "Pronounce 'haath' and 'matho'",
  ],
};

export default function KurinjiAITutor({
  initialLanguage = "Badaga",
  onLanguageChange,
  onToggleSidebar,
  isSidebarOpen = true,
}: KurinjiAITutorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<"Badaga" | "Marwari">(initialLanguage);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome_msg",
      role: "assistant",
      content: `Namaskara! I am Kurinji AI, your personal teaching assistant for ${initialLanguage}. Ask me any vocabulary word, meaning in Tamil or English, or practice pronunciation. Tap the microphone below to talk to me!`,
      timestamp: "Just now",
    },
  ]);
  const [textInput, setTextInput] = useState("");
  const [isCapturingVoice, setIsCapturingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState("Analyzing speech & formulating response...");
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isLoadingResponse]);

  // Sync language selection
  const handleLanguageChange = (lang: "Badaga" | "Marwari") => {
    setSelectedLanguage(lang);
    if (onLanguageChange) onLanguageChange(lang);
    setChatMessages((prev) => [
      ...prev,
      {
        id: `lang_change_${Date.now()}`,
        role: "assistant",
        content: `Switched focus to ${lang}. You can now speak or ask questions about ${lang} vocabulary, definitions, and phonetics!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Play audio url (native recording or synthesize endpoint)
  const playAudioClip = (url: string, key?: string) => {
    if (!url) return;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    const trackKey = key || url;
    setActiveAudioKey(trackKey);
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    audio.onended = () => setActiveAudioKey(null);
    audio.onerror = () => setActiveAudioKey(null);
    audio.play().catch(() => setActiveAudioKey(null));
  };

  // -------------------------------------------------------------
  // VOICE CAPTURING WORKFLOW
  // -------------------------------------------------------------
  const startVoiceCapture = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Release hardware mic stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 100) {
          await processVoiceRecording(audioBlob);
        } else {
          setIsLoadingResponse(false);
        }
      };

      mediaRecorder.start(100);
      setIsCapturingVoice(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone permission denied or unavailable. Please check your browser mic settings.");
    }
  };

  const stopVoiceCapture = () => {
    if (!isCapturingVoice) return;
    setIsCapturingVoice(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // CRITICAL: Immediately show loading indication when user stops voice capturing
    setIsLoadingResponse(true);
    setLoadingStatusText("Processing voice audio • AI Tutor analyzing speech & formulating response...");

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // Submit voice recording to API and display response
  const processVoiceRecording = async (blob: Blob) => {
    setIsLoadingResponse(true);
    setLoadingStatusText("Transcribing voice & matching against verified canonical records...");

    const formData = new FormData();
    formData.append("file", blob, "query.webm");
    formData.append("language_code", selectedLanguage.toLowerCase());

    try {
      const res = await fetch("/api/v1/tutor/voice-query", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Tutor voice query failed");
      }

      const data = await res.json();
      const userSpoken = data.transcription || "Voice query recorded";
      const tutorReply = data.message || "I heard your voice. Let's learn more heritage words together!";
      const verifiedVocab = data.verified_vocabulary || [];
      const audioUrl = data.audio_url || null;
      const ttsUrl = data.response_tts_url || null;

      // Append user spoken message
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: userSpoken,
        isVoice: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      // Append AI Tutor response
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: tutorReply,
        verifiedVocab,
        audioUrl,
        ttsUrl,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Automatically play the response audio or native word clip if available
      if (audioUrl) {
        playAudioClip(audioUrl, `tutor_audio_${audioUrl}`);
      } else if (ttsUrl) {
        playAudioClip(ttsUrl, `tutor_tts_${ttsUrl}`);
      }
    } catch (err) {
      console.error("Error submitting voice query:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: "I received your voice recording, but there was a temporary network timeout. Please speak again or ask in text!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // -------------------------------------------------------------
  // TEXT CHAT WORKFLOW
  // -------------------------------------------------------------
  const handleSendTextMessage = async (textToSend?: string) => {
    const query = (textToSend || textInput).trim();
    if (!query || isLoadingResponse) return;

    setTextInput("");
    setIsLoadingResponse(true);
    setLoadingStatusText("AI Tutor thinking & retrieving canonical definitions...");

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/v1/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          language_code: selectedLanguage.toLowerCase(),
        }),
      });

      if (!res.ok) {
        throw new Error("Chat request failed");
      }

      const data = await res.json();
      const reply = data.message || `Here is what I found for "${query}" in our verified database.`;
      const verifiedVocab = data.verified_vocabulary || [];
      const audioUrl = data.audio_url || null;

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: reply,
        verifiedVocab,
        audioUrl,
        ttsUrl: `/api/v1/vocabulary/tts/synthesize?text=${encodeURIComponent(reply)}&lang=en`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);

      if (audioUrl) {
        playAudioClip(audioUrl, `tutor_audio_${audioUrl}`);
      }
    } catch (err) {
      console.error("Text chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: "Sorry, I had trouble formulating a response right now. Please try asking again!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 min-h-0">
      {/* Top Header Bar */}
      <header className="min-h-14 sm:h-16 border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center min-w-0 space-x-2 sm:space-x-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-black transition-colors shrink-0"
              title={isSidebarOpen ? "Hide left panel" : "Show left panel"}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-2xs">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5 truncate">
                <span>KURINJI AI TUTOR</span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Voice Active
                </span>
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                Indigenous Language AI Assistant &bull; Whisper Speech &bull; Canonical Verified Records
              </p>
            </div>
          </div>
        </div>

        {/* Language Selector Controls */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <div className="inline-flex p-0.5 sm:p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => handleLanguageChange("Badaga")}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedLanguage === "Badaga"
                  ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Badaga
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("Marwari")}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedLanguage === "Marwari"
                  ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Marwari
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Dialogue Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 max-w-4xl mx-auto w-full">
        {chatMessages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-2.5 sm:space-x-3 ${
                isUser ? "flex-row-reverse space-x-reverse" : "flex-row"
              } animate-in fade-in duration-200`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs text-xs font-bold ${
                  isUser
                    ? "bg-slate-900 text-white"
                    : "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white"
                }`}
              >
                {isUser ? (msg.isVoice ? <Mic className="w-4 h-4" /> : "You") : <Sparkles className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-2.5 ${
                  isUser
                    ? "bg-slate-900 text-white rounded-tr-xs"
                    : "bg-white border border-slate-200 text-slate-900 rounded-tl-xs"
                }`}
              >
                {/* Voice Input Badge */}
                {msg.isVoice && (
                  <div className="flex items-center space-x-1 text-[10px] font-bold text-amber-300 uppercase tracking-wide">
                    <Mic className="w-3 h-3" />
                    <span>Voice Captured Query</span>
                  </div>
                )}

                {/* Message Text */}
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {/* Verified Canonical Vocabulary Cards Attached to Answer */}
                {msg.verifiedVocab && msg.verifiedVocab.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Canonical Verified Records:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.verifiedVocab.map((v, vIdx) => {
                        const vocabAudio = v.audio_assets?.[0]?.audio_url || v.audio_url;
                        return (
                          <div
                            key={vIdx}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 shadow-2xs hover:bg-slate-100 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {v.source_word || v.tamil_meaning}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {v.tamil_meaning} &bull; {v.english_meaning}
                              </p>
                            </div>

                            {vocabAudio && (
                              <button
                                type="button"
                                onClick={() => playAudioClip(vocabAudio, `v_${vIdx}_${vocabAudio}`)}
                                title="Listen to pronunciation"
                                className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-all shrink-0 active:scale-90"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Audio Listen Button for the Response */}
                {!isUser && (msg.audioUrl || msg.ttsUrl) && (
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() =>
                        playAudioClip(
                          (msg.audioUrl || msg.ttsUrl)!,
                          `reply_audio_${msg.id}`
                        )
                      }
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-bold transition-all active:scale-95 border border-indigo-200 shadow-2xs"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{activeAudioKey === `reply_audio_${msg.id}` ? "Playing..." : "Hear Pronunciation"}</span>
                    </button>

                    <span className="text-[9px] text-slate-400 font-medium">{msg.timestamp}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* LOADING INDICATION: Appears immediately when user stops speaking or submits query */}
        {isLoadingResponse && (
          <div className="flex items-start space-x-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 shadow-sm space-y-2 max-w-sm sm:max-w-md">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900">AI Tutor is Thinking...</span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">{loadingStatusText}</p>

              {/* Animated Waveform Pulse */}
              <div className="flex items-center space-x-1 pt-1">
                <div className="w-1.5 h-4 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-6 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-5 bg-indigo-600 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-3 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                <span className="text-[10px] text-indigo-700 font-semibold pl-2">Matching phonemes...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Voice Capturing & Input Dock */}
      <div className="border-t border-slate-200 bg-white p-3 sm:p-4 shrink-0 shadow-lg sticky bottom-0 z-10 space-y-3">
        {/* Quick Suggestion Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center space-x-1">
            <MessageSquare className="w-3 h-3 text-indigo-500" />
            <span>Try:</span>
          </span>
          {(QUICK_PROMPTS[selectedLanguage] || QUICK_PROMPTS.Badaga).map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendTextMessage(prompt)}
              disabled={isCapturingVoice || isLoadingResponse}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 text-[11px] font-medium transition-all active:scale-95 shrink-0 whitespace-nowrap shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Voice Capturing Surface & Recording Banner */}
        {isCapturingVoice ? (
          <div className="p-3.5 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-2 border-rose-400 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm animate-pulse">
            <div className="flex items-center space-x-3">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-ping"></span>
              <div>
                <p className="text-xs sm:text-sm font-black text-rose-950 flex items-center space-x-1.5">
                  <span>🎙️ Voice Capturing Active... Speak Now!</span>
                </p>
                <p className="text-[10px] sm:text-[11px] text-rose-800 font-medium">
                  Listening in {selectedLanguage} &bull; Speak clearly into your mic
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="font-mono text-sm font-black text-rose-950 bg-white/90 px-2.5 py-1 rounded-lg border border-rose-200">
                0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </span>

              {/* Stop & Analyze Button */}
              <button
                type="button"
                onClick={stopVoiceCapture}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md flex items-center space-x-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop &amp; Analyze</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Voice & Text Input Form */
          <div className="flex items-center space-x-2">
            {/* Primary Voice Capture Mic Button */}
            <button
              type="button"
              onClick={startVoiceCapture}
              disabled={isLoadingResponse}
              title="Click to start capturing voice"
              className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-md hover:scale-[1.02] active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Tap to Speak</span>
            </button>

            {/* Text Input Field */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTextMessage();
              }}
              className="flex-1 flex items-center space-x-2"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`Ask ${selectedLanguage} AI Tutor anything (e.g. "How to say water?", "What is mandhe?")...`}
                disabled={isLoadingResponse}
                className="flex-1 px-3 sm:px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-inner"
              />

              <button
                type="submit"
                disabled={!textInput.trim() || isLoadingResponse}
                className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-all shrink-0 shadow-xs cursor-pointer active:scale-95"
                title="Send question"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
