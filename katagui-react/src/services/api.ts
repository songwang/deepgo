// API service for communicating with the backend

import type {
  CreateGameRequest,
  CreateGameResponse,
  SelectMoveRequest,
  KataGoResponse,
  ScoreRequest,
  ScoreResponse,
  UpdateGameRequest,
  ChatMessage,
  GameState,
} from '../types/game';

// Base URL for the API - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Game management
  async createGame(data: CreateGameRequest): Promise<CreateGameResponse> {
    return fetchJSON<CreateGameResponse>('/create_game', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async loadGame(gameHash: string): Promise<GameState> {
    return fetchJSON<GameState>('/load_game', {
      method: 'POST',
      body: JSON.stringify({ game_hash: gameHash }),
    });
  },

  async updateGame(data: UpdateGameRequest): Promise<{ result: string }> {
    return fetchJSON('/update_game', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // KataGo AI moves
  async selectMove(botName: string, data: SelectMoveRequest, isGuest = false): Promise<KataGoResponse> {
    const endpoint = isGuest ? `/select-move-guest/${botName}` : `/select-move-x/${botName}`;
    return fetchJSON<KataGoResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getScore(botName: string, data: ScoreRequest): Promise<ScoreResponse> {
    return fetchJSON<ScoreResponse>(`/score/${botName}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Chat
  async sendChat(data: ChatMessage): Promise<{ result: string }> {
    return fetchJSON('/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // SGF operations
  async parseSGF(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/sgf2list`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(response.status, `Failed to parse SGF: ${response.statusText}`);
    }

    return response.json();
  },

  getSGFDownloadURL(moves: string[], probs: number[], scores: number[], pb: string, pw: string, komi: number): string {
    const params = new URLSearchParams({
      moves: moves.join(','),
      probs: probs.join(','),
      scores: scores.join(','),
      pb,
      pw,
      km: komi.toString(),
    });
    return `${API_BASE_URL}/save-sgf?${params.toString()}`;
  },

  // Logging
  async log(message: string): Promise<void> {
    try {
      await fetchJSON('/slog', {
        method: 'POST',
        body: JSON.stringify({ msg: message }),
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  },
};

