import { useState, useEffect } from "react";
import { PromptForm } from "@/components/PromptForm";
import { ResultSection } from "@/components/ResultSection";
import { PromptHistory } from "@/components/PromptHistory";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { type OptimizeResponse } from "@shared/schema";
import { Zap, Crown, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { mutate, isPending } = useOptimize();
  const { data: userStatus, isLoading: statusLoading } = useUserStatus();
  const { mutate: startCheckout, isPending: isCheckoutPending } = useStripeCheckout();
  const { toast } = useToast();
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({
        title: "Betalning genomf\u00f6rd!",
        description: "Du har nu tillg\u00e5ng till Pro-planen. Tack f\u00f6r ditt st\u00f6d!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
      window.history.replaceState({}, "", "/");
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Betalning avbruten",
        description: "Du avbr\u00f6t betalningen. Prova igen n\u00e4r du vill.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/");
    }
  }, [toast]);

  const handleUpgrade = () => {
    startCheckout();
  };

  const handleSubmit = (data: { prompt: string; type: any }) => {
    setLimitError(null);
    mutate(data, {
      onSuccess: (data) => {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/history"] });
        setTimeout(() => {
          const resultElement = document.getElementById("results");
          if (resultElement) {
            resultElement.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      },
      onError: (error: any) => {
        if (error?.limitReached) {
          setLimitError(error.message);
        }
      },
    });
  };

  const isLimitReached = userStatus && userStatus.promptsRemaining <= 0;

  return (
    <div className="min-h-screen">
      {/* Header / Hero */}
      <header className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-violet-600/20 rounded-full blur-[100px] animate-pulse-slow" />
          <div className="absolute -top-20 right-0 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-500/10 rounded-full blur-[80px]" />
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-violet-300 text-sm font-medium mb-8 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5" />
            <span>Intelligenta prompts. Överlägsna resultat.</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-white">Prompt</span>
            <span className="text-gradient">Forge</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed font-medium">
            Förvandla dina AI-prompts till kraftfulla instruktioner
          </p>
          <p className="mt-4 text-white/50 max-w-xl mx-auto text-base">
            Sluta gissa. Få bättre svar från ChatGPT, Claude och andra AI-modeller med optimerade prompts.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {/* Usage Status Bar */}
        {userStatus && (
          <div className="mb-8 p-4 bg-white/[0.03] backdrop-blur-sm rounded-xl border border-white/[0.06]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant={userStatus.plan === "pro" ? "default" : "secondary"} className="gap-1">
                  {userStatus.plan === "pro" && <Crown className="w-3 h-3" />}
                  {userStatus.plan === "pro" ? "Pro" : "Gratis"}
                </Badge>
                <span className="text-sm text-white/60">
                  <span className="font-semibold text-white">{userStatus.promptsRemaining}</span> av {userStatus.dailyLimit} optimeringar kvar idag
                </span>
              </div>
              {userStatus.plan === "free" && (
                <Button 
                  size="sm" 
                  className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 shadow-lg shadow-violet-500/25" 
                  data-testid="button-upgrade-header"
                  onClick={handleUpgrade}
                  disabled={isCheckoutPending}
                >
                  {isCheckoutPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Crown className="w-4 h-4" />
                  )}
                  Uppgradera till Pro
                </Button>
              )}
            </div>
            {userStatus.promptsRemaining <= 1 && userStatus.plan === "free" && (
              <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-200">
                  {userStatus.promptsRemaining === 0 
                    ? "Du har använt alla dina gratis optimeringar idag. Uppgradera till Pro för obegränsat!"
                    : "Bara 1 optimering kvar! Uppgradera till Pro för obegränsat antal."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Limit Error */}
        {limitError && (
          <div className="mb-6 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-200 font-medium">{limitError}</p>
                <Button 
                  size="sm" 
                  className="mt-3 gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0" 
                  data-testid="button-upgrade-limit"
                  onClick={handleUpgrade}
                  disabled={isCheckoutPending}
                >
                  {isCheckoutPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Crown className="w-4 h-4" />
                  )}
                  Uppgradera till Pro
                </Button>
              </div>
            </div>
          </div>
        )}

        <PromptForm 
          onSubmit={handleSubmit} 
          isPending={isPending} 
          disabled={isLimitReached || false}
        />

        {result && (
          <div id="results">
            <ResultSection result={result} />
          </div>
        )}

        {/* History Section for Pro users */}
        <div className="mt-12">
          <PromptHistory />
        </div>

        {/* How it works */}
        <section className="mt-24 space-y-12">
          <h2 className="text-3xl font-bold text-center text-white">Hur det fungerar</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 mx-auto flex items-center justify-center text-lg font-bold text-violet-300">1</div>
              <h3 className="font-semibold text-white">Klistra in din prompt</h3>
              <p className="text-sm text-white/50">Börja med din idé eller råa text.</p>
            </div>
            <div className="space-y-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 mx-auto flex items-center justify-center text-lg font-bold text-violet-300">2</div>
              <h3 className="font-semibold text-white">Vi optimerar den</h3>
              <p className="text-sm text-white/50">Vi använder AI best practices för att förbättra strukturen.</p>
            </div>
            <div className="space-y-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 mx-auto flex items-center justify-center text-lg font-bold text-violet-300">3</div>
              <h3 className="font-semibold text-white">Kopiera & använd</h3>
              <p className="text-sm text-white/50">Få bättre svar från din AI omedelbart.</p>
            </div>
          </div>
        </section>

        {/* Why PromptForge */}
        <section className="mt-32 p-8 md:p-12 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06]">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Varför PromptForge?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Tydligare instruktioner</h4>
                <p className="text-white/50 text-sm">Minskar risken för missförstånd.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Bättre struktur</h4>
                <p className="text-white/50 text-sm">Logiskt uppbyggda prompts.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Smartare kontext</h4>
                <p className="text-white/50 text-sm">AI får rätt bakgrundsinformation.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Högre kvalitet</h4>
                <p className="text-white/50 text-sm">Bättre svar från alla AI-modeller.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-32 mb-20">
          <h2 className="text-3xl font-bold text-center text-white mb-4">Prissättning</h2>
          <p className="text-center text-white/50 mb-12">Välj den plan som passar dig</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-8 bg-white/[0.03] border-white/[0.08] backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-2 text-white">Gratis</h3>
              <p className="text-4xl font-extrabold mb-6 text-white">0 kr<span className="text-base font-normal text-white/40">/mån</span></p>
              <ul className="space-y-4 text-white/70 mb-8">
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> 3 optimeringar per dag</li>
                <li className="flex items-center gap-3 text-white/30"><AlertCircle className="w-4 h-4" /> Obegränsat antal prompts</li>
                <li className="flex items-center gap-3 text-white/30"><AlertCircle className="w-4 h-4" /> Pro-support</li>
              </ul>
              <Button variant="outline" className="w-full border-white/10 text-white/70 hover:bg-white/5" data-testid="button-free-plan">Nuvarande plan</Button>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border-violet-500/30 relative overflow-visible glow-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold rounded-full shadow-lg">POPULÄR</div>
              <h3 className="text-xl font-bold mb-2 text-white mt-2">Pro</h3>
              <p className="text-4xl font-extrabold mb-6 text-white">99 kr<span className="text-base font-normal text-white/40">/mån</span></p>
              <ul className="space-y-4 text-white/80 mb-8">
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> 100 optimeringar per dag</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Prompthistorik</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Avancerade förslag</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Prioriterad AI-modell</li>
              </ul>
              <Button 
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 shadow-lg shadow-violet-500/25" 
                data-testid="button-pro-plan"
                onClick={handleUpgrade}
                disabled={isCheckoutPending}
              >
                {isCheckoutPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Crown className="w-4 h-4 mr-2" />
                )}
                Uppgradera nu
              </Button>
            </Card>
          </div>
        </section>

      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-white/40 text-sm">
          <p>© {new Date().getFullYear()} PromptForge. Byggd för bättre AI-interaktioner.</p>
        </div>
      </footer>
    </div>
  );
}
