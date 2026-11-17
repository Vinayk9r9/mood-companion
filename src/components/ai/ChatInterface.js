import { PERSONALITIES } from '../../utils/personalities.js';
import { VoiceStateMachine, VOICE_STATES } from '../../utils/VoiceStateMachine.js';
import { EmotionContextManager } from '../../utils/EmotionContextManager.js';
import { CapabilityExecutor } from '../../utils/CapabilityExecutor.js';

const MOOD_RESPONSE_GUIDES = {
  happy: `The user is feeling happy. Celebrate with them! Share exciting ideas, suggest enjoyable activities, ask what made them happy. Match their positive energy.`,
  sad: `The user is feeling sad. Respond with empathy. Offer support without forcing positivity. Listen without judgment. You can offer a joke if they want humor, or suggest relaxing activities.`,
  angry: `The user is feeling angry. Remain calm. Help identify the source of frustration. Suggest taking a break. Offer constructive problem-solving. Don't be dismissive.`,
  surprised: `The user is feeling surprised. Show curiosity. Encourage storytelling. React naturally to unexpected events. Ask what happened.`,
  confused: `The user is feeling confused. Explain things clearly. Break problems into manageable steps. Ask clarifying questions. Provide examples. Be patient.`,
  tired: `The user is feeling tired. Keep responses concise. Suggest manageable tasks. Help organize priorities. Encourage reasonable breaks. Don't overwhelm them.`,
  neutral: `The user is feeling neutral. Start casual conversations. Suggest interesting topics. Offer assistance with everyday activities. Be friendly but not overwhelming.`
};

export class ChatInterface {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.container = null;
    this.messagesContainer = null;
    this.inputContainer = null;
    this.unsubscribes = [];
    this.isTyping = false;
    this.typingInterval = null;

    // Voice state machine (replaces duplicate STT/TTS code)
    this.voiceStateMachine = null;
    this.voiceState = VOICE_STATES.IDLE;
    this.interimTranscript = '';

    // Emotion context manager
    this.emotionContextManager = null;

