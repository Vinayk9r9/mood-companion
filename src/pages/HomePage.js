import { CameraPreview } from '../components/camera/CameraPreview.js';
import { MoodIndicator } from '../components/mood/MoodIndicator.js';
import { MoodSelector } from '../components/mood/MoodSelector.js';
import { ChatPreview } from '../components/ai/ChatPreview.js';
import { QuickActions } from '../components/dashboard/QuickActions.js';
import { TodaysTasks } from '../components/dashboard/TodaysTasks.js';
import { SuggestedActivities } from '../components/dashboard/SuggestedActivities.js';
import { MoodConfirmation } from '../components/mood/MoodConfirmation.js';

export class HomePage {
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
    const conversationalMood = this.stateManager.get('mood.conversational');
    const userConfirmedMood = this.stateManager.get('mood.userConfirmed');
    const pendingConfirmation = this.stateManager.get('mood.pendingConfirmation');
    const cameraActive = this.stateManager.get('camera.isActive');
    const expression = this.stateManager.get('expression.current');
    const confidence = this.stateManager.get('expression.confidence');
    const faceDetected = this.stateManager.get('expression.faceDetected');
    const greetings = [
      "Welcome back! How are you feeling today?",
      "Good to see you! Ready for a great day?",
      "Hey there! What's on your mind?",
      "Hello! Let's make today wonderful.",
      "Hi! How can I help you today?"
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    this.container.innerHTML = `
      <div class="space-y-6 animate-fade-in" id="home-content">
        <!-- Welcome Section -->
        <section class="space-y-4" aria-labelledby="welcome-heading">
          <h1 id="welcome-heading" class="font-display text-3xl md:text-4xl font-bold gradient-text">Mood Companion</h1>
          <p class="text-lg text-primary-700 dark:text-lavender-200">${greeting}</p>
        </section>

        <!-- Main Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6" id="main-grid">
          <!-- Left Column: Camera & Mood -->
          <div class="lg:col-span-2 space-y-6" id="left-column">
            <!-- Camera Preview Card -->
            <section class="card p-6" aria-labelledby="camera-heading">
              <div class="flex items-center justify-between mb-4">
                <h2 id="camera-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100">Live Expression Detection</h2>
                <div class="flex items-center gap-2">
                  <span id="camera-status" class="badge badge-info text-xs">Camera Off</span>
                  <span id="face-status" class="badge badge-neutral text-xs hidden">No Face</span>
                </div>
              </div>
              <div id="camera-preview-container" class="camera-container aspect-video rounded-xl overflow-hidden">
                <div id="camera-placeholder" class="absolute inset-0 flex flex-col items-center justify-center text-muted p-6 text-center bg-lavender-50 dark:bg-primary-900/50">
                  <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                  <p class="text-lg font-medium">Click "Start Camera" to begin</p>
                  <p class="text-sm mt-1">Expression detection runs locally in your browser</p>
                </div>
                <video id="camera-video" class="hidden w-full h-full object-cover" autoplay playsinline muted></video>
                <canvas id="face-mesh-canvas" class="face-mesh-canvas hidden"></canvas>
              </div>

              <!-- Camera Controls -->
              <div class="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-lavender-200/50 dark:border-primary-800/50">
                <div class="flex items-center gap-3">
                  <button id="start-camera" class="btn btn-primary btn-sm" disabled>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    Start Camera
                  </button>
                  <button id="pause-camera" class="btn btn-secondary btn-sm" disabled>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Pause
                  </button>
                  <button id="stop-camera" class="btn btn-danger btn-sm" disabled>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    Stop
                  </button>
                </div>
                <div class="flex items-center gap-2 text-sm text-muted">
                  <span id="detection-status" class="flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-gray-400" id="detection-indicator"></span>
                    <span>Detection: Off</span>
                  </span>
                </div>
              </div>
            </section>

            <!-- Mood Display & Confirmation -->
            <section class="card p-6" aria-labelledby="mood-heading">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <h2 id="mood-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 mb-4">Current Mood</h2>
                  <div id="mood-indicator-container"></div>
                </div>
                <div class="flex-shrink-0">
                  <button id="manual-mood-btn" class="btn btn-secondary btn-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    Set Mood Manually
                  </button>
                </div>
              </div>

              <!-- Mood Confirmation -->
              <div id="mood-confirmation-container" class="mt-6"></div>
            </section>

            <!-- Chat Preview -->
            <section class="card p-6" aria-labelledby="chat-preview-heading">
              <div class="flex items-center justify-between mb-4">
                <h2 id="chat-preview-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100">AI Companion</h2>
                <button id="open-chat" class="btn btn-primary btn-sm">Open Chat</button>
              </div>
              <div id="chat-preview-container"></div>
            </section>
          </div>

          <!-- Right Column: Quick Actions, Tasks, Activities -->
          <div class="space-y-6" id="right-column">
            <!-- Quick Actions -->
            <section class="card p-6" aria-labelledby="quick-actions-heading">
              <h2 id="quick-actions-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 mb-4">Quick Actions</h2>
              <div id="quick-actions-container"></div>
            </section>

            <!-- Today's Tasks -->
            <section class="card p-6" aria-labelledby="tasks-heading">
              <div class="flex items-center justify-between mb-4">
                <h2 id="tasks-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100">Today's Tasks</h2>
                <button id="view-all-tasks" class="btn btn-ghost btn-sm text-xs">View All</button>
              </div>
              <div id="todays-tasks-container"></div>
            </section>

            <!-- Suggested Activities -->
            <section class="card p-6" aria-labelledby="activities-heading">
              <h2 id="activities-heading" class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 mb-4">Suggested for You</h2>
              <div id="suggested-activities-container"></div>
            </section>
          </div>
        </div>
      </div>
    `;

    // Initialize sub-components
    this.initSubComponents();
  }

