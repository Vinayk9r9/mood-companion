const MOOD_CONFIG = {
  happy: { label: 'Happy', emoji: '😊', color: 'from-yellow-400 to-orange-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
  sad: { label: 'Sad', emoji: '😢', color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  angry: { label: 'Angry', emoji: '😠', color: 'from-red-400 to-red-600', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700' },
  surprised: { label: 'Surprised', emoji: '😲', color: 'from-pink-400 to-purple-500', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700' },
  neutral: { label: 'Neutral', emoji: '😐', color: 'from-gray-400 to-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600' },
  confused: { label: 'Confused', emoji: '😕', color: 'from-purple-400 to-violet-500', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  tired: { label: 'Tired', emoji: '😴', color: 'from-slate-400 to-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600' }
};

export class MoodIndicator {
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
    const source = isUserConfirmed ? 'You confirmed' : 'AI detected';

    this.container.innerHTML = `
      <div class="space-y-4">
        <!-- Main Mood Display -->
        <div class="relative group">
          <div class="rounded-2xl p-6 text-center ${config.bg} border-2 ${config.border} overflow-hidden">
            <!-- Animated background -->
            <div class="absolute inset-0 bg-gradient-to-r ${config.color} opacity-10 animate-pulse-soft"></div>

            <div class="relative z-10 space-y-3">
              <span class="text-6xl block animate-bounce-gentle">${config.emoji}</span>
              <h3 class="font-display text-2xl font-bold ${config.text}">${config.label}</h3>

              <!-- Mood Source Badge -->
              <div class="flex items-center justify-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.border} border ${config.text}">
                  ${isUserConfirmed
                    ? '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> Confirmed by you'
                    : '<svg class="w-3 h-3 animate-pulse-soft" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> AI detected'
                  }
                </span>
              </div>
            </div>
          </div>

          <!-- Confidence indicator on hover -->
          <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div class="glass rounded-lg px-3 py-1.5 text-xs text-muted whitespace-nowrap shadow-lg">
              Confidence: ${Math.round((isUserConfirmed ? 1 : predictedConfidence) * 100)}%
            </div>
          </div>
        </div>

        <!-- Mood Details -->
        <div class="grid grid-cols-3 gap-3">
          <!-- Conversational Mood -->
          <div class="glass rounded-xl p-4 text-center">
            <p class="text-xs font-medium text-muted uppercase tracking-wider mb-1">Conversational</p>
            <p class="font-semibold text-primary-900 dark:text-primary-100 capitalize">${conversationalMood}</p>
          </div>

          <!-- Camera Prediction -->
          <div class="glass rounded-xl p-4 text-center">
            <p class="text-xs font-medium text-muted uppercase tracking-wider mb-1">Camera</p>
            <div class="flex items-center justify-center gap-1">
              <span class="font-semibold text-primary-900 dark:text-primary-100 capitalize">${predictedMood}</span>
              ${faceDetected ? `<span class="text-xs ${predictedConfig.text}">${Math.round(predictedConfidence * 100)}%</span>` : '<span class="text-xs text-muted">—</span>'}
            </div>
          </div>

          <!-- Face Detection -->
          <div class="glass rounded-xl p-4 text-center">
            <p class="text-xs font-medium text-muted uppercase tracking-wider mb-1">Face</p>
            <div class="flex items-center justify-center gap-1.5">
              <span class="w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500 animate-pulse-soft' : 'bg-gray-400'}"></span>
              <span class="font-medium text-sm ${faceDetected ? 'text-green-600 dark:text-green-400' : 'text-muted'}">
                ${faceDetected ? 'Detected' : 'Not Found'}
              </span>
            </div>
          </div>
        </div>

        <!-- Mood History Sparkline -->
        <div class="glass rounded-xl p-4">
          <p class="text-xs font-medium text-muted uppercase tracking-wider mb-3">Recent Mood Trend</p>
          <div class="h-16 flex items-end justify-around gap-1" id="mood-sparkline">
            ${this.renderSparkline()}
          </div>
        </div>
      </div>
    `;
  }

  renderSparkline() {
    const history = this.stateManager.getMoodHistory({ limit: 7, type: 'confirmed' });
    if (history.length === 0) {
      return '<p class="text-xs text-muted text-center w-full py-4">No mood history yet</p>';
    }

    const moodOrder = { happy: 6, surprised: 5, neutral: 4, confused: 3, tired: 2, sad: 1, angry: 0 };
    const maxHeight = 56; // px

    return history.slice().reverse().map((entry, i) => {
      const height = Math.max(4, (moodOrder[entry.mood] || 3) / 6 * maxHeight);
      const config = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.neutral;
      return `
        <div class="flex flex-col items-center gap-1 flex-1" title="${entry.mood} - ${new Date(entry.timestamp).toLocaleDateString()}">
          <div class="w-full rounded-t" style="height: ${height}px; background: linear-gradient(to top, ${config.color.replace('from-', '').replace(' to-', ', ')});"></div>
          <span class="text-[10px] text-muted">${new Date(entry.timestamp).toLocaleDateString(undefined, { weekday: 'short' })}</span>
        </div>
      `;
    }).join('');
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
      this.stateManager.on('mood.history.change', () => this.render())
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
  }
}