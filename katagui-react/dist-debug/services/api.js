// API service for communicating with the backend
// Base URL for the API - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}
async function fetchJSON(url, options) {
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
    async createGame(data) {
        return fetchJSON('/create_game', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    async loadGame(gameHash) {
        return fetchJSON('/load_game', {
            method: 'POST',
            body: JSON.stringify({ game_hash: gameHash }),
        });
    },
    async updateGame(data) {
        return fetchJSON('/update_game', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    // KataGo AI moves
    async selectMove(botName, data, isGuest = false) {
        const endpoint = isGuest ? `/select-move-guest/${botName}` : `/select-move-x/${botName}`;
        return fetchJSON(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    async getScore(botName, data) {
        return fetchJSON(`/score/${botName}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    // Chat
    async sendChat(data) {
        return fetchJSON('/chat', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    // SGF operations
    async parseSGF(file) {
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
    getSGFDownloadURL(moves, probs, scores, pb, pw, komi) {
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
    async log(message) {
        try {
            await fetchJSON('/slog', {
                method: 'POST',
                body: JSON.stringify({ msg: message }),
            });
        }
        catch (error) {
            console.error('Failed to send log to server:', error);
        }
    },
};
//# sourceMappingURL=api.js.map