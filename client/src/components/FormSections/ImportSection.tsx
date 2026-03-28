/**
 * ImportSection - Snabb väg för att importera objektdata
 * Visar Hemnet och Vitec import-alternativ
 * Mäklaraktig design: white background, light gray border, NO colored backgrounds
 */
import { Zap } from "lucide-react";
import { HemnetImportButton, VitecImportPicker } from "@/components/IntegrationsPanel";

interface ImportSectionProps {
  onHemnetImport?: (data: any) => void;
  onVitecImport?: (data: any) => void;
  isPro?: boolean;
}

export function ImportSection({ onHemnetImport, onVitecImport, isPro }: ImportSectionProps) {
  return (
    <div className="border border-gray-200 bg-white rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-gray-600" />
        <h3 className="text-md font-semibold text-gray-900">Snabb väg - Importera objektdata</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Spara tid genom att importera från Hemnet eller Vitec. Formuläret fylls i automatiskt.
      </p>
      
      <div className="flex gap-2 flex-wrap">
        <HemnetImportButton onImport={onHemnetImport} />
        {isPro && <VitecImportPicker onImport={onVitecImport} isPro={isPro} />}
      </div>
    </div>
  );
}
