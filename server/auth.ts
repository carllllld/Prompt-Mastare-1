import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { storage } from "./storage";

// Session user type stored in req.session
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Validation schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Setup auth routes (session middleware is configured in server/index.ts)
export function setupAuth(app: Express) {
  // Register new user
  app.post("/auth/register", async (req: Request, res: Response) => {
    console.log("[Register] Starting registration for:", req.body?.email);
    try {
      const { email, password } = registerSchema.parse(req.body);
      console.log("[Register] Validation passed");

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log("[Register] Email already exists:", email);
        return res.status(400).json({ message: "Email already registered" });
      }
      console.log("[Register] Email available");

      // Hash password and create user
      const passwordHash = await bcrypt.hash(password, 12);
      console.log("[Register] Password hashed");
      
      const user = await storage.createUser(email, passwordHash);
      console.log("[Register] User created:", user.id);

      // Set session
      req.session.userId = user.id;
      console.log("[Register] Session userId set, saving session...");
      
      // Explicitly save session to ensure it persists
      req.session.save((err) => {
        if (err) {
          console.error("[Register] Session save error:", err);
          return res.status(500).json({ message: "Registration failed" });
        }
        console.log("[Register] Session saved successfully");
        
        res.status(201).json({
          id: user.id,
          email: user.email,
          subscriptionStatus: user.plan,
        });
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        console.log("[Register] Validation error:", err.errors[0].message);
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("[Register] Error:", err.message || err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login
  app.post("/auth/login", async (req: Request, res: Response) => {
    console.log("[Login] Starting login for:", req.body?.email);
    try {
      const { email, password } = loginSchema.parse(req.body);
      console.log("[Login] Validation passed");

      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log("[Login] User not found:", email);
        return res.status(401).json({ message: "Invalid email or password" });
      }
      console.log("[Login] User found:", user.id);

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        console.log("[Login] Invalid password for:", email);
        return res.status(401).json({ message: "Invalid email or password" });
      }
      console.log("[Login] Password valid");

      // Set session
      req.session.userId = user.id;
      console.log("[Login] Session userId set, saving session...");
      
      // Explicitly save session to ensure it persists
      req.session.save((err) => {
        if (err) {
          console.error("[Login] Session save error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        console.log("[Login] Session saved successfully");
        
        res.json({
          id: user.id,
          email: user.email,
          subscriptionStatus: user.plan,
        });
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        console.log("[Login] Validation error:", err.errors[0].message);
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("[Login] Error:", err.message || err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout
  app.post("/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      subscriptionStatus: user.plan,
    });
  });
}

// Middleware: Require authentication
export const requireAuth: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUserById(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attach user to request for convenience
  (req as any).user = user;
  next();
};

// Middleware: Require Pro subscription
export const requirePro: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUserById(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.plan !== "pro") {
    return res.status(403).json({ 
      message: "This feature requires a Pro subscription",
      requiresPro: true 
    });
  }

  (req as any).user = user;
  next();
};
