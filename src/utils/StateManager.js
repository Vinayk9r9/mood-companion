import { EventEmitter } from './EventEmitter.js';

export class StateManager extends EventEmitter {
  constructor() {
    super();
    this._saveDebounceTimer = null;
    this.state = {
      // User & Session
      user: null,
      sessionId: crypto.randomUUID(),

      // Current page
      currentPage: 'home',

      // Camera & Expression Detection
      camera: {
        permission: 'prompt', // 'prompt', 'granted', 'denied'
        isActive: false,
        isPaused: false,
        facingMode: 'user',
        stream: null
      },

      // Expression Detection
      expression: {
        current: 'neutral',
        confidence: 0,
        isDetecting: false,
        faceDetected: false,
        landmarks: null,
        history: [], // For temporal smoothing
        lastUpdate: 0
      },

      // Calibration - Personalized expression learning
      calibration: {
        enabled: true,
        samples: [], // Array of { features, label, timestamp, landmarkIndices }
        status: 'inactive', // 'inactive', 'collecting', 'ready', 'active'
        minSamplesPerLabel: 3,
        minTotalSamples: 10,
        version: 1,
        lastUpdated: 0
      },

      // Mood Intelligence
      mood: {
        // The "conversational mood" - what the AI believes the user is feeling
        // Based on hierarchy: explicit statements > manual selection > conversation context > predictions
        conversational: 'neutral',
        // User's manually selected/confirmed mood
        userConfirmed: null,
        // Camera prediction
        predicted: 'neutral',
        predictedConfidence: 0,
        // History for analytics
        history: [],
        // Confirmation system
        lastConfirmationRequest: 0,
        confirmationCooldown: 5 * 60 * 1000, // 5 minutes
        pendingConfirmation: null
      },

      // AI Chat
      chat: {
        personality: 'calm-listener', // 'funny-friend', 'motivational-coach', 'calm-listener', 'productivity-assistant'
        messages: [],
        isTyping: false,
        context: {
          currentMood: 'neutral',
          recentTopics: [],
          userPreferences: {}
        }
      },

      // Tasks
      tasks: {
        items: [],
        filter: 'all', // 'all', 'pending', 'completed'
        sortBy: 'priority', // 'priority', 'dueDate', 'created'
        categories: ['personal', 'work', 'health', 'learning', 'creative']
      },

      // Settings
      settings: {
        cameraEnabled: true,
        expressionDetectionEnabled: true,
        confirmationEnabled: true,
        confirmationFrequency: 'medium', // 'low', 'medium', 'high'
        voiceEnabled: false,
        ttsEnabled: false,
        sttEnabled: false,
        handsFreeEnabled: false,
        wakeWordEnabled: false,
        ttsRate: 1.0,
        ttsVoice: null,
        dataPersistence: 'local', // 'local', 'cloud', 'none'
        animationsEnabled: true,
        reducedMotion: false,
        calibrationEnabled: true
      },

      // UI State
      ui: {
        sidebarOpen: false,
        mobileMenuOpen: false,
        notifications: [],
        loading: false
      }
    };

    this.loadFromStorage();
  }

  async init() {
    // Load saved data from localStorage/IndexedDB
    await this.loadPersistedData();
    this.saveToStorage();
  }

  // State accessors
  get(path) {
    const keys = path.split('.');
    let value = this.state;
    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }
    return value;
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.state;

    for (const key of keys) {
      if (target[key] === undefined) {
        target[key] = {};
      }
      target = target[key];
    }

    const oldValue = target[lastKey];
    target[lastKey] = value;

    this.emit('change', { path, value, oldValue });
    this.emit(`${path}.change`, { value, oldValue });
    this._debouncedSave();

