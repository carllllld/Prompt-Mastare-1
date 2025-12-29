import { useState, useEffect } from "react";
import { PromptForm } from "@/components/PromptForm";
import { ResultSection } from "@/components/ResultSection";
import { PromptHistory } from "@/components/PromptHistory";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { type OptimizeResponse } from "@shared/schema";
import { Zap, Crown, AlertCircle, Loader2, Globe } from "lucide-react";
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
        title: "Payment successful!",
        description: "You now have access to the Pro plan. Thank you for your support!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
      window.history.replaceState({}, "", "/");
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Payment canceled",
        description: "You canceled the payment. Try again when you're ready.",
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
            <span>Intelligent prompts. Superior results.</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-white">Prompt</span>
            <span className="text-gradient">Forge</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed font-medium">
            Transform your AI prompts into powerful instructions
          </p>
          <p className="mt-4 text-white/50 max-w-xl mx-auto text-base">
            Stop guessing. Get better responses from ChatGPT, Claude, and other AI models with optimized prompts.
          </p>
          
          {/* Language support badge */}
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
            <Globe className="w-3.5 h-3.5" />
            <span>Write prompts in any language</span>
          </div>
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
                  {userStatus.plan === "pro" ? "Pro" : "Free"}
                </Badge>
                <span className="text-sm text-white/60">
                  <span className="font-semibold text-white">{userStatus.promptsRemaining}</span> of {userStatus.dailyLimit} optimizations left today
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
                  Upgrade to Pro
                </Button>
              )}
            </div>
            {userStatus.promptsRemaining <= 1 && userStatus.plan === "free" && (
              <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-200">
                  {userStatus.promptsRemaining === 0 
                    ? "You've used all your free optimizations today. Upgrade to Pro for unlimited access!"
                    : "Only 1 optimization left! Upgrade to Pro for unlimited access."}
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
                  Upgrade to Pro
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
          <h2 className="text-3xl font-bold text-center text-white">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 mx-auto flex items-center justify-center text-lg font-bold text-violet-300">1</div>
              <h3 className="font-semibold text-white">Paste your prompt</h3>
              <p className="text-sm text-white/50">Start with your idea or raw text.</p>
            </div>
            <div className="space-y-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 mx-auto flex items-center justify-center text-lg font-bold text-violet-300">2</div>
              <h3 className="font-semibold text-white">We optimize it</h3>
              <p className="text-sm text-white/50">We use AI best practices to improve the structure.</p>
            </div>
            <div className="space-y-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 mx-auto flex items-center justify-center text-lg font-bold text-violet-300">3</div>
              <h3 className="font-semibold text-white">Copy & use</h3>
              <p className="text-sm text-white/50">Get better responses from your AI instantly.</p>
            </div>
          </div>
        </section>

        {/* Why PromptForge */}
        <section className="mt-32 p-8 md:p-12 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06]">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Why PromptForge?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Clearer instructions</h4>
                <p className="text-white/50 text-sm">Reduces the risk of misunderstandings.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Better structure</h4>
                <p className="text-white/50 text-sm">Logically organized prompts.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Smarter context</h4>
                <p className="text-white/50 text-sm">AI gets the right background information.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Higher quality</h4>
                <p className="text-white/50 text-sm">Better responses from all AI models.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-32 mb-20">
          <h2 className="text-3xl font-bold text-center text-white mb-4">Pricing</h2>
          <p className="text-center text-white/50 mb-12">Choose the plan that suits you</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-8 bg-white/[0.03] border-white/[0.08] backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-2 text-white">Free</h3>
              <p className="text-4xl font-extrabold mb-6 text-white">$0<span className="text-base font-normal text-white/40">/mo</span></p>
              <ul className="space-y-4 text-white/70 mb-8">
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> 3 optimizations per day</li>
                <li className="flex items-center gap-3 text-white/30"><AlertCircle className="w-4 h-4" /> Unlimited prompts</li>
                <li className="flex items-center gap-3 text-white/30"><AlertCircle className="w-4 h-4" /> Pro support</li>
              </ul>
              <Button variant="outline" className="w-full border-white/10 text-white/70 hover:bg-white/5" data-testid="button-free-plan">Current plan</Button>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border-violet-500/30 relative overflow-visible glow-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold rounded-full shadow-lg">POPULAR</div>
              <h3 className="text-xl font-bold mb-2 text-white mt-2">Pro</h3>
              <p className="text-4xl font-extrabold mb-6 text-white">$9.99<span className="text-base font-normal text-white/40">/mo</span></p>
              <ul className="space-y-4 text-white/80 mb-8">
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> 100 optimizations per day</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Prompt history</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Advanced suggestions</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Priority AI model</li>
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
                Upgrade now
              </Button>
            </Card>
          </div>
        </section>

      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-white/40 text-sm">
          <p>&copy; {new Date().getFullYear()} PromptForge. Built for better AI interactions.</p>
        </div>
      </footer>
    </div>
  );
}
