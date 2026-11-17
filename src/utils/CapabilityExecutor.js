import { CapabilityRegistry } from './CapabilityRegistry.js';

/**
 * Frontend Capability Executor
 * Executes capabilities locally when possible, calls backend for server-side operations
 */
export class CapabilityExecutor {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.registry = new CapabilityRegistry(stateManager);
    this.pendingConfirmations = new Map();
  }

  // Get all capability schemas for AI
  getCapabilitiesForAI() {
    return this.registry.getAIDescription();
  }

  // Get all capability schemas
  getSchemas() {
    return this.registry.getSchemas();
  }

  // Execute a capability
  async execute(capabilityName, input = {}, options = {}) {
    const capability = this.registry.get(capabilityName);
    if (!capability) {
      return { success: false, error: `Unknown capability: ${capabilityName}` };
    }

    // Check if confirmation is required
    if (capability.requiresConfirmation && !options.confirmed) {
      // Return a confirmation request
      return {
        success: false,
        requiresConfirmation: true,
        capability: capabilityName,
        input,
        description: capability.description,
        message: `This action requires your confirmation: ${capability.description}. Proceed?`
      };
    }

    // Frontend-only capabilities
    const frontendOnly = ['navigate_page', 'start_camera', 'stop_camera'];
    if (frontendOnly.includes(capabilityName)) {
      return await this._executeFrontend(capabilityName, input);
    }

    // Backend capabilities - call API
    return await this._executeBackend(capabilityName, input, options.confirmed === true);
  }

  async _executeFrontend(capabilityName, input) {
    try {
      switch (capabilityName) {
        case 'navigate_page':
          this.stateManager.navigateTo(input.page);
          return { success: true, result: { success: true } };

        case 'start_camera':
          this.stateManager.emit('camera:start');
          return { success: true, result: { success: true } };

        case 'stop_camera':
          this.stateManager.emit('camera:stop');
          return { success: true, result: { success: true } };

        default:
          return { success: false, error: `Frontend capability not implemented: ${capabilityName}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _executeBackend(capabilityName, input, confirmed) {
    try {
      const response = await fetch('/api/capability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capability: capabilityName, input, confirmed })
      });

      const data = await response.json();

      if (!response.ok) {
        // If backend says confirmation needed, prompt user
        if (data.requiresConfirmation) {
          return {
            success: false,
            requiresConfirmation: true,
            capability: capabilityName,
            input,
            message: data.message || 'This action requires confirmation'
          };
        }
        return { success: false, error: data.error || 'Backend error' };
      }

      return data;
    } catch (error) {
      console.error('Backend capability execution failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle user confirmation for a pending capability
  async confirmAndExecute(capabilityName, input) {
    return this.execute(capabilityName, input, { confirmed: true });
  }

  // Check if a capability exists
  hasCapability(name) {
    return this.registry.get(name) !== undefined;
  }
}