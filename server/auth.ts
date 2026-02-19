import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { sendVerificationEmail } from "./email";

const MAX_VERIFICATION_EMAILS_PER_HOUR = 3;

// Session user type stored in req.session
declare module "express-session" {
  interface SessionData {
    userId: string;
    deviceInfo?: {
      userAgent: string;
      ip: string;
      loginTime: Date;
    };
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

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await storage.setVerificationToken(user.id, verificationToken, tokenExpires);
      console.log("[Register] Verification token created");

      // Send verification email (rate limited)
      const canSend = await storage.canSendEmail(email, 'verification', MAX_VERIFICATION_EMAILS_PER_HOUR);
      if (canSend) {
        await storage.recordEmailSent(email, 'verification');
        await sendVerificationEmail(email, verificationToken);
        console.log("[Register] Verification email sent");
      } else {
        console.log("[Register] Rate limited, skipping verification email");
      }

      // Set session (user can use the app but with limited features until verified)
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      req.session.userId = user.id;
      req.session.deviceInfo = {
        userAgent,
        ip: clientIP,
        loginTime: new Date()
      };
      
      console.log("[Register] Session userId set with device info, saving session...");
      
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
          emailVerified: false,
          message: "Konto skapat! Kontrollera din e-post för att verifiera ditt konto.",
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

      // Check if email is verified
      if (!user.emailVerified) {
        console.log("[Login] Email not verified for:", email);
        return res.status(403).json({ 
          message: "Vänligen verifiera din e-postadress innan du loggar in. Kontrollera din inkorg.",
          emailNotVerified: true,
          email: user.email,
        });
      }

      // Set session with device info
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      req.session.userId = user.id;
      req.session.deviceInfo = {
        userAgent,
        ip: clientIP,
        loginTime: new Date()
      };
      
      console.log("[Login] Session userId set with device info, saving session...");
      console.log("[Login] Device:", { userAgent: userAgent.substring(0, 50), ip: clientIP });
      
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
          emailVerified: user.emailVerified,
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
      emailVerified: user.emailVerified,
    });
  });

  // Verify email
  app.get("/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Verifieringslänk saknas" });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "Ogiltig eller utgången verifieringslänk" });
      }

      // Check if token has expired
      if (user.verificationTokenExpires && new Date() > new Date(user.verificationTokenExpires)) {
        return res.status(400).json({ message: "Verifieringslänken har gått ut. Vänligen begär en ny." });
      }

      // Mark email as verified
      await storage.markEmailVerified(user.id);
      console.log("[Verify] Email verified for user:", user.id);

      // Log the user in automatically with device info
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      req.session.userId = user.id;
      req.session.deviceInfo = {
        userAgent,
        ip: clientIP,
        loginTime: new Date()
      };
      req.session.save((err) => {
        if (err) {
          console.error("[Verify] Session save error:", err);
        }
        res.json({ 
          message: "E-postadressen har verifierats!",
          id: user.id,
          email: user.email,
          subscriptionStatus: user.plan,
          emailVerified: true,
        });
      });
    } catch (err: any) {
      console.error("[Verify] Error:", err);
      res.status(500).json({ message: "Verifiering misslyckades" });
    }
  });

  // Get user's active sessions/devices
  app.get("/auth/sessions", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // This would require extending the session store to track multiple sessions
      // For now, return current session info
      res.json({
        currentSession: {
          deviceInfo: req.session.deviceInfo,
          sessionId: req.sessionID,
          loginTime: req.session.deviceInfo?.loginTime
        },
        message: "Multi-device session tracking coming soon"
      });
    } catch (error) {
      console.error("[Sessions] Error:", error);
      res.status(500).json({ message: "Kunde inte hämta sessioner" });
    }
  });

  // Resend verification email
  app.post("/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "E-postadress krävs" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "Om e-postadressen finns i vårt system skickas ett nytt verifieringsmail." });
      }

      if (user.emailVerified) {
        return res.json({ message: "E-postadressen är redan verifierad. Du kan logga in." });
      }

      // Check rate limit
      const canSend = await storage.canSendEmail(email, 'verification', MAX_VERIFICATION_EMAILS_PER_HOUR);
      if (!canSend) {
        return res.status(429).json({ 
          message: "Du har begärt för många verifieringsmejl. Vänligen vänta en timme." 
        });
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.setVerificationToken(user.id, verificationToken, tokenExpires);
      
      // Record and send email
      await storage.recordEmailSent(email, 'verification');
      await sendVerificationEmail(email, verificationToken);
      
      console.log("[Resend] Verification email sent to:", email);
      res.json({ message: "Nytt verifieringsmail skickat. Kontrollera din inkorg." });
    } catch (err: any) {
      console.error("[Resend] Error:", err);
      res.status(500).json({ message: "Kunde inte skicka verifieringsmail" });
    }
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
      message: "Denna funktion kräver en Pro-prenumeration",
      requiresPro: true 
    });
  }

  (req as any).user = user;
  next();
};
