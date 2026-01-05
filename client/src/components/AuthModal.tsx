import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const loginPasswordRef = useRef<HTMLInputElement>(null);
  const registerEmailRef = useRef<HTMLInputElement>(null);
  const registerPasswordRef = useRef<HTMLInputElement>(null);
  const registerConfirmRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const email = loginEmailRef.current?.value || "";
    const password = loginPasswordRef.current?.value || "";
    
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    
    try {
      await login({ email, password });
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const email = registerEmailRef.current?.value || "";
    const password = registerPasswordRef.current?.value || "";
    const confirmPassword = registerConfirmRef.current?.value || "";
    
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    try {
      await register({ email, password });
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle data-testid="text-auth-title">
            {mode === "login" ? "Sign In" : "Create Account"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md" data-testid="text-auth-error">
            {error}
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input 
                id="login-email"
                ref={loginEmailRef}
                type="email" 
                placeholder="you@example.com" 
                autoComplete="email"
                data-testid="input-login-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input 
                id="login-password"
                ref={loginPasswordRef}
                type="password" 
                placeholder="Enter your password" 
                autoComplete="current-password"
                data-testid="input-login-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoggingIn}
              data-testid="button-login-submit"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input 
                id="register-email"
                ref={registerEmailRef}
                type="email" 
                placeholder="you@example.com" 
                autoComplete="email"
                data-testid="input-register-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <Input 
                id="register-password"
                ref={registerPasswordRef}
                type="password" 
                placeholder="At least 8 characters" 
                autoComplete="new-password"
                data-testid="input-register-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-confirm">Confirm Password</Label>
              <Input 
                id="register-confirm"
                ref={registerConfirmRef}
                type="password" 
                placeholder="Confirm your password" 
                autoComplete="new-password"
                data-testid="input-register-confirm-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isRegistering}
              data-testid="button-register-submit"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        )}

        <div className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button 
                type="button"
                onClick={switchMode} 
                className="text-primary hover:underline"
                data-testid="button-switch-to-register"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button 
                type="button"
                onClick={switchMode} 
                className="text-primary hover:underline"
                data-testid="button-switch-to-login"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
