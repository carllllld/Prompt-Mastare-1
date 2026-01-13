import { useState } from "react";
import { PromptForm } from "@/components/PromptForm";
import { AuthModal } from "@/components/AuthModal";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { 
  Zap, Loader2, HomeIcon, LogOut, Sparkles, Check, 
  Target, MapPin, ClipboardCheck
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
  const [result, setResult] = useState<any | null>(null);
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
          title: "An error occurred",
          description: error?.message || "Failed to optimize prompt.",
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
            <span className="font-bold text-lg !text-slate-900">OptiPrompt</span>
          </div>

          <div className="flex items-center gap-4">
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500 hidden sm:block">{user?.email}</span>
                <Button variant="ghost" size="sm" onClick={() => logout()} className="text-slate-600 hover:text-indigo-600">
                  <LogOut className="w-4 h-4 mr-2" /> Log out
                </Button>
              </div>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 transition-all">
                Login
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
              AI-Powered Prompt Optimization
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black !text-slate-900 tracking-tight mb-6">
              Optimize your <span className="text-indigo-600">AI Prompts.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Craft precise prompts to get better results from ChatGPT, Claude, and more.
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
                    {userStatus.promptsRemaining} of {userStatus.dailyLimit} optimizations left today
                  </span>
                </div>
                {userStatus.plan !== "pro" && (
                  <button onClick={() => startCheckout("pro")} className="text-xs font-black text-indigo-600 uppercase tracking-wider hover:underline">
                    Upgrade
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

          {/* RESULTS VIEW */}
          {result && (
            <div id="results" className="mt-16 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              {/* TOP ANALYSIS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-50/50 border-indigo-100 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Strategy</h3>
                    </div>
                    <ul className="space-y-2">
                      {result.improvements?.map((imp: string, i: number) => (
                        <li key={i} className="text-slate-600 text-sm flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          {imp}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-slate-50/50 border-emerald-100 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Suggestions</h3>
                    </div>
                    <ul className="space-y-2">
                      {result.suggestions?.map((sug: string, i: number) => (
                        <li key={i} className="text-slate-600 text-sm flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                          {sug}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* MAIN TEXT */}
              <Card className="border-4 border-slate-900 shadow-2xl overflow-hidden bg-white">
                <div className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-black uppercase tracking-widest">Improved Prompt</span>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white border-none font-bold"
                    onClick={() => {
                      navigator.clipboard.writeText(result.improvedPrompt);
                      toast({ title: "Copied!", description: "Text copied to clipboard." });
                    }}
                  >
                    Copy All
                  </Button>
                </div>
                <CardContent className="p-8 md:p-12">
                  <div className="prose prose-slate max-w-none">
                    <p className="whitespace-pre-wrap leading-[1.8] text-slate-800 text-lg md:text-xl font-serif">
                      {result.improvedPrompt}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center pt-10">
                <Button variant="outline" onClick={() => setResult(null)} className="rounded-full px-8 py-6 border-slate-200 text-slate-500 hover:text-indigo-600 transition-all">
                  Try another prompt
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
               <h3 className="text-lg font-bold !text-slate-900">Expert AI</h3>
               <p className="text-slate-500 text-sm">Our AI analyzes your prompts and enhances them for better results.</p>
             </div>
             <div className="space-y-4">
               <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto font-bold text-xl"><Target className="w-6 h-6" /></div>
               <h3 className="text-lg font-bold !text-slate-900">Precision Focus</h3>
               <p className="text-slate-500 text-sm">Get clear, specific prompts that give you exactly what you need.</p>
             </div>
             <div className="space-y-4">
               <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto font-bold text-xl"><Sparkles className="w-6 h-6" /></div>
               <h3 className="text-lg font-bold !text-slate-900">Better Results</h3>
               <p className="text-slate-500 text-sm">Get higher quality responses from ChatGPT, Claude, and other AI.</p>
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
            <span className="font-bold text-sm">OptiPrompt</span>
          </div>
          <p className="text-slate-400 text-xs">
            &copy; {new Date().getFullYear()} OptiPrompt. All content generated with AI.
          </p>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}
