import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { PromptFormProfessional } from "@/components/PromptFormProfessional";
import { AuthModal } from "@/components/AuthModal";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { 
  Loader2, LogOut, Sparkles, 
  FileText, Zap, ArrowRight
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

  const handleSubmit = (data: any) => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    
    mutate(data, {
      onSuccess: (data) => {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
      },
      onError: (error: any) => {
        toast({
          title: "Ett fel uppstod",
          description: error?.message || "Kunde inte generera text.",
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Simple Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-semibold text-lg text-gray-900">Mäklartexter</span>
                <div className="text-xs text-gray-500">AI för fastighetsbranschen</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="text-sm font-medium text-gray-900">{userStatus?.promptsRemaining}</div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-gray-900">{user?.email}</div>
                    <div className="text-xs text-gray-500">{userStatus?.plan}</div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => logout()} 
                    className="text-gray-500 hover:text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setAuthModalOpen(true)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Kom igång
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Full Height */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Hero */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                  <span className="block">Skapa</span>
                  <span className="text-blue-600">övertygande</span>
                  <span className="block">fastighetstexter</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Vår AI analyserar fastighetsdetaljer och marknadsdata för att skapa 
                  objektbeskrivningar som fångar intresse och genererar fler visningar.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium"
                  onClick={() => document.getElementById('main-form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Börja skapa
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button variant="outline" size="lg" className="border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-50">
                  Se exempel
                </Button>
              </div>

              {userStatus && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="text-sm font-medium text-gray-900">{userStatus.promptsRemaining} texter kvar</div>
                    </div>
                    <div className="text-xs text-gray-500 capitalize">{userStatus.plan}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Form or Results */}
            <div className="w-full">
              {result ? (
                <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-green-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Klar! Din text är genererad</h2>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {result.improved}
                    </p>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => navigator.clipboard.writeText(result.improved || "")}
                      className="flex-1"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Kopiera text
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setResult(null)}
                    >
                      Skapa ny
                    </Button>
                  </div>
                </div>
              ) : (
                <div id="main-form" className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                      {isAuthenticated ? "Skapa din fastighetstext" : "Testa AI-gratis"}
                    </h2>
                    <p className="text-gray-600 mb-8">
                      {isAuthenticated 
                        ? "Fyll i formuläret nedan för att generera en professionell fastighetstext på sekunder."
                        : "Fyll i formuläret nedan för att testa vår AI och se hur den kan hjälpa dig skapa bättre fastighetstexter."
                      }
                    </p>
                  </div>
                  
                  <PromptFormProfessional 
                    onSubmit={handleSubmit}
                    isPending={isPending}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen} 
      />
    </div>
  );
}
