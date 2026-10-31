import React, { useState, useRef } from 'react';
import { Mic, Square, Upload, Play, RefreshCw, Volume2 } from 'lucide-react';

/**
 * Encodes Float32 PCM audio samples directly into a 16-bit Mono WAV Blob (16,000 Hz).
 * Ensures 100% genuine RIFF WAVE format compatible with backend audio processing.
 */
function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size = 16 for PCM
  view.setUint16(20, 1, true); // AudioFormat = 1 (linear PCM)
  view.setUint16(22, 1, true); // NumChannels = 1 (mono)
  view.setUint32(24, sampleRate, true); // SampleRate = 16000
  view.setUint32(28, sampleRate * 2, true); // ByteRate = 16000 * 1 * 2 = 32000
  view.setUint16(32, 2, true); // BlockAlign = 1 * 2 = 2
  view.setUint16(34, 16, true); // BitsPerSample = 16

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write Float32 samples converted to 16-bit PCM Int16
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Resamples Float32 audio samples from inputSampleRate to targetSampleRate (16,000 Hz)
 * using the browser's native C++ polyphase sinc resampler in OfflineAudioContext.
 */
async function resampleTo16k(samples, inputSampleRate, targetSampleRate = 16000) {
  if (inputSampleRate === targetSampleRate || samples.length === 0) {
    return samples;
  }
  const targetLength = Math.max(1, Math.round((samples.length * targetSampleRate) / inputSampleRate));
  const OfflineCtxClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtxClass(1, targetLength, targetSampleRate);

  const audioBuffer = offlineCtx.createBuffer(1, samples.length, inputSampleRate);
  audioBuffer.copyToChannel(samples, 0);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

export default function AudioRecorder({ onAnalyse, isAnalyzing, selectedLanguage }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const audioInputRef = useRef(null);
  const streamRef = useRef(null);
  const muteGainRef = useRef(null);
  const recordedSamplesRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      audioInputRef.current = source;

      // ScriptProcessor node captures raw audio samples from the microphone
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      recordedSamplesRef.current = [];

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < inputData.length; i++) {
          recordedSamplesRef.current.push(inputData[i]);
        }
      };

      // Route through a muted gain node to prevent speaker echo feedback
      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      muteGainRef.current = muteGain;

      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(audioCtx.destination);
      streamRef.current = stream;

      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access denied or unavailable: ' + err.message);
    }
  };

  const stopRecording = async () => {
    if (processorRef.current && audioInputRef.current && isRecording) {
      processorRef.current.disconnect();
      audioInputRef.current.disconnect();
      if (muteGainRef.current) {
        muteGainRef.current.disconnect();
      }

      const inputSampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 48000;

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      clearInterval(timerIntervalRef.current);
      setIsRecording(false);

      // Resample raw microphone PCM samples to strictly 16,000 Hz
      const rawSamples = new Float32Array(recordedSamplesRef.current);
      let samples16k = rawSamples;
      try {
        samples16k = await resampleTo16k(rawSamples, inputSampleRate, 16000);
      } catch (e) {
        console.warn('Native resampler fallback:', e);
      }

      // Encode captured 16kHz PCM samples into a genuine 16-bit 16kHz WAV Blob
      const wavBlob = encodeWAV(samples16k, 16000);
      setAudioBlob(wavBlob);
      setAudioUrl(URL.createObjectURL(wavBlob));
      setUploadedFileName('');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      setUploadedFileName(file.name);
    }
  };

  const handleReset = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
    setUploadedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyzeClick = () => {
    if (!audioBlob) return;
    onAnalyse(audioBlob);
  };

  return (
    <div className="recording-surface">
      <div className="mic-button-wrapper">
        {!isRecording ? (
          <button
            className="mic-button"
            onClick={startRecording}
            disabled={isAnalyzing}
            title="Click to Record"
            id="start-record-btn"
          >
            <Mic size={32} />
          </button>
        ) : (
          <button
            className="mic-button recording"
            onClick={stopRecording}
            title="Click to Stop"
            id="stop-record-btn"
          >
            <Square size={28} />
          </button>
        )}
      </div>

      {!isRecording ? (
        <>
          <p className="instruction-text">
            {audioBlob
              ? uploadedFileName
                ? `Uploaded: ${uploadedFileName}`
                : 'Recording ready for analysis'
              : `Tap to speak a ${selectedLanguage} word`}
          </p>
          <p className="sub-instruction">
            {audioBlob ? 'Listen to preview below or tap Analyse' : 'Speak clearly for 1 to 3 seconds'}
          </p>
        </>
      ) : (
        <>
          <p className="instruction-text" style={{ color: '#dc2626', fontWeight: 600 }}>
            Listening... {recordingSeconds}s
          </p>
          <p className="sub-instruction">Tap red button when finished</p>
        </>
      )}

      {audioUrl && (
        <div className="audio-preview-bar">
          <audio controls src={audioUrl} />
          <button
            className="nav-link-btn"
            onClick={handleReset}
            disabled={isAnalyzing}
            title="Discard & Record Again"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      <button
        className="analyse-button"
        onClick={handleAnalyzeClick}
        disabled={!audioBlob || isAnalyzing || isRecording}
        id="analyse-audio-btn"
      >
        {isAnalyzing ? (
          <>
            <RefreshCw size={18} className="animate-spin" />
            Matching against {selectedLanguage} Wordbank...
          </>
        ) : (
          'Analyse Audio'
        )}
      </button>

      <div className="upload-divider">
        <span>or</span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="audio/*"
        style={{ display: 'none' }}
        id="audio-file-input"
      />
      <span
        className="upload-label"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
      >
        Upload an audio file (WAV / MP3)
      </span>
    </div>
  );
}
