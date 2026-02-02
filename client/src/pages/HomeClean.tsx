import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { PromptFormClean } from "@/components/PromptFormClean";
import { AuthModal } from "@/components/AuthModal";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { type OptimizeResponse } from "@shared/schema";
import { 
  Loader2, LogOut, Copy, FileText, User, Settings, 
  ArrowRight, CheckCircle, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    toast({ title: "Kopierat", description: "Texten finns nu i ditt urklipp." });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Mäklartexter</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <Link href="/history" className="text-sm text-gray-600 hover:text-gray-900">
                    Historik
                  </Link>
                  {user?.plan === "pro" && (
                    <Link href="/teams" className="text-sm text-gray-600 hover:text-gray-900">
                      Teams
                    </Link>
                  )}
                  <span className="text-sm text-gray-500">{user?.email}</span>
                  <Button variant="ghost" size="sm" onClick={() => logout()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logga ut
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setAuthModalOpen(true)}>
                  Logga in
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Status */}
        {userStatus && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  {userStatus.promptsRemaining} av {userStatus.monthlyLimit} texter kvar denna månad
                </span>
              </div>
              {userStatus.plan !== "pro" && (
                <button 
                  onClick={() => startCheckout("pro")} 
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Uppgradera
                </button>
              )}
            </div>
          </div>
        )}

        {/* Form Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Skapa objektbeskrivning</h2>
            <p className="text-gray-600">
              Fyll i detaljerna om objektet så skapar vi en professionell beskrivning optimerad för vald plattform.
            </p>
          </div>

          <PromptFormClean 
            onSubmit={handleSubmit} 
            isPending={isPending} 
            disabled={userStatus?.promptsRemaining === 0}
          />
        </div>

        {/* Results */}
        {result && (
          <div id="results" className="space-y-6">
            {/* Highlights */}
            {result.highlights && result.highlights.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Höjdpunkter</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.highlights.map((highlight: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{highlight.replace(/^✓\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {result.analysis?.identified_epoch && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="font-medium text-gray-900 mb-2">Arkitektur</h4>
                  <p className="text-sm text-gray-600">{result.analysis.identified_epoch}</p>
                </div>
              )}
              
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="font-medium text-gray-900 mb-2">Målgrupp</h4>
                <p className="text-sm text-gray-600">
                  {result.analysis?.target_group || "Analyserar köparprofilering..."}
                </p>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="font-medium text-gray-900 mb-2">Områdesanalys</h4>
                <p className="text-sm text-gray-600">
                  {result.analysis?.area_advantage || "Hämtar lokal kännedom..."}
                </p>
              </div>
            </div>

            {/* Association Status */}
            {result.analysis?.association_status && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Föreningsekonomi</h3>
                <p className="text-gray-600">{result.analysis.association_status}</p>
              </div>
            )}

            {/* Critical Gaps */}
            {result.critical_gaps && result.critical_gaps.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-800">Viktigt att komma ihåg</h3>
                </div>
                <ul className="space-y-2">
                  {result.critical_gaps.map((gap: string, i: number) => (
                    <li key={i} className="text-sm text-yellow-800">• {gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Main Text */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 p-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Objektbeskrivning</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(result.improvedPrompt)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Kopiera
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {result.improvedPrompt}
                  </p>
                </div>

                {result.socialCopy && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Sociala medier</h4>
                    <p className="text-gray-600 italic">{result.socialCopy}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pro Tips */}
            {result.pro_tips && result.pro_tips.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.pro_tips.map((tip: string, i: number) => (
                  <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-xs font-medium text-blue-800 mb-1">Tips #{i+1}</div>
                    <p className="text-sm text-blue-900">{tip}</p>
                  </div>
                ))}
              </div>
            )}

            {/* New Description Button */}
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => setResult(null)}
                className="px-8"
              >
                Skapa ny beskrivning
              </Button>
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