  initSubComponents() {
    // Mood Indicator
    const moodContainer = this.container.querySelector('#mood-indicator-container');
    if (moodContainer) {
      this.components.moodIndicator = new MoodIndicator(this.stateManager, this.themeManager);
      this.components.moodIndicator.mount(moodContainer);
    }

    // Chat Preview
    const chatContainer = this.container.querySelector('#chat-preview-container');
    if (chatContainer) {
      this.components.chatPreview = new ChatPreview(this.stateManager, this.themeManager);
      this.components.chatPreview.mount(chatContainer);
    }

    // Quick Actions
    const qaContainer = this.container.querySelector('#quick-actions-container');
    if (qaContainer) {
      this.components.quickActions = new QuickActions(this.stateManager, this.themeManager);
      this.components.quickActions.mount(qaContainer);
    }

    // Today's Tasks
    const tasksContainer = this.container.querySelector('#todays-tasks-container');
    if (tasksContainer) {
      this.components.todaysTasks = new TodaysTasks(this.stateManager, this.themeManager);
      this.components.todaysTasks.mount(tasksContainer);
    }

    // Suggested Activities
    const activitiesContainer = this.container.querySelector('#suggested-activities-container');
    if (activitiesContainer) {
      this.components.suggestedActivities = new SuggestedActivities(this.stateManager, this.themeManager);
      this.components.suggestedActivities.mount(activitiesContainer);
    }

    // Mood Confirmation
    const confirmationContainer = this.container.querySelector('#mood-confirmation-container');
    if (confirmationContainer) {
      this.components.moodConfirmation = new MoodConfirmation(this.stateManager, this.themeManager);
      this.components.moodConfirmation.mount(confirmationContainer);
    }
  }

  initComponents() {
    // Camera Preview Component
    this.components.cameraPreview = new CameraPreview(this.stateManager, this.themeManager);
    const videoEl = this.container.querySelector('#camera-video');
    const canvasEl = this.container.querySelector('#face-mesh-canvas');
    if (videoEl && canvasEl) {
      this.components.cameraPreview.mount(videoEl, canvasEl);
    }

    // Setup camera control buttons
    this.setupCameraControls();

    // Manual mood button
    const manualMoodBtn = this.container.querySelector('#manual-mood-btn');
    if (manualMoodBtn) {
      manualMoodBtn.addEventListener('click', () => {
        this.showMoodSelector();
      });
    }

    // Open chat button
    const openChatBtn = this.container.querySelector('#open-chat');
    if (openChatBtn) {
      openChatBtn.addEventListener('click', () => {
        this.stateManager.navigateTo('ai-companion');
      });
    }

    // View all tasks button
    const viewAllTasksBtn = this.container.querySelector('#view-all-tasks');
    if (viewAllTasksBtn) {
      viewAllTasksBtn.addEventListener('click', () => {
        this.stateManager.navigateTo('my-tasks');
      });
    }
  }

