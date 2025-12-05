# Quick Start Guide

## Project Overview

This is a React+TypeScript conversion of the katagui Python/Flask application. It provides a modern web interface for playing Go against KataGo AI.

## Directory Structure

```
katagui-react/
├── src/
│   ├── components/
│   │   ├── GoBoard.tsx          # Canvas-based Go board component
│   │   └── GamePlay.tsx         # Main game play interface
│   ├── hooks/
│   │   ├── useKataGo.ts         # Hook for KataGo API calls
│   │   └── useWebSocket.ts      # WebSocket connection hook
│   ├── services/
│   │   ├── api.ts               # Backend API client
│   │   └── coordinateUtils.ts   # SGF coordinate utilities
│   ├── store/
│   │   └── gameStore.ts         # Zustand game state store
│   ├── types/
│   │   └── game.ts              # TypeScript type definitions
│   ├── App.tsx                  # Main App component
│   └── main.tsx                 # Application entry point
├── public/                       # Static assets
├── .env.example                 # Environment variables template
├── package.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd katagui-react
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` to point to your backend:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

### 3. Start the Backend

The React app needs the Flask backend running. In a separate terminal:

```bash
cd ../katagui
source .env
gunicorn -k flask_sockets.worker heroku_app:app -w 1 -b 0.0.0.0:8000 --reload
```

### 4. Start the React Dev Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Key Features Implemented

### ✅ Core Functionality
- Custom canvas-based Go board rendering
- Stone placement with click handling
- Hover preview stones
- Star points for 19x19, 13x13, 9x9 boards
- Stone rendering with gradients and shadows

### ✅ Game Play
- New game creation with handicap (0-9) and komi selection
- Play against KataGo AI
- Move navigation (start, end, next, previous, undo)
- Pass and resign moves
- Handicap stone placement

### ✅ AI Integration
- KataGo move suggestions
- Best move display (top 10)
- Win probability tracking
- Position score evaluation
- Move quality indicators (emoji)

### ✅ State Management
- Zustand store for game state
- Move history with full replay
- Board state calculation from move list
- Settings management

### 🚧 Coming Soon
- WebSocket game watching
- Board editing mode
- SGF file import/export
- Chat functionality
- Mobile responsive layout
- User authentication

## Architecture Highlights

### Canvas Board Rendering
The `GoBoard` component renders the entire board on HTML Canvas:
- Efficient rendering with requestAnimationFrame
- Smooth stone placement animations
- Hover preview with opacity
- Support for marks and annotations

### Type-Safe API Client
All API calls are fully typed with TypeScript interfaces:
```typescript
const response = await api.selectMove('katago_gtp_bot', {
  board_size: 19,
  moves: ['Q16', 'D4'],
  komi: 7.5,
  handicap: 0,
});
// response is typed as KataGoResponse
```

### Zustand State Store
Game state is managed with Zustand for simplicity:
```typescript
const { moves, addMove, goToMove, boardState } = useGameStore();
```

### SGF Coordinate System
Coordinates use standard SGF notation:
- Columns: A-T (skip I)
- Rows: 1-19
- Utilities convert between SGF and 0-indexed coordinates

## Development Commands

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check
```

## Code Organization

### Components
- **GoBoard**: Pure rendering component, no business logic
- **GamePlay**: Container component with game logic and API calls

### Hooks
- **useKataGo**: Abstracts KataGo API calls
- **useWebSocket**: Manages WebSocket connections (scaffolded)

### Services
- **api**: All backend API calls in one place
- **coordinateUtils**: SGF coordinate conversion utilities

### Store
- **gameStore**: Single source of truth for game state

## Extending the Application

### Adding a New Component

1. Create component in `src/components/`
2. Import types from `src/types/game.ts`
3. Use store hooks: `useGameStore()`
4. Follow React best practices

### Adding a New API Endpoint

1. Add TypeScript types to `src/types/game.ts`
2. Add API method to `src/services/api.ts`
3. Create a hook in `src/hooks/` if complex
4. Use in components

### Modifying Board Appearance

Edit `src/components/GoBoard.tsx`:
- Stone colors: Modify gradient in draw function
- Board color: Change fillStyle for background
- Star points: Adjust size and positions
- Grid lines: Modify stroke styles

## Troubleshooting

### Build Errors
- Ensure all imports use `type` keyword for type-only imports
- Run `npm run build` to check for TypeScript errors

### API Connection Issues
- Verify backend is running on correct port
- Check `.env` file has correct URLs
- Check CORS settings on backend

### WebSocket Not Working
- WebSocket feature is scaffolded but needs backend integration
- Current implementation uses Socket.io (backend uses Flask-SocketIO)
- May need to switch to native WebSocket to match backend

## Next Steps

1. Test the application with the backend
2. Implement remaining features (SGF, watching, editing)
3. Add mobile responsive layout
4. Implement user authentication
5. Add tests

## Questions?

Refer to the main README.md or check the original katagui Python implementation for reference.
