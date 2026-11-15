import { TaskList } from '../components/tasks/TaskList.js';
//import { TaskForm } from '../components/tasks/TaskForm.js';
import { TaskSuggestions } from '../components/tasks/TaskSuggestions.js';

export class MyTasksPage {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.components = {};
    this.unsubscribes = [];
  }

  mount(container) {
  this.container = container;
  this.render();
  this.setupListeners();
}

  render() {
    const filter = this.stateManager.get('tasks.filter');
    const sortBy = this.stateManager.get('tasks.sortBy');
    const pendingCount = this.stateManager.getTasks('pending').length;
    const completedCount = this.stateManager.getTasks('completed').length;

    this.container.innerHTML = `
      <div class="space-y-6 animate-fade-in" id="tasks-content">
        <!-- Header -->
        <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-lavender-200/50 dark:border-primary-800/50">
          <div>
            <h1 class="font-display text-2xl font-bold gradient-text">My Tasks</h1>
            <p class="text-primary-700 dark:text-lavender-200 mt-1">${pendingCount} pending, ${completedCount} completed</p>
          </div>
          <button id="new-task-btn" class="btn btn-primary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            New Task
          </button>
        </header>

        <!-- Filter & Sort Bar -->
        <div class="card p-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <!-- Filter Tabs -->
            <div class="flex gap-1" role="tablist" aria-label="Task filters">
              <button class="filter-tab px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === 'all' ? 'bg-primary-500 text-white' : 'text-muted hover:text-primary-700 dark:hover:text-lavender-100 hover:bg-lavender-100 dark:hover:bg-primary-800'}" data-filter="all" role="tab" aria-selected="${filter === 'all'}">All</button>
              <button class="filter-tab px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === 'pending' ? 'bg-primary-500 text-white' : 'text-muted hover:text-primary-700 dark:hover:text-lavender-100 hover:bg-lavender-100 dark:hover:bg-primary-800'}" data-filter="pending" role="tab" aria-selected="${filter === 'pending'}">Pending <span class="ml-1 badge badge-sm badge-info">${pendingCount}</span></button>
              <button class="filter-tab px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === 'completed' ? 'bg-primary-500 text-white' : 'text-muted hover:text-primary-700 dark:hover:text-lavender-100 hover:bg-lavender-100 dark:hover:bg-primary-800'}" data-filter="completed" role="tab" aria-selected="${filter === 'completed'}">Completed <span class="ml-1 badge badge-sm badge-success">${completedCount}</span></button>
            </div>

            <!-- Sort & View Options -->
            <div class="flex items-center gap-3">
              <label for="task-sort" class="text-sm text-muted">Sort by:</label>
              <select id="task-sort" class="input w-auto py-2 px-3 text-sm">
                <option value="priority" ${sortBy === 'priority' ? 'selected' : ''}>Priority</option>
                <option value="dueDate" ${sortBy === 'dueDate' ? 'selected' : ''}>Due Date</option>
                <option value="created" ${sortBy === 'created' ? 'selected' : ''}>Created</option>
              </select>

              <button id="ai-suggestions-btn" class="btn btn-secondary btn-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.734-.988-2.386l-.548-.547z"></path></svg>
                AI Suggestions
              </button>
            </div>
          </div>
        </div>

        <!-- Task List -->
        <section class="card overflow-hidden" aria-labelledby="tasks-heading">
          <div id="task-list-container"></div>
        </section>

        <!-- AI Suggestions Panel -->
        <div id="ai-suggestions-panel" class="hidden">
          <div class="card p-6" id="task-suggestions-container"></div>
        </div>
      </div>
    `;

    this.initSubComponents();
  }

  initSubComponents() {
    // Task List
    const listContainer = this.container.querySelector('#task-list-container');
    if (listContainer) {
      this.components.taskList = new TaskList(this.stateManager, this.themeManager);
      this.components.taskList.mount(listContainer);
    }
  }

  setupListeners() {
    // New task button
    this.container.querySelector('#new-task-btn')?.addEventListener('click', () => {
      this.showTaskForm();
    });

    // Filter tabs
    this.container.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.stateManager.setTaskFilter(btn.dataset.filter);
      });
    });

    // Sort select
    this.container.querySelector('#task-sort')?.addEventListener('change', (e) => {
      this.stateManager.setTaskSortBy(e.target.value);
    });

    // AI Suggestions button
    this.container.querySelector('#ai-suggestions-btn')?.addEventListener('click', () => {
      this.toggleAISuggestions();
    });

    // Listen for task changes
    this.unsubscribes.push(
      this.stateManager.on('tasks.items.change', () => {
        // Re-render header counts
        const pendingCount = this.stateManager.getTasks('pending').length;
        const completedCount = this.stateManager.getTasks('completed').length;

        const headerP = this.container.querySelector('header p');
        if (headerP) headerP.textContent = `${pendingCount} pending, ${completedCount} completed`;

        // Update filter tab badges
        const pendingBadge = this.container.querySelector('[data-filter="pending"] .badge');
        if (pendingBadge) pendingBadge.textContent = pendingCount;

        const completedBadge = this.container.querySelector('[data-filter="completed"] .badge');
        if (completedBadge) completedBadge.textContent = completedCount;
      })
    );

    this.unsubscribes.push(
      this.stateManager.on('task:new', () => this.showTaskForm())
    );
  }

  showTaskForm(taskId = null) {
    const tasks = this.stateManager.get('tasks.items') || [];
    const task = taskId ? tasks.find(t => t.id === taskId) : null;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-display text-xl font-bold text-primary-900 dark:text-primary-100">${task ? 'Edit Task' : 'New Task'}</h3>
          <button class="modal-close p-2 rounded-xl hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form id="task-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-primary-700 dark:text-lavender-200 mb-1">Title *</label>
            <input type="text" name="title" class="input" value="${task ? this.escapeHtml(task.title) : ''}" required placeholder="What needs to be done?">
          </div>

          <div>
            <label class="block text-sm font-medium text-primary-700 dark:text-lavender-200 mb-1">Description</label>
            <textarea name="description" class="input min-h-[80px] resize-y" placeholder="Add details...">${task ? this.escapeHtml(task.description || '') : ''}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-primary-700 dark:text-lavender-200 mb-1">Priority</label>
              <select name="priority" class="input">
                <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${task?.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option>
                <option value="urgent" ${task?.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-primary-700 dark:text-lavender-200 mb-1">Category</label>
              <select name="category" class="input">
                <option value="personal" ${task?.category === 'personal' ? 'selected' : ''}>Personal</option>
                <option value="work" ${task?.category === 'work' ? 'selected' : ''}>Work</option>
                <option value="health" ${task?.category === 'health' ? 'selected' : ''}>Health</option>
                <option value="learning" ${task?.category === 'learning' ? 'selected' : ''}>Learning</option>
                <option value="creative" ${task?.category === 'creative' ? 'selected' : ''}>Creative</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-primary-700 dark:text-lavender-200 mb-1">Due Date (optional)</label>
            <input type="datetime-local" name="dueDate" class="input" value="${task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''}">
          </div>

          <div class="flex gap-3 pt-4 border-t border-lavender-200/50 dark:border-primary-800/50">
            <button type="button" class="btn btn-secondary flex-1" id="cancel-task">Cancel</button>
            <button type="submit" class="btn btn-primary flex-1">${task ? 'Save Changes' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('#task-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);

      const taskData = {
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        category: formData.get('category'),
        dueDate: formData.get('dueDate') ? new Date(formData.get('dueDate')).getTime() : null
      };

      if (task) {
        this.stateManager.updateTask(taskId, taskData);
        this.stateManager.addNotification({
          type: 'success',
          title: 'Task Updated',
          message: 'Your task has been saved.'
        });
      } else {
        this.stateManager.addTask(taskData);
        this.stateManager.addNotification({
          type: 'success',
          title: 'Task Created',
          message: 'New task added to your list.'
        });
      }

      modal.remove();
    });

    function closeModal() {
      modal.remove();
    }

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('#cancel-task').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  toggleAISuggestions() {
    const panel = this.container.querySelector('#ai-suggestions-panel');
    const container = this.container.querySelector('#task-suggestions-container');
    const btn = this.container.querySelector('#ai-suggestions-btn');

    if (panel.classList.contains('hidden')) {
      // Show panel
      panel.classList.remove('hidden');
      btn.classList.add('bg-primary-500', 'text-white');
      btn.classList.remove('hover:bg-lavender-200');

      // Initialize suggestions component
      if (!this.components.taskSuggestions) {
        this.components.taskSuggestions = new TaskSuggestions(this.stateManager, this.themeManager);
        this.components.taskSuggestions.mount(container);
      }
    } else {
      // Hide panel
      panel.classList.add('hidden');
      btn.classList.remove('bg-primary-500', 'text-white');
      btn.classList.add('hover:bg-lavender-200');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
    Object.values(this.components).forEach(comp => {
      if (comp && comp.destroy) comp.destroy();
    });
  }
}