  setupCameraControls() {
    const startBtn = this.container.querySelector('#start-camera');
    const pauseBtn = this.container.querySelector('#pause-camera');
    const stopBtn = this.container.querySelector('#stop-camera');

    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        await this.components.cameraPreview.start();
        this.updateCameraUI(true);
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.components.cameraPreview.togglePause();
        const isPaused = this.stateManager.get('camera.isPaused');
        pauseBtn.innerHTML = isPaused
          ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Resume'
          : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Pause';
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.components.cameraPreview.stop();
        this.updateCameraUI(false);
      });
    }

    // Initial UI state
    this.updateCameraUI(this.stateManager.get('camera.isActive'));
  }

  updateCameraUI(isActive) {
    const startBtn = this.container.querySelector('#start-camera');
    const pauseBtn = this.container.querySelector('#pause-camera');
    const stopBtn = this.container.querySelector('#stop-camera');
    const statusBadge = this.container.querySelector('#camera-status');
    const faceBadge = this.container.querySelector('#face-status');
    const placeholder = this.container.querySelector('#camera-placeholder');
    const video = this.container.querySelector('#camera-video');
    const canvas = this.container.querySelector('#face-mesh-canvas');
    const detectionStatus = this.container.querySelector('#detection-status');
    const detectionIndicator = this.container.querySelector('#detection-indicator');

    if (isActive) {
      startBtn.disabled = true;
      startBtn.classList.add('opacity-50', 'cursor-not-allowed');
      pauseBtn.disabled = false;
      pauseBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      stopBtn.disabled = false;
      stopBtn.classList.remove('opacity-50', 'cursor-not-allowed');

      statusBadge.textContent = 'Camera Active';
      statusBadge.className = 'badge badge-success text-xs';

      placeholder.classList.add('hidden');
      video.classList.remove('hidden');
      canvas.classList.remove('hidden');

      detectionStatus.querySelector('span:last-child').textContent = 'Detection: Active';
      detectionIndicator.className = 'w-2 h-2 rounded-full bg-green-500 animate-pulse-soft';
    } else {
      startBtn.disabled = false;
      startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      pauseBtn.disabled = true;
      pauseBtn.classList.add('opacity-50', 'cursor-not-allowed');
      stopBtn.disabled = true;
      stopBtn.classList.add('opacity-50', 'cursor-not-allowed');

      statusBadge.textContent = 'Camera Off';
      statusBadge.className = 'badge badge-info text-xs';
      faceBadge.classList.add('hidden');

      placeholder.classList.remove('hidden');
      video.classList.add('hidden');
      canvas.classList.add('hidden');

      detectionStatus.querySelector('span:last-child').textContent = 'Detection: Off';
      detectionIndicator.className = 'w-2 h-2 rounded-full bg-gray-400';
    }
  }

  setupListeners() {
    // Listen for camera state changes
    this.unsubscribes.push(
      this.stateManager.on('camera.isActive.change', (data) => {
        this.updateCameraUI(data.value);
      })
    );

    // Listen for face detection
    this.unsubscribes.push(
      this.stateManager.on('expression.faceDetected.change', (data) => {
        const faceBadge = this.container.querySelector('#face-status');
        if (faceBadge) {
          if (data.value) {
            faceBadge.textContent = 'Face Detected';
            faceBadge.className = 'badge badge-success text-xs';
            faceBadge.classList.remove('hidden');
          } else {
            faceBadge.textContent = 'No Face';
            faceBadge.className = 'badge badge-neutral text-xs';
            faceBadge.classList.remove('hidden');
          }
        }
      })
    );

    // Listen for expression updates to trigger mood confirmation
    this.unsubscribes.push(
      this.stateManager.on('expression.current.change', (data) => {
        if (data.value && data.value !== 'neutral') {
          const confidence = this.stateManager.get('expression.confidence');
          const confirmation = this.stateManager.requestMoodConfirmation(data.value, confidence);
          if (confirmation && this.components.moodConfirmation) {
            this.components.moodConfirmation.show(confirmation);
          }
        }
      })
    );

    // Listen for mood confirmation responses
    this.unsubscribes.push(
      this.stateManager.on('mood.pendingConfirmation.change', (data) => {
        if (this.components.moodConfirmation) {
          if (data.value) {
            this.components.moodConfirmation.show(data.value);
          } else {
            this.components.moodConfirmation.hide();
          }
        }
      })
    );
  }

  showMoodSelector() {
    // Create modal for mood selection
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
        <div class="grid grid-cols-4 gap-3" id="mood-grid"></div>
        <div class="mt-6 pt-4 border-t border-lavender-200/50 dark:border-primary-800/50">
          <button class="btn btn-secondary w-full" id="cancel-mood">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Mood options
    const moods = [
      { id: 'happy', label: 'Happy', emoji: '😊', color: 'mood-happy' },
      { id: 'sad', label: 'Sad', emoji: '😢', color: 'mood-sad' },
      { id: 'angry', label: 'Angry', emoji: '😠', color: 'mood-angry' },
      { id: 'surprised', label: 'Surprised', emoji: '😲', color: 'mood-surprised' },
      { id: 'neutral', label: 'Neutral', emoji: '😐', color: 'mood-neutral' },
      { id: 'confused', label: 'Confused', emoji: '😕', color: 'mood-confused' },
      { id: 'tired', label: 'Tired', emoji: '😴', color: 'mood-tired' },
      { id: 'other', label: 'Other', emoji: '✨', color: 'badge-primary' }
    ];

    const moodGrid = modal.querySelector('#mood-grid');
    moods.forEach(mood => {
      const btn = document.createElement('button');
      btn.className = `p-4 rounded-xl text-center transition-all duration-200 hover:scale-105 hover:shadow-lg ${mood.color === 'badge-primary' ? 'glass border border-lavender-200 dark:border-primary-800' : 'text-white'}`;
      btn.dataset.mood = mood.id;
      btn.innerHTML = `
        <span class="text-3xl block mb-1">${mood.emoji}</span>
        <span class="font-medium text-sm">${mood.label}</span>
      `;
      btn.addEventListener('click', () => {
        this.stateManager.setUserConfirmedMood(mood.id, 'manual');
        this.stateManager.addNotification({
          type: 'success',
          title: 'Mood Updated',
          message: `You're feeling ${mood.label.toLowerCase()}.`
        });
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

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
    Object.values(this.components).forEach(comp => {
      if (comp && comp.destroy) comp.destroy();
    });
  }
}