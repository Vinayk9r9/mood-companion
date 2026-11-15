const ACTIVITY_SUGGESTIONS = {
  happy: [
    { id: 'share-joy', label: 'Share your joy', description: 'Tell a friend what made you happy', icon: 'share', color: 'from-yellow-400 to-orange-400' },
    { id: 'creative-project', label: 'Start a creative project', description: 'Channel your energy into something fun', icon: 'palette', color: 'from-pink-400 to-purple-400' },
    { id: 'try-new-thing', label: 'Try something new', description: 'Explore a hobby you\'ve been curious about', icon: 'sparkles', color: 'from-green-400 to-teal-400' },
    { id: 'gratitude', label: 'Practice gratitude', description: 'Write down 3 things you\'re grateful for', icon: 'heart', color: 'from-red-400 to-pink-400' }
  ],
  sad: [
    { id: 'gentle-walk', label: 'Take a gentle walk', description: 'Fresh air and movement can help', icon: 'footprints', color: 'from-green-400 to-emerald-400' },
    { id: 'comfort-media', label: 'Watch a comfort show', description: 'Rewatch something that feels safe', icon: 'tv', color: 'from-blue-400 to-indigo-400' },
    { id: 'warm-drink', label: 'Make a warm drink', description: 'Tea, cocoa, or coffee - whatever comforts you', icon: 'coffee', color: 'from-amber-400 to-orange-400' },
    { id: 'reach-out', label: 'Reach out to someone', description: 'Text a friend or family member', icon: 'phone', color: 'from-purple-400 to-violet-400' }
  ],
  angry: [
    { id: 'breathing', label: '4-7-8 breathing', description: 'Inhale 4, hold 7, exhale 8 - repeat 4 times', icon: 'wind', color: 'from-blue-400 to-cyan-400' },
    { id: 'physical-release', label: 'Physical release', description: 'Squeeze a stress ball or do pushups', icon: 'dumbbell', color: 'from-red-400 to-rose-400' },
    { id: 'write-it-out', label: 'Write it out', description: 'Journal about what\'s frustrating you', icon: 'pen', color: 'from-slate-400 to-gray-400' },
    { id: 'step-away', label: 'Step away', description: 'Take a 10-minute break from the situation', icon: 'door-open', color: 'from-green-400 to-teal-400' }
  ],
  surprised: [
    { id: 'process', label: 'Process what happened', description: 'Take a moment to understand the surprise', icon: 'brain', color: 'from-purple-400 to-indigo-400' },
    { id: 'share-story', label: 'Share the story', description: 'Tell someone about the unexpected moment', icon: 'message-square', color: 'from-pink-400 to-rose-400' },
    { id: 'celebrate', label: 'Celebrate if good', description: 'If it\'s a good surprise, enjoy it!', icon: 'party-popper', color: 'from-yellow-400 to-amber-400' },
    { id: 'plan-next', label: 'Plan next steps', description: 'If action needed, make a quick plan', icon: 'list-check', color: 'from-blue-400 to-cyan-400' }
  ],
  confused: [
    { id: 'break-it-down', label: 'Break it down', description: 'Split the problem into smaller pieces', icon: 'puzzle', color: 'from-indigo-400 to-purple-400' },
    { id: 'ask-questions', label: 'Ask clarifying questions', description: 'What exactly is unclear? Write it down', icon: 'help-circle', color: 'from-blue-400 to-indigo-400' },
    { id: 'seek-input', label: 'Get another perspective', description: 'Ask someone you trust for their view', icon: 'users', color: 'from-green-400 to-teal-400' },
    { id: 'take-break', label: 'Step back briefly', description: 'A short break can bring clarity', icon: 'coffee', color: 'from-amber-400 to-orange-400' }
  ],
  tired: [
    { id: 'power-nap', label: 'Power nap (15-20 min)', description: 'Short rest without grogginess', icon: 'moon', color: 'from-indigo-400 to-blue-400' },
    { id: 'prioritize', label: 'Identify 1-2 essential tasks', description: 'Focus only on what truly matters today', icon: 'target', color: 'from-red-400 to-rose-400' },
    { id: 'hydrate', label: 'Drink water', description: 'Dehydration increases fatigue', icon: 'droplet', color: 'from-cyan-400 to-blue-400' },
    { id: 'gentle-stretch', label: 'Gentle stretching', description: 'Light movement to boost circulation', icon: 'activity', color: 'from-green-400 to-emerald-400' }
  ],
  neutral: [
    { id: 'small-goal', label: 'Set a small goal', description: 'One achievable thing for today', icon: 'flag', color: 'from-primary-400 to-accent-400' },
    { id: 'learn-something', label: 'Learn something new', description: 'Read an article or watch a tutorial', icon: 'book-open', color: 'from-purple-400 to-violet-400' },
    { id: 'organize-space', label: 'Tidy one area', description: 'A clear space helps a clear mind', icon: 'home', color: 'from-green-400 to-teal-400' },
    { id: 'connect', label: 'Connect with someone', description: 'Send a quick message to a friend', icon: 'heart', color: 'from-pink-400 to-rose-400' }
  ]
};

