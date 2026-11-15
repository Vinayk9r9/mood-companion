import { App } from './App.js';
import { ThemeManager } from './utils/ThemeManager.js';
import { StateManager } from './utils/StateManager.js';

// Initialize theme manager
const themeManager = new ThemeManager();
themeManager.init();

// Initialize state manager
const stateManager = new StateManager();

// Initialize app with error handling
async function initializeApp() {
  try {
    console.log('🌸 Starting Mood Companion initialization...');

    await stateManager.init();
    console.log('✅ StateManager initialized');

    // Mount the app
    const app = new App(stateManager, themeManager);
    app.mount('#app');
    console.log('✅ App mounted');

    // Make globally accessible for debugging
    window.moodCompanion = { app, stateManager, themeManager };

    console.log('🌸 Mood Companion initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Mood Companion:', error);
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20">
        <div class="text-center max-w-md">
          <svg class="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <h1 class="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">Failed to Initialize</h1>
          <p class="text-red-600 dark:text-red-300 mb-4">${error.message}</p>
          <p class="text-sm text-red-500 dark:text-red-400 mb-4">${error.stack}</p>
          <button onclick="location.reload()" class="btn btn-primary">Reload Page</button>
        </div>
      </div>
    `;
  }
}

initializeApp();

// Catch any unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});