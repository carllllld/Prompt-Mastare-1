import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { PromptFormProfessional } from "@/components/PromptFormProfessional";
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <HomeIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Mäklartexter</h1>
                  <p className="text-xs text-gray-500">Professionella beskrivningar för mäklare</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : isAuthenticated ? (
                <div className="flex items-center space-x-6">
                  <div className="hidden md:flex items-center space-x-6">
                    <Link href="/history" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                      Historik
                    </Link>
                    {user?.plan === "pro" && (
                      <Link href="/teams" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                        Teams
                      </Link>
                    )}
                    <span className="text-sm text-gray-500">{user?.email}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => logout()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logga ut
                  </Button>
                </div>
              ) : (
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Logga in
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-blue-100 text-blue-800 px-3 py-1">
            <TrendingUp className="w-3 h-3 mr-1" />
            AI-drivet verktyg för fastighetsmäklare
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Skapa objektbeskrivningar som <span className="text-blue-600">säljer</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Professionella, juridiskt säkra och optimerade beskrivningar för Hemnet, Booli och egna kanaler.
          </p>
        </div>

        {/* User Status */}
        {userStatus && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-gray-900">
                    {userStatus.promptsRemaining} av {userStatus.monthlyLimit} texter kvar
                  </p>
                  <p className="text-sm text-gray-500">Denna månad</p>
                </div>
              </div>
              {userStatus.plan !== "pro" && (
                <Button 
                  onClick={() => startCheckout("pro")} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Uppgradera till Pro
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Form Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-12 shadow-sm">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Skapa objektbeskrivning</h3>
                <p className="text-gray-600">Fyll i detaljerna om objektet för att generera en professionell beskrivning</p>
              </div>
            </div>
          </div>

          <PromptFormProfessional 
            onSubmit={handleSubmit} 
            isPending={isPending} 
            disabled={userStatus?.promptsRemaining === 0}
          />
        </div>

        {/* Results */}
        {result && (
          <div id="results" className="space-y-8">
            {/* Highlights */}
            {result.highlights && result.highlights.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Höjdpunkter</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.highlights.map((highlight: string, i: number) => (
                    <div key={i} className="flex items-center space-x-3 bg-white rounded-lg p-4 border border-blue-100">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">{highlight.replace(/^✓\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {result.analysis?.identified_epoch && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <Building className="w-5 h-5 text-amber-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Arkitektur</h4>
                  </div>
                  <p className="text-gray-600">{result.analysis.identified_epoch}</p>
                </div>
              )}
              
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Målgrupp</h4>
                </div>
                <p className="text-gray-600">
                  {result.analysis?.target_group || "Analyserar köparprofilering..."}
                </p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Områdesanalys</h4>
                </div>
                <p className="text-gray-600">
                  {result.analysis?.area_advantage || "Hämtar lokal kännedom..."}
                </p>
              </div>
            </div>

            {/* Association Status */}
            {result.analysis?.association_status && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <HomeIconAlt className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Föreningsekonomi</h3>
                </div>
                <p className="text-gray-700">{result.analysis.association_status}</p>
              </div>
            )}

            {/* Critical Gaps */}
            {result.critical_gaps && result.critical_gaps.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-amber-600 p-2 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-amber-900">Viktigt att komma ihåg</h3>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.critical_gaps.map((gap: string, i: number) => (
                    <li key={i} className="flex items-start space-x-3 text-amber-900">
                      <span className="text-amber-400 mt-1">•</span>
                      <span className="font-medium">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Main Text */}
            <div className="bg-white rounded-xl border-2 border-gray-900 shadow-lg overflow-hidden">
              <div className="bg-gray-900 text-white px-8 py-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Professionell objektbeskrivning</h3>
                      <div className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-md font-semibold">{prompt.status}</div> för {result.platform === "hemnet" ? "Hemnet" : "Booli/Egen sida"}</p>
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    onClick={() => copyToClipboard(result.improvedPrompt)}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Kopiera allt
                  </Button>
                </div>
              </div>
              <div className="p-8">
                <div className="prose prose-lg max-w-none">
                  <p className="whitespace-pre-wrap text-gray-800 leading-relaxed font-serif">
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
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <ul className="space-y-2">
                        {result.writingPlan.writing_plan?.map((item: string, i: number) => (
                          <li key={i} className="text-blue-900 text-sm">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pro Tips */}
            {result.pro_tips && result.pro_tips.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.pro_tips.map((tip: string, i: number) => (
                  <div key={i} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-10">
                      <Zap className="w-16 h-16 text-blue-600" />
                    </div>
                    <div className="relative">
                      <div className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider">Pro Tips #{i+1}</div>
                      <p className="text-blue-900 font-medium leading-relaxed">{tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quality Scores */}
            {result.qualityScores && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
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
              </div>
            )}

            {/* New Description Button */}
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

        {/* Features Section */}
        {!result && (
          <div className="mt-20">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Varför välja Mäklartexter?</h3>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Professionellt verktyg byggt för svenska fastighetsmäklare
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Målinriktad</h4>
                <p className="text-gray-600">Optimerade beskrivningar som når rätt köpare och genererar fler visningar</p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Säker</h4>
                <p className="text-gray-600">Juridiskt granskade texter som föller alla branschregler och krav</p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Snabb</h4>
                <p className="text-gray-600">Generera professionella beskrivningar på sekunder istället för timmar</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {authModalOpen && (
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      )}
    </div>
  );
}
