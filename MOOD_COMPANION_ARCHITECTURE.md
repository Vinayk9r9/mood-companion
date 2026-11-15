# Mood Companion Architecture Plan

## Overview
A modern React-based AI companion application with facial expression detection, mood tracking, and intelligent conversation capabilities.

## Technical Architecture

### Front-end Stack
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Framer Motion (animations)
- **UI Icons**: Lucide React
- **State Management**: React Context + useReducer (for session state), Custom hooks for browser APIs
- **Data Persistence**: IndexedDB (viaidb) for local storage, optional cloud sync

### Facial Expression Detection Approach
**Limitation**: Reliable emotion classification requires training custom models or using specialized libraries unavailable in the browser.

**Solution**:
1. Use **MediaPipe Face Mesh** for 468-point facial landmark detection
2. Pre-compute geometric features (Eye Aspect Ratio, Mouth Aspect Ratio, Head Pose, etc.)
3. Use a lightweight rule-based classification system calibrated with common expression patterns
4. Apply temporal smoothing (exponential moving average) to reduce jitter
5. Include confidence scoring based on detection quality and movement stability

**Alternative**: If rule-based system proves unreliable, provide manual mood selection as primary interface with expression detection as supplementary context.

### Key Limitations Identified
1. Browser-based emotion classification has inherent accuracy limitations
2. No pre-trained TensorFlow.js emotion models are production-ready
3. Cultural/individual facial expression variations
4. Camera quality and lighting affect detection

## File Structure

```
mood-companion/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── api/                 # Backend API integration
│   │   ├── gemini.ts
│   │   └── index.ts
│   ├── components/          # Reusable UI components
│   │   ├── ai/             # AI-specific components
│   │   ├── camera/         # Camera UI components
│   │   ├── common/         # Shared components
│   │   ├── mood/           # Mood tracking components
│   │   ├── tasks/          # Task management components
│   │   └── ui/             # Basic UI elements
│   ├── contexts/            # React contexts
│   │   ├── AiContext.tsx
│   │   ├── CameraContext.tsx
│   │   ├── MoodContext.tsx
│   │   └── TaskContext.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useCamera.ts
│   │   ├── useExpressionDetection.ts
│   │   ├── useMoodHistory.ts
│   │   └── useTasks.ts
│   ├── lib/                 # Utility libraries
│   │   ├── moodDetection.ts
│   │   ├── emotionClassifier.ts
│   │   └── constants.ts
│   ├── pages/               # Application pages/routes
│   │   ├── Home.tsx
│   │   ├── AiCompanion.tsx
│   │   ├── MoodTracker.tsx
│   │   ├── MyTasks.tsx
│   │   └── Settings.tsx
│   ├── styles/              # Global styles
│   │   ├── globals.css
│   │   └── theme.ts
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── backend/                 # Node.js backend (Express)
│   ├── routes/
│   │   ├── chat.ts
│   │   └── mood.ts
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   ├── .env.example
│   └── server.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Database Schema (Supabase)

### Tables

**users**
```sql
user_id (uuid, pk)
created_at (timestamp)
preferences (json)
```

**mood_entries**
```sql
entry_id (uuid, pk)
user_id (uuid, fk)
type: 'predicted' | 'confirmed' | 'manual'
mood: 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'confused' | 'tired'
confidence (float)
timestamp (timestamp)
source: 'camera' | 'manual' | 'conversation'
```

**tasks**
```sql
task_id (uuid, pk)
user_id (uuid, fk)
title (text)
description (text)
priority: 'low' | 'medium' | 'high' | 'urgent'
status: 'pending' | 'in_progress' | 'completed'
due_date (timestamp, nullable)
category (text)
completed_at (timestamp, nullable)
created_at (timestamp)
```

**conversations**
```sql
conversation_id (uuid, pk)
user_id (uuid, fk)
messages (jsonb)
personality (text)
started_at (timestamp)
ended_at (timestamp, nullable)
```

**preferences**
```sql
preference_id (uuid, pk)
user_id (uuid, fk)
key (text)
value (jsonb)
updated_at (timestamp)
```

## API Endpoints

### Backend (Node.js/Express)

**Chat Endpoints**
```
POST /api/chat/message
- Body: { message, context: { mood, personality, history } }
- Returns: { response, moodDetected, suggestions }

POST /api/chat/personality
- Body: { personality }
- Returns: { success }
```

**Mood Endpoints**
```
POST /api/mood/entries
- Body: { type, mood, confidence, source }
- Returns: { entryId }

GET /api/mood/history
- Query: { startDate, endDate, type }
- Returns: { entries: [...] }

DELETE /api/mood/entry/:id
- Returns: { success }

DELETE /api/mood/history
- Returns: { deletedCount }
```

**Task Endpoints**
```
POST /api/tasks
- Body: { title, description, priority, dueDate, category }
- Returns: { taskId }

GET /api/tasks
- Query: { status, category }
- Returns: { tasks: [...] }

PUT /api/tasks/:id
- Body: { ...updates }
- Returns: { success }

DELETE /api/tasks/:id
- Returns: { success }

POST /api/tasks/suggestions
- Body: { context: { mood, overwhelmLevel, tiredness } }
- Returns: { suggestions: [...] }
```

## Mood Intelligence Hierarchy

Priority order (highest to lowest):
1. **User's explicit emotional statements** - Direct quotes about feelings
2. **User's manual mood selection** - Button/toggle selections
3. **Recent conversational context** - Messages showing emotional tone
4. **Facial expression predictions** - Camera-based detection (lowest authority)

## Implementation Priority

### Phase 1: Foundation (LOOP 2)
- Project setup with Vite + React + TypeScript
- Tailwind CSS configuration
- Basic routing/navigation
- Design system and theme
- Home dashboard skeleton

### Phase 2: Camera & Expression (LOOP 3)
- Camera permission handling
- MediaPipe Face Mesh integration
- Geometric feature extraction
- Rule-based emotion classification
- Confidence scoring and smoothing

### Phase 3: Mood Intelligence (LOOP 4)
- Mood context management
- Confirmation system
- Priority hierarchy implementation
- User correction handling

### Phase 4: AI Chatbot (LOOP 5)
- Gemini API integration
- Personality system (4 personalities)
- Context-aware messaging
- Conversation history management

### Phase 5: Productivity (LOOP 6)
- Task management system
- AI task suggestions
- Mood-based task recommendations

### Phase 6: Analytics (LOOP 6-7)
- Mood tracking dashboard
- Charts and visualizations
- Data export/clear functionality

## Component Architecture

### State Flow
```
Camera Detection → MoodContext → AI Context → Chat Response → Task Suggestions
     ↑                                                              ↓
Manual Input → Mood Confirmation → Mood Context ←─────────────────────┘
```

### Key Components

**CameraDisplay**
- Live video preview
- Face bounding box
- Expression label overlay
- Confidence indicator
- Control buttons (Start/Pause/Stop)

**MoodSelector**
- Quick-select mood buttons
- Visual mood indicators
- Confirmation prompts

**ChatInterface**
- Message list with sender indicators
- Typing animation
- Personality badge
- Context display

**TaskList**
- Todo items with drag/drop
- Priority badges
- Due date indicators
- Completion checkboxes

**MoodDashboard**
- Timeline view
- Distribution charts
- Summary statistics
- Entry management

## Privacy & Security Considerations

1. **Camera**: Never stored, processed locally only
2. **Biometric data**: No storage of facial templates
3. **Conversation history**: Local storage by default, optional cloud sync
4. **API keys**: Backend-only, environment variables
5. **Permissions**: Explicit opt-in for all data collection