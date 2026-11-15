const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'bg-red-500', badge: 'badge-danger', order: 0 },
  high: { label: 'High', color: 'bg-orange-500', badge: 'badge-warning', order: 1 },
  medium: { label: 'Medium', color: 'bg-amber-500', badge: 'badge-info', order: 2 },
  low: { label: 'Low', color: 'bg-green-500', badge: 'badge-success', order: 3 }
};

const CATEGORY_ICONS = {
  personal: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>',
  work: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>',
  health: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>',
  learning: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>',
  creative: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>'
};

const CATEGORY_LABELS = {
  personal: 'Personal',
  work: 'Work',
  health: 'Health',
  learning: 'Learning',
  creative: 'Creative'
};

export class TaskList {
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

    const filter = this.stateManager.get('tasks.filter');
    const tasks = this.stateManager.getTasks(filter);

    this.container.innerHTML = `
      <div class="divide-y divide-lavender-200/50 dark:divide-primary-800/50" id="task-list">
        ${tasks.length === 0 ? this.renderEmptyState(filter) : tasks.map(task => this.renderTask(task)).join('')}
      </div>
    `;

    this.setupTaskEvents();
  }

  renderEmptyState(filter) {
    const messages = {
      all: { title: 'No tasks yet', desc: 'Create your first task to get started!' },
      pending: { title: 'All caught up!', desc: 'No pending tasks. Enjoy your free time.' },
      completed: { title: 'No completed tasks', desc: 'Complete some tasks to see them here.' }
    };

    const msg = messages[filter] || messages.all;

    return `
      <div class="text-center py-16 text-muted">
        <svg class="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
        <p class="text-lg font-medium text-primary-700 dark:text-lavender-200 mb-1">${msg.title}</p>
        <p class="text-sm">${msg.desc}</p>
        ${filter !== 'completed' ? `
          <button class="btn btn-primary mt-4" id="create-first-task">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Create Task
          </button>
        ` : ''}
      </div>
    `;
  }

  renderTask(task) {
    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const categoryIcon = CATEGORY_ICONS[task.category] || CATEGORY_ICONS.personal;
    const categoryLabel = CATEGORY_LABELS[task.category] || task.category;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const dueText = task.dueDate ? this.formatDueDate(task.dueDate) : 'No due date';
    const isCompleted = task.status === 'completed';

    return `
      <div class="task-item p-4 hover:bg-lavender-50/50 dark:hover:bg-primary-900/30 transition-colors group ${isCompleted ? 'opacity-70' : ''}" data-task-id="${task.id}">
        <div class="flex items-start gap-3">
          <!-- Checkbox -->
          <button
            class="task-checkbox flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${isCompleted
              ? 'bg-primary-500 border-primary-500 text-white'
              : `border-lavender-300 dark:border-primary-700 hover:border-primary-400 dark:hover:border-primary-500`}"
            data-task-id="${task.id}"
            aria-label="${isCompleted ? 'Mark as pending' : 'Mark as completed'}"
            aria-pressed="${isCompleted}"
          >
            ${isCompleted ? '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : ''}
          </button>

          <!-- Task Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="font-medium text-primary-900 dark:text-primary-100 truncate ${isCompleted ? 'line-through text-muted' : ''}">${this.escapeHtml(task.title)}</h4>
              <span class="badge ${priority.badge} flex-shrink-0">${priority.label}</span>
              ${isOverdue ? '<span class="badge badge-danger flex-shrink-0">Overdue</span>' : ''}
              ${isCompleted ? '<span class="badge badge-success flex-shrink-0">Done</span>' : ''}
            </div>

            ${task.description ? `
              <p class="text-sm text-muted mb-2 truncate ${isCompleted ? 'line-through' : ''}">${this.escapeHtml(task.description)}</p>
            ` : ''}

            <div class="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span class="flex items-center gap-1">${categoryIcon}<span>${categoryLabel}</span></span>
              <span class="flex items-center gap-1 ${isOverdue && !isCompleted ? 'text-red-600 dark:text-red-400 font-medium' : ''}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>${dueText}</span>
              </span>
              <span class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Created ${new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="task-edit p-2 rounded-lg hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted hover:text-primary-700 dark:hover:text-lavender-100" data-task-id="${task.id}" aria-label="Edit task">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </button>
            <button class="task-duplicate p-2 rounded-lg hover:bg-lavender-100 dark:hover:bg-primary-800 transition-colors text-muted hover:text-primary-700 dark:hover:text-lavender-100" data-task-id="${task.id}" aria-label="Duplicate task" title="Duplicate">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </button>
            <button class="task-delete p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-muted hover:text-red-600 dark:hover:text-red-400" data-task-id="${task.id}" aria-label="Delete task">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  formatDueDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate.getTime() === today.getTime()) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      return `Tomorrow ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (dueDate < today) {
      const daysAgo = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
      return `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setupTaskEvents() {
    if (!this.container) return;

    // Checkbox toggles
    this.container.querySelectorAll('.task-checkbox').forEach(checkbox => {
      checkbox.addEventListener('click', () => {
        const taskId = checkbox.dataset.taskId;
        const tasks = this.stateManager.get('tasks.items') || [];
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          this.stateManager.updateTask(taskId, {
            status: task.status === 'completed' ? 'pending' : 'completed'
          });
        }
      });
    });

    // Edit buttons
    this.container.querySelectorAll('.task-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        this.stateManager.emit('task:edit', taskId);
      });
    });

    // Duplicate buttons
    this.container.querySelectorAll('.task-duplicate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        this.duplicateTask(taskId);
      });
    });

    // Delete buttons
    this.container.querySelectorAll('.task-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        if (confirm('Delete this task?')) {
          this.stateManager.deleteTask(taskId);
        }
      });
    });

    // Create first task
    this.container.querySelector('#create-first-task')?.addEventListener('click', () => {
      this.stateManager.emit('task:new');
    });
  }

  duplicateTask(taskId) {
    const tasks = this.stateManager.get('tasks.items') || [];
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    this.stateManager.addTask({
      title: task.title + ' (Copy)',
      description: task.description,
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate
    });

    this.stateManager.addNotification({
      type: 'success',
      title: 'Task Duplicated',
      message: 'A copy of the task has been created.'
    });
  }

  setupListeners() {
    this.unsubscribes.push(
      this.stateManager.on('tasks.items.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('tasks.filter.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('tasks.sortBy.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('task:edit', (data) => {
        // The page will handle opening the edit form
        const page = document.querySelector('#tasks-content');
        if (page && page.__pageInstance) {
          page.__pageInstance.showTaskForm(data.detail);
        }
      })
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
  }
}