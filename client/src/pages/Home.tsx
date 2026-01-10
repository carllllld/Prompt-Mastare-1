import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PromptForm } from "@/components/PromptForm";
import { ResultSection } from "@/components/ResultSection";
import { AuthModal } from "@/components/AuthModal";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { type OptimizeResponse } from "@shared/schema";
import { Zap, Loader2, HomeIcon, PenTool, Sparkles, LogOut, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { mutate, isPending } = useOptimize();
  const { data: userStatus } = useUserStatus();
  const { mutate: startCheckout } = useStripeCheckout();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleLogin = () => setAuthModalOpen(true);
  const handleLogout = () => logout();

  const handleUpgrade = (tier: "basic" | "pro" = "pro") => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    startCheckout(tier);
  };

  const handleSubmit = (data: { prompt: string; type: any }) => {
    mutate(data, {
      onSuccess: (data) => {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
        setTimeout(() => {
          document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      },
      onError: (error: any) => {
        toast({
          title: "Ett fel uppstod",
          description: error?.message || "Kunde inte generera text.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Navigation */}
      <nav className="border-b bg-white border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <HomeIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">OptiPrompt</span>
          </div>

          <div className="flex items-center gap-4 text-slate-900">
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-600 hidden sm:block">{user?.email}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600 hover:text-indigo-600">
                  <LogOut className="w-4 h-4 mr-2" /> Logga ut
                </Button>
              </div>
            ) : (
              <Button onClick={handleLogin} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
                Logga in
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <section className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <Badge variant="outline" className="mb-6 border-indigo-200 bg-indigo-50 text-indigo-700 px-4 py-1 rounded-full">
              För professionella fastighetsmäklare
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-6">
              Sälj bostaden med <span className="text-indigo-600">rätt ord.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
              Skapa engagerande objektbeskrivningar på sekunder.
            </p>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 -mt-12 pb-20 relative z-10">
          <Card className="p-6 shadow-2xl border border-slate-200 bg-white rounded-2xl">
              {userStatus && (
                <div className="mb-8 flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold">
                      {userStatus.promptsRemaining} av {userStatus.dailyLimit} texter kvar idag
                    </span>
                  </div>
                  {userStatus.plan !== "pro" && (
                    <button onClick={() => handleUpgrade("pro")} className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      Uppgradera
                    </button>
                  )}
                </div>
              )}

              <PromptForm 
                onSubmit={handleSubmit} 
                isPending={isPending} 
                disabled={userStatus?.promptsRemaining === 0}
              />
          </Card>

          {result && (
            <div id="results" className="mt-12">
              <ResultSection result={result} onNewPrompt={() => setResult(null)} />
            </div>
          )}
        </section>
      </main>

      <footer className="bg-slate-50 py-12 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-xs">&copy; {new Date().getFullYear()} OptiPrompt Mäklare.</p>
      </footer>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}