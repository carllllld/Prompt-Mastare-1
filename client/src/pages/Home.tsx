import { useState, useEffect, useMemo } from "react";
import { PromptForm } from "@/components/PromptForm";
import { ResultSection } from "@/components/ResultSection";
import { PromptHistory } from "@/components/PromptHistory";
import { AuthModal } from "@/components/AuthModal";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { type OptimizeResponse } from "@shared/schema";
import { Zap, Crown, AlertCircle, Loader2, Globe, LogIn, LogOut, User, Clock } from "lucide-react";
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
        return "Resets now";
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    };
    
    setTimeLeft(calculateTimeLeft());
    
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [resetTime]);
  
  return timeLeft;
}

export default function Home() {
  const { mutate, isPending } = useOptimize();
  const { data: userStatus, isLoading: statusLoading } = useUserStatus();
  const resetTimeLeft = useCountdown(userStatus?.resetTime);
  const { mutate: startCheckout, isPending: isCheckoutPending } = useStripeCheckout();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({
        title: "Payment successful!",
        description: "You now have access to the Pro plan. Thank you for your support!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
      queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
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

  const handleLogin = () => {
    setAuthModalOpen(true);
  };

  const handleLogout = () => {
    logout();
  };

  const handleUpgrade = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to upgrade to Pro.",
      });
      setAuthModalOpen(true);
      return;
    }
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
        } else {
          toast({
            title: "Optimization failed",
            description: error?.message || "Something went wrong. Please try again.",
            variant: "destructive",
          });
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
        
        {/* Top nav bar */}
        <div className="relative z-20 flex items-center justify-between gap-4 px-4 sm:px-6 py-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-400" />
            <span className="font-bold text-white">OptiPrompt</span>
          </div>
          <div className="flex items-center gap-3">
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white/50" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-violet-600/20 text-violet-300 text-xs">
                      {user.email?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white/70 hidden sm:inline">
                    {user.email?.split("@")[0] || "User"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-white/70 hover:text-white gap-1.5"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Log out</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogin}
                className="border-white/10 text-white gap-1.5"
                data-testid="button-login"
              >
                <LogIn className="w-4 h-4" />
                Log in
              </Button>
            )}
          </div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-20 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-violet-300 text-sm font-medium mb-8 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5" />
            <span>Intelligent prompts. Superior results.</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-white">Opti</span>
            <span className="text-gradient">Prompt</span>
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
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant={userStatus.plan === "pro" ? "default" : "secondary"} className="gap-1">
                  {userStatus.plan === "pro" && <Crown className="w-3 h-3" />}
                  {userStatus.plan === "pro" ? "Pro" : "Free"}
                </Badge>
                <span className="text-sm text-white/60">
                  <span className="font-semibold text-white">{userStatus.promptsRemaining}</span> of {userStatus.dailyLimit} optimizations left
                </span>
                {resetTimeLeft && (
                  <span className="text-sm text-white/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Resets in {resetTimeLeft}
                  </span>
                )}
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
                    ? `You've used all your free optimizations today. ${resetTimeLeft ? `Resets in ${resetTimeLeft}.` : ""} Upgrade to Pro for more!`
                    : "Only 1 optimization left! Upgrade to Pro for more."}
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

        <div id="prompt-form">
          <PromptForm 
            onSubmit={handleSubmit} 
            isPending={isPending} 
            disabled={isLimitReached || false}
            clearOnSuccess={true}
          />
        </div>

        {result && (
          <div id="results">
            <ResultSection 
              result={result} 
              onNewPrompt={() => {
                setResult(null);
                setTimeout(() => {
                  const formElement = document.getElementById("prompt-form");
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }, 100);
              }}
            />
          </div>
        )}

        {/* History Section for Pro users */}
        {isAuthenticated && userStatus?.plan === "pro" && (
          <div className="mt-12">
            <PromptHistory />
          </div>
        )}

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

        {/* Why OptiPrompt */}
        <section className="mt-32 p-8 md:p-12 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06]">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Why OptiPrompt?</h2>
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
          <h2 className="text-3xl font-bold text-center text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-white/50 mb-12">Start free. Upgrade when you need more power.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-8 bg-white/[0.03] border-white/[0.08] backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-1 text-white">Free</h3>
              <p className="text-sm text-white/50 mb-4">Perfect for trying it out</p>
              <p className="text-4xl font-extrabold mb-6 text-white">0 kr<span className="text-base font-normal text-white/40">/mo</span></p>
              <ul className="space-y-4 text-white/70 mb-8">
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> 2 optimizations per day</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Up to 500 characters</li>
                <li className="flex items-center gap-3 text-white/30"><AlertCircle className="w-4 h-4" /> No saved history</li>
                <li className="flex items-center gap-3 text-white/30"><AlertCircle className="w-4 h-4" /> Basic suggestions</li>
              </ul>
              <Button variant="outline" className="w-full border-white/10 text-white/70 hover:bg-white/5" data-testid="button-free-plan">Get started free</Button>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border-violet-500/30 relative overflow-visible glow-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold rounded-full shadow-lg">BEST VALUE</div>
              <h3 className="text-xl font-bold mb-1 text-white mt-2">Pro</h3>
              <p className="text-sm text-violet-300 mb-4">For daily AI users</p>
              <p className="text-4xl font-extrabold mb-2 text-white">69 kr<span className="text-base font-normal text-white/40">/mo</span></p>
              <p className="text-xs text-white/40 mb-6">Less than 3 kr per day</p>
              <ul className="space-y-4 text-white/80 mb-6">
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> <span><strong className="text-white">50 optimizations</strong> per day</span></li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> <span><strong className="text-white">2000 characters</strong> - 4x more space</span></li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Full prompt history saved</li>
                <li className="flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400" /> Advanced AI suggestions</li>
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
                {isAuthenticated ? "Upgrade to Pro" : "Log in to upgrade"}
              </Button>
              <p className="text-center text-xs text-white/40 mt-3">Cancel anytime. No commitments.</p>
            </Card>
          </div>
        </section>

      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-white/40 text-sm">
          <p>&copy; {new Date().getFullYear()} OptiPrompt. Built for better AI interactions.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}
