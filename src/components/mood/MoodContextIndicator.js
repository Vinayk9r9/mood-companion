import { MOOD_CONFIG } from '../../utils/moodConfig.js';

export class MoodContextIndicator {
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

    const conversationalMood = this.stateManager.get('mood.conversational');
    const userConfirmedMood = this.stateManager.get('mood.userConfirmed');
    const predictedMood = this.stateManager.get('mood.predicted');
    const predictedConfidence = this.stateManager.get('mood.predictedConfidence');
    const faceDetected = this.stateManager.get('expression.faceDetected');
    const personalizedMood = this.stateManager.get('expression.personalized');
    const personalizedConfidence = this.stateManager.get('expression.personalizedConfidence');

    const config = MOOD_CONFIG[conversationalMood] || MOOD_CONFIG.neutral;
    const predictedConfig = MOOD_CONFIG[predictedMood] || MOOD_CONFIG.neutral;
    const personalizedConfig = personalizedMood ? (MOOD_CONFIG[personalizedMood] || MOOD_CONFIG.neutral) : null;
    const isUserConfirmed = userConfirmedMood !== null;

    // Show expanded view with both expression and confirmed mood
    this.container.innerHTML = `
      <div class="mood-context-indicator flex items-center gap-2 px-3 py-2 rounded-xl glass border border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300/50 dark:hover:border-primary-700/50 transition-colors group" role="status" aria-live="polite">
        <!-- Conversational Mood (what AI uses) -->
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-lg group-hover:scale-110 transition-transform" title="Conversation mood: ${config.label}${isUserConfirmed ? ' (confirmed by you)' : ''}">
          ${config.emoji}
        </div>

        <!-- Mood Info -->
        <div class="hidden sm:block text-left min-w-0">
          <p class="font-medium text-sm text-primary-900 dark:text-primary-100 truncate">${config.label}</p>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-muted">
              ${isUserConfirmed
                ? 'You confirmed'
                : personalizedMood
                  ? `Personalized: ${personalizedConfig?.label || personalizedMood} (${Math.round((personalizedConfidence || 0) * 100)}%)`
                  : `Camera: ${predictedConfig.label} (${Math.round(predictedConfidence * 100)}%)`
              }
            </span>
          </div>
        </div>

        <!-- Face Detection Indicator -->
        <div class="flex-shrink-0 ml-1 sm:ml-2">
          <span class="w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}" aria-label="${faceDetected ? 'Face detected' : 'No face detected'}"></span>
        </div>
      </div>
    `;
  }

  setupListeners() {
    this.unsubscribes.push(
      this.stateManager.on('mood.conversational.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('mood.userConfirmed.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('mood.predicted.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('expression.faceDetected.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('expression.personalized.change', () => this.render())
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
  }
}