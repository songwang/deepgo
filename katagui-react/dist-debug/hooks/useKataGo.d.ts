import type { KataGoResponse, ScoreResponse } from '../types/game';
export declare const useKataGo: () => {
    getMove: (boardSize: number, moves: string[], komi?: number, handicap?: number, botName?: string, isGuest?: boolean) => Promise<KataGoResponse | null>;
    getScore: (boardSize: number, moves: string[], botName?: string) => Promise<ScoreResponse | null>;
    isLoading: boolean;
    error: string | null;
};
