import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sessions } from "@shared/schema";
import { eq } from "drizzle-orm";

interface Client {
  ws: WebSocket;
  userId: string;
  teamId?: number;
  promptId?: number;
}

const clients = new Map<WebSocket, Client>();

export function setupWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    // Verify session on connection — extract authenticated userId from session cookie
    const sessionUserId = await getSessionUserId(req);
    if (!sessionUserId) {
      ws.send(JSON.stringify({ type: "auth:failed", reason: "Ej inloggad" }));
      ws.close(1008, "Unauthorized");
      return;
    }
    // Store the server-verified userId on the socket object
    (ws as any)._verifiedUserId = sessionUserId;

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
      const { teamId, promptId } = payload;
      // Use server-verified userId, ignore any client-provided userId
      const userId = (ws as any)._verifiedUserId as string;
      if (!userId) {
        ws.send(JSON.stringify({ type: "auth:failed", reason: "Session ogiltig" }));
        ws.close(1008, "Unauthorized");
        return;
      }
      // Validate team membership before joining
      if (teamId) {
        const membership = await storage.getUserTeamMembership(userId, teamId);
        if (!membership) {
          ws.send(JSON.stringify({ type: "auth:failed", reason: "Inte medlem av team" }));
          return;
        }
      }

      clients.set(ws, { ws, userId, teamId, promptId });

      if (teamId) {
        await storage.updatePresence(userId, teamId, promptId || null);

        broadcastToTeam(teamId, {
          type: "presence:join",
          userId,
          promptId,
        }, ws);
      }

      ws.send(JSON.stringify({ type: "auth:success", userId }));
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

async function getSessionUserId(req: IncomingMessage): Promise<string | null> {
  try {
    const cookieHeader = req.headers.cookie || "";
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach(part => {
      const [key, ...val] = part.trim().split("=");
      if (key) cookies[key.trim()] = decodeURIComponent(val.join("="));
    });

    const rawSid = cookies["connect.sid"] || "";
    if (!rawSid) return null;

    // Strip the s: prefix added by cookie-session signing
    const signed = rawSid.startsWith("s:") ? rawSid.slice(2) : rawSid;
    // Session ID is everything before the first dot (the signature)
    const sid = signed.split(".")[0];
    if (!sid) return null;

    const [session] = await db.select({ sess: sessions.sess }).from(sessions).where(eq(sessions.sid, sid));
    if (!session) return null;

    return (session.sess as any)?.userId || null;
  } catch {
    return null;
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
