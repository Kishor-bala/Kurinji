import React, { useState, useEffect } from 'react';
import { Database, Mic, Keyboard } from 'lucide-react';
import KurinjiLogo from './components/KurinjiLogo';
import AudioRecorder from './components/AudioRecorder';
import TextInput from './components/TextInput';
import ResultDisplay from './components/ResultDisplay';
import VocabularyManager from './components/VocabularyManager';

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('Badaga');
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'voice'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [showManager, setShowManager] = useState(false);
  const [backendInfo, setBackendInfo] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setBackendInfo(data))
      .catch(() => {});
  }, []);

  // Voice recognition submission (audio file / waveform)
  const handleAnalyse = async (audioBlob) => {
    setIsAnalyzing(true);
    setRecognitionResult(null);

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('language', selectedLanguage);

    try {
      const response = await fetch('/api/recognize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Recognition server error');
      }

      const result = await response.json();
      setRecognitionResult(result);
    } catch (err) {
      setRecognitionResult({
        status: 'unknown',
        message: err.message || 'Failed to analyze audio clip.',
        similarity: 0.0,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Text transliteration submission
  const handleTextTranslate = async (text) => {
    if (!text || !text.trim()) return;
    setIsAnalyzing(true);
    setRecognitionResult(null);

    try {
      const response = await fetch('/api/translate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Translation server error');
      }

      const result = await response.json();
      setRecognitionResult(result);
    } catch (err) {
      setRecognitionResult({
        status: 'unknown',
        message: err.message || 'Failed to translate word.',
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
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-group">
          <KurinjiLogo size={36} />
          <div className="brand-meta">
            <div className="brand-title-row">
              <span className="brand-title">KURINJI</span>
              {backendInfo && (
                <span
                  className="ai-status-pill"
                  title={
                    backendInfo.gemini_enabled
                      ? 'Multimodal Audio AI + 3,300+ Verified SQLite Dictionary'
                      : 'Running locally with frozen XLS-R 300M'
                  }
                >
                  <span className={`status-dot ${backendInfo.gemini_enabled ? 'active' : ''}`} />
                  {backendInfo.gemini_enabled ? 'AI Active' : 'Offline'}
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
                id="lang-badaga-btn"
                className={`lang-btn ${selectedLanguage === 'Badaga' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedLanguage('Badaga');
                  setRecognitionResult(null);
                }}
              >
                Badaga
              </button>
              <button
                id="lang-marwari-btn"
                className={`lang-btn ${selectedLanguage === 'Marwari' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedLanguage('Marwari');
                  setRecognitionResult(null);
                }}
              >
                Marwari
              </button>
            </div>
          )}

          <button
            id="nav-wordbank-btn"
            className="nav-link-btn wordbank-toggle-btn"
            onClick={() => setShowManager(!showManager)}
            title="Open Vocabulary Management"
          >
            <Database size={16} />
            <span>{showManager ? 'Translator View' : 'Wordbank'}</span>
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
                  id="tab-text-btn"
                  role="tab"
                  aria-selected={inputMode === 'text'}
                  className={`mode-tab-btn ${inputMode === 'text' ? 'active' : ''}`}
                  onClick={() => {
                    setInputMode('text');
                    setRecognitionResult(null);
                  }}
                >
                  <Keyboard size={15} />
                  <span>Type / Speak</span>
                </button>

                <button
                  id="tab-voice-btn"
                  role="tab"
                  aria-selected={inputMode === 'voice'}
                  className={`mode-tab-btn ${inputMode === 'voice' ? 'active' : ''}`}
                  onClick={() => {
                    setInputMode('voice');
                    setRecognitionResult(null);
                  }}
                >
                  <Mic size={15} />
                  <span>Audio File / Waveform</span>
                </button>
              </div>

              {/* Input Surface */}
              {inputMode === 'text' ? (
                <TextInput
                  onTranslate={handleTextTranslate}
                  isTranslating={isAnalyzing}
                  selectedLanguage={selectedLanguage}
                  onSwitchToVoice={() => {
                    setInputMode('voice');
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
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="switch-mode-link"
                      onClick={() => {
                        setInputMode('text');
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
                actionLabel={inputMode === 'text' ? 'Translate Another Word' : 'Record Another Word'}
                selectedLanguage={selectedLanguage}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
