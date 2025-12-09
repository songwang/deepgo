// SGF (Smart Game Format) utilities
// Adapted from katagui original implementation
// SGF coordinate system: A-T (skip I)
const SGF_COORD_LETTERS = 'abcdefghijklmnopqrst';
const HUMAN_COORD_LETTERS = 'ABCDEFGHJKLMNOPQRST';
/**
 * Convert point notation to SGF coordinates
 * e.g., Q16 -> 'pd' (SGF format uses lowercase, rows from top-left)
 */
function pointToSgfCoords(move) {
    if (move === 'pass' || move === 'resign')
        return '';
    // Parse move like "Q16"
    const col = HUMAN_COORD_LETTERS.indexOf(move[0].toUpperCase());
    const row = 19 - parseInt(move.substring(1)); // Human row (1-19, bottom-up) to SGF row (0-18, top-down)
    const colChar = SGF_COORD_LETTERS[col];
    const rowChar = SGF_COORD_LETTERS[row];
    return colChar + rowChar;
}
/**
 * Convert SGF coordinates to point notation
 * e.g., 'pd' -> Q16
 */
function sgfCoordsToPoint(sgfCoords) {
    if (sgfCoords === 'tt' || sgfCoords === '')
        return 'pass';
    const col = SGF_COORD_LETTERS.indexOf(sgfCoords[0]);
    const row = SGF_COORD_LETTERS.indexOf(sgfCoords[1]);
    const colChar = HUMAN_COORD_LETTERS[col];
    const rowNum = 19 - row; // SGF row (0-18, top-down) to Human row (1-19, bottom-up)
    return colChar + rowNum;
}
/**
 * Convert game moves to SGF format
 */
export function moves2sgf(moves, metadata = {}) {
    const dt = metadata.dt || new Date().toISOString().slice(0, 10);
    const km = metadata.km || '7.5';
    let sgf = '(;FF[4]SZ[19]\n';
    sgf += 'SO[katagui.baduk.club]\n';
    sgf += `PB[${metadata.pb || 'Black'}]\n`;
    sgf += `PW[${metadata.pw || 'White'}]\n`;
    sgf += `RE[${metadata.re || ''}]\n`;
    sgf += `KM[${km}]\n`;
    sgf += `DT[${dt}]\n`;
    let movestr = '';
    let result = '';
    let color = 'B';
    for (let idx = 0; idx < moves.length; idx++) {
        const move = moves[idx];
        const othercol = color === 'B' ? 'W' : 'B';
        if (move.mv === 'resign') {
            result = `RE[${othercol}+R]`;
            break;
        }
        const sgfCoords = pointToSgfCoords(move.mv);
        movestr += `;${color}[${sgfCoords}]`;
        // Add AI analysis in comments if available
        if (move.p !== undefined && move.score !== undefined) {
            const prob = (move.p * 100).toFixed(1);
            const score = move.score.toFixed(1);
            movestr += `C[P:${prob} S:${score}]`;
        }
        color = othercol;
    }
    sgf += result;
    sgf += movestr;
    sgf += ')';
    return sgf;
}
/**
 * Download SGF as file
 */
export function downloadSgf(filename, sgf) {
    const blob = new Blob([sgf], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
/**
 * Extract value of SGF tag
 */
function getSgfTag(sgf, tag) {
    const regex = new RegExp(`${tag}\\[([^\\]]*)\\]`);
    const match = sgf.match(regex);
    return match ? match[1] : '';
}
/**
 * Parse SGF node to extract move
 */
function parseMove(node) {
    // Look for ;B[...] or ;W[...]
    const bMatch = node.match(/;B\[([^\]]*)\]/);
    if (bMatch) {
        return ['B', bMatch[1]];
    }
    const wMatch = node.match(/;W\[([^\]]*)\]/);
    if (wMatch) {
        return ['W', wMatch[1]];
    }
    return [null, ''];
}
/**
 * Extract probability and score from comment
 */
function parseComment(node) {
    const match = node.match(/C\[P:([^\s]+)\s+S:([^\]]+)\]/);
    if (match) {
        return [match[1], match[2]];
    }
    return ['0.00', '0.00'];
}
/**
 * Parse SGF string to move list
 */
export function sgf2list(sgf) {
    // Extract metadata
    const RE = getSgfTag(sgf, 'RE');
    const DT = getSgfTag(sgf, 'DT');
    const pb = getSgfTag(sgf, 'PB');
    const pw = getSgfTag(sgf, 'PW');
    const kmStr = getSgfTag(sgf, 'KM');
    const komi = parseFloat(kmStr) || 7.5;
    let winner = '';
    if (RE.toLowerCase().startsWith('w'))
        winner = 'w';
    else if (RE.toLowerCase().startsWith('b'))
        winner = 'b';
    const moves = [];
    const probs = [];
    const scores = [];
    // Split into nodes (simplified parser for main line only)
    const nodePattern = /;[BW]\[[^\]]*\](?:C\[[^\]]*\])?/g;
    const nodes = sgf.match(nodePattern) || [];
    for (const node of nodes) {
        const [color, sgfCoords] = parseMove(node);
        if (color) {
            // Check if we need to insert a pass for color mismatch
            const expectedColor = moves.length % 2 === 0 ? 'B' : 'W';
            if (color !== expectedColor) {
                moves.push('pass');
                probs.push('0.00');
                scores.push('0.00');
            }
            // Add the move
            const move = sgfCoordsToPoint(sgfCoords);
            moves.push(move);
            // Extract probability and score from comment
            const [prob, score] = parseComment(node);
            probs.push(prob);
            scores.push(score);
        }
    }
    return {
        moves,
        probs,
        scores,
        pb,
        pw,
        winner,
        komi,
        RE,
        DT,
    };
}
/**
 * Read file as text
 */
export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}
//# sourceMappingURL=sgf.js.map