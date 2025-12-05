import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { KataGoResponse, SelectMoveRequest, ScoreResponse } from '../types/game';

export const useKataGo = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMove = useCallback(
    async (
      boardSize: number,
      moves: string[],
      komi: number = 7.5,
      handicap: number = 0,
      botName: string = 'katago_gtp_bot',
      isGuest: boolean = false
    ): Promise<KataGoResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const request: SelectMoveRequest = {
          board_size: boardSize,
          moves,
          komi,
          handicap,
        };

        const response = await api.selectMove(botName, request, isGuest);
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get move from KataGo';
        setError(errorMessage);
        console.error('KataGo error:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getScore = useCallback(
    async (
      boardSize: number,
      moves: string[],
      botName: string = 'katago_gtp_bot'
    ): Promise<ScoreResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.getScore(botName, { board_size: boardSize, moves });
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get score from KataGo';
        setError(errorMessage);
        console.error('KataGo score error:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    getMove,
    getScore,
    isLoading,
    error,
  };
};
