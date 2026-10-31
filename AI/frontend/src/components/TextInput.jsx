import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, ArrowRight, CornerDownLeft, Mic, MicOff } from 'lucide-react';

const SUGGESTIONS = {
  Badaga: [
    { text: 'thale', label: 'head' },
    { text: 'kannu', label: 'eye' },
    { text: 'mooku', label: 'nose' },
    { text: 'pal', label: 'teeth' },
    { text: 'mandhe', label: 'head' },
    { text: 'kaalu', label: 'leg' },
    { text: 'amma', label: 'mother' },
  ],
  Marwari: [
    { text: 'aankh', label: 'eye' },
    { text: 'naak', label: 'nose' },
    { text: 'daant', label: 'teeth' },
    { text: 'matho', label: 'head' },
    { text: 'haath', label: 'hand' },
    { text: 'pag', label: 'leg' },
    { text: 'maa', label: 'mother' },
  ],
};

export default function TextInput({ onTranslate, isTranslating, selectedLanguage, onSwitchToVoice }) {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechHint, setSpeechHint] = useState('');

  const recognitionRef = useRef(null);

  const currentSuggestions = SUGGESTIONS[selectedLanguage] || SUGGESTIONS.Badaga;

  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
    }
  }, []);

  const startVoiceDictation = () => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      if (onSwitchToVoice) onSwitchToVoice();
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      // Indian English acoustic profile is best suited for transcribing Indian phonetic sounds
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechHint('Listening... speak now');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const cleanWord = transcript.trim().toLowerCase().replace(/[.,!?;:]/g, '');
        setInputText(cleanWord);

        if (event.results[0].isFinal && cleanWord) {
          setIsListening(false);
          setSpeechHint('');
          onTranslate(cleanWord);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setSpeechHint('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechHint('');
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setSpeechHint('');
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isTranslating) return;
    onTranslate(inputText.trim());
  };

  const handleSuggestionClick = (word) => {
    setInputText(word);
    onTranslate(word);
  };

  const handleClear = () => {
    setInputText('');
    setSpeechHint('');
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
        <div className={`text-search-wrapper ${isListening ? 'listening-active' : ''}`}>
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
                : `Type or speak ${selectedLanguage} word in English (e.g. "${currentSuggestions[0]?.text || 'thale'}") ...`
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
              className={`text-mic-btn ${isListening ? 'listening' : ''}`}
              onClick={startVoiceDictation}
              disabled={isTranslating}
              title={isListening ? 'Stop listening' : 'Click to speak word into text box'}
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
          <span>Listening for {selectedLanguage} pronunciation... (Say e.g. "thale", "kannu", "pal")</span>
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
