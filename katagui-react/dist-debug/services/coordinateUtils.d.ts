import type { Point } from '../types/game';
/**
 * Convert SGF move notation (e.g., 'Q16') to board coordinates (0-indexed)
 */
export declare function sgfToPoint(sgfMove: string, boardSize?: number): Point | null;
/**
 * Convert board coordinates (0-indexed) to SGF move notation (e.g., 'Q16')
 */
export declare function pointToSGF(point: Point, boardSize?: number): string;
/**
 * Check if a point is within board bounds
 */
export declare function isValidPoint(point: Point, boardSize?: number): boolean;
/**
 * Get neighboring points (up, down, left, right)
 */
export declare function getNeighbors(point: Point, boardSize?: number): Point[];
/**
 * Get all points on the board
 */
export declare function getAllPoints(boardSize?: number): Point[];
/**
 * Calculate the coordinate for placing handicap stones
 */
export declare function getHandicapPoints(boardSize: number, handicap: number): Point[];
/**
 * Convert pixel coordinates to board coordinates (for click handling)
 */
export declare function pixelToPoint(x: number, y: number, cellSize: number, boardSize?: number): Point | null;
/**
 * Convert board coordinates to pixel coordinates (center of intersection)
 */
export declare function pointToPixel(point: Point, cellSize: number): {
    x: number;
    y: number;
};
