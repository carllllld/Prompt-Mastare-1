/**
 * VitecExportButton — Export AI-generated text back to Vitec mäklarsystem
 * 
 * Allows brokers to export optimized text directly to their Vitec account,
 * completing the integration loop: Import → Generate → Export
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2, ExternalLink, AlertCircle, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface VitecExportButtonProps {
  propertyData: Record<string, any>;
  generatedText: string;
  vitecObjectId?: string;
  onExportComplete?: () => void;
}

interface VitecExportResult {
  success: boolean;
  message: string;
  vitecUrl?: string;
  updatedFields?: string[];
}

interface IntegrationSettings {
  vitecEnabled: boolean;
  vitecApiKeySet: boolean;
}

export function VitecExportButton({
  propertyData,
  generatedText,
  vitecObjectId,
  onExportComplete,
}: VitecExportButtonProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);

  // Check if Vitec is configured
  const { data: settings, isLoading: settingsLoading } = useQuery<IntegrationSettings>({
    queryKey: ["/api/integrations/settings"],
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vitec/export", {
        objectId: vitecObjectId,
        propertyData,
        generatedText,
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Export misslyckades" }));
        throw new Error(error.message || "Kunde inte exportera till Vitec");
      }
      
      return res.json() as Promise<VitecExportResult>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Exporterat till Vitec!",
          description: data.message,
        });
        setShowDialog(false);
        onExportComplete?.();
      } else {
        toast({
          title: "Export misslyckades",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Export misslyckades",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Don't show button if Vitec is not configured or no object ID
  if (settingsLoading) return null;
  if (!settings?.vitecEnabled || !settings?.vitecApiKeySet) return null;
  if (!vitecObjectId) return null;

  const handleExport = () => {
    exportMutation.mutate();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2 border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F]/10"
      >
        <Building2 className="w-3.5 h-3.5" />
        Exportera till Vitec
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" style={{ color: "#2D6A4F" }} />
              Exportera till Vitec
            </DialogTitle>
            <DialogDescription>
              Uppdatera objektet i Vitec med den AI-genererade texten. Du kan sedan publicera från Vitec till Hemnet eller andra plattformar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Export Preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Objekt-ID: {vitecObjectId}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {propertyData.propertyType || "apartment"}
                </Badge>
              </div>

              {/* What will be exported */}
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">OBJEKTBESKRIVNING</p>
                  <div className="text-sm text-foreground max-h-48 overflow-y-auto rounded border border-border bg-background p-3">
                    {generatedText}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {generatedText.split(/\s+/).filter(Boolean).length} ord
                  </p>
                </div>

                {/* Additional metadata that will be exported */}
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">METADATA SOM EXPORTERAS</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {propertyData.landOwnership && (
                      <div>
                        <span className="text-muted-foreground">Upplåtelseform:</span>{" "}
                        <span className="font-medium">{propertyData.landOwnership === "aganderatt" ? "Äganderätt" : "Tomträtt"}</span>
                      </div>
                    )}
                    {propertyData.brfUnits && (
                      <div>
                        <span className="text-muted-foreground">Lägenheter i föreningen:</span>{" "}
                        <span className="font-medium">{propertyData.brfUnits}</span>
                      </div>
                    )}
                    {propertyData.nearbySchools && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Närliggande skolor:</span>{" "}
                        <span className="font-medium">{propertyData.nearbySchools}</span>
                      </div>
                    )}
                    {propertyData.nearbyServices && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Närliggande service:</span>{" "}
                        <span className="font-medium">{propertyData.nearbyServices}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="flex items-start gap-3 p-3 border border-gray-200 bg-white">
                <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div className="text-xs text-gray-700">
                  <p className="font-medium mb-1">Vad händer efter export?</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Objektbeskrivningen uppdateras i Vitec</li>
                    <li>Metadata sparas för framtida referens</li>
                    <li>Du kan publicera från Vitec till Hemnet</li>
                    <li>Alla ändringar loggas med "Mäklartexter" som källa</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={exportMutation.isPending}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="gap-2"
              style={{ background: "#2D6A4F" }}
            >
              {exportMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporterar...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Exportera till Vitec
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
