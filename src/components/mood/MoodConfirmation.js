import { MOOD_CONFIG, CONFIRMATION_MESSAGES } from '../../utils/moodConfig.js';

export class MoodConfirmation {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.container = null;
    this.currentConfirmation = null;
    this.unsubscribes = [];
  }

  mount(container) {
    this.container = container;
    this.render();
    this.setupListeners();
  }

  render() {
    if (!this.container) return;

    const pending = this.stateManager.get('mood.pendingConfirmation');

    if (!pending) {
      this.container.innerHTML = '';
      return;
    }

    this.currentConfirmation = pending;
    const config = MOOD_CONFIG[pending.predictedMood] || MOOD_CONFIG.neutral;
    const messages = CONFIRMATION_MESSAGES[pending.predictedMood] || CONFIRMATION_MESSAGES.neutral;
    const message = messages[Math.floor(Math.random() * messages.length)];

    this.container.innerHTML = `
      <div class="mood-confirmation animate-slide-up" role="alert" aria-live="polite">
        <div class="glass rounded-2xl p-6 border-l-4 border-primary-500">
          <div class="flex items-start gap-4">
            <!-- Mood Emoji -->
            <div class="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-3xl shadow-lg">
              ${config.emoji}
            </div>

            <!-- Message -->
            <div class="flex-1 min-w-0 pt-1">
              <div class="flex items-center gap-2 mb-2">
                <h4 class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100">Mood Check-in</h4>
                <span class="badge badge-primary text-xs">${Math.round(pending.confidence * 100)}% confident</span>
              </div>
              <p class="text-primary-700 dark:text-lavender-200 mb-4">${message}</p>

              <!-- Response Buttons -->
              <div class="flex flex-wrap gap-2" role="group" aria-label="Mood confirmation options">
                <button class="btn btn-primary btn-sm confirm-yes" data-response="confirmed">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  Yes, I'm ${config.label.toLowerCase()}!
                </button>
                <button class="btn btn-secondary btn-sm confirm-no" data-response="denied">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  Not really
                </button>
                <button class="btn btn-ghost btn-sm confirm-other" data-response="other">
                  I'm feeling something else
                </button>
                <button class="btn btn-ghost btn-sm confirm-dismiss" data-response="dismiss">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  Don't ask right now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupButtonEvents();
  }

  setupButtonEvents() {
    if (!this.container) return;

    this.container.querySelectorAll('[data-response]').forEach(btn => {
      btn.addEventListener('click', () => {
        const response = btn.dataset.response;
        this.handleResponse(response);
      });
    });
  }

  handleResponse(response) {
    const pending = this.stateManager.get('mood.pendingConfirmation');
    if (!pending) return;

    if (response === 'confirmed') {
      // User confirmed the predicted mood
      this.stateManager.setUserConfirmedMood(pending.predictedMood, 'confirmation');
      this.stateManager.addNotification({
        type: 'success',
        title: 'Mood Confirmed',
        message: `Thanks for confirming you're feeling ${MOOD_CONFIG[pending.predictedMood]?.label.toLowerCase() || 'that way'}!`
      });
    } else if (response === 'denied') {
      // User denied - show manual mood selector
      this.stateManager.respondToConfirmation('denied');
      this.showMoodSelector();
    } else if (response === 'other') {
      // User wants to select a different mood
      this.stateManager.respondToConfirmation('other');
      this.showMoodSelector();
    } else if (response === 'dismiss') {
      // User dismissed - just clear pending
      this.stateManager.respondToConfirmation('dismiss');
      this.stateManager.addNotification({
        type: 'info',
        title: 'Check-in Dismissed',
        message: 'No problem! I won\'t ask again for a while.'
      });
    }
  }

  showMoodSelector() {
    // Import dynamically to avoid circular dependency
    import('./MoodSelector.js').then(({ showMoodSelectorModal }) => {
      showMoodSelectorModal(this.stateManager, this.themeManager, (moodId) => {
        this.stateManager.setUserConfirmedMood(moodId, 'manual');
      });
    });
  }

  show(confirmation) {
    this.currentConfirmation = confirmation;
    this.render();
  }

  hide() {
    this.currentConfirmation = null;
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  setupListeners() {
    this.unsubscribes.push(
      this.stateManager.on('mood.pendingConfirmation.change', (data) => {
        if (data.value) {
          this.show(data.value);
        } else {
          this.hide();
        }
      })
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
  }
}