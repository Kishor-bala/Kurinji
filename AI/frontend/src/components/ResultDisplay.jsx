import React from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, Volume2, RefreshCw, Sparkles, BookOpen } from 'lucide-react';

export default function ResultDisplay({
  result,
  onRecordAgain,
  actionLabel = 'Record Another Word',
  selectedLanguage = 'Badaga',
}) {
  // Idle state when nothing has been translated yet
  if (!result) {
    return (
      <div className="result-card idle-card" id="idle-result-card">
        <div className="idle-content">
          <div className="idle-icon-ring">
            <Sparkles size={24} className="idle-sparkle" />
          </div>
          <h3 className="idle-title">Translation Output</h3>
          <p className="idle-subtitle">
            Speak using the live mic or type any {selectedLanguage} word on the left.
            Verified Tamil and English translations with native voice playback will appear here.
          </p>
          <div className="idle-tips">
            <span className="idle-tip-tag">✓ 3,318 Verified Words</span>
            <span className="idle-tip-tag">✓ 100% Offline Database</span>
            <span className="idle-tip-tag">✓ Authentic Hill Pronunciation</span>
          </div>
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
    similarity,
    message,
    ranked_candidates,
  } = result;

  const isRecognized = status === 'recognized';
  const isUncertain = status === 'uncertain';
  const isUnknown = status === 'unknown';

  // Get best reference clip ID if available for native Badaga pronunciation playback
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
    audio.play().catch((e) => console.error('Playback error:', e));
  };

  // Text-to-speech for Tamil and English words
  const speakText = (text, lang) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="result-card" id="recognition-result-card">
      <div className="result-header">
        <div className={`status-badge ${status}`}>
          {isRecognized && <CheckCircle2 size={16} />}
          {isUncertain && <AlertCircle size={16} />}
          {isUnknown && <HelpCircle size={16} />}
          <span>
            {isRecognized && 'Word Recognized'}
            {isUncertain && 'Uncertain Match'}
            {isUnknown && 'Unknown Word'}
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
                    onClick={() => speakText(tamil_meaning, 'ta-IN')}
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
                    onClick={() => speakText(english_meaning, 'en-US')}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {bestClipId && (
                <button
                  className="nav-link-btn native-audio-btn"
                  onClick={playReferenceAudio}
                  title="Listen to authentic native hill-speaker reference pronunciation"
                >
                  <Volume2 size={16} />
                  Listen Native Badaga
                </button>
              )}
              <span className="match-quality">
                Match quality: {similarity >= 0.85 ? 'High' : 'Moderate'} ({similarity.toFixed(3)})
              </span>
            </div>

            <button className="record-again-btn" onClick={onRecordAgain}>
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
                    onClick={() => speakText(tamil_meaning, 'ta-IN')}
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
                    onClick={() => speakText(english_meaning, 'en-US')}
                    title="Hear English voice pronunciation"
                  >
                    <Volume2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            {message}
          </p>

          <div className="result-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {bestClipId && (
                <button
                  className="nav-link-btn native-audio-btn"
                  onClick={playReferenceAudio}
                  title="Listen to native speaker reference pronunciation"
                >
                  <Volume2 size={16} />
                  Listen Native Badaga
                </button>
              )}
              <span className="match-quality">Score: {similarity.toFixed(3)}</span>
            </div>
            <button className="record-again-btn" onClick={onRecordAgain}>
              {actionLabel}
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {message || `This word could not be confidently identified in the verified ${language} wordbank.`}
          </p>
          {ranked_candidates && ranked_candidates[0] && (
            <div style={{ background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Closest Wordbank Candidate:
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span className="meaning-val-tamil tamil-text" style={{ fontSize: '1.25rem' }}>
                    {ranked_candidates[0].tamil_meaning}
                  </span>
                  {ranked_candidates[0].tamil_meaning && (
                    <button
                      type="button"
                      className="tts-speak-btn"
                      onClick={() => speakText(ranked_candidates[0].tamil_meaning, 'ta-IN')}
                      title="Hear Tamil voice"
                    >
                      <Volume2 size={15} />
                    </button>
                  )}
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {ranked_candidates[0].english_meaning}
                  </span>
                  {ranked_candidates[0].english_meaning && (
                    <button
                      type="button"
                      className="tts-speak-btn"
                      onClick={() => speakText(ranked_candidates[0].english_meaning, 'en-US')}
                      title="Hear English voice"
                    >
                      <Volume2 size={15} />
                    </button>
                  )}
                  <span className="word-id-tag">{ranked_candidates[0].word_id}</span>
                </div>
                {ranked_candidates[0].clip_matches && ranked_candidates[0].clip_matches[0] && (
                  <button
                    className="nav-link-btn native-audio-btn"
                    onClick={() => {
                      const audio = new Audio(`/api/audio/playback/${ranked_candidates[0].clip_matches[0].clip_id}`);
                      audio.play().catch((e) => console.error(e));
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
            <button className="record-again-btn" onClick={onRecordAgain}>
              {actionLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
