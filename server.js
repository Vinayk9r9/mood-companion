// Mood Companion - Express Server with Gemini Integration
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Capability system (imported dynamically to avoid circular deps)
let CapabilityRegistry = null;
async function getCapabilityRegistry() {
  if (!CapabilityRegistry) {
    const module = await import('./src/utils/CapabilityRegistry.js');
    CapabilityRegistry = module.CapabilityRegistry;
  }
  return CapabilityRegistry;
}

// Load environment variables
dotenv.config();
console.log(
  'Gemini variable detected:',
  Boolean(process.env.GEMINI_API_KEY)
);

// Initialize Gemini client
let gemini = null;
let geminiInitError = null;

const geminiApiKey = process.env.GEMINI_API_KEY;

if (geminiApiKey && geminiApiKey.trim() !== '') {
  try {
    gemini = new GoogleGenAI({ apiKey: geminiApiKey });
    console.log('Gemini client initialized successfully');
  } catch (error) {
    geminiInitError = error.message;
    console.error('Gemini client initialization failed:', error.message);
    gemini = null;
  }
} else {
  console.log('Gemini API key not found - running in DEMO mode');
  geminiInitError = 'GEMINI_API_KEY not configured';
}

// Use geminiInitError in health check to avoid unused warning
// eslint-disable-next-line no-unused-vars
const _geminiInitError = geminiInitError;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting (simple in-memory)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_RPM || '30', 10);

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  return true;
}

// Import shared personality and mood config
import { PERSONALITIES, MOOD_CONTEXT_GUIDES } from './src/utils/personalities-shared.js';

const PERSONALITY_SYSTEM_PROMPTS = {};
for (const [key, config] of Object.entries(PERSONALITIES)) {
  PERSONALITY_SYSTEM_PROMPTS[key] = config.systemPrompt;
}

// Validate chat request
function validateChatRequest(body) {
  const errors = [];

  if (!body.message || typeof body.message !== 'string') {
    errors.push('Message is required and must be a string');
  } else if (body.message.trim().length === 0) {
    errors.push('Message cannot be empty');
  } else if (body.message.length > 2000) {
    errors.push('Message too long (max 2000 characters)');
  }

  const validPersonalities = Object.keys(PERSONALITY_SYSTEM_PROMPTS);
  if (body.personality && !validPersonalities.includes(body.personality)) {
    errors.push(`Invalid personality. Must be one of: ${validPersonalities.join(', ')}`);
  }

  const validMoods = Object.keys(MOOD_CONTEXT_GUIDES);
  if (body.mood && body.mood.expression && !validMoods.includes(body.mood.expression)) {
    errors.push(`Invalid mood expression. Must be one of: ${validMoods.join(', ')}`);
  }

  if (body.history && !Array.isArray(body.history)) {
    errors.push('History must be an array');
  }

  if (body.history && body.history.length > 20) {
    errors.push('History too long (max 20 messages)');
  }

  return errors;
}

