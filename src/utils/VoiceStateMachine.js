import { SpeechRecognitionManager } from './SpeechRecognitionManager.js';
import { TextToSpeech } from './TextToSpeech.js';
import { WakeWordDetector } from './WakeWordDetector.js';
import { VOICE_STATES } from './SpeechRecognitionManager.js';

export class VoiceStateMachine {
  constructor(stateManager, options = {}) {
    this.stateManager = stateManager;
    this.options = {
      handsFreeEnabled: options.handsFreeEnabled || false,
      autoRestartDelay: options.autoRestartDelay || 500,
      ...options
    };

    // Voice state
    this.currentState = VOICE_STATES.IDLE;
    this.previousState = VOICE_STATES.IDLE;
    this.handsFreeMode = false;
    this.wakeWordMode = false;

    // Components
    this.recognitionManager = null;
    this.tts = null;
    this.wakeWordDetector = null;

    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onTranscript = options.onTranscript || (() => {});
    this.onInterimTranscript = options.onInterimTranscript || (() => {});
    this.onError = options.onError || (() => {});
    this.onUserMessage = options.onUserMessage || (() => {});
    this.onAIResponse = options.onAIResponse || (() => {});

    // Debounce for auto-restart
    this.autoRestartTimer = null;
    this.isProcessing = false;

    this._initComponents();
    this._setupSettingsListeners();
  }

  _initComponents() {
    // Initialize Speech Recognition
    this.recognitionManager = new SpeechRecognitionManager({
      lang: 'en-US',
      continuous: false,
      interimResults: true,
      onStart: () => this._handleRecognitionStart(),
      onInterim: (transcript) => this._handleInterimTranscript(transcript),
      onResult: (finalTranscript) => this._handleFinalTranscript(finalTranscript),
      onError: (error, shouldNotify) => this._handleRecognitionError(error, shouldNotify),
      onEnd: () => this._handleRecognitionEnd(),
      onStateChange: (state, meta) => this._handleRecognitionStateChange(state, meta)
    });

    // Initialize TTS
    this.tts = new TextToSpeech({
      rate: this.stateManager.get('settings.ttsRate') || 1.0,
      onStart: (utteranceId) => this._handleTTSStart(utteranceId),
      onEnd: (utteranceId) => this._handleTTSEnd(utteranceId),
      onError: (error, utteranceId) => this._handleTTSError(error, utteranceId),
      onVoicesLoaded: (voices) => this._onVoicesLoaded(voices)
    });

    // Initialize wake word detector (lazy)
    this._initWakeWordDetector();

    // Initialize modes from settings
    this.handsFreeMode = this.stateManager.get('settings.handsFreeEnabled') || false;
    this.wakeWordMode = this.stateManager.get('settings.wakeWordEnabled') || false;
  }

  _initWakeWordDetector() {
    if (!WakeWordDetector.prototype.isSupported.call({})) {
      console.warn('Wake word detection not supported in this browser');
      return;
    }

    this.wakeWordDetector = new WakeWordDetector({
      onWakeWord: () => this._onWakeWordDetected(),
      onError: (error) => console.error('Wake word error:', error)
    });
  }

  _setupSettingsListeners() {
    // Hands-free mode
    this._settingsUnsub = this.stateManager.on('settings.handsFreeEnabled.change', (data) => {
      this.handsFreeMode = data.value;
      if (this.handsFreeMode && this.currentState === VOICE_STATES.IDLE) {
        this.startListening();
      } else if (!this.handsFreeMode) {
        this.stopListening();
      }
    });

    // Wake word mode
    this._wakeWordUnsub = this.stateManager.on('settings.wakeWordEnabled.change', (data) => {
      this.wakeWordMode = data.value;
      this._toggleWakeWordDetector(data.value);
    });

    // TTS rate
    this._rateUnsub = this.stateManager.on('settings.ttsRate.change', (data) => {
      if (this.tts) {
        this.tts.setRate(data.value);
      }
    });

    // TTS voice
    this._voiceUnsub = this.stateManager.on('settings.ttsVoice.change', (data) => {
      if (this.tts && data.value) {
        this.tts.setVoiceByName(data.value);
      }
    });
  }

