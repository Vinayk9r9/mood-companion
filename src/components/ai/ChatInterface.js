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
  }

  mount(container) {
    this.container = container;
    this.render();
    this.setupEvents();
    this.scrollToBottom();
  }

  render() {
    if (!this.container) return;

    const messages = this.stateManager.get('chat.messages');
    const personality = this.stateManager.get('chat.personality');
    const isTyping = this.stateManager.get('chat.isTyping');

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
                class="input pr-12 min-h-[48px] max-h-[120px] resize-none"
                placeholder="Type a message..."
                rows="1"
                aria-label="Message input"
              ></textarea>
              <button id="send-btn" class="absolute right-3 bottom-3 p-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled aria-label="Send message">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </div>
          </div>
          <p class="text-xs text-muted text-center mt-2">Press Enter to send, Shift+Enter for new line</p>
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

    return `
      <div class="flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in" data-message-id="${message.id}">
        <div class="message-bubble ${isUser ? 'message-user' : 'message-ai'} max-w-[85%]">
          <p class="whitespace-pre-wrap">${this.escapeHtml(message.content)}</p>
          <span class="text-[10px] opacity-60 mt-1 block text-right">${time}</span>
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
  }

  setupInputEvents() {
    const input = this.container.querySelector('#message-input');
    const sendBtn = this.container.querySelector('#send-btn');

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
      this.stateManager.addMessage({
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });

      this.render();
      this.scrollToBottom();
    } catch (error) {
      console.error('AI response error:', error);
      this.stateManager.setTyping(false);

      // Fallback response
      this.stateManager.addMessage({
        role: 'assistant',
        content: "I'm having trouble connecting right now. Could you try again in a moment?",
        timestamp: Date.now()
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

    // Try to use backend API if available
    try {
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
        return data.response;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (e) {
      console.warn('Backend API unavailable, using simulated response:', e.message);
    }

    // Simulated response for demo
    return this.generateSimulatedResponse(userMessage, personality, mood);
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
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
    if (this.typingInterval) clearInterval(this.typingInterval);
  }
}