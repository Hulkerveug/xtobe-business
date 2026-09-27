
import numpy as np
class N1Ingestion:
    def __init__(self, n_channels=1024, sample_rate=20000):
        self.n_channels=n_channels; self.sample_rate=sample_rate
    def ingest(self, raw_voltage: np.ndarray):
        filtered = self.bandpass_filter(raw_voltage)
        spikes = self.detect_spikes(filtered)
        return self.extract_features(spikes)
    def bandpass_filter(self, data): return data
    def detect_spikes(self, data):
        thr = -4.5 * np.median(np.abs(data))
        return data < thr
    def extract_features(self, spikes, bin_ms=20):
        return np.sum(spikes, axis=1)
