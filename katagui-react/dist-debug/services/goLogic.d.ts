import type { StoneType, Point } from '../types/game';
export type BoardMap = Map<string, StoneType>;
/**
 * Get adjacent points to a given point on the board
 */
export declare function getAdjacentPoints(point: Point, boardSize: number): Point[];
/**
 * Find all stones in a connected group of the same color
 * Uses flood-fill algorithm
 */
export declare function getGroup(board: BoardMap, point: Point, boardSize: number): Point[];
/**
 * Count the number of liberties (empty adjacent points) for a group
 */
export declare function countLiberties(board: BoardMap, group: Point[], boardSize: number): number;
/**
 * Find and remove captured stones after a move is played
 * Returns the updated board and list of captured points
 */
export declare function findAndRemoveCaptures(board: BoardMap, lastMove: Point, currentPlayer: StoneType, boardSize: number): {
    board: BoardMap;
    captured: Point[];
};
/**
 * Check if a move would be self-capture (suicide)
 * Self-capture is illegal unless it also captures opponent stones
 */
export declare function isSelfCapture(board: BoardMap, point: Point, currentPlayer: StoneType, boardSize: number): boolean;
/**
 * Apply a move to the board and handle captures
 * Returns the new board state and captured stones
 */
export declare function applyMove(board: BoardMap, point: Point, currentPlayer: StoneType, boardSize: number): {
    board: BoardMap;
    captured: Point[];
} | null;
