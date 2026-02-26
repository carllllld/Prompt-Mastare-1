import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function VerifyEmail() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verifieringslänk saknas");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "E-postadressen har verifierats!");
          queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
          queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
          setTimeout(() => {
            setLocation("/app");
          }, 2000);
        } else {
          setStatus("error");
          setMessage(data.message || "Verifiering misslyckades");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Ett fel uppstod vid verifiering");
      }
    };

    verifyEmail();
  }, [token, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md" data-testid="card-verify-email">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">E-postverifiering</CardTitle>
          <CardDescription>
            {status === "loading" && "Verifierar din e-postadress..."}
            {status === "success" && "Din e-postadress har verifierats"}
            {status === "error" && "Verifiering misslyckades"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "loading" && (
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-center text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">Du skickas automatiskt vidare...</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="text-center text-muted-foreground">{message}</p>
              <Button
                onClick={() => setLocation("/")}
                className="mt-4"
                data-testid="button-go-to-home"
              >
                Gå till startsidan
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
