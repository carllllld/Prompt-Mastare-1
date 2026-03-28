/**
 * IntegrationsPanel — Vitec CRM & Hemnet import UI
 * Shown in Settings (Pro/Premium only) and as an import button in the main form.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, Building2, Search, CheckCircle2, Trash2, ExternalLink, Download, AlertCircle } from "lucide-react";
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
      toast({ title: "Vitec ansluten", description: "API-nyckeln är sparad och verifierad." });
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
        Importera objektdata direkt från Vitec. Du hittar din API-nyckel i Vitec under Inställningar → API-åtkomst.
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

  const importMutation = useMutation({
    mutationFn: async (hemnetUrl: string) => {
      const res = await apiRequest("POST", "/api/integrations/hemnet/import", { url: hemnetUrl });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Okänt fel" }));
        throw new Error(err.message || "Kunde inte hämta data från Hemnet");
      }
      return res.json();
    },
    onSuccess: (data) => {
      onImport(data.propertyData);
      setUrl("");
      setOpen(false);
      setImageProgress(null);
      const imageCount = data.property?.imageUrls?.length || 0;
      toast({
        title: "Hemnet-data importerad",
        description: `${data.property?.address || "Objektet"} har fyllts i automatiskt${imageCount > 0 ? ` med ${imageCount} bild(er)` : ""}.`,
      });
    },
    onError: (err: any) => {
      setImageProgress(null);
      toast({ title: "Import misslyckades", description: err.message, variant: "destructive" });
    },
  });

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
      <Button type="button" variant="ghost" size="sm" className="text-xs h-8 shrink-0 px-2" onClick={() => setOpen(false)} disabled={importMutation.isPending}>
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
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: settings } = useQuery<IntegrationSettings>({
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
        const err = await res.json().catch(() => ({ message: "Okänt fel" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      onImport(data.propertyData);
      setOpen(false);
      toast({ title: "Vitec-objekt importerat", description: `${data.property?.address || "Objektet"} har fyllts i.` });
    },
    onError: (err: any) => {
      toast({ title: "Import misslyckades", description: err.message, variant: "destructive" });
    },
  });

  if (!isPro || !settings?.vitecEnabled) return null;

  const displayProperties = searchQuery.trim().length >= 2
    ? (searchData?.properties || [])
    : (listingsData?.properties || []);
  const isLoading = searchQuery.trim().length >= 2 ? searchLoading : listingsLoading;

  if (!open) {
    return (
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