// Build messages for Gemini
function buildGeminiMessages(reqBody) {
  const { message, personality, mood, history } = reqBody;

  const systemPrompt = PERSONALITY_SYSTEM_PROMPTS[personality] || PERSONALITY_SYSTEM_PROMPTS['calm-listener'];
  const moodGuide = mood && mood.expression ? MOOD_CONTEXT_GUIDES[mood.expression] : '';

  // Build enhanced context about mood source
  let moodContext = '';
  if (mood) {
    const confidence = mood.confidence ? ` (${Math.round(mood.confidence * 100)}% confidence)` : '';
    const source = mood.source ? ` [source: ${mood.source}]` : '';
    const confirmed = mood.confirmedMood ? ` User-confirmed mood: ${mood.confirmedMood}.` : '';

    // AI summary from multimodal fusion
    const aiSummary = mood.aiSummary ? `\n${mood.aiSummary}` : '';

    // Facial details
    const facial = mood.facial ? `\nFacial: detected=${mood.facial.detected}, expression=${mood.facial.expression}, confidence=${Math.round((mood.facial.confidence || 0) * 100)}%` : '';
    const personalized = (mood.facial?.personalized) ? `, personalized=${mood.facial.personalized.expression} (${Math.round((mood.facial.personalized.confidence || 0) * 100)}%)` : '';

    // Speech cues
    const speech = mood.speech?.cues ? `\nSpeech cues: ${mood.speech.cues.emotions.join(', ')} (${mood.speech.cues.intensity} intensity)${mood.speech.cues.explicitMood ? `, explicit: ${mood.speech.cues.explicitMood}` : ''}` : '';

    moodContext = `\n\nCurrent mood context: The user's emotional state suggests "${mood.expression}"${confidence}${source}.${confirmed}${aiSummary}${facial}${personalized}${speech}
Important: All emotional cues are uncertain estimates only. Never claim to know the user's true emotional state. The user's explicitly stated or manually confirmed mood takes priority over any inferred signals.`;
  }

  const fullSystemPrompt = `${systemPrompt}${moodGuide}${moodContext}

Guidelines:
- Keep responses concise but warm (typically 2-4 sentences)
- Adapt your tone to the personality and mood context
- Never diagnose mental health conditions
- Don't claim facial expressions or voice cues reveal true emotions
- If the user explicitly states their mood, that overrides any inferred signals
- Ask follow-up questions when appropriate
- Avoid repetitive responses`;

  const messages = [{ role: 'system', content: fullSystemPrompt }];

  // Add conversation history (limited)
  const maxHistory = parseInt(process.env.MAX_HISTORY_LENGTH || '10', 10);
  if (history && Array.isArray(history)) {
    const recentHistory = history.slice(-maxHistory);
    for (const msg of recentHistory) {
      if (msg.role && msg.content && (msg.role === 'user' || msg.role === 'assistant')) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  // Add current user message
  messages.push({ role: 'user', content: message.trim() });

  return messages;
}

// Generate AI response

async function generateAIResponse(messages, capabilities = '') {
  if (!gemini) {
    throw new Error('Gemini not configured');
  }

  // Extract system instructions
  const systemMessage = messages.find(
    msg => msg.role === 'system'
  );

  // Convert standard message roles into Gemini roles
  const conversation = messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

  // Build system prompt with capabilities
  let systemPrompt = systemMessage?.content || '';
  if (capabilities) {
    systemPrompt += `\n\nAvailable capabilities (tools you can call):\n${capabilities}\n\nTo use a capability, respond with a JSON object:\n{"tool": "capability_name", "input": {...}, "reasoning": "why you're calling this"}\nOnly call one capability at a time. Wait for the result before continuing.`;
  }

  // Send request to Gemini
  const result = await gemini.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: conversation,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.8,
      maxOutputTokens: 800
    }
  });

  const responseText = result.text?.trim() ||
    "I'm not sure how to respond. Could you try again?";

  // Check if response contains a tool call
  try {
    const parsed = JSON.parse(responseText);
    if (parsed.tool && parsed.input) {
      return { toolCall: parsed };
    }
  } catch (e) {
    // Not a tool call, return as regular response
  }

  return responseText;
}


