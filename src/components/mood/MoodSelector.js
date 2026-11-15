import { MOOD_CONFIG } from '../../utils/moodConfig.js';

const MOOD_OPTIONS = [
  { id: 'happy', label: 'Happy', emoji: '😊', description: 'Feeling joyful and positive', color: MOOD_CONFIG.happy.color },
  { id: 'sad', label: 'Sad', emoji: '😢', description: 'Feeling down or melancholic', color: MOOD_CONFIG.sad.color },
  { id: 'angry', label: 'Angry', emoji: '😠', description: 'Feeling frustrated or upset', color: MOOD_CONFIG.angry.color },
  { id: 'surprised', label: 'Surprised', emoji: '😲', description: 'Something unexpected happened', color: MOOD_CONFIG.surprised.color },
  { id: 'neutral', label: 'Neutral', emoji: '😐', description: 'Feeling calm and balanced', color: MOOD_CONFIG.neutral.color },
  { id: 'confused', label: 'Confused', emoji: '😕', description: 'Things feel unclear or puzzling', color: MOOD_CONFIG.confused.color },
  { id: 'tired', label: 'Tired', emoji: '😴', description: 'Feeling drained or sleepy', color: MOOD_CONFIG.tired.color }
];

export class MoodSelector {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.container = null;
    this.onSelect = null;
  }

  mount(container, options = {}) {
    this.container = container;
    this.onSelect = options.onSelect || null;
    this.render();
    this.setupEvents();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="mood-selector" role="dialog" aria-label="Select your mood">
        <div class="grid grid-cols-4 gap-3" role="radiogroup" aria-label="Mood options">
          ${MOOD_OPTIONS.map(mood => `
            <button
              class="mood-option relative group p-4 rounded-2xl border-2 border-transparent hover:border-lavender-300 dark:hover:border-primary-700 transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              role="radio"
              aria-checked="false"
              data-mood="${mood.id}"
              title="${mood.description}"
            >
              <!-- Gradient background -->
              <div class="absolute inset-0 rounded-2xl bg-gradient-to-br ${mood.color} opacity-10 group-hover:opacity-20 transition-opacity"></div>

              <div class="relative z-10 flex flex-col items-center gap-2">
                <span class="text-4xl animate-bounce-gentle">${mood.emoji}</span>
                <span class="font-medium text-sm text-primary-900 dark:text-primary-100">${mood.label}</span>
                <span class="text-[10px] text-muted text-center px-2">${mood.description}</span>
              </div>

              <!-- Selection indicator -->
              <div class="absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-lavender-300 dark:border-primary-700 transition-all duration-200 group-hover:scale-110">
                <svg class="w-full h-full text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  setupEvents() {
    if (!this.container) return;

    this.container.querySelectorAll('.mood-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;

        // Visual feedback
        this.container.querySelectorAll('.mood-option').forEach(b => {
          b.classList.remove('bg-primary-500/10', 'border-primary-300', 'dark:border-primary-700');
          b.setAttribute('aria-checked', 'false');
          b.querySelector('svg')?.classList.add('opacity-0');
        });

        btn.classList.add('bg-primary-500/10', 'border-primary-300', 'dark:border-primary-700');
        btn.setAttribute('aria-checked', 'true');
        btn.querySelector('svg')?.classList.remove('opacity-0');

        if (this.onSelect) {
          this.onSelect(mood);
        }
      });

      // Keyboard support
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });
  }

  destroy() {
    // Cleanup if needed
  }
}

// Standalone function for modal usage
export function showMoodSelectorModal(stateManager, themeManager, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in';
  modal.innerHTML = `
    <div class="glass rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
      <div class="flex items-center justify-between mb-6">
        <h3 class="font-display text-xl font-bold text-primary-900 dark:text-primary-100">How are you feeling?</h3>
        <button class="modal-close p-2 rounded-xl hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted" aria-label="Close">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      <p class="text-primary-700 dark:text-lavender-200 mb-6">Select the mood that best matches how you're feeling right now.</p>
      <div class="grid grid-cols-4 gap-3" id="mood-grid" role="radiogroup" aria-label="Mood options"></div>
      <div class="mt-6 pt-4 border-t border-lavender-200/50 dark:border-primary-800/50">
        <button class="btn btn-secondary w-full" id="cancel-mood">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const moodGrid = modal.querySelector('#mood-grid');
  MOOD_OPTIONS.forEach(mood => {
    const btn = document.createElement('button');
    btn.className = `mood-option relative group p-4 rounded-2xl border-2 border-transparent hover:border-lavender-300 dark:hover:border-primary-700 transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2`;
    btn.role = 'radio';
    btn.setAttribute('aria-checked', 'false');
    btn.dataset.mood = mood.id;
    btn.title = mood.description;
    btn.innerHTML = `
      <div class="absolute inset-0 rounded-2xl bg-gradient-to-br ${mood.color} opacity-10 group-hover:opacity-20 transition-opacity"></div>
      <div class="relative z-10 flex flex-col items-center gap-2">
        <span class="text-4xl animate-bounce-gentle">${mood.emoji}</span>
        <span class="font-medium text-sm text-primary-900 dark:text-primary-100">${mood.label}</span>
        <span class="text-[10px] text-muted text-center px-2">${mood.description}</span>
      </div>
      <div class="absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-lavender-300 dark:border-primary-700 transition-all duration-200 group-hover:scale-110">
        <svg class="w-full h-full text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
      </div>
    `;
    btn.addEventListener('click', () => {
      moodGrid.querySelectorAll('.mood-option').forEach(b => {
        b.classList.remove('bg-primary-500/10', 'border-primary-300', 'dark:border-primary-700');
        b.setAttribute('aria-checked', 'false');
        b.querySelector('svg')?.classList.add('opacity-0');
      });
      btn.classList.add('bg-primary-500/10', 'border-primary-300', 'dark:border-primary-700');
      btn.setAttribute('aria-checked', 'true');
      btn.querySelector('svg')?.classList.remove('opacity-0');

      if (onConfirm) onConfirm(mood.id);
      closeModal();
    });
    moodGrid.appendChild(btn);
  });

  function closeModal() {
    modal.remove();
  }

  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.querySelector('#cancel-mood').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Focus trap
  const focusable = modal.querySelectorAll('button');
  focusable[0]?.focus();
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === focusable[0]) {
        e.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        e.preventDefault();
        focusable[0].focus();
      }
    }
  });
}