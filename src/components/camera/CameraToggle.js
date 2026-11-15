export class CameraToggle {
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

    const cameraActive = this.stateManager.get('camera.isActive');
    const cameraPaused = this.stateManager.get('camera.isPaused');
    const faceDetected = this.stateManager.get('expression.faceDetected');
    const expression = this.stateManager.get('expression.current');
    const confidence = this.stateManager.get('expression.confidence');
    const settings = this.stateManager.get('settings');

    this.container.innerHTML = `
      <div class="relative" id="camera-toggle-container">
        <button
          id="camera-main-toggle"
          class="flex items-center gap-2 px-3 py-2 rounded-xl ${cameraActive
            ? 'bg-primary-500 text-white shadow-md'
            : 'glass border border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300/50 dark:hover:border-primary-700/50'}"
          aria-label="${cameraActive ? 'Camera active - click to stop' : 'Camera off - click to start'}"
          aria-pressed="${cameraActive}"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
          <span class="hidden sm:inline font-medium text-sm">${cameraActive ? (cameraPaused ? 'Paused' : 'Live') : 'Camera Off'}</span>
          ${cameraActive && faceDetected ? `
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-label="Face detected"></span>
          ` : ''}
        </button>

        <!-- Dropdown menu when camera is active -->
        ${cameraActive ? `
          <div id="camera-dropdown" class="absolute right-0 top-full mt-2 w-56 glass rounded-xl border border-lavender-200/50 dark:border-primary-800/50 shadow-lg opacity-0 invisible transform translate-y-2 transition-all duration-200 z-50">
            <div class="p-3">
              <div class="flex items-center justify-between mb-3">
                <span class="font-medium text-sm text-primary-900 dark:text-primary-100">Camera Controls</span>
              </div>

              <div class="space-y-2 mb-3">
                <button id="toggle-pause" class="camera-control-btn w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${cameraPaused ? 'bg-amber-100 text-amber-800' : 'hover:bg-lavender-100 dark:hover:bg-primary-800'}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${cameraPaused
                      ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
                      : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
                    }
                  </svg>
                  <span class="text-sm">${cameraPaused ? 'Resume Detection' : 'Pause Detection'}</span>
                </button>

                <button id="stop-camera" class="camera-control-btn w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  <span class="text-sm">Stop Camera</span>
                </button>
              </div>

              <div class="border-t border-lavender-200/50 dark:border-primary-800/50 pt-3">
                <p class="text-xs text-muted mb-2">Detection Status</p>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span class="text-muted">Face</span>
                    <span class="font-medium ${faceDetected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                      ${faceDetected ? 'Detected' : 'Not Found'}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted">Expression</span>
                    <span class="font-medium text-primary-900 dark:text-primary-100 capitalize">${expression}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted">Confidence</span>
                    <span class="font-medium text-primary-900 dark:text-primary-100">${Math.round(confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  setupEvents() {
    if (!this.container) return;

    const mainToggle = this.container.querySelector('#camera-main-toggle');
    const dropdown = this.container.querySelector('#camera-dropdown');
    const container = this.container.querySelector('#camera-toggle-container');

    if (mainToggle) {
      mainToggle.addEventListener('click', async () => {
        const cameraActive = this.stateManager.get('camera.isActive');
        if (cameraActive) {
          // Stop camera - we need to access the camera preview component
          this.stateManager.emit('camera:stop');
        } else {
          // Start camera
          this.stateManager.emit('camera:start');
        }
      });
    }

    // Dropdown controls
    const pauseBtn = this.container.querySelector('#toggle-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.stateManager.emit('camera:toggle-pause');
      });
    }

    const stopBtn = this.container.querySelector('#stop-camera');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.stateManager.emit('camera:stop');
      });
    }

    // Dropdown toggle on hover/focus
    if (container && dropdown) {
      let hideTimeout;

      container.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        dropdown.classList.remove('opacity-0', 'invisible', 'translate-y-2');
        dropdown.classList.add('opacity-100', 'visible', 'translate-y-0');
      });

      container.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
          dropdown.classList.add('opacity-0', 'invisible', 'translate-y-2');
          dropdown.classList.remove('opacity-100', 'visible', 'translate-y-0');
        }, 200);
      });

      dropdown.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
      });

      dropdown.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
          dropdown.classList.add('opacity-0', 'invisible', 'translate-y-2');
          dropdown.classList.remove('opacity-100', 'visible', 'translate-y-0');
        }, 200);
      });
    }
  }

  destroy() {
    // Cleanup if needed
  }
}