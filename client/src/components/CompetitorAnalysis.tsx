import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, Lightbulb, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CompetitorAnalysisProps {
  propertyData: {
    address: string;
    price: number;
    livingArea: number;
    rooms: number;
    propertyType: string;
  };
}

interface CompetitorProperty {
  address: string;
  price: number;
  livingArea: number;
  rooms: number;
  pricePerSqm: number;
  textLength: number;
  usps: string[];
  url: string;
}

interface AnalysisResult {
  count: number;
  avgPrice: number;
  avgPricePerSqm: number;
  avgTextLength: number;
  priceComparison: "högre" | "lägre" | "genomsnitt";
  pricePercentDiff: number;
  commonUSPs: string[];
  suggestions: string[];
  competitors: CompetitorProperty[];
}

export function CompetitorAnalysis({ propertyData }: CompetitorAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/competitor-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(propertyData),
      });

      if (!response.ok) {
        throw new Error("Kunde inte analysera konkurrenter");
      }

      const data = await response.json();
      setAnalysis(data);
      
      toast({
        title: "Analys klar!",
        description: `${data.count} liknande objekt analyserade`,
      });
    } catch (error: any) {
      console.error("Competitor analysis error:", error);
      toast({
        title: "Analys misslyckades",
        description: error.message || "Kunde inte analysera konkurrenter",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("sv-SE").format(price) + " kr";
  };

  const formatPricePerSqm = (pricePerSqm: number) => {
    return new Intl.NumberFormat("sv-SE").format(Math.round(pricePerSqm)) + " kr/kvm";
  };

  const getPriceIcon = () => {
    if (!analysis) return null;
    if (analysis.priceComparison === "högre") return <TrendingUp className="w-4 h-4 text-red-600" />;
    if (analysis.priceComparison === "lägre") return <TrendingDown className="w-4 h-4 text-green-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getPriceColor = () => {
    if (!analysis) return "text-gray-900";
    if (analysis.priceComparison === "högre") return "text-red-600";
    if (analysis.priceComparison === "lägre") return "text-green-600";
    return "text-gray-900";
  };

  return (
    <div className="space-y-4">
      {/* BETA Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-800">
            <span className="font-semibold">BETA - Demo data</span>
            <p className="mt-1">
              Denna funktion använder för närvarande demo-data. Integration med Hemnet API kommer snart.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Konkurrentanalys</h3>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          size="sm"
          className="gap-2"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyserar...
            </>
          ) : (
            <>
              <BarChart3 className="w-4 h-4" />
              Analysera konkurrenter
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Overview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Liknande objekt</p>
                <p className="text-2xl font-bold text-gray-900">{analysis.count}</p>
                <p className="text-xs text-gray-500 mt-1">inom 500m</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Genomsnittspris</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(analysis.avgPrice)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatPricePerSqm(analysis.avgPricePerSqm)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Ditt pris</p>
                <div className="flex items-center gap-2">
                  {getPriceIcon()}
                  <p className={`text-2xl font-bold ${getPriceColor()}`}>
                    {formatPrice(propertyData.price)}
                  </p>
                </div>
                <p className={`text-xs mt-1 ${getPriceColor()}`}>
                  {analysis.pricePercentDiff > 0 ? "+" : ""}
                  {Math.round(analysis.pricePercentDiff)}% vs genomsnitt
                </p>
              </div>
            </div>
          </div>

          {/* Text length comparison */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Textlängd</span>
            </div>
            <p className="text-sm text-blue-800">
              Genomsnittlig textlängd hos konkurrenter: <strong>{Math.round(analysis.avgTextLength)} ord</strong>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {analysis.avgTextLength < 300
                ? "Konkurrenterna har korta texter. Skriv en längre text för att sticka ut!"
                : "Konkurrenterna har detaljerade texter. Matcha eller överträffa deras längd."}
            </p>
          </div>

          {/* Common USPs */}
          {analysis.commonUSPs.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">
                  Vanliga försäljningsargument
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.commonUSPs.map((usp, idx) => (
                  <Badge key={idx} variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                    {usp}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-purple-600 mt-3">
                Dessa argument används ofta i området. Hitta unika vinklar som skiljer dig från konkurrenterna.
              </p>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-900">
                  Förslag för att sticka ut
                </span>
              </div>
              <ul className="space-y-2">
                {analysis.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                    <span className="text-green-600 flex-shrink-0">→</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Competitor list */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900">Konkurrenter i området</h4>
            </div>
            <div className="divide-y divide-gray-200">
              {analysis.competitors.map((competitor, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 mb-1">{competitor.address}</h5>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                        <span className="font-semibold">{formatPrice(competitor.price)}</span>
                        <span>·</span>
                        <span>{competitor.livingArea} kvm</span>
                        <span>·</span>
                        <span>{competitor.rooms} rum</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {competitor.usps.map((usp, uspIdx) => (
                          <Badge key={uspIdx} variant="outline" size="sm">
                            {usp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <a
                      href={competitor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!analysis && !isAnalyzing && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 mb-2">Ingen analys än</p>
          <p className="text-sm text-gray-500 mb-4">
            Klicka "Analysera konkurrenter" för att se liknande objekt i området och få förslag för att sticka ut
          </p>
        </div>
      )}
    </div>
  );
}
