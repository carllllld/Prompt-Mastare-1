import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, Trash2, Save, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface StyleProfile {
  formality: number;
  detailLevel: number;
  emotionalTone: number;
  sentenceLength: number;
  adjectiveUsage: number;
  factFocus: number;
}

interface PersonalStyleData {
  hasStyle: boolean;
  referenceTexts?: string[];
  styleProfile?: StyleProfile;
  isActive?: boolean;
  teamShared?: boolean;
  createdAt?: string;
}

export function PersonalStyle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [personalStyle, setPersonalStyle] = useState<PersonalStyleData | null>(null);
  const [referenceTexts, setReferenceTexts] = useState(["", "", ""]);

  useEffect(() => {
    fetchPersonalStyle();
  }, []);

  const fetchPersonalStyle = async () => {
    try {
      const res = await fetch("/api/personal-style", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPersonalStyle(data);
        if (data.referenceTexts) {
          setReferenceTexts(data.referenceTexts);
        }
      }
    } catch (error) {
      console.error("Failed to fetch personal style:", error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda personlig stil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const validTexts = referenceTexts.filter(text => text.trim().length >= 100);
    if (validTexts.length < 1) {
      toast({
        title: "Valideringsfel",
        description: "Minst en exempeltext måste vara minst 100 tecken lång",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/personal-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          referenceTexts: validTexts,
          teamShared: personalStyle?.teamShared || false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Wait for API response before updating state
        await fetchPersonalStyle();
        toast({
          title: "Personlig stil sparad!",
          description: "AI:n kommer nu att använda din skrivstil.",
        });
      } else {
        const error = await res.json();
        toast({
          title: "Fel",
          description: error.message || "Kunde inte spara personlig stil",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte spara personlig stil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Är du säker på att du vill ta bort din personliga stil?")) return;

    setSaving(true);
    try {
      const res = await fetch("/api/personal-style", {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        // Wait for API response before updating state
        setPersonalStyle(null);
        setReferenceTexts(["", "", ""]);
        toast({
          title: "Personlig stil raderad",
          description: "AI:n kommer nu att använda standardstilen.",
        });
      } else {
        const error = await res.json();
        toast({
          title: "Fel",
          description: error.message || "Kunde inte radera personlig stil",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte radera personlig stil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    const previousState = personalStyle?.isActive;
    // Optimistic update
    setPersonalStyle(prev => prev ? { ...prev, isActive } : null);

    try {
      const res = await fetch("/api/personal-style", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });

      if (res.ok) {
        toast({
          title: isActive ? "Personlig stil aktiverad" : "Personlig stil inaktiverad",
        });
      } else {
        // Rollback on error
        setPersonalStyle(prev => prev ? { ...prev, isActive: previousState || false } : null);
        const error = await res.json();
        toast({
          title: "Fel",
          description: error.message || "Kunde inte uppdatera personlig stil",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Rollback on error
      setPersonalStyle(prev => prev ? { ...prev, isActive: previousState || false } : null);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera personlig stil",
        variant: "destructive",
      });
    }
  };

  const getStyleLabel = (value: number, type: string) => {
    const labels = {
      formality: ["Mycket informell", "Informell", "Neutral", "Formell", "Mycket formell"],
      detailLevel: ["Kortfattad", "Koncist", "Balanserad", "Detaljerad", "Mycket detaljerad"],
      emotionalTone: ["Ren fakta", "Fakta-fokuserad", "Balanserad", "Känslomässig", "Mycket känslomässig"],
      sentenceLength: ["Korta meningar", "Medellånga", "Normala", "Långa meningar", "Mycket långa meningar"],
      adjectiveUsage: ["Få adjektiv", "Sparsamt", "Normalt", "Många adjektiv", "Mycket adjektiv"],
      factFocus: ["Känslomässig", "Berättande", "Balanserad", "Fakta-fokuserad", "Ren fakta"],
    };

    const index = Math.min(Math.floor((value - 1) / 2), 4);
    return labels[type as keyof typeof labels]?.[index] || "Okänd";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="ml-2 text-sm">Laddar personlig stil...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Personlig skrivstil
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Lär AI:n din skrivstil med 1–3 stilprover.
          </p>
        </div>

        {personalStyle?.hasStyle && (
          <div className="flex items-center gap-2">
            <Switch
              checked={personalStyle.isActive}
              onCheckedChange={handleToggleActive}
            />
            <span className="text-xs text-gray-600">
              {personalStyle.isActive ? "Aktiv" : "Inaktiv"}
            </span>
          </div>
        )}
      </div>

      {/* Status Alert */}
      {personalStyle?.hasStyle && (
        <Alert className="py-2">
          <CheckCircle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            Din personliga stil är {personalStyle.isActive ? "aktiv" : "inaktiv"}.
          </AlertDescription>
        </Alert>
      )}

      {/* Reference Texts */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {personalStyle?.hasStyle ? "Uppdatera Exempeltexter" : "Lägg till Exempeltexter"}
            </CardTitle>
            {personalStyle?.hasStyle && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 h-7 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Radera
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Alert className="py-2">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Klistra in 1–3 korta stilprover (minst 100 tecken vardera).
            </AlertDescription>
          </Alert>

          {referenceTexts.map((text, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">
                  Exempel {index + 1}{index === 0 ? " (obligatorisk)" : " (valfri)"}
                </label>
                <Badge variant={text.length >= 100 ? "success" : text.length > 0 ? "error" : "secondary"} className="text-[10px] h-4">
                  {text.length}/100
                </Badge>
              </div>
              <Textarea
                value={text}
                onChange={(e) => {
                  const newTexts = [...referenceTexts];
                  newTexts[index] = e.target.value;
                  setReferenceTexts(newTexts);
                }}
                placeholder={index === 0
                  ? "Öppning och tonalitet..."
                  : index === 1
                    ? "Planlösning och rumsflöde..."
                    : "Läge och avslut..."}
                className="min-h-[120px] text-xs resize-y"
              />
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || referenceTexts.filter(text => text.trim().length >= 100).length < 1}
              className="flex-1 h-8 text-xs"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-1.5" />
              )}
              {personalStyle?.hasStyle ? "Uppdatera stil" : "Spara stil"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
