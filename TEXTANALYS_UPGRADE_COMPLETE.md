# Textanalys - Uppgradering till Generell Plattform

## ✅ Vad Som Är Klart

### 1. UI-Ändringar
- ✅ Bytt namn från "Hemnet Textanalys" → "Textanalys"
- ✅ Lagt till mode-väljare: "URL-import" vs "Manuell text"
- ✅ Lagt till textarea för manuell text-input
- ✅ Uppdaterat beskrivningar för att inkludera alla plattformar
- ✅ Uppdaterat navigation i Home.tsx

### 2. Funktionalitet
- ✅ URL-mode fungerar (Hemnet)
- ⏳ Manuell text-mode (visar toast, behöver backend)

## 🔧 Vad Som Behöver Göras

### Backend: Manuell Textanalys Endpoint

**Ny endpoint behövs:**
```
POST /api/text/analyze
Body: { text: string }
Response: { analysis: {...}, metadata: {...} }
```

**Vad den ska göra:**
1. Ta emot vilken text som helst
2. Kör samma expert-analys som Hemnet-analysen
3. Returnera förbättringsförslag
4. Räkna mot samma quota (hemnetAnalysesUsed)

### Booli Integration (Framtida)

**Om du vill lägga till Booli URL-import:**
1. Skapa `server/lib/booli-integration.ts` (liknande hemnet-integration.ts)
2. Lägg till URL-validering för booli.se
3. Scrapa text + bilder från Booli
4. Använd samma analyslogik

### Vitec Integration (Framtida)

**Om du vill lägga till Vitec URL-import:**
1. Använd befintlig `server/lib/vitec-integration.ts`
2. Lägg till funktion för att hämta befintlig text från Vitec
3. Använd samma analyslogik

## 📊 Nuvarande Arkitektur

```
Textanalys-sida
├── URL-mode
│   ├── Hemnet URL → /api/integrations/hemnet/analyze ✅
│   ├── Booli URL → /api/integrations/booli/analyze ⏳
│   └── Vitec URL → /api/integrations/vitec/analyze ⏳
└── Manuell mode
    └── Text → /api/text/analyze ⏳
```

## 🎯 Rekommenderad Implementation

### Steg 1: Skapa Generell Textanalys Endpoint

**Fil:** `server/routes.ts`

```typescript
// Generell textanalys (fungerar för alla texter)
app.post("/api/text/analyze", requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: "Text krävs" });
    }

    if (text.length < 50) {
      return res.status(400).json({ message: "Texten är för kort (minst 50 tecken)" });
    }

    if (text.length > 10000) {
      return res.status(400).json({ message: "Texten är för lång (max 10000 tecken)" });
    }

    const userId = req.user!.id;
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "Användare hittades inte" });
    }

    // Check quota
    const usage = await storage.getMonthlyUsage(userId, user);
    const plan = user.plan || "free";
    const limit = PLAN_LIMITS[plan].hemnetAnalyses;
    const used = usage?.hemnetAnalysesUsed || 0;

    if (used >= limit) {
      return res.status(403).json({
        message: `Du har använt alla dina ${limit} analyser denna månad`,
        limitReached: true,
        upgradeRequired: plan === "free",
      });
    }

    // Run expert analysis
    const { ExpertAIAnalyzer } = await import("./lib/perfect-swedish-analyzer");
    const analyzer = new ExpertAIAnalyzer();
    
    const startTime = Date.now();
    const analysis = await analyzer.analyzeText(text);
    const duration = Date.now() - startTime;

    // Track usage
    await storage.incrementUsage(userId, 'hemnetAnalyses');

    // Calculate metadata
    const wordCount = text.split(/\s+/).length;
    const paragraphCount = text.split(/\n\n+/).length;
    const sentenceCount = text.split(/[.!?]+/).length;

    res.json({
      originalText: text,
      analysis: {
        ...analysis,
        duration,
      },
      metadata: {
        wordCount,
        paragraphCount,
        sentenceCount,
      },
      images: [], // No images for manual text
    });
  } catch (error: any) {
    console.error("[Text Analysis] Error:", error);
    res.status(500).json({ message: error.message || "Kunde inte analysera texten" });
  }
});
```

