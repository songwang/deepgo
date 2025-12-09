import { makeObservable, observable, computed, action } from 'mobx';
import { getHandicapPoints, sgfToPoint } from '../services/coordinateUtils';
import { applyMove } from '../services/goLogic';
const DEFAULT_SETTINGS = {
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
    gameHash = '';
    boardSize = 19;
    handicap = 0;
    komi = 7.5;
    moves = [];
    currentPosition = 0;
    // UI state
    settings = DEFAULT_SETTINGS;
    isLoading = false;
    error = null;
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
    get nextPlayer() {
        if (this.handicap >= 2) {
            // If handicap, white plays first
            return this.currentPosition % 2 === 0 ? 'white' : 'black';
        }
        else {
            return this.currentPosition % 2 === 0 ? 'black' : 'white';
        }
    }
    get boardState() {
        const board = new Map();
        // Place handicap stones
        if (this.handicap >= 2) {
            const handicapPoints = getHandicapPoints(this.boardSize, this.handicap);
            handicapPoints.forEach((point) => {
                const key = `${point.row},${point.col}`;
                board.set(key, 'black');
            });
        }
        // Apply moves up to current position
        let currentPlayer = this.handicap >= 2 ? 'white' : 'black';
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
    get moveList() {
        return this.moves.slice(0, this.currentPosition).map((m) => m.mv);
    }
    get currentMove() {
        if (this.currentPosition === 0 || this.currentPosition > this.moves.length)
            return null;
        return this.moves[this.currentPosition - 1];
    }
    get lastMoveMark() {
        if (this.moves.length === 0 || this.currentPosition === 0)
            return null;
        const lastMove = this.moves[this.currentPosition - 1];
        if (!lastMove || lastMove.mv === 'pass' || lastMove.mv === 'resign')
            return null;
        const point = sgfToPoint(lastMove.mv, this.boardSize);
        if (!point)
            return null;
        return {
            coord: point,
            type: 'circle',
        };
    }
    // Actions
    setGameHash = (hash) => {
        this.gameHash = hash;
    };
    newGame = (handicap, komi, boardSize = 19) => {
        this.handicap = handicap;
        this.komi = komi;
        this.boardSize = boardSize;
        this.moves = [];
        this.currentPosition = 0;
        this.gameHash = '';
        this.error = null;
    };
    addMove = (move) => {
        // If we're in the middle of the game history, truncate future moves
        const newMoves = [...this.moves.slice(0, this.currentPosition), move];
        this.moves = newMoves;
        this.currentPosition = newMoves.length;
    };
    removeLastMove = () => {
        if (this.moves.length === 0)
            return;
        this.moves = this.moves.slice(0, -1);
        this.currentPosition = this.moves.length;
    };
    goToMove = (position) => {
        this.currentPosition = Math.max(0, Math.min(position, this.moves.length));
    };
    goToStart = () => {
        this.goToMove(0);
    };
    goToEnd = () => {
        this.goToMove(this.moves.length);
    };
    nextMove = () => {
        this.goToMove(this.currentPosition + 1);
    };
    previousMove = () => {
        this.goToMove(this.currentPosition - 1);
    };
    updateSettings = (newSettings) => {
        this.settings = { ...this.settings, ...newSettings };
    };
    setLoading = (loading) => {
        this.isLoading = loading;
    };
    setError = (error) => {
        this.error = error;
    };
    // Helper methods
    getBoardState = () => {
        return this.boardState;
    };
    getMoveList = () => {
        return this.moveList;
    };
    getCurrentMove = () => {
        return this.currentMove;
    };
    canPlayAt = (point) => {
        const key = `${point.row},${point.col}`;
        return !this.boardState.has(key);
    };
}
// Create a singleton instance
export const gameStore = new GameStore();
//# sourceMappingURL=gameStoreMobx.js.map