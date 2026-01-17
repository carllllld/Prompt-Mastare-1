import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { PromptForm } from "@/components/PromptForm";
import { AuthModal } from "@/components/AuthModal";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { type OptimizeResponse } from "@shared/schema";
import { 
  Zap, Loader2, HomeIcon, LogOut, Sparkles, Check, 
  PenTool, Target, MapPin, ClipboardCheck, AlertCircle,
  Building, Home as HomeIconAlt
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [result, setResult] = useState<any | null>(null); // Använder any här för att stödja den nya utökade JSON-strukturen
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleSubmit = (data: { prompt: string; type: string; platform: string }) => {
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
                <Link href="/history" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors hidden sm:block" data-testid="link-history">
                  Historik
                </Link>
                <Link href="/teams" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors hidden sm:block" data-testid="link-teams">
                  Teams
                </Link>
                <span className="text-sm font-medium text-slate-400 hidden sm:block">|</span>
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
              Vår AI analyserar arkitektur, område och målgrupp för att skapa en perfekt objektbeskrivning.
            </p>
          </div>
        </section>

        {/* FORM SECTION */}
        <section className="max-w-4xl mx-auto px-6 -mt-12 pb-20 relative z-10">
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

          {/* RESULTATVISNING MED DEN NYA MASTER-LOGIKEN */}
          {result && (
            <div id="results" className="mt-16 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">

              {/* HEMNET-STIL HIGHLIGHTS */}
              {result.highlights && result.highlights.length > 0 && (
                <Card className="bg-gradient-to-r from-indigo-50 to-white border-indigo-200 shadow-lg">
                  <CardContent className="pt-6 pb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Topphöjdpunkter</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {result.highlights.map((highlight: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-indigo-100 shadow-sm">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span className="text-slate-700 text-sm font-medium">{highlight.replace(/^✓\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* TOPP-ANALYS: EPOK, MÅLGRUPP & OMRÅDE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {result.analysis?.identified_epoch && (
                  <Card className="bg-slate-50/50 border-amber-100 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Building className="w-5 h-5 text-amber-600" />
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Arkitektur</h3>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {result.analysis.identified_epoch}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-slate-50/50 border-indigo-100 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Målgrupp</h3>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {result.analysis?.target_group || "Analyserar köparprofilering..."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-50/50 border-emerald-100 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Områdesanalys</h3>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {result.analysis?.area_advantage || "Hämtar lokal kännedom om området..."}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* FÖRENINGSSTATUS (om bostadsrätt) */}
              {result.analysis?.association_status && (
                <Card className="bg-gradient-to-r from-emerald-50 to-white border-emerald-200 shadow-sm">
                  <CardContent className="pt-6 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <HomeIconAlt className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Föreningsekonomi</h3>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {result.analysis.association_status}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* KOM IHÅG (DINA VIKTIGA PUNKTER) */}
              {result.critical_gaps && result.critical_gaps.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-amber-800 font-black uppercase tracking-tighter text-xl">
                    <ClipboardCheck className="w-6 h-6" />
                    Kom ihåg
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                    {result.critical_gaps.map((gap: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-amber-900/80 text-sm font-medium">
                        <span className="text-amber-400 mt-1">•</span> {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* HUVUDTEXTEN */}
              <Card className="border-4 border-slate-900 shadow-2xl overflow-hidden bg-white">
                <div className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-black uppercase tracking-widest">Premium Objektbeskrivning</span>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white border-none font-bold"
                    onClick={() => {
                      navigator.clipboard.writeText(result.improvedPrompt);
                      toast({ title: "Kopierat!", description: "Texten finns nu i ditt urklipp." });
                    }}
                  >
                    Kopiera allt
                  </Button>
                </div>
                <CardContent className="p-8 md:p-12">
                  <div className="prose prose-slate max-w-none">
                    <p className="whitespace-pre-wrap leading-[1.8] text-slate-800 text-lg md:text-xl font-serif">
                      {result.improvedPrompt}
                    </p>
                  </div>

                  <div className="mt-12 pt-8 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Teaser för sociala medier</h4>
                    <p className="text-slate-600 italic font-medium">
                      {result.socialCopy}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* PRO TIPS BOXAR */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {result.pro_tips?.map((tip: string, i: number) => (
                  <div key={i} className="bg-white border-2 border-indigo-600 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Zap className="w-12 h-12 text-indigo-600" />
                    </div>
                    <div className="text-[10px] font-black text-indigo-600 uppercase mb-2">Pro Tip #{i+1}</div>
                    <p className="text-sm font-bold text-slate-800 leading-snug">
                      {tip}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-10">
                <Button variant="outline" onClick={() => setResult(null)} className="rounded-full px-8 py-6 border-slate-200 text-slate-500 hover:text-indigo-600 transition-all">
                  Skapa en ny beskrivning
                </Button>
              </div>

            </div>
          )}
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 max-w-5xl mx-auto px-6 border-t border-slate-100">
          <h2 className="text-3xl font-bold text-center !text-slate-900 mb-16">Why OptiPrompt?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
             <div className="space-y-4">
               <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto font-bold text-xl"><Check className="w-6 h-6" /></div>
               <h3 className="text-lg font-bold !text-slate-900">Mäklar-DNA</h3>
               <p className="text-slate-500 text-sm">Vår AI är tränad på tusentals svenska objektbeskrivningar, arkitekturstilar och god mäklarsed.</p>
             </div>
             <div className="space-y-4">
               <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto font-bold text-xl"><Target className="w-6 h-6" /></div>
               <h3 className="text-lg font-bold !text-slate-900">Marknadspsykologi</h3>
               <p className="text-slate-500 text-sm">Vi analyserar målgrupp och område för att skapa texter som faktiskt leder till fler visningsbokningar.</p>
             </div>
             <div className="space-y-4">
               <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto font-bold text-xl"><Sparkles className="w-6 h-6" /></div>
               <h3 className="text-lg font-bold !text-slate-900">Klyschfri Garanti</h3>
               <p className="text-slate-500 text-sm">Vi städar automatiskt bort trötta uttryck som "ljus och fräsch" och ersätter dem med säljande fakta.</p>
             </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section className="py-24 bg-slate-50 border-t border-slate-200" id="pricing">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center !text-slate-900 mb-4">Simple Pricing</h2>
            <p className="text-center text-slate-600 mb-16 max-w-2xl mx-auto">
              Start free and upgrade when you need more. No credit card required.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* FREE */}
              <Card className="relative overflow-hidden border-slate-200 !bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold !text-slate-900">Free</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-black !text-slate-900">$0</span>
                    <span className="text-slate-500">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 2 optimizations per day</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 500 character limit</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Basic AI model</li>
                  </ul>
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                </CardContent>
              </Card>

              {/* BASIC */}
              <Card className="relative overflow-hidden border-indigo-200 !bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold !text-slate-900">Basic</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-black !text-slate-900">$3.99</span>
                    <span className="text-slate-500">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 20 optimizations per day</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 1000 character limit</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Standard AI model</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> History saved</li>
                  </ul>
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                      if (!isAuthenticated) {
                        setAuthModalOpen(true);
                        return;
                      }
                      startCheckout("basic");
                    }}
                    data-testid="button-upgrade-basic"
                  >
                    Upgrade to Basic
                  </Button>
                </CardContent>
              </Card>

              {/* PRO */}
              <Card className="relative overflow-hidden border-2 border-indigo-600 !bg-white shadow-xl">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold !text-slate-900">Pro</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-black !text-slate-900">$6.99</span>
                    <span className="text-slate-500">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 50 optimizations per day</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 2000 character limit</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> GPT-4o (Advanced AI)</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Priority support</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Team collaboration</li>
                  </ul>
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                      if (!isAuthenticated) {
                        setAuthModalOpen(true);
                        return;
                      }
                      startCheckout("pro");
                    }}
                    data-testid="button-upgrade-pro"
                  >
                    Upgrade to Pro
                  </Button>
                </CardContent>
              </Card>
            </div>
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