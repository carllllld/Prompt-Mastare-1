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
  Loader2, HomeIcon, LogOut, Sparkles, TrendingUp, Clock, 
  FileText, Zap, ArrowRight, Star, Users, BarChart3, Building2,
  Compass, Hammer, Palette, Eye, Target, Brain
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [activeTemplate, setActiveTemplate] = useState<number | null>(null);

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

  const handleUpgrade = () => {
    startCheckout({}, {
      onSuccess: () => {
        toast({
          title: "Omdirigerar till betalning...",
          description: "Du kommer snart att skickas till vår säkra betalsida.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Kunde inte starta uppgradering",
          description: error?.message || "Vänligen försök igen senare.",
        });
      },
    });
  };

  const propertyTemplates = [
    {
      name: "Lägenhet", 
      desc: "Modern city-lägenhet", 
      quick: "2 rum, kök, balkong",
      icon: Building2,
      color: "from-blue-500 to-cyan-500"
    },
    {
      name: "Villa", 
      desc: "Familjevänlig villa", 
      quick: "4 rum, trädgård, garage",
      icon: HomeIcon,
      color: "from-emerald-500 to-teal-500"
    },
    {
      name: "Radhus", 
      desc: "Bekvämt radhus", 
      quick: "3 rum, 2 plan, förråd",
      icon: Building2,
      color: "from-purple-500 to-pink-500"
    }
  ];

  const statsData = [
    { label: "Konvertering", value: "94%", change: "+12%", icon: TrendingUp, color: "emerald", description: "Högre än branschsnitt" },
    { label: "Snabbhet", value: "15s", change: "+8%", icon: Zap, color: "blue", description: "Från idé till färdig text" },
    { label: "Kvalitet", value: "9.8", change: "+5%", icon: Star, color: "purple", description: "Betyg av användare" },
    { label: "AI-precision", value: "98%", change: "+5%", icon: Brain, color: "indigo", description: "Match mot kundbehov" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-lg text-gray-900">Mäklartexter</span>
                  <div className="text-xs text-gray-500">AI för fastighetsbranschen</div>
                </div>
              </div>
              
              {isAuthenticated && (
                <div className="hidden md:flex items-center gap-6">
                  <Link href="/history" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                    <Clock className="w-4 h-4" />
                    <span>Historik</span>
                  </Link>
                  {user?.plan === "pro" && (
                    <Link href="/teams" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                      <Users className="w-4 h-4" />
                      <span>Teams</span>
                    </Link>
                  )}
                  <Link href="/analytics" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                    <BarChart3 className="w-4 h-4" />
                    <span>Analytics</span>
                  </Link>
                </div>
              )}
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
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{userStatus?.promptsRemaining}</div>
                      <div className="text-xs text-gray-500">kvar</div>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-gray-900">{user?.email}</div>
                    <div className="text-xs text-gray-500 capitalize">{userStatus?.plan}</div>
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

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm font-medium text-blue-900">AI för mäklare</span>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                  <span className="block">Skapa</span>
                  <span className="text-blue-600">övertygande</span>
                  <span className="block">fastighetstexter</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl leading-relaxed">
                  Vår AI analyserar fastighetsdetaljer och marknadsdata för att skapa 
                  objektbeskrivningar som fångar intresse och genererar fler visningar.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-base font-medium"
                  onClick={() => document.getElementById('main-form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Testa gratis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" size="lg" className="border-gray-300 text-gray-700 px-6 py-3 rounded-lg text-base font-medium hover:bg-gray-50">
                  <Eye className="w-4 h-4 mr-2" />
                  Se exempel
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {statsData.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                  <div className="text-xs text-green-600 mt-1">{stat.change}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <span>Snabbstart mallar</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {propertyTemplates.map((template, i) => (
                    <div
                      key={i}
                      className={`relative p-4 rounded-lg border cursor-pointer transition-all ${
                        activeTemplate === i 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTemplate(i)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${activeTemplate === i ? 'bg-blue-600' : 'bg-gray-100'} rounded-lg flex items-center justify-center transition-colors`}>
                          <template.icon className={`w-5 h-5 ${activeTemplate === i ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium mb-1 ${activeTemplate === i ? 'text-blue-900' : 'text-gray-900'}`}>{template.name}</div>
                          <div className="text-sm text-gray-600 mb-1">{template.desc}</div>
                          <div className="text-xs text-gray-500 italic">{template.quick}</div>
                        </div>
                      </div>
                      {activeTemplate === i && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div id="main-form" className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div>
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Hammer className="w-4 h-4 text-blue-600" />
                  </div>
                  <span>Skapa din text</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {userStatus && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="text-sm font-medium text-gray-900">{userStatus.promptsRemaining} kvar</div>
                      </div>
                      <div className="text-xs text-gray-500 capitalize">{userStatus.plan}</div>
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
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-green-600" />
                    </div>
                    <span>Genererad text</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <TextImprovement 
                    fullText={result.improved || ""}
                    isPro={userStatus?.plan === "pro"}
                  />
                  <div className="mt-6 flex gap-4">
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
                      Ny text
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Redo att skapa magi?</h3>
                  <p className="text-gray-600 mb-6">
                    Fyll i formuläret för att generera din första AI-drivna fastighetstext.
                  </p>
                  <Button 
                    onClick={() => document.getElementById('main-form')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Börja här
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Varför välja Mäklartexter AI?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professionell AI-teknik skapad specifikt för fastighetsbranschen
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border border-gray-200 bg-white shadow-sm p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Snabbt och effektivt</h3>
              <p className="text-gray-600">
                Generera professionella fastighetstexter på sekunder istället för timmar.
              </p>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Optimerad för konvertering</h3>
              <p className="text-gray-600">
                Våra texter är designade för att maximera intresse och generera fler visningar.
              </p>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-driven precision</h3>
              <p className="text-gray-600">
                Avancerad AI som förstår fastighetsmarknaden och köparbeteende.
              </p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-blue-50 rounded-2xl p-12 border border-blue-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Redo att revolutionera din fastighetsmarknadsföring?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Gå med hundratals mäklare som redan använder vår AI för att skapa bättre fastighetstexter.
            </p>
            <Button 
              size="lg"
              onClick={() => setAuthModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Börja gratis idag
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl text-gray-900">Mäklartexter</span>
                  <div className="text-sm text-gray-500">AI för fastighetsbranschen</div>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed max-w-md">
                Revolutionerande AI-drivna fastighetstexter som konverterar. 
                Skapad av fastighetsproffs, för fastighetsproffs.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Produkt</h4>
              <div className="space-y-3 text-sm">
                <div><Link href="/features" className="text-gray-600 hover:text-gray-900">Funktioner</Link></div>
                <div><Link href="/blueprint" className="text-gray-600 hover:text-gray-900">Mallar</Link></div>
                <div><Link href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</Link></div>
                <div><Link href="/api" className="text-gray-600 hover:text-gray-900">API</Link></div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Företag</h4>
              <div className="space-y-3 text-sm">
                <div><Link href="/about" className="text-gray-600 hover:text-gray-900">Om oss</Link></div>
                <div><Link href="/blog" className="text-gray-600 hover:text-gray-900">Blogg</Link></div>
                <div><Link href="/careers" className="text-gray-600 hover:text-gray-900">Karriär</Link></div>
                <div><Link href="/contact" className="text-gray-600 hover:text-gray-900">Kontakt</Link></div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <div className="space-y-3 text-sm">
                <div><Link href="/privacy" className="text-gray-600 hover:text-gray-900">Integritet</Link></div>
                <div><Link href="/terms" className="text-gray-600 hover:text-gray-900">Villkor</Link></div>
                <div><Link href="/security" className="text-gray-600 hover:text-gray-900">Säkerhet</Link></div>
                <div><Link href="/gdpr" className="text-gray-600 hover:text-gray-900">GDPR</Link></div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2024 Mäklartexter AI. Alla rättigheter reserverade.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen} 
      />
    </div>
  );
}
