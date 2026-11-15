const MOOD_SUGGESTIONS = {
  happy: [
    { title: 'Start a passion project', description: 'Channel your positive energy into something creative', priority: 'medium', category: 'creative' },
    { title: 'Share your joy with someone', description: 'Call a friend or write a gratitude note', priority: 'low', category: 'personal' },
    { title: 'Plan something fun for later', description: 'Schedule an activity to look forward to', priority: 'low', category: 'personal' },
    { title: 'Learn something new', description: 'Your brain is sharp - pick up a new skill', priority: 'medium', category: 'learning' }
  ],
  sad: [
    { title: 'Do one small comforting thing', description: 'Make tea, take a warm shower, or listen to calm music', priority: 'low', category: 'health' },
    { title: 'Write down your feelings', description: 'Journaling can help process emotions', priority: 'medium', category: 'personal' },
    { title: 'Reach out to a trusted person', description: 'Send a text or make a quick call', priority: 'high', category: 'personal' },
    { title: 'Go for a gentle walk', description: 'Fresh air and movement can lift mood slightly', priority: 'low', category: 'health' }
  ],
  angry: [
    { title: 'Take a 10-minute timeout', description: 'Step away from the triggering situation', priority: 'urgent', category: 'health' },
    { title: 'Do 4-7-8 breathing exercise', description: 'Inhale 4, hold 7, exhale 8 - repeat 4 times', priority: 'high', category: 'health' },
    { title: 'Write down what\'s frustrating you', description: 'Get it out of your head onto paper', priority: 'medium', category: 'personal' },
    { title: 'Physical release: exercise or squeeze a stress ball', description: 'Burn off the adrenaline', priority: 'medium', category: 'health' }
  ],
  surprised: [
    { title: 'Process what happened', description: 'Take a few minutes to understand the situation', priority: 'high', category: 'personal' },
    { title: 'Decide on next steps', description: 'If action is needed, make a quick plan', priority: 'high', category: 'work' },
    { title: 'Share the news with someone', description: 'Tell a friend or family member', priority: 'medium', category: 'personal' }
  ],
  confused: [
    { title: 'Break the problem into smaller questions', description: 'What exactly is unclear? List specific questions', priority: 'high', category: 'learning' },
    { title: 'Gather missing information', description: 'Research, ask someone, or re-read instructions', priority: 'high', category: 'learning' },
    { title: 'Sleep on it', description: 'A fresh perspective often brings clarity', priority: 'medium', category: 'health' },
    { title: 'Talk it through with someone', description: 'Explaining it to another person can help', priority: 'medium', category: 'personal' }
  ],
  tired: [
    { title: 'Identify 1-2 essential tasks only', description: 'Postpone everything non-urgent', priority: 'high', category: 'work' },
    { title: 'Take a 20-minute power nap', description: 'Set an alarm to avoid grogginess', priority: 'high', category: 'health' },
    { title: 'Drink a large glass of water', description: 'Dehydration worsens fatigue', priority: 'medium', category: 'health' },
    { title: 'Do gentle stretching', description: 'Light movement can boost energy', priority: 'low', category: 'health' },
    { title: 'Go to bed early tonight', description: 'Prioritize sleep recovery', priority: 'high', category: 'health' }
  ],
  neutral: [
    { title: 'Pick one small goal for today', description: 'Something achievable and specific', priority: 'medium', category: 'personal' },
    { title: 'Organize one small area', description: 'A tidy space helps a clear mind', priority: 'low', category: 'personal' },
    { title: 'Learn something for 15 minutes', description: 'Read an article or watch a tutorial', priority: 'low', category: 'learning' },
    { title: 'Check in with a friend', description: 'Send a quick message to connect', priority: 'low', category: 'personal' }
  ]
};

export class TaskSuggestions {
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

    const mood = this.stateManager.get('mood.conversational');
    const suggestions = MOOD_SUGGESTIONS[mood] || MOOD_SUGGESTIONS.neutral;
    const pendingTasks = this.stateManager.getTasks('pending').length;

    this.container.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100">AI Task Suggestions</h3>
            <p class="text-sm text-muted">Based on your current mood: <span class="font-medium capitalize">${mood}</span></p>
          </div>
          <span class="badge badge-primary">${suggestions.length} suggestions</span>
        </div>

        ${pendingTasks > 5 ? `
          <div class="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/50">
            <p class="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              You have ${pendingTasks} pending tasks. Consider completing some before adding more.
            </p>
          </div>
        ` : ''}

        <div class="space-y-3" id="suggestions-list">
          ${suggestions.map((suggestion, index) => this.renderSuggestion(suggestion, index)).join('')}
        </div>

        <div class="pt-4 border-t border-lavender-200/50 dark:border-primary-800/50">
          <p class="text-sm text-muted text-center">These suggestions are based on your current mood and are meant to help, not overwhelm. Add only what feels right.</p>
        </div>
      </div>
    `;
  }

  renderSuggestion(suggestion, index) {
    const priorityConfig = {
      urgent: { label: 'Urgent', badge: 'badge-danger', color: 'from-red-400 to-red-600' },
      high: { label: 'High', badge: 'badge-warning', color: 'from-orange-400 to-red-400' },
      medium: { label: 'Medium', badge: 'badge-info', color: 'from-amber-400 to-orange-400' },
      low: { label: 'Low', badge: 'badge-success', color: 'from-green-400 to-teal-400' }
    };

    const pConfig = priorityConfig[suggestion.priority] || priorityConfig.medium;

    return `
      <div class="suggestion-card relative group p-4 rounded-xl glass border border-lavender-200/50 dark:border-primary-800/50 hover:border-primary-300/50 dark:hover:border-primary-700/50 transition-all" data-index="${index}">
        <div class="absolute inset-0 rounded-xl bg-gradient-to-br ${pConfig.color} opacity-5 group-hover:opacity-10 transition-opacity"></div>

        <div class="relative z-10 flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br ${pConfig.color} flex items-center justify-center text-white flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 mb-1">
              <h4 class="font-medium text-primary-900 dark:text-primary-100">${suggestion.title}</h4>
              <span class="badge ${pConfig.badge} flex-shrink-0">${pConfig.label}</span>
            </div>

            <p class="text-sm text-muted mb-2">${suggestion.description}</p>

            <div class="flex items-center gap-2">
              <span class="badge badge-neutral text-xs capitalize">${suggestion.category}</span>
              <button class="add-suggestion-btn btn btn-primary btn-sm text-xs flex-1 sm:flex-none" data-index="${index}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                Add to Tasks
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupEvents() {
    if (!this.container) return;

    this.container.querySelectorAll('.add-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        this.addSuggestion(index);
      });
    });
  }

  addSuggestion(index) {
    const mood = this.stateManager.get('mood.conversational');
    const suggestions = MOOD_SUGGESTIONS[mood] || MOOD_SUGGESTIONS.neutral;
    const suggestion = suggestions[index];

    if (!suggestion) return;

    // Add as a task
    const taskId = this.stateManager.addTask({
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      category: suggestion.category,
      dueDate: Date.now() + 24 * 60 * 60 * 1000 // Tomorrow
    });

    // Visual feedback
    const btn = this.container.querySelector(`.add-suggestion-btn[data-index="${index}"]`);
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Added!';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-success');
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-success');
        btn.disabled = false;
      }, 2000);
    }

    this.stateManager.addNotification({
      type: 'success',
      title: 'Task Added',
      message: `"${suggestion.title}" has been added to your tasks.`
    });
  }

  destroy() {
    // Cleanup if needed
  }
}