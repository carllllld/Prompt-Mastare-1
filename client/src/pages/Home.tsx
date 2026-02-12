import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { PromptFormProfessional } from "@/components/PromptFormProfessional";
import { AuthModal } from "@/components/AuthModal";
import { TextImprovement } from "@/components/TextImprovement";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { 
  Loader2, HomeIcon, LogOut, Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

  const handleSubmit = (data: { prompt: string; type: string; platform: string; wordCountMin?: number; wordCountMax?: number }) => {
    console.log("[Home Debug] handleSubmit called with:", data);
    console.log("[Home Debug] isAuthenticated:", isAuthenticated);
    
    if (!isAuthenticated) {
      console.log("[Home Debug] Not authenticated, opening auth modal");
      setAuthModalOpen(true);
      return;
    }
    
    console.log("[Home Debug] Calling mutate with data");
    mutate(data, {
      onSuccess: (data) => {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
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
    <div className="h-screen bg-white text-slate-900 flex flex-col overflow-hidden" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* NAVIGATION */}
      <nav className="border-b border-slate-200 bg-white flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gray-800 p-1 rounded-lg text-white">
              <HomeIcon className="w-4 h-4" />
            </div>
            <span className="font-bold text-base text-slate-900">Mäklartexter</span>
          </div>

          <div className="flex items-center gap-3">
            {authLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 hidden sm:block">{user?.email}</span>
                <Button variant="ghost" size="sm" onClick={() => logout()} className="text-slate-600 hover:text-indigo-600 px-3 py-1 text-xs">
                  <LogOut className="w-3 h-3 mr-1" /> Logga ut
                </Button>
              </div>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)} className="bg-gray-800 hover:bg-gray-900 text-white rounded-full px-4 py-1 text-sm transition-all">
                Logga in
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {/* LEFT SIDE - HERO & FORM */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* COMPACT HERO */}
          <div className="mb-6 text-center">
            <Badge className="mb-3 bg-gray-100 text-gray-700 border-gray-300 px-3 py-1 rounded-full text-[8px] font-bold">
              Professionellt verktyg för fastighetsmäklare
            </Badge>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mb-2">
              Sälj bostaden med <span className="text-gray-800">rätt ord.</span>
            </h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              AI-analyserar arkitektur, område och målgrupp för perfekta objektbeskrivningar.
            </p>
          </div>

          {/* FORM */}
          <div className="flex-1">
            <Card className="p-4 lg:p-6 shadow-lg border border-slate-200 bg-white h-full">
              {userStatus && (
                <div className="mb-4 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700">
                      {userStatus.promptsRemaining} av {userStatus.monthlyLimit} kvar
                    </span>
                  </div>
                  {userStatus.plan !== "pro" && (
                    <button onClick={() => startCheckout("pro")} className="text-xs font-black text-gray-800 uppercase tracking-wider hover:underline">
                      Uppgradera
                    </button>
                  )}
                </div>
              )}

              <PromptFormProfessional 
                onSubmit={handleSubmit} 
                isPending={isPending} 
                disabled={userStatus?.promptsRemaining === 0}
                isPro={userStatus?.plan === "pro"}
              />
            </Card>
          </div>
        </div>

        {/* RIGHT SIDE - RESULTS */}
        <div className="hidden lg:block lg:w-1/2 border-l border-slate-200 p-6 overflow-y-auto">
          <div className="space-y-6">
            {result ? (
              <div id="results" className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="text-center mb-4">
                  <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                    ✅ Objektbeskrivning genererad
                  </Badge>
                </div>

                <Card className="shadow-lg border border-slate-200">
                  <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider">Objektbeskrivning</span>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="bg-indigo-600 hover:bg-indigo-500 text-white border-none text-xs px-3 py-1"
                      onClick={() => {
                        navigator.clipboard.writeText(result.improvedPrompt);
                        toast({ title: "Kopierat!", description: "Texten finns nu i ditt urklipp." });
                      }}
                    >
                      Kopiera
                    </Button>
                  </div>
                  <CardContent className="p-4">
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-800 text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                      {result.improvedPrompt}
                    </p>
                  </CardContent>
                </Card>

                {userStatus?.plan === "pro" && (
                  <TextImprovement 
                    fullText={result.improvedPrompt} 
                    isPro={true}
                    onTextUpdate={(newText) => setResult(prev => prev ? {...prev, improvedPrompt: newText} : null)}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">Resultat visas här</h3>
                  <p className="text-sm text-slate-500">
                    Fyll i formuläret och klicka "Generera" för att skapa objektbeskrivning
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MOBILE RESULTS */}
      {result && (
        <div className="lg:hidden border-t border-slate-200 p-4 bg-white">
          <div className="space-y-4">
            <div className="text-center">
              <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                ✅ Objektbeskrivning genererad
              </Badge>
            </div>

            <Card className="shadow-lg border border-slate-200">
              <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider">Objektbeskrivning</span>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white border-none text-xs px-3 py-1"
                  onClick={() => {
                    navigator.clipboard.writeText(result.improvedPrompt);
                    toast({ title: "Kopierat!", description: "Texten finns nu i ditt urklipp." });
                  }}
                >
                  Kopiera
                </Button>
              </div>
              <CardContent className="p-4">
                <p className="whitespace-pre-wrap leading-relaxed text-slate-800 text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                  {result.improvedPrompt}
                </p>
              </CardContent>
            </Card>

            {userStatus?.plan === "pro" && (
              <TextImprovement 
                fullText={result.improvedPrompt} 
                isPro={true}
                onTextUpdate={(newText) => setResult(prev => prev ? {...prev, improvedPrompt: newText} : null)}
              />
            )}
          </div>
        </div>
      )}

      {/* PRO UPGRADE PROMPT */}
      {!result && userStatus?.plan !== "pro" && (
        <div className="hidden lg:block lg:w-1/2 border-l border-slate-200 p-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Uppgradera till Pro</h3>
              <p className="text-sm text-slate-600 mb-6">
                Få expertkvalitet med AI-analys, längre texter och avancerade funktioner
              </p>
              <Button 
                className="bg-gray-800 hover:bg-gray-900 text-white"
                onClick={() => startCheckout("pro")}
              >
                Uppgradera till Pro - 199kr/mån
              </Button>
            </div>

            {/* PRO EXAMPLE */}
            <Card className="border-2 border-gray-800 shadow-xl">
              <div className="bg-gray-800 text-white px-4 py-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="font-bold text-sm">Pro-exempel</span>
              </div>
              <CardContent className="p-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-bold mb-1 text-slate-700">Highlights:</h4>
                    <ul className="list-none space-y-1 text-xs text-slate-600">
                      <li>✓ Skuldfri förening med 2.3 MSEK i fond</li>
                      <li>✓ Balkong i sydväst med kvällssol</li>
                      <li>✓ 5 min till Odenplan tunnelbana</li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs leading-relaxed text-slate-600">
                      1912 års jugendarkitektur möter modern design i denna karaktärsfulla hörnlägenhet. 
                      Med 3.2 meters takhöjd och bevarad originalstuckatur erbjuder denna tvåa om 58 kvm 
                      en unik kombination av sekelskiftescharm och nutida komfort...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* HOW TO USE */}
            <Card className="border-slate-200">
              <div className="p-4">
                <h4 className="font-bold text-slate-900 mb-3">Så här fungerar det:</h4>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">1</div>
                    <p><strong>Fyll i formuläret</strong> - Adress, pris, yta, rum, byggår</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">2</div>
                    <p><strong>Välj plattform & längd</strong> - Hemnet/Booli, 200-600 ord</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">3</div>
                    <p><strong>Klicka "Generera"</strong> - AI skapar professionell text</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">4</div>
                    <p><strong>Kopiera & anpassa</strong> - Klipp ut och använd direkt</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}
