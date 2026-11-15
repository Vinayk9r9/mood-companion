const MOOD_CONFIG = {
  happy: { label: 'Happy', emoji: '😊', color: 'from-yellow-400 to-orange-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  sad: { label: 'Sad', emoji: '😢', color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  angry: { label: 'Angry', emoji: '😠', color: 'from-red-400 to-red-600', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  surprised: { label: 'Surprised', emoji: '😲', color: 'from-pink-400 to-purple-500', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300' },
  neutral: { label: 'Neutral', emoji: '😐', color: 'from-gray-400 to-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  confused: { label: 'Confused', emoji: '😕', color: 'from-purple-400 to-violet-500', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  tired: { label: 'Tired', emoji: '😴', color: 'from-slate-400 to-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' }
};

const SOURCE_LABELS = {
  confirmed: 'Confirmed',
  manual: 'Manual',
  conversation: 'From Chat',
  confirmation: 'Confirmed Detection',
  predicted: 'AI Predicted'
};

const SOURCE_COLORS = {
  confirmed: 'badge-success',
  manual: 'badge-primary',
  conversation: 'badge-info',
  confirmation: 'badge-warning',
  predicted: 'badge-neutral'
};

export class MoodHistory {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.container = null;
    this.unsubscribes = [];
    this.currentFilter = 'all';
    this.currentSort = 'newest';
    this.viewMode = 'list'; // 'list' or 'timeline'
  }

  mount(container) {
    this.container = container;
    this.render();
    this.setupEvents();
  }

  render() {
    if (!this.container) return;

    const entries = this.getFilteredEntries();

    this.container.innerHTML = `
      <div class="space-y-4" id="mood-history">
        <!-- Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <label for="history-filter" class="text-sm text-muted">Filter:</label>
            <select id="history-filter" class="input w-auto py-2 px-3 text-sm">
              <option value="all" ${this.currentFilter === 'all' ? 'selected' : ''}>All Moods</option>
              <option value="confirmed" ${this.currentFilter === 'confirmed' ? 'selected' : ''}>Confirmed Only</option>
              <option value="manual" ${this.currentFilter === 'manual' ? 'selected' : ''}>Manual Entries</option>
              <option value="predicted" ${this.currentFilter === 'predicted' ? 'selected' : ''}>AI Predictions</option>
              <option value="conversation" ${this.currentFilter === 'conversation' ? 'selected' : ''}>From Conversation</option>
            </select>

            <label for="history-sort" class="text-sm text-muted">Sort:</label>
            <select id="history-sort" class="input w-auto py-2 px-3 text-sm">
              <option value="newest" ${this.currentSort === 'newest' ? 'selected' : ''}>Newest First</option>
              <option value="oldest" ${this.currentSort === 'oldest' ? 'selected' : ''}>Oldest First</option>
              <option value="mood" ${this.currentSort === 'mood' ? 'selected' : ''}>By Mood</option>
            </select>

            <div class="flex items-center gap-1 ml-auto border-l border-lavender-200/50 dark:border-primary-800/50 pl-4">
              <button class="view-mode-btn p-2 rounded-lg ${this.viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-muted hover:text-primary-700 dark:hover:text-lavender-100'}" data-view="list" aria-label="List view">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <button class="view-mode-btn p-2 rounded-lg ${this.viewMode === 'timeline' ? 'bg-primary-500 text-white' : 'text-muted hover:text-primary-700 dark:hover:text-lavender-100'}" data-view="timeline" aria-label="Timeline view">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-sm text-muted" id="entry-count">${entries.length} entries</span>
            <button id="export-history" class="btn btn-ghost btn-sm text-xs">Export</button>
            <button id="clear-history" class="btn btn-ghost btn-sm text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Clear All</button>
          </div>
        </div>

        <!-- Entries -->
        <div id="entries-container" class="space-y-3">
          ${entries.length === 0 ? this.renderEmptyState() : this.renderEntries(entries)}
        </div>
      </div>
    `;

    this.setupEvents();
  }

  getFilteredEntries() {
    let entries = this.stateManager.getMoodHistory();

    // Filter
    if (this.currentFilter !== 'all') {
      entries = entries.filter(e => e.source === this.currentFilter);
    }

    // Sort
    switch (this.currentSort) {
      case 'oldest':
        entries = [...entries].sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'mood':
        entries = [...entries].sort((a, b) => a.mood.localeCompare(b.mood));
        break;
      case 'newest':
      default:
        entries = [...entries].sort((a, b) => b.timestamp - a.timestamp);
        break;
    }

    return entries;
  }

  renderEntries(entries) {
    if (this.viewMode === 'timeline') {
      return this.renderTimeline(entries);
    }
    return this.renderList(entries);
  }

  renderList(entries) {
    return entries.map(entry => {
      const config = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.neutral;
      const sourceLabel = SOURCE_LABELS[entry.source] || entry.source;
      const sourceColor = SOURCE_COLORS[entry.source] || 'badge-neutral';
      const date = new Date(entry.timestamp);

      return `
        <div class="history-entry glass rounded-xl p-4 hover:shadow-md transition-shadow group" data-entry-id="${entry.id}">
          <div class="flex items-start gap-4">
            <!-- Mood Emoji & Color -->
            <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-xl shadow-lg">
              ${config.emoji}
            </div>

            <!-- Entry Details -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-1">
                <h4 class="font-semibold text-primary-900 dark:text-primary-100">${config.label}</h4>
                <span class="badge ${sourceColor} flex-shrink-0">${sourceLabel}</span>
              </div>

              <div class="flex flex-wrap items-center gap-4 text-sm text-muted">
                <span class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  ${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                ${entry.confidence < 1 ? `
                  <span class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    ${Math.round(entry.confidence * 100)}% confident
                  </span>
                ` : ''}
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="entry-edit p-2 rounded-lg hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted hover:text-primary-700 dark:hover:text-lavender-100" data-entry-id="${entry.id}" aria-label="Edit entry" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              </button>
              <button class="entry-delete p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-muted hover:text-red-600 dark:hover:text-red-400" data-entry-id="${entry.id}" aria-label="Delete entry" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderTimeline(entries) {
    // Group by date
    const grouped = {};
    entries.forEach(entry => {
      const date = new Date(entry.timestamp);
      date.setHours(0, 0, 0, 0);
      const key = date.getTime();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => b - a);

    return sortedDates.map(dateKey => {
      const date = new Date(parseInt(dateKey));
      const dayEntries = grouped[dateKey];

      return `
        <div class="timeline-day glass rounded-xl p-4">
          <div class="flex items-center gap-3 mb-4 pb-3 border-b border-lavender-200/50 dark:border-primary-800/50">
            <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
              <span class="font-bold text-primary-700 dark:text-primary-300">${date.getDate()}</span>
            </div>
            <div>
              <p class="font-semibold text-primary-900 dark:text-primary-100">${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <p class="text-sm text-muted">${dayEntries.length} entr${dayEntries.length === 1 ? 'y' : 'ies'}</p>
            </div>
          </div>

          <div class="space-y-2">
            ${dayEntries.map(entry => {
              const config = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.neutral;
              const sourceLabel = SOURCE_LABELS[entry.source] || entry.source;
              const sourceColor = SOURCE_COLORS[entry.source] || 'badge-neutral';
              const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return `
                <div class="timeline-entry flex items-center gap-3 p-3 rounded-lg glass/50 hover:glass transition-all" data-entry-id="${entry.id}">
                  <div class="w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-lg flex-shrink-0">
                    ${config.emoji}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-primary-900 dark:text-primary-100 truncate">${config.label}</p>
                    <p class="text-xs text-muted">${time} • ${sourceLabel}</p>
                  </div>
                  <span class="badge ${sourceColor} text-xs">${sourceLabel}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  renderEmptyState() {
    return `
      <div class="text-center py-12 text-muted">
        <svg class="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p class="text-lg font-medium text-primary-700 dark:text-lavender-200 mb-1">No mood entries yet</p>
        <p class="text-sm">Start tracking your mood to see history here</p>
        <button class="btn btn-primary mt-4" id="log-first-mood">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
          Log Your First Mood
        </button>
      </div>
    `;
  }

  setupEvents() {
    if (!this.container) return;

    // Filter
    const filterSelect = this.container.querySelector('#history-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.render();
      });
    }

    // Sort
    const sortSelect = this.container.querySelector('#history-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.render();
      });
    }

    // View mode
    this.container.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewMode = btn.dataset.view;
        this.render();
      });
    });

    // Entry actions
    this.container.querySelectorAll('.entry-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const entryId = btn.dataset.entryId;
        if (confirm('Delete this mood entry?')) {
          this.stateManager.deleteMoodEntry(entryId);
        }
      });
    });

    this.container.querySelectorAll('.entry-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const entryId = btn.dataset.entryId;
        this.editEntry(entryId);
      });
    });

    // Export
    this.container.querySelector('#export-history')?.addEventListener('click', () => {
      this.exportHistory();
    });

    // Clear all
    this.container.querySelector('#clear-history')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete ALL mood history? This cannot be undone.')) {
        this.stateManager.clearMoodHistory();
        this.stateManager.addNotification({
          type: 'success',
          title: 'History Cleared',
          message: 'All mood entries have been deleted.'
        });
      }
    });

    // Log first mood
    this.container.querySelector('#log-first-mood')?.addEventListener('click', () => {
      this.showMoodSelector();
    });
  }

  editEntry(entryId) {
    const history = this.stateManager.getMoodHistory();
    const entry = history.find(e => e.id === entryId);
    if (!entry) return;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass rounded-2xl p-6 max-w-md w-full animate-slide-up">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-display text-xl font-bold text-primary-900 dark:text-primary-100">Edit Mood Entry</h3>
          <button class="modal-close p-2 rounded-xl hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form id="edit-entry-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-primary-700 dark:text-lavender-200 mb-1">Mood</label>
            <select name="mood" class="input">
              ${Object.entries(MOOD_CONFIG).map(([key, config]) => `
                <option value="${key}" ${entry.mood === key ? 'selected' : ''}>${config.emoji} ${config.label}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-primary-700 dark:text-lavender-200 mb-1">Source</label>
            <select name="source" class="input">
              ${Object.entries(SOURCE_LABELS).map(([key, label]) => `
                <option value="${key}" ${entry.source === key ? 'selected' : ''}>${label}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-primary-700 dark:text-lavender-200 mb-1">Date & Time</label>
            <input type="datetime-local" name="timestamp" class="input" value="${new Date(entry.timestamp).toISOString().slice(0, 16)}">
          </div>

          <div class="flex gap-3 pt-4 border-t border-lavender-200/50 dark:border-primary-800/50">
            <button type="button" class="btn btn-secondary flex-1" id="cancel-edit">Cancel</button>
            <button type="submit" class="btn btn-primary flex-1">Save Changes</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('#edit-entry-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      this.stateManager.deleteMoodEntry(entryId);
      this.stateManager.addMoodEntry(
        formData.get('mood'),
        entry.confidence,
        formData.get('source')
      );
      // Update timestamp would require modifying the entry directly
      modal.remove();
    });

    function closeModal() {
      modal.remove();
    }

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('#cancel-edit').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  exportHistory() {
    const history = this.stateManager.getMoodHistory();
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mood-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.stateManager.addNotification({
      type: 'success',
      title: 'Exported',
      message: 'Mood history has been downloaded as JSON.'
    });
  }

  showMoodSelector() {
    import('./MoodSelector.js').then(({ showMoodSelectorModal }) => {
      showMoodSelectorModal(this.stateManager, this.themeManager, (moodId) => {
        this.stateManager.setUserConfirmedMood(moodId, 'manual');
      });
    });
  }

  setupListeners() {
    this.unsubscribes.push(
      this.stateManager.on('mood.history.change', () => this.render())
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
  }
}