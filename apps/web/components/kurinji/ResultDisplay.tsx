"use client";

import React from "react";
import { CheckCircle2, AlertCircle, HelpCircle, Volume2, Sparkles } from "lucide-react";

export interface RecognitionCandidate {
  word_id: string;
  language?: string;
  tamil_meaning?: string;
  english_meaning?: string;
  score?: number;
  clip_matches?: Array<{ clip_id: string; similarity: number }>;
}

export interface RecognitionResult {
  status: "recognized" | "uncertain" | "unknown" | "invalid_audio" | "excessive_silence";
  word_id?: string | null;
  language?: string | null;
  tamil_meaning?: string | null;
  english_meaning?: string | null;
  similarity?: number;
  margin?: number;
  message?: string;
  ranked_candidates?: RecognitionCandidate[];
}

interface ResultDisplayProps {
  result: RecognitionResult | null;
  onRecordAgain: () => void;
  actionLabel?: string;
  selectedLanguage?: string;
}

export default function ResultDisplay({
  result,
  onRecordAgain,
  actionLabel = "Record Another Word",
  selectedLanguage = "Badaga",
}: ResultDisplayProps) {
  // Idle state when nothing has been translated yet
  if (!result) {
    return (
      <div className="result-card idle-card" id="idle-result-card">
        <div className="idle-content">
          <div className="idle-icon-ring">
            <Sparkles size={24} className="idle-sparkle" />
          </div>
          <h3 className="idle-title">Translation Output</h3>
        </div>
      </div>
    );
  }

  const {
    status,
    word_id,
    language,
    tamil_meaning,
    english_meaning,
    similarity = 0,
    message,
    ranked_candidates,
  } = result;

  const isRecognized = status === "recognized";
  const isUncertain = status === "uncertain";
  const isUnknown = status === "unknown" || status === "invalid_audio" || status === "excessive_silence";

  // Get best reference clip ID if available for native pronunciation playback
  const bestClipId =
    ranked_candidates &&
    ranked_candidates[0] &&
    ranked_candidates[0].clip_matches &&
    ranked_candidates[0].clip_matches[0]
      ? ranked_candidates[0].clip_matches[0].clip_id
      : null;

  const playReferenceAudio = () => {
    if (!bestClipId) return;
    const audio = new Audio(`/api/audio/playback/${bestClipId}`);
    audio.play().catch((e) => console.error("Playback error:", e));
  };

  // Text-to-speech for Tamil and English words via our robust neural TTS endpoint or browser
  const speakText = (text: string, lang: "ta" | "en") => {
    if (!text) return;
    const fallback = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === "ta" ? "ta-IN" : "en-US";
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    };
    const ttsUrl = `/api/v1/vocabulary/tts/synthesize?text=${encodeURIComponent(text)}&lang=${lang}`;
    const audio = new Audio(ttsUrl);
    audio.onerror = fallback;
    audio.play().catch(fallback);
  };

  return (
    <div className="result-card" id="recognition-result-card">
      <div className="result-header">
        <div className={`status-badge ${status}`}>
          {isRecognized && <CheckCircle2 size={16} />}
          {isUncertain && <AlertCircle size={16} />}
          {isUnknown && <HelpCircle size={16} />}
          <span>
            {isRecognized && "Word Recognized"}
            {isUncertain && "Uncertain Match"}
            {isUnknown && "Unknown Word"}
          </span>
        </div>

        {word_id && <span className="word-id-tag">{word_id}</span>}
      </div>

      {isRecognized ? (
        <>
          <div className="meanings-grid">
            {/* Tamil Meaning Block */}
            <div className="meaning-block">
              <span className="meaning-label">Tamil Meaning</span>
              <div className="meaning-val-row">
                <span className="meaning-val-tamil tamil-text">{tamil_meaning}</span>
                {tamil_meaning && (
                  <button
                    type="button"
                    className="tts-speak-btn"
                    onClick={() => speakText(tamil_meaning, "ta")}
                    title="Hear Tamil voice pronunciation"
                    aria-label="Hear Tamil voice pronunciation"
                  >
                    <Volume2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* English Meaning Block */}
            <div className="meaning-block">
              <span className="meaning-label">English Meaning</span>
              <div className="meaning-val-row">
                <span className="meaning-val-english">{english_meaning}</span>
                {english_meaning && (
                  <button
                    type="button"
                    className="tts-speak-btn"
                    onClick={() => speakText(english_meaning, "en")}
                    title="Hear English voice pronunciation"
                    aria-label="Hear English voice pronunciation"
                  >
                    <Volume2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="result-footer">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {bestClipId && (
                <button
                  type="button"
                  className="nav-link-btn native-audio-btn"
                  onClick={playReferenceAudio}
                  title={`Listen to authentic native hill-speaker reference pronunciation (${bestClipId})`}
                >
                  <Volume2 size={16} />
                  Listen Native {language || selectedLanguage}
                </button>
              )}
              <span className="match-quality">
                Match quality: {similarity >= 0.85 ? "High" : "Moderate"} ({similarity.toFixed(3)})
              </span>
            </div>

            <button type="button" className="record-again-btn" onClick={onRecordAgain}>
              {actionLabel}
            </button>
          </div>
        </>
      ) : isUncertain ? (
        <>
          <div className="meanings-grid">
            <div className="meaning-block">
              <span className="meaning-label">Tamil Meaning</span>
              <div className="meaning-val-row">
                <span className="meaning-val-tamil tamil-text">{tamil_meaning}</span>
                {tamil_meaning && (
                  <button
                    type="button"
                    className="tts-speak-btn"
                    onClick={() => speakText(tamil_meaning, "ta")}
                    title="Hear Tamil voice pronunciation"
                  >
                    <Volume2 size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="meaning-block">
              <span className="meaning-label">English Meaning</span>
              <div className="meaning-val-row">
                <span className="meaning-val-english">{english_meaning}</span>
                {english_meaning && (
                  <button
                    type="button"
                    className="tts-speak-btn"
                    onClick={() => speakText(english_meaning, "en")}
                    title="Hear English voice pronunciation"
                  >
                    <Volume2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "8px" }}>
            {message}
          </p>

          <div className="result-footer">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {bestClipId && (
                <button
                  type="button"
                  className="nav-link-btn native-audio-btn"
                  onClick={playReferenceAudio}
                  title="Listen to native speaker reference pronunciation"
                >
                  <Volume2 size={16} />
                  Listen Native {language || selectedLanguage}
                </button>
              )}
              <span className="match-quality">Score: {similarity.toFixed(3)}</span>
            </div>
            <button type="button" className="record-again-btn" onClick={onRecordAgain}>
              {actionLabel}
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {message || `This word could not be confidently identified in the verified ${language || selectedLanguage} wordbank.`}
          </p>
          {ranked_candidates && ranked_candidates[0] && (
            <div style={{ background: "var(--bg-subtle)", padding: "14px 16px", borderRadius: "var(--radius-md)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                Closest Wordbank Candidate:
              </span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span className="meaning-val-tamil tamil-text" style={{ fontSize: "1.25rem" }}>
                    {ranked_candidates[0].tamil_meaning}
                  </span>
                  {ranked_candidates[0].tamil_meaning && (
                    <button
                      type="button"
                      className="tts-speak-btn"
                      onClick={() => speakText(ranked_candidates[0].tamil_meaning || "", "ta")}
                      title="Hear Tamil voice"
                    >
                      <Volume2 size={15} />
                    </button>
                  )}
                  <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                    {ranked_candidates[0].english_meaning}
                  </span>
                  {ranked_candidates[0].english_meaning && (
                    <button
                      type="button"
                      className="tts-speak-btn"
                      onClick={() => speakText(ranked_candidates[0].english_meaning || "", "en")}
                      title="Hear English voice"
                    >
                      <Volume2 size={15} />
                    </button>
                  )}
                  <span className="word-id-tag">{ranked_candidates[0].word_id}</span>
                </div>
                {ranked_candidates[0].clip_matches && ranked_candidates[0].clip_matches[0] && (
                  <button
                    type="button"
                    className="nav-link-btn native-audio-btn"
                    onClick={() => {
                      const clip = ranked_candidates[0].clip_matches?.[0]?.clip_id;
                      if (clip) {
                        const audio = new Audio(`/api/audio/playback/${clip}`);
                        audio.play().catch((e) => console.error(e));
                      }
                    }}
                    title="Listen to how the native speaker pronounced this word"
                  >
                    <Volume2 size={15} />
                    Listen Native
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="result-footer">
            <span className="match-quality">Closest similarity: {similarity.toFixed(3)}</span>
            <button type="button" className="record-again-btn" onClick={onRecordAgain}>
              {actionLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
