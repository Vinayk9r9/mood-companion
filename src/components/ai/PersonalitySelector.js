const PERSONALITIES = {
  'funny-friend': {
    name: 'Funny Friend',
    emoji: '😄',
    color: 'from-yellow-400 to-orange-400',
    description: 'Playful, tells jokes, shares fun facts',
    prompt: 'I\'ll keep things light and fun! Ask me for a joke or a random fact.'
  },
  'motivational-coach': {
    name: 'Motivational Coach',
    emoji: '💪',
    color: 'from-red-400 to-red-600',
    description: 'Encouraging, helps set and achieve goals',
    prompt: 'Let\'s work towards your goals together. What do you want to achieve?'
  },
  'calm-listener': {
    name: 'Calm Listener',
    emoji: '🤗',
    color: 'from-blue-400 to-indigo-500',
    description: 'Empathetic, patient, lets you express freely',
    prompt: 'I\'m here to listen without judgment. Share whatever\'s on your mind.'
  },
  'productivity-assistant': {
    name: 'Productivity Assistant',
    emoji: '📋',
    color: 'from-green-400 to-teal-500',
    description: 'Organized, practical, breaks down tasks',
    prompt: 'I can help organize your tasks and boost productivity. What do you need?'
  }
};

export class PersonalitySelector {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.container = null;
    this.compact = false;
  }

  mount(container, options = {}) {
    this.container = container;
    this.compact = options.compact || false;
    this.render();
    this.setupEvents();
  }

  render() {
    if (!this.container) return;

    const currentPersonality = this.stateManager.get('chat.personality');

    if (this.compact) {
      // Compact version for header
      this.container.innerHTML = `
        <div class="relative" id="personality-dropdown">
          <button
            id="personality-trigger"
            class="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300/50 dark:hover:border-primary-700/50 transition-colors"
            aria-label="Change personality"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <span class="text-lg">${PERSONALITIES[currentPersonality].emoji}</span>
            <span class="hidden sm:block font-medium text-sm text-primary-900 dark:text-primary-100">${PERSONALITIES[currentPersonality].name}</span>
            <svg class="w-4 h-4 text-muted ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>

          <div id="personality-menu" class="absolute right-0 top-full mt-2 w-56 glass rounded-xl border border-lavender-200/50 dark:border-primary-800/50 shadow-lg opacity-0 invisible transform translate-y-2 transition-all duration-200 z-50">
            <div class="p-2">
              ${Object.entries(PERSONALITIES).map(([id, config]) => `
                <button
                  class="personality-option w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${id === currentPersonality ? 'bg-primary-500/10' : 'hover:bg-lavender-100 dark:hover:bg-primary-800'}"
                  data-personality="${id}"
                  role="menuitem"
                  aria-selected="${id === currentPersonality}"
                >
                  <span class="text-lg">${config.emoji}</span>
                  <div class="flex-1 text-left">
                    <p class="font-medium text-sm text-primary-900 dark:text-primary-100">${config.name}</p>
                    <p class="text-xs text-muted">${config.description}</p>
                  </div>
                  ${id === currentPersonality ? '<svg class="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : ''}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } else {
      // Full version for settings page
      this.container.innerHTML = `
        <div class="space-y-4" id="personality-selector">
          <div class="grid grid-cols-2 gap-4">
            ${Object.entries(PERSONALITIES).map(([id, config]) => `
              <button
                class="personality-card relative group p-5 rounded-2xl glass border-2 transition-all duration-300 ${id === currentPersonality
                  ? 'border-primary-400 shadow-lg shadow-primary-500/20 bg-primary-500/5'
                  : 'border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300/50 dark:hover:border-primary-700/50'}"
                data-personality="${id}"
                aria-pressed="${id === currentPersonality}"
              >
                <div class="absolute inset-0 rounded-2xl bg-gradient-to-br ${config.color} opacity-5 group-hover:opacity-10 transition-opacity"></div>

                <div class="relative z-10">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                      ${config.emoji}
                    </div>
                    <div>
                      <h4 class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100">${config.name}</h4>
                      <p class="text-sm text-muted">${config.description}</p>
                    </div>
                  </div>

                  <p class="text-sm text-primary-700 dark:text-lavender-200 mb-4 italic">"${config.prompt}"</p>

                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium ${id === currentPersonality ? 'text-primary-600 dark:text-primary-400' : 'text-muted'}">
                      ${id === currentPersonality ? '✓ Currently Active' : 'Select to activate'}
                    </span>
                    <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${id === currentPersonality
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-lavender-300 dark:border-primary-700'}">
                      ${id === currentPersonality ? '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : ''}
                    </div>
                  </div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  setupEvents() {
    if (!this.container) return;

    if (this.compact) {
      // Dropdown behavior
      const trigger = this.container.querySelector('#personality-trigger');
      const menu = this.container.querySelector('#personality-menu');
      const dropdown = this.container.querySelector('#personality-dropdown');

      if (trigger && menu) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = !menu.classList.contains('invisible');
          if (isOpen) {
            menu.classList.add('opacity-0', 'invisible', 'translate-y-2');
            menu.classList.remove('opacity-100', 'visible', 'translate-y-0');
            trigger.setAttribute('aria-expanded', 'false');
          } else {
            menu.classList.remove('opacity-0', 'invisible', 'translate-y-2');
            menu.classList.add('opacity-100', 'visible', 'translate-y-0');
            trigger.setAttribute('aria-expanded', 'true');
          }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
          if (dropdown && !dropdown.contains(e.target)) {
            menu.classList.add('opacity-0', 'invisible', 'translate-y-2');
            menu.classList.remove('opacity-100', 'visible', 'translate-y-0');
            trigger.setAttribute('aria-expanded', 'false');
          }
        });

        // Option selection
        menu.querySelectorAll('.personality-option').forEach(btn => {
          btn.addEventListener('click', () => {
            const personality = btn.dataset.personality;
            this.selectPersonality(personality);
            menu.classList.add('opacity-0', 'invisible', 'translate-y-2');
            menu.classList.remove('opacity-100', 'visible', 'translate-y-0');
            trigger.setAttribute('aria-expanded', 'false');
          });
        });
      }
    } else {
      // Card selection
      this.container.querySelectorAll('.personality-card').forEach(card => {
        card.addEventListener('click', () => {
          const personality = card.dataset.personality;
          this.selectPersonality(personality);
        });
      });
    }
  }

  selectPersonality(personality) {
    const currentPersonality = this.stateManager.get('chat.personality');
    if (currentPersonality === personality) return;

    this.stateManager.setPersonality(personality);

    const config = PERSONALITIES[personality];
    this.stateManager.addNotification({
      type: 'success',
      title: 'Personality Changed',
      message: `Now chatting with ${config.name}`
    });

    // Re-render
    this.render();
    this.setupEvents();
  }

  showModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
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
        this.selectPersonality(id);
        modal.remove();
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

  destroy() {
    // Cleanup if needed
  }
}