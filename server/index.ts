import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { createServer } from "http";
import { pool } from "./db";

const PostgresStore = connectPgSimple(session);
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. Sessioner - Detta gör att inloggningen kommer ihåg dig
app.use(session({
  store: new PostgresStore({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "realtor_dna_2026",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production" }
}));

(async () => {
  const server = createServer(app);

  // 2. Här aktiverar vi inloggningssystemet
  setupAuth(app);

  // 3. Här aktiverar vi din AI-motor (Realtor-DNA)
  await registerRoutes(server, app);

  // Enkel loggning som ersätter de trasiga vite-importerna
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Servern är nu online på port ${PORT}`);
  });
})();