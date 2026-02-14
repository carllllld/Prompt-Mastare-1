import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PromptFormProfessional } from "@/components/PromptFormProfessional";
import { AuthModal } from "@/components/AuthModal";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useAuth } from "@/hooks/use-auth";
import { 
  Loader2, LogOut, Sparkles, FileText, Zap, ArrowRight, Home, Building2, MapPin, 
  TrendingUp, Star, Shield, Clock, Users, BarChart3, Target, Brain, CheckCircle
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

  const features = [
    {
      icon: Brain,
      title: "AI-Driven Analys",
      description: "Avancerad AI förstår fastighetsmarknaden och köparbeteende"
    },
    {
      icon: Target,
      title: "Målgruppsanpassad",
      description: "Skapar texter som maximerar intresse och konvertering"
    },
    {
      icon: TrendingUp,
      title: "Dataoptimerad",
      description: "Baserad på tusentals analyserade fastighetsannonser"
    },
    {
      icon: Shield,
      title: "Branschstandard",
      description: "Följer alla branschnormer och legala krav"
    }
  ];

  const stats = [
    { label: "Användare", value: "10,000+", icon: Users, color: "text-blue-600" },
    { label: "Texter genererade", value: "250K+", icon: FileText, color: "text-green-600" },
    { label: "Konvertering", value: "94%", icon: TrendingUp, color: "text-purple-600" },
    { label: "Betyg", value: "4.9/5", icon: Star, color: "text-yellow-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Premium Navigation */}
      <nav className="border-b border-white/20 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-20"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <span className="font-bold text-xl text-gray-900">Mäklartexter AI</span>
                <div className="text-sm text-blue-600 font-medium">Professionell fastighetstext på sekunder</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {authLoading ? (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{userStatus?.promptsRemaining || 0}</div>
                      <div className="text-xs text-blue-600 font-medium">kvar</div>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-gray-900">{user?.email}</div>
                    <div className="text-xs text-blue-600 font-semibold capitalize">{userStatus?.plan || 'Free'}</div>
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
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Starta AI
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
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
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'create' 
                    ? 'bg-white text-blue-600 shadow-md' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4 mr-2 inline" />
                Skapa text
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'history' 
                    ? 'bg-white text-blue-600 shadow-md' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-4 h-4 mr-2 inline" />
                Historik
              </button>
            </div>

            {activeTab === 'create' && (
              <>
                {/* Main Hero */}
                <div className="text-center space-y-6">
                  <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                    <span className="block">Revolutionera din</span>
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">fastighetsförsäljning</span>
                    <span className="block">med AI</span>
                  </h1>
                  <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                    Skapa professionella, övertygande fastighetstexter på sekunder som konverterar 
                    <span className="font-semibold text-blue-600">94% snabbare</span> än branschgenomsnittet.
                  </p>
                </div>

                {/* Form Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Form */}
                  <div>
                    <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-blue-50/30">
                      <CardHeader className="border-b border-gray-200 bg-white">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                            <Target className="w-5 h-5 text-white" />
                          </div>
                          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI Textgenerator</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {userStatus && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <div className="text-sm font-medium text-gray-900">{userStatus.promptsRemaining} generationer kvar</div>
                              </div>
                              <div className="text-xs text-blue-600 font-semibold capitalize">{userStatus.plan}</div>
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
                      <Card className="border-0 shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50">
                        <CardHeader className="border-b border-green-200 bg-white">
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-green-600">Perfekt!</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="bg-white rounded-xl p-6 mb-6 border border-green-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Din optimerade text</h3>
                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {result.improved || "Text genererad!"}
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
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Kopiera text
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => setResult(null)}
                                className="border-green-300 text-green-700 hover:bg-green-50"
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
                          <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-10 h-10 text-blue-600" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                            {isAuthenticated ? "Redo att skapa magi?" : "Se resultatet här"}
                          </h3>
                          <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            {isAuthenticated 
                              ? "Fyll i formuläret för att generera din första AI-drivna fastighetstext."
                              : "Logga in för att börja skapa professionella fastighetstexter med vår AI."
                            }
                          </p>
                          {!isAuthenticated && (
                            <Button 
                              onClick={() => setAuthModalOpen(true)}
                              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                            >
                              <Zap className="w-5 h-5 mr-2" />
                              Börja nu
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
                    <Clock className="w-6 h-6 text-blue-600" />
                    <span>Historik</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Inga tidigare texter</h3>
                  <p className="text-gray-600">Dina genererade fastighetstexter kommer att visas här</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Features */}
            <Card className="border-0 shadow-2xl bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">Varför välja oss?</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-6 h-6 text-blue-600" />
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
            <Card className="border-0 shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Plattform i siffror</CardTitle>
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
                <h3 className="text-xl font-bold text-gray-900 mb-4">Börja idag</h3>
                <p className="text-gray-600 mb-6">Gå med tusentals mäklare som redan använder vår AI</p>
                <Button 
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Starta AI-motorn
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
