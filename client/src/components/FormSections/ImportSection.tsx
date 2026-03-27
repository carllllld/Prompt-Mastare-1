/**
 * ImportSection - Snabb väg för att importera objektdata
 * Visar Hemnet och Vitec import-alternativ
 */
import { Download, Building2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HemnetImportButton, VitecImportPicker } from "@/components/IntegrationsPanel";

interface ImportSectionProps {
  onHemnetImport?: (data: any) => void;
  onVitecImport?: (data: any) => void;
  isPro?: boolean;
}

export function ImportSection({ onHemnetImport, onVitecImport, isPro }: ImportSectionProps) {
  return (
    <div className="border-l-4 border-slate-400 bg-slate-50 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-slate-600" />
        <h3 className="font-semibold text-slate-900">Snabb väg - Importera objektdata</h3>
      </div>
      
      <p className="text-sm text-slate-700 mb-4">
        Spara tid genom att importera från Hemnet eller Vitec. Formuläret fylls i automatiskt.
      </p>
      
      <div className="flex gap-2 flex-wrap">
        <HemnetImportButton onImport={onHemnetImport} />
        {isPro && <VitecImportPicker onImport={onVitecImport} isPro={isPro} />}
      </div>
    </div>
  );
}
