import { MoodSelector } from '../components/mood/MoodSelector.js';
import { MoodHistory } from '../components/mood/MoodHistory.js';
import { MoodAnalytics } from '../components/mood/MoodAnalytics.js';
import { MoodConfirmation } from '../components/mood/MoodConfirmation.js';
import { MOOD_CONFIG } from '../utils/moodConfig.js';

export class MoodTrackerPage {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.components = {};
    this.unsubscribes = [];
    this.activeTab = 'overview';
  }

  mount(container) {
    this.container = container;
    this.render();
    this.initComponents();
    this.setupListeners();
  }

  render() {
    const conversationalMood = this.stateManager.get('mood.conversational');
    const userConfirmedMood = this.stateManager.get('mood.userConfirmed');
    const predictedMood = this.stateManager.get('mood.predicted');
    const predictedConfidence = this.stateManager.get('mood.predictedConfidence');
    const pendingConfirmation = this.stateManager.get('mood.pendingConfirmation');

    this.container.innerHTML = `
      <div class="space-y-6 animate-fade-in" id="mood-tracker-content">
        <!-- Header -->
        <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-lavender-200/50 dark:border-primary-800/50">
          <div>
            <h1 class="font-display text-2xl font-bold gradient-text">Mood Tracker</h1>
            <p class="text-primary-700 dark:text-lavender-200 mt-1">Track and understand your emotional patterns</p>
          </div>
          <button id="log-mood-btn" class="btn btn-primary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            Log Mood
          </button>
        </header>

        <!-- Current Mood Summary -->
        <section class="card p-6" aria-labelledby="current-mood-heading">
          <h2 id="current-mood-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 mb-4">Current Mood</h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Main Mood Display -->
            <div class="md:col-span-2">
              <div id="mood-indicator-container"></div>
            </div>

            <!-- Quick Stats -->
            <div class="space-y-3">
              <div class="glass rounded-xl p-4 text-center">
                <p class="text-2xl font-bold text-primary-900 dark:text-primary-100" id="today-mood-count">0</p>
                <p class="text-sm text-muted">Entries Today</p>
              </div>
              <div class="glass rounded-xl p-4 text-center">
                <p class="text-2xl font-bold text-primary-900 dark:text-primary-100" id="week-mood-count">0</p>
                <p class="text-sm text-muted">Entries This Week</p>
              </div>
              <div class="glass rounded-xl p-4 text-center">
                <p class="text-2xl font-bold text-primary-900 dark:text-primary-100" id="streak-count">0</p>
                <p class="text-sm text-muted">Day Streak</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Mood Confirmation -->
        <div id="mood-confirmation-container" class="mt-4"></div>

        <!-- Tabs -->
        <div class="card overflow-hidden">
          <div class="flex border-b border-lavender-200/50 dark:border-primary-800/50" role="tablist" aria-label="Mood tracker sections">
            <button
              class="tab tab-active"
              data-tab="overview"
              role="tab"
              aria-selected="true"
              aria-controls="overview-panel"
              id="overview-tab"
            >Overview</button>
            <button
              class="tab tab-inactive"
              data-tab="history"
              role="tab"
              aria-selected="false"
              aria-controls="history-panel"
              id="history-tab"
            >History</button>
            <button
              class="tab tab-inactive"
              data-tab="analytics"
              role="tab"
              aria-selected="false"
              aria-controls="analytics-panel"
              id="analytics-tab"
            >Analytics</button>
          </div>

          <!-- Tab Panels -->
          <div class="p-6" id="tab-panels">
            <div id="overview-panel" role="tabpanel" aria-labelledby="overview-tab">
              <div id="mood-analytics-container"></div>
            </div>
            <div id="history-panel" role="tabpanel" aria-labelledby="history-tab" class="hidden">
              <div id="mood-history-container"></div>
            </div>
            <div id="analytics-panel" role="tabpanel" aria-labelledby="analytics-tab" class="hidden">
              <div id="detailed-analytics-container"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.initSubComponents();
    this.updateStats();
  }

  initSubComponents() {
    // Mood Indicator
    const moodContainer = this.container.querySelector('#mood-indicator-container');
    if (moodContainer) {
      // Use the MoodIndicator but with manual selection capability
      this.renderMoodIndicator(moodContainer);
    }

    // Mood Analytics (Overview)
    const analyticsContainer = this.container.querySelector('#mood-analytics-container');
    if (analyticsContainer) {
      this.components.moodAnalytics = new MoodAnalytics(this.stateManager, this.themeManager);
      this.components.moodAnalytics.mount(analyticsContainer);
    }

    // Mood History
    const historyContainer = this.container.querySelector('#mood-history-container');
    if (historyContainer) {
      this.components.moodHistory = new MoodHistory(this.stateManager, this.themeManager);
      this.components.moodHistory.mount(historyContainer);
    }

    // Detailed Analytics
    const detailedContainer = this.container.querySelector('#detailed-analytics-container');
    if (detailedContainer) {
      this.components.detailedAnalytics = new MoodAnalytics(this.stateManager, this.themeManager, { detailed: true });
      this.components.detailedAnalytics.mount(detailedContainer);
    }

    // Mood Confirmation
    const confirmationContainer = this.container.querySelector('#mood-confirmation-container');
    if (confirmationContainer) {
      this.components.moodConfirmation = new MoodConfirmation(this.stateManager, this.themeManager);
      this.components.moodConfirmation.mount(confirmationContainer);
    }
  }

  renderMoodIndicator(container) {
    const conversationalMood = this.stateManager.get('mood.conversational');
    const userConfirmedMood = this.stateManager.get('mood.userConfirmed');
    const predictedMood = this.stateManager.get('mood.predicted');
    const predictedConfidence = this.stateManager.get('mood.predictedConfidence');
    const faceDetected = this.stateManager.get('expression.faceDetected');

    const config = MOOD_CONFIG[conversationalMood] || MOOD_CONFIG.neutral;
    const isUserConfirmed = userConfirmedMood !== null;

    container.innerHTML = `
      <div class="relative group">
        <div class="rounded-2xl p-6 text-center ${config.bg} border-2 ${config.border} overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-r ${config.color} opacity-10 animate-pulse-soft"></div>
          <div class="relative z-10 space-y-3">
            <span class="text-6xl block animate-bounce-gentle">${config.emoji}</span>
            <h3 class="font-display text-2xl font-bold ${config.text}">${config.label}</h3>
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

        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <button id="manual-mood-btn" class="btn btn-secondary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            Set Mood Manually
          </button>
          <button id="confirm-mood-btn" class="btn btn-primary" ${!this.stateManager.get('mood.pendingConfirmation') ? 'hidden' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            Confirm Detection
          </button>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-3 text-center">
          <div class="glass rounded-xl p-3">
            <p class="text-xs font-medium text-muted uppercase tracking-wider">Camera</p>
            <p class="font-medium text-primary-900 dark:text-primary-100 capitalize">${faceDetected ? predictedMood : 'No face'}</p>
            ${faceDetected ? `<p class="text-xs text-muted">${Math.round(predictedConfidence * 100)}% confident</p>` : ''}
          </div>
          <div class="glass rounded-xl p-3">
            <p class="text-xs font-medium text-muted uppercase tracking-wider">Face</p>
            <div class="flex items-center justify-center gap-1.5 mt-1">
              <span class="w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500 animate-pulse-soft' : 'bg-gray-400'}"></span>
              <span class="font-medium text-sm ${faceDetected ? 'text-green-600 dark:text-green-400' : 'text-muted'}">${faceDetected ? 'Detected' : 'Not Found'}</span>
            </div>
          </div>
          <div class="glass rounded-xl p-3">
            <p class="text-xs font-medium text-muted uppercase tracking-wider">Source</p>
            <p class="font-medium text-sm ${isUserConfirmed ? 'text-green-600 dark:text-green-400' : 'text-primary-600 dark:text-primary-400'}">${isUserConfirmed ? 'Manual' : 'Auto'}</p>
          </div>
        </div>
      </div>
    `;

    // Setup buttons
    container.querySelector('#manual-mood-btn')?.addEventListener('click', () => {
      this.showMoodSelector();
    });

    container.querySelector('#confirm-mood-btn')?.addEventListener('click', () => {
      const pending = this.stateManager.get('mood.pendingConfirmation');
      if (pending) {
        this.stateManager.setUserConfirmedMood(pending.predictedMood, 'confirmation');
      }
    });
  }

  showMoodSelector() {
    import('./../components/mood/MoodSelector.js').then(({ showMoodSelectorModal }) => {
      showMoodSelectorModal(this.stateManager, this.themeManager, (moodId) => {
        this.stateManager.setUserConfirmedMood(moodId, 'manual');
      });
    });
  }

  updateStats() {
    const history = this.stateManager.getMoodHistory();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayCount = history.filter(e => e.timestamp >= today.getTime()).length;
    const weekCount = history.filter(e => e.timestamp >= weekAgo.getTime()).length;

    // Calculate streak
    let streak = 0;
    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
    let currentDate = new Date(today);

    for (const entry of sortedHistory) {
      const entryDate = new Date(entry.timestamp);
      entryDate.setHours(0, 0, 0, 0);

      if (entryDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (entryDate < currentDate) {
        break;
      }
    }

    // Safely update DOM elements
    const todayEl = this.container.querySelector('#today-mood-count');
    const weekEl = this.container.querySelector('#week-mood-count');
    const streakEl = this.container.querySelector('#streak-count');

    if (todayEl) todayEl.textContent = todayCount;
    if (weekEl) weekEl.textContent = weekCount;
    if (streakEl) streakEl.textContent = streak;
  }

  setupListeners() {
    // Tab switching
    this.container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Log mood button
    this.container.querySelector('#log-mood-btn')?.addEventListener('click', () => {
      this.showMoodSelector();
    });

    // State changes
    this.unsubscribes.push(
      this.stateManager.on('mood.history.change', () => {
        this.updateStats();
        this.components.moodHistory?.render();
        this.components.moodAnalytics?.render();
        this.components.detailedAnalytics?.render();
      })
    );

    this.unsubscribes.push(
      this.stateManager.on('mood.conversational.change', () => {
        this.renderMoodIndicator(this.container.querySelector('#mood-indicator-container'));
      })
    );

    this.unsubscribes.push(
      this.stateManager.on('mood.userConfirmed.change', () => {
        this.updateStats();
      })
    );
  }

  switchTab(tab) {
    this.activeTab = tab;

    // Update tab buttons
    this.container.querySelectorAll('[data-tab]').forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('tab-active', isActive);
      btn.classList.toggle('tab-inactive', !isActive);
      btn.setAttribute('aria-selected', isActive);
    });

    // Update panels
    this.container.querySelectorAll('[role="tabpanel"]').forEach(panel => {
      panel.classList.toggle('hidden', panel.id !== `${tab}-panel`);
    });
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
    Object.values(this.components).forEach(comp => {
      if (comp && comp.destroy) comp.destroy();
    });
  }
}