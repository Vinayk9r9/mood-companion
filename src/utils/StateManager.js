import { EventEmitter } from './EventEmitter.js';

export class StateManager extends EventEmitter {
  constructor() {
    super();
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
        dataPersistence: 'local', // 'local', 'cloud', 'none'
        animationsEnabled: true,
        reducedMotion: false
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
    this.saveToStorage();

    return value;
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

  updateExpression(expression, confidence, landmarks = null) {
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
        'settings', 'mood.history', 'mood.userConfirmed'
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
          this.set(key, value);
        }
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