### Steg 2: Uppdatera Frontend Hook

**Fil:** `client/src/hooks/use-hemnet-analysis.ts`

Lägg till ny hook:

```typescript
/**
 * Hook for analyzing any text (not just Hemnet)
 */
export function useTextAnalysis() {
  const queryClient = useQueryClient();

  return useMutation<HemnetAnalysisResult, Error, string>({
    mutationFn: async (text: string) => {
      const res = await apiRequest('POST', '/api/text/analyze', { text });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Okänt fel' }));
        throw new Error(error.message || 'Kunde inte analysera texten');
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Invalidate user status to update quota
      queryClient.invalidateQueries({ queryKey: ['/api/user/status'] });
    },
  });
}
```

### Steg 3: Uppdatera HemnetAnalysis.tsx

**Fil:** `client/src/pages/HemnetAnalysis.tsx`

Importera och använd den nya hooken:

```typescript
import { useHemnetAnalysis, useTextAnalysis } from "@/hooks/use-hemnet-analysis";

// I komponenten:
const hemnetMutation = useHemnetAnalysis();
const textMutation = useTextAnalysis();

// I handleAnalyze:
if (inputMode === "url") {
  hemnetMutation.mutate(hemnetUrl, { ... });
} else {
  textMutation.mutate(manualText, {
    onSuccess: (data) => {
      setAnalysisResult({
        ...data,
        property: {
          id: "manual",
          url: "",
          address: "Manuell text",
          city: "",
        },
      });
      setEditedText(data.originalText);
      // ... rest of success handling
    },
    onError: (error: any) => {
      toast({
        title: "Analys misslyckades",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
```

## 🚀 Deployment

Efter att du har implementerat backend-endpointen:

1. Testa lokalt
2. Commit och push
3. Render deployer automatiskt
4. Testa i produktion

## 📝 Användningsfall

### URL-mode (Hemnet)
1. Användaren klistrar in Hemnet URL
2. System hämtar text + bilder automatiskt
3. Analyserar texten
4. Visar förbättringsförslag + bilder

### Manuell mode
1. Användaren klistrar in vilken text som helst
2. System analyserar texten direkt
3. Visar förbättringsförslag
4. Inga bilder (eftersom det är manuell text)

### Framtida: Booli URL
1. Användaren klistrar in Booli URL
2. System känner igen booli.se
3. Hämtar text + bilder från Booli
4. Analyserar och visar resultat

## 🎯 Fördelar Med Denna Lösning

1. **Flexibel** - Fungerar för alla plattformar
2. **Utbyggbar** - Lätt att lägga till fler plattformar
3. **Användarvänlig** - Användaren väljer själv: URL eller manuell
4. **Samma quota** - Alla analyser räknas lika
5. **Samma kvalitet** - Samma AI-experter för alla texter

## 📊 Quota System

Alla analyser (URL eller manuell) räknas mot samma quota:
- Free: 1 analys/månad
- Pro: 5 analyser/månad
- Premium: 15 analyser/månad

## 🔮 Framtida Förbättringar

1. **Smart URL-igenkänning** - Automatisk detektering av Hemnet/Booli/Vitec
2. **Booli-integration** - Automatisk import från Booli
3. **Vitec-integration** - Automatisk import från Vitec
4. **Bilduppladdning** - Låt användare ladda upp bilder för manuell text
5. **Batch-analys** - Analysera flera texter samtidigt
6. **Export** - Exportera analys som PDF

## ✅ Sammanfattning

**Klart:**
- UI för att välja URL eller manuell text
- Hemnet URL-import fungerar
- Navigation uppdaterad

**Behöver göras:**
- Backend endpoint för manuell textanalys
- Frontend hook för manuell textanalys
- Koppla ihop frontend med backend

**Estimerad tid:** 30 minuter för att implementera manuell textanalys

Vill du att jag implementerar backend-endpointen nu?
