// Client-side personality config (re-exports shared config without server-only fields)
import { PERSONALITIES as SHARED_PERSONALITIES, PERSONALITY_KEYS } from './personalities-shared.js';

export const PERSONALITIES = {};
for (const [key, config] of Object.entries(SHARED_PERSONALITIES)) {
  PERSONALITIES[key] = {
    name: config.name,
    emoji: config.emoji,
    color: config.color,
    description: config.description,
    prompt: config.prompt
  };
}

export { PERSONALITY_KEYS };