    // Capability executor
    this.capabilityExecutor = null;
  }

  mount(container) {
    this.container = container;
    this._initEmotionContextManager();
    this._initVoiceStateMachine();
    this._initCapabilityExecutor();
    this.render();
    this.setupEvents();
    this.scrollToBottom();
  }

  _initEmotionContextManager() {
    this.emotionContextManager = new EmotionContextManager(this.stateManager);
  }

  _initCapabilityExecutor() {
    this.capabilityExecutor = new CapabilityExecutor(this.stateManager);
  }

  _initVoiceStateMachine() {
    this.voiceStateMachine = new VoiceStateMachine(this.stateManager, {
      handsFreeEnabled: this.stateManager.get('settings.handsFreeEnabled') || false,
      onStateChange: (state, meta) => this._onVoiceStateChange(state, meta),
      onInterimTranscript: (transcript) => this._onInterimTranscript(transcript),
      onTranscript: (finalTranscript) => this._onFinalTranscript(finalTranscript),
      onError: (error, shouldNotify) => this._onVoiceError(error, shouldNotify),
      onUserMessage: (message) => this._onUserMessage(message),
      onAIResponse: (response) => this._onAIResponse(response)
    });
  }

  _onVoiceStateChange(state, meta) {
    this.voiceState = state;
    this._updateVoiceUI(state, meta);
  }

  _onInterimTranscript(transcript) {
    this.interimTranscript = transcript;
    this._updateInterimDisplay(transcript);
  }

  _onFinalTranscript(finalTranscript) {
    this.interimTranscript = '';
    this._updateInterimDisplay('');
    // VoiceStateMachine handles sending to AI via onUserMessage callback
  }

  _onVoiceError(error, shouldNotify) {
    // Error notifications handled by VoiceStateMachine
  }

  async _onUserMessage(message) {
    try {
      await this.sendMessage(message);
    } catch (error) {
      console.error('Voice message submission failed:', error);
    }
  }

  _onAIResponse(response) {
    // Auto-speak handled in sendMessage after response received
  }

  _updateVoiceUI(state, meta) {
    if (!this.container) return;

    const voiceBtn = this.container.querySelector('#voice-input-btn');
    const sendBtn = this.container.querySelector('#send-btn');
    const input = this.container.querySelector('#message-input');
    const statusEl = this.container.querySelector('#voice-status');

    const isListening = state === VOICE_STATES.LISTENING || state === VOICE_STATES.REQUESTING_PERMISSION;
    const isSpeaking = state === VOICE_STATES.SPEAKING;
    const isProcessing = state === VOICE_STATES.PROCESSING;

    // Update voice button
    if (voiceBtn) {
      voiceBtn.classList.toggle('bg-red-500', isListening);
      voiceBtn.classList.toggle('text-white', isListening);
      voiceBtn.classList.toggle('bg-primary-500', !isListening);
      voiceBtn.classList.toggle('hover:bg-primary-600', !isListening);
      voiceBtn.setAttribute('aria-label', isListening ? 'Stop listening' : 'Start voice input');
      voiceBtn.setAttribute('aria-pressed', isListening.toString());
      voiceBtn.innerHTML = isListening
        ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
        : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6zm-6 0a3 3 0 01-3-3V5a3 3 0 116 0v6z"></path></svg>';
    }

    // Update input area
    if (input) {
      input.classList.toggle('bg-primary-50', isListening);
      input.classList.toggle('dark:bg-primary-900/30', isListening);
      input.classList.toggle('ring-2', isListening);
      input.classList.toggle('ring-primary-500/30', isListening);
      input.placeholder = isListening ? 'Listening...' : 'Type a message...';
    }

    // Update status
    if (statusEl) {
      if (isListening) {
        statusEl.textContent = 'Listening...';
        statusEl.className = 'text-sm text-red-500 animate-pulse';
      } else if (isSpeaking) {
        statusEl.textContent = 'Speaking...';
        statusEl.className = 'text-sm text-green-500';
      } else if (isProcessing) {
        statusEl.textContent = 'Processing...';
        statusEl.className = 'text-sm text-amber-500 animate-pulse';
      } else if (state === VOICE_STATES.PAUSED) {
        statusEl.textContent = 'Paused';
        statusEl.className = 'text-sm text-muted';
      } else if (state === VOICE_STATES.ERROR) {
        statusEl.textContent = 'Error';
        statusEl.className = 'text-sm text-red-500';
      } else {
        statusEl.textContent = 'Ready';
        statusEl.className = 'text-sm text-muted';
      }
    }

    // Update speak buttons for AI messages
    this._updateAllSpeakButtons();
  }

  _updateInterimDisplay(transcript) {
    if (!this.container) return;

    const interimEl = this.container.querySelector('#interim-transcript');
    const input = this.container.querySelector('#message-input');
    const sendBtn = this.container.querySelector('#send-btn');

    if (interimEl) {
      interimEl.textContent = transcript;
      interimEl.style.display = transcript ? 'block' : 'none';
    }

    // Update textarea with interim transcript
    if (input && transcript) {
      input.value = transcript;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  _updateAllSpeakButtons() {
    if (!this.container) return;

    const isSpeaking = this.voiceState === VOICE_STATES.SPEAKING;
    const currentUtteranceId = this.voiceStateMachine?.tts?.currentUtteranceId;

    this.container.querySelectorAll('.speak-btn').forEach(btn => {
      const messageId = btn.getAttribute('data-message-id');
      const isCurrent = isSpeaking && currentUtteranceId === messageId;

      if (isCurrent) {
        btn.classList.add('bg-primary-500/20');
        btn.innerHTML = '<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
        btn.setAttribute('aria-label', 'Stop speaking');
      } else {
        btn.classList.remove('bg-primary-500/20');
        btn.innerHTML = '<svg class="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5.586l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L6.586 15z"></path></svg>';
        btn.setAttribute('aria-label', 'Speak this message');
      }
    });
  }

  render() {
    if (!this.container) return;

    const messages = this.stateManager.get('chat.messages');
    const personality = this.stateManager.get('chat.personality');
    const isTyping = this.stateManager.get('chat.isTyping');
    const sttEnabled = this.stateManager.get('settings.sttEnabled');
    const ttsEnabled = this.stateManager.get('settings.ttsEnabled');
    const speechRecognitionSupported = this.isSpeechRecognitionSupported();
    const handsFreeEnabled = this.stateManager.get('settings.handsFreeEnabled');

    this.container.innerHTML = `
      <div class="flex flex-col h-full">
        <!-- Messages Area -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4" id="messages-container" role="log" aria-live="polite" aria-label="Chat messages">
          ${messages.length === 0 ? this.renderWelcomeMessage() : messages.map(msg => this.renderMessage(msg)).join('')}

          <!-- Typing Indicator -->
          ${isTyping ? this.renderTypingIndicator() : ''}
        </div>

        <!-- Input Area -->
        <div class="p-4 border-t border-lavender-200/50 dark:border-primary-800/50" id="input-container">
          <div class="flex items-end gap-3">
            <div class="flex-1 relative">
              <textarea
                id="message-input"
                class="input pr-20 min-h-[48px] max-h-[120px] resize-none ${this.voiceState === VOICE_STATES.LISTENING ? 'bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500/30' : ''}"
                placeholder="${this.voiceState === VOICE_STATES.LISTENING ? 'Listening...' : 'Type a message...'}"
                rows="1"
                aria-label="Message input"
              ></textarea>
              <div class="absolute right-3 bottom-2 flex items-center gap-1">
                ${sttEnabled && speechRecognitionSupported ? `
                  <button
                    id="voice-input-btn"
                    class="p-2 rounded-xl transition-colors ${this.voiceState === VOICE_STATES.LISTENING ? 'bg-red-500 text-white animate-pulse' : 'bg-primary-500 text-white hover:bg-primary-600'}"
                    aria-label="${this.voiceState === VOICE_STATES.LISTENING ? 'Stop listening' : 'Start voice input'}"
                    aria-pressed="${this.voiceState === VOICE_STATES.LISTENING}"
                  >
                    ${this.voiceState === VOICE_STATES.LISTENING
                      ? '<svg class="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                      : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6zm-6 0a3 3 0 01-3-3V5a3 3 0 116 0v6z"></path></svg>'
                    }
                  </button>
                ` : ''}
                <button id="send-btn" class="p-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled aria-label="Send message">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Interim transcription display -->
          ${this.voiceState === VOICE_STATES.LISTENING && this.interimTranscript ? `
            <div id="interim-transcript" class="mt-2 p-2 rounded-xl bg-lavender-100 dark:bg-primary-900/30 text-sm text-primary-700 dark:text-lavender-200 animate-fade-in">
              ${this.escapeHtml(this.interimTranscript)}
            </div>
          ` : ''}

          <!-- Voice Status & Global Stop Speaking -->
          <div class="flex items-center justify-between mt-2">
            <p class="text-xs text-muted text-center">
              Press Enter to send, Shift+Enter for new line ${sttEnabled && speechRecognitionSupported ? '| Click mic for voice input' : ''}
              ${handsFreeEnabled ? ' | Hands-free: ON' : ''}
            </p>
            <div class="flex items-center gap-2">
              <span id="voice-status" class="text-sm font-medium text-muted">Ready</span>
              ${this.voiceState === VOICE_STATES.SPEAKING ? `
                <button id="global-stop-speaking" class="btn btn-danger btn-sm" aria-label="Stop speaking">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  Stop
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    this.messagesContainer = this.container.querySelector('#messages-container');
    this.inputContainer = this.container.querySelector('#input-container');

    // Re-attach event listeners after render
    this.setupInputEvents();

    // Scroll to bottom
    this.scrollToBottom();
  }

  renderWelcomeMessage() {
    const personality = this.stateManager.get('chat.personality');
    const personalityConfig = PERSONALITIES[personality] || PERSONALITIES['calm-listener'];
    const mood = this.stateManager.get('mood.conversational');

    const welcomeMessages = {
      'funny-friend': [
        "Hey there! 😄 Ready for some laughs? Ask me for a joke, a fun fact, or just tell me about your day!",
        "Hello! I'm your new funny friend. What's the funniest thing that happened to you recently?",
        "Hi! 🎉 I've got jokes, facts, and terrible puns. What'll it be today?"
      ],
      'motivational-coach': [
        "Hello champion! 💪 What goal are we crushing today? Let's make something amazing happen!",
        "Hey! Ready to level up? Tell me what you're working on and I'll help you break it down.",
        "Welcome! 🌟 Every big achievement starts with a small step. What's your first step today?"
      ],
      'calm-listener': [
        "Hello. 🤗 I'm here to listen. Whatever's on your mind, you can share it with me.",
        "Hi there. Take your time. There's no pressure here - just a space for you to be heard.",
        "Welcome. 🌿 How are you feeling right now? I'm here for whatever you need."
      ],
      'productivity-assistant': [
        "Hello! 📋 Ready to get organized? I can help with tasks, priorities, and planning.",
        "Hi! Let's make today productive. What's on your plate? I'll help you sort through it.",
        "Welcome! 🎯 What's the most important thing you need to accomplish today?"
      ]
    };

    const welcomes = welcomeMessages[personality] || welcomeMessages['calm-listener'];
    const welcome = welcomes[Math.floor(Math.random() * welcomes.length)];

    return `
      <div class="flex justify-start animate-fade-in">
        <div class="message-bubble message-ai max-w-[85%]">
          <p class="whitespace-pre-wrap">${this.escapeHtml(welcome)}</p>
          <span class="text-[10px] opacity-60 mt-1 block text-right">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    `;
  }

  renderMessage(message) {
    const isUser = message.role === 'user';
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ttsEnabled = this.stateManager.get('settings.ttsEnabled');

    if (isUser) {
      return `
        <div class="flex justify-end animate-fade-in" data-message-id="${message.id}">
          <div class="message-bubble message-user max-w-[85%]">
            <p class="whitespace-pre-wrap">${this.escapeHtml(message.content)}</p>
            <span class="text-[10px] opacity-60 mt-1 block text-right">${time}</span>
          </div>
        </div>
      `;
    }

    // AI message with speaker button
    const isSpeaking = this.voiceState === VOICE_STATES.SPEAKING;
    const currentUtteranceId = this.voiceStateMachine?.tts?.currentUtteranceId;
    const isCurrentSpeaking = isSpeaking && currentUtteranceId === message.id;

    return `
      <div class="flex justify-start animate-fade-in" data-message-id="${message.id}">
        <div class="message-bubble message-ai max-w-[85%] relative">
          <p class="whitespace-pre-wrap pr-12">${this.escapeHtml(message.content)}</p>
          <div class="flex items-center justify-between mt-1">
            <span class="text-[10px] opacity-60">${time}</span>
            ${ttsEnabled && this.voiceStateMachine?.tts?.isSupported() ? `
              <button
                class="speak-btn p-1.5 rounded-lg transition-colors hover:bg-primary-100 dark:hover:bg-primary-800 ${isCurrentSpeaking ? 'bg-primary-500/20' : ''}"
                data-message-id="${message.id}"
                aria-label="${isCurrentSpeaking ? 'Stop speaking' : 'Speak this message'}"
              >
                ${isCurrentSpeaking
                  ? '<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                  : '<svg class="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5.586l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L6.586 15z"></path></svg>'
                }
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderTypingIndicator() {
    const personality = this.stateManager.get('chat.personality');
    const personalityConfig = PERSONALITIES[personality] || PERSONALITIES['calm-listener'];

    return `
      <div class="flex justify-start animate-fade-in" id="typing-indicator">
        <div class="message-bubble message-ai">
          <div class="flex items-center gap-2">
            <div class="flex gap-1">
              <div class="typing-dot" style="background: ${this.getColorFromGradient(personalityConfig.color)}"></div>
              <div class="typing-dot" style="background: ${this.getColorFromGradient(personalityConfig.color)}"></div>
              <div class="typing-dot" style="background: ${this.getColorFromGradient(personalityConfig.color)}"></div>
            </div>
            <span class="text-xs text-muted ml-1">${personalityConfig.name} is typing...</span>
          </div>
        </div>
      </div>
    `;
  }

  getColorFromGradient(gradient) {
    const match = gradient.match(/from-(\w+-\d+)/);
    if (match) {
      const colorMap = {
        'yellow-400': '#facc15',
        'orange-400': '#fb923c',
        'red-400': '#f87171',
        'red-600': '#dc2626',
        'blue-400': '#60a5fa',
        'indigo-500': '#818cf8',
        'green-400': '#4ade80',
        'teal-500': '#2dd4bf'
      };
      return colorMap[match[1]] || '#844eff';
    }
    return '#844eff';
  }

  setupEvents() {
    if (!this.container) return;

    this.setupInputEvents();

    // Listen for settings changes
    this.unsubscribes.push(
      this.stateManager.on('settings.ttsEnabled.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('settings.sttEnabled.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('settings.handsFreeEnabled.change', () => {
        if (this.voiceStateMachine) {
          this.voiceStateMachine.setHandsFree(this.stateManager.get('settings.handsFreeEnabled'));
        }
        this.render();
      })
    );
  }

  isSpeechRecognitionSupported() {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  setupInputEvents() {
    const input = this.container.querySelector('#message-input');
    const sendBtn = this.container.querySelector('#send-btn');
    const voiceBtn = this.container.querySelector('#voice-input-btn');

    if (input) {
      // Auto-resize textarea
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        sendBtn.disabled = !input.value.trim();
      });

      // Handle Enter key
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (input.value.trim() && !sendBtn.disabled) {
            this.sendMessage(input.value.trim());
            input.value = '';
            input.style.height = 'auto';
            sendBtn.disabled = true;
          }
        }
      });

      // Focus on mount
      setTimeout(() => input.focus(), 100);
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (input.value.trim()) {
          this.sendMessage(input.value.trim());
          input.value = '';
          input.style.height = 'auto';
          sendBtn.disabled = true;
          input.focus();
        }
      });
    }

    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        if (this.voiceStateMachine) {
          if (this.voiceStateMachine.isListening()) {
            this.voiceStateMachine.stopListening();
          } else {
            this.voiceStateMachine.startListening();
          }
        }
      });
    }

    // Speak buttons for AI messages
    this.container.querySelectorAll('.speak-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const messageId = btn.getAttribute('data-message-id');
        const message = this.stateManager.get('chat.messages').find(m => m.id === messageId);
        if (message && message.role === 'assistant' && this.voiceStateMachine) {
          if (this.voiceStateMachine.isSpeaking() && this.voiceStateMachine.tts.currentUtteranceId === messageId) {
            this.voiceStateMachine.stopSpeaking();
          } else {
            this.voiceStateMachine.speak(message.content, messageId);
          }
        }
      });
    });

    // Global stop speaking button
    const stopSpeakingBtn = this.container.querySelector('#global-stop-speaking');
    if (stopSpeakingBtn) {
      stopSpeakingBtn.addEventListener('click', () => {
        if (this.voiceStateMachine) {
          this.voiceStateMachine.stopSpeaking();
        }
      });
    }
  }

  async sendMessage(content) {
    // Add user message
    this.stateManager.addMessage({
      role: 'user',
      content,
      timestamp: Date.now()
    });

    // Re-render to show user message
    this.render();
    this.scrollToBottom();

    // Show typing indicator
    this.stateManager.setTyping(true);
    this.render();
    this.scrollToBottom();

    // Get AI response
    try {
      const response = await this.getAIResponse(content);

      // Hide typing
      this.stateManager.setTyping(false);

      // Add AI response
      const newMessage = this.stateManager.addMessage({
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });

      this.render();
      this.scrollToBottom();

      // Auto-speak if TTS enabled
      if (this.stateManager.get('settings.ttsEnabled') && this.voiceStateMachine?.tts?.isSupported()) {
        const messages = this.stateManager.get('chat.messages');
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          setTimeout(() => this.voiceStateMachine.speak(lastMessage.content, lastMessage.id), 100);
        }
      }
    } catch (error) {
      console.error('AI response error:', error);
      this.stateManager.setTyping(false);

      // Show error notification but don't add fake response
      this.stateManager.addNotification({
        type: 'error',
        title: 'Failed to Get Response',
        message: error.message || 'Could not get AI response. Please try again.',
        duration: 0
      });

      this.render();
      this.scrollToBottom();
    }
  }

  async getAIResponse(userMessage) {
    const personality = this.stateManager.get('chat.personality');
    const messages = this.stateManager.get('chat.messages');

    // Get enriched emotion context
    const emotionContext = this.emotionContextManager?.getContext() || {};
    const aiSummary = this.emotionContextManager?.getAISummary() || '';
    const capabilities = this.capabilityExecutor?.getCapabilitiesForAI() || '';

    // Build conversation history (excluding the user message we just added)
    const recentMessages = messages.slice(-11, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Build enhanced mood context object for backend
    const moodContext = {
      expression: emotionContext.primaryMood || 'neutral',
      confidence: emotionContext.confidence || 0,
      confirmedMood: emotionContext.userConfirmed,
      source: emotionContext.source || 'inferred',
      // Enhanced context
      aiSummary,
      facial: emotionContext.facial,
      vocal: emotionContext.vocal,
      speech: emotionContext.speech,
      dataAvailability: emotionContext.dataAvailability
    };

    // Use backend API with capability descriptions
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        personality: personality,
        mood: moodContext,
        history: recentMessages,
        capabilities: capabilities
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.warning) {
        this.stateManager.addNotification({
          type: 'warning',
          title: 'DEMO Mode Active',
          message: data.warning
        });
      }
      return data.response;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('API error:', response.status, errorData);

      let errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
      if (errorData.type) {
        switch (errorData.type) {
          case 'invalid_api_key':
            errorMessage = 'Invalid API key. Please check your GEMINI_API_KEY configuration.';
            break;
          case 'rate_limit':
            errorMessage = 'Rate limit exceeded. Please wait before sending more messages.';
            break;
          case 'model_not_found':
            errorMessage = 'AI model not available. Please check configuration.';
            break;
          case 'network_error':
            errorMessage = 'Network error. Please check your connection and try again.';
            break;
        }
      }

      throw new Error(errorMessage);
    }
  }

  generateSimulatedResponse(userMessage, personality, mood) {
    const lowerMessage = userMessage.toLowerCase();

    // Check for mood statements
    const moodKeywords = {
      happy: ['happy', 'joy', 'great', 'awesome', 'wonderful', 'amazing', 'fantastic', 'glad', 'pleased', 'delighted'],
      sad: ['sad', 'down', 'depressed', 'unhappy', 'miserable', 'upset', 'heartbroken', 'grief', 'lonely'],
      angry: ['angry', 'mad', 'furious', 'frustrated', 'annoyed', 'irritated', 'pissed', 'rage', 'livid'],
      surprised: ['surprised', 'shocked', 'stunned', 'amazed', 'astonished', 'unexpected', 'wow', 'omg'],
      confused: ['confused', 'puzzled', 'unclear', 'don\'t understand', 'lost', 'baffled', 'perplexed'],
      tired: ['tired', 'exhausted', 'drained', 'fatigued', 'sleepy', 'worn out', 'burnout', 'weary']
    };

    for (const [moodKey, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(k => lowerMessage.includes(k))) {
        this.stateManager.setExplicitMoodFromStatement(moodKey);
        break;
      }
    }

    // Personality-based responses
    const responses = {
      'funny-friend': [
        "Haha, that's great! 😄 You know what they say - laughter is the best medicine! Want to hear a joke?",
        "Love that energy! Here's a fun fact: Octopuses have three hearts and blue blood. Pretty wild, right?",
        "That's awesome! 🎉 You know, life's too short for boring conversations. What's the most random thing you've seen today?"
      ],
      'motivational-coach': [
        "That's the spirit! 💪 Every step forward counts. What's one small action you can take right now?",
        "I believe in you! 🌟 Let's break this down into manageable pieces. What's the first thing to tackle?",
        "You're doing great! Remember, progress over perfection. What would make today a win for you?"
      ],
      'calm-listener': [
        "Thank you for sharing that with me. 🤗 I'm here to listen. How does that feel for you right now?",
        "I hear you. It's okay to feel that way. Would you like to talk more about it, or would you prefer a distraction?",
        "That sounds really meaningful. Take your time - there's no rush here. 🌿"
      ],
      'productivity-assistant': [
        "Got it! 📋 Let me help you organize that. Can you tell me more about the specific tasks involved?",
        "Good thinking. Let's break this down into actionable steps. What's the highest priority item?",
        "I can help with that. 🎯 Would you like me to suggest a structure or help you prioritize?"
      ]
    };

    const personalityResponses = responses[personality] || responses['calm-listener'];
    return personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      setTimeout(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }, 50);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setupListeners() {
    this.unsubscribes.push(
      this.stateManager.on('chat.messages.change', () => {
        this.render();
      })
    );
    this.unsubscribes.push(
      this.stateManager.on('chat.isTyping.change', () => {
        this.render();
      })
    );
    this.unsubscribes.push(
      this.stateManager.on('settings.ttsEnabled.change', () => {
        this.render();
      })
    );
    this.unsubscribes.push(
      this.stateManager.on('settings.sttEnabled.change', () => {
        this.render();
      })
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
    if (this.typingInterval) clearInterval(this.typingInterval);
    if (this.voiceStateMachine) {
      this.voiceStateMachine.destroy();
      this.voiceStateMachine = null;
    }
    if (this.emotionContextManager) {
      this.emotionContextManager.destroy();
      this.emotionContextManager = null;
    }
  }
}