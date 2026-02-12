import { useState, useEffect, useRef } from "react";
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
  Loader2, HomeIcon, LogOut, Sparkles, TrendingUp, Clock, 
  FileText, Zap, ArrowRight, Star, Users, BarChart3, Building2,
  Compass, Blueprint, Hammer, Palette, Eye, Target, Brain,
  Layers, Grid3x3, Move3D, Maximize2, Minimize2, RotateCw
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
  const [activeTemplate, setActiveTemplate] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for 3D effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setMousePosition({
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 20,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 20
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = (data: { prompt: string; type: string; platform: string; wordCountMin?: number; wordCountMax?: number }) => {
    console.log("[Home Debug] handleSubmit called with:", data);
    console.log("[Home Debug] isAuthenticated:", isAuthenticated);
    
    if (!isAuthenticated) {
      console.log("[Home Debug] Not authenticated, opening auth modal");
      setAuthModalOpen(true);
      return;
    }
    
    setIsGenerating(true);
    console.log("[Home Debug] Calling mutate with data");
    mutate(data, {
      onSuccess: (data) => {
        setResult(data);
        setIsGenerating(false);
        queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
      },
      onError: (error: any) => {
        setIsGenerating(false);
        toast({
          title: "Ett fel uppstod",
          description: error?.message || "Kunde inte generera text.",
          variant: "destructive",
        });
      },
    });
  };

  const propertyTemplates = [
    { 
      name: "Modern City Living", 
      icon: Building2, 
      desc: "Sofistikerad stadslägenhet",
      quick: "Vasastan, 2 rum, 78m², balkong",
      color: "from-blue-600 to-cyan-500",
      pattern: "grid"
    },
    { 
      name: "Suburban Dream Home", 
      icon: HomeIcon, 
      desc: "Familjevänligt villaområde",
      quick: "Bromma, 4 rum, 145m², trädgård",
      color: "from-emerald-600 to-teal-500",
      pattern: "dots"
    },
    { 
      name: "Charming Townhouse", 
      icon: Grid3x3, 
      desc: "Perfekt mellanting",
      quick: "Solna, 3 rum, 95m², 2 plan",
      color: "from-purple-600 to-pink-500",
      pattern: "lines"
    },
    { 
      name: "Weekend Retreat", 
      icon: Compass, 
      desc: "Avkoppling i naturen",
      quick: "Värmdö, 2 rum, 55m², sjönära",
      color: "from-orange-600 to-red-500",
      pattern: "waves"
    }
  ];

  const statsData = [
    { 
      label: "Snabbare försäljning", 
      value: "94%", 
      change: "+12%", 
      icon: TrendingUp,
      color: "emerald",
      description: "Jämfört med branschgenomsnitt"
    },
    { 
      label: "Texter denna månad", 
      value: "2.3k", 
      change: "+23%", 
      icon: FileText,
      color: "blue",
      description: "Aktiva mäklare på plattformen"
    },
    { 
      label: "Kundnöjdhet", 
      value: "4.9", 
      change: "+0.3", 
      icon: Star,
      color: "purple",
      description: "Baserat på 1,247 recensioner"
    },
    { 
      label: "AI-precision", 
      value: "98%", 
      change: "+5%", 
      icon: Brain,
      color: "indigo",
      description: "Match mot kundbehov"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzR2LTRoLTJ2NGgtNHYyaDR2NGgydi00aDR2LTJoLTR6bTAtMzBWMGgtMnY0aC00djJoNHY0aDJWNmg0VjRoLTR6TTYgMzR2LTRINHY0SDB2Mmg0djRoMnYtNGg0djJINHp6TTYgNFYwSDR2NEgwdjJoNHY0aDJWNmg0VjRINnoiLz48L2c+PC9nPjwvc3ZnPg==')]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
      </div>

      {/* Premium Navigation */}
      <nav className="relative z-50 border-b border-white/10 backdrop-blur-xl bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-xl text-white shadow-2xl">
                    <Blueprint className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <span className="font-bold text-xl text-white tracking-tight">Mäklartexter</span>
                  <div className="text-xs text-blue-400 font-medium">AI Precision Engine</div>
                </div>
              </div>
              
              {isAuthenticated && (
                <div className="hidden md:flex items-center gap-8">
                  <Link href="/history" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors group">
                    <Clock className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span>Historik</span>
                  </Link>
                  {user?.plan === "pro" && (
                    <Link href="/teams" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors group">
                      <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span>Teams</span>
                    </Link>
                  )}
                  <Link href="/analytics" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors group">
                    <BarChart3 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span>Analytics</span>
                  </Link>
                  <Link href="/blueprint" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors group">
                    <Layers className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Blueprint</span>
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {authLoading ? (
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                </div>
              ) : isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl border border-white/10">
                    <div className="relative">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping"></div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">{userStatus?.promptsRemaining}</div>
                      <div className="text-xs text-slate-400">kvar</div>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-white">{user?.email}</div>
                    <div className="text-xs text-blue-400 capitalize font-medium">{userStatus?.plan}</div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => logout()} 
                    className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setAuthModalOpen(true)} 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold shadow-2xl hover:shadow-blue-500/25 transition-all hover:scale-105"
                >
                  Starta AI-motorn
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with 3D Effects */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Main Hero */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-500/30 backdrop-blur-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-300">AI-Precision Engine v3.0</span>
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none text-xs px-3 py-1 rounded-full font-semibold">BETA</div>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
                  <span className="block">Bygg</span>
                  <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">persuasiva</span>
                  <span className="block">fastighetstexter</span>
                </h1>
                <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
                  Vår AI analyserar arkitektoniska detaljer, demografiska data och psykologiska triggers 
                  för att skapa objektbeskrivningar som konverterar 94% snabbare än branschgenomsnittet.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-2xl hover:shadow-purple-500/25 transition-all hover:scale-105 group"
                  onClick={() => document.getElementById('main-form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Zap className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                  Generera magi nu
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" size="lg" className="border-white/20 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 hover:border-white/30 transition-all">
                  <Eye className="w-5 h-5 mr-2" />
                  Se AI i aktion
                </Button>
              </div>
            </div>

            {/* Interactive Stats Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statsData.map((stat, i) => (
                <Card 
                  key={i}
                  className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer group"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${stat.color === 'emerald' ? 'from-emerald-500 to-teal-500' : stat.color === 'blue' ? 'from-blue-500 to-cyan-500' : stat.color === 'purple' ? 'from-purple-500 to-pink-500' : 'from-indigo-500 to-purple-500'} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
                        {stat.change}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
                    <div className="text-xs text-slate-500 mt-2">{stat.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Interactive Blueprint Templates */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 backdrop-blur-sm shadow-2xl">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Blueprint className="w-4 h-4 text-white" />
                    </div>
                    <span>Property Blueprints</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {propertyTemplates.map((template, i) => (
                    <div
                      key={i}
                      className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                        activeTemplate === i 
                          ? 'bg-gradient-to-br ' + template.color + ' border-transparent' 
                          : 'bg-slate-800/30 border-white/10 hover:border-white/20 hover:bg-slate-800/50'
                      }`}
                      onClick={() => setActiveTemplate(i)}
                      style={{
                        backgroundImage: activeTemplate === i ? `url('data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M0 40L40 0H20L0 20M40 40V20L20 40"/%3E%3C/g%3E%3C/svg%3E')` : 'none'
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${template.color} rounded-xl flex items-center justify-center shadow-lg ${activeTemplate === i ? 'scale-110' : ''} transition-transform`}>
                          <template.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-white mb-1">{template.name}</div>
                          <div className="text-sm text-slate-400 mb-2">{template.desc}</div>
                          <div className="text-xs text-slate-500 italic font-mono">{template.quick}</div>
                        </div>
                      </div>
                      {activeTemplate === i && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Main Form Section */}
        <div id="main-form" className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enhanced Form */}
          <div>
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 backdrop-blur-sm shadow-2xl">
              <CardHeader className="border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center animate-pulse">
                    <Hammer className="w-4 h-4 text-white" />
                  </div>
                  <span>AI Text Generator</span>
                  {isGenerating && (
                    <div className="flex items-center gap-2 text-sm text-blue-400">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                      <span>Generating...</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {userStatus && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                          <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping"></div>
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {userStatus.promptsRemaining} av {userStatus.monthlyLimit} kvar
                          </div>
                          <div className="text-sm text-slate-400">
                            {userStatus.plan === "pro" ? "Professional Engine" : "Starter Engine"}
                          </div>
                        </div>
                      </div>
                      {userStatus.plan !== "pro" && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => startCheckout("pro")}
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Upgrade
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <PromptFormProfessional 
                  onSubmit={handleSubmit} 
                  isPending={isPending} 
                  disabled={userStatus?.promptsRemaining === 0}
                  isPro={userStatus?.plan === "pro"}
                />
              </CardContent>
            </Card>
          </div>

          {/* Results with AI Magic */}
          <div>
            {result ? (
              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 backdrop-blur-sm shadow-2xl">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white animate-pulse" />
                        </div>
                        <div>
                          <div className="font-bold text-lg">AI-Generated Text</div>
                          <div className="text-sm text-blue-200">Precision Engine v3.0</div>
                        </div>
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(result.improvedPrompt);
                          toast({ title: "Kopierat!", description: "Texten finns nu i ditt urklipp." });
                        }}
                      >
                        <div className="w-4 h-4 mr-2">📋</div>
                        Copy
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="prose prose-invert max-w-none">
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-100 text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {result.improvedPrompt}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {userStatus?.plan === "pro" && (
                  <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <Palette className="w-4 h-4 text-white" />
                        </div>
                        <div className="font-semibold text-white">AI Text Assistant</div>
                      </div>
                      <TextImprovement 
                        fullText={result.improvedPrompt} 
                        isPro={true}
                        onTextUpdate={(newText: string) => setResult((prev: any) => prev ? {...prev, improvedPrompt: newText} : null)}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                      <Brain className="w-12 h-12 text-white animate-pulse" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">Redo för AI-magi?</h3>
                  <p className="text-slate-300 mb-8 max-w-md mx-auto">
                    Vår precision-engine analyserar tusentals datapunkter för att skapa 
                    objektbeskrivningar som konverterar. Resultat är garanterade.
                  </p>
                  
                  {userStatus?.plan !== "pro" && (
                    <div className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="font-bold text-white text-lg mb-1">Professional Engine</div>
                          <div className="text-sm text-slate-400">Unlock full AI potential</div>
                        </div>
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none px-3 py-1 rounded-full font-semibold text-xs">PRO</div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 mb-6">
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                          <div className="w-5 h-5 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          </div>
                          <span>Unlimited prompts (20/mån)</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                          <div className="w-5 h-5 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                          <span>Extended text length (600+ ord)</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                          <div className="w-5 h-5 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          </div>
                          <span>AI Text Assistant & Editor</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                          <div className="w-5 h-5 bg-pink-500/20 rounded-lg flex items-center justify-center">
                            <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                          </div>
                          <span>Advanced analytics & insights</span>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-purple-500/25 transition-all hover:scale-105"
                        onClick={() => startCheckout("pro")}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Upgrade to Professional - 199kr/mån
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Premium Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-900/80 backdrop-blur-xl mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Blueprint className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl text-white">Mäklartexter</span>
                  <div className="text-sm text-blue-400">AI Precision Engine</div>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                Revolutionary AI-powered property descriptions that convert. 
                Built by real estate professionals, for real estate professionals.
              </p>
              <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span>System Operational</span>
                </div>
                <div className="text-xs text-slate-500">v3.0.1</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <div className="space-y-3 text-sm">
                <div><Link href="/features" className="text-slate-400 hover:text-white transition-colors">Features</Link></div>
                <div><Link href="/blueprint" className="text-slate-400 hover:text-white transition-colors">Blueprint</Link></div>
                <div><Link href="/analytics" className="text-slate-400 hover:text-white transition-colors">Analytics</Link></div>
                <div><Link href="/api" className="text-slate-400 hover:text-white transition-colors">API</Link></div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <div className="space-y-3 text-sm">
                <div><Link href="/documentation" className="text-slate-400 hover:text-white transition-colors">Documentation</Link></div>
                <div><Link href="/guides" className="text-slate-400 hover:text-white transition-colors">Guides</Link></div>
                <div><Link href="/blog" className="text-slate-400 hover:text-white transition-colors">Blog</Link></div>
                <div><Link href="/support" className="text-slate-400 hover:text-white transition-colors">Support</Link></div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <div className="space-y-3 text-sm">
                <div><Link href="/about" className="text-slate-400 hover:text-white transition-colors">About</Link></div>
                <div><Link href="/careers" className="text-slate-400 hover:text-white transition-colors">Careers</Link></div>
                <div><Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy</Link></div>
                <div><Link href="/terms" className="text-slate-400 hover:text-white transition-colors">Terms</Link></div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-slate-400">
              © {new Date().getFullYear()} Mäklartexter AB. All rights reserved.
            </div>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <div className="text-xs text-slate-500">Stockholm, Sweden</div>
              <div className="text-xs text-slate-500">•</div>
              <div className="text-xs text-slate-500">EU Compliant</div>
              <div className="text-xs text-slate-500">•</div>
              <div className="text-xs text-slate-500">GDPR Ready</div>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}
