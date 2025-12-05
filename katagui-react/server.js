// Simple Express proxy server for KataGo
// Forwards requests from React frontend to katago-server

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8000;

// Katago-server configuration
// Update this to point to your katago-server instance
const KATAGO_SERVER_URL = process.env.KATAGO_SERVER_URL || 'http://localhost:2718';

// Enable CORS for React frontend (allow any localhost port)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow any localhost or 127.0.0.1 origin
    if (origin.match(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Forward select-move requests to katago-server
app.post('/select-move-x/:botName', async (req, res) => {
  const { botName } = req.params;
  const endpoint = `select-move/${botName}`;

  try {
    const response = await fetch(`${KATAGO_SERVER_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error forwarding to katago-server:', error);
    res.status(500).json({ error: 'Failed to connect to katago-server' });
  }
});

// Forward select-move-guest requests
app.post('/select-move-guest/:botName', async (req, res) => {
  const { botName } = req.params;
  const endpoint = `select-move/${botName}`;

  try {
    const response = await fetch(`${KATAGO_SERVER_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error forwarding to katago-server:', error);
    res.status(500).json({ error: 'Failed to connect to katago-server' });
  }
});

// Forward score requests
app.post('/score/:botName', async (req, res) => {
  const { botName } = req.params;
  const endpoint = `score/${botName}`;

  try {
    const response = await fetch(`${KATAGO_SERVER_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error forwarding to katago-server:', error);
    res.status(500).json({ error: 'Failed to connect to katago-server' });
  }
});

// Simple in-memory game storage (no database)
const games = new Map();

// Create game endpoint
app.post('/create_game', (req, res) => {
  const { handicap, komi } = req.body;
  const gameHash = Math.random().toString(36).substring(2, 18); // Generate random hash

  games.set(gameHash, {
    game_hash: gameHash,
    handicap,
    komi,
    game_record: JSON.stringify({ moves: [], pos: 0, handicap, komi }),
    ts_started: Date.now(),
    ts_latest_move: Date.now(),
  });

  res.json({ game_hash: gameHash });
});

// Load game endpoint
app.post('/load_game', (req, res) => {
  const { game_hash } = req.body;
  const game = games.get(game_hash);

  if (game) {
    res.json(game);
  } else {
    res.status(404).json({ error: 'Game not found' });
  }
});

// Update game endpoint
app.post('/update_game', (req, res) => {
  const { game_hash, game_record } = req.body;
  const game = games.get(game_hash);

  if (game) {
    game.game_record = game_record;
    game.ts_latest_move = Date.now();
    games.set(game_hash, game);
    res.json({ result: 'ok' });
  } else {
    res.status(404).json({ error: 'Game not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', katago_server: KATAGO_SERVER_URL });
});

// Start server
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Forwarding to katago-server at ${KATAGO_SERVER_URL}`);
  console.log(`CORS enabled for React dev server`);
});
