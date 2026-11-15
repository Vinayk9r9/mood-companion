export class NotificationContainer {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.container = null;
    this.unsubscribe = null;
  }

  mount(container) {
    this.container = container;
    this.render();
    this.setupListener();
  }

  setupListener() {
    this.unsubscribe = this.stateManager.on('ui.notifications.change', () => {
      this.render();
    });
  }

  render() {
    if (!this.container) return;

    const notifications = this.stateManager.get('ui.notifications') || [];

    this.container.innerHTML = notifications.map(notification => `
      <div
        class="notification glass border-l-4 ${this.getNotificationStyle(notification.type)} shadow-lg animate-slide-in max-w-sm w-full"
        role="alert"
        aria-live="polite"
        data-id="${notification.id}"
      >
        <div class="flex items-start gap-3 p-4">
          <div class="flex-shrink-0 mt-0.5">
            ${this.getNotificationIcon(notification.type)}
          </div>
          <div class="flex-1 min-w-0">
            ${notification.title ? `<p class="font-medium text-primary-900 dark:text-primary-100">${notification.title}</p>` : ''}
            <p class="text-sm text-primary-700 dark:text-lavender-200 mt-1">${notification.message}</p>
          </div>
          <button
            class="flex-shrink-0 p-1 rounded-lg hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted hover:text-primary-700 dark:hover:text-lavender-100"
            aria-label="Dismiss notification"
            data-dismiss="${notification.id}"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        ${notification.progress !== undefined ? `
          <div class="h-1 bg-lavender-200 dark:bg-primary-800 mx-4 mb-2 rounded-full overflow-hidden">
            <div class="h-full ${this.getProgressColor(notification.type)} transition-all duration-300" style="width: ${notification.progress}%"></div>
          </div>
        ` : ''}
      </div>
    `).join('');

    // Add dismiss listeners
    this.container.querySelectorAll('[data-dismiss]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.stateManager.removeNotification(btn.dataset.dismiss);
      });
    });
  }

  getNotificationStyle(type) {
    switch (type) {
      case 'success': return 'border-green-500 bg-green-50/50 dark:bg-green-900/20';
      case 'error': return 'border-red-500 bg-red-50/50 dark:bg-red-900/20';
      case 'warning': return 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/20';
      case 'info': return 'border-accent-500 bg-accent-50/50 dark:bg-accent-900/20';
      default: return 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20';
    }
  }

  getProgressColor(type) {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      case 'info': return 'bg-accent-500';
      default: return 'bg-primary-500';
    }
  }

  getNotificationIcon(type) {
    switch (type) {
      case 'success':
        return '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
      case 'error':
        return '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
      case 'warning':
        return '<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
      case 'info':
        return '<svg class="w-5 h-5 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
      default:
        return '<svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}