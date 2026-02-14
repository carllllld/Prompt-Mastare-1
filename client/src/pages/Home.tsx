import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PromptFormProfessional } from "@/components/PromptFormProfessional";
import { AuthModal } from "@/components/AuthModal";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useAuth } from "@/hooks/use-auth";
import { 
  Loader2, LogOut, Sparkles, FileText, Zap, ArrowRight, Home, Building2, MapPin, 
  TrendingUp, Star, Shield, Clock, Users, BarChart3, Target, Brain, CheckCircle,
  Lightbulb, Zap as ZapIcon, Award, Compass, Eye, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { mutate, isPending } = useOptimize();
  const { data: userStatus } = useUserStatus();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [result, setResult] = useState<any | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

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

  // Unique features that showcase our AI capabilities
  const uniqueFeatures = [
    {
      icon: Brain,
      title: "Kreativ Språkmodul",
      description: "Omvandlar komplexa fastighetsbeskrivningar till engagerande berättelser"
    },
    {
      icon: Target,
      title: "Psykologisk Triggers",
      description: "Använder beprövade säljtekniker för att maximera intresse"
    },
    {
      icon: Compass,
      title: "Lokal Marknadsinsikt",
      description: "Anpassar texter efter specifika områden och demografi"
    },
    {
      icon: Award,
      title: "SEO-Optimering",
      description: "Integrerar sökord som maximerar synlighet online"
    }
  ];

  const stats = [
    { label: "AI-modeller", value: "15+", icon: Brain, color: "text-violet-600" },
    { label: "Språkstöd", value: "12", icon: Heart, color: "text-pink-600" },
    { label: "Konvertering", value: "89%", icon: TrendingUp, color: "text-emerald-600" },
    { label: "Kundnöjd", value: "4.8/5", icon: Star, color: "text-amber-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Unique Navigation */}
      <nav className="border-b border-indigo-100 bg-white/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 p-3 rounded-xl">
                  <Lightbulb className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
                </div>
              </div>
              <div>
                <span className="font-bold text-xl text-gray-900">TextAI Pro</span>
                <div className="text-sm text-indigo-600 font-medium">Fastighetstexter 2.0</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {authLoading ? (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                </div>
              ) : isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{userStatus?.promptsRemaining || 0}</div>
                      <div className="text-xs text-indigo-600 font-medium">kvar</div>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-gray-900">{user?.email}</div>
                    <div className="text-xs text-indigo-600 font-semibold capitalize">{userStatus?.plan || 'Free'}</div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => logout()} 
                    className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button 
                    onClick={() => setAuthModalOpen(true)} 
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    <ZapIcon className="w-4 h-4 mr-2" />
                    Starta AI
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-indigo-300 text-indigo-700 px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-all"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Se demo
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-white rounded-xl shadow-lg w-fit">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'create' 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-4 h-4 mr-2 inline" />
                Skapa text
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'history' 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Clock className="w-4 h-4 mr-2 inline" />
                Historik
              </button>
            </div>

            {activeTab === 'create' && (
              <>
                {/* Unique Hero */}
                <div className="text-center space-y-6">
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-full">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                    <span className="text-sm font-medium text-violet-800">AI med kreativt tänkande</span>
                  </div>
                  
                  <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                    <span className="block">Snabbare, bättre, mer</span>
                    <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">kreativ</span>
                    <span className="block">fastighetstexter</span>
                  </h1>
                  <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                    Vår unika AI kombinerar språkmodulering med psykologiska triggers 
                    för att skapa fastighetstexter som inte bara beskriver utan säljer.
                  </p>
                </div>

                {/* Form Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Form */}
                  <div>
                    <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-violet-50/30">
                      <CardHeader className="border-b border-indigo-200 bg-white">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                          </div>
                          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Kreativ AI-motor</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {userStatus && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-indigo-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <div className="text-sm font-medium text-gray-900">{userStatus.promptsRemaining} kreativa texter kvar</div>
                              </div>
                              <div className="text-xs text-indigo-600 font-semibold capitalize">{userStatus.plan}</div>
                            </div>
                          </div>
                        )}
                        
                        <PromptFormProfessional 
                          onSubmit={handleSubmit}
                          isPending={isPending}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Results */}
                  <div>
                    {result ? (
                      <Card className="border-0 shadow-2xl bg-gradient-to-br from-emerald-50 to-green-50">
                        <CardHeader className="border-b border-emerald-200 bg-white">
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-emerald-600">Kreativ mästerverk!</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="bg-white rounded-xl p-6 mb-6 border border-emerald-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Din kreativa text</h3>
                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {result.improved || "Kreativ text genererad!"}
                              </p>
                            </div>
                            
                            <div className="flex gap-4">
                              <Button 
                                onClick={() => {
                                  const text = result.improved || "";
                                  navigator.clipboard.writeText(text);
                                  toast({
                                    title: "Kopierat!",
                                    description: "Texten har kopierats till urklipp.",
                                  });
                                }}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Kopiera kreativitet
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => setResult(null)}
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              >
                                Skapa ny
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-0 shadow-2xl bg-gradient-to-br from-gray-50 to-slate-100">
                        <CardContent className="p-12 text-center">
                          <div className="w-20 h-20 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Brain className="w-10 h-10 text-violet-600" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                            {isAuthenticated ? "Redo för kreativitet?" : "Upptäck din kreativ potential"}
                          </h3>
                          <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            {isAuthenticated 
                              ? "Fyll i formuläret för att låta vår AI skapa något unikt."
                              : "Logga in för att upptäcka kraften i AI-driven fastighetstexter."
                            }
                          </p>
                          {!isAuthenticated && (
                            <Button 
                              onClick={() => setAuthModalOpen(true)}
                              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                            >
                              <Sparkles className="w-5 h-5 mr-2" />
                              Börja skapa
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'history' && (
              <Card className="border-0 shadow-2xl bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Clock className="w-6 h-6 text-indigo-600" />
                    <span>Historik</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Inga tidigare kreativa texter</h3>
                  <p className="text-gray-600">Dina unika fastighetstexter kommer att visas här</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Unique Features */}
            <Card className="border-0 shadow-2xl bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">Vår unika fördelar</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {uniqueFeatures.map((feature, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="border-0 shadow-2xl bg-gradient-to-r from-violet-600 to-indigo-600">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">AI-plattform i siffror</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        <span className="text-white font-medium">{stat.label}</span>
                      </div>
                      <span className="text-2xl font-bold text-white">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="border-0 shadow-2xl bg-white">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Börja din kreativa resa idag</h3>
                <p className="text-gray-600 mb-6">Gå med tusentals kreativa mäklare som redan använder vår unika AI</p>
                <Button 
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-6 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Starta kreativ AI
                </Button>
              </CardContent>
            </Card>
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
