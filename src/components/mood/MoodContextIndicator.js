const MOOD_CONFIG = {
  happy: { label: 'Happy', emoji: '😊', color: 'from-yellow-400 to-orange-400' },
  sad: { label: 'Sad', emoji: '😢', color: 'from-blue-400 to-indigo-500' },
  angry: { label: 'Angry', emoji: '😠', color: 'from-red-400 to-red-600' },
  surprised: { label: 'Surprised', emoji: '😲', color: 'from-pink-400 to-purple-500' },
  neutral: { label: 'Neutral', emoji: '😐', color: 'from-gray-400 to-gray-500' },
  confused: { label: 'Confused', emoji: '😕', color: 'from-purple-400 to-violet-500' },
  tired: { label: 'Tired', emoji: '😴', color: 'from-slate-400 to-slate-500' }
};

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

    const config = MOOD_CONFIG[conversationalMood] || MOOD_CONFIG.neutral;
    const predictedConfig = MOOD_CONFIG[predictedMood] || MOOD_CONFIG.neutral;
    const isUserConfirmed = userConfirmedMood !== null;

    this.container.innerHTML = `
      <div class="mood-context-indicator flex items-center gap-2 px-3 py-2 rounded-xl glass border border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300/50 dark:hover:border-primary-700/50 transition-colors group" role="status" aria-live="polite">
        <!-- Mood Emoji -->
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
          ${config.emoji}
        </div>

        <!-- Mood Info -->
        <div class="hidden sm:block text-left min-w-0">
          <p class="font-medium text-sm text-primary-900 dark:text-primary-100 truncate">${config.label}</p>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-muted">${isUserConfirmed ? 'You confirmed' : 'AI detected'}</span>
            <span class="text-[10px] text-muted">•</span>
            <span class="text-[10px] ${isUserConfirmed ? 'text-green-600 dark:text-green-400' : 'text-primary-600 dark:text-primary-400'}">
              ${isUserConfirmed ? '✓' : `${Math.round(predictedConfidence * 100)}%`}
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
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
  }
}