import { makeObservable, observable, computed, action } from 'mobx';
import type {
  Move,
  StoneType,
  Point,
  Settings,
  BoardSize,
  BoardMark,
  KataGoMove,
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
  
  // Best moves state
  bestMoves: KataGoMove[] = [];
  showBestMovesOnBoard: boolean = false;
  isWaitingForBot: boolean = false;
  
  // Self-play state
  isSelfPlaying: boolean = false;

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
      bestMoves: observable,
      showBestMovesOnBoard: observable,
      isWaitingForBot: observable,
      isSelfPlaying: observable,

      // Computed properties
      nextPlayer: computed,
      boardState: computed,
      moveList: computed,
      currentMove: computed,
      lastMoveMark: computed,
      bestMoveMarks: computed,
      allMarks: computed,
      canPlayMove: computed,
      shouldShowHover: computed,
      isGameOver: computed,

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
      setBestMoves: action,
      toggleBestMovesOnBoard: action,
      setWaitingForBot: action,
      setSelfPlaying: action,
      clearBestMoves: action,
      makeMove: action,
      makePass: action,
      handleBotMoveResponse: action,
      shouldRequestBotMove: action,
      checkSelfPlayStop: action,
      handleKeyboardShortcut: action,
      shouldContinueSelfPlay: action,
      startSelfPlay: action,
      stopSelfPlay: action,
      toggleSelfPlay: action,
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

  get bestMoveMarks(): BoardMark[] {
    if (!this.showBestMovesOnBoard || !this.bestMoves.length) return [];

    let movesToShow: KataGoMove[] = [];
    if (this.settings.show_best_ten) {
      movesToShow = this.bestMoves;
    } else {
      const mmax = this.bestMoves[0]?.psv || 0;
      if (mmax > 0) {
        movesToShow = this.bestMoves.filter(move => move.psv >= 0.05 * mmax);
      }
    }

    const letters = 'ABCDEFGHIJ';
    return movesToShow.slice(0, 10).map((move, idx): BoardMark | null => {
      const point = sgfToPoint(move.move, this.boardSize);
      if (!point) return null;

      // Validate that the suggested move is on an empty intersection
      const key = `${point.row},${point.col}`;
      if (this.boardState.has(key)) {
        console.warn(`Skipping best move ${move.move} - intersection is occupied`);
        return null;
      }

      return {
        coord: point,
        type: 'letter' as const,
        value: letters[idx],
      };
    }).filter((mark): mark is BoardMark => mark !== null);
  }

  get allMarks(): BoardMark[] {
    const marks: BoardMark[] = [...this.bestMoveMarks];
    if (this.lastMoveMark) marks.push(this.lastMoveMark);
    return marks;
  }

  get canPlayMove(): boolean {
    return this.currentPosition === this.moves.length && !this.isWaitingForBot;
  }

  get shouldShowHover(): boolean {
    return this.canPlayMove;
  }

  get isGameOver(): boolean {
    return this.moves.length > 1 &&
           this.moves[this.moves.length - 1].mv === 'pass' &&
           this.moves[this.moves.length - 2].mv === 'pass';
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

  setBestMoves = (moves: KataGoMove[]): void => {
    this.bestMoves = moves;
  };

  toggleBestMovesOnBoard = (): void => {
    this.showBestMovesOnBoard = !this.showBestMovesOnBoard;
    if (!this.showBestMovesOnBoard) {
      this.bestMoves = [];
    }
  };

  setWaitingForBot = (waiting: boolean): void => {
    this.isWaitingForBot = waiting;
  };

  setSelfPlaying = (playing: boolean): void => {
    this.isSelfPlaying = playing;
  };

  clearBestMoves = (): void => {
    this.bestMoves = [];
    this.showBestMovesOnBoard = false;
  };

  // Business logic methods
  makeMove = (move: Move): void => {
    this.addMove(move);
    this.clearBestMoves();
  };

  makePass = (): Move => {
    const passMove: Move = {
      mv: 'pass',
      agent: 'human',
    };
    this.makeMove(passMove);
    return passMove;
  };

  handleBotMoveResponse = (response: any): void => {
    const botMove: Move = {
      mv: response.bot_move,
      p: response.diagnostics.winprob,
      score: response.diagnostics.score,
      agent: 'bot',
      data: response.diagnostics,
    };
    this.makeMove(botMove);
    this.setBestMoves(response.diagnostics.best_ten);
  };

  shouldRequestBotMove = (): boolean => {
    return !this.settings.disable_ai && this.canPlayMove && !this.isWaitingForBot;
  };

  checkSelfPlayStop = (): boolean => {
    if (this.isGameOver) {
      console.log('Self-play stopped: Two consecutive passes.');
      this.setSelfPlaying(false);
      return true;
    }
    return false;
  };

  // Keyboard shortcut handlers
  handleKeyboardShortcut = (key: string, ctrlKey: boolean = false): boolean => {
    switch (key) {
      case 'ArrowLeft':
      case 'Backspace':
        if (ctrlKey) {
          this.goToMove(this.currentPosition - 10);
        } else {
          this.previousMove();
        }
        return true;
      case 'ArrowRight':
        if (ctrlKey) {
          this.goToMove(this.currentPosition + 10);
        } else {
          this.nextMove();
        }
        return true;
      case 'Home':
        this.goToStart();
        return true;
      case 'End':
        this.goToEnd();
        return true;
      case 'u':
      case 'U':
        this.removeLastMove();
        return true;
      default:
        return false;
    }
  };

  // Self-play logic
  shouldContinueSelfPlay = (): boolean => {
    return this.isSelfPlaying && !this.isWaitingForBot && !this.settings.disable_ai && !this.isGameOver;
  };

  startSelfPlay = (): void => {
    this.setSelfPlaying(true);
  };

  stopSelfPlay = (): void => {
    this.setSelfPlaying(false);
  };

  toggleSelfPlay = (): void => {
    if (this.isSelfPlaying) {
      this.stopSelfPlay();
    } else {
      this.startSelfPlay();
    }
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