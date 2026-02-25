import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { randomUUID } from "crypto";
import * as Sentry from "@sentry/node";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectPgSimple from "connect-pg-simple";
import { initializeDatabase, pool } from "./db";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import emailWebhooks from './routes/email-webhooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PgStore = connectPgSimple(session);
const app = express();

const sentryDsn = process.env.SENTRY_DSN;
const sentryEnabled = Boolean(sentryDsn);

if (sentryEnabled) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV,
    release: process.env.RENDER_GIT_COMMIT || process.env.SENTRY_RELEASE,
    tracesSampleRate: 0,
  });
}

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta: Record<string, unknown> = {}, source = "express") {
  const entry = {
    time: new Date().toISOString(),
    level,
    source,
    message,
    ...meta,
  };

  const shouldJson = process.env.NODE_ENV === "production" || process.env.LOG_FORMAT === "json";
  const line = shouldJson ? JSON.stringify(entry) : (() => {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${formattedTime} [${source}] ${level.toUpperCase()} ${message}${metaStr}`;
  })();

  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

// Stripe webhook needs raw body - must be before express.json()
app.post("/api/stripe/webhook", express.raw({ type: "application/json", limit: "2mb" }));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "2mb" }));

// Session configuration
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.set("trust proxy", 1);
}

function validateEnvForProduction() {
  if (!isProduction) return;

  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.SESSION_SECRET) missing.push("SESSION_SECRET");
  if (!process.env.APP_URL) missing.push("APP_URL");
  if (process.env.APP_URL) {
    try {
      new URL(process.env.APP_URL);
    } catch {
      missing.push("APP_URL (invalid URL)");
    }
  }
  if (!process.env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!process.env.FROM_EMAIL) missing.push("FROM_EMAIL");

  const hasOpenAiKey = Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
  if (!hasOpenAiKey) missing.push("OPENAI_API_KEY");

  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!process.env.STRIPE_PRO_PRICE_ID) missing.push("STRIPE_PRO_PRICE_ID");
  if (!process.env.STRIPE_PREMIUM_PRICE_ID) missing.push("STRIPE_PREMIUM_PRICE_ID");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

const allowedOrigins = (() => {
  const origins = new Set<string>();

  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      const u = new URL(appUrl);
      origins.add(u.origin);
      if (u.hostname.startsWith("www.")) {
        origins.add(`${u.protocol}//${u.hostname.slice(4)}`);
      } else {
        origins.add(`${u.protocol}//www.${u.hostname}`);
      }
    } catch {
    }
  }

  const extra = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  for (const o of extra) origins.add(o);

  return origins;
})();

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!isProduction) return next();
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();

  if (req.path === "/api/stripe/webhook" || req.path.startsWith("/api/email/webhooks")) return next();

  const origin = req.get("origin");
  const referer = req.get("referer");

  const requestOrigin = (() => {
    if (origin) return origin;
    if (!referer) return null;
    try {
      return new URL(referer).origin;
    } catch {
      return "__invalid__";
    }
  })();

  if (!requestOrigin) return next();
  if (requestOrigin === "__invalid__") {
    return res.status(403).json({ message: "Forbidden", requestId: (req as any).requestId });
  }

  if (allowedOrigins.size > 0 && !allowedOrigins.has(requestOrigin)) {
    return res.status(403).json({ message: "Forbidden", requestId: (req as any).requestId });
  }

  next();
});

app.use(session({
  store: new PgStore({ 
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
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const reqPath = req.path;
  const requestId = (req as any).requestId || "unknown";

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api") || reqPath.startsWith("/auth") || reqPath === "/health") {
      log("info", "request", {
        requestId,
        method: req.method,
        path: reqPath,
        status: res.statusCode,
        durationMs: duration,
      });
    }
  });

  next();
});

(async () => {
  // Setup auth routes
  validateEnvForProduction();
  await initializeDatabase();
  setupAuth(app);

  app.get("/health", async (_req: Request, res: Response) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false });
    }
  });
  
  // Setup email webhook routes
  app.use('/api/email', emailWebhooks);
  
  // Create HTTP server
  const server = createServer(app);

  // Setup API routes
  await registerRoutes(server, app);

  // Setup error handler for API routes
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = (req as any).requestId;
    let sentryEventId: string | undefined;

    if (sentryEnabled && status >= 500) {
      sentryEventId = Sentry.withScope((scope: any) => {
        scope.setTag("requestId", String(requestId || ""));
        scope.setContext("request", {
          method: req.method,
          path: req.path,
        });
        return Sentry.captureException(err);
      });
    }

    log("error", "request_error", {
      requestId,
      status,
      method: req.method,
      path: req.path,
      sentryEventId,
      errorName: err?.name,
    });

    const responseBody: Record<string, unknown> = { message, requestId };
    if (sentryEventId) responseBody.sentryEventId = sentryEventId;
    res.status(status).json(responseBody);
  });

  // Setup Vite or static serving
  if (isProduction) {
    const distPath = path.resolve(__dirname, "..", "dist", "public");
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.use("*", (_req: Request, res: Response) => {
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
    log("info", "server_listen", { port: PORT });
  });
})();
