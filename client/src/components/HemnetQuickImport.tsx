import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2, Link, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HemnetQuickImportProps {
  onImport: (data: Record<string, any>) => void;
  onSkip: () => void;
}

export function HemnetQuickImport({ onImport, onSkip }: HemnetQuickImportProps) {
  const [hemnetUrl, setHemnetUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!hemnetUrl.trim()) return;
    if (!hemnetUrl.includes('hemnet.se/bostader/')) {
      toast({ title: "Ogiltig länk", description: "Måste vara en Hemnet-annons (hemnet.se/bostader/...)", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch('/api/hemnet-import-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: hemnetUrl }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Kunde inte importera');
      }
      const data = await response.json();
      toast({ title: "Importerat", description: `${data.address || 'Objektdata'} hämtad från Hemnet` });
      onImport(data);
    } catch (error: any) {
      toast({ title: "Import misslyckades", description: error.message || "Kontrollera länken och försök igen", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Link className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-sm font-medium text-gray-800">Har du redan en annons ute?</span>
          </div>
          <button type="button" onClick={onSkip} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Klistra in din Hemnet-länk så hämtar vi all objektdata automatiskt. 
          Du slipper fylla i formuläret manuellt och kan generera en ny, 
          professionell text direkt — perfekt om du vill förbättra en befintlig annons.
        </p>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://hemnet.se/bostader/..."
            value={hemnetUrl}
            onChange={(e) => setHemnetUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleImport()}
            disabled={isImporting}
            className="h-9 text-sm"
          />
          <Button
            type="button"
            onClick={handleImport}
            disabled={isImporting || !hemnetUrl.trim()}
            size="sm"
            className="h-9 px-4 flex-shrink-0"
          >
            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Hämta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
