import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PromptForm } from "@/components/PromptForm";
import { ResultSection } from "@/components/ResultSection";
import { PromptHistory } from "@/components/PromptHistory";
import { AuthModal } from "@/components/AuthModal";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { type OptimizeResponse } from "@shared/schema";
import { Zap, Crown, AlertCircle, Loader2, Globe, LogIn, LogOut, User, Clock, Users, HomeIcon, PenTool, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function useCountdown(resetTime: string | undefined) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!resetTime) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const reset = new Date(resetTime);
      const diff = reset.getTime() - now.getTime();

      if (diff <= 0) {
        return "Återställs nu";
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        return `${hours}t ${minutes}m`;
      }
      return `${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(interval);
  }, [resetTime]);

  return timeLeft;
}

export default function Home() {
  const { mutate, isPending } = useOptimize();
  const { data: userStatus, isLoading: statusLoading } = useUserStatus();
  const resetTimeLeft = useCountdown(userStatus?.resetTime);
  const { mutate: startCheckout, isPending: isCheckoutPending } = useStripeCheckout();
  const { mutate: startPortal, isPending: isPortalPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/create-portal");
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: "Ett fel uppstod",
        description: error.message || "Kunde inte öppna faktureringsportalen.",
        variant: "destructive",
      });
    },
  });
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({
        title: "Betalning genomförd!",
        description: "Ditt konto har uppgraderats. Tack för ditt förtroende!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
      queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
      window.history.replaceState({}, "", "/");
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Betalning avbruten",
        description: "Du avbröt betalningen. Prova igen när du är redo.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/");
    }
  }, [toast]);

  const handleLogin = () => setAuthModalOpen(true);
  const handleLogout = () => logout();

  const handleUpgrade = (tier: "basic" | "pro" = "pro") => {
    if (!isAuthenticated) {
      toast({ title: "Logga in krävs", description: "Vänligen logga in för att uppgradera." });
      setAuthModalOpen(true);
      return;
    }
    startCheckout(tier);
  };

  const handleSubmit = (data: { prompt: string; type: any }) => {
    setLimitError(null);
    mutate(data, {
      onSuccess: (data) => {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/history"] });
        setTimeout(() => {
          document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      },
      onError: (error: any) => {
        if (error?.limitReached) {
          setLimitError(error.message);
        } else {
          toast({
            title: "Kunde inte generera text",
            description: error?.message || "Något gick fel. Försök igen.",
            variant: "destructive",
          });
        }
      },
    });
  };

  const isLimitReached = userStatus && userStatus.promptsRemaining <= 0;

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Header / Hero */}
      <header className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px]" />
          <div className="absolute -top-20 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-20 flex items-center justify-between gap-4 px-4 sm:px-6 py-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <HomeIcon className="w-5 h-5 text-violet-400" />
            <span className="font-bold text-white tracking-tight">OptiPrompt <span className="text-violet-400">Mäklare</span></span>
          </div>
          <div className="flex items-center gap-3">
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white/50" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-violet-600/20 text-violet-300 text-xs">
                    {user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/70 hover:text-white">
                  <LogOut className="w-4 h-4 mr-2" /> Logga ut
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleLogin} className="border-white/10 text-white">
                Logga in
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Specialbyggd AI för svenska fastighetsmäklare</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6">
            Sälj bostaden med <br />
            <span className="text-gradient">rätt ord.</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            Skapa proffsiga objektbeskrivningar för Hemnet på 30 sekunder. Utan att det låter som en robot.
          </p>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Statusbar */}
        {userStatus && (
          <div className="mb-8 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={userStatus.plan === "pro" ? "default" : "secondary"}>
                {userStatus.plan === "pro" ? "Mäklar-Pro" : "Gratis"}
              </Badge>
              <span className="text-sm text-white/60">
                <span className="font-semibold text-white">{userStatus.promptsRemaining}</span> av {userStatus.dailyLimit} texter kvar idag
              </span>
            </div>
            {userStatus.plan !== "pro" && (
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => handleUpgrade("pro")}>
                Uppgradera
              </Button>
            )}
          </div>
        )}

        <div id="prompt-form" className="mb-12">
          <PromptForm 
            onSubmit={handleSubmit} 
            isPending={isPending} 
            disabled={isLimitReached || false}
            clearOnSuccess={true}
          />
        </div>

        {result && (
          <div id="results" className="mb-12">
            <ResultSection result={result} onNewPrompt={() => setResult(null)} />
          </div>
        )}

        {/* Hur det fungerar */}
        <section className="mt-24 space-y-12">
          <h2 className="text-3xl font-bold text-center">Tre steg till en färdig annons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 mx-auto flex items-center justify-center text-violet-300 font-bold">1</div>
              <h3 className="font-semibold">Mata in fakta</h3>
              <p className="text-sm text-white/50">Klistra in dina stödanteckningar om bostaden.</p>
            </div>
            <div className="space-y-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 mx-auto flex items-center justify-center text-violet-300 font-bold">2</div>
              <h3 className="font-semibold">AI:n skapar magi</h3>
              <p className="text-sm text-white/50">Vår AI anpassar tonläget efter svensk mäklarstandard.</p>
            </div>
            <div className="space-y-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 mx-auto flex items-center justify-center text-violet-300 font-bold">3</div>
              <h3 className="font-semibold">Publicera</h3>
              <p className="text-sm text-white/50">Kopiera texten direkt till Hemnet eller din hemsida.</p>
            </div>
          </div>
        </section>

        {/* Varför OptiPrompt */}
        <section className="mt-32 p-8 md:p-12 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
          <h2 className="text-3xl font-bold text-center mb-12">Varför välja oss?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold">Svenskt tonläge</h4>
                <p className="text-white/50 text-sm">Ingen "Google Translate"-känsla. Vi skriver som en mäklare.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold">Spara timmar</h4>
                <p className="text-white/50 text-sm">Gå från rådata till färdigt utkast på under en minut.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-32 mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Prisplaner för framgångsrika mäklare</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <Card className="p-8 bg-white/[0.03] border-white/[0.08]">
              <h3 className="text-xl font-bold mb-1">Gratis</h3>
              <p className="text-3xl font-extrabold my-6">0 kr</p>
              <ul className="space-y-4 text-white/70 mb-8 text-sm">
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> 2 beskrivningar/dag</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Standard AI-modell</li>
              </ul>
              <Button variant="outline" className="w-full">Börja nu</Button>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border-violet-500/30 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-600 text-white text-xs font-bold rounded-full">MEST POPULÄR</div>
              <h3 className="text-xl font-bold mb-1">Mäklar-Pro</h3>
              <p className="text-3xl font-extrabold my-6">499 kr<span className="text-base font-normal text-white/40">/mån</span></p>
              <ul className="space-y-4 text-white/80 mb-8 text-sm">
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> 50 beskrivningar/dag</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Prioriterad GPT-4o access</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Spara dina favorit-mallar</li>
              </ul>
              <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => handleUpgrade("pro")}>
                Välj Pro
              </Button>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] py-8 mt-auto text-center text-white/40 text-sm">
        <p>&copy; {new Date().getFullYear()} OptiPrompt Mäklare. Effektivisera din försäljning.</p>
      </footer>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}