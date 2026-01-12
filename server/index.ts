import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { createServer } from "http";
import { pool } from "./db";
import path from "path";
import { setupVite, serveStatic, log } from "./vite";

const PostgresStore = connectPgSimple(session);
const app = express();

// --- STRIPE SUPPORT ---
// Måste ligga FÖRE express.json() för att webhooken ska fungera
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
  // Här landar betalningsbekräftelserna från Stripe
  res.json({ received: true });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- SESSIONER & AUTH ---
app.use(session({
  store: new PostgresStore({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "realtor_dna_2026",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production" }
}));

// Loggning av trafik (viktigt för att se AI-anropen)
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

  // --- AKTIVERA PLATTFORMENS KÄRNA ---
  setupAuth(app);           // 1. Inloggning
  await registerRoutes(server, app); // 2. Realtor-DNA & AI

  // --- FELHANTERING ---
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internt fel på plattformen";
    res.status(status).json({ message });
  });

  // --- FRONTEND & VITE (Fixar "Cannot GET /") ---
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Mäklarplattformen är online på port ${PORT}`);
  });
})();