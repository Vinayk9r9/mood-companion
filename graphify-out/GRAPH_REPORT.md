# Graph Report - mood-companion  (2026-11-16)

## Corpus Check
- Corpus is ~44,509 words - fits in a single context window. You may not need a graph.

## Summary
- 518 nodes · 942 edges · 22 communities (9 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- State Management
- Tasks Component
- AI Components & Server
- Layout & App Core
- Mood Components
- Package Dependencies
- AI Components
- Camera Components
- Mood Components
- Core Utilities
- Settings Page & AI
- Mood Components
- Home Page & Mood
- Dashboard Components
- AI Components
- AI Components
- AI Companion Page & Mood
- Mood Components
- Dashboard Components
- Dashboard Components
- Python Server
- Mood Tracker Page & Mood

## God Nodes (most connected - your core abstractions)
1. `StateManager` - 68 edges
2. `ChatInterface` - 27 edges
3. `MoodAnalytics` - 25 edges
4. `CameraPreview` - 23 edges
5. `CalibrationFeedback` - 20 edges
6. `VoiceChat` - 18 edges
7. `MoodHistory` - 17 edges
8. `ChatPreview` - 15 edges
9. `MoodConfirmation` - 15 edges
10. `TaskList` - 14 edges

## Surprising Connections (you probably didn't know these)
- `StateManager` --inherits--> `EventEmitter`  [EXTRACTED]
  src/utils/StateManager.js → src/utils/EventEmitter.js
- `initializeApp()` --calls--> `App`  [EXTRACTED]
  src/main.js → src/App.js
- `Sidebar()` --calls--> `Navigation()`  [EXTRACTED]
  src/components/layout/Sidebar.js → src/components/layout/Navigation.js
- `initSidebarEvents()` --calls--> `initNavigationEvents()`  [EXTRACTED]
  src/components/layout/Sidebar.js → src/components/layout/Navigation.js
- `ThemeManager` --inherits--> `EventEmitter`  [EXTRACTED]
  src/utils/ThemeManager.js → src/utils/EventEmitter.js

## Import Cycles
- None detected.

## Communities (22 total, 13 thin omitted)

### Community 1 - "Tasks Component"
Cohesion: 0.09
Nodes (7): CATEGORY_ICONS, CATEGORY_LABELS, PRIORITY_CONFIG, TaskList, MOOD_SUGGESTIONS, TaskSuggestions, MyTasksPage

### Community 2 - "AI Components & Server"
Cohesion: 0.08
Nodes (13): app, __dirname, __filename, PERSONALITY_SYSTEM_PROMPTS, RATE_LIMIT_MAX, requestCounts, server, MOOD_RESPONSE_GUIDES (+5 more)

### Community 3 - "Layout & App Core"
Cohesion: 0.12
Nodes (11): App, Header(), initHeaderEvents(), initMobileMenuEvents(), MobileMenu(), initNavigationEvents(), Navigation(), initSidebarEvents() (+3 more)

### Community 4 - "Mood Components"
Cohesion: 0.12
Nodes (9): CHART_MOOD_CONFIG, MoodConfirmation, SOURCE_COLORS, SOURCE_LABELS, MOOD_OPTIONS, MoodSelector, CONFIRMATION_MESSAGES, MOOD_CONFIG (+1 more)

### Community 5 - "Package Dependencies"
Cohesion: 0.10
Nodes (24): allowScripts, protobufjs@7.6.6, author, dependencies, @dietrichgebert/ponytail@^5.3.3, dotenv@^18.0.10, express@^4.18.2, @google/genai@^3.3.0 (+16 more)

### Community 9 - "Core Utilities"
Cohesion: 0.14
Nodes (4): stateManager, themeManager, EventEmitter, ThemeManager

### Community 13 - "Dashboard Components"
Cohesion: 0.17
Nodes (6): ICONS, QUICK_ACTIONS, QuickActions, finishExercise(), runCycle(), updateCircle()

### Community 18 - "Dashboard Components"
Cohesion: 0.22
Nodes (3): CATEGORY_ICONS, PRIORITY_CONFIG, TodaysTasks

### Community 19 - "Dashboard Components"
Cohesion: 0.23
Nodes (3): ACTIVITY_SUGGESTIONS, ICONS, SuggestedActivities

## Knowledge Gaps
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StateManager` connect `State Management` to `Core Utilities`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **Should `State Management` be split into smaller, more focused modules?**
  _Cohesion score 0.05454545454545454 - nodes in this community are weakly interconnected._
- **Why does `ChatInterface` connect `AI Components` to `AI Companion Page & Mood`, `AI Components & Server`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `Tasks Component` be split into smaller, more focused modules?**
  _Cohesion score 0.08534850640113797 - nodes in this community are weakly interconnected._
- **Why does `MoodAnalytics` connect `Mood Components` to `Mood Components`, `Mood Tracker Page & Mood`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `AI Components & Server` be split into smaller, more focused modules?**
  _Cohesion score 0.08021390374331551 - nodes in this community are weakly interconnected._
- **Should `Layout & App Core` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._