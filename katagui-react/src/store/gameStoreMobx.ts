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

  // Bad moves tracking
  badMovesThreshold: number = 3.0; // moves with badness > this are considered bad
  loadedBadMoves: Array<{moveNumber: number, move: Move, badness: number}> = []; // For loaded SGF files

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
      badMovesThreshold: observable,
      loadedBadMoves: observable,

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
      scoreString: computed,
      moveEmoji: computed,
      moveBadness: computed,
      badMoves: computed,

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
      updateLastMoveAnalysis: action,
      setBadMovesThreshold: action,
      setLoadedBadMoves: action,
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

  get scoreString(): string {
    const currentMove = this.currentMove;
    if (!currentMove || !currentMove.p || !currentMove.score) {
      return '';
    }

    let p = Number(currentMove.p);
    let score = Number(currentMove.score);

    // Score formatting logic from original katagui
    if (this.komi === Math.floor(this.komi)) { // whole number komi
      score = Math.round(score); // 2.1 -> 2.0,  2.9 -> 3.0
    } else { // x.5 komi
      score = Math.sign(score) * (Math.floor(Math.abs(score)) + 0.5); // 2.1 -> 2.5 2.9 -> 2.5
    }

    let scoreStr = 'B+';
    if (score < 0) {
      scoreStr = 'W+';
    }
    scoreStr += Math.abs(score);

    let result = `P(B wins): ${p.toFixed(2)}`;
    if (typeof score !== 'undefined') {
      result += `  ${scoreStr}`;
    }
    if (p === 0 && score === 0) {
      result = '';
    }
    return result;
  }

  get moveEmoji(): string {
    if (!this.settings.show_emoji || this.settings.disable_ai) {
      return '';
    }

    const badness = this.moveBadness;
    if (badness === null) {
      return '';
    }

    return this.getEmojiForBadness(badness);
  }

  get moveBadness(): number | null {
    const logit = (p: number): number => {
      // clamp to avoid infinities
      const pc = Math.min(0.999999, Math.max(0.000001, p));
      return Math.log(pc / (1 - pc));
    };

    if (this.currentPosition <= 1 || !this.moves[this.currentPosition - 1] || !this.moves[this.currentPosition - 2]) {
      return null;
    }

    const current = this.moves[this.currentPosition - 1];
    const previous = this.moves[this.currentPosition - 2];

    if (current.mv === 'pass' || previous.mv === 'pass') {
      return null;
    }

    const currentP = Number(current.p);
    const previousP = Number(previous.p);
    
    if (currentP === 0 || previousP === 0) {
      return null; // no prob, no delta
    }

    let currentScore = Number(current.score || 0);
    let previousScore = Number(previous.score || 0);
    let p = currentP;
    let pp = previousP;

    // Check if we are white (odd position means white played)
    if ((this.currentPosition - 1) % 2) { // we are white
      p = 1.0 - p; 
      pp = 1.0 - pp; // flip probabilities
      currentScore = -1 * currentScore; 
      previousScore = -1 * previousScore; // flip scores
    }

    const PL = Math.max(0, previousScore - currentScore); // points lost
    const dL = logit(p) - logit(pp); // log-odds change
    const LL = Math.max(0, -dL);
    const EQP = LL / 0.12; // ~points from log-odds
    const w = 1.0;
    const S = PL + w * EQP;
    return S;
  }

  get badMoves(): Array<{moveNumber: number, move: Move, badness: number}> {
    // If we have loaded bad moves (from SGF), use those instead of calculating
    if (this.loadedBadMoves.length > 0) {
      return this.loadedBadMoves
        .filter(badMove => badMove.badness >= this.badMovesThreshold)
        .sort((a, b) => b.badness - a.badness);
    }

    // Otherwise, calculate bad moves from current game
    const badMoves: Array<{moveNumber: number, move: Move, badness: number}> = [];
    
    for (let i = 1; i < this.moves.length; i++) { // Start from 1 since we need previous move
      const currentMove = this.moves[i];
      const previousMove = this.moves[i - 1];
      
      if (!currentMove || !previousMove) continue;
      if (currentMove.mv === 'pass' || previousMove.mv === 'pass') continue;
      if (!currentMove.p || !currentMove.score || !previousMove.p || !previousMove.score) continue;
      
      // Calculate badness for this move
      const badness = this.calculateMoveBadness(i + 1); // moveNumber is 1-based
      if (badness !== null && badness >= this.badMovesThreshold) {
        badMoves.push({
          moveNumber: i + 1, // 1-based move number
          move: currentMove,
          badness: badness
        });
      }
    }
    
    return badMoves.sort((a, b) => b.badness - a.badness); // Sort by worst first
  }

  private calculateMoveBadness(moveNumber: number): number | null {
    const logit = (p: number): number => {
      const pc = Math.min(0.999999, Math.max(0.000001, p));
      return Math.log(pc / (1 - pc));
    };

    if (moveNumber <= 1 || !this.moves[moveNumber - 1] || !this.moves[moveNumber - 2]) {
      return null;
    }

    const current = this.moves[moveNumber - 1];
    const previous = this.moves[moveNumber - 2];

    if (current.mv === 'pass' || previous.mv === 'pass') {
      return null;
    }

    const currentP = Number(current.p);
    const previousP = Number(previous.p);
    
    if (currentP === 0 || previousP === 0) {
      return null;
    }

    let currentScore = Number(current.score || 0);
    let previousScore = Number(previous.score || 0);
    let p = currentP;
    let pp = previousP;

    // Check if we are white (odd position means white played)
    if ((moveNumber - 1) % 2) { // we are white
      p = 1.0 - p; 
      pp = 1.0 - pp; // flip probabilities
      currentScore = -1 * currentScore; 
      previousScore = -1 * previousScore; // flip scores
    }

    const PL = Math.max(0, previousScore - currentScore); // points lost
    const dL = logit(p) - logit(pp); // log-odds change
    const LL = Math.max(0, -dL);
    const EQP = LL / 0.12; // ~points from log-odds
    const w = 1.0;
    const S = PL + w * EQP;
    return S;
  }

  private getEmojiForBadness(badness: number): string {
    const MOVE_EMOJI = ['😍', '😐', '😓', '😡'];
    const POINT_BINS = [2.0, 4.0, 8.0];
    
    let idx = MOVE_EMOJI.length - 1; // Default to worst emoji
    for (let i = 0; i < POINT_BINS.length; i++) {
      if (badness < POINT_BINS[i]) {
        idx = i;
        break;
      }
    }
    return MOVE_EMOJI[idx];
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
    this.loadedBadMoves = []; // Clear loaded bad moves for new game
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

  updateLastMoveAnalysis = (winprob: number, score: number, data: any): void => {
    const lastMove = this.moves[this.moves.length - 1];
    if (lastMove) {
      lastMove.p = winprob;
      lastMove.score = score;
      lastMove.data = data;
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

  setBadMovesThreshold = (threshold: number): void => {
    this.badMovesThreshold = threshold;
  };

  setLoadedBadMoves = (badMoves: Array<{moveNumber: number, move: Move, badness: number}>): void => {
    this.loadedBadMoves = badMoves;
  };

  // Method to create AI analysis data for saving
  createAiAnalysisData = (): import('../services/sgf').AiAnalysisData => {
    const badMoves = this.badMoves.map(badMove => {
      // Determine player based on move number (accounting for handicap)
      let player: 'B' | 'W';
      if (this.handicap >= 2) {
        player = badMove.moveNumber % 2 === 1 ? 'W' : 'B';
      } else {
        player = badMove.moveNumber % 2 === 1 ? 'B' : 'W';
      }

      // Determine category based on badness
      let category: 'inaccuracy' | 'mistake' | 'blunder';
      if (badMove.badness >= 8.0) {
        category = 'blunder';
      } else if (badMove.badness >= 4.0) {
        category = 'mistake';
      } else {
        category = 'inaccuracy';
      }

      return {
        moveNumber: badMove.moveNumber,
        move: badMove.move.mv,
        player,
        badness: Number(badMove.badness.toFixed(1)),
        category
      };
    });

    return {
      badMoves,
      threshold: this.badMovesThreshold,
      analysisVersion: '1.0'
    };
  };
}

// Create a singleton instance
export const gameStore = new GameStore();