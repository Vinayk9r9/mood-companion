// Shared mood configuration used across all mood-related components
export const MOOD_CONFIG = {
  happy: {
    label: 'Happy',
    emoji: '😊',
    color: 'from-yellow-400 to-orange-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-700'
  },
  sad: {
    label: 'Sad',
    emoji: '😢',
    color: 'from-blue-400 to-indigo-500',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700'
  },
  angry: {
    label: 'Angry',
    emoji: '😠',
    color: 'from-red-400 to-red-600',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700'
  },
  surprised: {
    label: 'Surprised',
    emoji: '😲',
    color: 'from-pink-400 to-purple-500',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-300 dark:border-pink-700'
  },
  neutral: {
    label: 'Neutral',
    emoji: '😐',
    color: 'from-gray-400 to-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-600'
  },
  confused: {
    label: 'Confused',
    emoji: '😕',
    color: 'from-purple-400 to-violet-500',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700'
  },
  tired: {
    label: 'Tired',
    emoji: '😴',
    color: 'from-slate-400 to-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600'
  }
};

export const MOOD_ORDER = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'confused', 'tired'];

export const CONFIRMATION_MESSAGES = {
  happy: "You seem happy! Want to confirm?",
  sad: "You seem sad. Is that right?",
  angry: "You seem frustrated. Confirm?",
  surprised: "You look surprised! Is that correct?",
  confused: "You seem confused. Is that right?",
  tired: "You look tired. Confirm?",
  neutral: "You seem neutral. Is that right?"
};