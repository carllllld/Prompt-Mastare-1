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
import { Zap, Loader2, HomeIcon, LogOut, Sparkles, Check, PenTool } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen !bg-white !text-slate-900 flex flex-col font-sans">
      {/* NAVIGATION */}
      <nav className="border-b border-slate-200 !bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <HomeIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg !text-slate-900">OptiPrompt <span className="text-indigo-600">Mäklare</span></span>
          </div>

          <div className="flex items-center gap-4">
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500 hidden sm:block">{user?.email}</span>
                <Button variant="ghost" size="sm" onClick={() => logout()} className="text-slate-600 hover:text-indigo-600">
                  <LogOut className="w-4 h-4 mr-2" /> Logga ut
                </Button>
              </div>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 transition-all">
                Logga in
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="py-20 !bg-slate-50 border-b border-slate-200 text-center">
          <div className="max-w-4xl mx-auto px-6">
            <Badge className="mb-6 bg-indigo-100 text-indigo-700 border-indigo-200 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              Specialbyggd AI för svenska fastighetsmäklare
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black !text-slate-900 tracking-tight mb-6">
              Sälj bostaden med <span className="text-indigo-600">rätt ord.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Skapa proffsiga objektbeskrivningar för Hemnet på 30 sekunder. Mata in din fakta, låt vår AI sköta formuleringarna.
            </p>
          </div>
        </section>

        {/* FORM SECTION */}
        <section className="max-w-3xl mx-auto px-6 -mt-12 pb-20 relative z-10">
          <Card className="p-6 md:p-8 shadow-2xl border border-slate-200 !bg-white rounded-2xl">
            {userStatus && (
              <div className="mb-8 flex items-center justify-between !bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold !text-slate-700">
                    {userStatus.promptsRemaining} av {userStatus.dailyLimit} texter kvar idag
                  </span>
                </div>
                {userStatus.plan !== "pro" && (
                  <button onClick={() => startCheckout("pro")} className="text-xs font-black text-indigo-600 uppercase tracking-wider hover:underline">
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

        {/* HOW IT WORKS */}
        <section className="py-24 max-w-5xl mx-auto px-6 border-t border-slate-100">
          <h2 className="text-3xl font-bold text-center !text-slate-900 mb-16">Tre steg till en färdig annons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto font-bold text-xl">1</div>
              <h3 className="text-lg font-bold !text-slate-900">Mata in fakta</h3>
              <p className="text-slate-500 text-sm">Fyll i adress, yta och dina stödanteckningar.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto font-bold text-xl">2</div>
              <h3 className="text-lg font-bold !text-slate-900">AI:n skapar magi</h3>
              <p className="text-slate-500 text-sm">Vår AI anpassar tonläget efter svensk mäklarstandard.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto font-bold text-xl">3</div>
              <h3 className="text-lg font-bold !text-slate-900">Kopiera & Publicera</h3>
              <p className="text-slate-500 text-sm">Klar att användas på Hemnet eller i ditt mäklarsystem.</p>
            </div>
          </div>
        </section>

        {/* WHY OPTIPROMPT */}
        <section className="py-24 !bg-slate-50 border-y border-slate-200 px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600 font-bold border border-slate-100">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg !text-slate-900 mb-2">Svenskt tonläge</h4>
                <p className="text-slate-500 text-sm leading-relaxed">Vi skriver som en mäklare, inte som en maskin. Vi förstår nyanserna i svenska bostadsbeskrivningar.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600 font-bold border border-slate-100">
                <PenTool className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg !text-slate-900 mb-2">Spara timmar</h4>
                <p className="text-slate-500 text-sm leading-relaxed">Gå från rådata till färdigt utkast på under en minut. Mer tid över till visningar och kundvård.</p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section className="py-24 max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center !text-slate-900 mb-16">Prisplaner för framgångsrika mäklare</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* GRATIS */}
            <Card className="p-10 border border-slate-200 !bg-white shadow-sm flex flex-col hover:border-slate-300 transition-all">
              <h3 className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-4">För nystartade</h3>
              <div className="text-4xl font-black !text-slate-900 mb-8">0 kr</div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm !text-slate-600"><Check className="w-4 h-4 text-emerald-500" /> 2 beskrivningar/dag</li>
                <li className="flex items-center gap-3 text-sm !text-slate-600"><Check className="w-4 h-4 text-emerald-500" /> Standard AI-modell</li>
              </ul>
              <Button variant="outline" className="w-full border-slate-200 !text-slate-900 rounded-full h-12">Börja nu</Button>
            </Card>

            {/* PRO */}
            <Card className="p-10 border-2 border-indigo-600 !bg-white shadow-xl relative flex flex-col scale-105 z-10">
              <div className="absolute -top-4 right-10 bg-indigo-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Mest Populär</div>
              <h3 className="text-indigo-600 font-bold uppercase tracking-widest text-[10px] mb-4">För proffsen</h3>
              <div className="text-4xl font-black !text-slate-900 mb-1">499 kr</div>
              <div className="text-slate-400 text-xs mb-8">per månad / exkl. moms</div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm !text-slate-700 font-medium"><Check className="w-4 h-4 text-indigo-600" /> 50 beskrivningar/dag</li>
                <li className="flex items-center gap-3 text-sm !text-slate-700 font-medium"><Check className="w-4 h-4 text-indigo-600" /> Prioriterad GPT-4o access</li>
                <li className="flex items-center gap-3 text-sm !text-slate-700 font-medium"><Check className="w-4 h-4 text-indigo-600" /> Support inom 24h</li>
              </ul>
              <Button onClick={() => startCheckout("pro")} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-12 shadow-lg shadow-indigo-100 font-bold">Uppgradera till Pro</Button>
            </Card>
          </div>
        </section>
      </main>

      <footer className="!bg-white border-t border-slate-200 py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            <HomeIcon className="w-4 h-4" />
            <span className="font-bold text-sm">OptiPrompt Mäklare</span>
          </div>
          <p className="text-slate-400 text-xs">
            &copy; {new Date().getFullYear()} OptiPrompt. Allt innehåll genereras med AI.
          </p>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}