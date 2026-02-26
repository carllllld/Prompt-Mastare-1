import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2, KeyRound } from "lucide-react";

export default function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"form" | "loading" | "success" | "error">(token ? "form" : "error");
  const [message, setMessage] = useState(token ? "" : "Återställningslänk saknas");
  const [error, setError] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const password = passwordRef.current?.value || "";
    const confirm = confirmRef.current?.value || "";

    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken");
      return;
    }
    if (password !== confirm) {
      setError("Lösenorden matchar inte");
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Lösenordet har uppdaterats!");
        setTimeout(() => setLocation("/"), 3000);
      } else {
        setStatus("error");
        setMessage(data.message || "Kunde inte återställa lösenordet");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setStatus("error");
      setMessage("Ett fel uppstod. Försök igen senare.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#FAFAF7" }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" style={{ fontFamily: "'Lora', Georgia, serif" }}>
            Återställ lösenord
          </CardTitle>
          <CardDescription>
            {status === "form" && "Välj ett nytt lösenord för ditt konto"}
            {status === "loading" && "Uppdaterar lösenord..."}
            {status === "success" && "Ditt lösenord har uppdaterats"}
            {status === "error" && "Något gick fel"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "form" && (
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-password">Nytt lösenord</Label>
                <Input
                  id="new-password"
                  ref={passwordRef}
                  type="password"
                  placeholder="Minst 8 tecken"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Bekräfta lösenord</Label>
                <Input
                  id="confirm-password"
                  ref={confirmRef}
                  type="password"
                  placeholder="Bekräfta ditt lösenord"
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" style={{ background: "#2D6A4F", color: "#fff" }}>
                <KeyRound className="w-4 h-4 mr-2" />
                Uppdatera lösenord
              </Button>
            </form>
          )}
          {status === "loading" && (
            <Loader2 className="h-16 w-16 animate-spin" style={{ color: "#2D6A4F" }} />
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-center text-sm" style={{ color: "#4B5563" }}>{message}</p>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>Du skickas automatiskt till startsidan...</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-center text-sm" style={{ color: "#4B5563" }}>{message}</p>
              <Button onClick={() => setLocation("/")} className="mt-4" style={{ background: "#2D6A4F", color: "#fff" }}>
                Gå till startsidan
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
