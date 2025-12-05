# Node.js Proxy Server

This is a simple Express.js proxy server that forwards requests from the React frontend to the katago-server.

## Why a Proxy Server?

The React app needs a backend to:
1. Forward move requests to katago-server
2. Store game state (in-memory, no database)
3. Handle CORS for development

## Architecture

```
React App (port 5173)
    ↓
Node.js Proxy (port 8000)
    ↓
katago-server (port 2718)
    ↓
KataGo binary
```

## Configuration

Edit the `.env` file:

```bash
# React app config
VITE_API_BASE_URL=http://localhost:8000

# Proxy server config
KATAGO_SERVER_URL=http://localhost:2718
PORT=8000
```

## Running

### Option 1: Run everything together
```bash
npm start
```
This starts both the proxy server (port 8000) and React dev server (port 5173).

### Option 2: Run separately

Terminal 1 - Proxy server:
```bash
npm run server
```

Terminal 2 - React dev server:
```bash
npm run dev
```

## Endpoints

The proxy server provides these endpoints:

- `POST /create_game` - Create new game (in-memory)
- `POST /load_game` - Load game by hash
- `POST /update_game` - Update game state
- `POST /select-move-x/:botName` - Get KataGo move (forwarded to katago-server)
- `POST /select-move-guest/:botName` - Guest move request
- `POST /score/:botName` - Get position score
- `GET /health` - Health check

## Features

✅ CORS enabled for React dev server  
✅ Simple in-memory game storage  
✅ Request forwarding to katago-server  
✅ No authentication (simplified)  
✅ No database (in-memory only)  

## Limitations

- Games are stored in memory only (lost on server restart)
- No user authentication
- No persistent storage
- No WebSocket support yet

This is a minimal implementation focused on core functionality.
