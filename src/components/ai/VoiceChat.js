export class VoiceChat {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.container = null;
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.synthesis = window.speechSynthesis;
    this.voice = null;
    this.unsubscribes = [];
    this.lastEmotion = null;
    this.emotionUpdateInterval = null;
  }

  mount(container) {
    this.container = container;
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
    this.render();
    this.setupEvents();
    this.startEmotionMonitoring();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateUI();
      this.stateManager.addNotification({
        type: 'info',
        title: 'Listening...',
        message: 'Speak now',
        duration: 3000
      });
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      this.updateInterimText(interimTranscript);

      if (finalTranscript) {
        this.handleVoiceInput(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      this.updateUI();

      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.stateManager.addNotification({
          type: 'error',
          title: 'Voice Input Error',
          message: `Could not recognize speech: ${event.error}`
        });
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateUI();
    };
  }

  initSpeechSynthesis() {
    if (!this.synthesis) {
      console.warn('Speech Synthesis not supported in this browser');
      return;
    }

    // Wait for voices to load
    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      // Prefer a natural-sounding English voice
      this.voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                   voices.find(v => v.lang.startsWith('en') && v.name.includes('Microsoft')) ||
                   voices.find(v => v.lang.startsWith('en')) ||
                   voices[0];
    };

    loadVoices();
    this.synthesis.onvoiceschanged = loadVoices;
  }

  startEmotionMonitoring() {
    // Monitor emotion changes from camera and update live display
    this.emotionUpdateInterval = setInterval(() => {
      const predictedMood = this.stateManager.get('mood.predicted');
      const predictedConfidence = this.stateManager.get('mood.predictedConfidence');
      const faceDetected = this.stateManager.get('expression.faceDetected');
      const conversationalMood = this.stateManager.get('mood.conversational');

      const hasChanged = this.lastEmotion?.mood !== predictedMood ||
                        this.lastEmotion?.confidence !== predictedConfidence;

      if (hasChanged && faceDetected && predictedConfidence > 0.3) {
        this.lastEmotion = { mood: predictedMood, confidence: predictedConfidence };
        this.updateLiveEmotionDisplay(predictedMood, predictedConfidence);
      }

      // If no face detected, clear live emotion
      if (!faceDetected && this.lastEmotion) {
        this.lastEmotion = null;
        this.updateLiveEmotionDisplay(null, 0);
      }
    }, 500);
  }

  updateLiveEmotionDisplay(mood, confidence) {
    const indicator = this.container?.querySelector('#live-emotion-indicator');
    const label = this.container?.querySelector('#live-emotion-label');
    const confidenceEl = this.container?.querySelector('#live-emotion-confidence');

    if (!indicator) return;

    const MOOD_EMOJIS = {
      happy: '😊', sad: '😢', angry: '😠',
      surprised: '😲', neutral: '😐', confused: '😕', tired: '😴'
    };

    const MOOD_LABELS = {
      happy: 'Happy', sad: 'Sad', angry: 'Angry',
      surprised: 'Surprised', neutral: 'Neutral', confused: 'Confused', tired: 'Tired'
    };

    if (mood && confidence > 0.3) {
      indicator.textContent = MOOD_EMOJIS[mood] || '😐';
      label.textContent = `Live: ${MOOD_LABELS[mood] || mood}`;
      confidenceEl.textContent = `${Math.round(confidence * 100)}%`;
      indicator.classList.add('animate-bounce-gentle');
    } else {
      indicator.textContent = '😐';
      label.textContent = 'Live: Waiting for face...';
      confidenceEl.textContent = '--';
      indicator.classList.remove('animate-bounce-gentle');
    }
  }

  handleVoiceInput(text) {
    // Add user message
    this.stateManager.addMessage({
      role: 'user',
      content: text,
      timestamp: Date.now()
    });

    // Clear interim text
    this.updateInterimText('');

    // Send to AI
    const chatInterface = window.moodCompanion?.app?.currentPageComponent?.components?.chatInterface;
    if (chatInterface && typeof chatInterface.sendMessage === 'function') {
      // We already added the message, so trigger AI response
      chatInterface.getAIResponse(text).then(response => {
        chatInterface.stateManager.setTyping(false);
        chatInterface.stateManager.addMessage({
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        });
        chatInterface.render();
        chatInterface.scrollToBottom();

        // Speak the response if TTS enabled
        if (this.stateManager.get('settings.ttsEnabled')) {
          this.speak(response);
        }
      });
    } else {
      // Fallback: trigger via chat container
      const sendEvent = new CustomEvent('voice-input', { detail: { text } });
      document.dispatchEvent(sendEvent);
    }
  }

  speak(text) {
    if (!this.synthesis || !this.stateManager.get('settings.ttsEnabled')) return;

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.updateUI();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.updateUI();
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      this.isSpeaking = false;
      this.updateUI();
    };

    this.synthesis.speak(utterance);
  }

  toggleListening() {
    if (!this.recognition) {
      this.stateManager.addNotification({
        type: 'error',
        title: 'Not Supported',
        message: 'Speech recognition is not available in this browser'
      });
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.updateUI();
    }
  }

  updateInterimText(text) {
    const interimEl = this.container?.querySelector('#voice-interim-text');
    if (interimEl) {
      interimEl.textContent = text;
      interimEl.style.display = text ? 'block' : 'none';
    }
  }

  updateUI() {
    const listenBtn = this.container?.querySelector('#voice-listen-btn');
    const speakBtn = this.container?.querySelector('#voice-speak-btn');
    const statusEl = this.container?.querySelector('#voice-status');

    if (listenBtn) {
      listenBtn.classList.toggle('bg-red-500', this.isListening);
      listenBtn.classList.toggle('bg-primary-500', !this.isListening);
      listenBtn.setAttribute('aria-label', this.isListening ? 'Stop listening' : 'Start listening');
      listenBtn.innerHTML = this.isListening
        ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
        : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6zm-6 0a3 3 0 01-3-3V5a3 3 0 116 0v6z"></path></svg>';
    }

    if (speakBtn) {
      speakBtn.classList.toggle('bg-red-500', this.isSpeaking);
      speakBtn.classList.toggle('bg-green-500', !this.isSpeaking);
      speakBtn.setAttribute('aria-label', this.isSpeaking ? 'Stop speaking' : 'Speak last message');
      speakBtn.innerHTML = this.isSpeaking
        ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
        : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5.586l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L6.586 15z"></path></svg>';
    }

    if (statusEl) {
      if (this.isListening) {
        statusEl.textContent = 'Listening...';
        statusEl.className = 'text-sm text-red-500 animate-pulse';
      } else if (this.isSpeaking) {
        statusEl.textContent = 'Speaking...';
        statusEl.className = 'text-sm text-green-500';
      } else {
        statusEl.textContent = 'Ready';
        statusEl.className = 'text-sm text-muted';
      }
    }
  }

  render() {
    if (!this.container) return;

    const ttsEnabled = this.stateManager.get('settings.ttsEnabled');
    const sttEnabled = this.stateManager.get('settings.sttEnabled');

    this.container.innerHTML = `
      <div class="voice-chat-panel glass rounded-2xl p-4 border border-lavender-200/50 dark:border-primary-800/50" id="voice-chat-panel">
        <!-- Live Emotion Display -->
        <div class="mb-4 p-3 rounded-xl bg-primary-500/10 border border-primary-200/50 dark:border-primary-800/50">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-3xl" id="live-emotion-indicator">😐</div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-primary-900 dark:text-primary-100" id="live-emotion-label">Live: Waiting for face...</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-muted">Confidence:</span>
                <span class="text-xs font-mono text-primary-700 dark:text-primary-300" id="live-emotion-confidence">--</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Voice Controls -->
        <div class="space-y-3">
          <!-- Speech-to-Text -->
          <div class="flex items-center gap-3 p-3 rounded-xl glass ${sttEnabled ? '' : 'opacity-50'}">
            <div class="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6zm-6 0a3 3 0 01-3-3V5a3 3 0 116 0v6z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-primary-900 dark:text-primary-100">Voice Input</p>
              <p class="text-sm text-muted">Click to speak your message</p>
            </div>
            <button id="voice-listen-btn" class="btn btn-primary p-3 rounded-xl transition-colors ${!sttEnabled ? 'opacity-50 cursor-not-allowed' : ''}" ${!sttEnabled ? 'disabled' : ''} aria-label="Start listening">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6zm-6 0a3 3 0 01-3-3V5a3 3 0 116 0v6z"></path></svg>
            </button>
          </div>

          <!-- Interim transcript -->
          <div id="voice-interim-text" class="hidden p-3 rounded-xl bg-lavender-50 dark:bg-primary-900/30 text-sm text-primary-700 dark:text-lavender-200 min-h-[1.5rem]"></div>

          <!-- Text-to-Speech -->
          <div class="flex items-center gap-3 p-3 rounded-xl glass ${ttsEnabled ? '' : 'opacity-50'}">
            <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5.586l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L6.586 15z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-primary-900 dark:text-primary-100">Voice Output</p>
              <p class="text-sm text-muted">AI responses will be spoken aloud</p>
            </div>
            <button id="voice-speak-btn" class="btn btn-success p-3 rounded-xl transition-colors ${!ttsEnabled ? 'opacity-50 cursor-not-allowed' : ''}" ${!ttsEnabled ? 'disabled' : ''} aria-label="Speak last message">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5.586l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L6.586 15z"></path></svg>
            </button>
          </div>

          <!-- Status -->
          <div class="flex items-center justify-between p-2 rounded-lg bg-lavender-50 dark:bg-primary-900/30">
            <span class="text-xs text-muted">Status:</span>
            <span class="text-sm font-medium text-muted" id="voice-status">Ready</span>
          </div>
        </div>

        <!-- Voice Settings Hint -->
        <div class="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/50">
          <p class="text-sm text-amber-800 dark:text-amber-200">
            <strong>Tip:</strong> Enable camera for live emotion detection. The AI will adapt its tone based on your facial expression in real-time.
          </p>
        </div>
      </div>
    `;
  }

  setupEvents() {
    if (!this.container) return;

    // Listen button
    const listenBtn = this.container.querySelector('#voice-listen-btn');
    if (listenBtn) {
      listenBtn.addEventListener('click', () => this.toggleListening());
    }

    // Speak button
    const speakBtn = this.container.querySelector('#voice-speak-btn');
    if (speakBtn) {
      speakBtn.addEventListener('click', () => {
        if (this.isSpeaking) {
          this.stopSpeaking();
        } else {
          // Speak last AI message
          const messages = this.stateManager.get('chat.messages') || [];
          const lastAI = messages.filter(m => m.role === 'assistant').pop();
          if (lastAI) {
            this.speak(lastAI.content);
          } else {
            this.stateManager.addNotification({
              type: 'info',
              title: 'Nothing to Speak',
              message: 'No AI response yet to read aloud'
            });
          }
        }
      });
    }

    // Listen for settings changes
    this.unsubscribes.push(
      this.stateManager.on('settings.ttsEnabled.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('settings.sttEnabled.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('settings.voiceEnabled.change', () => this.render())
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
    if (this.recognition) {
      this.recognition.stop();
    }
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    if (this.emotionUpdateInterval) {
      clearInterval(this.emotionUpdateInterval);
    }
  }
}