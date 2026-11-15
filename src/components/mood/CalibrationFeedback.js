export class CalibrationFeedback {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.container = null;
    this.unsubscribes = [];
    this.showFeedback = false;
    this.currentExpression = null;
    this.currentConfidence = 0;
    this.feedbackTimeout = null;
  }

  mount(container) {
    this.container = container;
    this.render();
    this.setupListeners();
  }

  render() {
    if (!this.container) return;

    const calibrationStatus = this.stateManager.get('calibration.status');
    const samples = this.stateManager.get('calibration.samples') || [];
    const expression = this.stateManager.get('expression.current');
    const confidence = this.stateManager.get('expression.confidence');
    const faceDetected = this.stateManager.get('expression.faceDetected');
    const personalizedExpr = this.stateManager.get('expression.personalized');
    const personalizedConf = this.stateManager.get('expression.personalizedConfidence');

    // Show feedback prompt occasionally when calibration is collecting and we have stable detection
    if (calibrationStatus === 'collecting' && faceDetected && confidence > 0.5 && !this.showFeedback) {
      // Show prompt every ~30 seconds
      const now = Date.now();
      const lastPrompt = this.stateManager.get('calibration.lastFeedbackPrompt') || 0;
      if (now - lastPrompt > 30000) {
        this.showFeedbackPrompt(expression, confidence);
      }
    }

    // Build calibration status display
    const sampleCounts = {};
    for (const s of samples) {
      sampleCounts[s.label] = (sampleCounts[s.label] || 0) + 1;
    }

    const totalSamples = samples.length;
    const minPerLabel = this.stateManager.get('calibration.minSamplesPerLabel') || 3;
    const minTotal = this.stateManager.get('calibration.minTotalSamples') || 10;

    this.container.innerHTML = `
      <div class="calibration-panel glass rounded-xl p-4 border border-lavender-200/50 dark:border-primary-800/50" id="calibration-panel">
        <!-- Status Header -->
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Expression Calibration
          </h3>
          <span class="badge ${this.getStatusBadgeClass(calibrationStatus)}">${this.formatStatus(calibrationStatus)}</span>
        </div>

        <!-- Progress -->
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-muted">Samples collected</span>
            <span class="font-medium">${totalSamples} / ${minTotal} minimum</span>
          </div>
          <div class="w-full bg-lavender-200 dark:bg-primary-800 rounded-full h-2">
            <div class="bg-primary-500 h-2 rounded-full transition-all duration-300" style="width: ${Math.min(100, (totalSamples / minTotal) * 100)}%"></div>
          </div>
        </div>

        <!-- Sample counts per expression -->
        <div class="grid grid-cols-7 gap-2 mb-4">
          ${['happy', 'sad', 'angry', 'surprised', 'neutral', 'confused', 'tired'].map(mood => {
            const count = sampleCounts[mood] || 0;
            const config = this.getMoodConfig(mood);
            const hasEnough = count >= minPerLabel;
            return `
              <div class="text-center p-2 rounded-lg ${hasEnough ? 'bg-green-100 dark:bg-green-900/30' : 'bg-lavender-100 dark:bg-primary-900/30'}">
                <div class="text-xl">${config.emoji}</div>
                <div class="text-xs font-medium text-primary-900 dark:text-primary-100 capitalize">${mood}</div>
                <div class="text-xs ${hasEnough ? 'text-green-600 dark:text-green-400' : 'text-muted'}">${count}/${minPerLabel}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Current detections -->
        <div class="space-y-2 mb-4 p-3 rounded-lg bg-lavender-50 dark:bg-primary-900/30">
          <div class="text-sm font-medium text-primary-900 dark:text-primary-100 mb-2">Current Detection</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="text-center p-2 rounded-lg glass">
              <div class="text-lg">${this.getMoodConfig(expression).emoji}</div>
              <div class="text-xs font-medium capitalize">${expression}</div>
              <div class="text-xs text-muted">${Math.round(confidence * 100)}% baseline</div>
            </div>
            ${personalizedExpr ? `
              <div class="text-center p-2 rounded-lg bg-primary-500/10">
                <div class="text-lg">${this.getMoodConfig(personalizedExpr).emoji}</div>
                <div class="text-xs font-medium capitalize">${personalizedExpr}</div>
                <div class="text-xs text-primary-600 dark:text-primary-400">${Math.round(personalizedConf * 100)}% personalized</div>
              </div>
            ` : `
              <div class="text-center p-2 rounded-lg glass opacity-50">
                <div class="text-lg">🔄</div>
                <div class="text-xs font-medium">Learning...</div>
                <div class="text-xs text-muted">Need more samples</div>
              </div>
            `}
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-2">
          <button id="calibrate-current" class="btn btn-primary w-full text-sm ${!faceDetected || confidence < 0.4 ? 'opacity-50 cursor-not-allowed' : ''}" ${!faceDetected || confidence < 0.4 ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            Confirm: "${expression}" (${Math.round(confidence * 100)}%)
          </button>

          <div class="grid grid-cols-7 gap-1">
            ${['happy', 'sad', 'angry', 'surprised', 'neutral', 'confused', 'tired'].map(mood => {
              const config = this.getMoodConfig(mood);
              return `
                <button class="calibrate-mood-btn p-2 rounded-lg text-xs transition-colors ${mood === expression ? 'ring-2 ring-primary-500' : 'hover:bg-lavender-100 dark:hover:bg-primary-800'}" data-mood="${mood}" title="Mark as ${mood}">
                  ${config.emoji}
                </button>
              `;
            }).join('')}
          </div>

          <div class="flex gap-2 pt-2 border-t border-lavender-200/50 dark:border-primary-800/50">
            <button id="export-calibration" class="btn btn-secondary w-full text-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Export
            </button>
            <button id="reset-calibration" class="btn btn-danger w-full text-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              Reset
            </button>
          </div>
        </div>

        <!-- Feedback prompt overlay -->
        ${this.showFeedback ? this.renderFeedbackPrompt() : ''}
      </div>
    `;

    this.attachEventListeners();
  }

  showFeedbackPrompt(expression, confidence) {
    this.currentExpression = expression;
    this.currentConfidence = confidence;
    this.showFeedback = true;
    this.stateManager.set('calibration.lastFeedbackPrompt', Date.now());
    this.render();
  }

  hideFeedbackPrompt() {
    this.showFeedback = false;
    this.currentExpression = null;
    this.currentConfidence = 0;
    this.render();
  }

  renderFeedbackPrompt() {
    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" id="feedback-overlay">
        <div class="bg-white dark:bg-primary-900 rounded-2xl p-6 max-w-md w-full mx-4 animate-slide-up">
          <div class="text-center mb-4">
            <div class="w-20 h-20 mx-auto mb-3 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-5xl">
              ${this.getMoodConfig(this.currentExpression).emoji}
            </div>
            <h4 class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100">Does this match how you're feeling?</h4>
            <p class="text-sm text-muted mt-1">The camera estimates: <strong class="capitalize">${this.currentExpression}</strong> (${Math.round(this.currentConfidence * 100)}% confidence)</p>
          </div>

          <div class="space-y-2">
            <button id="feedback-confirm" class="btn btn-primary w-full">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              Yes, that's correct
            </button>
            <button id="feedback-change" class="btn btn-secondary w-full">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              No, let me choose
            </button>
            <button id="feedback-unsure" class="btn btn-ghost w-full text-sm">
              Not sure / Skip
            </button>
          </div>

          <p class="text-xs text-muted text-center mt-3">Your feedback helps personalize expression detection. All data stays on your device.</p>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    if (!this.container) return;

    // Confirm current expression
    const confirmBtn = this.container.querySelector('#calibrate-current');
    if (confirmBtn && !confirmBtn.disabled) {
      confirmBtn.addEventListener('click', () => {
        this.confirmCurrentExpression();
      });
    }

    // Mood selection buttons
    this.container.querySelectorAll('.calibrate-mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.addCalibrationSample(btn.dataset.mood);
      });
    });

    // Export
    const exportBtn = this.container.querySelector('#export-calibration');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCalibration());
    }

    // Reset
    const resetBtn = this.container.querySelector('#reset-calibration');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetCalibration());
    }

    // Feedback prompt buttons
    const feedbackConfirm = this.container.querySelector('#feedback-confirm');
    if (feedbackConfirm) {
      feedbackConfirm.addEventListener('click', () => this.handleFeedback('confirm'));
    }
    const feedbackChange = this.container.querySelector('#feedback-change');
    if (feedbackChange) {
      feedbackChange.addEventListener('click', () => this.handleFeedback('change'));
    }
    const feedbackUnsure = this.container.querySelector('#feedback-unsure');
    if (feedbackUnsure) {
      feedbackUnsure.addEventListener('click', () => this.handleFeedback('unsure'));
    }
    const feedbackOverlay = this.container.querySelector('#feedback-overlay');
    if (feedbackOverlay) {
      feedbackOverlay.addEventListener('click', (e) => {
        if (e.target === feedbackOverlay) this.handleFeedback('unsure');
      });
    }
  }

  confirmCurrentExpression() {
    const expression = this.stateManager.get('expression.current');
    const confidence = this.stateManager.get('expression.confidence');
    const landmarks = this.stateManager.get('expression.landmarks');

    if (!expression || confidence < 0.3) return;

    // Get features for this expression
    const features = this.stateManager.extractFeaturesForCalibration(landmarks);
    this.stateManager.addCalibrationSample(features, expression);

    this.stateManager.addNotification({
      type: 'success',
      title: 'Calibration Updated',
      message: `Added sample for "${expression}"`
    });

    this.render();
  }

  addCalibrationSample(label) {
    const landmarks = this.stateManager.get('expression.landmarks');
    if (!landmarks) return;

    const features = this.stateManager.extractFeaturesForCalibration(landmarks);
    this.stateManager.addCalibrationSample(features, label);

    this.stateManager.addNotification({
      type: 'success',
      title: 'Calibration Updated',
      message: `Added sample for "${label}"`
    });

    this.render();
  }

  handleFeedback(response) {
    if (response === 'confirm') {
      this.confirmCurrentExpression();
    } else if (response === 'change') {
      // Show mood selector - for now just hide prompt
      this.stateManager.addNotification({
        type: 'info',
        title: 'Choose Your Mood',
        message: 'Use the mood buttons below to select how you\'re feeling'
      });
    }
    // 'unsure' just dismisses
    this.hideFeedbackPrompt();
  }

  exportCalibration() {
    const data = this.stateManager.exportCalibration();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mood-companion-calibration-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.stateManager.addNotification({
      type: 'success',
      title: 'Exported',
      message: 'Calibration data downloaded'
    });
  }

  resetCalibration() {
    if (confirm('This will delete all your personal calibration samples. Continue?')) {
      this.stateManager.clearCalibration();
      this.stateManager.addNotification({
        type: 'success',
        title: 'Calibration Reset',
        message: 'All personal calibration data has been cleared'
      });
      this.render();
    }
  }

  getMoodConfig(mood) {
    const configs = {
      happy: { emoji: '😊' },
      sad: { emoji: '😢' },
      angry: { emoji: '😠' },
      surprised: { emoji: '😲' },
      neutral: { emoji: '😐' },
      confused: { emoji: '😕' },
      tired: { emoji: '😴' }
    };
    return configs[mood] || configs.neutral;
  }

  getStatusBadgeClass(status) {
    const classes = {
      inactive: 'badge-neutral',
      collecting: 'badge-warning',
      ready: 'badge-success',
      active: 'badge-primary'
    };
    return classes[status] || 'badge-neutral';
  }

  formatStatus(status) {
    const labels = {
      inactive: 'Inactive',
      collecting: 'Collecting Samples',
      ready: 'Ready',
      active: 'Active'
    };
    return labels[status] || status;
  }

  setupListeners() {
    this.unsubscribes.push(
      this.stateManager.on('expression.current.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('expression.confidence.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('expression.faceDetected.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('calibration.status.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('calibration.samples.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('expression.personalized.change', () => this.render())
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
  }
}