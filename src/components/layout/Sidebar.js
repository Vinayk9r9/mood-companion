import { Navigation, initNavigationEvents } from './Navigation.js';

export function Sidebar(stateManager, themeManager) {
  const sidebarOpen = stateManager.get('ui.sidebarOpen');

  return `
    <aside
      id="sidebar"
      class="fixed top-0 left-0 z-30 h-full transition-all duration-300 ease-in-out lg:static lg:z-auto ${sidebarOpen ? 'w-64' : 'w-16'} lg:w-64 glass border-r border-lavender-200/50 dark:border-primary-800/50"
      role="complementary"
      aria-label="Sidebar navigation"
    >
      ${Navigation(stateManager, themeManager)}
    </aside>
  `;
}

export function initSidebarEvents(stateManager) {
  initNavigationEvents(stateManager);
}