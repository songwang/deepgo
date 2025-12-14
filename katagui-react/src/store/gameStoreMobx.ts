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
import { GameNode } from '../types/GameNode';

// Type for the API functions that the store will use
type GetMoveFunction = (boardSize: number, moves: string[], komi: number, handicap: number) => Promise<any>;

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
  moves: Move[] = []; // Kept for backward compatibility
  currentPosition: number = 0; // Kept for backward compatibility

  // Tree structure for variations
  rootNode: GameNode;
  currentNode: GameNode;

  // Game metadata (from loaded SGF)
  playerBlack: string = '';
  playerWhite: string = '';
  gameResult: string = '';
  gameDate: string = '';
  isGameActive: boolean = false;

  // UI state
  settings: Settings = DEFAULT_SETTINGS;
  isLoading: boolean = false;
  error: string | null = null;

  // Best moves state
  bestMoves: KataGoMove[] = [];
  showBestMovesOnBoard: boolean = false;
  isWaitingForBot: boolean = false;

  // Alternative moves state (for current move, not next move)
  alternativeMoves: KataGoMove[] = [];
  showAlternativeMovesOnBoard: boolean = false;

  // Self-play state
  isSelfPlaying: boolean = false;

  // Replay state
  isReplaying: boolean = false;

  // Bad moves tracking
  badMovesThreshold: number = 3.0; // moves with badness > this are considered bad
  loadedBadMoves: Array<{moveNumber: number, move: Move, badness: number}> = []; // For loaded SGF files

  // API function reference (injected from component)
  private getMoveApi: GetMoveFunction | null = null;

  constructor() {
    // Initialize root node with a dummy move representing the starting position
    const initialMove: Move = { mv: 'root', agent: 'human' };
    this.rootNode = new GameNode(initialMove, null);
    this.currentNode = this.rootNode;

    makeObservable(this, {
      // Observable properties
      gameHash: observable,
      boardSize: observable,
      handicap: observable,
      komi: observable,
      moves: observable,
      currentPosition: observable,
      rootNode: observable,
      currentNode: observable,
      playerBlack: observable,
      playerWhite: observable,
      gameResult: observable,
      gameDate: observable,
      isGameActive: observable,
      settings: observable,
      isLoading: observable,
      error: observable,
      bestMoves: observable,
      showBestMovesOnBoard: observable,
      isWaitingForBot: observable,
      isSelfPlaying: observable,
      isReplaying: observable,
      badMovesThreshold: observable,
      loadedBadMoves: observable,
      alternativeMoves: observable,
      showAlternativeMovesOnBoard: observable,

      // Computed properties
      nextPlayer: computed,
      boardState: computed,
      moveList: computed,
      currentMove: computed,
      lastMoveMark: computed,
      bestMoveMarks: computed,
      alternativeMoveMarks: computed,
      allMarks: computed,
      canPlayMove: computed,
      shouldShowHover: computed,
      isGameOver: computed,
      scoreString: computed,
      moveEmoji: computed,
      moveBadness: computed,
      badMoves: computed,
      computedPlayerBlack: computed,
      computedPlayerWhite: computed,
      isOnMainLine: computed,
      pathToRoot: computed,

      // Actions
      setGameHash: action,
      setGameMetadata: action,
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
      setAlternativeMoves: action,
      toggleAlternativeMovesOnBoard: action,
      clearAlternativeMoves: action,
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
      shouldContinueReplay: action,
      startReplay: action,
      stopReplay: action,
      toggleReplay: action,
      updateLastMoveAnalysis: action,
      updateMoveAnalysis: action,
      setBadMovesThreshold: action,
      setLoadedBadMoves: action,
      setGetMoveApi: action,
      playHumanMove: action,
      playHumanPass: action,
      requestBotMove: action,
      returnToMainLine: action,
      navigateToNode: action,
    });
  }

  // Computed properties

  // Helper computed property: get path from root to current node
  get pathToRoot(): GameNode[] {
    const path: GameNode[] = [];
    let node: GameNode | null = this.currentNode;
    while (node !== null) {
      path.unshift(node);
      node = node.parent;
    }
    // Remove the root node (dummy 'root' move)
    if (path.length > 0 && path[0].move.mv === 'root') {
      path.shift();
    }
    return path;
  }

  get isOnMainLine(): boolean {
    // Check if current node is on the main line
    let node: GameNode | null = this.currentNode;
    while (node !== null && node.parent !== null) {
      const parent: GameNode = node.parent;
      const indexInParent = parent.children.indexOf(node);
      if (indexInParent !== parent.mainLineChildIndex) {
        return false;
      }
      node = parent;
    }
    return true;
  }

  get canReturnToMainLine(): boolean {
    // Show the back to main line button only when we're not on the main line
    return !this.isOnMainLine;
  }

  get hasNextMove(): boolean {
    // Check if there's a next move in the current path (could be main line or variation)
    return this.currentNode.children.length > 0;
  }

  get canGoToEnd(): boolean {
    // Check if we're not already at the end of the current branch
    // We can go to end if there are moves ahead in any branch
    return this.hasNextMove;
  }

  get nextPlayer(): StoneType {
    const moveCount = this.pathToRoot.length;
    if (this.handicap >= 2) {
      // If handicap, white plays first
      return moveCount % 2 === 0 ? 'white' : 'black';
    } else {
      return moveCount % 2 === 0 ? 'black' : 'white';
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

    // Apply moves from root to current node
    let currentPlayer: StoneType = this.handicap >= 2 ? 'white' : 'black';
    const path = this.pathToRoot;

    for (const node of path) {
      const move = node.move;

      if (move.mv !== 'pass' && move.mv !== 'resign' && move.mv !== 'root') {
        const point = sgfToPoint(move.mv, this.boardSize);
        if (point) {
          // Apply move with proper capture detection
          const result = applyMove(board, point, currentPlayer, this.boardSize);
          if (result) {
            // Replace board with new state that includes captures
            board.clear();
            result.board.forEach((stone, key) => board.set(key, stone));
          } else {
            // Log if a move fails to apply - this could be the source of the problem
            console.warn(`Failed to apply move ${move.mv} for ${currentPlayer} at position ${point.row},${point.col}`);
          }
        } else {
          console.warn(`Failed to convert move ${move.mv} to point coordinates`);
        }
      }

      currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    }

    return board;
  }

  get moveList(): string[] {
    return this.pathToRoot.map((node) => node.move.mv);
  }

  get currentMove(): Move | null {
    if (this.currentNode === this.rootNode) return null;
    return this.currentNode.move;
  }

  get lastMoveMark(): BoardMark | null {
    const currentMove = this.currentMove;
    if (!currentMove || currentMove.mv === 'pass' || currentMove.mv === 'resign' || currentMove.mv === 'root') return null;

    const point = sgfToPoint(currentMove.mv, this.boardSize);
    if (!point) return null;

    const moveNumber = this.pathToRoot.length;
    const isBad = this.badMoves.some(bm => bm.moveNumber === moveNumber);

    return {
      coord: point,
      type: 'circle' as const,
      color: isBad ? 'red' : undefined,
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

  get alternativeMoveMarks(): BoardMark[] {
    if (!this.showAlternativeMovesOnBoard || !this.alternativeMoves.length) return [];

    let movesToShow: KataGoMove[] = [];
    if (this.settings.show_best_ten) {
      movesToShow = this.alternativeMoves;
    } else {
      const mmax = this.alternativeMoves[0]?.psv || 0;
      if (mmax > 0) {
        movesToShow = this.alternativeMoves.filter(move => move.psv >= 0.05 * mmax);
      }
    }

    // Alternative moves should be checked against the board BEFORE the current move
    // Build board state at position - 1
    const previousBoard = new Map<string, StoneType>();

    // Place handicap stones
    if (this.handicap >= 2) {
      const handicapPoints = getHandicapPoints(this.boardSize, this.handicap);
      handicapPoints.forEach((point) => {
        const key = `${point.row},${point.col}`;
        previousBoard.set(key, 'black');
      });
    }

    // Apply moves up to position - 1
    let currentPlayer: StoneType = this.handicap >= 2 ? 'white' : 'black';
    for (let i = 0; i < this.currentPosition - 1 && i < this.moves.length; i++) {
      const move = this.moves[i];
      if (move.mv !== 'pass' && move.mv !== 'resign') {
        const point = sgfToPoint(move.mv, this.boardSize);
        if (point) {
          const key = `${point.row},${point.col}`;
          previousBoard.set(key, currentPlayer);
        }
      }
      currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    }

    const letters = 'ABCDEFGHIJ';
    return movesToShow.slice(0, 10).map((move, idx): BoardMark | null => {
      const point = sgfToPoint(move.move, this.boardSize);
      if (!point) return null;

      // Validate that the suggested move is on an empty intersection on the PREVIOUS board
      const key = `${point.row},${point.col}`;
      if (previousBoard.has(key)) {
        console.warn(`Skipping alternative move ${move.move} - intersection is occupied`);
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
    const marks: BoardMark[] = [...this.bestMoveMarks, ...this.alternativeMoveMarks];
    if (this.lastMoveMark) marks.push(this.lastMoveMark);
    return marks;
  }

  get canPlayMove(): boolean {
    // Allow moves at any position (to support variations)
    return !this.isWaitingForBot && !this.isSelfPlaying && !this.isReplaying;
  }

  get canRemoveMove(): boolean {
    // Allow removing moves at any position (to support forking)
    return this.currentNode.parent !== null;
  }

  get shouldShowHover(): boolean {
    return this.canPlayMove;
  }

  get isGameOver(): boolean {
    return this.moves.length > 1 &&
           this.moves[this.moves.length - 1].mv === 'pass' &&
           this.moves[this.moves.length - 2].mv === 'pass';
  }

  get computedPlayerBlack(): string {
    if (this.playerBlack) return this.playerBlack;
    if (this.isSelfPlaying) return 'Bot';
    if (this.settings.disable_ai) return 'Human';
    
    // Human vs Bot
    return this.handicap >= 2 ? 'Bot' : 'Human';
  }

  get computedPlayerWhite(): string {
    if (this.playerWhite) return this.playerWhite;
    if (this.isSelfPlaying) return 'Bot';
    if (this.settings.disable_ai) return 'Human';

    // Human vs Bot
    return this.handicap >= 2 ? 'Human' : 'Bot';
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

    // Show emoji for the most recent human move up to current position
    // This way, emoji persists even when viewing bot's response
    for (let i = this.currentPosition - 1; i >= 0; i--) {
      const move = this.moves[i];
      if (move && move.agent === 'human') {
        // Calculate badness for this human move
        const badness = this.calculateMoveBadness(i + 1); // moveNumber is 1-based
        if (badness !== null) {
          return this.getEmojiForBadness(badness);
        }
        break; // Only check the most recent human move
      }
    }

    return '';
  }

  get moveBadness(): number | null {
    // Use exact original katagui logic
    const logit = (p: number): number => {
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

    // Only calculate badness for human moves, not bot moves
    if (current.agent !== 'human') {
      return null;
    }

    // Original validation logic
    const p = current.p;
    const pp = previous.p;
    if ((typeof p === 'string' && p === '0.00') || (typeof pp === 'string' && pp === '0.00') || !p || !pp) {
      return null; // no prob, no delta
    }

    const s = current.score;
    const ps = previous.score;

    let pNum = typeof p === 'string' ? Number(p) : p;
    let ppNum = typeof pp === 'string' ? Number(pp) : pp;
    let sNum = typeof s === 'string' ? Number(s) : s;
    let psNum = typeof ps === 'string' ? Number(ps) : ps;

    // Check if values exist (are not NaN or undefined)
    if (pNum == null || isNaN(pNum) || ppNum == null || isNaN(ppNum) || sNum == null || isNaN(sNum) || psNum == null || isNaN(psNum)) {
      return null;
    }

    // Check if we are white
    const moveIndex = this.currentPosition - 1;
    let isWhite = moveIndex % 2 === 1;
    if (this.handicap >= 2) {
      isWhite = !isWhite;
    }
    if (isWhite) { // we are white
      pNum = 1.0 - pNum;
      ppNum = 1.0 - ppNum; // flip probabilities
      sNum = -1 * sNum;
      psNum = -1 * psNum; // flip scores
    }

    const PL = Math.max(0, psNum - sNum); // points lost
    const dL = logit(pNum) - logit(ppNum); // log-odds change
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
      
      // Only calculate badness for HUMAN moves, not bot moves
      if (currentMove.agent !== 'human') continue;
      
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
    // Use exact original katagui logic
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

    // Original validation logic
    const p = current.p;
    const pp = previous.p;
    if ((typeof p === 'string' && p === '0.00') || (typeof pp === 'string' && pp === '0.00') || !p || !pp) {
      return null; // no prob, no delta
    }

    const s = current.score;
    const ps = previous.score;

    let pNum = typeof p === 'string' ? Number(p) : p;
    let ppNum = typeof pp === 'string' ? Number(pp) : pp;
    let sNum = typeof s === 'string' ? Number(s) : s;
    let psNum = typeof ps === 'string' ? Number(ps) : ps;

    // Check if values exist (are not NaN or undefined)
    if (pNum == null || isNaN(pNum) || ppNum == null || isNaN(ppNum) || sNum == null || isNaN(sNum) || psNum == null || isNaN(psNum)) {
      return null;
    }

    // Check if we are white
    const moveIndex = moveNumber - 1;
    let isWhite = moveIndex % 2 === 1;
    if (this.handicap >= 2) {
      isWhite = !isWhite;
    }
    if (isWhite) { // we are white
      pNum = 1.0 - pNum;
      ppNum = 1.0 - ppNum; // flip probabilities
      sNum = -1 * sNum;
      psNum = -1 * psNum; // flip scores
    }

    const PL = Math.max(0, psNum - sNum); // points lost
    const dL = logit(pNum) - logit(ppNum); // log-odds change
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

  setGameMetadata = (pb: string, pw: string, result: string, date: string): void => {
    this.playerBlack = pb;
    this.playerWhite = pw;
    this.gameResult = result;
    this.gameDate = date;
    this.isGameActive = true;
  };

  newGame = (handicap: number, komi: number, boardSize: BoardSize = 19): void => {
    this.handicap = handicap;
    this.komi = komi;
    this.boardSize = boardSize;
    this.moves = [];
    this.currentPosition = 0;

    // Reset tree structure
    const initialMove: Move = { mv: 'root', agent: 'human' };
    this.rootNode = new GameNode(initialMove, null);
    this.currentNode = this.rootNode;

    this.gameHash = '';
    this.playerBlack = ''; // Clear game metadata
    this.playerWhite = '';
    this.gameResult = '';
    this.gameDate = '';
    this.error = null;
    this.loadedBadMoves = []; // Clear loaded bad moves for new game
    this.clearBestMoves(); // Clear best move labels
    this.clearAlternativeMoves(); // Clear alternative move labels
    this.stopSelfPlay(); // Stop self-play if running
    this.stopReplay(); // Stop replay if running
    this.isGameActive = true;
  };

  addMove = (move: Move): void => {
    // Check if a child with this move already exists
    const existingChild = this.currentNode.children.find(child => child.move.mv === move.mv);

    if (existingChild) {
      // Navigate to existing variation
      this.currentNode = existingChild;
    } else {
      // Remember the original number of children to detect if we're creating a variation
      const originalChildrenCount = this.currentNode.children.length;

      // Create new move as a child of current node
      const newNode = this.currentNode.addChild(move);

      // If the parent node had existing children, we're creating a new variation
      // In this case, we should NOT change which child is the main line
      if (originalChildrenCount > 0) {
        // Creating a variation - preserve the existing main line
        console.log('Created variation at move', this.pathToRoot.length);
      }
      // If the parent node had no children before, the new child becomes the main line
      // (This happens automatically since it's the first child at index 0,
      // and mainLineChildIndex defaults to 0 in GameNode constructor)

      this.currentNode = newNode;
    }

    // Update backward compatibility properties
    this.syncMovesArrayFromTree();
    this.currentPosition = this.pathToRoot.length;

    // Clear marks when adding a move
    this.clearBestMoves();
    this.clearAlternativeMoves();
  };

  // Helper method to sync the moves array from the tree (for backward compatibility)
  private syncMovesArrayFromTree = (): void => {
    this.moves = this.pathToRoot.map(node => node.move);
  };

  removeLastMove = (): void => {
    // Navigate to parent if not at root
    if (this.currentNode.parent) {
      this.currentNode = this.currentNode.parent;

      // Update backward compatibility properties
      this.syncMovesArrayFromTree();
      this.currentPosition = this.pathToRoot.length;
    }

    // Clear marks when removing a move
    this.clearBestMoves();
    this.clearAlternativeMoves();
  };

  navigateToNode = (targetNode: GameNode): void => {
    this.currentNode = targetNode;
    this.syncMovesArrayFromTree();
    this.currentPosition = this.pathToRoot.length;
    this.clearBestMoves();
    this.clearAlternativeMoves();
  };

  goToMove = (position: number): void => {
    // If we're already at the target position, do nothing
    if (position === this.currentPosition) {
      return;
    }

    if (position <= 0) {
      // Go to start
      this.navigateToNode(this.rootNode);
      return;
    }

    // Navigate back or forward depending on target position
    if (position < this.currentPosition) {
      // Going backward - move up the tree by the required number of steps
      let node = this.currentNode;
      let steps = this.currentPosition - position;
      while (steps > 0 && node.parent) {
        node = node.parent;
        steps--;
      }
      this.navigateToNode(node);
    } else {
      // Going forward - follow the main line if possible
      let node = this.currentNode;
      let steps = position - this.currentPosition;
      let currentPos = this.currentPosition;

      while (steps > 0 && node.mainLineChild) {
        node = node.mainLineChild;
        steps--;
        currentPos++;
      }

      this.navigateToNode(node);
    }
  };

  goToStart = (): void => {
    this.navigateToNode(this.rootNode);
  };

  goToEnd = (): void => {
    // Navigate to the end of the current branch (not necessarily main line)
    let node: GameNode = this.currentNode;
    while (node.children.length > 0) {
      // Follow the main line child if available, otherwise take the first child
      let nextChild = node.mainLineChild || node.children[0];
      if (nextChild) {
        node = nextChild;
      } else {
        break;
      }
    }
    this.navigateToNode(node);
  };

  nextMove = (): void => {
    // Move to next child on main line
    const mainChild = this.currentNode.mainLineChild;
    if (mainChild) {
      this.navigateToNode(mainChild);
    }
  };

  previousMove = (): void => {
    // Move to parent
    if (this.currentNode.parent) {
      this.navigateToNode(this.currentNode.parent);
    }
  };


  returnToMainLine = (): void => {
    // Navigate back to the main line of the game
    // Find the forking point (where main line and current variation diverged)

    // If we're already on the main line, do nothing
    if (this.isOnMainLine) {
      return;
    }

    // Walk up the tree from current node to find the forking point
    // The forking point is where the main line and this variation diverged
    let forkNode: GameNode | null = null;
    let node: GameNode = this.currentNode;

    while (node.parent !== null) {
      const parent = node.parent;
      const childIndex = parent.children.indexOf(node);
      const mainLineChildIndex = parent.mainLineChildIndex;

      // If this child is the main line child, then we're still on main line when going up
      if (childIndex === mainLineChildIndex) {
        // Continue up the tree
        node = parent;
      } else {
        // This is the forking point - where the variation started
        // The parent node is where the main line and variation diverge
        forkNode = parent;
        break;
      }
    }

    // Now navigate to the main line at the forking point
    if (forkNode) {
      const mainLineChild = forkNode.mainLineChild;
      if (mainLineChild) {
        this.navigateToNode(mainLineChild);
      }
    }
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

  setAlternativeMoves = (moves: KataGoMove[]): void => {
    this.alternativeMoves = moves;
  };

  toggleAlternativeMovesOnBoard = (): void => {
    this.showAlternativeMovesOnBoard = !this.showAlternativeMovesOnBoard;
    if (!this.showAlternativeMovesOnBoard) {
      this.alternativeMoves = [];
    }
  };

  clearAlternativeMoves = (): void => {
    this.alternativeMoves = [];
    this.showAlternativeMovesOnBoard = false;
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
    // Note: clearBestMoves and clearAlternativeMoves are already called in addMove
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
    // Update the previous (human) move's analysis with the bot response diagnostics
    this.updateLastMoveAnalysis(
      response.diagnostics.winprob,
      response.diagnostics.score,
      response.diagnostics
    );

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
    return this.isSelfPlaying && !this.isWaitingForBot && !this.isGameOver;
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

  // Replay logic
  shouldContinueReplay = (): boolean => {
    return this.isReplaying && this.currentPosition < this.moves.length;
  };

  startReplay = (): void => {
    this.isReplaying = true;
  };

  stopReplay = (): void => {
    this.isReplaying = false;
  };

  toggleReplay = (): void => {
    if (this.isReplaying) {
      this.stopReplay();
    } else {
      this.startReplay();
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

  updateMoveAnalysis = (position: number, winprob: number, score: number, data: any): void => {
    const move = this.moves[position - 1];
    if (move) {
      move.p = winprob;
      move.score = score;
      move.data = data;
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

  // Set the API function (dependency injection)
  setGetMoveApi = (getMoveApi: GetMoveFunction): void => {
    this.getMoveApi = getMoveApi;
  };

  // Play a human move with automatic analysis and bot response
  playHumanMove = async (move: Move): Promise<void> => {
    // Add the move
    this.makeMove(move);

    const willRequestBotMove = this.shouldRequestBotMove();

    // Set waiting state immediately if bot will respond
    if (willRequestBotMove) {
      this.isWaitingForBot = true;
      // Request bot move - the bot response will include analysis for the human move
      this.requestBotMove();
    } else if (!this.settings.disable_ai && this.getMoveApi) {
      // Bot won't respond, but we still need analysis for the human move
      try {
        const moveList = this.getMoveList();
        const response = await this.getMoveApi(this.boardSize, moveList, this.komi, this.handicap);
        if (response && response.diagnostics) {
          this.updateLastMoveAnalysis(
            response.diagnostics.winprob,
            response.diagnostics.score,
            response.diagnostics
          );
        }
      } catch (err) {
        console.warn('Failed to get analysis for human move:', err);
      }
    }
  };

  // Play a human pass move
  playHumanPass = async (): Promise<void> => {
    const passMove: Move = {
      mv: 'pass',
      agent: 'human',
    };
    await this.playHumanMove(passMove);
  };

  // Request bot move (can be called from playHumanMove or externally)
  requestBotMove = async (): Promise<void> => {
    if (!this.getMoveApi) {
      console.warn('getMoveApi not set');
      return;
    }

    // Set waiting state (safe to call even if already true)
    this.isWaitingForBot = true;
    this.clearBestMoves();

    try {
      const moveList = this.getMoveList();
      const response = await this.getMoveApi(this.boardSize, moveList, this.komi, this.handicap);

      if (response) {
        this.handleBotMoveResponse(response);
      }
    } catch (err) {
      console.error('Bot move failed:', err);
      this.setError(err instanceof Error ? err.message : 'Bot move failed');
    } finally {
      this.isWaitingForBot = false;
    }
  };
}

// Create a singleton instance
export const gameStore = new GameStore();