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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <HomeIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">OptiPrompt</span>
          </div>

          <div className="flex items-center gap-4">
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-600 hidden sm:block">{user?.email}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
                  <LogOut className="w-4 h-4 mr-2" /> Logga ut
                </Button>
              </div>
            ) : (
              <Button variant="default" size="sm" onClick={handleLogin} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
                Logga in
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 bg-white border-b">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <Badge variant="outline" className="mb-6 border-indigo-100 bg-indigo-50 text-indigo-600 px-4 py-1 rounded-full">
              För professionella fastighetsmäklare
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
              Sälj bostaden med <span className="text-indigo-600">rätt ord.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Skapa engagerande objektbeskrivningar på sekunder. Mata in din fakta, låt vår AI sköta formuleringarna.
            </p>
          </div>
        </section>

        {/* Form Section */}
        <section className="max-w-3xl mx-auto px-6 -mt-10 pb-20">
          <Card className="p-2 shadow-xl border-none bg-white rounded-2xl">
            <div className="bg-white rounded-xl p-4 sm:p-6">
              {userStatus && (
                <div className="mb-6 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-slate-600">
                      {userStatus.promptsRemaining} av {userStatus.dailyLimit} texter kvar idag
                    </span>
                  </div>
                  {userStatus.plan !== "pro" && (
                    <button onClick={() => handleUpgrade("pro")} className="text-xs font-bold text-indigo-600 hover:underline">
                      Uppgradera för mer
                    </button>
                  )}
                </div>
              )}

              <PromptForm 
                onSubmit={handleSubmit} 
                isPending={isPending} 
                disabled={userStatus?.promptsRemaining === 0}
                clearOnSuccess={true}
              />
            </div>
          </Card>

          {result && (
            <div id="results" className="mt-12">
              <ResultSection result={result} onNewPrompt={() => setResult(null)} />
            </div>
          )}
        </section>

        {/* Features */}
        <section className="py-24 max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Mäklarkvalitet</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Vår AI är tränad på tusentals framgångsrika svenska bostadsannonser för att hitta rätt tonläge.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Blixtsnabbt</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Spara upp till 2 timmar per objekt. Fokusera på kunderna istället för att leta efter adjektiv.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <PenTool className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Enkelt att använda</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Ingen krånglig "prompting". Fyll bara i faktan så sköter OptiPrompt resten.</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-slate-100/50 border-y border-slate-200">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-16">Enkla priser för alla behov</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Free Plan */}
              <Card className="p-10 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow text-left flex flex-col">
                <h3 className="text-slate-500 font-medium uppercase tracking-wider text-xs mb-2">För nystartade</h3>
                <div className="text-3xl font-bold mb-6">Gratis</div>
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-4 h-4 text-emerald-500" /> 2 texter per dag</li>
                  <li className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-4 h-4 text-emerald-500" /> Standard AI-modell</li>
                </ul>
                <Button variant="outline" className="w-full border-slate-200 rounded-full">Nuvarande plan</Button>
              </Card>

              {/* Pro Plan */}
              <Card className="p-10 border-indigo-600 bg-white shadow-lg relative text-left flex flex-col ring-1 ring-indigo-600">
                <div className="absolute -top-4 right-8 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Rekommenderas</div>
                <h3 className="text-indigo-600 font-medium uppercase tracking-wider text-xs mb-2">För proffsen</h3>
                <div className="text-3xl font-bold mb-1">499 kr</div>
                <div className="text-slate-400 text-sm mb-6">per månad / exkl. moms</div>
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-center gap-3 text-sm text-slate-700 font-medium"><Check className="w-4 h-4 text-indigo-600" /> 50 texter per dag</li>
                  <li className="flex items-center gap-3 text-sm text-slate-700 font-medium"><Check className="w-4 h-4 text-indigo-600" /> GPT-4o (Högsta kvalitet)</li>
                  <li className="flex items-center gap-3 text-sm text-slate-700 font-medium"><Check className="w-4 h-4 text-indigo-600" /> Prioriterad support</li>
                </ul>
                <Button onClick={() => handleUpgrade("pro")} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md shadow-indigo-200">Uppgradera nu</Button>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white py-12 border-t">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <HomeIcon className="w-4 h-4" />
            <span className="font-bold text-sm">OptiPrompt Mäklare</span>
          </div>
          <p className="text-slate-400 text-xs">
            &copy; {new Date().getFullYear()} OptiPrompt. Allt innehåll genereras med ansvarsfull AI.
          </p>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}