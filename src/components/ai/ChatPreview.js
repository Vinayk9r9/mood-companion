const PERSONALITIES = {
  'funny-friend': {
    name: 'Funny Friend',
    emoji: '😄',
    color: 'from-yellow-400 to-orange-400',
    description: 'Playful, jokes, fun facts'
  },
  'motivational-coach': {
    name: 'Motivational Coach',
    emoji: '💪',
    color: 'from-red-400 to-red-600',
    description: 'Encouraging, goal-oriented'
  },
  'calm-listener': {
    name: 'Calm Listener',
    emoji: '🤗',
    color: 'from-blue-400 to-indigo-500',
    description: 'Empathetic, patient, supportive'
  },
  'productivity-assistant': {
    name: 'Productivity Assistant',
    emoji: '📋',
    color: 'from-green-400 to-teal-500',
    description: 'Organized, practical, efficient'
  }
};

export class ChatPreview {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.container = null;
    this.unsubscribes = [];
  }

  mount(container) {
    this.container = container;
    this.render();
    this.setupListeners();
  }

  render() {
    if (!this.container) return;

    const personality = this.stateManager.get('chat.personality');
    const messages = this.stateManager.get('chat.messages');
    const personalityConfig = PERSONALITIES[personality] || PERSONALITIES['calm-listener'];
    const conversationalMood = this.stateManager.get('mood.conversational');

    // Get last few messages
    const recentMessages = messages.slice(-3);

    this.container.innerHTML = `
      <div class="space-y-4">
        <!-- Personality & Mood Context -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${personalityConfig.color} flex items-center justify-center text-xl">
              ${personalityConfig.emoji}
            </div>
            <div>
              <p class="font-medium text-primary-900 dark:text-primary-100">${personalityConfig.name}</p>
              <p class="text-xs text-muted">${personalityConfig.description}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge badge-primary text-xs">${conversationalMood}</span>
            <button id="change-personality" class="btn btn-ghost btn-sm text-xs p-1.5" aria-label="Change personality">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </button>
          </div>
        </div>

        <!-- Message Preview -->
        <div class="space-y-3 max-h-64 overflow-y-auto pr-2" id="message-preview">
          ${recentMessages.length === 0 ? `
            <div class="text-center py-8 text-muted">
              <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              <p class="text-sm">No messages yet</p>
              <p class="text-xs mt-1">Start a conversation with your AI companion</p>
            </div>
          ` : recentMessages.map(msg => `
            <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in">
              <div class="message-bubble ${msg.role === 'user' ? 'message-user' : 'message-ai'} max-w-[85%]">
                <p class="text-sm whitespace-pre-wrap">${this.escapeHtml(msg.content)}</p>
                <span class="text-[10px] opacity-60 mt-1 block text-right">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Quick Reply Suggestions -->
        <div class="flex flex-wrap gap-2" id="quick-replies">
          ${this.getQuickReplies(conversationalMood, personality).map(reply => `
            <button class="quick-reply btn btn-ghost btn-sm text-xs px-3 py-1.5" data-reply="${this.escapeHtml(reply)}">${reply}</button>
          `).join('')}
        </div>

        <!-- Input Preview -->
        <div class="pt-4 border-t border-lavender-200/50 dark:border-primary-800/50">
          <button id="open-full-chat" class="btn btn-primary w-full justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            Open Full Chat
          </button>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  getQuickReplies(mood, personality) {
    const baseReplies = [
      "How are you?",
      "Tell me a joke",
      "I need help with a task",
      "What's on my schedule?"
    ];

    const moodReplies = {
      happy: ["Share my joy!", "What should I do today?"],
      sad: ["I need cheering up", "Just listening helps"],
      angry: ["Help me calm down", "What's bothering me?"],
      surprised: ["Guess what happened!", "That was unexpected"],
      confused: ["Can you explain this?", "I'm not sure what to do"],
      tired: ["I need a break", "Help me prioritize"],
      neutral: ["What's new?", "Any suggestions?"]
    };

    const personalityReplies = {
      'funny-friend': ["Tell me something fun!", "Random fact please!"],
      'motivational-coach': ["Motivate me!", "Help me set a goal"],
      'calm-listener': ["I just want to talk", "Listen to me"],
      'productivity-assistant': ["Organize my tasks", "What's my priority?"]
    };

    return [
      ...(moodReplies[mood] || []),
      ...(personalityReplies[personality] || []),
      ...baseReplies
    ].slice(0, 4);
  }

  setupEvents() {
    if (!this.container) return;

    // Quick reply buttons
    this.container.querySelectorAll('.quick-reply').forEach(btn => {
      btn.addEventListener('click', () => {
        const reply = btn.dataset.reply;
        this.sendMessage(reply);
      });
    });

    // Open full chat
    const openChatBtn = this.container.querySelector('#open-full-chat');
    if (openChatBtn) {
      openChatBtn.addEventListener('click', () => {
        this.stateManager.navigateTo('ai-companion');
      });
    }

    // Change personality
    const changePersonalityBtn = this.container.querySelector('#change-personality');
    if (changePersonalityBtn) {
      changePersonalityBtn.addEventListener('click', () => {
        this.showPersonalitySelector();
      });
    }
  }

  showPersonalitySelector() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass rounded-2xl p-6 max-w-md w-full animate-slide-up">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-display text-xl font-bold text-primary-900 dark:text-primary-100">Choose Personality</h3>
          <button class="modal-close p-2 rounded-xl hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <p class="text-primary-700 dark:text-lavender-200 mb-6">Select how you'd like your AI companion to respond.</p>
        <div class="space-y-3" id="personality-grid"></div>
        <div class="mt-6 pt-4 border-t border-lavender-200/50 dark:border-primary-800/50">
          <button class="btn btn-secondary w-full" id="cancel-personality">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const grid = modal.querySelector('#personality-grid');
    const currentPersonality = this.stateManager.get('chat.personality');

    Object.entries(PERSONALITIES).forEach(([id, config]) => {
      const btn = document.createElement('button');
      btn.className = `w-full p-4 rounded-xl text-left transition-all duration-200 ${id === currentPersonality
        ? 'bg-primary-500/10 border-2 border-primary-300 dark:border-primary-700'
        : 'glass border border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300 dark:hover:border-primary-700'}`;
      btn.dataset.personality = id;
      btn.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-2xl flex-shrink-0">
            ${config.emoji}
          </div>
          <div class="flex-1">
            <p class="font-semibold text-primary-900 dark:text-primary-100">${config.name}</p>
            <p class="text-sm text-muted">${config.description}</p>
          </div>
          ${id === currentPersonality ? '<svg class="w-5 h-5 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : ''}
        </div>
      `;
      btn.addEventListener('click', () => {
        this.stateManager.setPersonality(id);
        this.stateManager.addNotification({
          type: 'success',
          title: 'Personality Changed',
          message: `Now chatting with ${config.name}`
        });
        closeModal();
      });
      grid.appendChild(btn);
    });

    function closeModal() {
      modal.remove();
    }

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('#cancel-personality').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  async sendMessage(content) {
    // Add user message
    this.stateManager.addMessage({
      role: 'user',
      content,
      timestamp: Date.now()
    });

    // Show typing indicator
    this.stateManager.setTyping(true);

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
    } catch (error) {
      console.error('AI response error:', error);
      this.stateManager.setTyping(false);

      // Fallback response
      this.stateManager.addMessage({
        role: 'assistant',
        content: "I'm having trouble connecting right now. Could you try again in a moment?",
        timestamp: Date.now()
      });
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

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setupListeners() {
    this.unsubscribes.push(
      this.stateManager.on('chat.messages.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('chat.personality.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('mood.conversational.change', () => this.render())
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
  }
}