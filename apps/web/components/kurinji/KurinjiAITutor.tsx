"use client";

import React, { useState, useEffect } from "react";
import { Database, Mic, Keyboard, Menu } from "lucide-react";
import KurinjiLogo from "./KurinjiLogo";
import AudioRecorder from "./AudioRecorder";
import TextInput from "./TextInput";
import ResultDisplay, { RecognitionResult } from "./ResultDisplay";
import VocabularyManager from "./VocabularyManager";

interface BackendInfo {
  status: string;
  encoder?: string;
  gemini_enabled?: boolean;
  counts?: {
    vocabulary: number;
    recordings: number;
    embeddings: number;
  };
}

interface KurinjiAITutorProps {
  initialLanguage?: "Badaga" | "Marwari";
  onLanguageChange?: (lang: "Badaga" | "Marwari") => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function KurinjiAITutor({
  initialLanguage = "Badaga",
  onLanguageChange,
  onToggleSidebar,
  isSidebarOpen = true,
}: KurinjiAITutorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<"Badaga" | "Marwari">(initialLanguage);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>({
    status: "healthy",
    gemini_enabled: true,
    counts: { vocabulary: 3318, recordings: 619, embeddings: 619 },
  });

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setBackendInfo(data))
      .catch(() => {});
  }, []);

  const handleLanguageSelect = (lang: "Badaga" | "Marwari") => {
    setSelectedLanguage(lang);
    setRecognitionResult(null);
    if (onLanguageChange) onLanguageChange(lang);
  };

  // Voice recognition submission (audio file / waveform)
  const handleAnalyse = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    setRecognitionResult(null);

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");
    formData.append("language", selectedLanguage);

    try {
      const response = await fetch("/api/recognize", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Recognition server error");
      }

      const result: RecognitionResult = await response.json();
      setRecognitionResult(result);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setRecognitionResult({
        status: "unknown",
        message: errorMsg || "Failed to analyze audio clip.",
        similarity: 0.0,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Text transliteration submission
  const handleTextTranslate = async (text: string) => {
    if (!text || !text.trim()) return;
    setIsAnalyzing(true);
    setRecognitionResult(null);

    try {
      const response = await fetch("/api/translate/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Translation server error");
      }

      const result: RecognitionResult = await response.json();
      setRecognitionResult(result);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setRecognitionResult({
        status: "unknown",
        message: errorMsg || "Failed to translate word.",
        similarity: 0.0,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRecordAgain = () => {
    setRecognitionResult(null);
  };

  return (
    <div className="kurinji-app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-group">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="sidebar-toggle-btn"
              title={isSidebarOpen ? "Hide left panel" : "Show left panel"}
              style={{
                background: "none",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "6px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-main)",
                marginRight: "4px",
              }}
            >
              <Menu size={18} />
            </button>
          )}
          <KurinjiLogo size={36} />
          <div className="brand-meta">
            <div className="brand-title-row">
              <span className="brand-title">KURINJI</span>
              {backendInfo && (
                <span
                  className="ai-status-pill"
                  title={
                    backendInfo.gemini_enabled
                      ? "Multimodal Audio AI + Verified Vocabulary Grounding"
                      : "Running locally with frozen XLS-R 300M"
                  }
                >
                  <span className={`status-dot ${backendInfo.gemini_enabled ? "active" : ""}`} />
                  {backendInfo.gemini_enabled ? "AI Active" : "Offline"}
                </span>
              )}
            </div>
            <span className="brand-subtitle">Indigenous Hill Speech &amp; Translation</span>
          </div>
        </div>

        <div className="header-controls">
          {!showManager && (
            <div className="lang-selector">
              <button
                type="button"
                id="lang-badaga-btn"
                className={`lang-btn ${selectedLanguage === "Badaga" ? "active" : ""}`}
                onClick={() => handleLanguageSelect("Badaga")}
              >
                Badaga
              </button>
              <button
                type="button"
                id="lang-marwari-btn"
                className={`lang-btn ${selectedLanguage === "Marwari" ? "active" : ""}`}
                onClick={() => handleLanguageSelect("Marwari")}
              >
                Marwari
              </button>
            </div>
          )}

          <button
            type="button"
            id="nav-wordbank-btn"
            className="nav-link-btn wordbank-toggle-btn"
            onClick={() => setShowManager(!showManager)}
            title="Open Vocabulary Management"
          >
            <Database size={16} />
            <span>{showManager ? "Translator View" : "Wordbank"}</span>
          </button>
        </div>
      </header>

      {/* Main Translation Workspace */}
      <main className="main-content">
        {showManager ? (
          <VocabularyManager
            initialLanguage={selectedLanguage}
            onClose={() => setShowManager(false)}
          />
        ) : (
          <div className="translator-split-layout">
            {/* Left Side: Translation Input Panel */}
            <div className="translator-panel translator-input-panel">
              {/* Segmented Mode Switcher */}
              <div className="input-mode-tabs" role="tablist">
                <button
                  type="button"
                  id="tab-text-btn"
                  role="tab"
                  aria-selected={inputMode === "text"}
                  className={`mode-tab-btn ${inputMode === "text" ? "active" : ""}`}
                  onClick={() => {
                    setInputMode("text");
                    setRecognitionResult(null);
                  }}
                >
                  <Keyboard size={15} />
                  <span>Type / Speak</span>
                </button>

                <button
                  type="button"
                  id="tab-voice-btn"
                  role="tab"
                  aria-selected={inputMode === "voice"}
                  className={`mode-tab-btn ${inputMode === "voice" ? "active" : ""}`}
                  onClick={() => {
                    setInputMode("voice");
                    setRecognitionResult(null);
                  }}
                >
                  <Mic size={15} />
                  <span>Audio File / Waveform</span>
                </button>
              </div>

              {/* Input Surface */}
              {inputMode === "text" ? (
                <TextInput
                  onTranslate={handleTextTranslate}
                  isTranslating={isAnalyzing}
                  selectedLanguage={selectedLanguage}
                  onSwitchToVoice={() => {
                    setInputMode("voice");
                    setRecognitionResult(null);
                  }}
                />
              ) : (
                <div className="voice-recorder-wrapper">
                  <AudioRecorder
                    onAnalyse={handleAnalyse}
                    isAnalyzing={isAnalyzing}
                    selectedLanguage={selectedLanguage}
                  />
                  <div style={{ textAlign: "center", marginTop: "10px" }}>
                    <button
                      type="button"
                      className="switch-mode-link"
                      onClick={() => {
                        setInputMode("text");
                        setRecognitionResult(null);
                      }}
                    >
                      Prefer typing or live dictation? Switch to Type / Speak &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Translation Output Panel */}
            <div className="translator-panel translator-output-panel">
              <ResultDisplay
                result={recognitionResult}
                onRecordAgain={handleRecordAgain}
                actionLabel={inputMode === "text" ? "Translate Another Word" : "Record Another Word"}
                selectedLanguage={selectedLanguage}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
