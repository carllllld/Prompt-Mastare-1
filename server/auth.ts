import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";

const MAX_VERIFICATION_EMAILS_PER_HOUR = 3;

// ─── LOGIN RATE LIMITING (brute-force protection) ───
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (entry.count >= LOGIN_MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function recordFailedLogin(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count++;
  }
}

function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts) {
    if (now > entry.resetAt) loginAttempts.delete(key);
  }
}, 10 * 60 * 1000);

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
  email: z.string().email("Ange en giltig e-postadress"),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken"),
});

const loginSchema = z.object({
  email: z.string().email("Ange en giltig e-postadress"),
  password: z.string().min(1, "Lösenord krävs"),
});

// Setup auth routes (session middleware is configured in server/index.ts)
export function setupAuth(app: Express) {
  // Register new user
  app.post("/auth/register", async (req: Request, res: Response) => {
    console.log("[Register] Starting registration for:", req.body?.email);
    try {
      const parsed = registerSchema.parse(req.body);
      const email = parsed.email.toLowerCase();
      const password = parsed.password;
      console.log("[Register] Validation passed");

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log("[Register] Email already exists:", email);
        return res.status(400).json({ message: "E-postadressen är redan registrerad" });
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
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

        // Send immediately for security emails (no queue delay)
        try {
          console.log("[Register] Attempting to send verification email immediately to:", email);
          const { sendEmailWithRetry } = await import('./lib/email-service');
          const result = await sendEmailWithRetry('verification', email, {
            verificationUrl: `${(process.env.APP_URL || 'https://optiprompt.se').replace(/\/+$/, '')}/verify-email?token=${verificationToken}`
          }, clientIP);

          if (result.success) {
            console.log("[Register] Verification email sent immediately to:", email);
          } else {
            console.error("[Register] Verification email send failed:", result.error);
            // Fallback to queue if immediate send fails
            await sendVerificationEmail(email, verificationToken, clientIP);
          }
        } catch (emailError) {
          console.error("[Register] Immediate verification email send failed:", emailError);
          // Fallback to queue if immediate send fails
          await sendVerificationEmail(email, verificationToken, clientIP);
        }
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
          return res.status(500).json({ message: "Registrering misslyckades" });
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
      res.status(500).json({ message: "Registrering misslyckades" });
    }
  });

  // Login
  app.post("/auth/login", async (req: Request, res: Response) => {
    console.log("[Login] Starting login for:", req.body?.email);
    try {
      const parsed = loginSchema.parse(req.body);
      const email = parsed.email.toLowerCase();
      const password = parsed.password;

      // Rate limit by IP + email to prevent brute-force
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const rateLimitKey = `${clientIP}:${email}`;

      if (!checkLoginRateLimit(rateLimitKey)) {
        console.log("[Login] Rate limited:", email, "from IP:", clientIP);
        return res.status(429).json({
          message: "För många inloggningsförsök. Vänligen vänta 15 minuter och försök igen."
        });
      }

      console.log("[Login] Looking up user by email:", email);
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log("[Login] User not found:", email);
        recordFailedLogin(rateLimitKey);
        return res.status(401).json({ message: "Felaktig e-postadress eller lösenord" });
      }

      console.log("[Login] User found:", user.id, "email verified:", user.emailVerified);
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        console.log("[Login] Invalid password for:", email);
        recordFailedLogin(rateLimitKey);
        return res.status(401).json({ message: "Felaktig e-postadress eller lösenord" });
      }

      // Clear rate limit on successful login
      clearLoginAttempts(rateLimitKey);
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

      // Set session with device info (clientIP already declared above for rate limiting)
      const userAgent = req.get('User-Agent') || 'unknown';

      console.log("[Login] Setting up session for user:", user.id);
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
          return res.status(500).json({ message: "Inloggning misslyckades" });
        }
        console.log("[Login] Session saved successfully for user:", user.id);

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
      res.status(500).json({ message: "Inloggning misslyckades" });
    }
  });

  // Logout
  app.post("/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("maklartexter.sid");
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
      req.session.destroy(() => { });
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
      console.log("[Verify] Email verification request received");
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        console.log("[Verify] Invalid or missing token");
        return res.status(400).json({ message: "Verifieringslänk saknas" });
      }

      console.log("[Verify] Looking up user by verification token");
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        console.log("[Verify] User not found for token");
        return res.status(400).json({ message: "Ogiltig eller utgången verifieringslänk" });
      }

      console.log("[Verify] User found:", user.id, "email verified:", user.emailVerified);

      // Check if token has expired
      if (user.verificationTokenExpires && new Date() > new Date(user.verificationTokenExpires)) {
        console.log("[Verify] Token expired for user:", user.id);
        return res.status(400).json({ message: "Verifieringslänken har gått ut. Vänligen begär en ny." });
      }

      // Mark email as verified
      await storage.markEmailVerified(user.id);
      console.log("[Verify] Email marked as verified for user:", user.id);

      // Log the user in automatically with device info
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      console.log("[Verify] Setting up session for user:", user.id);
      req.session.userId = user.id;
      req.session.deviceInfo = {
        userAgent,
        ip: clientIP,
        loginTime: new Date()
      };

      console.log("[Verify] Saving session...");
      req.session.save((err) => {
        if (err) {
          console.error("[Verify] Session save error:", err);
          return res.status(500).json({ message: "Verifiering misslyckades" });
        }
        console.log("[Verify] Session saved successfully for user:", user.id);
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

  // Change password (for logged-in users)
  app.post("/auth/change-password", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Du måste vara inloggad" });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || typeof currentPassword !== 'string') {
        return res.status(400).json({ message: "Nuvarande lösenord krävs" });
      }
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Nytt lösenord måste vara minst 8 tecken" });
      }

      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "Användare hittades inte" });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Nuvarande lösenord är felaktigt" });
      }

      // Hash and save new password
      const passwordHash = await bcrypt.hash(newPassword, 12);
      const updatedUser = await storage.updatePassword(user.id, passwordHash);

      if (!updatedUser) {
        return res.status(500).json({ message: "Kunde inte uppdatera lösenordet" });
      }

      // Verify the new hash works
      const verifyHash = await bcrypt.compare(newPassword, updatedUser.passwordHash);
      if (!verifyHash) {
        console.error("[ChangePassword] CRITICAL: Hash verification failed for user:", user.id);
        return res.status(500).json({ message: "Lösenordet kunde inte sparas korrekt. Försök igen." });
      }

      console.log("[ChangePassword] Password changed for user:", user.id);
      res.json({ message: "Lösenordet har ändrats!" });
    } catch (err: any) {
      console.error("[ChangePassword] Error:", err);
      res.status(500).json({ message: "Kunde inte ändra lösenordet" });
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
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      // Send immediately for security emails (no queue delay)
      try {
        const { sendEmailWithRetry } = await import('./lib/email-service');
        await sendEmailWithRetry('verification', email, {
          verificationUrl: `${(process.env.APP_URL || 'https://optiprompt.se').replace(/\/+$/, '')}/verify-email?token=${verificationToken}`
        }, clientIP);
        console.log("[Resend] Verification email sent immediately to:", email);
      } catch (emailError) {
        console.error("[Resend] Immediate verification email send failed:", emailError);
        // Fallback to queue if immediate send fails
        await sendVerificationEmail(email, verificationToken, clientIP);
      }
      res.json({ message: "Nytt verifieringsmail skickat. Kontrollera din inkorg." });
    } catch (err: any) {
      console.error("[Resend] Error:", err);
      res.status(500).json({ message: "Kunde inte skicka verifieringsmail" });
    }
  });

  // Request password reset
  app.post("/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: "Ange en giltig e-postadress" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "Om e-postadressen finns i vårt system skickas en återställningslänk." });
      }

      // Rate limit
      const canSend = await storage.canSendEmail(email, 'password_reset', 3);
      if (!canSend) {
        return res.status(429).json({
          message: "Du har begärt för många återställningar. Vänligen vänta en timme."
        });
      }

      // Generate reset token (1 hour expiry)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 60 * 60 * 1000);

      await storage.setPasswordResetToken(user.id, resetToken, tokenExpires);

      // Record and send email immediately for password reset
      await storage.recordEmailSent(email, 'password_reset');
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      // Send immediately for security emails (no queue delay)
      try {
        const { sendEmailWithRetry } = await import('./lib/email-service');
        await sendEmailWithRetry('password_reset', email, {
          resetUrl: `${(process.env.APP_URL || 'https://optiprompt.se').replace(/\/+$/, '')}/reset-password?token=${resetToken}`,
          userName: user.email
        }, clientIP);
        console.log("[ForgotPassword] Reset email sent to:", email);
      } catch (emailError) {
        console.error("[ForgotPassword] Email send failed:", emailError);
        // Fallback to queue if immediate send fails
        await sendPasswordResetEmail(email, resetToken, user.email, clientIP);
      }
      res.json({ message: "Återställningslänk skickad! Kontrollera din inkorg inom 1 minut." });
    } catch (err: any) {
      console.error("[ForgotPassword] Error:", err);
      res.status(500).json({ message: "Kunde inte skicka återställningsmail" });
    }
  });

  // Reset password with token
  app.post("/auth/reset-password", async (req: Request, res: Response) => {
    try {
      console.log("[ResetPassword] Password reset request received");
      const { token, password } = req.body;

      if (!token || typeof token !== 'string') {
        console.log("[ResetPassword] Invalid or missing token");
        return res.status(400).json({ message: "Återställningslänk saknas" });
      }

      if (!password || password.length < 8) {
        console.log("[ResetPassword] Invalid password length");
        return res.status(400).json({ message: "Lösenordet måste vara minst 8 tecken" });
      }

      console.log("[ResetPassword] Looking up user by reset token");
      const user = await storage.getUserByPasswordResetToken(token);

      if (!user) {
        console.log("[ResetPassword] User not found for token");
        return res.status(400).json({ message: "Ogiltig eller utgången återställningslänk" });
      }

      console.log("[ResetPassword] User found:", user.id, "email verified:", user.emailVerified);

      // Check if token has expired
      if (user.passwordResetExpires && new Date() > new Date(user.passwordResetExpires)) {
        console.log("[ResetPassword] Token expired for user:", user.id);
        return res.status(400).json({ message: "Återställningslänken har gått ut. Vänligen begär en ny." });
      }

      // Hash new password and update
      console.log("[ResetPassword] Hashing new password for user:", user.id);
      const passwordHash = await bcrypt.hash(password, 12);
      const updatedUser = await storage.updatePassword(user.id, passwordHash);

      if (!updatedUser) {
        console.error("[ResetPassword] UPDATE returned no rows for user:", user.id);
        return res.status(500).json({ message: "Kunde inte uppdatera lösenordet. Försök igen." });
      }

      // Mark email as verified since user has proven ownership by using reset link
      console.log("[ResetPassword] Marking email as verified for user:", user.id);
      await storage.markEmailVerified(user.id);
      console.log("[ResetPassword] Email marked as verified for user:", user.id);

      // Verify the new hash actually works before telling the user it's done
      const verifyHash = await bcrypt.compare(password, updatedUser.passwordHash);
      if (!verifyHash) {
        console.error("[ResetPassword] CRITICAL: Hash verification failed after save for user:", user.id);
        return res.status(500).json({ message: "Lösenordet kunde inte sparas korrekt. Försök igen." });
      }

      console.log("[ResetPassword] Password updated and verified for user:", user.id);
      res.json({ message: "Lösenordet har uppdaterats! Du kan nu logga in." });
    } catch (err: any) {
      console.error("[ResetPassword] Error:", err);
      res.status(500).json({ message: "Kunde inte återställa lösenordet" });
    }
  });

  // Debug endpoint to test session functionality
  app.get("/auth/debug-session", (req: Request, res: Response) => {
    console.log("[Debug] Session debug request");
    console.log("[Debug] Session ID:", req.sessionID);
    console.log("[Debug] Session data:", req.session);
    console.log("[Debug] Session cookie:", req.session.cookie);

    res.json({
      sessionId: req.sessionID,
      session: req.session,
      cookie: req.session?.cookie,
      hasUserId: !!req.session?.userId,
      userId: req.session?.userId,
      headers: {
        cookie: req.get('cookie'),
        'user-agent': req.get('user-agent')
      }
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

  if (user.plan !== "pro" && user.plan !== "premium") {
    return res.status(403).json({
      message: "Denna funktion kräver en Pro- eller Premium-prenumeration",
      requiresPro: true
    });
  }

  (req as any).user = user;
  next();
};
