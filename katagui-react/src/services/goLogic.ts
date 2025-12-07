// Go game logic - capture detection and liberty counting
// Based on the original katagui goboard_fast.py implementation

import type { StoneType, Point } from '../types/game';

export type BoardMap = Map<string, StoneType>;

function pointToKey(point: Point): string {
  return `${point.row},${point.col}`;
}

/**
 * Get adjacent points to a given point on the board
 */
export function getAdjacentPoints(point: Point, boardSize: number): Point[] {
  const { row, col } = point;
  const adjacent: Point[] = [];

  if (row > 0) adjacent.push({ row: row - 1, col });
  if (row < boardSize - 1) adjacent.push({ row: row + 1, col });
  if (col > 0) adjacent.push({ row, col: col - 1 });
  if (col < boardSize - 1) adjacent.push({ row, col: col + 1 });

  return adjacent;
}

/**
 * Find all stones in a connected group of the same color
 * Uses flood-fill algorithm
 */
export function getGroup(board: BoardMap, point: Point, boardSize: number): Point[] {
  const key = pointToKey(point);
  const stoneType = board.get(key);

  if (!stoneType) return [];

  const group: Point[] = [];
  const visited = new Set<string>();
  const queue: Point[] = [point];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = pointToKey(current);

    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    if (board.get(currentKey) === stoneType) {
      group.push(current);

      // Add unvisited adjacent points of same color to queue
      const adjacent = getAdjacentPoints(current, boardSize);
      for (const adj of adjacent) {
        const adjKey = pointToKey(adj);
        if (!visited.has(adjKey) && board.get(adjKey) === stoneType) {
          queue.push(adj);
        }
      }
    }
  }

  return group;
}

/**
 * Count the number of liberties (empty adjacent points) for a group
 */
export function countLiberties(board: BoardMap, group: Point[], boardSize: number): number {
  const liberties = new Set<string>();

  for (const point of group) {
    const adjacent = getAdjacentPoints(point, boardSize);
    for (const adj of adjacent) {
      const adjKey = pointToKey(adj);
      if (!board.has(adjKey)) {
        liberties.add(adjKey);
      }
    }
  }

  return liberties.size;
}

/**
 * Find and remove captured stones after a move is played
 * Returns the updated board and list of captured points
 */
export function findAndRemoveCaptures(
  board: BoardMap,
  lastMove: Point,
  currentPlayer: StoneType,
  boardSize: number
): { board: BoardMap; captured: Point[] } {
  const newBoard = new Map(board);
  const captured: Point[] = [];
  const opponentColor: StoneType = currentPlayer === 'black' ? 'white' : 'black';

  // Check all adjacent opponent groups
  const adjacent = getAdjacentPoints(lastMove, boardSize);
  const checkedGroups = new Set<string>();

  for (const adj of adjacent) {
    const adjKey = pointToKey(adj);
    const adjStone = newBoard.get(adjKey);

    // Only check opponent stones
    if (adjStone !== opponentColor) continue;

    // Skip if we already checked this group
    if (checkedGroups.has(adjKey)) continue;

    // Find the entire opponent group
    const opponentGroup = getGroup(newBoard, adj, boardSize);

    // Mark all points in this group as checked
    opponentGroup.forEach(p => checkedGroups.add(pointToKey(p)));

    // Count liberties for this group
    const liberties = countLiberties(newBoard, opponentGroup, boardSize);

    // If group has no liberties, capture it
    if (liberties === 0) {
      for (const point of opponentGroup) {
        const key = pointToKey(point);
        newBoard.delete(key);
        captured.push(point);
      }
    }
  }

  return { board: newBoard, captured };
}

/**
 * Check if a move would be self-capture (suicide)
 * Self-capture is illegal unless it also captures opponent stones
 */
export function isSelfCapture(
  board: BoardMap,
  point: Point,
  currentPlayer: StoneType,
  boardSize: number
): boolean {
  // Temporarily place the stone
  const testBoard = new Map(board);
  const key = pointToKey(point);
  testBoard.set(key, currentPlayer);

  // First check if this move captures any opponent stones
  const { captured } = findAndRemoveCaptures(testBoard, point, currentPlayer, boardSize);

  // If we capture opponent stones, it's not self-capture
  if (captured.length > 0) {
    return false;
  }

  // Now check if our own group has liberties
  const ourGroup = getGroup(testBoard, point, boardSize);
  const liberties = countLiberties(testBoard, ourGroup, boardSize);

  // Self-capture if our group has no liberties
  return liberties === 0;
}

/**
 * Apply a move to the board and handle captures
 * Returns the new board state and captured stones
 */
export function applyMove(
  board: BoardMap,
  point: Point,
  currentPlayer: StoneType,
  boardSize: number
): { board: BoardMap; captured: Point[] } | null {
  const key = pointToKey(point);

  // Can't play on occupied point
  if (board.has(key)) {
    return null;
  }

  // Check for self-capture
  if (isSelfCapture(board, point, currentPlayer, boardSize)) {
    return null;
  }

  // Place the stone
  const newBoard = new Map(board);
  newBoard.set(key, currentPlayer);

  // Find and remove captured opponent stones
  const { board: finalBoard, captured } = findAndRemoveCaptures(newBoard, point, currentPlayer, boardSize);

  return { board: finalBoard, captured };
}
