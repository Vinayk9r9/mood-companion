export class TextToSpeech {
  constructor(options = {}) {
    this.synthesis = window.speechSynthesis;
    this.selectedVoice = null;
    this.speechRate = options.rate || 1.0;
    this.pitch = options.pitch || 1.0;
    this.volume = options.volume || 1.0;
    this.lang = options.lang || 'en-US';
    this.onStart = options.onStart || (() => {});
    this.onEnd = options.onEnd || (() => {});
    this.onError = options.onError || (() => {});
    this.onVoicesLoaded = options.onVoicesLoaded || (() => {});

    this.currentUtterance = null;
    this.currentUtteranceId = null;
    this.isSpeaking = false;

    this._loadVoices();
  }

  _loadVoices() {
    if (!this.synthesis) return;

    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      this.selectedVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                           voices.find(v => v.lang.startsWith('en') && v.name.includes('Microsoft')) ||
                           voices.find(v => v.lang.startsWith('en')) ||
                           voices[0] || null;
      this.onVoicesLoaded(voices);
    };

    loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
  }

  getVoices() {
    return this.synthesis ? this.synthesis.getVoices() : [];
  }

  setVoice(voice) {
    if (voice && this.getVoices().includes(voice)) {
      this.selectedVoice = voice;
    }
  }

  setVoiceByName(name) {
    const voice = this.getVoices().find(v => v.name === name);
    if (voice) {
      this.selectedVoice = voice;
      return true;
    }
    return false;
  }

  setRate(rate) {
    this.speechRate = Math.max(0.1, Math.min(2.0, rate));
  }

  setPitch(pitch) {
    this.pitch = Math.max(0.0, Math.min(2.0, pitch));
  }

  setVolume(volume) {
    this.volume = Math.max(0.0, Math.min(1.0, volume));
  }

  speak(text, utteranceId = null) {
    if (!this.synthesis) {
      this.onError(new Error('Speech synthesis not supported'));
      return { success: false, error: 'Speech synthesis not supported' };
    }

    if (!text || !text.trim()) {
      return { success: false, error: 'Empty text' };
    }

    // Cancel any ongoing speech
    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.voice = this.selectedVoice;
    utterance.rate = this.speechRate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;
    utterance.lang = this.lang;

    this.currentUtterance = utterance;
    this.currentUtteranceId = utteranceId;
    this.isSpeaking = true;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.onStart(utteranceId);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.currentUtteranceId = null;
      this.onEnd(utteranceId);
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.currentUtteranceId = null;
      this.onError(e, utteranceId);
    };

    this.synthesis.speak(utterance);
    return { success: true };
  }

  cancel() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.currentUtteranceId = null;
    }
  }

  pause() {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.pause();
    }
  }

  resume() {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.resume();
    }
  }

  getState() {
    if (this.isSpeaking) return 'SPEAKING';
    return 'IDLE';
  }

  isSupported() {
    return !!this.synthesis;
  }

  destroy() {
    this.cancel();
  }
}