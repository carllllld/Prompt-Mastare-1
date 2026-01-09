import { useEffect, useRef, useCallback, useState } from "react";

type MessageHandler = (message: any) => void;

export function useWebSocket(userId: string | undefined, teamId: number | null, promptId: number | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        type: "auth",
        userId,
        teamId,
        promptId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const handlers = handlersRef.current.get(message.type);
        if (handlers) {
          handlers.forEach(handler => handler(message));
        }
      } catch (err) {
        console.error("[WebSocket] Error parsing message:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
    };

    wsRef.current = ws;
  }, [userId, teamId, promptId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);

    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  const updatePresence = useCallback((newTeamId: number | null, newPromptId: number | null, cursorPosition?: number) => {
    send({
      type: "presence:update",
      teamId: newTeamId,
      promptId: newPromptId,
      cursorPosition,
    });
  }, [send]);

  const lockPrompt = useCallback((promptId: number) => {
    send({ type: "prompt:lock", promptId });
  }, [send]);

  const unlockPrompt = useCallback((promptId: number) => {
    send({ type: "prompt:unlock", promptId });
  }, [send]);

  const broadcastPromptUpdate = useCallback((promptId: number, changes: any) => {
    send({ type: "prompt:update", promptId, changes });
  }, [send]);

  return {
    isConnected,
    send,
    subscribe,
    updatePresence,
    lockPrompt,
    unlockPrompt,
    broadcastPromptUpdate,
  };
}
