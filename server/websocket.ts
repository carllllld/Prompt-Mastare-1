import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { storage } from "./storage";

interface Client {
  ws: WebSocket;
  userId: string;
  teamId?: number;
  promptId?: number;
}

const clients = new Map<WebSocket, Client>();

export function setupWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    console.log("[WebSocket] New connection");

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (err) {
        console.error("[WebSocket] Error handling message:", err);
      }
    });

    ws.on("close", () => {
      const client = clients.get(ws);
      if (client) {
        broadcastToTeam(client.teamId, {
          type: "presence:leave",
          userId: client.userId,
        }, ws);
        clients.delete(ws);
      }
      console.log("[WebSocket] Connection closed");
    });

    ws.on("error", (error) => {
      console.error("[WebSocket] Error:", error);
      clients.delete(ws);
    });
  });

  setInterval(() => {
    storage.cleanupStalePresence().catch(console.error);
  }, 5 * 60 * 1000);

  console.log("[WebSocket] Server initialized");
  return wss;
}

async function handleMessage(ws: WebSocket, message: any) {
  const { type, ...payload } = message;

  switch (type) {
    case "auth": {
      const { userId, teamId, promptId } = payload;
      clients.set(ws, { ws, userId, teamId, promptId });
      
      if (teamId) {
        await storage.updatePresence(userId, teamId, promptId || null);
        
        broadcastToTeam(teamId, {
          type: "presence:join",
          userId,
          promptId,
        }, ws);
      }
      
      ws.send(JSON.stringify({ type: "auth:success" }));
      break;
    }

    case "presence:update": {
      const client = clients.get(ws);
      if (!client) return;
      
      const { teamId, promptId, cursorPosition } = payload;
      client.teamId = teamId;
      client.promptId = promptId;
      
      await storage.updatePresence(client.userId, teamId, promptId, cursorPosition);
      
      broadcastToTeam(teamId, {
        type: "presence:update",
        userId: client.userId,
        promptId,
        cursorPosition,
      }, ws);
      break;
    }

    case "prompt:lock": {
      const client = clients.get(ws);
      if (!client) return;
      
      const { promptId } = payload;
      const prompt = await storage.lockPrompt(promptId, client.userId);
      
      if (prompt) {
        broadcastToPrompt(promptId, {
          type: "prompt:locked",
          promptId,
          lockedBy: client.userId,
        });
      }
      break;
    }

    case "prompt:unlock": {
      const client = clients.get(ws);
      if (!client) return;
      
      const { promptId } = payload;
      await storage.unlockPrompt(promptId);
      
      broadcastToPrompt(promptId, {
        type: "prompt:unlocked",
        promptId,
      });
      break;
    }

    case "prompt:update": {
      const client = clients.get(ws);
      if (!client) return;
      
      const { promptId, changes } = payload;
      
      broadcastToPrompt(promptId, {
        type: "prompt:updated",
        promptId,
        changes,
        updatedBy: client.userId,
      }, ws);
      break;
    }

    case "comment:new": {
      const client = clients.get(ws);
      if (!client) return;
      
      const { promptId, comment } = payload;
      
      broadcastToPrompt(promptId, {
        type: "comment:added",
        promptId,
        comment,
      });
      break;
    }

    case "cursor:move": {
      const client = clients.get(ws);
      if (!client || !client.promptId) return;
      
      const { position } = payload;
      
      broadcastToPrompt(client.promptId, {
        type: "cursor:moved",
        userId: client.userId,
        position,
      }, ws);
      break;
    }
  }
}

function broadcastToTeam(teamId: number | undefined, message: any, exclude?: WebSocket) {
  if (!teamId) return;
  
  const data = JSON.stringify(message);
  clients.forEach((client, ws) => {
    if (client.teamId === teamId && ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function broadcastToPrompt(promptId: number, message: any, exclude?: WebSocket) {
  const data = JSON.stringify(message);
  clients.forEach((client, ws) => {
    if (client.promptId === promptId && ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}