    return value;
  }

  // Set without emitting events or saving (for bulk loading)
  setSilent(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.state;

    for (const key of keys) {
      if (target[key] === undefined) {
        target[key] = {};
      }
      target = target[key];
    }

    target[lastKey] = value;
    return value;
  }

  _debouncedSave() {
    if (this._saveDebounceTimer) {
      clearTimeout(this._saveDebounceTimer);
    }
    this._saveDebounceTimer = setTimeout(() => this.saveToStorage(), 300);
  }

  // Convenience methods for common state updates

  // Page navigation
  navigateTo(page) {
    this.set('currentPage', page);
    this.set('ui.mobileMenuOpen', false);
  }

  getCurrentPage() {
    return this.get('currentPage');
  }

  // Camera controls
  setCameraPermission(permission) {
    this.set('camera.permission', permission);
  }

  setCameraActive(active) {
    this.set('camera.isActive', active);
    if (!active) {
      this.set('camera.isPaused', false);
    }
  }

  setCameraPaused(paused) {
    this.set('camera.isPaused', paused);
  }

  setCameraStream(stream) {
    this.set('camera.stream', stream);
  }

  getCameraStream() {
    return this.get('camera.stream');
  }

  // Expression detection
  setExpressionDetecting(detecting) {
    this.set('expression.isDetecting', detecting);
  }

  setFaceDetected(detected) {
    this.set('expression.faceDetected', detected);
  }

  updateExpression(expression, confidence, landmarks = null, blendshapes = null) {
    const now = Date.now();
    this.set('expression.current', expression);
    this.set('expression.confidence', confidence);
    this.set('expression.landmarks', landmarks);
    this.set('expression.lastUpdate', now);

    // Add to history for temporal smoothing
    const history = this.get('expression.history') || [];
    history.push({ expression, confidence, timestamp: now });
    // Keep last 30 frames (roughly 1 second at 30fps)
    if (history.length > 30) history.shift();
    this.set('expression.history', history);

    // Update predicted mood
    this.set('mood.predicted', expression);
    this.set('mood.predictedConfidence', confidence);

    // Also try personalized classification if calibration is ready
    const calibrationStatus = this.get('calibration.status');
    if (calibrationStatus === 'ready' && landmarks) {
      const features = this.extractFeaturesForCalibration(landmarks, blendshapes);
      const personalized = this.classifyPersonalized(features);
      if (personalized) {
        // Store personalized result alongside baseline
        this.set('expression.personalized', personalized.expression);
        this.set('expression.personalizedConfidence', personalized.confidence);
      }
    }

    // Recalculate conversational mood when prediction changes
    this.updateConversationalMood();
  }

  // Extract features for calibration (called from CameraPreview)
  extractFeaturesForCalibration(landmarks, blendshapes = null) {
    // Reuse the CameraPreview's feature extraction logic
    const p = (idx) => landmarks[idx];
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    const leftEAR = this.eyeAspectRatio(
      p(159), p(145), p(133), p(173), p(157), p(158)
    );
    const rightEAR = this.eyeAspectRatio(
      p(386), p(374), p(362), p(466), p(387), p(388)
    );
    const avgEAR = (leftEAR + rightEAR) / 2;

    const mar = this.mouthAspectRatio(
      p(13), p(14), p(78), p(308), p(82), p(87), p(312), p(317)
    );

    const mouthLeft = p(61);
    const mouthRight = p(291);
    const mouthTop = p(13);
    const mouthBottom = p(14);
    const mouthCenter = p(17);

    const mouthWidth = dist(mouthLeft, mouthRight);
    const mouthHeight = dist(mouthTop, mouthBottom);
    const mouthCornerAvg = (dist(mouthLeft, mouthCenter) + dist(mouthRight, mouthCenter)) / 2;
    const smileScore = (mouthCornerAvg - mouthHeight / 2) / mouthWidth;

    const leftBrow = p(70);
    const rightBrow = p(300);
    const leftEyeTop = p(159);
    const rightEyeTop = p(386);
    const browHeight = ((leftBrow.y - leftEyeTop.y) + (rightBrow.y - rightEyeTop.y)) / 2;

    const noseTip = p(1);
    const leftCheek = p(234);
    const rightCheek = p(454);
    const faceWidth = dist(leftCheek, rightCheek);
    const noseOffset = (noseTip.x - (leftCheek.x + rightCheek.x) / 2) / faceWidth;

    // Blendshape features
    let bsEyeOpen = 0, bsMouthOpen = 0, bsSmile = 0, bsBrowUp = 0, bsBrowDown = 0;
    if (blendshapes && blendshapes.categories) {
      const getBs = (name) => {
        const cat = blendshapes.categories.find(c => c.categoryName === name);
        return cat ? cat.score : 0;
      };
      bsEyeOpen = (getBs('eyeWideLeft') + getBs('eyeWideRight')) / 2;
      bsMouthOpen = getBs('mouthOpen');
      bsSmile = (getBs('mouthSmileLeft') + getBs('mouthSmileRight')) / 2;
      bsBrowUp = (getBs('browInnerUp') + getBs('browOuterUpLeft') + getBs('browOuterUpRight')) / 3;
      bsBrowDown = (getBs('browDownLeft') + getBs('browDownRight')) / 2;
    }

    return {
      avgEAR, mar, smileScore, browHeight, noseOffset,
      bsEyeOpen, bsMouthOpen, bsSmile, bsBrowUp, bsBrowDown
    };
  }

  getSmoothedExpression() {
    const history = this.get('expression.history') || [];
    if (history.length === 0) return { expression: 'neutral', confidence: 0 };

    // Weight recent frames more heavily
    const weights = history.map((_, i) => Math.pow(0.9, history.length - 1 - i));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const scores = {};
    history.forEach((frame, i) => {
      const weight = weights[i] / totalWeight;
      if (!scores[frame.expression]) scores[frame.expression] = 0;
      scores[frame.expression] += frame.confidence * weight;
    });

    let bestExpression = 'neutral';
    let bestScore = 0;
    for (const [expr, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestExpression = expr;
      }
    }

    return { expression: bestExpression, confidence: bestScore };
  }

  // Mood Intelligence - Hierarchy: Explicit > Manual > Context > Predicted
  setUserConfirmedMood(mood, source = 'manual') {
    this.set('mood.userConfirmed', mood);
    this.set('mood.conversational', mood);
    this.addMoodEntry(mood, 1.0, source);

    // Update chat context
    this.set('chat.context.currentMood', mood);

    // Clear any pending confirmation
    this.set('mood.pendingConfirmation', null);
    this.set('mood.lastConfirmationRequest', Date.now());
  }

  setExplicitMoodFromStatement(mood) {
    // User explicitly stated their mood in conversation
    this.set('mood.userConfirmed', mood);
    this.set('mood.conversational', mood);
    this.addMoodEntry(mood, 1.0, 'conversation');
    this.set('chat.context.currentMood', mood);
    this.set('mood.pendingConfirmation', null);
  }

  updateConversationalMood() {
    // Recalculate conversational mood based on hierarchy
    const userConfirmed = this.get('mood.userConfirmed');
    const predicted = this.get('mood.predicted');
    const predictedConfidence = this.get('mood.predictedConfidence');
    const chatContext = this.get('chat.context');

    let newMood = 'neutral';

    // Priority 1: User explicit statement (already in userConfirmed)
    // Priority 2: User manual selection (already in userConfirmed)
    if (userConfirmed) {
      newMood = userConfirmed;
    }
    // Priority 3: Recent conversation context
    else if (chatContext.currentMood && chatContext.currentMood !== 'neutral') {
      newMood = chatContext.currentMood;
    }
    // Priority 4: Facial prediction (only if confident)
    else if (predictedConfidence > 0.6) {
      newMood = predicted;
    }

    this.set('mood.conversational', newMood);
    this.set('chat.context.currentMood', newMood);
  }

  requestMoodConfirmation(predictedMood, confidence) {
    const now = Date.now();
    const lastRequest = this.get('mood.lastConfirmationRequest') || 0;
    const cooldown = this.get('mood.confirmationCooldown');
    const enabled = this.get('settings.confirmationEnabled');

    if (!enabled) return false;
    if (now - lastRequest < cooldown) return false;
    if (confidence < 0.5) return false;

    const confirmation = {
      predictedMood,
      confidence,
      timestamp: now,
      id: crypto.randomUUID()
    };

    this.set('mood.pendingConfirmation', confirmation);
    this.set('mood.lastConfirmationRequest', now);
    return confirmation;
  }

  respondToConfirmation(response) {
    // response: 'confirmed', 'denied', 'other', 'dismiss'
    const pending = this.get('mood.pendingConfirmation');
    if (!pending) return;

    if (response === 'confirmed') {
      this.setUserConfirmedMood(pending.predictedMood, 'confirmation');
    } else if (response === 'other') {
      // Will be handled by manual mood selection
    }
    // 'denied' and 'dismiss' just clear the pending confirmation

    this.set('mood.pendingConfirmation', null);
  }

  getPendingConfirmation() {
    return this.get('mood.pendingConfirmation');
  }

  addMoodEntry(mood, confidence, source) {
    const entry = {
      id: crypto.randomUUID(),
      mood,
      confidence,
      source, // 'predicted', 'confirmed', 'manual', 'conversation'
      timestamp: Date.now()
    };

    const history = this.get('mood.history') || [];
    history.unshift(entry);
    // Keep last 1000 entries
    if (history.length > 1000) history.length = 1000;
    this.set('mood.history', history);
  }

  getMoodHistory(options = {}) {
    let history = this.get('mood.history') || [];

    if (options.startDate) {
      history = history.filter(e => e.timestamp >= options.startDate);
    }
    if (options.endDate) {
      history = history.filter(e => e.timestamp <= options.endDate);
    }
    if (options.type) {
      history = history.filter(e => e.source === options.type);
    }
    if (options.limit) {
      history = history.slice(0, options.limit);
    }

    return history;
  }

  deleteMoodEntry(id) {
    const history = this.get('mood.history') || [];
    const filtered = history.filter(e => e.id !== id);
    this.set('mood.history', filtered);
  }

  clearMoodHistory() {
    this.set('mood.history', []);
  }

  // Calibration methods
  addCalibrationSample(features, label) {
    const calibration = this.get('calibration');
    if (!calibration.enabled) return false;

    // Create simplified feature vector for storage
    const featureVector = {
      avgEAR: features.avgEAR,
      mar: features.mar,
      smileScore: features.smileScore,
      browHeight: features.browHeight,
      noseOffset: features.noseOffset,
      bsEyeOpen: features.bsEyeOpen || 0,
      bsMouthOpen: features.bsMouthOpen || 0,
      bsSmile: features.bsSmile || 0,
      bsBrowUp: features.bsBrowUp || 0,
      bsBrowDown: features.bsBrowDown || 0
    };

    const sample = {
      id: crypto.randomUUID(),
      features: featureVector,
      label,
      timestamp: Date.now()
    };

    const samples = [...(calibration.samples || []), sample];

    // Deduplicate: keep only diverse samples (simple approach - limit per label per time window)
    const deduped = this.deduplicateCalibrationSamples(samples);

    this.set('calibration.samples', deduped);
    this.set('calibration.lastUpdated', Date.now());

    // Update status
    this.updateCalibrationStatus();

    return true;
  }

  deduplicateCalibrationSamples(samples) {
    // Simple deduplication: keep max 2 samples per label per 30-second window
    const byLabel = {};
    const WINDOW_MS = 30000;

    for (const sample of samples) {
      if (!byLabel[sample.label]) byLabel[sample.label] = [];
      byLabel[sample.label].push(sample);
    }

    const result = [];
    for (const [label, labelSamples] of Object.entries(byLabel)) {
      // Sort by timestamp
      labelSamples.sort((a, b) => a.timestamp - b.timestamp);

      // Keep samples that are at least WINDOW_MS apart
      const kept = [];
      for (const sample of labelSamples) {
        if (kept.length === 0 || sample.timestamp - kept[kept.length - 1].timestamp >= WINDOW_MS) {
          kept.push(sample);
        }
      }
      // Limit to max 5 per label
      result.push(...kept.slice(-5));
    }

    return result;
  }

  updateCalibrationStatus() {
    const calibration = this.get('calibration');
    if (!calibration.enabled) {
      this.set('calibration.status', 'inactive');
      return;
    }

    const samples = calibration.samples || [];
    const labels = [...new Set(samples.map(s => s.label))];
    const totalSamples = samples.length;
    const minPerLabel = calibration.minSamplesPerLabel;
    const minTotal = calibration.minTotalSamples;

    // Count samples per label
    const labelCounts = {};
    for (const sample of samples) {
      labelCounts[sample.label] = (labelCounts[sample.label] || 0) + 1;
    }

    const labelsWithEnoughSamples = Object.values(labelCounts).filter(c => c >= minPerLabel).length;
    const hasMinTotal = totalSamples >= minTotal;
    const hasMinLabels = labels.length >= 3; // Need at least 3 different expressions

    let status = 'inactive';
    if (totalSamples === 0) {
      status = 'inactive';
    } else if (hasMinTotal && labelsWithEnoughSamples >= 3 && hasMinLabels) {
      status = 'ready';
    } else {
      status = 'collecting';
    }

    this.set('calibration.status', status);
  }

  getCalibrationStatus() {
    return this.get('calibration.status');
  }

  getCalibrationSamples() {
    return this.get('calibration.samples') || [];
  }

  getCalibrationSampleCounts() {
    const samples = this.get('calibration.samples') || [];
    const counts = {};
    for (const sample of samples) {
      counts[sample.label] = (counts[sample.label] || 0) + 1;
    }
    return counts;
  }

  clearCalibration() {
    this.set('calibration.samples', []);
    this.set('calibration.status', 'inactive');
    this.set('calibration.lastUpdated', Date.now());
  }

  exportCalibration() {
    const calibration = this.get('calibration');
    return {
      version: calibration.version,
      samples: calibration.samples,
      exportedAt: Date.now()
    };
  }

  importCalibration(data) {
    if (!data || !data.samples || !Array.isArray(data.samples)) {
      throw new Error('Invalid calibration data');
    }
    this.set('calibration.samples', data.samples);
    this.set('calibration.version', data.version || 1);
    this.set('calibration.lastUpdated', Date.now());
    this.updateCalibrationStatus();
  }

  // Personalized classification using calibration samples
  classifyPersonalized(features) {
    const samples = this.get('calibration.samples') || [];
    if (samples.length < this.get('calibration.minTotalSamples')) {
      return null; // Not enough data
    }

    // Simple k-nearest neighbors with centroid approach
    const featureVector = this.featuresToVector(features);

    // Group samples by label and compute centroids
    const centroids = {};
    const labelCounts = {};

    for (const sample of samples) {
      const vec = this.featuresToVector(sample.features);
      if (!centroids[sample.label]) {
        centroids[sample.label] = [...vec];
        labelCounts[sample.label] = 1;
      } else {
        // Incremental mean
        const n = labelCounts[sample.label];
        for (let i = 0; i < vec.length; i++) {
          centroids[sample.label][i] = (centroids[sample.label][i] * n + vec[i]) / (n + 1);
        }
        labelCounts[sample.label]++;
      }
    }

    // Check each label has minimum samples
    for (const label of Object.keys(centroids)) {
      if (labelCounts[label] < this.get('calibration.minSamplesPerLabel')) {
        return null; // Not enough samples for this label
      }
    }

    // Find nearest centroid
    let bestLabel = null;
    let bestDistance = Infinity;

    for (const [label, centroid] of Object.entries(centroids)) {
      const dist = this.euclideanDistance(featureVector, centroid);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestLabel = label;
      }
    }

    // Convert distance to confidence (inverse, with max distance threshold)
    const maxDistance = Math.sqrt(featureVector.length) * 0.5; // heuristic
    const confidence = Math.max(0, 1 - bestDistance / maxDistance);

    // Only return if confident enough
    if (confidence < 0.4) return null;

    return { expression: bestLabel, confidence };
  }

  featuresToVector(features) {
    return [
      features.avgEAR || 0,
      features.mar || 0,
      features.smileScore || 0,
      features.browHeight || 0,
      features.noseOffset || 0,
      features.bsEyeOpen || 0,
      features.bsMouthOpen || 0,
      features.bsSmile || 0,
      features.bsBrowUp || 0,
      features.bsBrowDown || 0
    ];
  }

  euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  // Chat
  setPersonality(personality) {
    this.set('chat.personality', personality);
  }

  getPersonality() {
    return this.get('chat.personality');
  }

  addMessage(message) {
    const messages = this.get('chat.messages') || [];
    messages.push({
      ...message,
      id: message.id || crypto.randomUUID(),
      timestamp: message.timestamp || Date.now()
    });
    // Keep last 100 messages
    if (messages.length > 100) messages.length = 100;
    this.set('chat.messages', messages);
  }

  setMessages(messages) {
    this.set('chat.messages', messages);
  }

  getMessages() {
    return this.get('chat.messages') || [];
  }

  setTyping(isTyping) {
    this.set('chat.isTyping', isTyping);
  }

  updateChatContext(context) {
    const current = this.get('chat.context') || {};
    this.set('chat.context', { ...current, ...context });
  }

  // Tasks
  addTask(task) {
    const tasks = this.get('tasks.items') || [];
    const newTask = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      dueDate: null,
      category: 'personal',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      ...task
    };
    tasks.unshift(newTask);
    this.set('tasks.items', tasks);
    return newTask.id;
  }

  updateTask(id, updates) {
    const tasks = this.get('tasks.items') || [];
    const index = tasks.findIndex(t => t.id === id);
    if (index >= 0) {
      tasks[index] = { ...tasks[index], ...updates, updatedAt: Date.now() };
      if (updates.status === 'completed' && tasks[index].completedAt === null) {
        tasks[index].completedAt = Date.now();
      }
      this.set('tasks.items', tasks);
    }
  }

  deleteTask(id) {
    const tasks = this.get('tasks.items') || [];
    const filtered = tasks.filter(t => t.id !== id);
    this.set('tasks.items', filtered);
  }

  getTasks(filter = null) {
    const tasks = this.get('tasks.items') || [];
    const activeFilter = filter || this.get('tasks.filter');

    let filtered = tasks;
    if (activeFilter === 'pending') {
      filtered = tasks.filter(t => t.status !== 'completed');
    } else if (activeFilter === 'completed') {
      filtered = tasks.filter(t => t.status === 'completed');
    }

    // Sort
    const sortBy = this.get('tasks.sortBy');
    filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      } else if (sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate - b.dueDate;
      } else if (sortBy === 'created') {
        return b.createdAt - a.createdAt;
      }
      return 0;
    });

    return filtered;
  }

  setTaskFilter(filter) {
    this.set('tasks.filter', filter);
  }

  setTaskSortBy(sortBy) {
    this.set('tasks.sortBy', sortBy);
  }

  // Settings
  updateSettings(settings) {
    const current = this.get('settings') || {};
    this.set('settings', { ...current, ...settings });
  }

  getSettings() {
    return this.get('settings');
  }

  // UI
  toggleSidebar() {
    this.set('ui.sidebarOpen', !this.get('ui.sidebarOpen'));
  }

  setSidebarOpen(open) {
    this.set('ui.sidebarOpen', open);
  }

  toggleMobileMenu() {
    this.set('ui.mobileMenuOpen', !this.get('ui.mobileMenuOpen'));
  }

  setMobileMenuOpen(open) {
    this.set('ui.mobileMenuOpen', open);
  }

  addNotification(notification) {
    const notifications = this.get('ui.notifications') || [];
    notifications.push({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...notification
    });
    this.set('ui.notifications', notifications);

    // Auto-remove after 5 seconds
    if (notification.duration !== 0) {
      setTimeout(() => this.removeNotification(notification.id), notification.duration || 5000);
    }
  }

  removeNotification(id) {
    const notifications = this.get('ui.notifications') || [];
    this.set('ui.notifications', notifications.filter(n => n.id !== id));
  }

  // Persistence
  saveToStorage() {
    try {
      const persistKeys = [
        'user', 'chat.personality', 'chat.messages', 'chat.context',
        'tasks.items', 'tasks.filter', 'tasks.sortBy', 'tasks.categories',
        'settings', 'mood.history', 'mood.userConfirmed',
        'calibration'
      ];

      const data = {};
      for (const key of persistKeys) {
        data[key] = this.get(key);
      }

      localStorage.setItem('mood-companion-state', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem('mood-companion-state');
      if (data) {
        const parsed = JSON.parse(data);
        for (const [key, value] of Object.entries(parsed)) {
          this.setSilent(key, value);
        }
        // Emit single change event after all loaded
        this.emit('change', { path: '*', value: this.state });
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
  }

  async loadPersistedData() {
    // In the future, this could load from IndexedDB or cloud
    this.loadFromStorage();
  }

  clearAllData() {
    localStorage.removeItem('mood-companion-state');
    localStorage.removeItem('mood-companion-theme');
    this.state = {
      ...this.state,
      user: null,
      chat: { ...this.state.chat, messages: [], context: { currentMood: 'neutral', recentTopics: [], userPreferences: {} } },
      tasks: { ...this.state.tasks, items: [] },
      mood: { ...this.state.mood, history: [], userConfirmed: null, conversational: 'neutral' },
      settings: { ...this.state.settings, dataPersistence: 'local' }
    };
    this.emit('change', { path: '*', value: this.state });
  }
}