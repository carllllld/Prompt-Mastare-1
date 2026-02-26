import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Loader2, Mail, CheckCircle } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "login" | "register";
}

export function AuthModal({ open, onOpenChange, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "verify-pending" | "resend-verification" | "forgot-password">(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [isResending, setIsResending] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [registerPassword, setRegisterPassword] = useState("");
  const { login, register, isLoggingIn, isRegistering } = useAuth();

  // Reset state when dialog opens or initialMode changes
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setSuccessMessage(null);
      setPendingEmail("");
      setRegisterPassword("");
    }
  }, [open, initialMode]);

  const loginEmailRef = useRef<HTMLInputElement>(null);
  const loginPasswordRef = useRef<HTMLInputElement>(null);
  const registerEmailRef = useRef<HTMLInputElement>(null);
  const registerPasswordRef = useRef<HTMLInputElement>(null);
  const registerConfirmRef = useRef<HTMLInputElement>(null);
  const resendEmailRef = useRef<HTMLInputElement>(null);
  const forgotEmailRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const email = loginEmailRef.current?.value || "";
    const password = loginPasswordRef.current?.value || "";

    if (!email || !email.includes("@")) {
      setError("Ange en giltig e-postadress");
      return;
    }
    if (!password) {
      setError("Lösenord krävs");
      return;
    }

    try {
      await login({ email, password });
      onOpenChange(false);
    } catch (err: any) {
      if (err.emailNotVerified) {
        setPendingEmail(err.email || email);
        setMode("verify-pending");
        setError(null);
      } else {
        setError(err.message || "Inloggning misslyckades. Försök igen.");
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const email = registerEmailRef.current?.value || "";
    const password = registerPasswordRef.current?.value || "";
    const confirmPassword = registerConfirmRef.current?.value || "";

    if (!email || !email.includes("@")) {
      setError("Ange en giltig e-postadress");
      return;
    }
    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken");
      return;
    }
    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte");
      return;
    }

    try {
      await register({ email, password });
      setPendingEmail(email);
      setMode("verify-pending");
      setSuccessMessage("Konto skapat! Kontrollera din e-post för att verifiera ditt konto.");
    } catch (err: any) {
      setError(err.message || "Registrering misslyckades. Försök igen.");
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsResending(true);

    const email = resendEmailRef.current?.value || pendingEmail;

    if (!email || !email.includes("@")) {
      setError("Ange en giltig e-postadress");
      setIsResending(false);
      return;
    }

    try {
      const response = await fetch("/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Kunde inte skicka verifieringsmail");
      } else {
        setSuccessMessage(data.message);
      }
    } catch (err: any) {
      setError("Ett fel uppstod. Försök igen senare.");
    } finally {
      setIsResending(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setSuccessMessage(null);
  };

  const goToLogin = () => {
    setMode("login");
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle data-testid="text-auth-title">
            {mode === "login" && "Logga in"}
            {mode === "register" && "Skapa konto"}
            {mode === "verify-pending" && "Verifiera e-post"}
            {mode === "resend-verification" && "Skicka verifieringsmail"}
            {mode === "forgot-password" && "Glömt lösenord"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "login" && "Logga in på ditt konto"}
            {mode === "register" && "Skapa ett nytt konto"}
            {mode === "verify-pending" && "Verifiera din e-postadress"}
            {mode === "resend-verification" && "Skicka nytt verifieringsmail"}
            {mode === "forgot-password" && "Återställ ditt lösenord"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md" data-testid="text-auth-error">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500/10 text-green-700 dark:text-green-400 text-sm p-3 rounded-md flex items-start gap-2" data-testid="text-auth-success">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        {mode === "verify-pending" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium">Kontrollera din inkorg</p>
                <p className="text-sm text-muted-foreground">
                  Vi har skickat ett verifieringsmail till <strong>{pendingEmail}</strong>.
                  Klicka på länken i mailet för att aktivera ditt konto.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendVerification}
                disabled={isResending}
                data-testid="button-resend-verification"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  "Skicka nytt verifieringsmail"
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={goToLogin}
                data-testid="button-back-to-login"
              >
                Tillbaka till inloggning
              </Button>
            </div>
          </div>
        )}

        {mode === "resend-verification" && (
          <form onSubmit={handleResendVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resend-email">E-postadress</Label>
              <Input
                id="resend-email"
                ref={resendEmailRef}
                type="email"
                placeholder="din@email.se"
                defaultValue={pendingEmail}
                autoComplete="email"
                data-testid="input-resend-email"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isResending}
              data-testid="button-resend-submit"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Skickar...
                </>
              ) : (
                "Skicka verifieringsmail"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={goToLogin}
              data-testid="button-back-to-login-from-resend"
            >
              Tillbaka till inloggning
            </Button>
          </form>
        )}

        {mode === "forgot-password" && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSuccessMessage(null);
            setIsResettingPassword(true);
            const email = forgotEmailRef.current?.value || "";
            if (!email || !email.includes("@")) {
              setError("Ange en giltig e-postadress");
              setIsResettingPassword(false);
              return;
            }
            try {
              const response = await fetch("/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              });
              const data = await response.json();
              if (!response.ok) {
                setError(data.message || "Kunde inte skicka återställningsmail");
              } else {
                setSuccessMessage(data.message);
              }
            } catch (err: any) {
              setError("Ett fel uppstod. Försök igen senare.");
            } finally {
              setIsResettingPassword(false);
            }
          }} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord.
            </p>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-postadress</Label>
              <Input
                id="forgot-email"
                ref={forgotEmailRef}
                type="email"
                placeholder="din@email.se"
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isResettingPassword}>
              {isResettingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Skickar...
                </>
              ) : (
                "Skicka återställningslänk"
              )}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={goToLogin}>
              Tillbaka till inloggning
            </Button>
          </form>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-postadress</Label>
              <Input
                id="login-email"
                ref={loginEmailRef}
                type="email"
                placeholder="din@email.se"
                autoComplete="email"
                data-testid="input-login-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Lösenord</Label>
              <Input
                id="login-password"
                ref={loginPasswordRef}
                type="password"
                placeholder="Ange ditt lösenord"
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
                  Loggar in...
                </>
              ) : (
                "Logga in"
              )}
            </Button>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-email">E-postadress</Label>
              <Input
                id="register-email"
                ref={registerEmailRef}
                type="email"
                placeholder="din@email.se"
                autoComplete="email"
                data-testid="input-register-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Lösenord</Label>
              <Input
                id="register-password"
                ref={registerPasswordRef}
                type="password"
                placeholder="Minst 8 tecken"
                autoComplete="new-password"
                data-testid="input-register-password"
                onChange={(e) => setRegisterPassword(e.target.value)}
              />
              <PasswordStrength password={registerPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-confirm">Bekräfta lösenord</Label>
              <Input
                id="register-confirm"
                ref={registerConfirmRef}
                type="password"
                placeholder="Bekräfta ditt lösenord"
                autoComplete="new-password"
                data-testid="input-register-confirm-password"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Genom att skapa konto godkänner du våra{" "}
              <a href="/terms" className="underline hover:text-primary" target="_blank">användarvillkor</a>{" "}
              och{" "}
              <a href="/privacy" className="underline hover:text-primary" target="_blank">integritetspolicy</a>.
            </p>
            <Button
              type="submit"
              className="w-full"
              disabled={isRegistering}
              data-testid="button-register-submit"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Skapar konto...
                </>
              ) : (
                "Skapa konto"
              )}
            </Button>
          </form>
        )}

        {(mode === "login" || mode === "register") && (
          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Har du inget konto?{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-primary hover:underline"
                  data-testid="button-switch-to-register"
                >
                  Skapa konto
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => { setMode("forgot-password"); setError(null); setSuccessMessage(null); }}
                  className="text-muted-foreground hover:text-primary hover:underline mt-1 inline-block"
                >
                  Glömt lösenord?
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => setMode("resend-verification")}
                  className="text-muted-foreground hover:text-primary hover:underline mt-1 inline-block"
                  data-testid="button-go-to-resend"
                >
                  Fått inget verifieringsmail?
                </button>
              </>
            ) : (
              <>
                Har du redan ett konto?{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-primary hover:underline"
                  data-testid="button-switch-to-login"
                >
                  Logga in
                </button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
