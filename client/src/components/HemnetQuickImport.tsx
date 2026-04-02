import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HemnetQuickImportProps {
  onImport: (data: Record<string, any>) => void;
  onSkip: () => void;
}

export function HemnetQuickImport({ onImport, onSkip }: HemnetQuickImportProps) {
  const [hemnetUrl, setHemnetUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleImport = async () => {
    if (!hemnetUrl.trim()) {
      toast({
        title: "Ingen URL angiven",
        description: "Klistra in en Hemnet-länk för att importera data",
        variant: "destructive",
      });
      return;
    }

    // Validate Hemnet URL
    if (!hemnetUrl.includes('hemnet.se/bostader/')) {
      toast({
        title: "Ogiltig URL",
        description: "Länken måste vara från Hemnet (hemnet.se/bostader/...)",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportStatus('idle');

    try {
      const response = await fetch('/api/hemnet-import-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: hemnetUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Kunde inte importera från Hemnet');
      }

      const data = await response.json();
      
      setImportStatus('success');
      toast({
        title: "Import lyckades!",
        description: `${data.address} har importerats från Hemnet`,
      });

      // Call parent callback with imported data
      onImport(data);
    } catch (error: any) {
      console.error('Hemnet import error:', error);
      setImportStatus('error');
      toast({
        title: "Import misslyckades",
        description: error.message || "Kunde inte hämta data från Hemnet. Kontrollera att länken är korrekt.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleImport();
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
          <Download className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Har du en annons ute med dålig trafik?
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Importera Hemnet-länken så skriver AI:n om texten professionellt. Få fler visningar på 2 minuter.
          </p>
          
          {/* Explanation box */}
          <div className="bg-white border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-xs font-bold">?</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-900 mb-1">Hur fungerar det?</p>
                <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Kopiera länken från din Hemnet-annons (börjar med <span className="font-mono text-xs bg-gray-100 px-1 rounded">hemnet.se/bostader/</span>)</li>
                  <li>Klistra in här nedan och klicka "Importera"</li>
                  <li>AI:n hämtar all data och skriver om texten professionellt</li>
                </ol>
                <p className="text-xs text-blue-700 mt-2 font-medium">
                  ✨ Resultat: Bättre text utan AI-klyschor → Fler klick → Fler visningar
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="url"
                  placeholder="Exempel: https://hemnet.se/bostader/lagenhet-3rum-vasastan-stockholm-18123456"
                  value={hemnetUrl}
                  onChange={(e) => setHemnetUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isImporting}
                  className="h-11"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Länken måste börja med <span className="font-mono bg-gray-100 px-1 rounded">hemnet.se/bostader/</span>
                </p>
              </div>
              <Button
                onClick={handleImport}
                disabled={isImporting || !hemnetUrl.trim()}
                className="h-11 px-6"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importerar...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Importera
                  </>
                )}
              </Button>
            </div>

            {importStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Data importerad! Formuläret är nu ifyllt med information från Hemnet.</span>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Kunde inte importera. Kontrollera att länken är korrekt och försök igen.</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-blue-200">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 text-sm">💡</span>
                <div>
                  <p className="text-xs font-medium text-gray-700">Varför importera?</p>
                  <p className="text-xs text-gray-500">
                    Sparar 15 minuter + AI:n skriver om texten professionellt utan klyschor
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-gray-600 hover:text-gray-900 flex-shrink-0"
              >
                Hoppa över
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
