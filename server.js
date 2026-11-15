// Mood Companion - Express Server with Gemini Integration
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

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

  // Build context about mood source (important for transparency)
  let moodContext = '';
  if (mood) {
    const confidence = mood.confidence ? ` (${Math.round(mood.confidence * 100)}% confidence)` : '';
    const source = mood.source ? ` [source: ${mood.source}]` : '';
    const confirmed = mood.confirmedMood ? ` User-confirmed mood: ${mood.confirmedMood}.` : '';

    moodContext = `\n\nCurrent mood context: The user's facial expression suggests "${mood.expression}"${confidence}${source}.${confirmed}
Important: Facial expressions are uncertain estimates only. Never claim to know the user's true emotional state. The user's explicitly stated or manually confirmed mood takes priority over any camera estimate.`;
  }

  const fullSystemPrompt = `${systemPrompt}${moodGuide}${moodContext}

Guidelines:
- Keep responses concise but warm (typically 2-4 sentences)
- Adapt your tone to the personality and mood context
- Never diagnose mental health conditions
- Don't claim facial expressions reveal true emotions
- If the user explicitly states their mood, that overrides any camera estimate
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

async function generateAIResponse(messages) {
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

  // Send request to Gemini
  const result = await gemini.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: conversation,
    config: {
      systemInstruction: systemMessage?.content || '',
      temperature: 0.8,
      maxOutputTokens: 800
    }
  });

  return result.text?.trim() ||
    "I'm not sure how to respond. Could you try again?";
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

    const { personality, mood } = req.body;

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
        response = await generateAIResponse(messages);
      } catch (aiError) {
        console.error('Gemini API error:', aiError.status || 'unknown', aiError.message);

        // Check if it's a specific error we can handle
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

        // Check if DEMO mode is explicitly enabled for fallback
        const demoMode = process.env.DEMO_MODE === 'true';
        if (demoMode) {
          console.log('DEMO MODE: Falling back to simulated response due to error:', errorMessage);
          response = generateSimulatedResponse(personality, mood);
          // Still inform the client this is demo mode
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

// Health check
app.get('/api/health', async (req, res) => {
  let geminiStatus = 'not_configured';

  if (gemini) {
    // Try a simple connectivity test
    try {
      // Quick test - just check if we can make a minimal request
      // We won't actually send a request to avoid quota usage
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