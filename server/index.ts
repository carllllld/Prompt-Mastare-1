import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite"; 
import { createServer } from "http";
import { pool } from "./db";

const PostgresStore = connectPgSimple(session);
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. SESSION-HANTERING
// Detta krävs för att hålla mäklaren inloggad på plattformen
app.use(session({
  store: new PostgresStore({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "realtor_dna_2026",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production" }
}));

// Loggning av trafik på plattformen
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") || path.startsWith("/auth")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  const server = createServer(app);

  // 2. AKTIVERA AUTH & MÄKLAR-STRATEGI
  setupAuth(app); // Hanterar konton och inloggning
  await registerRoutes(server, app); // Hanterar Realtor-DNA och objektanalys

  // 3. FELHANTERING
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Tekniskt fel på plattformen";
    res.status(status).json({ message });
  });

  // 4. FRONTEND-SERVERING (Det som tar bort "Cannot GET /")
  // Denna del ser till att hela din mäklar-sajt faktiskt renderas i webbläsaren
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