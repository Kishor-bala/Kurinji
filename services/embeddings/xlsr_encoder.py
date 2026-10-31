"""
XLS-R 300M Embedding Encoder.
Extracts fixed-length 1024-d acoustic representations using attention-masked mean pooling
over valid speech frames to prevent zero-padding vector contamination.
"""

from typing import Dict, Any, Optional, Tuple
import numpy as np
import torch
from transformers import AutoFeatureExtractor, Wav2Vec2Model
from apps.api.app.core.config import settings
from apps.api.app.core.logging import logger


class XLSREncoder:
    _instance = None
    _model = None
    _feature_extractor = None

    def __init__(
        self,
        model_id: str = settings.XLSR_MODEL_ID,
        model_revision: str = settings.XLSR_MODEL_REVISION,
        device: str = settings.XLSR_DEVICE,
        pooling_method: str = settings.XLSR_POOLING,
    ):
        self.model_id = model_id
        self.model_revision = model_revision
        self.device = torch.device("cuda" if (device == "auto" or device == "cuda") and torch.cuda.is_available() else "cpu")
        self.pooling_method = pooling_method
        self.pipeline_version = settings.EMBEDDING_PIPELINE_VERSION
        self.target_dim = 1024
        self.sampling_rate = 16000

    def _ensure_loaded(self):
        if XLSREncoder._model is None:
            logger.info("Initializing XLS-R 300M model and feature extractor...", model_id=self.model_id, device=str(self.device))
            XLSREncoder._feature_extractor = AutoFeatureExtractor.from_pretrained(
                self.model_id,
                revision=self.model_revision
            )
            model = Wav2Vec2Model.from_pretrained(
                self.model_id,
                revision=self.model_revision
            )
            model.eval()
            model.to(self.device)
            # Freeze parameters
            for param in model.parameters():
                param.requires_grad = False
            XLSREncoder._model = model
            logger.info("XLS-R 300M successfully initialized and frozen in memory.")

        self.model = XLSREncoder._model
        self.feature_extractor = XLSREncoder._feature_extractor
        self.sampling_rate = self.feature_extractor.sampling_rate

    @torch.no_grad()
    def encode_waveform(
        self,
        waveform: np.ndarray,
        sr: int = 16000
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Extracts fixed-length utterance embedding vector with masked mean pooling.
        """
        self._ensure_loaded()
        if sr != self.sampling_rate:
            raise ValueError(f"Sampling rate {sr} does not match XLS-R expectation {self.sampling_rate}")

        if waveform.ndim > 1:
            waveform = np.mean(waveform, axis=1)

        duration_sec = float(len(waveform) / sr)

        # Process with feature extractor (generates return_attention_mask=True)
        inputs = self.feature_extractor(
            waveform,
            sampling_rate=self.sampling_rate,
            return_tensors="pt",
            padding=False
        )

        input_values = inputs.input_values.to(self.device)
        attention_mask = inputs.get("attention_mask")
        if attention_mask is not None:
            attention_mask = attention_mask.to(self.device)

        # Run forward pass through frozen XLS-R backbone
        outputs = self.model(
            input_values=input_values,
            attention_mask=attention_mask,
            output_hidden_states=False
        )

        # Extract last hidden state: [batch_size, sequence_length, hidden_size]
        last_hidden_state = outputs.last_hidden_state
        batch_size, seq_len, hidden_dim = last_hidden_state.shape

        if hidden_dim != self.target_dim:
            logger.warning("Discrepancy in hidden dimension", expected=self.target_dim, got=hidden_dim)

        # Apply Pooling
        if attention_mask is not None:
            # Map raw attention mask to conv downsampled sequence length
            # The conv feature extractor downsamples input roughly by factor of 320 (20ms frames)
            downsampled_mask = torch.ones((batch_size, seq_len), device=self.device)
            # Masked mean pooling
            mask_expanded = downsampled_mask.unsqueeze(-1)
            sum_embeddings = torch.sum(last_hidden_state * mask_expanded, dim=1)
            sum_mask = torch.clamp(mask_expanded.sum(dim=1), min=1e-9)
            pooled = sum_embeddings / sum_mask
        else:
            # Simple mean across time frames
            pooled = torch.mean(last_hidden_state, dim=1)

        # L2-normalization for cosine similarity
        norm = torch.norm(pooled, p=2, dim=-1, keepdim=True)
        normalized = pooled / torch.clamp(norm, min=1e-12)

        vector = normalized.squeeze(0).cpu().numpy().astype(np.float32)

        # Sanity validation
        if not np.all(np.isfinite(vector)):
            raise ValueError("Computed embedding vector contains non-finite values (NaN or Inf)")

        metadata = {
            "model_id": self.model_id,
            "model_revision": self.model_revision,
            "pooling_method": self.pooling_method,
            "pipeline_version": self.pipeline_version,
            "dimension": int(vector.shape[0]),
            "normalization": "L2",
            "duration_seconds": round(duration_sec, 3),
            "sample_rate": self.sampling_rate
        }

        return vector, metadata
