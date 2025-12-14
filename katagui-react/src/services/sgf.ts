// SGF (Smart Game Format) utilities
// Adapted from katagui original implementation

import type { Move } from '../types/game';

// SGF coordinate system: A-T (skip I)
const SGF_COORD_LETTERS = 'abcdefghijklmnopqrst';
const HUMAN_COORD_LETTERS = 'ABCDEFGHJKLMNOPQRST';

export interface BadMoveData {
  moveNumber: number;
  move: string;
  player: 'B' | 'W';
  badness: number;
  pointLoss?: number;
  winProbLoss?: number;
  category: 'inaccuracy' | 'mistake' | 'blunder';
}

export interface AiAnalysisData {
  badMoves: BadMoveData[];
  threshold: number;
  analysisVersion: string;
}

export interface SgfMetadata {
  pb?: string; // Black player
  pw?: string; // White player
  re?: string; // Result
  km?: string; // Komi
  dt?: string; // Date
  aiAnalysis?: AiAnalysisData; // Bad moves and other AI analysis
}

interface ParsedSgf {
  moves: string[];
  probs: string[];
  scores: string[];
  comments: string[];
  pb: string;
  pw: string;
  winner: string;
  komi: number;
  RE: string;
  DT: string;
  aiAnalysis?: AiAnalysisData;
}

/**
 * Convert point notation to SGF coordinates
 * e.g., Q16 -> 'pd' (SGF format uses lowercase, rows from top-left)
 */
function pointToSgfCoords(move: string): string {
  if (move === 'pass' || move === 'resign') return '';

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
function sgfCoordsToPoint(sgfCoords: string): string {
  if (sgfCoords === 'tt' || sgfCoords === '') return 'pass';

  const col = SGF_COORD_LETTERS.indexOf(sgfCoords[0]);
  const row = SGF_COORD_LETTERS.indexOf(sgfCoords[1]);

  const colChar = HUMAN_COORD_LETTERS[col];
  const rowNum = 19 - row; // SGF row (0-18, top-down) to Human row (1-19, bottom-up)

  return colChar + rowNum;
}

/**
 * Convert game moves to SGF format
 */
export function moves2sgf(
  moves: Move[],
  metadata: SgfMetadata = {}
): string {
  const dt = metadata.dt || new Date().toISOString().slice(0, 10);
  const km = metadata.km || '7.5';

  let sgf = '(;FF[4]SZ[19]\n';
  sgf += 'SO[katagui.baduk.club]\n';
  sgf += `PB[${metadata.pb || 'Black'}]\n`;
  sgf += `PW[${metadata.pw || 'White'}]\n`;
  sgf += `RE[${metadata.re || ''}]\n`;
  sgf += `KM[${km}]\n`;
  sgf += `DT[${dt}]\n`;

  // Add AI analysis data if available
  if (metadata.aiAnalysis && metadata.aiAnalysis.badMoves.length > 0) {
    const analysisJson = JSON.stringify(metadata.aiAnalysis);
    const escapedAnalysis = analysisJson.replace(/]/g, '\\]').replace(/\[/g, '\\[');
    sgf += `C[AI_ANALYSIS:${escapedAnalysis}]\n`;
  }

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

    // Add comment if it exists
    if (move.comment) {
      const escapedComment = move.comment.replace(/]/g, '\\]');
      movestr += `C[${escapedComment}]`;
    }

    // Add AI analysis in comments if available and there's no general comment
    if (move.p !== undefined && move.score !== undefined && !move.comment) {
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
export function downloadSgf(filename: string, sgf: string): void {
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
function getSgfTag(sgf: string, tag: string): string {
  const regex = new RegExp(`${tag}\\[([^\\]]*)\\]`);
  const match = sgf.match(regex);
  return match ? match[1] : '';
}

/**
 * Parse SGF node to extract move
 */
function parseMove(node: string): [string | null, string] {
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
function parseProbScoreComment(node: string): [string, string] {
  const match = node.match(/C\[P:([^\s]+)\s+S:([^\]]+)\]/);
  if (match) {
    return [match[1], match[2]];
  }
  return ['0.00', '0.00'];
}

/**
 * Extract a general comment from a node, ignoring special formats.
 */
function parseGeneralComment(node: string): string {
  const cMatch = node.match(/C\[([^\]]*)\]/);
  if (cMatch) {
    const comment = cMatch[1];
    // Ignore special formats used for other data
    if (!comment.startsWith('P:') && !comment.startsWith('AI_ANALYSIS:')) {
      return comment.replace(/\\\]/g, ']'); // Unescape closing brackets
    }
  }
  return '';
}


/**
 * Extract AI analysis from SGF comment
 */
function extractAiAnalysis(sgf: string): AiAnalysisData | undefined {
  // Look for AI_ANALYSIS comment in the header
  const match = sgf.match(/C\[AI_ANALYSIS:([^\]]+)\]/);
  if (!match) return undefined;

  try {
    // Unescape the brackets
    const escapedJson = match[1];
    const jsonStr = escapedJson.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
    const analysisData = JSON.parse(jsonStr);
    
    return analysisData as AiAnalysisData;
  } catch (e) {
    console.warn('Failed to parse AI analysis data:', e);
    return undefined;
  }
}

/**
 * Parse SGF string to move list
 */
export function sgf2list(sgf: string): ParsedSgf {
  // Extract metadata
  const RE = getSgfTag(sgf, 'RE');
  const DT = getSgfTag(sgf, 'DT');
  const pb = getSgfTag(sgf, 'PB');
  const pw = getSgfTag(sgf, 'PW');
  const kmStr = getSgfTag(sgf, 'KM');
  const komi = parseFloat(kmStr) || 7.5;

  // Extract AI analysis
  const aiAnalysis = extractAiAnalysis(sgf);

  let winner = '';
  if (RE.toLowerCase().startsWith('w')) winner = 'w';
  else if (RE.toLowerCase().startsWith('b')) winner = 'b';

  const moves: string[] = [];
  const probs: string[] = [];
  const scores: string[] = [];
  const comments: string[] = [];

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
        comments.push('');
      }

      // Add the move
      const move = sgfCoordsToPoint(sgfCoords);
      moves.push(move);

      // Extract probability and score from comment
      const [prob, score] = parseProbScoreComment(node);
      probs.push(prob);
      scores.push(score);

      // Extract general comment
      const comment = parseGeneralComment(node);
      comments.push(comment);
    }
  }

  return {
    moves,
    probs,
    scores,
    comments,
    pb,
    pw,
    winner,
    komi,
    RE,
    DT,
    aiAnalysis,
  };
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}
