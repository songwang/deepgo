import { useState, useCallback } from 'react';
import { api } from '../services/api';
export const useKataGo = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const getMove = useCallback(async (boardSize, moves, komi = 7.5, handicap = 0, botName = 'katago_gtp_bot', isGuest = false) => {
        setIsLoading(true);
        setError(null);
        try {
            const request = {
                board_size: boardSize,
                moves,
                komi,
                handicap,
            };
            const response = await api.selectMove(botName, request, isGuest);
            return response;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get move from KataGo';
            setError(errorMessage);
            console.error('KataGo error:', err);
            return null;
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    const getScore = useCallback(async (boardSize, moves, botName = 'katago_gtp_bot') => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.getScore(botName, { board_size: boardSize, moves });
            return response;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get score from KataGo';
            setError(errorMessage);
            console.error('KataGo score error:', err);
            return null;
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    return {
        getMove,
        getScore,
        isLoading,
        error,
    };
};
//# sourceMappingURL=useKataGo.js.map