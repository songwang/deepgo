// Game-related TypeScript types

export type Player = 'black' | 'white';

export type MoveAgent = 'human' | 'bot';

export interface Point {
  row: number; // 0-18
  col: number; // 0-18
}

export interface Move {
  mv: string; // 'Q16', 'pass', 'resign'
  p?: number; // win probability 0-1
  score?: number; // expected score (e.g., 1.5 = B+1.5)
  agent: MoveAgent;
  data?: KataGoDiagnostics;
}

export interface KataGoMove {
  move: string;
  psv: number; // probability
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
  pos: number; // current position in move history
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
  n_obs: number; // observer count
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
  game_record: string; // JSON string
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
  value?: string; // for letters/numbers
  color?: string;
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
