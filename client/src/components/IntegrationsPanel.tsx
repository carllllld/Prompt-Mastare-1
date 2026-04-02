/**
 * IntegrationsPanel — Vitec CRM & Hemnet import UI
 * Shown in Settings (Pro/Premium only) and as an import button in the main form.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, Building2, Search, CheckCircle2, Trash2, ExternalLink, Download, AlertCircle, FileCheck, FileText, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

// ── Types ──────────────────────────────────────────────────────────────────

interface IntegrationSettings {
  vitecEnabled: boolean;
  vitecApiKeySet: boolean;
  vitecBaseUrl: string | null;
}

interface VitecProperty {
  id: string;
  address: string;
  city: string;
  district?: string;
  propertyType: string;
  livingArea?: number;
  rooms?: number;
  askingPrice?: number;
  monthlyFee?: number;
}

// ── Vitec Settings Section ─────────────────────────────────────────────────

export function VitecSettingsSection({ isPro }: { isPro: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const { data: settings, isLoading } = useQuery<IntegrationSettings>({
    queryKey: ["/api/integrations/settings"],
    enabled: isPro,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/integrations/vitec/key", { apiKey, customerId, baseUrl });
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Vitec ansluten!", 
        description: "Du kan nu importera objekt direkt från Vitec och exportera AI-genererade texter tillbaka. Spara 30+ minuter per objekt." 
      });
      setApiKey("");
      setShowKeyInput(false);
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/settings"] });
    },
    onError: (err: any) => {
      toast({ title: "Fel", description: err.message || "Kunde inte spara API-nyckeln", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/integrations/vitec/key");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Vitec borttagen", description: "API-nyckeln har tagits bort." });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/settings"] });
    },
    onError: () => {
      toast({ title: "Fel", description: "Kunde inte ta bort API-nyckeln", variant: "destructive" });
    },
  });

  if (!isPro) {
    return (
      <div className="flex items-start gap-3 p-4 border border-gray-200 bg-white">
        <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-700">Vitec-integration kräver Pro eller Premium.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /><span className="text-sm text-gray-400">Laddar...</span></div>;
  }

  return (
    <div className="space-y-4">
      {/* Success celebration when configured */}
      {settings?.vitecEnabled && settings.vitecApiKeySet && (
        <div className="p-4 rounded-lg border-2 border-primary bg-success-bg/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Vitec är anslutet!
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                Du kan nu importera objekt direkt från Vitec och exportera AI-genererade texter tillbaka. 
                Detta sparar dig 30+ minuter per objekt.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-success">
                  <Check className="w-3 h-3" />
                  <span>Snabb import</span>
                </div>
                <div className="flex items-center gap-1.5 text-success">
                  <Check className="w-3 h-3" />
                  <span>AI-optimering</span>
                </div>
                <div className="flex items-center gap-1.5 text-success">
                  <Check className="w-3 h-3" />
                  <span>Direkt export</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: "#2D6A4F" }} />
          <span className="text-sm font-medium text-gray-800">Vitec Mäklarsystem</span>
          {settings?.vitecEnabled && settings.vitecApiKeySet && (
            <Badge variant="outline" className="text-xs border-primary text-primary bg-white">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Ansluten
            </Badge>
          )}
        </div>
        {settings?.vitecEnabled && settings.vitecApiKeySet ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-xs"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
            Ta bort
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setShowKeyInput(!showKeyInput)}
          >
            <Link2 className="w-3 h-3 mr-1" />
            Anslut
          </Button>
        )}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        <strong>Spara 30+ minuter per objekt:</strong> Importera objektdata direkt från Vitec och exportera AI-genererade texter tillbaka med ett klick. 
        Du hittar din API-nyckel i Vitec under Inställningar → API-åtkomst.
      </p>

      {showKeyInput && !settings?.vitecApiKeySet && (
        <div className="space-y-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Kund-ID *</label>
            <Input
              type="text"
              placeholder="Ditt Vitec kund-ID (t.ex. 12345)"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Hittas i Vitec under Inställningar → Om systemet.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">API-nyckel *</label>
            <Input
              type="password"
              placeholder="Klistra in din Vitec API-nyckel"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Anpassad API-URL (valfritt)</label>
            <Input
              type="url"
              placeholder="https://vitecexpress.bovision.se"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Lämna tomt om du använder standard-Vitec Express.</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="text-xs"
              style={{ background: "#2D6A4F" }}
              onClick={() => saveMutation.mutate()}
              disabled={!apiKey.trim() || !customerId.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Spara och verifiera
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowKeyInput(false)}>
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hemnet Import Button ───────────────────────────────────────────────────

interface HemnetImportProps {
  onImport: (propertyData: Record<string, any>) => void;
}

export function HemnetImportButton({ onImport }: HemnetImportProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [imageProgress, setImageProgress] = useState<{ current: number; total: number } | null>(null);

  const [errorDetails, setErrorDetails] = useState<{ type: string; message: string } | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  const importMutation = useMutation({
    mutationFn: async (hemnetUrl: string) => {
      const res = await apiRequest("POST", "/api/integrations/hemnet/import", { url: hemnetUrl });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Okänt fel", type: "unknown" }));
        const error: any = new Error(err.message || "Kunde inte hämta data från Hemnet");
        error.type = err.type || "unknown";
        throw error;
      }
      return res.json();
    },
    onSuccess: (data) => {
      onImport(data.propertyData);
      setUrl("");
      setOpen(false);
      setImageProgress(null);
      setErrorDetails(null);
      const imageCount = data.property?.imageUrls?.length || 0;
      toast({
        title: "Hemnet-data importerad",
        description: `${data.property?.address || "Objektet"} har fyllts i automatiskt${imageCount > 0 ? ` med ${imageCount} bild(er)` : ""}.`,
      });
    },
    onError: (err: any) => {
      setImageProgress(null);
      setErrorDetails({ type: err.type || "unknown", message: err.message });
    },
  });

  const handleRetryAfterDelay = () => {
    setRetryCountdown(30);
    const interval = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          importMutation.mutate(url.trim());
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleManualFallback = () => {
    setOpen(false);
    setErrorDetails(null);
    toast({
      title: "Fyll i manuellt",
      description: "Formuläret är redo för manuell ifyllning",
    });
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs gap-1.5 border-dashed"
        onClick={() => setOpen(true)}
      >
        <ExternalLink className="w-3 h-3" />
        Importera från Hemnet
      </Button>
    );
  }

  // Show detailed error message with solutions
  if (errorDetails) {
    if (errorDetails.type === "HemnetNotFoundError") {
      return (
        <div className="p-4 border border-red-200 bg-red-50 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Annonsen hittades inte</p>
              <p className="text-xs text-red-700 mt-1">
                Hemnet-annonsen kunde inte hittas. Detta kan bero på:
              </p>
              <ul className="list-disc list-inside text-xs text-red-700 mt-2 space-y-1 ml-2">
                <li>Annonsen har tagits bort från Hemnet</li>
                <li>Länken är felaktig eller ofullständig</li>
                <li>Annonsen är inte längre aktiv</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => {
                setErrorDetails(null);
                setUrl("");
              }}
            >
              Försök med annan länk
            </Button>
            <Button
              size="sm"
              className="text-xs bg-primary hover:bg-primary-hover"
              onClick={handleManualFallback}
            >
              Fyll i manuellt istället
            </Button>
          </div>
        </div>
      );
    }

    if (errorDetails.type === "HemnetRateLimitError") {
      return (
        <div className="p-4 border border-amber-200 bg-amber-50 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Hemnet blockerade förfrågan</p>
              <p className="text-xs text-amber-700 mt-1">
                Hemnet begränsar antalet förfrågningar per minut. Detta händer ibland när många förfrågningar görs samtidigt.
              </p>
              <p className="text-xs text-amber-700 mt-2 font-medium">
                Vänta 30 sekunder och försök igen.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleRetryAfterDelay}
              disabled={retryCountdown !== null}
            >
              {retryCountdown !== null ? `Försöker igen om ${retryCountdown}s...` : "Försök igen om 30 sek"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={handleManualFallback}
            >
              Fyll i manuellt istället
            </Button>
          </div>
        </div>
      );
    }

    // Generic error
    return (
      <div className="p-4 border border-red-200 bg-red-50 space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Import misslyckades</p>
            <p className="text-xs text-red-700 mt-1">{errorDetails.message}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => importMutation.mutate(url.trim())}
          >
            Försök igen
          </Button>
          <Button
            size="sm"
            className="text-xs bg-primary hover:bg-primary-hover"
            onClick={handleManualFallback}
          >
            Fyll i manuellt istället
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 border border-gray-200 bg-white">
      <ExternalLink className="w-4 h-4 text-gray-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <Input
          type="url"
          placeholder="https://www.hemnet.se/bostader/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="text-xs h-8 bg-white border-gray-200"
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim()) importMutation.mutate(url.trim());
            if (e.key === "Escape") setOpen(false);
          }}
          autoFocus
          disabled={importMutation.isPending}
        />
        {imageProgress && (
          <p className="text-xs text-gray-600 mt-1">
            Laddar ned bilder: {imageProgress.current}/{imageProgress.total}
          </p>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        className="text-xs h-8 shrink-0 bg-primary hover:bg-primary-hover"
        onClick={() => importMutation.mutate(url.trim())}
        disabled={!url.trim() || importMutation.isPending}
      >
        {importMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="text-xs h-8 shrink-0 px-2" onClick={() => {
        setOpen(false);
        setErrorDetails(null);
      }} disabled={importMutation.isPending}>
        ✕
      </Button>
    </div>
  );
}

// ── Vitec Import Picker ────────────────────────────────────────────────────

interface VitecImportPickerProps {
  onImport: (propertyData: Record<string, any>) => void;
  isPro: boolean;
}

export function VitecImportPicker({ onImport, isPro }: VitecImportPickerProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingImport, setPendingImport] = useState<{ propertyData: Record<string, any>; hasExistingText: boolean } | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ type: string; message: string } | null>(null);

  const { data: settings, isLoading: settingsLoading } = useQuery<IntegrationSettings>({
    queryKey: ["/api/integrations/settings"],
    enabled: isPro,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery<{ properties: VitecProperty[] }>({
    queryKey: ["/api/integrations/vitec/listings"],
    enabled: isPro && open && Boolean(settings?.vitecEnabled),
  });

  const { data: searchData, isLoading: searchLoading } = useQuery<{ properties: VitecProperty[] }>({
    queryKey: ["/api/integrations/vitec/search", searchQuery],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/integrations/vitec/search?q=${encodeURIComponent(searchQuery)}`);
      return res.json();
    },
    enabled: isPro && open && searchQuery.trim().length >= 2,
  });

  const importMutation = useMutation({
    mutationFn: async (objectId: string) => {
      const res = await apiRequest("POST", "/api/integrations/vitec/import", { objectId });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Okänt fel", type: "unknown" }));
        const error: any = new Error(err.message);
        error.type = err.type || "unknown";
        throw error;
      }
      return res.json();
    },
    onSuccess: (data) => {
      const hasExistingText = Boolean(data.propertyData?.description?.trim());
      if (hasExistingText) {
        // Show choice: analyze existing text or generate new
        setPendingImport({ propertyData: data.propertyData, hasExistingText: true });
        setOpen(false);
        setErrorDetails(null);
      } else {
        // No existing text — just fill the form
        onImport(data.propertyData);
        setOpen(false);
        setErrorDetails(null);
        toast({ title: "Vitec-objekt importerat", description: `${data.propertyData?.address || "Objektet"} har fyllts i.` });
      }
    },
    onError: (err: any) => {
      setErrorDetails({ type: err.type || "unknown", message: err.message });
    },
  });

  if (!isPro) return null;
  // While settings are loading, show a disabled button so layout doesn't jump
  if (settingsLoading) {
    return (
      <Button type="button" variant="outline" size="sm" className="text-xs gap-1.5 border-dashed opacity-50" disabled>
        <Building2 className="w-3 h-3" />
        Importera från Vitec
      </Button>
    );
  }
  if (!settings?.vitecEnabled) return null;

  const displayProperties = searchQuery.trim().length >= 2
    ? (searchData?.properties || [])
    : (listingsData?.properties || []);
  const isLoading = searchQuery.trim().length >= 2 ? searchLoading : listingsLoading;

  // Show choice dialog when there's an existing text
  if (pendingImport) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-800">Befintlig text hittades</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Det finns redan en objektbeskrivning i Vitec. Vad vill du göra?
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs justify-start gap-2 h-auto py-2.5 px-3"
            onClick={() => {
              // Navigate to text analysis with the existing text pre-filled
              const text = pendingImport.propertyData.description;
              // Store in sessionStorage so HemnetAnalysis can pick it up
              sessionStorage.setItem("vitec-analyze-text", text);
              sessionStorage.setItem("vitec-analyze-address", pendingImport.propertyData.address || "");
              setPendingImport(null);
              setLocation("/hemnet-analysis");
            }}
          >
            <FileCheck className="w-3.5 h-3.5 text-primary" />
            <div className="text-left">
              <div className="font-medium">Analysera befintlig text</div>
              <div className="text-gray-400 font-normal">Granska och förbättra den befintliga objektbeskrivningen</div>
            </div>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs justify-start gap-2 h-auto py-2.5 px-3"
            onClick={() => {
              // Fill form and generate new text (existing text goes to otherInfo as context)
              onImport(pendingImport.propertyData);
              setPendingImport(null);
              toast({ title: "Vitec-objekt importerat", description: "Formuläret är ifyllt. Befintlig text finns i 'Övrig info' som kontext." });
            }}
          >
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <div className="text-left">
              <div className="font-medium">Generera ny text</div>
              <div className="text-gray-400 font-normal">Fyll i formuläret och låt AI:n skriva en ny text</div>
            </div>
          </Button>
        </div>
        <button
          type="button"
          className="text-xs text-gray-400 hover:text-gray-600 w-full text-center"
          onClick={() => setPendingImport(null)}
        >
          Avbryt
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="relative inline-block">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 border-dashed"
          onClick={() => setOpen(true)}
        >
          <Building2 className="w-3 h-3" />
          Importera från Vitec
        </Button>
        {/* New badge */}
        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-yellow-900 shadow-sm">
          NY!
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-gray-50">
        <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
        <div className="relative flex-1">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Sök adress eller objekt-ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs h-8 pl-7 bg-white"
            autoFocus
          />
        </div>
        <Button type="button" variant="ghost" size="sm" className="text-xs h-8 px-2 shrink-0" onClick={() => setOpen(false)}>
          ✕
        </Button>
      </div>

      {/* Show detailed error message with solutions */}
      {errorDetails && (
        <div className="p-4 border-b border-gray-100">
          {errorDetails.type === "VitecAuthError" ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">Ogiltig Vitec API-nyckel</p>
                  <p className="text-xs text-red-700 mt-1">
                    Din Vitec API-nyckel fungerar inte. Kontrollera att:
                  </p>
                  <ul className="list-disc list-inside text-xs text-red-700 mt-2 space-y-1 ml-2">
                    <li>API-nyckeln är korrekt kopierad från Vitec</li>
                    <li>Kund-ID stämmer med ditt Vitec-konto</li>
                    <li>API-nyckeln har behörighet för PublicAdvertising</li>
                  </ul>
                </div>
              </div>
              <Button
                size="sm"
                className="text-xs bg-primary hover:bg-primary-hover w-full"
                onClick={() => {
                  setOpen(false);
                  setErrorDetails(null);
                  setLocation("/settings/integrations");
                }}
              >
                Uppdatera Vitec-inställningar
              </Button>
            </div>
          ) : errorDetails.type === "VitecNotFoundError" ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">Objektet hittades inte</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Objektet kunde inte hittas i Vitec. Kontrollera att objekt-ID:t är korrekt och att objektet är aktivt.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs w-full"
                onClick={() => setErrorDetails(null)}
              >
                Försök med annat objekt
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">Import misslyckades</p>
                  <p className="text-xs text-red-700 mt-1">{errorDetails.message}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs w-full"
                onClick={() => setErrorDetails(null)}
              >
                Försök igen
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="max-h-64 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center gap-2 p-4 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            <span className="text-xs text-gray-400">Hämtar objekt...</span>
          </div>
        )}
        {!isLoading && displayProperties.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">
            {searchQuery.trim().length >= 2 ? "Inga objekt hittades" : "Inga aktiva objekt"}
          </p>
        )}
        {displayProperties.map((prop) => (
          <button
            key={prop.id}
            type="button"
            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
            onClick={() => importMutation.mutate(prop.id)}
            disabled={importMutation.isPending}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{prop.address}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[prop.district, prop.city].filter(Boolean).join(", ")}
                  {prop.livingArea ? ` · ${prop.livingArea} kvm` : ""}
                  {prop.rooms ? ` · ${prop.rooms} rum` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs capitalize">{prop.propertyType}</Badge>
                {importMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                ) : (
                  <Download className="w-3 h-3 text-gray-400" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
