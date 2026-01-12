import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { serveStatic, setupVite, log } from "./vite";
import { createServer } from "http";
import { pool } from "./db";

const PostgresStore = connectPgSimple(session);
const app = express();

// Standard-inställningar för Express
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. SESSION-HANTERING (Måste ligga först för att inloggning ska fungera)
app.use(session({
  store: new PostgresStore({ 
    pool, 
    createTableIfMissing: true // Skapar sessionstabellen i databasen automatiskt
  }),
  secret: process.env.SESSION_SECRET || "elite_realtor_secret_2026",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dagar
  }
}));

// Loggnings-middleware för att se vad som händer
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  const server = createServer(app);

  // 2. SETUP AUTH (Hanterar /auth/register, /auth/login etc.)
  setupAuth(app);

  // 3. REGISTER ROUTES (Här bor din AI-motor och Realtor-DNA)
  await registerRoutes(server, app);

  // Felhantering
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // 4. STARTA SERVERN
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Servern körs på port ${PORT}`);
  });
})();