// Generate fallback simulated response (DEMO MODE ONLY - explicitly enabled)
function generateSimulatedResponse(personality, mood) {
  const responses = {
    'funny-friend': [
      "Haha, that's great! 😄 You know what they say - laughter is the best medicine! Want to hear a joke?",
      "Love that energy! Here's a fun fact: Octopuses have three hearts and blue blood. Pretty wild, right?",
      "That's awesome! 🎉 You know, life's too short for boring conversations. What's the most random thing you've seen today?"
    ],
    'motivational-coach': [
      "That's the spirit! 💪 Every step forward counts. What's one small action you can take right now?",
      "I believe in you! 🌟 Let's break this down into manageable pieces. What's the first thing to tackle?",
      "You're doing great! Remember, progress over perfection. What would make today a win for you?"
    ],
    'calm-listener': [
      "Thank you for sharing that with me. 🤗 I'm here to listen. How does that feel for you right now?",
      "I hear you. It's okay to feel that way. Would you like to talk more about it, or would you prefer a distraction?",
      "That sounds really meaningful. Take your time - there's no rush here. 🌿"
    ],
    'productivity-assistant': [
      "Got it! 📋 Let me help you organize that. Can you tell me more about the specific tasks involved?",
      "Good thinking. Let's break this down into actionable steps. What's the highest priority item?",
      "I can help with that. 🎯 Would you like me to suggest a structure or help you prioritize?"
    ]
  };

  const personalityResponses = responses[personality] || responses['calm-listener'];
  return '[DEMO MODE] ' + personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
}

// Serve static files
app.use(express.static(join(__dirname)));

// API endpoint for chat
app.post('/api/chat', express.json({ limit: '10kb' }), async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a moment before sending another message.',
      retryAfter: 60
    });
  }

  try {
    // Validate request
    const validationErrors = validateChatRequest(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationErrors
      });
    }

    const { personality, mood, capabilities } = req.body;

    // Build messages for AI
    const messages = buildGeminiMessages(req.body);

    let response;

    // Check if Gemini is available
    if (!gemini) {
      // Check if DEMO mode is explicitly enabled
      const demoMode = process.env.DEMO_MODE === 'true';
      if (demoMode) {
        console.log('DEMO MODE: Using simulated response');
        response = generateSimulatedResponse(personality, mood);
      } else {
        return res.status(503).json({
          error: 'AI service unavailable',
          message: 'Gemini API is not configured. Set GEMINI_API_KEY in .env or enable DEMO_MODE=true for simulated responses.',
          demoModeAvailable: true
        });
      }
    } else {
      try {
        // Handle tool calls in a loop
        let currentMessages = messages;
        let iterations = 0;
        const maxIterations = 3;

        while (iterations < maxIterations) {
          const aiResult = await generateAIResponse(currentMessages, capabilities);

          if (typeof aiResult === 'object' && aiResult.toolCall) {
            // Execute the capability
            const { tool, input, reasoning } = aiResult.toolCall;
            console.log(`[AI Tool Call] ${tool}`, input, reasoning);

            const CapabilityRegistryClass = await getCapabilityRegistry();
            if (!capabilityRegistry) {
              const mockStateManager = {
                get: (path) => {
                  if (path === 'settings.capabilityPermissions') return ['tasks.read', 'tasks.write', 'mood.read', 'mood.write', 'settings.read', 'settings.write', 'camera', 'navigation'];
                  return null;
                },
                set: () => {},
                on: () => () => {},
                emit: () => {},
                addTask: (task) => `task_${Date.now()}`,
                getTasks: () => [],
                updateTask: () => {},
                deleteTask: () => {},
                getMoodHistory: () => [],
                setUserConfirmedMood: () => {},
                getSettings: () => ({}),
                updateSettings: () => {},
                navigateTo: () => {}
              };
              capabilityRegistry = new CapabilityRegistryClass(mockStateManager);
            }

            const toolResult = await capabilityRegistry.execute(tool, input, true);

            // Add tool result to conversation
            currentMessages.push({ role: 'model', content: JSON.stringify(aiResult.toolCall) });
            currentMessages.push({ role: 'user', content: `Tool result: ${JSON.stringify(toolResult)}` });

            iterations++;
            continue;
          } else {
            response = aiResult;
            break;
          }
        }

        if (iterations >= maxIterations) {
          response = "I'm having trouble completing that action. Let me try a different approach.";
        }
      } catch (aiError) {
        console.error('Gemini API error:', aiError.status || 'unknown', aiError.message);

        const errorMessage = aiError.message || 'Unknown error';
        let statusCode = 502;
        let errorType = 'api_error';

        if (errorMessage.includes('API key') || errorMessage.includes('API_KEY')) {
          statusCode = 401;
          errorType = 'invalid_api_key';
        } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          statusCode = 429;
          errorType = 'rate_limit';
        } else if (errorMessage.includes('model') || errorMessage.includes('not found')) {
          statusCode = 404;
          errorType = 'model_not_found';
        } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
          statusCode = 503;
          errorType = 'network_error';
        }

        const demoMode = process.env.DEMO_MODE === 'true';
        if (demoMode) {
          console.log('DEMO MODE: Falling back to simulated response due to error:', errorMessage);
          response = generateSimulatedResponse(personality, mood);
          return res.json({
            response,
            warning: 'Using DEMO mode fallback due to API error: ' + errorType
          });
        }

        return res.status(statusCode).json({
          error: 'AI service error',
          type: errorType,
          message: errorMessage,
          demoModeAvailable: true
        });
      }
    }

    res.json({ response });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      message: error.message
    });
  }
});

