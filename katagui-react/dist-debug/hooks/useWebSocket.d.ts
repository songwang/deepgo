interface UseWebSocketOptions {
    gameHash?: string;
    onMessage?: (data: any) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    enabled?: boolean;
}
export declare const useWebSocket: (options?: UseWebSocketOptions) => {
    isConnected: boolean;
    error: string | null;
    sendMessage: (event: string, data: any) => void;
    reconnect: () => void;
};
/**
 * Alternative implementation using native WebSocket
 * (matching the original Flask-SocketIO implementation more closely)
 */
export declare const useNativeWebSocket: (options?: UseWebSocketOptions) => {
    isConnected: boolean;
    error: string | null;
    sendMessage: (data: any) => void;
    reconnect: () => void;
};
export {};