const ICONS = {
  share: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>',
  palette: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>',
  sparkles: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>',
  heart: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>',
  footprints: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16.441A11.961 11.961 0 0112 20c-3.96 0-7.56-2.228-9.438-5.541M12 20a3 3 0 110-6 3 3 0 010 6zm8-13a3 3 0 11-6 0 3 3 0 016 0zM7.053 10.735c.601-1.632 2.161-3.076 4.279-3.076.58 0 1.142.09 1.671.254M12 14a3.023 3.023 0 01-1.427-5.475"></path></svg>',
  tv: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>',
  coffee: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"></path></svg>',
  phone: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>',
  wind: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>',
  dumbbell: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.424 12.993l-1.127-1.126a21.926 21.926 0 01-3.875-3.875l.492-.356a49.376 49.376 0 007.047-7.046l.919-.919a5.997 5.997 0 018.486 8.486l-.421.421a21.947 21.947 0 01-3.876 3.876l-.89.89zm-11.206 4.538a27.063 27.063 0 00-5.062-5.062l.92-.919a4.005 4.005 0 015.664 5.664l-.92.92a27.08 27.08 0 00-5.664-5.664zm-2.438 5.664l-.747-.748a36.383 36.383 0 00-5.756-5.756l-.334-.243a6.008 6.008 0 018.486 8.486l.265.265a36.476 36.476 0 005.756-5.756l.739-.739zm-6.156 4.429l-.59-.59a25.425 25.425 0 00-3.875-3.875l-.37-.269a4.004 4.004 0 015.655 5.655l.295.295a25.56 25.56 0 003.876 3.876l.605.605z"></path></svg>',
  pen: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>',
  'door-open': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
  brain: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.734-.988-2.386l-.548-.547z"></path></svg>',
  'message-square': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>',
  'party-popper': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>',
  'list-check': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>',
  puzzle: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path></svg>',
  'help-circle': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  users: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>',
  moon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>',
  target: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>',
  droplet: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path></svg>',
  activity: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>',
  flag: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14.239v3.822a1 1 0 001.462.895l4.892-2.647a1 1 0 011.096 0l4.892 2.647a1 1 0 001.463-.895V14.239m.003-10.477A5 5 0 008.95 3.392m0 0A5 5 0 0112 8.392m0-5a5 5 0 015 5"></path></svg>',
  'book-open': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>',
  home: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>'
};

