import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Globe, Loader2, Sparkles } from "lucide-react";

interface PlatformOptimizerProps {
  fullText: string;
  propertyInfo?: any;
  isPro: boolean;
}

export function PlatformOptimizer({ fullText, propertyInfo, isPro }: PlatformOptimizerProps) {
  const [platformVersions, setPlatformVersions] = useState<Record<string, string>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState("hemnet");

  const optimizeForPlatforms = async () => {
    if (!fullText) return;
    
    setIsOptimizing(true);
    try {
      const response = await fetch("/api/optimize-platforms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalText: fullText,
          propertyInfo: propertyInfo || {}
        }),
      });

      if (!response.ok) {
        throw new Error("Kunde inte optimera för plattformar");
      }

      const data = await response.json();
      setPlatformVersions(data.platformVersions);
    } catch (error) {
      console.error("Platform optimization error:", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const platformInfo = {
    hemnet: {
      name: "Hemnet",
      description: "Faktaspäck & professionell",
      color: "bg-blue-50 border-blue-200",
      badge: "bg-blue-100 text-blue-700"
    },
    booli: {
      name: "Booli", 
      description: "Personlig & berättande",
      color: "bg-green-50 border-green-200",
      badge: "bg-green-100 text-green-700"
    },
    instagram: {
      name: "Instagram",
      description: "Visuell & emotionell",
      color: "bg-pink-50 border-pink-200", 
      badge: "bg-pink-100 text-pink-700"
    },
    facebook: {
      name: "Facebook",
      description: "Community-fokuserad",
      color: "bg-purple-50 border-purple-200",
      badge: "bg-purple-100 text-purple-700"
    }
  };

  if (!isPro) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <Globe className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-bold text-purple-900 mb-2">Plattformsoptimering</h3>
            <p className="text-sm text-purple-700 mb-4">
              Skapa optimerade versioner för Hemnet, Booli, Instagram och Facebook
            </p>
            <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-md font-semibold">Pro-funktion</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="w-5 h-5 text-purple-600" />
          Plattformsoptimering
          <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-md font-semibold">Pro</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-white p-4 rounded-lg border border-purple-100">
          <p className="text-sm text-purple-700 mb-4">
            🌐 Generera unika versioner optimerade för varje plattforms specifika audience och format
          </p>
          
          {Object.keys(platformVersions).length === 0 ? (
            <Button
              onClick={optimizeForPlatforms}
              disabled={isOptimizing || !fullText}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Optimerar för plattformar...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Optimera för 4 plattformar
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-900">
                  ✅ Klart! 4 optimerade versioner genererade
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={optimizeForPlatforms}
                  disabled={isOptimizing}
                >
                  Generera om
                </Button>
              </div>
            </div>
          )}
        </div>

        {Object.keys(platformVersions).length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              {Object.entries(platformInfo).map(([key, info]) => (
                <TabsTrigger key={key} value={key} className="text-xs">
                  {info.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(platformVersions).map(([platform, text]) => {
              const info = platformInfo[platform as keyof typeof platformInfo];
              return (
                <TabsContent key={platform} value={platform}>
                  <div className={`p-4 rounded-lg border ${info.color}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-purple-900">{info.name}</h4>
                        <p className="text-xs text-purple-700">{info.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <div className={`text-xs px-2 py-1 rounded-md font-semibold ${info.badge}`}>
                          {text.split(' ').length} ord
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(text)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border border-purple-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {text}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
