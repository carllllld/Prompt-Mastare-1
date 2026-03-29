/**
 * VitecExportButton — Export AI-generated text for use in Vitec or other broker systems
 * 
 * Two modes:
 * 1. Copy structured text to clipboard (always works, recommended)
 * 2. Direct API export to Vitec (beta, requires Vitec credentials)
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Check, Copy, AlertCircle, Building2, ClipboardList } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface VitecExportButtonProps {
  propertyData: Record<string, any>;
  generatedText: string;
  headline?: string;
  socialCopy?: string;
  shortAd?: string;
  showingInvitation?: string;
  instagramCaption?: string;
  vitecObjectId?: string;
  isPro?: boolean;
}

interface IntegrationSettings {
  vitecEnabled: boolean;
  vitecApiKeySet: boolean;
}

function buildStructuredExport(props: VitecExportButtonProps): string {
  const { propertyData, generatedText, headline, socialCopy, shortAd, showingInvitation, instagramCaption } = props;
  const parts: string[] = [];

  // Object data header
  parts.push("═══════════════════════════════════");
  parts.push("OBJEKTDATA");
  parts.push("═══════════════════════════════════");
  
  if (propertyData.address) parts.push(`Adress: ${propertyData.address}`);
  if (propertyData.area) parts.push(`Område: ${propertyData.area}`);
  
  const typeMap: Record<string, string> = { apartment: "Lägenhet", house: "Villa", townhouse: "Radhus", villa: "Villa" };
  if (propertyData.propertyType) parts.push(`Typ: ${typeMap[propertyData.propertyType] || propertyData.propertyType}`);
  if (propertyData.livingArea) parts.push(`Boarea: ${propertyData.livingArea} kvm`);
  if (propertyData.biarea) parts.push(`Biarea: ${propertyData.biarea} kvm`);
  if (propertyData.lotArea) parts.push(`Tomtarea: ${propertyData.lotArea} kvm`);
  if (propertyData.totalRooms) parts.push(`Rum: ${propertyData.totalRooms}`);
  if (propertyData.bedrooms) parts.push(`Sovrum: ${propertyData.bedrooms}`);
  if (propertyData.bathrooms) parts.push(`Badrum: ${propertyData.bathrooms}`);
  if (propertyData.floor) parts.push(`Våning: ${propertyData.floor}`);
  if (propertyData.buildYear) parts.push(`Byggår: ${propertyData.buildYear}`);
  if (propertyData.monthlyFee) {
    const isApt = propertyData.propertyType === "apartment" || propertyData.propertyType === "townhouse";
    parts.push(`${isApt ? "Avgift" : "Driftkostnad"}: ${propertyData.monthlyFee} kr/mån`);
  }
  if (propertyData.energyClass) parts.push(`Energiklass: ${propertyData.energyClass}`);
  if (propertyData.brfName) parts.push(`BRF: ${propertyData.brfName}`);
  if (propertyData.balconyArea) {
    const isHouse = propertyData.propertyType === "house" || propertyData.propertyType === "villa";
    parts.push(`${isHouse ? "Uteplats" : "Balkong"}: ${propertyData.balconyArea} kvm${propertyData.balconyDirection ? ` (${propertyData.balconyDirection})` : ""}`);
  }
  if (propertyData.parking) parts.push(`Parkering: ${propertyData.parking}`);
  if (propertyData.heating) parts.push(`Uppvärmning: ${propertyData.heating}`);
  if (propertyData.condition) parts.push(`Skick: ${propertyData.condition}`);
  if (propertyData.flooring) parts.push(`Golv: ${propertyData.flooring}`);
  if (propertyData.storage) parts.push(`Förråd: ${propertyData.storage}`);
  if (propertyData.tilltradesdag) parts.push(`Tillträde: ${propertyData.tilltradesdag}`);

  // Texts
  parts.push("");
  parts.push("═══════════════════════════════════");
  parts.push("TEXTER");
  parts.push("═══════════════════════════════════");

  if (headline) {
    parts.push("");
    parts.push("── RUBRIK ──");
    parts.push(headline);
  }

  parts.push("");
  parts.push("── OBJEKTBESKRIVNING ──");
  parts.push(generatedText);

  if (shortAd) {
    parts.push("");
    parts.push("── KORTANNONS ──");
    parts.push(shortAd);
  }

  if (socialCopy) {
    parts.push("");
    parts.push("── SOCIAL MEDIA ──");
    parts.push(socialCopy);
  }

  if (showingInvitation) {
    parts.push("");
    parts.push("── VISNINGSINBJUDAN ──");
    parts.push(showingInvitation);
  }

  if (instagramCaption) {
    parts.push("");
    parts.push("── INSTAGRAM ──");
    parts.push(instagramCaption);
  }

  parts.push("");
  parts.push("═══════════════════════════════════");
  parts.push(`Genererat av Mäklartexter — ${new Date().toLocaleDateString("sv-SE")}`);

  return parts.join("\n");
}

export function VitecExportButton(props: VitecExportButtonProps) {
  const { propertyData, generatedText, vitecObjectId, isPro } = props;
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [copiedStructured, setCopiedStructured] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);

  // Check if Vitec API is configured (for direct export)
  const { data: settings } = useQuery<IntegrationSettings>({
    queryKey: ["/api/integrations/settings"],
    enabled: !!isPro,
  });

  const hasVitecApi = settings?.vitecEnabled && settings?.vitecApiKeySet && vitecObjectId;

  // Direct API export mutation
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
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Exporterat till Vitec", description: data.message });
        setShowDialog(false);
      } else {
        toast({ title: "Export misslyckades", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Export misslyckades", description: error.message, variant: "destructive" });
    },
  });

  const handleCopyStructured = () => {
    const text = buildStructuredExport(props);
    navigator.clipboard.writeText(text);
    setCopiedStructured(true);
    setTimeout(() => setCopiedStructured(false), 2500);
    toast({ title: "Kopierat", description: "Alla texter och objektdata kopierade till urklipp" });
  };

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(generatedText);
    setCopiedDescription(true);
    setTimeout(() => setCopiedDescription(false), 2500);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2 border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F]/10"
      >
        <ClipboardList className="w-3.5 h-3.5" />
        Exportera texter
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" style={{ color: "#2D6A4F" }} />
              Exportera till mäklarsystem
            </DialogTitle>
            <DialogDescription>
              Kopiera texter och objektdata för att klistra in i Vitec, Fasad, Mspecs eller annat mäklarsystem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">

            {/* Quick copy buttons */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kopiera</p>
              
              <Button
                variant="outline"
                onClick={handleCopyStructured}
                className={`w-full justify-start h-auto py-3 px-4 text-left ${copiedStructured ? "border-success bg-success-bg" : ""}`}
              >
                <div className="flex items-start gap-3 w-full">
                  {copiedStructured ? <Check className="w-4 h-4 text-success mt-0.5 shrink-0" /> : <ClipboardList className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#2D6A4F" }} />}
                  <div>
                    <span className="text-sm font-medium block">{copiedStructured ? "Kopierat!" : "Kopiera allt (texter + objektdata)"}</span>
                    <span className="text-xs text-muted-foreground">Alla 5 texter plus adress, kvm, rum, avgift etc. Klistra in fält för fält i ditt mäklarsystem.</span>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={handleCopyDescription}
                className={`w-full justify-start h-auto py-3 px-4 text-left ${copiedDescription ? "border-success bg-success-bg" : ""}`}
              >
                <div className="flex items-start gap-3 w-full">
                  {copiedDescription ? <Check className="w-4 h-4 text-success mt-0.5 shrink-0" /> : <Copy className="w-4 h-4 mt-0.5 shrink-0" />}
                  <div>
                    <span className="text-sm font-medium block">{copiedDescription ? "Kopierat!" : "Kopiera bara objektbeskrivningen"}</span>
                    <span className="text-xs text-muted-foreground">Enbart huvudtexten — klistra in direkt i objektbeskrivningsfältet.</span>
                  </div>
                </div>
              </Button>
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Förhandsgranskning</p>
              <div className="text-xs text-foreground max-h-64 overflow-y-auto rounded border border-border bg-background p-3 whitespace-pre-wrap font-mono leading-relaxed">
                {buildStructuredExport(props)}
              </div>
            </div>

            {/* Direct Vitec API export (beta) */}
            {hasVitecApi && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" style={{ color: "#2D6A4F" }} />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Direkt Vitec-export</p>
                  <Badge variant="outline" className="text-[10px]">Beta</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Skicka objektbeskrivningen direkt till Vitec via API. Funktionen är i beta — om det inte fungerar, använd kopiera-knapparna ovan.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Objekt-ID: {vitecObjectId}
                  </Badge>
                </div>
                <Button
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {exportMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporterar...</>
                  ) : (
                    <><Upload className="w-3.5 h-3.5" /> Skicka till Vitec (beta)</>
                  )}
                </Button>
                {exportMutation.isError && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {exportMutation.error?.message || "Export misslyckades. Använd kopiera-knapparna istället."}
                  </p>
                )}
              </div>
            )}

            {/* Tips */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Tips för mäklarsystem</p>
                <p>I Vitec: Klistra in objektbeskrivningen i fältet "Objektbeskrivning" under fliken "Texter".</p>
                <p>Rubrik, kortannons och visningsinbjudan har egna fält — kopiera dem separat från resultatsidan.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Stäng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