// Capability registry instance (lazy initialized)
let capabilityRegistry = null;

// API endpoint for capability execution
app.post('/api/capability', express.json({ limit: '10kb' }), async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a moment before sending another request.',
      retryAfter: 60
    });
  }

  try {
    const { capability, input, confirmed } = req.body;

    if (!capability || typeof capability !== 'string') {
      return res.status(400).json({ error: 'Capability name is required' });
    }

    // Initialize capability registry with state manager
    // We need to create a minimal state manager for the server
    // For now, we'll use a simplified approach
    const CapabilityRegistryClass = await getCapabilityRegistry();

    if (!capabilityRegistry) {
      // Create a mock state manager for server-side capabilities
      const mockStateManager = {
        get: (path) => {
          if (path === 'settings.capabilityPermissions') return ['tasks.read', 'tasks.write', 'mood.read', 'mood.write', 'settings.read', 'settings.write', 'camera', 'navigation'];
          return null;
        },
        set: () => {},
        on: () => () => {},
        emit: () => {},
        addTask: (task) => `task_${Date.now()}`,
        getTasks: () => [],
        updateTask: () => {},
        deleteTask: () => {},
        getMoodHistory: () => [],
        setUserConfirmedMood: () => {},
        getSettings: () => ({}),
        updateSettings: () => {},
        navigateTo: () => {}
      };
      capabilityRegistry = new CapabilityRegistryClass(mockStateManager);
    }

    // Add server-side implementations for capabilities that need backend
    // For navigation, camera control - these are frontend-only, return success
    const frontendOnlyCapabilities = ['navigate_page', 'start_camera', 'stop_camera'];
    if (frontendOnlyCapabilities.includes(capability)) {
      return res.json({ success: true, result: { success: true, message: 'Execute on frontend' } });
    }

    const result = await capabilityRegistry.execute(capability, input || {}, confirmed === true);
    res.json(result);
  } catch (error) {
    console.error('Capability execution error:', error);
    res.status(500).json({ error: 'Failed to execute capability', message: error.message });
  }
});

// API endpoint to list available capabilities
app.get('/api/capabilities', (req, res) => {
  if (!capabilityRegistry) {
    // Return static list
    return res.json({ capabilities: [] });
  }
  res.json({ capabilities: capabilityRegistry.getSchemas() });
});

// Health check
app.get('/api/health', async (req, res) => {
  let geminiStatus = 'not_configured';

  if (gemini) {
    try {
      geminiStatus = 'configured';
    } catch (e) {
      geminiStatus = 'error';
    }
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    gemini: {
      configured: !!gemini,
      status: geminiStatus,
      demoMode: process.env.DEMO_MODE === 'true',
      initError: geminiInitError
    }
  });
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`🌸 Mood Companion server running at http://localhost:${PORT}`);
  if (!gemini) {
    console.log('   ℹ️  Running in DEMO mode - add GEMINI_API_KEY to .env for real AI');
  }
});