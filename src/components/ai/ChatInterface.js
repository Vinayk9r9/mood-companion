import { PERSONALITIES } from '../../utils/personalities.js';

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

    // Voice input
    this.recognition = null;
    this.isListening = false;
    this.isRecognitionStarting = false;
    this.interimTranscript = '';

    // Voice output
    this.synthesis = window.speechSynthesis;
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.selectedVoice = null;
    this.speechRate = 1.0;
  }

  mount(container) {
    this.container = container;
    this.initSpeechSynthesis();
    this.render();
    this.setupEvents();
    this.scrollToBottom();
  }

  render() {
    if (!this.container) return;

    const messages = this.stateManager.get('chat.messages');
    const personality = this.stateManager.get('chat.personality');
    const isTyping = this.stateManager.get('chat.isTyping');
    const sttEnabled = this.stateManager.get('settings.sttEnabled');
    const speechRecognitionSupported = this.isSpeechRecognitionSupported();

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
                class="input pr-20 min-h-[48px] max-h-[120px] resize-none ${this.isListening ? 'bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500/30' : ''}"
                placeholder="${this.isListening ? 'Listening...' : 'Type a message...'}"
                rows="1"
                aria-label="Message input"
              ></textarea>
              <div class="absolute right-3 bottom-2 flex items-center gap-1">
                ${sttEnabled && speechRecognitionSupported ? `
                  <button
                    id="voice-input-btn"
                    class="p-2 rounded-xl transition-colors ${this.isListening ? 'bg-red-500 text-white' : 'bg-primary-500 text-white hover:bg-primary-600'}"
                    aria-label="${this.isListening ? 'Stop listening' : 'Start voice input'}"
                    aria-pressed="${this.isListening}"
                  >
                    ${this.isListening
                      ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
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
          ${this.isListening && this.interimTranscript ? `
            <div id="interim-transcript" class="mt-2 p-2 rounded-xl bg-lavender-100 dark:bg-primary-900/30 text-sm text-primary-700 dark:text-lavender-200 animate-fade-in">
              ${this.escapeHtml(this.interimTranscript)}
            </div>
          ` : ''}

          <p class="text-xs text-muted text-center mt-2">Press Enter to send, Shift+Enter for new line ${sttEnabled && speechRecognitionSupported ? '| Click mic for voice input' : ''}</p>
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
    return `
      <div class="flex justify-start animate-fade-in" data-message-id="${message.id}">
        <div class="message-bubble message-ai max-w-[85%] relative">
          <p class="whitespace-pre-wrap pr-12">${this.escapeHtml(message.content)}</p>
          <div class="flex items-center justify-between mt-1">
            <span class="text-[10px] opacity-60">${time}</span>
            ${ttsEnabled && this.synthesis ? `
              <button
                class="speak-btn p-1.5 rounded-lg transition-colors hover:bg-primary-100 dark:hover:bg-primary-800 ${this.isSpeaking && this.currentUtteranceId === message.id ? 'bg-primary-500/20' : ''}"
                data-message-id="${message.id}"
                aria-label="${this.isSpeaking && this.currentUtteranceId === message.id ? 'Stop speaking' : 'Speak this message'}"
              >
                ${this.isSpeaking && this.currentUtteranceId === message.id
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
    // Extract first color from gradient
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
    this.initSpeechRecognition();
  }

  isSpeechRecognitionSupported() {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  initSpeechRecognition() {
    if (!this.isSpeechRecognitionSupported()) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-IN';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
    this.isRecognitionStarting = false;
    this.isListening = true;
    this.interimTranscript = '';
    this.render();
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

      // Update interim display without full re-render
      const interimEl = this.container?.querySelector('#interim-transcript');
      if (interimEl) {
        interimEl.textContent = interimTranscript;
        interimEl.style.display = interimTranscript ? 'block' : 'none';
      }

      // Update textarea with interim transcript
      const input = this.container?.querySelector('#message-input');
      if (input && interimTranscript) {
        input.value = interimTranscript;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        const sendBtn = this.container?.querySelector('#send-btn');
        if (sendBtn) sendBtn.disabled = false;
      }

      if (finalTranscript) {
        this.handleVoiceInput(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isRecognitionStarting = false;
      this.isListening = false;
      this.interimTranscript = '';

      let errorMessage = 'Voice input error';
      switch (event.error) {
        case 'no-speech':
        errorMessage = 'I could not hear any speech. Please check your microphone and try again.';
        break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied.';
          break;
        case 'network':
          errorMessage = 'Network error during recognition.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not allowed.';
          break;
        default:
          errorMessage = `Recognition error: ${event.error}`;
      }

      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.stateManager.addNotification({
          type: 'error',
          title: 'Voice Input Error',
          message: errorMessage
        });
      }

      this.render();
    };

    this.recognition.onend = () => {
      this.isRecognitionStarting = false;
      this.isListening = false;
      this.interimTranscript = '';
      this.render();
    };
  }

  
async handleVoiceInput(finalTranscript) {
  const message = finalTranscript.trim();

  if (!message) return;

  // Prevent duplicate submissions
  if (this.isSendingVoiceMessage) return;

  this.isSendingVoiceMessage = true;

  const input = this.container?.querySelector('#message-input');

  if (input) {
    input.value = '';
    input.style.height = 'auto';
  }

  const interimEl = this.container?.querySelector('#interim-transcript');
  if (interimEl) {
    interimEl.textContent = '';
    interimEl.style.display = 'none';
  }

  const sendBtn = this.container?.querySelector('#send-btn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    await this.sendMessage(message);
  } catch (error) {
    console.error('Voice message submission failed:', error);
  } finally {
    this.isSendingVoiceMessage = false;
  }
}


  toggleListening() {
  if (!this.recognition) {
    console.error('Speech recognition is not initialized.');
    return;
  }

  // Stop an active recognition session
  if (this.isListening) {
    try {
      this.recognition.stop();
    } catch (error) {
      console.warn('Could not stop recognition:', error);
    }
    return;
  }

  // Prevent multiple start() calls before Chrome fires onstart
  if (this.isRecognitionStarting) {
    return;
  }

  this.isRecognitionStarting = true;

  try {
    this.recognition.start();
  } catch (error) {
    this.isRecognitionStarting = false;

    if (error.name === 'InvalidStateError') {
      console.warn('Recognition is already active or stopping.');
    } else {
      console.error('Failed to start recognition:', error);
    }
  }
}

  // Voice Output (TTS) methods
  initSpeechSynthesis() {
    if (!this.synthesis) return;

    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      // Prefer a natural-sounding English voice
      this.selectedVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                           voices.find(v => v.lang.startsWith('en') && v.name.includes('Microsoft')) ||
                           voices.find(v => v.lang.startsWith('en')) ||
                           voices[0];
    };

    loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
  }

  speak(text, messageId) {
    if (!this.synthesis || !this.stateManager.get('settings.ttsEnabled')) return;

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.selectedVoice;
    utterance.rate = this.speechRate;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    this.currentUtterance = utterance;
    this.currentUtteranceId = messageId;
    this.isSpeaking = true;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.updateSpeakButtons(messageId, true);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.currentUtteranceId = null;
      this.updateSpeakButtons(messageId, false);
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.currentUtteranceId = null;
      this.updateSpeakButtons(messageId, false);
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.currentUtteranceId) {
        this.updateSpeakButtons(this.currentUtteranceId, false);
        this.currentUtteranceId = null;
      }
    }
  }

  updateSpeakButtons(messageId, speaking) {
    const buttons = this.container?.querySelectorAll(`[data-message-id="${messageId}"] .speak-btn`);
    buttons?.forEach(btn => {
      if (speaking) {
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
      voiceBtn.addEventListener('click', () => this.toggleListening());
    }

    // Speak buttons for AI messages
    this.container.querySelectorAll('.speak-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const messageId = btn.getAttribute('data-message-id');
        const message = this.stateManager.get('chat.messages').find(m => m.id === messageId);
        if (message && message.role === 'assistant') {
          if (this.isSpeaking && this.currentUtteranceId === messageId) {
            this.stopSpeaking();
          } else {
            this.speak(message.content, messageId);
          }
        }
      });
    });
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
      if (this.stateManager.get('settings.ttsEnabled') && this.synthesis) {
        // Get the message ID that was just added
        const messages = this.stateManager.get('chat.messages');
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          // Small delay to ensure render is complete
          setTimeout(() => this.speak(lastMessage.content, lastMessage.id), 100);
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
        duration: 0 // persistent until dismissed
      });

      this.render();
      this.scrollToBottom();
    }
  }

  async getAIResponse(userMessage) {
    const personality = this.stateManager.get('chat.personality');
    const mood = this.stateManager.get('mood.conversational');
    const predictedMood = this.stateManager.get('mood.predicted');
    const predictedConfidence = this.stateManager.get('mood.predictedConfidence');
    const userConfirmedMood = this.stateManager.get('mood.userConfirmed');
    const messages = this.stateManager.get('chat.messages');

    // Build conversation history (excluding the user message we just added)
    const recentMessages = messages.slice(-11, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Build mood context object for backend
    const moodContext = {
      expression: predictedMood,
      confidence: predictedConfidence,
      confirmedMood: userConfirmedMood,
      source: userConfirmedMood ? 'manual' : (predictedConfidence > 0.6 ? 'camera' : 'inferred')
    };

    // Use backend API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        personality: personality,
        mood: moodContext,
        history: recentMessages
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

      // Handle specific error types
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
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}