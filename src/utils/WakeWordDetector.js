export class WakeWordDetector {
  constructor(options = {}) {
    this.options = {
      keywords: options.keywords || ['hey companion', 'hey assistant', 'okay companion'],
      sensitivity: options.sensitivity || 0.5,
      onWakeWord: options.onWakeWord || (() => {}),
      onError: options.onError || (() => {})
    };

    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.isRunning = false;
    this.animationFrameId = null;
    this.bufferSize = 4096;
    this.dataArray = null;

    // Simple energy-based detection (placeholder for real wake word)
    this.energyThreshold = 0.02;
    this.consecutiveFrames = 0;
    this.requiredFrames = 3;
  }

  async start() {
    if (this.isRunning) return { success: false, error: 'Already running' };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      this.analyser.smoothingTimeConstant = 0.8;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      this.isRunning = true;
      this._detectLoop();

      return { success: true };
    } catch (error) {
      console.error('Wake word detector start error:', error);
      this.options.onError(error);
      return { success: false, error: error.message };
    }
  }

  stop() {
    this.isRunning = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  _detectLoop() {
    if (!this.isRunning) return;

    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average energy
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length / 255; // Normalize 0-1

    // Simple voice activity detection
    if (average > this.energyThreshold) {
      this.consecutiveFrames++;
      if (this.consecutiveFrames >= this.requiredFrames) {
        this._triggerWakeWord();
        this.consecutiveFrames = 0;
      }
    } else {
      this.consecutiveFrames = 0;
    }

    this.animationFrameId = requestAnimationFrame(() => this._detectLoop());
  }

  _triggerWakeWord() {
    // In a real implementation, this would use a proper wake word model
    // For now, we just notify that "something" was detected
    // The actual keyword matching would require a model like Porcupine or TensorFlow.js
    console.log('[WakeWordDetector] Voice activity detected (placeholder)');
    // this.options.onWakeWord('hey companion');
  }

  setKeywords(keywords) {
    this.options.keywords = keywords;
  }

  setSensitivity(sensitivity) {
    this.options.sensitivity = Math.max(0, Math.min(1, sensitivity));
    this.energyThreshold = 0.01 + (this.options.sensitivity * 0.05);
  }

  isSupported() {
    return !!(window.AudioContext || window.webkitAudioContext) &&
           navigator.mediaDevices &&
           navigator.mediaDevices.getUserMedia;
  }

  destroy() {
    this.stop();
  }
}

// Note: This is a placeholder implementation using simple energy detection.
// For production wake word detection, integrate with:
// - Porcupine Web (Picovoice) - requires license
// - TensorFlow.js with a keyword spotting model
// - Web Speech API with continuous recognition + keyword filtering