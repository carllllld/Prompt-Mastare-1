import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { createServer } from "http";
import { pool } from "./db";
import path from "path";

const PostgresStore = connectPgSimple(session);
const app = express();

// --- STRIPE SUPPORT ---
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
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

// Enkel loggning som alltid fungerar
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`);
  next();
});

(async () => {
  const server = createServer(app);

  // 1. Aktivera Inloggning
  setupAuth(app);

  // 2. Aktivera din Mäklar-motor (Realtor-DNA)
  await registerRoutes(server, app);

  // 3. FRONTEND-FIX (Ersätter trasiga vite.ts)
  // Detta gör att "Cannot GET /" försvinner
  if (process.env.NODE_ENV === "production") {
    const publicPath = path.resolve(process.cwd(), "dist", "public");
    app.use(express.static(publicPath));
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api") && !req.path.startsWith("/auth")) {
        res.sendFile(path.join(publicPath, "index.html"));
      }
    });
  } else {
    // Om du kör lokalt/dev, försök importera vite-setup dynamiskt
    try {
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    } catch (e) {
      console.error("Kunde inte starta Vite-dev mode, kör statiskt istället.");
    }
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Mäklarplattformen är live på port ${PORT}`);
  });
})();