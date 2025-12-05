import { create } from 'zustand';
import type {
  Move,
  StoneType,
  Point,
  Settings,
  BoardSize,
} from '../types/game';
import { getHandicapPoints, sgfToPoint } from '../services/coordinateUtils';

interface GameStore {
  // Game state
  gameHash: string;
  boardSize: BoardSize;
  handicap: number;
  komi: number;
  moves: Move[];
  currentPosition: number; // index in moves array
  nextPlayer: StoneType;

  // Board state (derived from moves)
  boardState: Map<string, StoneType>; // key: "row,col"

  // UI state
  settings: Settings;
  isLoading: boolean;
  error: string | null;

  // Actions
  setGameHash: (hash: string) => void;
  newGame: (handicap: number, komi: number, boardSize?: BoardSize) => void;
  addMove: (move: Move) => void;
  removeLastMove: () => void;
  goToMove: (position: number) => void;
  goToStart: () => void;
  goToEnd: () => void;
  nextMove: () => void;
  previousMove: () => void;

  updateSettings: (settings: Partial<Settings>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Helper methods
  getBoardState: () => Map<string, StoneType>;
  getMoveList: () => string[];
  getCurrentMove: () => Move | null;
  canPlayAt: (point: Point) => boolean;
}

const DEFAULT_SETTINGS: Settings = {
  show_emoji: true,
  show_prob: true,
  show_best_moves: true,
  disable_ai: false,
  show_best_ten: true,
  board_rotation: 0,
  language: 'eng',
};

// Helper function to calculate board state from moves
function calculateBoardState(
  moves: Move[],
  position: number,
  handicap: number,
  boardSize: number
): Map<string, StoneType> {
  const board = new Map<string, StoneType>();

  // Place handicap stones
  if (handicap >= 2) {
    const handicapPoints = getHandicapPoints(boardSize, handicap);
    handicapPoints.forEach((point) => {
      const key = `${point.row},${point.col}`;
      board.set(key, 'black');
    });
  }

  // Apply moves up to current position
  let currentPlayer: StoneType = handicap >= 2 ? 'white' : 'black';

  for (let i = 0; i < position && i < moves.length; i++) {
    const move = moves[i];

    if (move.mv !== 'pass' && move.mv !== 'resign') {
      const point = sgfToPoint(move.mv, boardSize);
      if (point) {
        const key = `${point.row},${point.col}`;
        board.set(key, currentPlayer);

        // Simple capture detection (basic implementation)
        // TODO: Implement proper liberty counting and capture logic
      }
    }

    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
  }

  return board;
}

// Determine next player based on position
function getNextPlayer(position: number, handicap: number): StoneType {
  if (handicap >= 2) {
    // If handicap, white plays first
    return position % 2 === 0 ? 'white' : 'black';
  } else {
    return position % 2 === 0 ? 'black' : 'white';
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  gameHash: '',
  boardSize: 19,
  handicap: 0,
  komi: 7.5,
  moves: [],
  currentPosition: 0,
  nextPlayer: 'black',
  boardState: new Map(),
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,

  // Actions
  setGameHash: (hash: string) => set({ gameHash: hash }),

  newGame: (handicap: number, komi: number, boardSize: BoardSize = 19) => {
    const initialBoardState = calculateBoardState([], 0, handicap, boardSize);
    set({
      handicap,
      komi,
      boardSize,
      moves: [],
      currentPosition: 0,
      nextPlayer: handicap >= 2 ? 'white' : 'black',
      boardState: initialBoardState,
      gameHash: '',
      error: null,
    });
  },

  addMove: (move: Move) => {
    const { moves, currentPosition, handicap, boardSize } = get();

    // If we're in the middle of the game history, truncate future moves
    const newMoves = [...moves.slice(0, currentPosition), move];
    const newPosition = newMoves.length;

    const newBoardState = calculateBoardState(newMoves, newPosition, handicap, boardSize);
    const newNextPlayer = getNextPlayer(newPosition, handicap);

    set({
      moves: newMoves,
      currentPosition: newPosition,
      boardState: newBoardState,
      nextPlayer: newNextPlayer,
    });
  },

  removeLastMove: () => {
    const { moves, handicap, boardSize } = get();
    if (moves.length === 0) return;

    const newMoves = moves.slice(0, -1);
    const newPosition = newMoves.length;
    const newBoardState = calculateBoardState(newMoves, newPosition, handicap, boardSize);
    const newNextPlayer = getNextPlayer(newPosition, handicap);

    set({
      moves: newMoves,
      currentPosition: newPosition,
      boardState: newBoardState,
      nextPlayer: newNextPlayer,
    });
  },

  goToMove: (position: number) => {
    const { moves, handicap, boardSize } = get();
    const clampedPosition = Math.max(0, Math.min(position, moves.length));
    const newBoardState = calculateBoardState(moves, clampedPosition, handicap, boardSize);
    const newNextPlayer = getNextPlayer(clampedPosition, handicap);

    set({
      currentPosition: clampedPosition,
      boardState: newBoardState,
      nextPlayer: newNextPlayer,
    });
  },

  goToStart: () => get().goToMove(0),
  goToEnd: () => get().goToMove(get().moves.length),
  nextMove: () => get().goToMove(get().currentPosition + 1),
  previousMove: () => get().goToMove(get().currentPosition - 1),

  updateSettings: (newSettings: Partial<Settings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),

  // Helper methods
  getBoardState: () => get().boardState,

  getMoveList: () => {
    const { moves, currentPosition } = get();
    return moves.slice(0, currentPosition).map((m) => m.mv);
  },

  getCurrentMove: () => {
    const { moves, currentPosition } = get();
    if (currentPosition === 0 || currentPosition > moves.length) return null;
    return moves[currentPosition - 1];
  },

  canPlayAt: (point: Point) => {
    const { boardState } = get();
    const key = `${point.row},${point.col}`;
    return !boardState.has(key);
  },
}));
