# KataGui React - Go Game Interface

A modern React+TypeScript frontend for playing Go (Weiqi/Baduk) against KataGo AI. This is a complete rewrite of the original Python/Flask katagui application.

## Features

- **Play Against KataGo**: Interactive game interface with AI opponent
- **Canvas-based Go Board**: Custom-built board renderer with smooth interactions
- **Move Analysis**: View win probabilities, best moves, and position scores
- **Game Navigation**: Step through move history with full navigation controls
- **Handicap Games**: Support for 2-9 handicap stones
- **Real-time Updates**: WebSocket support for watching live games (coming soon)
- **TypeScript**: Fully typed for better development experience
- **State Management**: Zustand for clean, efficient state handling

## Project Structure

```
katagui-react/
├── src/
│   ├── components/       # React components
│   │   ├── GoBoard.tsx      # Canvas-based Go board
│   │   └── GamePlay.tsx     # Main game interface
│   ├── hooks/           # Custom React hooks
│   │   ├── useKataGo.ts     # KataGo API interactions
│   │   └── useWebSocket.ts  # WebSocket connections
│   ├── services/        # API and utilities
│   │   ├── api.ts           # Backend API client
│   │   └── coordinateUtils.ts # SGF coordinate conversion
│   ├── store/           # State management
│   │   └── gameStore.ts     # Zustand game state
│   ├── types/           # TypeScript definitions
│   │   └── game.ts          # Game-related types
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/              # Static assets
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- The katagui Flask backend server running (from ../katagui)

### Installation

1. Install dependencies:
   ```bash
   cd katagui-react
   npm install
   ```

2. Create environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your backend URL:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   VITE_WS_BASE_URL=ws://localhost:8000
   ```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Backend Setup

This React app requires the katagui Flask backend to be running. See `../katagui/` for setup instructions.

Quick backend startup:
```bash
cd ../katagui
source .env  # Load environment variables
gunicorn -k flask_sockets.worker heroku_app:app -w 1 -b 0.0.0.0:8000 --reload
```

## API Endpoints Used

The React app communicates with these Flask backend endpoints:

- `POST /create_game` - Create new game
- `POST /load_game` - Load existing game
- `POST /update_game` - Save game state
- `POST /select-move-x/<bot>` - Get KataGo move suggestion
- `POST /score/<bot>` - Get position evaluation
- `WS /register_socket/<game_hash>` - Real-time game updates

## Key Components

### GoBoard

Custom canvas-based Go board component with:
- Stone rendering with gradients and shadows
- Star points for 9x9, 13x13, 19x19 boards
- Click handling for move placement
- Hover preview stones
- Support for marks and annotations

### GamePlay

Main game interface with:
- New game creation with handicap/komi selection
- Move navigation (start, end, next, previous, undo)
- KataGo integration for bot moves
- Best move suggestions display
- Win probability and score tracking
- Move history viewer

### Game Store (Zustand)

Centralized state management for:
- Board state (stone positions)
- Move history with full navigation
- Game settings (handicap, komi)
- UI preferences

## Coordinate System

The app uses SGF (Smart Game Format) coordinate notation:
- Columns: A-T (skipping I)
- Rows: 1-19 (bottom to top)
- Examples: Q16, D4, K10

Internally, coordinates are stored as 0-indexed row/col pairs.

## Technologies

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Zustand**: State management
- **Socket.io-client**: WebSocket support
- **Canvas API**: Board rendering

## Roadmap

- [ ] Game watching interface
- [ ] WebSocket real-time updates
- [ ] Board editing mode
- [ ] SGF file import/export
- [ ] Chat functionality
- [ ] Mobile responsive design
- [ ] User authentication
- [ ] Game history browser

## Credits

- Original katagui by Apollo
- KataGo by David Wu
- React conversion by Claude Code
