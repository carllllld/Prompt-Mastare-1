import { useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useHemnetAnalysis } from "@/hooks/use-hemnet-analysis";
import { useUserStatus } from "@/hooks/use-user-status";
import { useAuth } from "@/hooks/use-auth";
import { useOneClickFix } from "@/hooks/use-one-click-fix";
import { useToast } from "@/hooks/use-toast";
import { InlineHighlights } from "@/components/InlineHighlights";
import { ExpertFeedbackPanel } from "@/components/ExpertFeedbackPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, ExternalLink, Loader2, ArrowLeft, AlertCircle, 
  Sparkles, Copy, Check, Download, Info 
} from "lucide-react";

export default function HemnetAnalysis() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: userStatus } = useUserStatus();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // State
  const [hemnetUrl, setHemnetUrl] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [editedText, setEditedText] = useState("");
  const [acceptedFixes, setAcceptedFixes] = useState<string[]>([]);
  const [dismissedFixes, setDismissedFixes] = useState<string[]>([]);
  const [copiedText, setCopiedText] = useState(false);

  // Mutations
  const analysisMutation = useHemnetAnalysis();

  // One-click fix hook
  const { applyFix, undo, canUndo } = useOneClickFix({
    onFixApplied: (feedbackId, newText) => {
      setEditedText(newText);
      setAcceptedFixes(prev => [...prev, feedbackId]);
      toast({
        title: "Fix applicerad",
        description: "Texten har uppdaterats automatiskt",
      });
    },
    onError: (error) => {
      toast({
        title: "Kunde inte applicera fix",
        description: error,
        variant: "destructive",
      });
    },
  });

  // Handle import and analyze
  const handleAnalyze = useCallback(() => {
    if (!hemnetUrl.trim()) {
      toast({
        title: "URL saknas",
        description: "Ange en Hemnet-URL för att analysera",
        variant: "destructive",
      });
      return;
    }

    analysisMutation.mutate(hemnetUrl, {
      onSuccess: (data) => {
        setAnalysisResult(data);
        setEditedText(data.originalText);
        setAcceptedFixes([]);
        setDismissedFixes([]);
        toast({
          title: "Analys klar",
          description: `${data.analysis.improvements.length} förbättringsförslag hittade`,
        });
      },
      onError: (error: any) => {
        toast({
          title: "Analys misslyckades",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }, [hemnetUrl, analysisMutation, toast]);

  // Handle feedback click
  const handleFeedbackClick = useCallback((feedbackId: string) => {
    console.log('[HemnetAnalysis] Feedback clicked:', feedbackId);
  }, []);

  // Handle fix click
  const handleFixClick = useCallback((feedbackId: string) => {
    const feedback = analysisResult?.analysis.improvements.find((f: any) => f.id === feedbackId);
    if (!feedback) return;

    const result = applyFix(editedText, feedback, 'improvedPrompt');
    if (result.success && result.newText) {
      setEditedText(result.newText);
    }
  }, [analysisResult, editedText, applyFix]);

  // Handle dismiss click
  const handleDismissClick = useCallback((feedbackId: string) => {
    setDismissedFixes(prev => [...prev, feedbackId]);
    toast({
      title: "Feedback avvisad",
      description: "Feedbacken har tagits bort",
    });
  }, [toast]);

  // Handle copy text
  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(editedText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    toast({
      title: "Text kopierad",
      description: "Texten har kopierats till urklipp",
    });
  }, [editedText, toast]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const result = undo();
    if (result.success && result.text) {
      setEditedText(result.text);
      toast({
        title: "Ångrad",
        description: "Senaste ändringen har ångrats",
      });
    }
  }, [undo, toast]);

  // Filter out dismissed feedback
  const visibleFeedback = analysisResult?.analysis.improvements.filter(
    (f: any) => !dismissedFixes.includes(f.id)
  ) || [];

  const plan = userStatus?.plan || "free";
  const isPro = plan === "pro" || plan === "premium";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-[2200px] mx-auto flex items-center justify-between px-4 sm:px-6 xl:px-10 2xl:px-14 h-14">
          <div className="flex items-center gap-4">
            <Link href="/app">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Tillbaka
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                Hemnet Textanalys
              </span>
              <Badge variant="outline" size="sm">
                Beta
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[2200px] w-full mx-auto px-4 sm:px-6 xl:px-10 2xl:px-14 py-6">
        
        {/* Import Section */}
        {!analysisResult && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Analysera befintlig Hemnet-text
              </h1>
              <p className="text-sm text-muted-foreground">
                Importera en befintlig Hemnet-annons och få AI-drivna förbättringsförslag
              </p>
            </div>

            <div className="pro-card pro-card-premium p-6">
              <div className="flex items-start gap-3 mb-4">
                <ExternalLink className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Hemnet URL
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Klistra in länken till en Hemnet-annons för att analysera texten
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  type="url"
                  placeholder="https://www.hemnet.se/bostader/..."
                  value={hemnetUrl}
                  onChange={(e) => setHemnetUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAnalyze();
                  }}
                  className="text-sm"
                  disabled={analysisMutation.isPending}
                />

                <Button
                  onClick={handleAnalyze}
                  disabled={!hemnetUrl.trim() || analysisMutation.isPending}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
                >
                  {analysisMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyserar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analysera text
                    </>
                  )}
                </Button>
              </div>

              {/* Info box */}
              <div className="mt-4 rounded-lg border border-info bg-info-bg px-3 py-2 flex items-start gap-2">
                <Info className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
                <div className="text-xs text-info">
                  <p className="font-medium mb-1">Vad händer?</p>
                  <p>
                    Vi hämtar den befintliga texten från Hemnet och analyserar den med AI-experter 
                    (mäklare + jurist) för att hitta förbättringsmöjligheter inom grammatik, stil, 
                    juridik, mäklarrealism och tydlighet.
                  </p>
                </div>
              </div>
            </div>

            {/* Quota info */}
            {userStatus && (
              <div className="text-center text-xs text-muted-foreground">
                Du har {userStatus.hemnetAnalysesRemaining || 0} av {userStatus.hemnetAnalysesLimit || 0} analyser kvar denna månad
              </div>
            )}
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div className="space-y-4">
            {/* Property info header */}
            <div className="pro-card pro-card-premium p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {analysisResult.property.address}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {analysisResult.property.city}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" size="sm">
                    Kvalitet: {analysisResult.analysis.overallQuality}/10
                  </Badge>
                  <Badge 
                    variant="outline" 
                    size="sm"
                    className={analysisResult.analysis.legalCheck.compliant ? "border-green-600 text-green-700 bg-green-50" : "border-red-600 text-red-700 bg-red-50"}
                  >
                    {analysisResult.analysis.legalCheck.compliant ? "Juridiskt OK" : "Juridiska problem"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAnalysisResult(null);
                      setHemnetUrl("");
                    }}
                  >
                    Ny analys
                  </Button>
                </div>
              </div>
            </div>

            {/* 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left: Original text with highlights */}
              <div className="lg:col-span-2 space-y-4">
                <div className="pro-card pro-card-premium p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Original text
                    </h3>
                    <div className="flex items-center gap-2">
                      {canUndo && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUndo}
                          className="text-xs"
                        >
                          Ångra
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyText}
                        className="text-xs"
                      >
                        {copiedText ? (
                          <Check className="w-3 h-3 mr-1" />
                        ) : (
                          <Copy className="w-3 h-3 mr-1" />
                        )}
                        {copiedText ? "Kopierad!" : "Kopiera"}
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm leading-relaxed text-foreground">
                    <InlineHighlights
                      text={editedText}
                      feedback={visibleFeedback}
                      field="improvedPrompt"
                      onFixClick={handleFixClick}
                      onTextChange={setEditedText}
                    />
                  </div>

                  {/* Metadata */}
                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{analysisResult.metadata.wordCount} ord</span>
                    <span>·</span>
                    <span>{analysisResult.metadata.paragraphCount} stycken</span>
                    <span>·</span>
                    <span>{analysisResult.metadata.sentenceCount} meningar</span>
                  </div>
                </div>
              </div>

              {/* Right: Expert feedback panel */}
              <div className="lg:col-span-1">
                <ExpertFeedbackPanel
                  analysis={analysisResult.analysis}
                  onFeedbackClick={handleFeedbackClick}
                  onFixClick={handleFixClick}
                  onDismissClick={handleDismissClick}
                />
              </div>
            </div>

            {/* Images */}
            {analysisResult.images && analysisResult.images.length > 0 && (
              <div className="pro-card pro-card-premium p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Bilder ({analysisResult.images.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {analysisResult.images.map((img: string, idx: number) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={img}
                        alt={`Bild ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
