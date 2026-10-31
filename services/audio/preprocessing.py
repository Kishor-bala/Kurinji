"""
Audio Preprocessing Service.
Provides independent Original and Denoised audio paths, validation,
and Silero-compatible energy / VAD segmentation bounded by 300ms - 4000ms.
"""

import os
import hashlib
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import soundfile as sf
import scipy.signal
import noisereduce as nr
from apps.api.app.core.logging import logger


class AudioValidationError(Exception):
    pass


class AudioPreprocessor:
    def __init__(
        self,
        target_sample_rate: int = 16000,
        min_utterance_ms: int = 300,
        max_utterance_ms: int = 4000,
        padding_ms: int = 100,
        max_duration_seconds: float = 15.0,
    ):
        self.target_sample_rate = target_sample_rate
        self.min_utterance_samples = int(target_sample_rate * (min_utterance_ms / 1000.0))
        self.max_utterance_samples = int(target_sample_rate * (max_utterance_ms / 1000.0))
        self.padding_samples = int(target_sample_rate * (padding_ms / 1000.0))
        self.max_duration_seconds = max_duration_seconds

    def compute_checksum(self, file_path_or_bytes) -> str:
        sha = hashlib.sha256()
        if isinstance(file_path_or_bytes, (str, bytes, os.PathLike)) and os.path.exists(str(file_path_or_bytes)):
            with open(file_path_or_bytes, "rb") as f:
                while chunk := f.read(65536):
                    sha.update(chunk)
        elif isinstance(file_path_or_bytes, (bytes, bytearray)):
            sha.update(file_path_or_bytes)
        else:
            raise ValueError("Invalid input to compute_checksum")
        return sha.hexdigest()

    def load_and_validate_audio(self, audio_source: Any) -> Tuple[np.ndarray, int, Dict[str, Any]]:
        """
        Safely decodes and validates audio format, channels, clipping, and duration.
        """
        try:
            waveform, sr = sf.read(audio_source, dtype="float32")
        except Exception:
            # Fallback for browser WebM/Opus and container formats using system ffmpeg
            try:
                import tempfile
                import subprocess

                if hasattr(audio_source, "seek"):
                    audio_source.seek(0)
                    data_bytes = audio_source.read()
                elif isinstance(audio_source, (bytes, bytearray)):
                    data_bytes = audio_source
                else:
                    with open(str(audio_source), "rb") as f:
                        data_bytes = f.read()

                with tempfile.NamedTemporaryFile(suffix=".browser_audio", delete=False) as in_f:
                    in_f.write(data_bytes)
                    in_path = in_f.name
                out_path = in_path + ".wav"

                cmd = ["ffmpeg", "-y", "-i", in_path, "-ac", "1", "-ar", "16000", out_path]
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                waveform, sr = sf.read(out_path, dtype="float32")

                if os.path.exists(in_path):
                    os.remove(in_path)
                if os.path.exists(out_path):
                    os.remove(out_path)
            except Exception as e2:
                raise AudioValidationError(f"Malformed or unsupported audio file: {e2}")

        # Channels conversion to mono
        if waveform.ndim > 1:
            # Documented mono policy: average channels across axis 1
            waveform = np.mean(waveform, axis=1)

        duration_sec = len(waveform) / sr
        if duration_sec > self.max_duration_seconds:
            raise AudioValidationError(
                f"Audio exceeds maximum permitted duration of {self.max_duration_seconds}s (got {duration_sec:.2f}s)"
            )

        if duration_sec < 0.2:
            raise AudioValidationError(f"Audio is too short for speech recognition ({duration_sec:.2f}s)")

        # Silence / Clipping detection
        max_amp = float(np.max(np.abs(waveform)))
        rms = float(np.sqrt(np.mean(waveform**2)))

        if max_amp < 0.01 or rms < 0.005:
            raise AudioValidationError("Audio contains only silence or near-zero amplitude.")

        is_clipped = bool(max_amp >= 0.999)

        # Resample to target sample rate (16kHz) if needed
        if sr != self.target_sample_rate:
            num_samples = int(len(waveform) * (self.target_sample_rate / sr))
            waveform = scipy.signal.resample(waveform, num_samples)
            sr = self.target_sample_rate

        # Apply 80Hz Butterworth High-Pass filter to eliminate mic pops, rumble & DC bias
        sos = scipy.signal.butter(4, 80.0, btype="highpass", fs=sr, output="sos")
        waveform = scipy.signal.sosfilt(sos, waveform).astype(np.float32)

        # Volume Peak Normalization (target max amplitude 0.90 for uniform dynamic range)
        curr_max = float(np.max(np.abs(waveform)))
        if curr_max > 0.01:
            waveform = (waveform / curr_max * 0.90).astype(np.float32)

        # Recalculate metrics after filtering and normalization
        max_amp = float(np.max(np.abs(waveform)))
        rms = float(np.sqrt(np.mean(waveform**2)))

        metadata = {
            "sample_rate": sr,
            "duration": round(duration_sec, 3),
            "num_samples": len(waveform),
            "max_amplitude": round(max_amp, 4),
            "rms": round(rms, 4),
            "is_clipped": is_clipped,
        }

        return waveform, sr, metadata

    def extract_full_utterance(
        self,
        waveform: np.ndarray,
        sr: int = 16000,
        pre_roll_ms: int = 120,
        post_roll_ms: int = 150
    ) -> Tuple[np.ndarray, int, int]:
        """
        Captures user voice fully without truncation or dropped syllables.
        Detects full active speech span from first phoneme to trailing sound,
        including short inter-syllabic pauses.
        """
        frame_len = int(sr * 0.03)  # 30ms frame
        hop_len = int(sr * 0.01)    # 10ms hop

        if len(waveform) < frame_len:
            return waveform, 0, int(len(waveform) / sr * 1000)

        # Short-term energy profile
        energy = np.array([
            np.sqrt(np.mean(waveform[i:i + frame_len] ** 2))
            for i in range(0, len(waveform) - frame_len, hop_len)
        ])

        if len(energy) == 0:
            return waveform, 0, int(len(waveform) / sr * 1000)

        peak_energy = float(np.max(energy))
        # Adaptive threshold: 14% of peak or baseline noise floor
        thresh = max(peak_energy * 0.14, 0.012)
        active_frames = np.where(energy > thresh)[0]

        if len(active_frames) == 0:
            # Fallback: return whole waveform
            return waveform, 0, int(len(waveform) / sr * 1000)

        # Full utterance span from earliest speech frame to latest speech frame
        first_frame = active_frames[0]
        last_frame = active_frames[-1]

        start_ms = max(0, int(first_frame * 10 - pre_roll_ms))
        end_ms = min(int(len(waveform) / sr * 1000), int((last_frame * 10) + 30 + post_roll_ms))

        s_idx = int(sr * (start_ms / 1000.0))
        e_idx = int(sr * (end_ms / 1000.0))

        utterance = waveform[s_idx:e_idx]
        if len(utterance) < int(sr * 0.25):
            # If too short, return the original waveform to prevent clipping
            return waveform, 0, int(len(waveform) / sr * 1000)

        return utterance, start_ms, end_ms

    def detect_speech_segments(
        self,
        waveform: np.ndarray,
        sr: int = 16000
    ) -> List[Tuple[int, int]]:
        """
        Segments utterances using an energy-envelope VAD bounded strictly by 300ms - 4000ms.
        Returns list of (start_ms, end_ms) tuples.
        """
        frame_len = int(sr * 0.03)  # 30ms frame
        hop_len = int(sr * 0.01)    # 10ms hop
        
        if len(waveform) < frame_len:
            return [(0, int(len(waveform) / sr * 1000))]

        # Compute short-term energy
        energy = np.array([
            np.sqrt(np.mean(waveform[i:i+frame_len]**2))
            for i in range(0, len(waveform) - frame_len, hop_len)
        ])

        if len(energy) == 0:
            return [(0, int(len(waveform) / sr * 1000))]

        peak_energy = float(np.max(energy))
        # Adaptive threshold: 12% of peak or baseline noise
        thresh = max(peak_energy * 0.12, 0.008)

        active = energy > thresh
        
        # Merge active segments separated by less than 250ms of silence
        min_silence_frames = int(0.25 / 0.01)
        segments_frames = []
        in_speech = False
        start_idx = 0
        silence_count = 0

        for i, is_act in enumerate(active):
            if is_act:
                if not in_speech:
                    in_speech = True
                    start_idx = i
                silence_count = 0
            else:
                if in_speech:
                    silence_count += 1
                    if silence_count > min_silence_frames:
                        segments_frames.append((start_idx, i - silence_count))
                        in_speech = False

        if in_speech:
            segments_frames.append((start_idx, len(active) - 1))

        # Convert to milliseconds and enforce duration boundaries (300ms - 4000ms)
        valid_segments = []
        for s_idx, e_idx in segments_frames:
            s_ms = max(0, int(s_idx * 10 - 60))  # add 60ms pre-roll
            e_ms = min(int(len(waveform) / sr * 1000), int(e_idx * 10 + 100))  # add 100ms post-roll
            dur_ms = e_ms - s_ms

            if dur_ms >= 300:
                if dur_ms > 4000:
                    e_ms = s_ms + 4000
                valid_segments.append((s_ms, e_ms))

        # Fallback if no burst exceeded 300ms but waveform was non-silent: take trimmed window
        if not valid_segments:
            logger.warning("No segment matched >300ms threshold; taking trimmed peak window")
            center = int(np.argmax(energy) * 10)
            s_ms = max(0, center - 600)
            e_ms = min(int(len(waveform) / sr * 1000), center + 600)
            valid_segments.append((s_ms, e_ms))

        # Rank segments by total speech energy descending so primary vocal utterance is first
        def seg_energy(s):
            s_i = int(sr * (s[0] / 1000.0))
            e_i = int(sr * (s[1] / 1000.0))
            return float(np.sum(waveform[s_i:e_i] ** 2))

        valid_segments.sort(key=seg_energy, reverse=True)
        return valid_segments

    def create_denoised_derivative(
        self,
        waveform: np.ndarray,
        sr: int = 16000
    ) -> np.ndarray:
        """
        Creates stationary spectral noise-cancelled derivative to eliminate ambient room noise and hiss.
        """
        try:
            denoised = nr.reduce_noise(
                y=waveform,
                sr=sr,
                prop_decrease=0.85,
                stationary=True,
                n_std_thresh_stationary=1.5,
                time_mask_smooth_ms=64
            )
            return denoised.astype(np.float32)
        except Exception as e:
            logger.warning("Noise reduction fallback to original waveform: %s", e)
            return waveform.copy()

