import type { Move } from '../types/game';
interface SgfMetadata {
    pb?: string;
    pw?: string;
    re?: string;
    km?: string;
    dt?: string;
}
interface ParsedSgf {
    moves: string[];
    probs: string[];
    scores: string[];
    pb: string;
    pw: string;
    winner: string;
    komi: number;
    RE: string;
    DT: string;
}
/**
 * Convert game moves to SGF format
 */
export declare function moves2sgf(moves: Move[], metadata?: SgfMetadata): string;
/**
 * Download SGF as file
 */
export declare function downloadSgf(filename: string, sgf: string): void;
/**
 * Parse SGF string to move list
 */
export declare function sgf2list(sgf: string): ParsedSgf;
/**
 * Read file as text
 */
export declare function readFileAsText(file: File): Promise<string>;
export {};
