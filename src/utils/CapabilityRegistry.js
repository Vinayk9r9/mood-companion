/**
 * Capability Registry - Modular tool architecture for Mood Companion
 * Each capability defines: name, description, input schema, output schema, permissions, confirmation requirements
 */

export class CapabilityRegistry {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.capabilities = new Map();
    this._registerBuiltInCapabilities();
  }

  _registerBuiltInCapabilities() {
    // Core capabilities
    this.register({
      name: 'get_current_time',
      description: 'Get the current date and time',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: { time: { type: 'string' }, timezone: { type: 'string' } } },
      permissions: [],
      requiresConfirmation: false,
      handler: async () => ({
        time: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    });

    this.register({
      name: 'create_task',
      description: 'Create a new task in the user\'s task list',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 1000 },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          dueDate: { type: 'string', format: 'date-time' },
          category: { type: 'string', enum: ['personal', 'work', 'health', 'learning', 'creative'] }
        },
        required: ['title']
      },
      outputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' }
        }
      },
      permissions: ['tasks.write'],
      requiresConfirmation: true,
      handler: async (input) => {
        const taskId = this.stateManager.addTask({
          title: input.title,
          description: input.description || '',
          priority: input.priority || 'medium',
          dueDate: input.dueDate ? new Date(input.dueDate).getTime() : null,
          category: input.category || 'personal'
        });
        return { id: taskId, title: input.title, status: 'pending' };
      }
    });

    this.register({
      name: 'list_tasks',
      description: 'List tasks with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['all', 'pending', 'completed'] },
          category: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                status: { type: 'string' },
                priority: { type: 'string' },
                dueDate: { type: 'string' },
                category: { type: 'string' }
              }
            }
          }
        }
      },
      permissions: ['tasks.read'],
      requiresConfirmation: false,
      handler: async (input) => {
        const tasks = this.stateManager.getTasks(input.filter);
        const filtered = input.category
          ? tasks.filter(t => t.category === input.category)
          : tasks;
        return { tasks: filtered.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
          category: t.category
        })) };
      }
    });

    this.register({
      name: 'update_task',
      description: 'Update an existing task',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          status: { type: 'string', enum: ['pending', 'completed'] },
          dueDate: { type: 'string', format: 'date-time' },
          category: { type: 'string' }
        },
        required: ['id']
      },
      outputSchema: { type: 'object', properties: { success: { type: 'boolean' } } },
      permissions: ['tasks.write'],
      requiresConfirmation: true,
      handler: async (input) => {
        const { id, ...updates } = input;
        if (updates.dueDate) {
          updates.dueDate = new Date(updates.dueDate).getTime();
        }
        this.stateManager.updateTask(id, updates);
        return { success: true };
      }
    });

    this.register({
      name: 'delete_task',
      description: 'Delete a task',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      outputSchema: { type: 'object', properties: { success: { type: 'boolean' } } },
      permissions: ['tasks.write'],
      requiresConfirmation: true,
      handler: async (input) => {
        this.stateManager.deleteTask(input.id);
        return { success: true };
      }
    });

    this.register({
      name: 'get_mood_history',
      description: 'Get user\'s mood history',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100 },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          entries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                mood: { type: 'string' },
                confidence: { type: 'number' },
                source: { type: 'string' },
                timestamp: { type: 'number' }
              }
            }
          }
        }
      },
      permissions: ['mood.read'],
      requiresConfirmation: false,
      handler: async (input) => {
        const history = this.stateManager.getMoodHistory({
          limit: input.limit || 50,
          startDate: input.startDate ? new Date(input.startDate).getTime() : undefined,
          endDate: input.endDate ? new Date(input.endDate).getTime() : undefined
        });
        return { entries: history };
      }
    });

    this.register({
      name: 'set_mood',
      description: 'Manually set user\'s current mood',
      inputSchema: {
        type: 'object',
        properties: {
          mood: { type: 'string', enum: ['happy', 'sad', 'angry', 'surprised', 'confused', 'tired', 'neutral'] }
        },
        required: ['mood']
      },
      outputSchema: { type: 'object', properties: { success: { type: 'boolean' } } },
      permissions: ['mood.write'],
      requiresConfirmation: false,
      handler: async (input) => {
        this.stateManager.setUserConfirmedMood(input.mood, 'manual');
        return { success: true };
      }
    });

    this.register({
      name: 'get_settings',
      description: 'Get current user settings',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: { settings: { type: 'object' } } },
      permissions: ['settings.read'],
      requiresConfirmation: false,
      handler: async () => {
        return { settings: this.stateManager.getSettings() };
      }
    });

    this.register({
      name: 'update_settings',
      description: 'Update user settings',
      inputSchema: {
        type: 'object',
        properties: {
          cameraEnabled: { type: 'boolean' },
          expressionDetectionEnabled: { type: 'boolean' },
          ttsEnabled: { type: 'boolean' },
          sttEnabled: { type: 'boolean' },
          handsFreeEnabled: { type: 'boolean' },
          wakeWordEnabled: { type: 'boolean' },
          ttsRate: { type: 'number', minimum: 0.5, maximum: 2 },
          animationsEnabled: { type: 'boolean' },
          reducedMotion: { type: 'boolean' }
        }
      },
      outputSchema: { type: 'object', properties: { success: { type: 'boolean' } } },
      permissions: ['settings.write'],
      requiresConfirmation: true,
      handler: async (input) => {
        this.stateManager.updateSettings(input);
        return { success: true };
      }
    });

    this.register({
      name: 'navigate_page',
      description: 'Navigate to a different page in the app',
      inputSchema: {
        type: 'object',
        properties: {
          page: { type: 'string', enum: ['home', 'ai-companion', 'mood-tracker', 'my-tasks', 'settings'] }
        },
        required: ['page']
      },
      outputSchema: { type: 'object', properties: { success: { type: 'boolean' } } },
      permissions: ['navigation'],
      requiresConfirmation: false,
      handler: async (input) => {
        this.stateManager.navigateTo(input.page);
        return { success: true };
      }
    });

    this.register({
      name: 'start_camera',
      description: 'Start the camera for expression detection',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: { success: { type: 'boolean' } } },
      permissions: ['camera'],
      requiresConfirmation: false,
      handler: async () => {
        this.stateManager.emit('camera:start');
        return { success: true };
      }
    });

    this.register({
      name: 'stop_camera',
      description: 'Stop the camera',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: { success: { type: 'boolean' } } },
      permissions: ['camera'],
      requiresConfirmation: false,
      handler: async () => {
        this.stateManager.emit('camera:stop');
        return { success: true };
      }
    });
  }

  register(capability) {
    // Validate capability structure
    const required = ['name', 'description', 'inputSchema', 'outputSchema', 'permissions', 'requiresConfirmation', 'handler'];
    for (const field of required) {
      if (!(field in capability)) {
        throw new Error(`Capability missing required field: ${field}`);
      }
    }
    this.capabilities.set(capability.name, capability);
  }

  get(name) {
    return this.capabilities.get(name);
  }

  getAll() {
    return Array.from(this.capabilities.values());
  }

  getSchemas() {
    return Array.from(this.capabilities.values()).map(cap => ({
      name: cap.name,
      description: cap.description,
      inputSchema: cap.inputSchema,
      outputSchema: cap.outputSchema,
      permissions: cap.permissions,
      requiresConfirmation: cap.requiresConfirmation
    }));
  }

  async execute(name, input, userConfirmed = false) {
    const capability = this.capabilities.get(name);
    if (!capability) {
      throw new Error(`Unknown capability: ${name}`);
    }

    // Validate input against schema (simplified)
    if (capability.requiresConfirmation && !userConfirmed) {
      throw new Error(`Capability ${name} requires user confirmation`);
    }

    // Check permissions
    const userPermissions = this.stateManager.get('settings.capabilityPermissions') || [];
    for (const perm of capability.permissions) {
      if (!userPermissions.includes(perm) && perm !== 'navigation') {
        // For now, allow all but log warning
        console.warn(`Capability ${name} requires permission: ${perm}`);
      }
    }

    try {
      const result = await capability.handler(input);
      return { success: true, result };
    } catch (error) {
      console.error(`Capability ${name} execution error:`, error);
      return { success: false, error: error.message };
    }
  }

  // For AI to know what capabilities are available
  getAIDescription() {
    return this.getSchemas().map(cap =>
      `- ${cap.name}: ${cap.description}\n  Input: ${JSON.stringify(cap.inputSchema)}\n  Requires confirmation: ${cap.requiresConfirmation}`
    ).join('\n\n');
  }
}