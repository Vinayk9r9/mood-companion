import { Header, initHeaderEvents } from './components/layout/Header.js';
import { Navigation, initNavigationEvents } from './components/layout/Navigation.js';
import { HomePage } from './pages/HomePage.js';
import { AiCompanionPage } from './pages/AiCompanionPage.js';
import { MoodTrackerPage } from './pages/MoodTrackerPage.js';
import { MyTasksPage } from './pages/MyTasksPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { NotificationContainer } from './components/ui/NotificationContainer.js';
import { MobileMenu, initMobileMenuEvents } from './components/layout/MobileMenu.js';
import { Sidebar, initSidebarEvents } from './components/layout/Sidebar.js';

export class App {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.currentPageComponent = null;
    this.unsubscribe = null;
    this.headerCleanup = null;
    this.mobileMenuCleanup = null;
    this.sidebarCleanup = null;
  }

  mount(selector) {
    this.root = document.querySelector(selector);
    this.render();
    this.setupStateListener();
  }

  setupStateListener() {
    this.unsubscribe = this.stateManager.on('change', (data) => {
      if (data.path === 'currentPage' || data.path === 'ui.mobileMenuOpen' || data.path === 'ui.sidebarOpen') {
        this.render();
      }
    });
  }

  getPageComponent(page) {
    const pages = {
      'home': HomePage,
      'ai-companion': AiCompanionPage,
      'mood-tracker': MoodTrackerPage,
      'my-tasks': MyTasksPage,
      'settings': SettingsPage
    };
    return pages[page] || HomePage;
  }

  render() {
    const currentPage = this.stateManager.get('currentPage');
    const mobileMenuOpen = this.stateManager.get('ui.mobileMenuOpen');
    const sidebarOpen = this.stateManager.get('ui.sidebarOpen');

    // Create or update page component
    const PageComponent = this.getPageComponent(currentPage);
    if (!this.currentPageComponent || this.currentPageComponent.constructor !== PageComponent) {
      if (this.currentPageComponent && this.currentPageComponent.destroy) {
        this.currentPageComponent.destroy();
      }
      this.currentPageComponent = new PageComponent(this.stateManager, this.themeManager);
    }

    // Clean up previous event listeners
    if (this.headerCleanup) this.headerCleanup();
    if (this.mobileMenuCleanup) this.mobileMenuCleanup();
    if (this.sidebarCleanup) this.sidebarCleanup();

    this.root.innerHTML = `
      <div class="min-h-screen flex flex-col" data-theme="${this.themeManager.getResolvedTheme()}">
        <!-- Header -->
        <header id="header" class="fixed top-0 left-0 right-0 z-40 glass border-b border-lavender-200/50 dark:border-primary-800/50">
          ${Header(this.stateManager, this.themeManager)}
        </header>

        <!-- Mobile Menu Overlay -->
        ${mobileMenuOpen ? `<div class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" id="mobile-menu-overlay"></div>` : ''}

        <!-- Mobile Menu -->
        ${MobileMenu(this.stateManager, this.themeManager)}

        <!-- Sidebar -->
        ${Sidebar(this.stateManager, this.themeManager)}

        <!-- Main Content -->
        <main class="flex-1 pt-20 lg:pt-16 pb-8 px-4 md:px-6 lg:pl-64" id="main-content">
          <div class="max-w-7xl mx-auto w-full" id="page-content"></div>
        </main>

        <!-- Notification Container -->
        <div id="notification-container" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 lg:bottom-6 lg:right-6"></div>
      </div>
    `;

    // Initialize layout event listeners
    this.headerCleanup = initHeaderEvents(this.stateManager, this.themeManager);
    this.mobileMenuCleanup = initMobileMenuEvents(this.stateManager);
    this.sidebarCleanup = initSidebarEvents(this.stateManager);

    // Mount page component
    const pageContainer = this.root.querySelector('#page-content');
    if (pageContainer && this.currentPageComponent) {
      this.currentPageComponent.mount(pageContainer);
    }

    // Mount notifications
    const notificationContainer = this.root.querySelector('#notification-container');
    if (notificationContainer) {
      new NotificationContainer(this.stateManager).mount(notificationContainer);
    }

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Mobile menu overlay click
    const overlay = this.root.querySelector('#mobile-menu-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        this.stateManager.set('ui.mobileMenuOpen', false);
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K for command palette (future)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // TODO: Open command palette
      }

      // Escape to close mobile menu/sidebar
      if (e.key === 'Escape') {
        this.stateManager.set('ui.mobileMenuOpen', false);
        this.stateManager.set('ui.sidebarOpen', false);
      }
    });
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.headerCleanup) this.headerCleanup();
    if (this.mobileMenuCleanup) this.mobileMenuCleanup();
    if (this.sidebarCleanup) this.sidebarCleanup();
    if (this.currentPageComponent && this.currentPageComponent.destroy) {
      this.currentPageComponent.destroy();
    }
  }
}