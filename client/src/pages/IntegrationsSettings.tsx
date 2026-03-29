import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Loader2, Check, AlertCircle, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface IntegrationSettings {
  vitecEnabled: boolean;
  vitecApiKeySet: boolean;
  vitecCustomerId: string | null;
  vitecBaseUrl: string | null;
}

export default function IntegrationsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [vitecApiKey, setVitecApiKey] = useState("");
  const [vitecCustomerId, setVitecCustomerId] = useState("");
  const [vitecBaseUrl, setVitecBaseUrl] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<IntegrationSettings>({
    queryKey: ["/api/integrations/settings"],
    onSuccess: (data) => {
      setVitecCustomerId(data.vitecCustomerId || "");
      setVitecBaseUrl(data.vitecBaseUrl || "");
    },
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      vitecApiKey?: string;
      vitecCustomerId?: string;
      vitecBaseUrl?: string;
      vitecEnabled: boolean;
    }) => {
      const res = await apiRequest("PUT", "/api/integrations/settings", data);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Uppdatering misslyckades" }));
        throw new Error(error.message || "Kunde inte uppdatera inställningar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/settings"] });
      toast({
        title: "Inställningar sparade!",
        description: "Dina Vitec-inställningar har uppdaterats",
      });
      setVitecApiKey(""); // Clear API key field after save
    },
    onError: (error: Error) => {
      toast({
        title: "Kunde inte spara",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete settings mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/integrations/settings", {});
      if (!res.ok) {
        throw new Error("Kunde inte radera inställningar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/settings"] });
      setVitecApiKey("");
      setVitecCustomerId("");
      setVitecBaseUrl("");
      toast({
        title: "Inställningar raderade",
        description: "Vitec-integrationen har inaktiverats",
      });
    },
    onError: () => {
      toast({
        title: "Kunde inte radera",
        description: "Ett fel uppstod",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!vitecApiKey && !settings?.vitecApiKeySet) {
      toast({
        title: "API-nyckel krävs",
        description: "Ange din Vitec API-nyckel",
        variant: "destructive",
      });
      return;
    }

    if (!vitecCustomerId) {
      toast({
        title: "Kund-ID krävs",
        description: "Ange ditt Vitec Kund-ID",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      vitecApiKey: vitecApiKey || undefined,
      vitecCustomerId,
      vitecBaseUrl: vitecBaseUrl || undefined,
      vitecEnabled: true,
    });
  };

  const handleDisable = () => {
    updateMutation.mutate({
      vitecEnabled: false,
    });
  };

  const handleDelete = () => {
    if (confirm("Är du säker på att du vill radera alla Vitec-inställningar?")) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
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
            <h1 className="text-lg font-semibold text-foreground">Integrationer</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Vitec Integration Card */}
        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#2D6A4F]/10">
              <Building2 className="w-6 h-6" style={{ color: "#2D6A4F" }} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Vitec Mäklarsystem
              </h2>
              <p className="text-sm text-muted-foreground">
                Anslut ditt Vitec-konto för att importera objekt och exportera AI-genererade texter direkt till Vitec.
              </p>
            </div>
            {settings?.vitecEnabled && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Aktiverad</span>
              </div>
            )}
          </div>

          {/* Configuration Form */}
          <div className="space-y-4">
            {/* API Key */}
            <div>
              <Label htmlFor="vitecApiKey" className="text-sm font-medium">
                Vitec API-nyckel {settings?.vitecApiKeySet && <span className="text-green-600">(Sparad)</span>}
              </Label>
              <div className="relative mt-1">
                <Input
                  id="vitecApiKey"
                  type={showApiKey ? "text" : "password"}
                  placeholder={settings?.vitecApiKeySet ? "••••••••••••••••" : "Ange din Vitec API-nyckel"}
                  value={vitecApiKey}
                  onChange={(e) => setVitecApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Din API-nyckel lagras krypterad och delas aldrig med andra
              </p>
            </div>

            {/* Customer ID */}
            <div>
              <Label htmlFor="vitecCustomerId" className="text-sm font-medium">
                Vitec Kund-ID
              </Label>
              <Input
                id="vitecCustomerId"
                type="text"
                placeholder="Ditt Vitec Kund-ID"
                value={vitecCustomerId}
                onChange={(e) => setVitecCustomerId(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ditt unika Kund-ID i Vitec-systemet
              </p>
            </div>

            {/* Base URL (Optional) */}
            <div>
              <Label htmlFor="vitecBaseUrl" className="text-sm font-medium">
                Vitec API URL (valfritt)
              </Label>
              <Input
                id="vitecBaseUrl"
                type="url"
                placeholder="https://vitecexpress.bovision.se"
                value={vitecBaseUrl}
                onChange={(e) => setVitecBaseUrl(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lämna tom för att använda standard-URL
              </p>
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-info bg-info-bg px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-info mt-0.5 flex-shrink-0" />
              <div className="text-sm text-info">
                <p className="font-medium mb-1">Hur hittar jag mina Vitec-uppgifter?</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Logga in på Vitec Express</li>
                  <li>Gå till Inställningar → API-nycklar</li>
                  <li>Skapa en ny API-nyckel om du inte har en</li>
                  <li>Kopiera API-nyckeln och ditt Kund-ID</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-[#2D6A4F] hover:bg-[#2D6A4F]/90"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Spara och aktivera
                  </>
                )}
              </Button>

              {settings?.vitecEnabled && (
                <Button
                  variant="outline"
                  onClick={handleDisable}
                  disabled={updateMutation.isPending}
                >
                  Inaktivera
                </Button>
              )}

              {settings?.vitecApiKeySet && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  Radera inställningar
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Features List */}
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Vad kan du göra med Vitec-integration?</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">📥 Importera objekt</h4>
              <p className="text-xs text-muted-foreground">
                Hämta objektdata direkt från Vitec för att generera texter baserat på dina befintliga objekt
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">📤 Exportera texter</h4>
              <p className="text-xs text-muted-foreground">
                Skicka AI-genererade texter direkt tillbaka till Vitec med ett klick
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