  _toggleWakeWordDetector(enabled) {
    if (!this.wakeWordDetector) return;

    if (enabled && this.currentState === VOICE_STATES.IDLE) {
      this.wakeWordDetector.start().then(result => {
        if (!result.success) {
          console.warn('Failed to start wake word detector:', result.error);
          this.stateManager.addNotification({
            type: 'warning',
            title: 'Wake Word Unavailable',
            message: result.error || 'Could not start wake word detection'
          });
        }
      });
    } else {
      this.wakeWordDetector.stop();
    }
  }

  _onWakeWordDetected() {
    // Wake word detected - start recognition if not already listening
    if (this.currentState === VOICE_STATES.IDLE || this.currentState === VOICE_STATES.PAUSED) {
      this.startListening();
      this.stateManager.addNotification({
        type: 'info',
        title: 'Wake Word Detected',
        message: 'Listening...',
        duration: 2000
      });
    }
  }

  _onVoicesLoaded(voices) {
    // Populate voice select in Settings if open
    const select = document.getElementById('voice-select');
    if (select && select.options.length <= 1) {
      select.innerHTML = voices.map(v =>
        `<option value="${v.name}" ${v.name === this.tts.selectedVoice?.name ? 'selected' : ''}>${v.name} (${v.lang})</option>`
      ).join('');
    }
  }

  _setState(newState, meta = {}) {
    if (this.currentState === newState) return;

    this.previousState = this.currentState;
    this.currentState = newState;
    this.onStateChange(newState, { ...meta, previousState: this.previousState });
  }

  _handleRecognitionStateChange(state, meta) {
    // Map recognition states to voice states
    const stateMap = {
      'REQUESTING_PERMISSION': VOICE_STATES.REQUESTING_PERMISSION,
      'LISTENING': VOICE_STATES.LISTENING,
      'IDLE': VOICE_STATES.IDLE,
      'ERROR': VOICE_STATES.ERROR
    };

    const voiceState = stateMap[state] || VOICE_STATES.IDLE;
    this._setState(voiceState, meta);
  }

  _handleRecognitionStart() {
    this._setState(VOICE_STATES.LISTENING);
    this.stateManager.addNotification({
      type: 'info',
      title: 'Listening...',
      message: 'Speak now',
      duration: 2000
    });
  }

  _handleInterimTranscript(transcript) {
    this.onInterimTranscript(transcript);
  }

  _handleFinalTranscript(finalTranscript) {
    if (!finalTranscript.trim()) return;

    this._setState(VOICE_STATES.PROCESSING);
    this.onTranscript(finalTranscript);

    // Send to AI via callback
    this.onUserMessage(finalTranscript.trim()).then(() => {
      this.isProcessing = false;
    }).catch(() => {
      this.isProcessing = false;
    });
  }

  _handleRecognitionError(error, shouldNotify) {
    if (shouldNotify) {
      let errorMessage = 'Voice input error';
      switch (error) {
        case 'no-speech':
          errorMessage = 'I could not hear any speech. Please check your microphone and try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access in browser settings.';
          break;
        case 'network':
          errorMessage = 'Network error during recognition.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not allowed.';
          break;
        default:
          errorMessage = `Recognition error: ${error}`;
      }

      this.stateManager.addNotification({
        type: 'error',
        title: 'Voice Input Error',
        message: errorMessage
      });
    }

    this._setState(VOICE_STATES.ERROR, { error });

    // Auto-recover to IDLE after error
    setTimeout(() => {
      if (this.currentState === VOICE_STATES.ERROR) {
        this._setState(VOICE_STATES.IDLE);
      }
    }, 3000);
  }

  _handleRecognitionEnd() {
    // If we're in hands-free mode and not speaking/processing, restart listening
    if (this.handsFreeMode &&
        this.currentState !== VOICE_STATES.SPEAKING &&
        this.currentState !== VOICE_STATES.PROCESSING &&
        !this.isProcessing) {
      this._scheduleAutoRestart();
    } else {
      this._setState(VOICE_STATES.IDLE);
    }
  }

  _handleTTSStart(utteranceId) {
    this._setState(VOICE_STATES.SPEAKING, { utteranceId });
  }

