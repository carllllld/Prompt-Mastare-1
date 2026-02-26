import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Loader2, CheckCircle, KeyRound } from "lucide-react";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [status, setStatus] = useState<"form" | "loading" | "success">("form");
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStatus("form");
    setError(null);
    setNewPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const currentPassword = currentPasswordRef.current?.value || "";
    const newPass = newPasswordRef.current?.value || "";
    const confirmPass = confirmPasswordRef.current?.value || "";

    if (!currentPassword) {
      setError("Ange ditt nuvarande lösenord");
      return;
    }
    if (newPass.length < 8) {
      setError("Nytt lösenord måste vara minst 8 tecken");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Lösenorden matchar inte");
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword: newPass }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Kunde inte ändra lösenordet");
        setStatus("form");
      } else {
        setStatus("success");
      }
    } catch {
      setError("Ett fel uppstod. Försök igen.");
      setStatus("form");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Ändra lösenord
          </DialogTitle>
          <DialogDescription>
            Ange ditt nuvarande lösenord och välj ett nytt.
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-center font-medium">Lösenordet har ändrats!</p>
            <Button onClick={() => onOpenChange(false)} style={{ background: "#2D6A4F", color: "#fff" }}>
              Stäng
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="current-password">Nuvarande lösenord</Label>
              <Input
                id="current-password"
                ref={currentPasswordRef}
                type="password"
                placeholder="Ange nuvarande lösenord"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nytt lösenord</Label>
              <Input
                id="new-password"
                ref={newPasswordRef}
                type="password"
                placeholder="Minst 8 tecken"
                autoComplete="new-password"
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordStrength password={newPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Bekräfta nytt lösenord</Label>
              <Input
                id="confirm-new-password"
                ref={confirmPasswordRef}
                type="password"
                placeholder="Bekräfta lösenordet"
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={status === "loading"}
              style={{ background: "#2D6A4F", color: "#fff" }}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uppdaterar...
                </>
              ) : (
                "Ändra lösenord"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
