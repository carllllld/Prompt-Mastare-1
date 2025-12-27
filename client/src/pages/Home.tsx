import { useState, useEffect } from "react";
import { PromptForm } from "@/components/PromptForm";
import { ResultSection } from "@/components/ResultSection";
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header / Hero */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-indigo-500" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Zap className="w-4 h-4 fill-current" />
            <span>AI-Driven Optimering</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 font-display">
            Prompt<span className="text-primary">Forge</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Skriv bättre prompts. Få bättre AI-resultat. Direkt.
          </p>
          <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Sluta gissa hur du ska prata med AI. PromptForge förvandlar vaga prompts till kraftfulla instruktioner.
          </p>
        </div>
        
        {/* Decorative background blobs */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-x-1/3 pointer-events-none" />
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {/* Usage Status Bar */}
        {userStatus && (
          <div className="mb-8 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant={userStatus.plan === "pro" ? "default" : "secondary"} className="gap-1">
                  {userStatus.plan === "pro" && <Crown className="w-3 h-3" />}
                  {userStatus.plan === "pro" ? "Pro" : "Gratis"}
                </Badge>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-bold text-gray-900 dark:text-white">{userStatus.promptsRemaining}</span> av {userStatus.dailyLimit} optimeringar kvar idag
                </span>
              </div>
              {userStatus.plan === "free" && (
                <Button 
                  size="sm" 
                  className="gap-1" 
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
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
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
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 dark:text-red-300 font-medium">{limitError}</p>
                <Button 
                  size="sm" 
                  className="mt-3 gap-1" 
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

        {/* How it works */}
        <section className="mt-24 space-y-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">Hur det fungerar</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm mx-auto flex items-center justify-center text-lg font-bold text-gray-400">1</div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Klistra in din prompt</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Börja med din idé eller råa text.</p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm mx-auto flex items-center justify-center text-lg font-bold text-gray-400">2</div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Vi optimerar den</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Vi använder AI best practices för att förbättra strukturen.</p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm mx-auto flex items-center justify-center text-lg font-bold text-gray-400">3</div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Kopiera & använd</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Få bättre svar från din AI omedelbart.</p>
            </div>
          </div>
        </section>

        {/* Why PromptForge */}
        <section className="mt-32 p-8 md:p-12 bg-white dark:bg-gray-800 rounded-3xl border border-indigo-50 dark:border-gray-700 shadow-sm">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">Varför PromptForge?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Tydligare instruktioner</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Minskar risken för missförstånd.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Bättre struktur</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Logiskt uppbyggda prompts.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Smartare kontext</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm">AI får rätt bakgrundsinformation.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Högre kvalitet</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Bättre svar från alla AI-modeller.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-32 mb-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">Prissättning</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Gratis</h3>
              <p className="text-3xl font-extrabold mb-6 text-gray-900 dark:text-white">0 kr<span className="text-base font-normal text-gray-500">/mån</span></p>
              <ul className="space-y-4 text-gray-600 dark:text-gray-300 mb-8">
                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-green-500" /> 3 optimeringar per dag</li>
                <li className="flex items-center gap-2 text-gray-400"><AlertCircle className="w-4 h-4" /> Obegränsat antal prompts</li>
                <li className="flex items-center gap-2 text-gray-400"><AlertCircle className="w-4 h-4" /> Pro-support</li>
              </ul>
              <Button variant="outline" className="w-full" data-testid="button-free-plan">Nuvarande plan</Button>
            </Card>
            <Card className="p-8 border-primary shadow-xl shadow-primary/10 relative overflow-visible">
              <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-white text-xs font-bold rounded-bl-lg rounded-tr-md">POPULÄR</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Pro</h3>
              <p className="text-3xl font-extrabold mb-6 text-gray-900 dark:text-white">99 kr<span className="text-base font-normal text-gray-500">/mån</span></p>
              <ul className="space-y-4 text-gray-600 dark:text-gray-300 mb-8">
                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-green-500" /> 100 optimeringar per dag</li>
                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-green-500" /> Prompthistorik</li>
                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-green-500" /> Avancerade förslag</li>
                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-green-500" /> Prioriterad AI-modell</li>
              </ul>
              <Button 
                className="w-full" 
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
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} PromptForge. Byggd för bättre AI-interaktioner.</p>
        </div>
      </footer>
    </div>
  );
}
