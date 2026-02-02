import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { PromptFormProfessionalClean } from "@/components/PromptFormProfessionalClean";
import { AuthModal } from "@/components/AuthModal";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { type OptimizeResponse } from "@shared/schema";
import { 
  Zap, Loader2, HomeIcon, LogOut, Sparkles, Check, 
  PenTool, Target, MapPin, ClipboardCheck, AlertCircle,
  Building, Home as HomeIconAlt, FileText, Copy, TrendingUp, Users, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Kopierat!", description: "Texten finns nu i ditt urklipp." });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* NAVIGATION */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gray-800 p-1.5 rounded-lg text-white">
              <HomeIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-gray-900">Mäklartexter <span className="text-gray-600">För Fastighetsmäklare</span></span>
          </div>

          <div className="flex items-center gap-4">
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link href="/history" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
                  Historik
                </Link>
                {user?.plan === "pro" && (
                  <Link href="/teams" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
                    Teams
                  </Link>
                )}
                <span className="text-sm font-medium text-gray-400 hidden sm:block">|</span>
                <span className="text-sm font-medium text-gray-600 hidden sm:block">{user?.email}</span>
                <Button variant="ghost" size="sm" onClick={() => logout()} className="text-gray-600 hover:text-gray-900">
                  <LogOut className="w-4 h-4 mr-2" /> Logga ut
                </Button>
              </div>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)} className="bg-gray-800 hover:bg-gray-900 text-white px-6">
                Logga in
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="py-20 bg-gray-50 border-b border-gray-200 text-center">
          <div className="max-w-4xl mx-auto px-6">
            <Badge className="mb-6 bg-gray-100 text-gray-700 border-gray-300 px-4 py-1 text-xs font-bold">
              Professionellt verktyg för svenska fastighetsmäklare
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
              Sälj bostaden med <span className="text-gray-800">rätt ord.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Skapa professionella objektbeskrivningar som når rätt köpare och genererar fler visningar.
            </p>
          </div>
        </section>

        {/* FORM SECTION */}
        <section className="max-w-4xl mx-auto px-6 -mt-12 pb-20 relative z-10">
          <Card className="p-6 md:p-8 shadow-lg border border-gray-200 bg-white">
            {userStatus && (
              <div className="mb-8 flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {userStatus.promptsRemaining} av {userStatus.monthlyLimit} texter kvar denna månad
                  </span>
                </div>
                {userStatus.plan !== "pro" && (
                  <button onClick={() => startCheckout("pro")} className="text-sm font-medium text-gray-800 hover:underline">
                    Uppgradera
                  </button>
                )}
              </div>
            )}

            <PromptFormProfessionalClean 
              onSubmit={handleSubmit} 
              isPending={isPending} 
              disabled={userStatus?.promptsRemaining === 0}
            />
          </Card>

          {/* RESULTATVISNING */}
          {result && (
            <div id="results" className="mt-16 space-y-10">

              {/* HIGHLIGHTS */}
              {result.highlights && result.highlights.length > 0 && (
                <Card className="bg-gray-50 border-gray-200">
                  <CardContent className="pt-6 pb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-gray-700" />
                      <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Topphöjdpunkter</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {result.highlights.map((highlight: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 bg-white p-3 rounded-lg border border-gray-200">
                          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 leading-relaxed">{highlight.replace(/^✓\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ANALYSIS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {result.analysis?.identified_epoch && (
                  <Card className="bg-white border-gray-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Building className="w-5 h-5 text-gray-600" />
                        <h4 className="font-semibold text-gray-800">Arkitektur</h4>
                      </div>
                      <p className="text-gray-600 text-sm">{result.analysis.identified_epoch}</p>
                    </CardContent>
                  </Card>
                )}
                
                <Card className="bg-white border-gray-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-gray-600" />
                      <h4 className="font-semibold text-gray-800">Målgrupp</h4>
                    </div>
                    <p className="text-gray-600 text-sm">
                      {result.analysis?.target_group || "Analyserar köparprofilering..."}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-white border-gray-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-gray-600" />
                      <h4 className="font-semibold text-gray-800">Områdesanalys</h4>
                    </div>
                    <p className="text-gray-600 text-sm">
                      {result.analysis?.area_advantage || "Hämtar lokal kännedom..."}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* ASSOCIATION STATUS */}
              {result.analysis?.association_status && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <HomeIconAlt className="w-5 h-5 text-green-700" />
                      <h3 className="font-bold text-green-800 text-sm uppercase tracking-wider">Föreningsekonomi</h3>
                    </div>
                    <p className="text-green-900">{result.analysis.association_status}</p>
                  </CardContent>
                </Card>
              )}

              {/* CRITICAL GAPS */}
              {result.critical_gaps && result.critical_gaps.length > 0 && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <h3 className="font-bold text-amber-800 text-sm uppercase tracking-wider">Viktigt att komma ihåg</h3>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.critical_gaps.map((gap: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-amber-900 text-sm">
                          <span className="text-amber-600 mt-1">•</span>
                          <span className="font-medium">{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* MAIN TEXT */}
              <Card className="bg-white border-2 border-gray-800 shadow-lg">
                <CardContent className="pt-8">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-800 p-2 rounded-lg">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Professionell objektbeskrivning</h3>
                        <p className="text-gray-500 text-sm">Optimerad för {result.platform === "hemnet" ? "Hemnet" : "Booli/Egen sida"}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => copyToClipboard(result.improvedPrompt)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Kopiera allt
                    </Button>
                  </div>
                  
                  <div className="prose prose-lg max-w-none">
                    <p className="whitespace-pre-wrap text-gray-800 leading-relaxed font-serif text-lg">
                      {result.improvedPrompt}
                    </p>
                  </div>

                  {result.socialCopy && (
                    <div className="mt-8 pt-8 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Sociala medier</h4>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-gray-700 italic">{result.socialCopy}</p>
                      </div>
                    </div>
                  )}

                  {/* Writing Plan */}
                  {result.writingPlan && (
                    <div className="mt-8 pt-8 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Skrivplan</h4>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <ul className="space-y-2">
                          {result.writingPlan.writing_plan?.map((item: string, i: number) => (
                            <li key={i} className="text-gray-700 text-sm">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PRO TIPS */}
              {result.pro_tips && result.pro_tips.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {result.pro_tips.map((tip: string, i: number) => (
                    <Card key={i} className="bg-gray-50 border-gray-200 relative overflow-hidden">
                      <CardContent className="pt-6">
                        <div className="absolute top-0 right-0 opacity-10">
                          <Zap className="w-16 h-16 text-gray-600" />
                        </div>
                        <div className="relative">
                          <div className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Pro Tips #{i+1}</div>
                          <p className="text-gray-800 font-medium leading-relaxed text-sm">{tip}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* QUALITY SCORES */}
              {result.qualityScores && (
                <Card className="bg-white border-gray-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Shield className="w-5 h-5 text-gray-700" />
                      <h3 className="text-xl font-semibold text-gray-900">Kvalitetsbedömning</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{result.qualityScores.factCheck}/10</div>
                        <div className="text-sm text-gray-600">Faktakoll</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{result.qualityScores.legalCompliance}/10</div>
                        <div className="text-sm text-gray-600">Juridisk</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{result.qualityScores.salesEffectiveness}/10</div>
                        <div className="text-sm text-gray-600">Säljkraft</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-600">{result.qualityScores.languageQuality}/10</div>
                        <div className="text-sm text-gray-600">Språk</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* NEW DESCRIPTION BUTTON */}
              <div className="text-center pt-8">
                <Button 
                  variant="outline" 
                  onClick={() => setResult(null)}
                  className="px-8 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Skapa ny beskrivning
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Auth Modal */}
      {authModalOpen && (
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      )}
    </div>
  );
}