  _handleTTSEnd(utteranceId) {
    // If in hands-free mode, resume listening after TTS completes
    if (this.handsFreeMode) {
      this._scheduleAutoRestart();
    } else {
      this._setState(VOICE_STATES.IDLE);
    }
  }

  _handleTTSError(error, utteranceId) {
    console.error('TTS error:', error);
    this._setState(VOICE_STATES.ERROR, { error: error.message });
    setTimeout(() => this._setState(VOICE_STATES.IDLE), 2000);
  }

  _scheduleAutoRestart() {
    if (this.autoRestartTimer) {
      clearTimeout(this.autoRestartTimer);
    }

    this.autoRestartTimer = setTimeout(() => {
      if (this.handsFreeMode &&
          this.currentState !== VOICE_STATES.SPEAKING &&
          this.currentState !== VOICE_STATES.PROCESSING &&
          !this.isProcessing) {
        this.startListening();
      }
    }, this.options.autoRestartDelay);
  }

  _cancelAutoRestart() {
    if (this.autoRestartTimer) {
      clearTimeout(this.autoRestartTimer);
      this.autoRestartTimer = null;
    }
  }

  // Public API

  startListening() {
    if (this.currentState === VOICE_STATES.SPEAKING) {
      // Barge-in: stop TTS and start listening
      this.tts.cancel();
      // Wait a bit for TTS to stop, then start recognition
      setTimeout(() => this._doStartListening(), 100);
      return;
    }

    this._doStartListening();
  }

  _doStartListening() {
    const result = this.recognitionManager.start();
    if (!result.success) {
      this.stateManager.addNotification({
        type: 'error',
        title: 'Voice Input Error',
        message: result.error || 'Failed to start listening'
      });
    }
  }

  stopListening() {
    this._cancelAutoRestart();
    this.recognitionManager.stop();
  }

  pause() {
    this._cancelAutoRestart();
    this.stopListening();
    this.tts.cancel();
    this._setState(VOICE_STATES.PAUSED);
  }

  resume() {
    if (this.currentState === VOICE_STATES.PAUSED) {
      this._setState(VOICE_STATES.IDLE);
      if (this.handsFreeMode) {
        this.startListening();
      }
    }
  }

  speak(text, utteranceId = null) {
    // Stop listening while speaking (prevent feedback loop)
    if (this.currentState === VOICE_STATES.LISTENING) {
      this.stopListening();
    }

    this._cancelAutoRestart();
    return this.tts.speak(text, utteranceId);
  }

  stopSpeaking() {
    this.tts.cancel();
  }

  toggleHandsFree() {
    this.handsFreeMode = !this.handsFreeMode;
    this.stateManager.set('settings.handsFreeEnabled', this.handsFreeMode);

    if (this.handsFreeMode) {
      this.startListening();
    } else {
      this.pause();
    }

    return this.handsFreeMode;
  }

  setHandsFree(enabled) {
    this.handsFreeMode = enabled;
    this.stateManager.set('settings.handsFreeEnabled', enabled);

    if (enabled) {
      this.startListening();
    } else {
      this.pause();
    }
  }

  getState() {
    return this.currentState;
  }

  getHandsFreeMode() {
    return this.handsFreeMode;
  }

  getWakeWordMode() {
    return this.wakeWordMode;
  }

  isListening() {
    return this.currentState === VOICE_STATES.LISTENING ||
           this.currentState === VOICE_STATES.REQUESTING_PERMISSION;
  }

  isSpeaking() {
    return this.currentState === VOICE_STATES.SPEAKING;
  }

  isProcessing() {
    return this.currentState === VOICE_STATES.PROCESSING;
  }

  getInterimTranscript() {
    return this.recognitionManager.getInterimTranscript();
  }

  destroy() {
    this._cancelAutoRestart();
    if (this._settingsUnsub) this._settingsUnsub();
    if (this._wakeWordUnsub) this._wakeWordUnsub();
    if (this._rateUnsub) this._rateUnsub();
    if (this._voiceUnsub) this._voiceUnsub();
    if (this.recognitionManager) this.recognitionManager.destroy();
    if (this.tts) this.tts.destroy();
    if (this.wakeWordDetector) this.wakeWordDetector.destroy();
  }
}