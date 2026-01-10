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
import { Zap, Loader2, HomeIcon, LogOut, Sparkles } from "lucide-react";
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
    <div className="min-h-screen !bg-white !text-black flex flex-col font-sans">
      {/* Nav */}
      <nav className="border-b border-slate-200 !bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <HomeIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-black">OptiPrompt</span>
          </div>

          <div className="flex items-center gap-4">
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : isAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={() => logout()} className="text-slate-600">
                <LogOut className="w-4 h-4 mr-2" /> Logga ut
              </Button>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)} className="bg-indigo-600 text-white rounded-full">
                Logga in
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow !bg-slate-50">
        <section className="py-16 !bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <Badge className="mb-4 bg-indigo-50 text-indigo-700 border-indigo-100 uppercase tracking-widest text-[10px]">
              Professional Edition
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-black mb-4">
              Sälj med <span className="text-indigo-600">rätt ord.</span>
            </h1>
            <p className="text-slate-500 text-lg">Skapa proffsiga bostadsannonser på sekunder.</p>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 -mt-10 pb-20">
          <Card className="p-8 shadow-xl border border-slate-200 !bg-white rounded-2xl">
            {userStatus && (
              <div className="mb-8 flex items-center justify-between !bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-sm font-bold text-slate-700">
                  {userStatus.promptsRemaining} av {userStatus.dailyLimit} texter kvar
                </span>
                {userStatus.plan !== "pro" && (
                  <button onClick={() => startCheckout("pro")} className="text-xs font-black text-indigo-600 uppercase">
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

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}