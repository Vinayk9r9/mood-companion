const QUICK_ACTIONS = [
  {
    id: 'chat',
    label: 'Chat with AI',
    icon: 'chat',
    color: 'from-primary-400 to-accent-400',
    description: 'Talk to your companion'
  },
  {
    id: 'log-mood',
    label: 'Log Mood',
    icon: 'heart',
    color: 'from-pink-400 to-red-400',
    description: 'Record how you feel'
  },
  {
    id: 'new-task',
    label: 'Add Task',
    icon: 'plus',
    color: 'from-green-400 to-teal-400',
    description: 'Create a new task'
  },
  {
    id: 'view-history',
    label: 'Mood History',
    icon: 'history',
    color: 'from-purple-400 to-violet-400',
    description: 'See your mood trends'
  },
  {
    id: 'breathing',
    label: 'Breathing Exercise',
    icon: 'wind',
    color: 'from-blue-400 to-cyan-400',
    description: 'Calm your mind'
  },
  {
    id: 'quote',
    label: 'Daily Quote',
    icon: 'sparkles',
    color: 'from-amber-400 to-orange-400',
    description: 'Get inspired'
  }
];

const ICONS = {
  chat: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>',
  heart: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>',
  plus: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>',
  history: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  wind: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>',
  sparkles: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>'
};

