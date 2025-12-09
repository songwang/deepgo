import { makeObservable, observable, computed, action } from 'mobx';
import type {
  Move,
  StoneType,
  Point,
  Settings,
  BoardSize,
  BoardMark,
} from '../types/game';
import { getHandicapPoints, sgfToPoint } from '../services/coordinateUtils';
import { applyMove } from '../services/goLogic';

const DEFAULT_SETTINGS: Settings = {
  show_emoji: true,
  show_prob: true,
  show_best_moves: true,
  disable_ai: false,
  show_best_ten: true,
  board_rotation: 0,
  language: 'eng',
};

export class GameStore {
  // Game state
  gameHash: string = '';
  boardSize: BoardSize = 19;
  handicap: number = 0;
  komi: number = 7.5;
  moves: Move[] = [];
  currentPosition: number = 0;

  // UI state
  settings: Settings = DEFAULT_SETTINGS;
  isLoading: boolean = false;
  error: string | null = null;

  constructor() {
    makeObservable(this, {
      // Observable properties
      gameHash: observable,
      boardSize: observable,
      handicap: observable,
      komi: observable,
      moves: observable,
      currentPosition: observable,
      settings: observable,
      isLoading: observable,
      error: observable,

      // Computed properties
      nextPlayer: computed,
      boardState: computed,
      moveList: computed,
      currentMove: computed,
      lastMoveMark: computed,

      // Actions
      setGameHash: action,
      newGame: action,
      addMove: action,
      removeLastMove: action,
      goToMove: action,
      goToStart: action,
      goToEnd: action,
      nextMove: action,
      previousMove: action,
      updateSettings: action,
      setLoading: action,
      setError: action,
    });
  }

  // Computed properties
  get nextPlayer(): StoneType {
    if (this.handicap >= 2) {
      // If handicap, white plays first
      return this.currentPosition % 2 === 0 ? 'white' : 'black';
    } else {
      return this.currentPosition % 2 === 0 ? 'black' : 'white';
    }
  }

  get boardState(): Map<string, StoneType> {
    const board = new Map<string, StoneType>();

    // Place handicap stones
    if (this.handicap >= 2) {
      const handicapPoints = getHandicapPoints(this.boardSize, this.handicap);
      handicapPoints.forEach((point) => {
        const key = `${point.row},${point.col}`;
        board.set(key, 'black');
      });
    }

    // Apply moves up to current position
    let currentPlayer: StoneType = this.handicap >= 2 ? 'white' : 'black';

    for (let i = 0; i < this.currentPosition && i < this.moves.length; i++) {
      const move = this.moves[i];

      if (move.mv !== 'pass' && move.mv !== 'resign') {
        const point = sgfToPoint(move.mv, this.boardSize);
        if (point) {
          // Apply move with proper capture detection
          const result = applyMove(board, point, currentPlayer, this.boardSize);
          if (result) {
            // Replace board with new state that includes captures
            board.clear();
            result.board.forEach((stone, key) => board.set(key, stone));
          }
        }
      }

      currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    }

    return board;
  }

  get moveList(): string[] {
    return this.moves.slice(0, this.currentPosition).map((m) => m.mv);
  }

  get currentMove(): Move | null {
    if (this.currentPosition === 0 || this.currentPosition > this.moves.length) return null;
    return this.moves[this.currentPosition - 1];
  }

  get lastMoveMark(): BoardMark | null {
    if (this.moves.length === 0 || this.currentPosition === 0) return null;

    const lastMove = this.moves[this.currentPosition - 1];
    if (!lastMove || lastMove.mv === 'pass' || lastMove.mv === 'resign') return null;

    const point = sgfToPoint(lastMove.mv, this.boardSize);
    if (!point) return null;

    return {
      coord: point,
      type: 'circle' as const,
    };
  }

  // Actions
  setGameHash = (hash: string): void => {
    this.gameHash = hash;
  };

  newGame = (handicap: number, komi: number, boardSize: BoardSize = 19): void => {
    this.handicap = handicap;
    this.komi = komi;
    this.boardSize = boardSize;
    this.moves = [];
    this.currentPosition = 0;
    this.gameHash = '';
    this.error = null;
  };

  addMove = (move: Move): void => {
    // If we're in the middle of the game history, truncate future moves
    const newMoves = [...this.moves.slice(0, this.currentPosition), move];
    this.moves = newMoves;
    this.currentPosition = newMoves.length;
  };

  removeLastMove = (): void => {
    if (this.moves.length === 0) return;

    this.moves = this.moves.slice(0, -1);
    this.currentPosition = this.moves.length;
  };

  goToMove = (position: number): void => {
    this.currentPosition = Math.max(0, Math.min(position, this.moves.length));
  };

  goToStart = (): void => {
    this.goToMove(0);
  };

  goToEnd = (): void => {
    this.goToMove(this.moves.length);
  };

  nextMove = (): void => {
    this.goToMove(this.currentPosition + 1);
  };

  previousMove = (): void => {
    this.goToMove(this.currentPosition - 1);
  };

  updateSettings = (newSettings: Partial<Settings>): void => {
    this.settings = { ...this.settings, ...newSettings };
  };

  setLoading = (loading: boolean): void => {
    this.isLoading = loading;
  };

  setError = (error: string | null): void => {
    this.error = error;
  };

  // Helper methods
  getBoardState = (): Map<string, StoneType> => {
    return this.boardState;
  };

  getMoveList = (): string[] => {
    return this.moveList;
  };

  getCurrentMove = (): Move | null => {
    return this.currentMove;
  };

  canPlayAt = (point: Point): boolean => {
    const key = `${point.row},${point.col}`;
    return !this.boardState.has(key);
  };
}

// Create a singleton instance
export const gameStore = new GameStore();