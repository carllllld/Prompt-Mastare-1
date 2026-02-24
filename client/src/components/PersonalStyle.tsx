import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, Trash2, Save, Eye, EyeOff, Users, CheckCircle, AlertCircle } from "lucide-react";
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
  const [showPreview, setShowPreview] = useState(false);

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
        setPersonalStyle(prev => ({ 
          ...prev, 
          hasStyle: true, 
          styleProfile: data.styleProfile,
          isActive: true 
        }));
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

    try {
      const res = await fetch("/api/personal-style", {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setPersonalStyle(null);
        setReferenceTexts(["", "", ""]);
        toast({
          title: "Personlig stil raderad",
          description: "AI:n kommer nu att använda standardstilen.",
        });
      }
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte radera personlig stil",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    try {
      const res = await fetch("/api/personal-style", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });

      if (res.ok) {
        setPersonalStyle(prev => prev ? { ...prev, isActive } : null);
        toast({
          title: isActive ? "Personlig stil aktiverad" : "Personlig stil inaktiverad",
        });
      }
    } catch (error) {
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
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Laddar personlig stil...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Personlig Skrivstil
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Lär AI:n din unika skrivstil med 1–3 exempeltexter
          </p>
        </div>
        
        {personalStyle?.hasStyle && (
          <div className="flex items-center gap-2">
            <Switch
              checked={personalStyle.isActive}
              onCheckedChange={handleToggleActive}
            />
            <span className="text-sm text-gray-600">
              {personalStyle.isActive ? "Aktiv" : "Inaktiv"}
            </span>
          </div>
        )}
      </div>

      {/* Status Alert */}
      {personalStyle?.hasStyle && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Din personliga stil är {personalStyle.isActive ? "aktiv" : "inaktiv"}. 
            AI:n anpassar texterna efter din skrivstil när den är aktiv.
          </AlertDescription>
        </Alert>
      )}

      {/* Style Profile Display */}
      {personalStyle?.styleProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Din Stilprofil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(personalStyle.styleProfile).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(value as number) * 10}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
                      {getStyleLabel(value as number, key)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reference Texts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {personalStyle?.hasStyle ? "Uppdatera Exempeltexter" : "Lägg till Exempeltexter"}
            </CardTitle>
            {personalStyle?.hasStyle && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Radera
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Klistra in 1–3 av dina bästa objektbeskrivningar (minst 100 tecken vardera).
              Fler exempel ger AI:n bättre förståelse för din skrivstil.
            </AlertDescription>
          </Alert>

          {referenceTexts.map((text, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Exempel {index + 1}{index === 0 ? " (obligatorisk)" : " (valfri)"}
                </label>
                <Badge variant={text.length >= 100 ? "default" : text.length > 0 ? "destructive" : "secondary"}>
                  {text.length}/100 tecken
                </Badge>
              </div>
              <Textarea
                value={text}
                onChange={(e) => {
                  const newTexts = [...referenceTexts];
                  newTexts[index] = e.target.value;
                  setReferenceTexts(newTexts);
                }}
                placeholder={`Klistra in din ${index + 1}:a objektbeskrivning här...`}
                className="min-h-[120px]"
              />
            </div>
          ))}

          <div className="flex items-center gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || referenceTexts.filter(text => text.trim().length >= 100).length < 1}
              className="flex-1"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {personalStyle?.hasStyle ? "Uppdatera Stil" : "Spara Stil"}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Förhandsgranskning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {referenceTexts.map((text, index) => (
                text && (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      Exempel {index + 1}
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {text}
                    </div>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
