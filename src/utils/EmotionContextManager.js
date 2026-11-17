export class EmotionContextManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.lastContext = null;
    this.history = [];
    this.maxHistory = 50;

    // Listen for relevant state changes
    this._setupListeners();
  }

  _setupListeners() {
    // Recalculate context when any signal changes
    const signals = [
      'mood.predicted',
      'mood.predictedConfidence',
      'mood.userConfirmed',
      'mood.conversational',
      'expression.faceDetected',
      'expression.current',
      'expression.confidence',
      'expression.personalized',
      'expression.personalizedConfidence'
    ];

    signals.forEach(signal => {
      this.stateManager.on(`${signal}.change`, () => this.updateContext());
    });
  }

  updateContext() {
    const context = this._buildContext();
    this.lastContext = context;

    // Add to history
    this.history.push({ ...context, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return context;
  }

  _buildContext() {
    // Get all signals
    const facialExpression = this.stateManager.get('expression.current');
    const facialConfidence = this.stateManager.get('expression.confidence');
    const faceDetected = this.stateManager.get('expression.faceDetected');
    const personalizedExpression = this.stateManager.get('expression.personalized');
    const personalizedConfidence = this.stateManager.get('expression.personalizedConfidence');

    const userConfirmedMood = this.stateManager.get('mood.userConfirmed');
    const predictedMood = this.stateManager.get('mood.predicted');
    const predictedConfidence = this.stateManager.get('mood.predictedConfidence');
    const conversationalMood = this.stateManager.get('mood.conversational');

    // Get recent messages for text analysis
    const messages = this.stateManager.get('chat.messages') || [];
    const recentUserMessages = messages
      .filter(m => m.role === 'user')
      .slice(-5)
      .map(m => m.content)
      .join(' ');

    // Analyze speech content for emotional cues
    const speechCues = this._analyzeSpeechContent(recentUserMessages);

    // Determine primary mood using hierarchy
    const { primaryMood, source, confidence } = this._resolvePrimaryMood({
      userConfirmedMood,
      predictedMood,
      predictedConfidence,
      facialExpression,
      facialConfidence,
      personalizedExpression,
      personalizedConfidence,
      conversationalMood,
      faceDetected
    });

    // Build vocal characteristics placeholder (would be filled by voice analysis)
    const vocalCharacteristics = this._getVocalCharacteristics();

    // Build context object
    const context = {
      // Primary resolved mood
      primaryMood,
      source,
      confidence,

      // Facial signals
      facial: {
        detected: faceDetected,
        expression: facialExpression,
        confidence: facialConfidence,
        personalized: personalizedExpression ? {
          expression: personalizedExpression,
          confidence: personalizedConfidence
        } : null
      },

      // Vocal signals (placeholder for Phase 5)
      vocal: vocalCharacteristics,

      // Speech content analysis
      speech: {
        content: recentUserMessages,
        cues: speechCues
      },

      // User confirmed mood
      userConfirmed: userConfirmedMood,

      // Conversational mood (what AI uses)
      conversational: conversationalMood,

      // Metadata
      timestamp: Date.now(),
      dataAvailability: {
        face: faceDetected,
        facialConfidence: facialConfidence > 0.3,
        personalized: !!personalizedExpression,
        personalizedConfidence: personalizedConfidence > 0.4,
        userConfirmed: !!userConfirmedMood,
        speech: recentUserMessages.length > 0
      }
    };

    return context;
  }

  _resolvePrimaryMood(signals) {
    const {
      userConfirmedMood,
      predictedMood,
      predictedConfidence,
      facialExpression,
      facialConfidence,
      personalizedExpression,
      personalizedConfidence,
      conversationalMood,
      faceDetected
    } = signals;

    // Priority 1: Explicit user confirmation (manual or from conversation)
    if (userConfirmedMood) {
      return {
        primaryMood: userConfirmedMood,
        source: 'user_confirmed',
        confidence: 1.0
      };
    }

    // Priority 2: Conversational mood from recent dialogue
    if (conversationalMood && conversationalMood !== 'neutral') {
      return {
        primaryMood: conversationalMood,
        source: 'conversation',
        confidence: 0.8
      };
    }

    // Priority 3: Personalized expression (if calibrated and confident)
    if (personalizedExpression && personalizedConfidence > 0.5) {
      return {
        primaryMood: personalizedExpression,
        source: 'personalized_camera',
        confidence: personalizedConfidence
      };
    }

    // Priority 4: Baseline camera prediction (if confident)
    if (faceDetected && predictedConfidence > 0.6) {
      return {
        primaryMood: predictedMood,
        source: 'camera',
        confidence: predictedConfidence
      };
    }

    // Priority 5: Facial expression (lower confidence)
    if (faceDetected && facialConfidence > 0.4) {
      return {
        primaryMood: facialExpression,
        source: 'camera_baseline',
        confidence: facialConfidence
      };
    }

    // Default: neutral
    return {
      primaryMood: 'neutral',
      source: 'default',
      confidence: 0.3
    };
  }

  _analyzeSpeechContent(text) {
    if (!text || text.length < 3) return { sentiment: 'neutral', keywords: [] };

    const lowerText = text.toLowerCase();
    const cues = {
      sentiment: 'neutral',
      emotions: [],
      intensity: 'low',
      keywords: []
    };

    // Emotion keyword mapping
    const emotionKeywords = {
      happy: ['happy', 'joy', 'great', 'awesome', 'wonderful', 'amazing', 'fantastic', 'glad', 'pleased', 'delighted', 'excited', 'thrilled', 'love', 'enjoy'],
      sad: ['sad', 'down', 'depressed', 'unhappy', 'miserable', 'upset', 'heartbroken', 'grief', 'lonely', 'cry', 'tears', 'hurt'],
      angry: ['angry', 'mad', 'furious', 'frustrated', 'annoyed', 'irritated', 'pissed', 'rage', 'livid', 'hate', 'annoying'],
      anxious: ['anxious', 'worried', 'nervous', 'stressed', 'overwhelmed', 'panic', 'fear', 'scared', 'afraid', 'uneasy'],
      surprised: ['surprised', 'shocked', 'stunned', 'amazed', 'astonished', 'unexpected', 'wow', 'omg', 'unbelievable'],
      confused: ['confused', 'puzzled', 'unclear', 'don\'t understand', 'lost', 'baffled', 'perplexed', 'unsure'],
      tired: ['tired', 'exhausted', 'drained', 'fatigued', 'sleepy', 'worn out', 'burnout', 'weary', 'no energy']
    };

    // Count matches
    const scores = {};
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      scores[emotion] = keywords.filter(k => lowerText.includes(k)).length;
    }

    // Find top emotions
    const sorted = Object.entries(scores)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length > 0) {
      cues.emotions = sorted.map(([emotion]) => emotion);
      cues.sentiment = sorted[0][0];
      cues.keywords = sorted.slice(0, 3).map(([emotion]) => emotion);

      // Determine intensity
      const totalMatches = sorted.reduce((sum, [, count]) => sum + count, 0);
      if (totalMatches >= 3) cues.intensity = 'high';
      else if (totalMatches >= 2) cues.intensity = 'medium';
      else cues.intensity = 'low';
    }

    // Check for explicit mood statements
    const explicitPatterns = [
      { pattern: /i feel (\w+)/i, group: 1 },
      { pattern: /i am (\w+)/i, group: 1 },
      { pattern: /i'm (\w+)/i, group: 1 },
      { pattern: /feeling (\w+)/i, group: 1 }
    ];

    for (const { pattern, group } of explicitPatterns) {
      const match = text.match(pattern);
      if (match && match[group]) {
        const stated = match[group].toLowerCase();
        if (emotionKeywords[stated] || Object.values(emotionKeywords).flat().includes(stated)) {
          cues.explicitMood = stated;
          cues.intensity = 'high';
        }
      }
    }

    return cues;
  }

  _getVocalCharacteristics() {
    // Placeholder for Phase 5 - voice-based emotion cues
    // Would be populated by a VoiceAnalyzer module using Web Audio API
    return {
      speakingRate: null,      // words per minute
      pitch: null,             // fundamental frequency stats
      intensity: null,         // volume/loudness
      pauses: null,            // pause frequency/duration
      voiceQuality: null,      // jitter, shimmer, etc.
      available: false
    };
  }

  // Public API
  getContext() {
    return this.lastContext || this.updateContext();
  }

  getHistory() {
    return [...this.history];
  }

  // Generate a summary for AI context
  getAISummary() {
    const ctx = this.getContext();

    let summary = `User's current emotional context: ${ctx.primaryMood} (${ctx.source}, ${Math.round(ctx.confidence * 100)}% confidence).`;

    if (ctx.userConfirmed) {
      summary += ` User explicitly confirmed: ${ctx.userConfirmed}.`;
    }

    if (ctx.facial.detected) {
      summary += ` Camera detects: ${ctx.facial.expression} (${Math.round(ctx.facial.confidence * 100)}%).`;
      if (ctx.facial.personalized) {
        summary += ` Personalized model: ${ctx.facial.personalized.expression} (${Math.round(ctx.facial.personalized.confidence * 100)}%).`;
      }
    } else {
      summary += ` No face detected.`;
    }

    if (ctx.speech.cues.emotions.length > 0) {
      summary += ` Speech cues suggest: ${ctx.speech.cues.emotions.join(', ')} (${ctx.speech.cues.intensity} intensity).`;
    }

    if (ctx.speech.cues.explicitMood) {
      summary += ` User stated: "I feel ${ctx.speech.cues.explicitMood}".`;
    }

    return summary;
  }

  // Check if mood should be confirmed with user
  shouldRequestConfirmation() {
    const ctx = this.getContext();
    const settings = this.stateManager.get('settings');

    if (!settings.confirmationEnabled) return false;
    if (ctx.source === 'user_confirmed') return false;
    if (ctx.confidence < 0.5) return false;

    const lastRequest = this.stateManager.get('mood.lastConfirmationRequest') || 0;
    const cooldown = this.stateManager.get('mood.confirmationCooldown') || 5 * 60 * 1000;
    if (Date.now() - lastRequest < cooldown) return false;

    // Only request for camera-based moods, not conversation-inferred
    return ctx.source === 'camera' || ctx.source === 'camera_baseline' || ctx.source === 'personalized_camera';
  }

  destroy() {
    this.history = [];
    this.lastContext = null;
  }
}