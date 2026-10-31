"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, CornerDownLeft, Mic, MicOff } from "lucide-react";

interface Suggestion {
  text: string;
  label: string;
}

const SUGGESTIONS: Record<string, Suggestion[]> = {
  Badaga: [
    { text: "thale", label: "head" },
    { text: "kannu", label: "eye" },
    { text: "mooku", label: "nose" },
    { text: "pal", label: "teeth" },
    { text: "mandhe", label: "head" },
    { text: "kaalu", label: "leg" },
    { text: "amma", label: "mother" },
  ],
  Marwari: [
    { text: "aankh", label: "eye" },
    { text: "naak", label: "nose" },
    { text: "daant", label: "teeth" },
    { text: "matho", label: "head" },
    { text: "haath", label: "hand" },
    { text: "pag", label: "leg" },
    { text: "maa", label: "mother" },
  ],
};

interface TextInputProps {
  onTranslate: (text: string) => void;
  isTranslating: boolean;
  selectedLanguage: string;
  onSwitchToVoice?: () => void;
}

export default function TextInput({
  onTranslate,
  isTranslating,
  selectedLanguage,
  onSwitchToVoice,
}: TextInputProps) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  const currentSuggestions = SUGGESTIONS[selectedLanguage] || SUGGESTIONS.Badaga;

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
    }
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const startVoiceDictation = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      if (onSwitchToVoice) onSwitchToVoice();
      return;
    }

    if (isListening) {
      // User explicitly stopped dictation
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      shouldListenRef.current = true;
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      // Continuous listening without auto-closing on silence
      recognition.continuous = true;
      recognition.interimResults = true;
      // Indian English acoustic profile is best suited for transcribing Indian phonetic sounds
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + " ";
        }
        const cleanWord = transcript.trim().toLowerCase().replace(/[.,!?;:]/g, "");
        setInputText(cleanWord);

        // Continuously update without closing the mic
        const latestResult = event.results[event.results.length - 1];
        if (latestResult && latestResult.isFinal && cleanWord) {
          onTranslate(cleanWord);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          // Do not close on natural pause/silence; keep mic active
          return;
        }
        if (event.error === "not-allowed") {
          shouldListenRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Automatically restart speech recognition if user hasn't explicitly clicked to stop
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch {
            // Already restarting or active
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      shouldListenRef.current = false;
      setIsListening(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isTranslating) return;
    onTranslate(inputText.trim());
  };

  const handleSuggestionClick = (word: string) => {
    setInputText(word);
    onTranslate(word);
  };

  const handleClear = () => {
    setInputText("");
  };

  return (
    <div className="card text-input-card">
      <div className="text-input-header">
        <div>
          <h2 className="text-input-title">Speak or Type {selectedLanguage} in English</h2>
          <p className="text-input-subtitle">
            Speak using the live mic or enter the phonetic word (e.g. <em>thale</em>, <em>kannu</em>, <em>pal</em>) to get 100% verified Tamil and English meanings.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="text-search-form">
        <div className={`text-search-wrapper ${isListening ? "listening-active" : ""}`}>
          <Search size={20} className="text-search-icon" />
          <input
            id="badaga-text-input"
            type="text"
            className="text-search-field"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? 'Listening... say word now (e.g. "thale", "kannu", "pal")'
                : `Type or speak ${selectedLanguage} word in English (e.g. "${currentSuggestions[0]?.text || "thale"}") ...`
            }
            autoFocus
            disabled={isTranslating}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Clear Button */}
          {inputText && !isTranslating && !isListening && (
            <button
              type="button"
              className="text-clear-btn"
              onClick={handleClear}
              title="Clear input"
              aria-label="Clear input"
            >
              <X size={16} />
            </button>
          )}

          {/* Voice Dictation Mic Button */}
          {speechSupported && (
            <button
              type="button"
              id="live-mic-btn"
              className={`text-mic-btn ${isListening ? "listening" : ""}`}
              onClick={startVoiceDictation}
              disabled={isTranslating}
              title={isListening ? "Stop listening" : "Click to speak word into text box"}
              aria-label="Speak into text box"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            id="submit-translate-btn"
            className="text-submit-btn"
            disabled={!inputText.trim() || isTranslating}
            title="Translate word"
          >
            {isTranslating ? (
              <span className="translating-spinner" />
            ) : (
              <>
                <span>Translate</span>
                <CornerDownLeft size={15} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Listening Status Banner */}
      {isListening && (
        <div className="listening-indicator">
          <span className="pulsing-dot" />
          <span>Listening for {selectedLanguage} pronunciation... (Say e.g. &ldquo;thale&rdquo;, &ldquo;kannu&rdquo;, &ldquo;pal&rdquo;)</span>
        </div>
      )}

      {/* Loading Animation after mic stop / while translating */}
      {isTranslating && (
        <div
          className="translating-indicator"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginTop: "12px",
            padding: "8px 14px",
            borderRadius: "10px",
            background: "var(--kurinji-50)",
            border: "1px solid var(--kurinji-100)",
          }}
        >
          <div className="wave-container" style={{ height: "22px", gap: "3px" }}>
            <span className="wave-bar wave-bar-1" style={{ width: "3px", height: "12px" }}></span>
            <span className="wave-bar wave-bar-2" style={{ width: "3px", height: "18px" }}></span>
            <span className="wave-bar wave-bar-3" style={{ width: "3px", height: "22px" }}></span>
            <span className="wave-bar wave-bar-4" style={{ width: "3px", height: "16px" }}></span>
            <span className="wave-bar wave-bar-5" style={{ width: "3px", height: "19px" }}></span>
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--kurinji-700)", fontWeight: 700 }}>
            Analyzing pronunciation &amp; matching verified vocabulary...
          </span>
        </div>
      )}

      {/* Quick Suggestion Chips */}
      <div className="suggestion-chips-container">
        <span className="suggestion-label">Quick Examples:</span>
        <div className="suggestion-chips">
          {currentSuggestions.map((item) => (
            <button
              key={item.text}
              type="button"
              className="chip-btn"
              onClick={() => handleSuggestionClick(item.text)}
              disabled={isTranslating || isListening}
              title={`Click to translate "${item.text}" (${item.label})`}
            >
              <span className="chip-word">{item.text}</span>
              <span className="chip-meaning">({item.label})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Switch to Full Audio Recorder link */}
      {onSwitchToVoice && (
        <div className="input-switch-hint">
          <span>Need full audio file upload or raw waveform recording?</span>
          <button
            type="button"
            className="switch-mode-link"
            onClick={onSwitchToVoice}
          >
            Open Audio File Recorder →
          </button>
        </div>
      )}
    </div>
  );
}
