import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { PostgresStore } from "connect-pg-simple";
import { eq } from "drizzle-orm";
import { users } from "./shared/schema";
import { db } from "./shared/db";
import { initializeDatabase, setupAuth } from "./auth";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { log } from "./vite";
import emailWebhooks from './routes/email-webhooks';
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PostgresStore = connectPgSimple(session);
const app = express();

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Stripe webhook needs raw body - must be before express.json()
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
const isProduction = process.env.NODE_ENV === "production";

app.use(session({
  store: new PostgresStore({ 
    pool, 
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  name: "maklartexter.sid",
  proxy: true,
  cookie: { 
    secure: isProduction,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  }
}));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Setup auth routes
  await initializeDatabase();
  setupAuth(app);
  
  // Setup email webhook routes
  app.use('/api/email', emailWebhooks);
  
  // Create HTTP server
  const server = createServer(app);

  // Setup API routes
  await registerRoutes(server, app);

  // Setup error handler for API routes
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Server error:", err);
    res.status(status).json({ message });
  });

  // Setup Vite or static serving
  if (isProduction) {
    const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    } else {
      console.error("Production build not found at:", distPath);
    }
  } else {
    await setupVite(server, app);
  }

  const PORT = parseInt(process.env.PORT || "5000");
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
