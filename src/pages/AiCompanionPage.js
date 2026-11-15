import { ChatInterface } from '../components/ai/ChatInterface.js';
import { PersonalitySelector } from '../components/ai/PersonalitySelector.js';
import { VoiceChat } from '../components/ai/VoiceChat.js';
import { CameraToggle } from '../components/camera/CameraToggle.js';
import { MoodContextIndicator } from '../components/mood/MoodContextIndicator.js';
import { PERSONALITIES } from '../utils/personalities.js';

export class AiCompanionPage {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.components = {};
    this.unsubscribes = [];
  }

  mount(container) {
    this.container = container;
    this.render();
    this.initComponents();
    this.setupListeners();
  }

  render() {
    const personality = this.stateManager.get('chat.personality');
    const cameraActive = this.stateManager.get('camera.isActive');
    const conversationalMood = this.stateManager.get('mood.conversational');
    const userConfirmedMood = this.stateManager.get('mood.userConfirmed');
    const predictedMood = this.stateManager.get('mood.predicted');
    const predictedConfidence = this.stateManager.get('mood.predictedConfidence');
    const personalizedMood = this.stateManager.get('expression.personalized');
    const personalizedConfidence = this.stateManager.get('expression.personalizedConfidence');
    const faceDetected = this.stateManager.get('expression.faceDetected');

    const personalityConfig = PERSONALITIES[personality] || PERSONALITIES['calm-listener'];

    // Mood config for emojis/colors
    const MOOD_CONFIG = {
      happy: { label: 'Happy', emoji: '😊', color: 'from-yellow-400 to-orange-400' },
      sad: { label: 'Sad', emoji: '😢', color: 'from-blue-400 to-indigo-500' },
      angry: { label: 'Angry', emoji: '😠', color: 'from-red-400 to-red-600' },
      surprised: { label: 'Surprised', emoji: '😲', color: 'from-pink-400 to-purple-500' },
      neutral: { label: 'Neutral', emoji: '😐', color: 'from-gray-400 to-gray-500' },
      confused: { label: 'Confused', emoji: '😕', color: 'from-purple-400 to-violet-500' },
      tired: { label: 'Tired', emoji: '😴', color: 'from-slate-400 to-slate-500' }
    };

    const convConfig = MOOD_CONFIG[conversationalMood] || MOOD_CONFIG.neutral;
    const predConfig = MOOD_CONFIG[predictedMood] || MOOD_CONFIG.neutral;
    const persConfig = personalizedMood ? (MOOD_CONFIG[personalizedMood] || MOOD_CONFIG.neutral) : null;
    const isUserConfirmed = userConfirmedMood !== null;

    this.container.innerHTML = `
      <div class="space-y-6 animate-fade-in" id="ai-companion-content">
        <!-- Header -->
        <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-lavender-200/50 dark:border-primary-800/50">
          <div>
            <h1 class="font-display text-2xl font-bold gradient-text">AI Companion</h1>
            <p class="text-primary-700 dark:text-lavender-200 mt-1">Chat with your personalized AI companion</p>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <!-- Mood Context Indicator -->
            <div id="mood-context-container" class="hidden sm:flex"></div>
            <!-- Camera Toggle -->
            <div id="camera-toggle-container"></div>
            <!-- Personality Selector -->
            <div id="personality-selector-container"></div>
          </div>
        </header>

        <!-- Main Chat Area -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6" id="main-chat-grid">
          <!-- Chat Interface (Main) -->
          <div class="lg:col-span-3" id="chat-main">
            <div class="card flex flex-col h-[calc(100vh-280px)] min-h-[500px] max-h-[calc(100vh-280px)]" id="chat-container"></div>
          </div>

          <!-- Sidebar: Personality Info & Quick Actions -->
          <div class="lg:col-span-1 space-y-4" id="chat-sidebar">
            <!-- Current Personality Card -->
            <div class="card p-5 relative overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-br ${personalityConfig.color} opacity-5"></div>
              <div class="relative z-10">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${personalityConfig.color} flex items-center justify-center text-xl">
                    ${personalityConfig.emoji}
                  </div>
                  <div>
                    <h3 class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100">${personalityConfig.name}</h3>
                    <p class="text-sm text-muted">${this.getPersonalityDescription(personality)}</p>
                  </div>
                </div>
                <p class="text-sm text-primary-700 dark:text-lavender-200 mb-4">${this.getPersonalityPrompt(personality)}</p>
                <button id="change-personality-btn" class="btn btn-primary w-full text-sm">Change Personality</button>
              </div>
            </div>

            <!-- Mood Context Card - Separates Expression from Confirmed Mood -->
            <div class="card p-5" id="mood-context-card">
              <h3 class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100 mb-4 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                Conversation Context
              </h3>
              <div class="space-y-3" id="context-details">
                <!-- Conversational Mood (what AI uses) - PRIORITY 1 -->
                <div class="flex items-center gap-3 p-3 rounded-xl ${isUserConfirmed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/50' : 'glass'}">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${convConfig.color} flex items-center justify-center text-xl flex-shrink-0">
                    ${convConfig.emoji}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm text-primary-900 dark:text-primary-100">Conversation Mood</p>
                    <p class="text-xs text-muted truncate">${convConfig.label} ${isUserConfirmed ? ' • Confirmed by you' : ''}</p>
                  </div>
                  ${isUserConfirmed ? '<span class="text-xs text-green-600 dark:text-green-400 font-medium">✓ Priority</span>' : ''}
                </div>

                <!-- Camera Expression Estimate - PRIORITY 3 -->
                ${faceDetected ? `
                  <div class="flex items-center gap-3 p-3 rounded-xl glass">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${predConfig.color} flex items-center justify-center text-lg flex-shrink-0">
                      ${predConfig.emoji}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-sm text-primary-900 dark:text-primary-100">Camera Estimate</p>
                      <p class="text-xs text-muted truncate">${predConfig.label} • ${Math.round(predictedConfidence * 100)}% confidence</p>
                    </div>
                    <span class="text-xs text-primary-600 dark:text-primary-400">Baseline</span>
                  </div>
                ` : `
                  <div class="flex items-center gap-3 p-3 rounded-xl glass opacity-50">
                    <div class="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg flex-shrink-0">😐</div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-sm text-primary-900 dark:text-primary-100">Camera Estimate</p>
                      <p class="text-xs text-muted">No face detected</p>
                    </div>
                    <span class="text-xs text-muted">Baseline</span>
                  </div>
                `}

                <!-- Personalized Expression - PRIORITY 3 (when ready) -->
                ${personalizedMood ? `
                  <div class="flex items-center gap-3 p-3 rounded-xl bg-primary-500/10 border border-primary-200/50 dark:border-primary-800/50">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${persConfig.color} flex items-center justify-center text-lg flex-shrink-0">
                      ${persConfig.emoji}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-sm text-primary-900 dark:text-primary-100">Personalized Estimate</p>
                      <p class="text-xs text-primary-700 dark:text-primary-300 truncate">${persConfig.label} • ${Math.round(personalizedConfidence * 100)}% confidence</p>
                    </div>
                    <span class="text-xs text-primary-600 dark:text-primary-400 font-medium">Learned</span>
                  </div>
                ` : ''}

                <div class="pt-2 border-t border-lavender-200/50 dark:border-primary-800/50">
                  <p class="text-xs text-muted mb-2">Priority: Your words > Your selection > Personalized > Camera</p>
                  <div class="flex items-center justify-between p-3 rounded-xl glass">
                    <span class="text-sm text-muted">Personality</span>
                    <span class="font-medium text-primary-900 dark:text-primary-100">${personalityConfig.name}</span>
                  </div>
                  <div class="flex items-center justify-between p-3 rounded-xl glass">
                    <span class="text-sm text-muted">Messages</span>
                    <span class="font-medium text-primary-900 dark:text-primary-100">${this.stateManager.get('chat.messages').length}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Suggestions -->
            <div class="card p-5">
              <h3 class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100 mb-4 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.734-.988-2.386l-.548-.547z"></path></svg>
                Suggestions
              </h3>
              <div class="space-y-2" id="quick-suggestions">
                ${this.getMoodSuggestions(conversationalMood).map(s => `
                  <button class="suggestion-btn w-full text-left p-3 rounded-xl glass hover:border-primary-300/50 dark:hover:border-primary-700/50 transition-colors text-sm text-primary-700 dark:text-lavender-200" data-suggestion="${s}">${s}</button>
                `).join('')}
              </div>
            </div>

            <!-- Voice Chat Panel -->
            <div id="voice-chat-container"></div>
          </div>
        </div>
      </div>
    `;
  }

  getPersonalityDescription(personality) {
    const descriptions = {
      'funny-friend': 'Playful, tells jokes, shares fun facts',
      'motivational-coach': 'Encouraging, helps set and achieve goals',
      'calm-listener': 'Empathetic, patient, lets you express freely',
      'productivity-assistant': 'Organized, practical, breaks down tasks'
    };
    return descriptions[personality] || descriptions['calm-listener'];
  }

  getPersonalityPrompt(personality) {
    const prompts = {
      'funny-friend': 'I\'ll keep things light and fun! Ask me for a joke or a random fact.',
      'motivational-coach': 'Let\'s work towards your goals together. What do you want to achieve?',
      'calm-listener': 'I\'m here to listen without judgment. Share whatever\'s on your mind.',
      'productivity-assistant': 'I can help organize your tasks and boost productivity. What do you need?'
    };
    return prompts[personality] || prompts['calm-listener'];
  }

  getMoodSuggestions(mood) {
    const suggestions = {
      happy: ["Share what made you happy!", "Any plans for today?", "Want a fun fact?"],
      sad: ["Want to talk about it?", "I can tell you a joke", "Would a breathing exercise help?"],
      angry: ["What's frustrating you?", "Let's try 4-7-8 breathing", "Want to vent?"],
      surprised: ["What happened?", "Good surprise or bad?", "Tell me the story!"],
      confused: ["What's unclear?", "Want me to explain something?", "Let's break it down together"],
      tired: ["Need help prioritizing?", "Want a short break reminder?", "Just the essential tasks today?"],
      neutral: ["How can I help?", "Anything on your mind?", "Want a suggestion?"]
    };
    return suggestions[mood] || suggestions.neutral;
  }

  initComponents() {
    // Chat Interface
    const chatContainer = this.container.querySelector('#chat-container');
    if (chatContainer) {
      this.components.chatInterface = new ChatInterface(this.stateManager, this.themeManager);
      this.components.chatInterface.mount(chatContainer);
    }

    // Personality Selector
    const personalityContainer = this.container.querySelector('#personality-selector-container');
    if (personalityContainer) {
      this.components.personalitySelector = new PersonalitySelector(this.stateManager, this.themeManager);
      this.components.personalitySelector.mount(personalityContainer, { compact: true });
    }

    // Camera Toggle
    const cameraContainer = this.container.querySelector('#camera-toggle-container');
    if (cameraContainer) {
      this.components.cameraToggle = new CameraToggle(this.stateManager, this.themeManager);
      this.components.cameraToggle.mount(cameraContainer);
    }

    // Mood Context Indicator
    const moodContainer = this.container.querySelector('#mood-context-container');
    if (moodContainer) {
      this.components.moodContextIndicator = new MoodContextIndicator(this.stateManager, this.themeManager);
      this.components.moodContextIndicator.mount(moodContainer);
    }

    // Voice Chat
    const voiceContainer = this.container.querySelector('#voice-chat-container');
    if (voiceContainer) {
      this.components.voiceChat = new VoiceChat(this.stateManager, this.themeManager);
      this.components.voiceChat.mount(voiceContainer);
    }

    // Setup suggestion buttons
    this.container.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.components.chatInterface?.sendMessage(btn.dataset.suggestion);
      });
    });

    // Change personality button
    const changeBtn = this.container.querySelector('#change-personality-btn');
    if (changeBtn) {
      changeBtn.addEventListener('click', () => {
        this.components.personalitySelector?.showModal();
      });
    }
  }

  setupListeners() {
    this.unsubscribes.push(
      this.stateManager.on('chat.personality.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('mood.conversational.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('camera.isActive.change', () => this.render())
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
    Object.values(this.components).forEach(comp => {
      if (comp && comp.destroy) comp.destroy();
    });
  }
}