import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';
export const useWebSocket = (options = {}) => {
    const { gameHash, onMessage, onConnect, onDisconnect, enabled = true } = options;
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const connect = useCallback(() => {
        if (!enabled || !gameHash)
            return;
        try {
            // Create Socket.IO connection
            // Note: The original app uses Flask-SocketIO with a custom WebSocket endpoint
            // This is a simplified version using Socket.IO
            const socket = io(WS_BASE_URL, {
                transports: ['websocket'],
                query: { game_hash: gameHash },
            });
            socket.on('connect', () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                setError(null);
                onConnect?.();
            });
            socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);
                onDisconnect?.();
            });
            socket.on('error', (err) => {
                console.error('WebSocket error:', err);
                setError(err.message);
            });
            // Listen for game updates
            socket.on('game_update', (data) => {
                console.log('Received game update:', data);
                onMessage?.(data);
            });
            // Listen for chat messages
            socket.on('chat_message', (data) => {
                console.log('Received chat message:', data);
                onMessage?.(data);
            });
            socketRef.current = socket;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect WebSocket';
            setError(errorMessage);
            console.error('WebSocket connection error:', err);
        }
    }, [enabled, gameHash, onConnect, onDisconnect, onMessage]);
    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        }
    }, []);
    const sendMessage = useCallback((event, data) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit(event, data);
        }
        else {
            console.warn('Cannot send message: WebSocket not connected');
        }
    }, [isConnected]);
    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);
    return {
        isConnected,
        error,
        sendMessage,
        reconnect: connect,
    };
};
/**
 * Alternative implementation using native WebSocket
 * (matching the original Flask-SocketIO implementation more closely)
 */
export const useNativeWebSocket = (options = {}) => {
    const { gameHash, onMessage, onConnect, onDisconnect, enabled = true } = options;
    const wsRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const connect = useCallback(() => {
        if (!enabled || !gameHash)
            return;
        try {
            // Connect to the Flask WebSocket endpoint
            const wsUrl = `${WS_BASE_URL}/register_socket/${gameHash}`;
            const ws = new WebSocket(wsUrl);
            ws.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                setError(null);
                onConnect?.();
            };
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);
                onDisconnect?.();
            };
            ws.onerror = (event) => {
                console.error('WebSocket error:', event);
                setError('WebSocket connection error');
            };
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage?.(data);
                }
                catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };
            wsRef.current = ws;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect WebSocket';
            setError(errorMessage);
            console.error('WebSocket connection error:', err);
        }
    }, [enabled, gameHash, onConnect, onDisconnect, onMessage]);
    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
            setIsConnected(false);
        }
    }, []);
    const sendMessage = useCallback((data) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
        else {
            console.warn('Cannot send message: WebSocket not connected');
        }
    }, []);
    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);
    return {
        isConnected,
        error,
        sendMessage,
        reconnect: connect,
    };
};
//# sourceMappingURL=useWebSocket.js.map