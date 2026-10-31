# MODEL CARD: XLS-R 300M ACOUSTIC ENCODER

### Model Overview
- **Model Architecture:** Wav2Vec2 / XLS-R 300M (`facebook/wav2vec2-xls-r-300m`)
- **Pretrained Scope:** 436,000 hours of publicly available speech across 128 languages
- **Embedding Dimension:** 1024 float32 dimensions
- **Sampling Rate Requirement:** 16,000 Hz Mono

### Utterance Pooling & Feature Extraction
- **Frame Stride:** 20 ms frames (roughly 320x downsampling factor through CNN feature encoder)
- **Pooling Strategy:** Attention-Masked Mean Pooling
  - Unlike simple unmasked averaging which contaminates embeddings with zero-padding vectors, the attention mask is downsampled and multiplied element-wise with the final hidden state sequence prior to summation:
  $$\mathbf{e} = \frac{\sum_{t=1}^{T} \mathbf{h}_t \cdot m_t}{\sum_{t=1}^{T} m_t}$$
- **Normalization:** L2-normalization ensuring that Inner Product retrieval is strictly equivalent to Cosine Similarity:
  $$\hat{\mathbf{e}} = \frac{\mathbf{e}}{\|\mathbf{e}\|_2}$$

### Dual-Path Acoustic Pipeline
1. **Original Waveform Path:** Captures natural ambient acoustic characteristics, subtle retroflex consonants, and breath variations.
2. **Denoised Waveform Path:** Conservative stationary spectral noise reduction (`noisereduce`, prop_decrease=0.65) to strip background white noise and low-frequency microphone hum.
3. **Fusion:** Top-K retrieved candidates from both collections are fused via Reciprocal Rank Fusion ($k=60$).