export class SuggestedActivities {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.container = null;
    this.unsubscribes = [];
  }

  mount(container) {
    this.container = container;
    this.render();
    this.setupListeners();
  }

  render() {
    if (!this.container) return;

    const mood = this.stateManager.get('mood.conversational');
    const suggestions = ACTIVITY_SUGGESTIONS[mood] || ACTIVITY_SUGGESTIONS.neutral;

    this.container.innerHTML = `
      <div class="space-y-3" id="activities-list">
        ${suggestions.slice(0, 3).map(activity => this.renderActivity(activity)).join('')}
      </div>

      <button id="more-activities" class="btn btn-ghost w-full justify-center text-sm mt-2">
        Show more suggestions
      </button>
    `;

    this.setupEvents();
  }

  renderActivity(activity) {
    return `
      <button class="activity-card relative group p-4 rounded-xl glass border border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300/50 dark:hover:border-primary-700/50 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2" data-activity="${activity.id}">
        <div class="absolute inset-0 rounded-xl bg-gradient-to-br ${activity.color} opacity-5 group-hover:opacity-10 transition-opacity"></div>

        <div class="relative z-10 flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br ${activity.color} flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            ${ICONS[activity.icon] || ICONS.sparkles}
          </div>

          <div class="flex-1 min-w-0">
            <p class="font-medium text-primary-900 dark:text-primary-100">${activity.label}</p>
            <p class="text-sm text-muted mt-0.5">${activity.description}</p>
          </div>

          <svg class="w-5 h-5 text-muted group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
      </button>
    `;
  }

  setupEvents() {
    if (!this.container) return;

    this.container.querySelectorAll('.activity-card').forEach(card => {
      card.addEventListener('click', () => {
        const activityId = card.dataset.activity;
        this.handleActivity(activityId);
      });
    });

    const moreBtn = this.container.querySelector('#more-activities');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        this.showAllActivities();
      });
    }
  }

  handleActivity(activityId) {
    const mood = this.stateManager.get('mood.conversational');
    const suggestions = ACTIVITY_SUGGESTIONS[mood] || ACTIVITY_SUGGESTIONS.neutral;
    const activity = suggestions.find(a => a.id === activityId);

    if (!activity) return;

    this.stateManager.addNotification({
      type: 'success',
      title: 'Activity Selected',
      message: `${activity.label}: ${activity.description}`
    });

    // Log as a task if it's actionable
    if (['breathing', 'gentle-walk', 'power-nap', 'hydrate', 'gentle-stretch'].includes(activityId)) {
      this.stateManager.addTask({
        title: activity.label,
        description: activity.description,
        priority: 'medium',
        category: 'health',
        dueDate: Date.now() + 24 * 60 * 60 * 1000 // Tomorrow
      });
      this.stateManager.addNotification({
        type: 'info',
        title: 'Added to Tasks',
        message: 'This activity has been added to your task list.'
      });
    }
  }

  showAllActivities() {
    const mood = this.stateManager.get('mood.conversational');
    const suggestions = ACTIVITY_SUGGESTIONS[mood] || ACTIVITY_SUGGESTIONS.neutral;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-display text-xl font-bold text-primary-900 dark:text-primary-100">Suggested for ${mood.charAt(0).toUpperCase() + mood.slice(1)}</h3>
          <button class="modal-close p-2 rounded-xl hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <p class="text-primary-700 dark:text-lavender-200 mb-6">Based on your current mood, here are some personalized suggestions:</p>
        <div class="space-y-3" id="all-activities"></div>
        <div class="mt-6 pt-4 border-t border-lavender-200/50 dark:border-primary-800/50">
          <button class="btn btn-secondary w-full" id="close-activities">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const container = modal.querySelector('#all-activities');
    suggestions.forEach(activity => {
      const btn = document.createElement('button');
      btn.className = 'activity-card relative group p-4 rounded-xl glass border border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300/50 dark:hover:border-primary-700/50 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300 text-left';
      btn.dataset.activity = activity.id;
      btn.innerHTML = `
        <div class="absolute inset-0 rounded-xl bg-gradient-to-br ${activity.color} opacity-5 group-hover:opacity-10 transition-opacity"></div>
        <div class="relative z-10 flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br ${activity.color} flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            ${ICONS[activity.icon] || ICONS.sparkles}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-primary-900 dark:text-primary-100">${activity.label}</p>
            <p class="text-sm text-muted mt-0.5">${activity.description}</p>
          </div>
        </div>
      `;
      btn.addEventListener('click', () => {
        this.handleActivity(activity.id);
        modal.remove();
      });
      container.appendChild(btn);
    });

    function closeModal() {
      modal.remove();
    }

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('#close-activities').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  setupListeners() {
    this.unsubscribes.push(
      this.stateManager.on('mood.conversational.change', () => this.render())
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
  }
}