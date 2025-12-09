export type Player = 'black' | 'white';
export type MoveAgent = 'human' | 'bot';
export interface Point {
    row: number;
    col: number;
}
export interface Move {
    mv: string;
    p?: number;
    score?: number;
    agent: MoveAgent;
    data?: KataGoDiagnostics;
}
export interface KataGoMove {
    move: string;
    psv: number;
}
export interface KataGoDiagnostics {
    best_ten: KataGoMove[];
    winprob: number;
    score: number;
}
export interface KataGoResponse {
    bot_move: string;
    diagnostics: KataGoDiagnostics;
}
export interface GameRecord {
    moves: Move[];
    pos: number;
    handicap: number;
    komi: number;
}
export interface GameState {
    game_hash: string;
    username: string;
    handicap: number;
    komi: number;
    game_record: GameRecord;
    ts_started: number;
    ts_latest_move: number;
    n_obs: number;
    live: boolean;
}
export interface CreateGameRequest {
    handicap: number;
    komi: number;
}
export interface CreateGameResponse {
    game_hash: string;
}
export interface SelectMoveRequest {
    board_size: number;
    moves: string[];
    komi?: number;
    handicap?: number;
}
export interface ScoreRequest {
    board_size: number;
    moves: string[];
}
export interface ScoreResponse {
    score: number;
    winprob: number;
}
export interface UpdateGameRequest {
    game_hash: string;
    game_record: string;
    username?: string;
    live?: boolean;
}
export interface ChatMessage {
    game_hash: string;
    msg: string;
    username?: string;
    timestamp?: number;
}
export type BoardSize = 9 | 13 | 19;
export type StoneType = 'black' | 'white' | 'none';
export type MarkType = 'circle' | 'triangle' | 'square' | 'cross' | 'letter' | 'number';
export interface BoardMark {
    coord: Point;
    type: MarkType;
    value?: string;
}
export interface Settings {
    show_emoji: boolean;
    show_prob: boolean;
    show_best_moves: boolean;
    disable_ai: boolean;
    show_best_ten: boolean;
    board_rotation: 0 | 90 | 180 | 270;
    language: 'eng' | 'kor' | 'chinese' | 'japanese';
}
