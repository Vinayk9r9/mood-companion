# Mood Companion

AI-Powered Emotion-Aware Personal Companion

## Features

- 🎥 **Live Facial Expression Detection** - Using MediaPipe Face Mesh for real-time analysis
- 😊 **Mood Intelligence** - Hierarchical mood detection (user statements > manual selection > conversation context > camera predictions)
- 🤖 **AI Chat Companion** - 4 personalities: Funny Friend, Motivational Coach, Calm Listener, Productivity Assistant
- ✅ **Task Management** - Create, edit, delete, prioritize tasks with AI suggestions based on mood
- 📊 **Mood Analytics** - Track mood history with charts and trends
- 🌙 **Dark/Light Mode** - Full theme support with system preference detection
- 🔒 **Privacy First** - All processing happens locally, no data uploaded

## Running the Application

### Option 1: Python HTTP Server (Recommended)
```bash
# Python 3
w3

# Then open http://localhost:8000
```

### Option 2: VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"

### Option 3: Any Static Server
```bash
# Using npx (if Node.js available)
npx serve .

# Using PHP
php -S localhost:8000
```

## Requirements

- Modern browser with camera support (Chrome, Firefox, Safari, Edge)
- HTTPS or localhost (required for camera access)
- Camera permission granted when prompted

## Architecture

```
mood-companion/
├── index.html           # Main HTML entry point
├── server.js            # Optional Express backend (for API proxy)
├── src/
│   ├── main.js          # Application entry point
│   ├── App.js           # Main app component
│   ├── utils/           # Core utilities (StateManager, ThemeManager)
│   ├── components/      # Reusable UI components
│   │   ├── ai/          # AI chat components
│   │   ├── camera/      # Camera & face detection
│   │   ├── mood/        # Mood tracking components
│   │   ├── tasks/       # Task management
│   │   ├── dashboard/   # Dashboard widgets
│   │   ├── layout/      # Layout components
│   │   └── ui/          # Basic UI elements
│   └── pages/           # Page components
└── README.md
```

## Key Technical Decisions

### Facial Expression Detection
- Uses **MediaPipe Face Mesh** (468 facial landmarks)
- Custom geometric feature extraction (EAR, MAR, smile score, brow height)
- Rule-based classification with temporal smoothing
- Runs at 2 FPS to conserve CPU/battery

### Mood Intelligence Hierarchy
1. **User explicit statements** - "I'm feeling happy"
2. **Manual mood selection** - User clicks mood button
3. **Conversation context** - AI infers from chat
4. **Camera predictions** - Lowest priority, only used when confident (>60%)

### State Management
- Centralized `StateManager` with event emitter pattern
- localStorage persistence for all user data
- Reactive UI updates via event listeners

### Privacy
- Camera stream never leaves the browser
- No facial biometric templates stored
- All data stored locally in localStorage
- Optional export/import for backup

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Development

### Project Structure
- ES Modules (no build step required)
- Tailwind CSS via CDN
- MediaPipe via CDN
- Framer Motion animations via CSS

### Adding Features
1. Create component in appropriate `src/components/` folder
2. Add page in `src/pages/` if needed
3. Register in `App.js` navigation
4. Use `StateManager` for state

## Troubleshooting

### Camera not working?
- Ensure you're on `localhost` or HTTPS
- Grant camera permission in browser
- Check if another app is using the camera
- Try refreshing the page

### Face detection not accurate?
- Ensure good lighting
- Face the camera directly
- Avoid extreme angles
- Clean camera lens

### App not loading?
- Open browser console for errors
- Ensure all files are accessible
- Check for CORS issues if not using a server

## License

MIT License - feel free to use and modify!