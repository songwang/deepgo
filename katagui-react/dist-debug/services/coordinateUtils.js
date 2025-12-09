// Coordinate conversion utilities for Go board
// SGF coordinate system: A-T (skip I), 1-19
// A=1, B=2, C=3, ..., H=8, J=9 (skip I), K=10, ..., T=19
const SGF_LETTERS = 'ABCDEFGHJKLMNOPQRST';
/**
 * Convert SGF move notation (e.g., 'Q16') to board coordinates (0-indexed)
 */
export function sgfToPoint(sgfMove, boardSize = 19) {
    if (!sgfMove || sgfMove === 'pass' || sgfMove === 'resign') {
        return null;
    }
    const col = SGF_LETTERS.indexOf(sgfMove[0].toUpperCase());
    const row = boardSize - parseInt(sgfMove.slice(1), 10); // SGF rows are bottom-up
    if (col === -1 || isNaN(row) || row < 0 || row >= boardSize || col >= boardSize) {
        return null;
    }
    return { row, col };
}
/**
 * Convert board coordinates (0-indexed) to SGF move notation (e.g., 'Q16')
 */
export function pointToSGF(point, boardSize = 19) {
    if (!point || point.row < 0 || point.row >= boardSize || point.col < 0 || point.col >= boardSize) {
        return '';
    }
    const col = SGF_LETTERS[point.col];
    const row = boardSize - point.row;
    return `${col}${row}`;
}
/**
 * Check if a point is within board bounds
 */
export function isValidPoint(point, boardSize = 19) {
    return point.row >= 0 && point.row < boardSize && point.col >= 0 && point.col < boardSize;
}
/**
 * Get neighboring points (up, down, left, right)
 */
export function getNeighbors(point, boardSize = 19) {
    const neighbors = [];
    const deltas = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 },
    ];
    for (const delta of deltas) {
        const neighbor = { row: point.row + delta.row, col: point.col + delta.col };
        if (isValidPoint(neighbor, boardSize)) {
            neighbors.push(neighbor);
        }
    }
    return neighbors;
}
/**
 * Get all points on the board
 */
export function getAllPoints(boardSize = 19) {
    const points = [];
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            points.push({ row, col });
        }
    }
    return points;
}
/**
 * Calculate the coordinate for placing handicap stones
 */
export function getHandicapPoints(boardSize, handicap) {
    if (handicap < 2 || handicap > 9)
        return [];
    const points = [];
    const edge = boardSize >= 13 ? 3 : 2; // distance from edge
    const mid = Math.floor(boardSize / 2);
    // Standard handicap positions
    const corners = [
        { row: edge, col: edge }, // top-left
        { row: edge, col: boardSize - 1 - edge }, // top-right
        { row: boardSize - 1 - edge, col: edge }, // bottom-left
        { row: boardSize - 1 - edge, col: boardSize - 1 - edge }, // bottom-right
    ];
    const edges = [
        { row: edge, col: mid }, // top
        { row: boardSize - 1 - edge, col: mid }, // bottom
        { row: mid, col: edge }, // left
        { row: mid, col: boardSize - 1 - edge }, // right
    ];
    const center = { row: mid, col: mid };
    // Place handicap stones according to standard patterns
    if (handicap >= 2)
        points.push(corners[0], corners[3]); // 2 stones
    if (handicap >= 3)
        points.push(corners[1]); // 3 stones
    if (handicap >= 4)
        points.push(corners[2]); // 4 stones
    if (handicap >= 5 && boardSize >= 13)
        points.push(center); // 5 stones (center)
    if (handicap >= 6)
        points.push(edges[0], edges[1]); // 6 stones
    if (handicap >= 7 && boardSize >= 13) {
        if (handicap === 7)
            points.push(center);
        else
            points.push(edges[2]);
    }
    if (handicap >= 8)
        points.push(edges[3]); // 8 stones
    if (handicap === 9 && boardSize >= 13)
        points.push(center); // 9 stones
    return points.slice(0, handicap);
}
/**
 * Convert pixel coordinates to board coordinates (for click handling)
 */
export function pixelToPoint(x, y, cellSize, boardSize = 19) {
    const col = Math.round(x / cellSize);
    const row = Math.round(y / cellSize);
    const point = { row, col };
    return isValidPoint(point, boardSize) ? point : null;
}
/**
 * Convert board coordinates to pixel coordinates (center of intersection)
 */
export function pointToPixel(point, cellSize) {
    return {
        x: point.col * cellSize,
        y: point.row * cellSize,
    };
}
//# sourceMappingURL=coordinateUtils.js.map