export class QuickActions {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.container = null;
  }

  mount(container) {
    this.container = container;
    this.render();
    this.setupEvents();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="grid grid-cols-3 gap-3" role="list" aria-label="Quick actions">
        ${QUICK_ACTIONS.map(action => `
          <button
            class="quick-action-card relative group p-4 rounded-2xl glass border border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300/50 dark:hover:border-primary-700/50 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            role="listitem"
            data-action="${action.id}"
            aria-label="${action.label}: ${action.description}"
          >
            <!-- Gradient background -->
            <div class="absolute inset-0 rounded-2xl bg-gradient-to-br ${action.color} opacity-5 group-hover:opacity-10 transition-opacity"></div>

            <div class="relative z-10 flex flex-col items-center text-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                ${ICONS[action.icon]}
              </div>
              <div>
                <p class="font-semibold text-primary-900 dark:text-primary-100 text-sm">${action.label}</p>
                <p class="text-[11px] text-muted">${action.description}</p>
              </div>
            </div>

            <!-- Hover indicator -->
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${action.color} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-b-2xl"></div>
          </button>
        `).join('')}
      </div>
    `;
  }

  setupEvents() {
    if (!this.container) return;

    this.container.querySelectorAll('.quick-action-card').forEach(card => {
      card.addEventListener('click', () => {
        const action = card.dataset.action;
        this.handleAction(action);
      });

      // Keyboard support
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
  }

  handleAction(action) {
    switch (action) {
      case 'chat':
        this.stateManager.navigateTo('ai-companion');
        break;
      case 'log-mood':
        this.stateManager.navigateTo('mood-tracker');
        break;
      case 'new-task':
        this.stateManager.navigateTo('my-tasks');
        setTimeout(() => this.stateManager.emit('task:new'), 100);
        break;
      case 'view-history':
        this.stateManager.navigateTo('mood-tracker');
        break;
      case 'breathing':
        this.startBreathingExercise();
        break;
      case 'quote':
        this.showDailyQuote();
        break;
    }
  }

  startBreathingExercise() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass rounded-2xl p-8 max-w-md w-full text-center animate-slide-up">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-display text-xl font-bold text-primary-900 dark:text-primary-100">Breathing Exercise</h3>
          <button class="modal-close p-2 rounded-xl hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <p class="text-primary-700 dark:text-lavender-200 mb-8">Follow the circle. Inhale as it grows, exhale as it shrinks.</p>

        <div class="relative mb-8">
          <div id="breathing-circle" class="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center shadow-glow animate-pulse-soft transition-all duration-1000 ease-in-out">
            <span class="text-white font-display text-2xl font-bold">Breathe</span>
          </div>
        </div>

        <div class="flex items-center justify-center gap-4 mb-6 text-sm text-muted">
          <span id="breathing-phase" class="font-medium text-primary-900 dark:text-primary-100">Ready</span>
          <span id="breathing-count" class="font-mono">0</span>
        </div>

        <div class="flex gap-3">
          <button id="start-breathing" class="btn btn-primary flex-1">Start</button>
          <button id="stop-breathing" class="btn btn-secondary flex-1" disabled>Stop</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const circle = modal.querySelector('#breathing-circle');
    const phaseText = modal.querySelector('#breathing-phase');
    const countText = modal.querySelector('#breathing-count');
    const startBtn = modal.querySelector('#start-breathing');
    const stopBtn = modal.querySelector('#stop-breathing');

    let intervalId = null;
    let phase = 'ready'; // ready, inhale, hold, exhale
    let cycle = 0;
    const cycles = 4; // 4-7-8 breathing: 4 cycles

    function closeModal() {
      if (intervalId) clearInterval(intervalId);
      modal.remove();
    }

    function updateCircle(phaseName, scale, text, duration = 4000) {
      phase = phaseName;
      phaseText.textContent = text;
      circle.style.transform = `scale(${scale})`;
      circle.style.transitionDuration = `${duration}ms`;

      if (phaseName === 'inhale') {
        circle.querySelector('span').textContent = 'Inhale';
      } else if (phaseName === 'hold') {
        circle.querySelector('span').textContent = 'Hold';
      } else if (phaseName === 'exhale') {
        circle.querySelector('span').textContent = 'Exhale';
      }
    }

    function runCycle() {
      if (cycle >= cycles) {
        finishExercise();
        return;
      }

      cycle++;
      countText.textContent = `${cycle}/${cycles}`;

      // Inhale (4 seconds)
      updateCircle('inhale', 1.5, 'Inhale...', 4000);
      setTimeout(() => {
        if (phase !== 'inhale') return;
        // Hold (7 seconds)
        updateCircle('hold', 1.5, 'Hold...', 7000);
        setTimeout(() => {
          if (phase !== 'hold') return;
          // Exhale (8 seconds)
          updateCircle('exhale', 0.8, 'Exhale...', 8000);
          setTimeout(() => {
            if (phase !== 'exhale') return;
            runCycle();
          }, 8000);
        }, 7000);
      }, 4000);
    }

    function finishExercise() {
      phase = 'ready';
      phaseText.textContent = 'Complete!';
      countText.textContent = '';
      circle.style.transform = 'scale(1)';
      circle.querySelector('span').textContent = 'Done!';
      circle.classList.remove('animate-pulse-soft');
      circle.classList.add('bg-green-400', 'from-green-400', 'to-teal-400');
      startBtn.textContent = 'Done';
      startBtn.disabled = true;
      stopBtn.disabled = true;

      setTimeout(() => {
        this.stateManager.addNotification({
          type: 'success',
          title: 'Breathing Complete',
          message: 'Great job! You completed 4 cycles of 4-7-8 breathing.'
        });
      }, 500);
    }

    startBtn.addEventListener('click', () => {
      if (phase === 'ready') {
        cycle = 0;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        runCycle();
      } else if (phase === 'complete') {
        closeModal();
      }
    });

    stopBtn.addEventListener('click', () => {
      closeModal();
    });

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  showDailyQuote() {
    const quotes = [
      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
      { text: "Your limitation—it's only your imagination.", author: "Unknown" },
      { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
      { text: "Great things never come from comfort zones.", author: "Unknown" },
      { text: "Dream it. Wish it. Do it.", author: "Unknown" },
      { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
      { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
      { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
      { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
      { text: "Do something today that your future self will thank you for.", author: "Unknown" },
      { text: "Little things make big days.", author: "Unknown" }
    ];

    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass rounded-2xl p-8 max-w-md w-full text-center animate-slide-up">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-display text-xl font-bold text-primary-900 dark:text-primary-100">Daily Quote</h3>
          <button class="modal-close p-2 rounded-xl hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div class="relative mb-8">
          <svg class="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 text-primary-400/30" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.381c0-5.969 4.867-10.836 10.85-10.836 2.347 0 4.542.933 6.14 2.438v3.244c-1.733-.977-3.816-1.532-5.977-1.532-5.523 0-10 4.477-10 10v5.529h-2.983zm-14.017 0v-7.381c0-5.969 4.867-10.836 10.85-10.836 2.347 0 4.542.933 6.14 2.438v3.244c-1.733-.977-3.816-1.532-5.977-1.532-5.523 0-10 4.477-10 10v5.529h-2.983z"/></svg>
          <blockquote class="text-lg font-medium text-primary-900 dark:text-primary-100 leading-relaxed">"${quote.text}"</blockquote>
        </div>

        <footer class="text-muted border-t border-lavender-200/50 dark:border-primary-800/50 pt-4">
          <cite class="not-italic">— ${quote.author}</cite>
        </footer>

        <div class="mt-6 flex gap-3">
          <button id="new-quote" class="btn btn-primary flex-1">New Quote</button>
          <button id="close-quote" class="btn btn-secondary flex-1">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    function closeModal() {
      modal.remove();
    }

    modal.querySelector('#new-quote').addEventListener('click', () => {
      closeModal();
      this.showDailyQuote();
    });

    modal.querySelector('#close-quote').addEventListener('click', closeModal);
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  destroy() {
    // Cleanup if needed
  }
}