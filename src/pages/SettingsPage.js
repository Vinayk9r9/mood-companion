import { PersonalitySelector } from '../components/ai/PersonalitySelector.js';

export class SettingsPage {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.components = {};
    this.unsubscribes = [];
  }

  mount(container) {
    this.container = container;
    this.render();
    this.initComponents();
    this.setupListeners();
  }

  render() {
    const settings = this.stateManager.get('settings');
    const theme = this.themeManager.getTheme();
    const resolvedTheme = this.themeManager.getResolvedTheme();
    const historyCount = this.stateManager.getMoodHistory().length;
    const taskCount = this.stateManager.get('tasks.items')?.length || 0;
    const messageCount = this.stateManager.get('chat.messages')?.length || 0;

    this.container.innerHTML = `
      <div class="space-y-6 animate-fade-in max-w-3xl" id="settings-content">
        <header class="pb-4 border-b border-lavender-200/50 dark:border-primary-800/50">
          <h1 class="font-display text-2xl font-bold gradient-text">Settings</h1>
          <p class="text-primary-700 dark:text-lavender-200 mt-1">Customize your Mood Companion experience</p>
        </header>

        <!-- Appearance -->
        <section class="card p-6 space-y-6" aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
            Appearance
          </h2>

          <div class="space-y-4">
            <!-- Theme Selector -->
            <div>
              <label class="block text-sm font-medium text-primary-700 dark:text-lavender-200 mb-3">Theme</label>
              <div class="grid grid-cols-3 gap-3">
                ${['light', 'dark', 'system'].map(t => `
                  <button class="theme-option p-4 rounded-xl border-2 transition-all ${theme === t ? 'border-primary-400 bg-primary-500/10' : 'border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300/50 dark:hover:border-primary-700/50'}" data-theme="${t}" role="radio" aria-checked="${theme === t}">
                    <div class="flex items-center justify-center gap-2 mb-2">
                      ${t === 'light' ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>' : ''}
                      ${t === 'dark' ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>' : ''}
                      ${t === 'system' ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>' : ''}
                    </div>
                    <p class="font-medium text-primary-900 dark:text-primary-100 capitalize">${t}</p>
                    <p class="text-xs text-muted mt-1">${t === 'system' ? 'Matches your OS' : t === 'light' ? 'Always light' : 'Always dark'}</p>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Animations -->
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-primary-900 dark:text-primary-100">Animations</p>
                <p class="text-sm text-muted">Enable smooth transitions and micro-animations</p>
              </div>
              <button class="toggle-switch ${settings.animationsEnabled ? 'active' : ''}" data-setting="animationsEnabled" role="switch" aria-checked="${settings.animationsEnabled}" aria-label="Animations"></button>
            </div>

            <!-- Reduced Motion -->
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-primary-900 dark:text-primary-100">Reduced Motion</p>
                <p class="text-sm text-muted">Minimize animations for accessibility</p>
              </div>
              <button class="toggle-switch ${settings.reducedMotion ? 'active' : ''}" data-setting="reducedMotion" role="switch" aria-checked="${settings.reducedMotion}" aria-label="Reduced Motion"></button>
            </div>
          </div>
        </section>

        <!-- Camera & Detection -->
        <section class="card p-6 space-y-6" aria-labelledby="camera-heading">
          <h2 id="camera-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            Camera & Expression Detection
          </h2>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-primary-900 dark:text-primary-100">Camera Access</p>
                <p class="text-sm text-muted">Allow camera for facial expression detection</p>
              </div>
              <button class="toggle-switch ${settings.cameraEnabled ? 'active' : ''}" data-setting="cameraEnabled" role="switch" aria-checked="${settings.cameraEnabled}" aria-label="Camera Access"></button>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-primary-900 dark:text-primary-100">Expression Detection</p>
                <p class="text-sm text-muted">Analyze facial expressions in real-time</p>
              </div>
              <button class="toggle-switch ${settings.expressionDetectionEnabled ? 'active' : ''}" data-setting="expressionDetectionEnabled" role="switch" aria-checked="${settings.expressionDetectionEnabled}" aria-label="Expression Detection"></button>
            </div>

            <div class="p-4 rounded-xl glass border border-lavender-200/50 dark:border-primary-800/50">
              <p class="text-sm text-primary-700 dark:text-lavender-200">
                <strong>Privacy Note:</strong> All camera processing happens locally in your browser. No video or images are ever uploaded or stored. Face mesh data is processed in real-time and discarded immediately.
              </p>
            </div>
          </div>
        </section>

        <!-- Voice Chat Settings -->
        <section class="card p-6 space-y-6" aria-labelledby="voice-heading">
          <h2 id="voice-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6zm-6 0a3 3 0 01-3-3V5a3 3 0 116 0v6z"></path></svg>
            Voice Chat
          </h2>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-primary-900 dark:text-primary-100">Voice Input (Speech-to-Text)</p>
                <p class="text-sm text-muted">Use microphone to talk to your AI companion</p>
              </div>
              <button class="toggle-switch ${settings.sttEnabled ? 'active' : ''}" data-setting="sttEnabled" role="switch" aria-checked="${settings.sttEnabled}" aria-label="Voice Input"></button>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-primary-900 dark:text-primary-100">Voice Output (Text-to-Speech)</p>
                <p class="text-sm text-muted">AI responses will be spoken aloud</p>
              </div>
              <button class="toggle-switch ${settings.ttsEnabled ? 'active' : ''}" data-setting="ttsEnabled" role="switch" aria-checked="${settings.ttsEnabled}" aria-label="Voice Output"></button>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-primary-900 dark:text-primary-100">Live Emotion Adaptation</p>
                <p class="text-sm text-muted">AI adapts tone based on your facial expression</p>
              </div>
              <button class="toggle-switch ${settings.voiceEnabled ? 'active' : ''}" data-setting="voiceEnabled" role="switch" aria-checked="${settings.voiceEnabled}" aria-label="Live Emotion Adaptation"></button>
            </div>

            <div class="p-4 rounded-xl glass border border-lavender-200/50 dark:border-primary-800/50 bg-amber-50 dark:bg-amber-900/20">
              <p class="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Voice input requires microphone permission and a supported browser (Chrome, Edge, Safari). Voice output uses the browser's built-in speech synthesis. Live emotion adaptation requires the camera to be active with expression detection enabled.
              </p>
            </div>
          </div>
        </section>

        <!-- Expression Calibration -->
        <section class="card p-6 space-y-6" aria-labelledby="calibration-heading">
          <h2 id="calibration-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Expression Calibration
          </h2>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-primary-900 dark:text-primary-100">Personalized Detection</p>
                <p class="text-sm text-muted">Learn your unique facial expressions for better accuracy</p>
              </div>
              <button class="toggle-switch ${settings.calibrationEnabled !== false ? 'active' : ''}" data-setting="calibrationEnabled" role="switch" aria-checked="${settings.calibrationEnabled !== false}" aria-label="Personalized Detection"></button>
            </div>

            <div class="p-4 rounded-xl glass border border-lavender-200/50 dark:border-primary-800/50 bg-primary-50 dark:bg-primary-900/20">
              <p class="text-sm text-primary-800 dark:text-primary-200">
                <strong>How it works:</strong> When enabled, the system learns from your explicit feedback. You confirm or correct expression estimates, and it builds a personal model. All data stays on your device. <a href="#calibration-tab" class="text-primary-600 dark:text-primary-400 underline" data-goto="calibration">Manage calibration data &rarr;</a>
              </p>
            </div>
          </div>
        </section>

        <!-- Mood Confirmation -->
        <section class="card p-6 space-y-6" aria-labelledby="mood-heading">
          <h2 id="mood-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            Mood Confirmation
          </h2>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-primary-900 dark:text-primary-100">Mood Check-ins</p>
                <p class="text-sm text-muted">Occasionally ask to confirm detected moods</p>
              </div>
              <button class="toggle-switch ${settings.confirmationEnabled ? 'active' : ''}" data-setting="confirmationEnabled" role="switch" aria-checked="${settings.confirmationEnabled}" aria-label="Mood Check-ins"></button>
            </div>

            <div>
              <label class="block text-sm font-medium text-primary-700 dark:text-lavender-200 mb-3">Check-in Frequency</label>
              <div class="grid grid-cols-3 gap-3">
                ${['low', 'medium', 'high'].map(f => `
                  <button class="freq-option p-3 rounded-xl border-2 transition-all ${settings.confirmationFrequency === f ? 'border-primary-400 bg-primary-500/10' : 'border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300/50 dark:hover:border-primary-700/50'}" data-frequency="${f}" role="radio" aria-checked="${settings.confirmationFrequency === f}">
                    <p class="font-medium text-primary-900 dark:text-primary-100 capitalize">${f}</p>
                    <p class="text-xs text-muted mt-1">${f === 'low' ? 'Every 15 min' : f === 'medium' ? 'Every 5 min' : 'Every 2 min'}</p>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </section>

        <!-- AI Personality -->
        <section class="card p-6 space-y-6" aria-labelledby="personality-heading">
          <h2 id="personality-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            AI Personality
          </h2>

          <p class="text-primary-700 dark:text-lavender-200">Choose how your AI companion responds to you.</p>

          <div id="personality-selector-container"></div>
        </section>

        <!-- Data & Privacy -->
        <section class="card p-6 space-y-6" aria-labelledby="data-heading">
          <h2 id="data-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            Data & Privacy
          </h2>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-primary-900 dark:text-primary-100">Local Data Persistence</p>
                <p class="text-sm text-muted">Save mood history, tasks, and preferences locally</p>
              </div>
              <button class="toggle-switch ${settings.dataPersistence !== 'none' ? 'active' : ''}" data-setting="dataPersistence" role="switch" aria-checked="${settings.dataPersistence !== 'none'}" aria-label="Local Data Persistence"></button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-4 rounded-xl glass border border-lavender-200/50 dark:border-primary-800/50">
                <p class="font-medium text-primary-900 dark:text-primary-100 mb-2">Storage Stats</p>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between"><span class="text-muted">Mood Entries</span><span class="font-medium">${historyCount}</span></div>
                  <div class="flex justify-between"><span class="text-muted">Tasks</span><span class="font-medium">${taskCount}</span></div>
                  <div class="flex justify-between"><span class="text-muted">Chat Messages</span><span class="font-medium">${messageCount}</span></div>
                </div>
              </div>

              <div class="p-4 rounded-xl glass border border-lavender-200/50 dark:border-primary-800/50">
                <p class="font-medium text-primary-900 dark:text-primary-100 mb-2">Data Controls</p>
                <div class="space-y-2">
                  <button class="btn btn-secondary w-full justify-start" id="export-data">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Export All Data
                  </button>
                  <button class="btn btn-secondary w-full justify-start" id="import-data">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"></path></svg>
                    Import Data
                  </button>
                  <button class="btn btn-danger w-full justify-start" id="clear-all-data">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- About -->
        <section class="card p-6" aria-labelledby="about-heading">
          <h2 id="about-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            About
          </h2>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">Version</span>
              <span class="font-medium text-primary-900 dark:text-primary-100">1.0.0</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Built with</span>
              <span class="font-medium text-primary-900 dark:text-primary-100">React, TypeScript, Tailwind CSS</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Face Detection</span>
              <span class="font-medium text-primary-900 dark:text-primary-100">MediaPipe Face Mesh</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">AI Backend</span>
              <span class="font-medium text-primary-900 dark:text-primary-100">Google Gemini API</span>
            </div>
          </div>
        </section>
      </div>
    `;

    this.setupEvents();
  }

  initComponents() {
    // Personality Selector
    const personalityContainer = this.container.querySelector('#personality-selector-container');
    if (personalityContainer) {
      this.components.personalitySelector = new PersonalitySelector(this.stateManager, this.themeManager);
      this.components.personalitySelector.mount(personalityContainer, { compact: false });
    }
  }

  setupEvents() {
    // Theme options
    this.container.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.themeManager.setTheme(btn.dataset.theme);
      });
    });

    // Toggle switches
    this.container.querySelectorAll('.toggle-switch').forEach(btn => {
      btn.addEventListener('click', () => {
        const setting = btn.dataset.setting;
        const currentValue = this.stateManager.get(`settings.${setting}`);
        let newValue;

        if (setting === 'dataPersistence') {
          newValue = currentValue !== 'none' ? 'none' : 'local';
        } else {
          newValue = !currentValue;
        }

        this.stateManager.updateSettings({ [setting]: newValue });
        btn.classList.toggle('active', newValue);
        btn.setAttribute('aria-checked', newValue);
      });
    });

    // Frequency options
    this.container.querySelectorAll('.freq-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.stateManager.updateSettings({ confirmationFrequency: btn.dataset.frequency });
      });
    });

    // Export data
    this.container.querySelector('#export-data')?.addEventListener('click', () => {
      this.exportAllData();
    });

    // Import data
    this.container.querySelector('#import-data')?.addEventListener('click', () => {
      this.importData();
    });

    // Clear all data
    this.container.querySelector('#clear-all-data')?.addEventListener('click', () => {
      if (confirm('This will permanently delete ALL your data: mood history, tasks, chat messages, and preferences. This cannot be undone. Are you sure?')) {
        if (confirm('Last chance! Type "DELETE" in the next prompt to confirm.')) {
          const input = prompt('Type DELETE to confirm:');
          if (input === 'DELETE') {
            this.stateManager.clearAllData();
            this.stateManager.addNotification({
              type: 'success',
              title: 'Data Cleared',
              message: 'All data has been permanently deleted.'
            });
            setTimeout(() => location.reload(), 1000);
          }
        }
      }
    });
  }

  exportAllData() {
    const data = {
      moodHistory: this.stateManager.getMoodHistory(),
      tasks: this.stateManager.get('tasks.items') || [],
      chatMessages: this.stateManager.get('chat.messages') || [],
      preferences: this.stateManager.get('settings'),
      personality: this.stateManager.get('chat.personality'),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mood-companion-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.stateManager.addNotification({
      type: 'success',
      title: 'Exported',
      message: 'All data has been downloaded as a backup file.'
    });
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);

          if (data.moodHistory) {
            data.moodHistory.forEach(entry => {
              this.stateManager.addMoodEntry(entry.mood, entry.confidence, entry.source);
            });
          }

          if (data.tasks) {
            data.tasks.forEach(task => {
              this.stateManager.addTask(task);
            });
          }

          if (data.chatMessages) {
            this.stateManager.set('chat.messages', data.chatMessages);
          }

          if (data.preferences) {
            this.stateManager.updateSettings(data.preferences);
          }

          if (data.personality) {
            this.stateManager.setPersonality(data.personality);
          }

          this.stateManager.addNotification({
            type: 'success',
            title: 'Imported',
            message: 'Data has been restored from backup.'
          });

          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          console.error('Import error:', err);
          this.stateManager.addNotification({
            type: 'error',
            title: 'Import Failed',
            message: 'Invalid backup file format.'
          });
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  setupListeners() {
    this.unsubscribes.push(
      this.stateManager.on('settings.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('chat.personality.change', () => this.render())
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
    Object.values(this.components).forEach(comp => {
      if (comp && comp.destroy) comp.destroy();
    });
  }
}