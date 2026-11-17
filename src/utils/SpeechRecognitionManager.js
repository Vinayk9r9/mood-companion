export class SpeechRecognitionManager {
  constructor(options = {}) {
    this.options = {
      lang: options.lang || 'en-US',
      continuous: options.continuous !== false,
      interimResults: options.interimResults !== false,
      maxAlternatives: options.maxAlternatives || 1,
      ...options
    };

    this.recognition = null;
    this.isListening = false;
    this.isStarting = false;
    this.interimTranscript = '';
    this.finalTranscript = '';
    this.onResult = options.onResult || (() => {});
    this.onInterim = options.onInterim || (() => {});
    this.onError = options.onError || (() => {});
    this.onStart = options.onStart || (() => {});
    this.onEnd = options.onEnd || (() => {});
    this.onStateChange = options.onStateChange || (() => {});

    this._initRecognition();
  }

  _initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.lang = this.options.lang;
    this.recognition.maxAlternatives = this.options.maxAlternatives;

    this.recognition.onstart = () => {
      this.isStarting = false;
      this.isListening = true;
      this.interimTranscript = '';
      this.finalTranscript = '';
      this._setState('LISTENING');
      this.onStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      this.interimTranscript = interimTranscript;
      this.finalTranscript += finalTranscript;

      if (interimTranscript) {
        this.onInterim(interimTranscript);
      }

      if (finalTranscript) {
        this.onResult(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isStarting = false;
      this.isListening = false;

      let shouldNotify = true;
      if (event.error === 'no-speech' || event.error === 'aborted') {
        shouldNotify = false;
      }

      this._setState('ERROR', { error: event.error, shouldNotify });
      this.onError(event.error, shouldNotify);
    };

    this.recognition.onend = () => {
      this.isStarting = false;
      const wasListening = this.isListening;
      this.isListening = false;

      if (wasListening) {
        this._setState('IDLE');
        this.onEnd();
      }
    };
  }

  _setState(state, meta = {}) {
    this.onStateChange(state, meta);
  }

  start() {
    if (!this.recognition) {
      return { success: false, error: 'Speech recognition not supported' };
    }

    if (this.isListening || this.isStarting) {
      return { success: false, error: 'Already listening' };
    }

    this.isStarting = true;
    this._setState('REQUESTING_PERMISSION');

    try {
      this.recognition.start();
      return { success: true };
    } catch (error) {
      this.isStarting = false;
      console.error('Failed to start recognition:', error);
      return { success: false, error: error.message };
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) {
      return { success: false, error: 'Not listening' };
    }

    try {
      this.recognition.stop();
      return { success: true };
    } catch (error) {
      console.warn('Could not stop recognition:', error);
      return { success: false, error: error.message };
    }
  }

  abort() {
    if (!this.recognition) return { success: false };
    try {
      this.recognition.abort();
      this.isStarting = false;
      this.isListening = false;
      this._setState('IDLE');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getInterimTranscript() {
    return this.interimTranscript;
  }

  getFinalTranscript() {
    return this.finalTranscript;
  }

  getState() {
    if (this.isStarting) return 'REQUESTING_PERMISSION';
    if (this.isListening) return 'LISTENING';
    return 'IDLE';
  }

  isSupported() {
    return !!this.recognition;
  }

  destroy() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
    this.isListening = false;
    this.isStarting = false;
  }
}

export const VOICE_STATES = {
  IDLE: 'IDLE',
  REQUESTING_PERMISSION: 'REQUESTING_PERMISSION',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  SPEAKING: 'SPEAKING',
  PAUSED: 'PAUSED',
  ERROR: 'ERROR'
};