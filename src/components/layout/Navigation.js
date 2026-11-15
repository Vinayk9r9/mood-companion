export function Navigation(stateManager, themeManager) {
  const currentPage = stateManager.get('currentPage');
  const sidebarOpen = stateManager.get('ui.sidebarOpen');

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'ai-companion', label: 'AI Companion', icon: 'bot' },
    { id: 'mood-tracker', label: 'Mood Tracker', icon: 'heart-pulse' },
    { id: 'my-tasks', label: 'My Tasks', icon: 'check-square' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  const icons = {
    home: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>',
    bot: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>',
    'heart-pulse': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>',
    'check-square': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>',
    settings: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>'
  };

  return `
    <nav class="flex flex-col gap-1 p-2 ${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out overflow-hidden" role="navigation" aria-label="Main navigation">
      <ul class="flex flex-col gap-1" role="list">
        ${navItems.map(item => {
          const isActive = currentPage === item.id;
          return `
            <li>
              <button
                data-page="${item.id}"
                class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'text-muted hover:text-primary-700 dark:hover:text-lavender-100 hover:bg-lavender-100 dark:hover:bg-primary-800'}"
                role="tab"
                aria-selected="${isActive}"
                aria-label="${item.label}"
                title="${sidebarOpen ? '' : item.label}"
              >
                <span class="flex-shrink-0" aria-hidden="true">${icons[item.icon]}</span>
                <span class="nav-label overflow-hidden whitespace-nowrap transition-all duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}">${item.label}</span>
              </button>
            </li>
          `;
        }).join('')}
      </ul>

      <!-- Divider -->
      <div class="my-3 border-t border-lavender-200/50 dark:border-primary-800/50" role="separator"></div>

      <!-- Quick Actions (when sidebar open) -->
      <div class="nav-quick-actions overflow-hidden transition-all duration-300 ${sidebarOpen ? 'opacity-100 max-h-64' : 'opacity-0 max-h-0'}">
        <div class="px-2 pb-2 space-y-1">
          <p class="text-xs font-medium text-muted uppercase tracking-wider px-3">Quick Actions</p>
          <button class="quick-action w-full flex items-center gap-3 px-3 py-2 rounded-xl text-muted hover:text-primary-700 dark:hover:text-lavender-100 hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-sm" data-action="new-task">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <span>New Task</span>
          </button>
          <button class="quick-action w-full flex items-center gap-3 px-3 py-2 rounded-xl text-muted hover:text-primary-700 dark:hover:text-lavender-100 hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-sm" data-action="log-mood">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            <span>Log Mood</span>
          </button>
          <button class="quick-action w-full flex items-center gap-3 px-3 py-2 rounded-xl text-muted hover:text-primary-700 dark:hover:text-lavender-100 hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-sm" data-action="chat">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            <span>Chat with AI</span>
          </button>
        </div>
      </div>
    </nav>
  `;
}

export function initNavigationEvents(stateManager) {
  const nav = document.querySelector('nav');
  if (!nav) return;

  // Navigation items
  nav.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      stateManager.navigateTo(page);
    });
  });

  // Quick actions
  nav.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      switch (action) {
        case 'new-task':
          stateManager.navigateTo('my-tasks');
          setTimeout(() => {
            stateManager.emit('task:new');
          }, 100);
          break;
        case 'log-mood':
          stateManager.navigateTo('mood-tracker');
          break;
        case 'chat':
          stateManager.navigateTo('ai-companion');
          break;
      }
    });
  });
}