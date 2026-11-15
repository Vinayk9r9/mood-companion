// Mood Companion - Express Server with Gemini Integration
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { ok } from 'assert';

// Load environment variables
dotenv.config();
console.log(
  'Gemini variable detected:',
  Boolean(process.env.GEMINI_API_KEY)
);
// Initialize Gemini client
let gemini = null;

const geminiApiKey = process.env.GEMINI_API_KEY;

if (geminiApiKey && geminiApiKey.trim() !== '') {
  gemini = new GoogleGenAI({ apiKey: geminiApiKey });
  console.log('Gemini client initialized successfully');
} else {
  console.log('Gemini API key not found');
}

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

// Personality system prompts
const PERSONALITY_SYSTEM_PROMPTS = {
  'funny-friend': `You are a funny, playful friend who loves to make people laugh. You tell jokes, share fun facts, use playful language, and keep conversations entertaining. You're witty but kind. You adapt your humor to the user's mood - if they're sad or stressed, you're gentle and supportive rather than cracking jokes.`,

  'motivational-coach': `You are an encouraging motivational coach. You help users set achievable goals, celebrate accomplishments, and provide constructive motivation. You're positive, energetic, and action-oriented. You break big goals into small, manageable steps. You never give unrealistic advice or toxic positivity.`,

  'calm-listener': `You are a calm, empathetic listener. You listen patiently, use empathetic language, avoid unnecessary advice unless asked, and let users express themselves freely. You're warm, validating, and non-judgmental. You ask thoughtful follow-up questions. You don't rush to fix things - you create space for the user to be heard.`,

  'productivity-assistant': `You are an organized productivity assistant. You help organize tasks, suggest solutions, break complicated work into smaller steps, and help manage priorities. You're practical, efficient, and structured. You give clear, actionable advice. You avoid overwhelming the user with too many suggestions at once.`
};

// Mood context guides for the AI
const MOOD_CONTEXT_GUIDES = {
  happy: `The user is currently feeling happy. Match their positive energy, celebrate with them, and keep the tone upbeat. You can be more playful and suggest enjoyable activities.`,

  sad: `The user is currently feeling sad. Respond with genuine empathy and warmth. Don't force positivity or try to "fix" their sadness immediately. Listen, validate their feelings, and offer gentle support. If appropriate, you can offer a small distraction or comforting suggestion.`,

  angry: `The user is currently feeling angry or frustrated. Remain calm and grounded. Help them identify the source of frustration without being dismissive. Suggest constructive ways to handle the anger (breathing, stepping away, breaking down the problem). Validate that their feelings are understandable.`,

  surprised: `The user is currently feeling surprised. Show curiosity and engagement. Encourage them to share what happened. React naturally to their story - whether it's good or bad news.`,

  confused: `The user is currently feeling confused. Be patient and clear in your communication. Break complex topics into simple steps. Ask clarifying questions to understand what's unclear. Provide examples or analogies when helpful. Don't assume knowledge.`,

  tired: `The user is currently feeling tired or low energy. Keep responses concise and not overwhelming. Suggest manageable, low-effort actions. Help them prioritize what's truly essential. Encourage reasonable breaks. Don't give them a long to-do list.`,

  neutral: `The user is currently feeling neutral or calm. Start casual, friendly conversation. Offer assistance with everyday activities. Be present but not overwhelming. You can suggest interesting topics or gentle check-ins.`
};

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
    model: 'gemini-3.6-flash',
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


// Generate fallback simulated response (when Gemini unavailable)
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
  return personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
}

// Serve static files
app.use(express.static(join(__dirname)));

// API endpoint for chat
app.post('/api/chat', express.json({ limit: '10kb' }), async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

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

    const { message, personality, mood, history } = req.body;

    // Build messages for AI
    const messages = buildGeminiMessages(req.body);

    let response;
    
    // Try Gemini first
    if (gemini) {
      try {
        response = await generateAIResponse(messages);
      } catch (aiError) {
        console.error('Gemini API error:', aiError.status, aiError.message);

        // Fall back to simulated responses if Gemini fails
        response = generateSimulatedResponse(personality, mood);
      }
    } else {
      // No Gemini configured - use simulated response
      response = generateSimulatedResponse(personality, mood);
    }


    res.json({ response });

  }
   catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      error: 'Failed to process chat request'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfigured: !!gemini
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