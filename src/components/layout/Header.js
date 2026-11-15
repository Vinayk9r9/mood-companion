export function Header(stateManager, themeManager) {
  const currentPage = stateManager.get('currentPage');
  const pageTitles = {
    'home': 'Home',
    'ai-companion': 'AI Companion',
    'mood-tracker': 'Mood Tracker',
    'my-tasks': 'My Tasks',
    'settings': 'Settings'
  };

  const isMobile = () => window.innerWidth < 1024;

  return `
    <div class="h-16 lg:h-14 flex items-center justify-between px-4 md:px-6">
      <!-- Left: Menu button + Title -->
      <div class="flex items-center gap-3 lg:gap-4">
        <button
          id="menu-toggle"
          class="lg:hidden p-2 rounded-xl hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted hover:text-primary-700 dark:hover:text-lavender-100"
          aria-label="Open menu"
          aria-expanded="false"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>

        <h1 class="font-display text-xl lg:text-2xl font-bold gradient-text hidden sm:block">
          Mood Companion
        </h1>

        <h1 class="font-display text-lg font-bold gradient-text sm:hidden">
          MC
        </h1>
      </div>

      <!-- Center: Page Title (Desktop) -->
      <div class="hidden lg:flex-1 lg:justify-center flex items-center">
        <h2 class="text-lg font-semibold text-primary-900 dark:text-primary-100">
          ${pageTitles[currentPage] || 'Mood Companion'}
        </h2>
      </div>

      <!-- Right: Theme toggle + Profile -->
      <div class="flex items-center gap-2">
        <!-- Theme Toggle -->
        <button
          id="theme-toggle"
          class="p-2 rounded-xl hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted hover:text-primary-700 dark:hover:text-lavender-100 relative"
          aria-label="Toggle theme"
        >
          <span class="relative z-10">
            ${themeManager.isDark()
              ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>'
              : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>'
            }
          </span>
          <!-- Theme indicator dot -->
          <span class="absolute -top-1 -right-1 w-3 h-3 rounded-full ${themeManager.isDark() ? 'bg-accent-400' : 'bg-amber-400'} border-2 border-white dark:border-primary-900"></span>
        </button>

        <!-- Profile/Avatar placeholder -->
        <div class="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center font-medium text-white text-sm shadow-md">
          <span class="gradient-text font-display font-bold text-xs lg:text-sm">MC</span>
        </div>
      </div>
    </div>
  `;
}

export function initHeaderEvents(stateManager, themeManager) {
  // Menu toggle
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      stateManager.set('ui.mobileMenuOpen', !stateManager.get('ui.mobileMenuOpen'));
    });
  }

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      themeManager.toggleTheme();
      // Re-render header to update icon
      const header = document.querySelector('#header');
      if (header) {
        // We'll handle this through state change
      }
    });
  }

  // Listen for theme changes to update header
  const themeUnsub = themeManager.on ? themeManager.on('change', () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.innerHTML = themeManager.isDark()
        ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>'
        : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>';
    }
  }) : null;

  // Clean up on unmount
  return () => {
    if (themeUnsub) themeUnsub();
  };
}