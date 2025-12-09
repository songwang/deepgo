import type { CreateGameRequest, CreateGameResponse, SelectMoveRequest, KataGoResponse, ScoreRequest, ScoreResponse, UpdateGameRequest, ChatMessage, GameState } from '../types/game';
export declare class ApiError extends Error {
    status: number;
    constructor(status: number, message: string);
}
export declare const api: {
    createGame(data: CreateGameRequest): Promise<CreateGameResponse>;
    loadGame(gameHash: string): Promise<GameState>;
    updateGame(data: UpdateGameRequest): Promise<{
        result: string;
    }>;
    selectMove(botName: string, data: SelectMoveRequest, isGuest?: boolean): Promise<KataGoResponse>;
    getScore(botName: string, data: ScoreRequest): Promise<ScoreResponse>;
    sendChat(data: ChatMessage): Promise<{
        result: string;
    }>;
    parseSGF(file: File): Promise<any>;
    getSGFDownloadURL(moves: string[], probs: number[], scores: number[], pb: string, pw: string, komi: number): string;
    log(message: string): Promise<void>;
};
