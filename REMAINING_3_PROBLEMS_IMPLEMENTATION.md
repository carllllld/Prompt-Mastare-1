# ÅTERSTÅENDE 3 PROBLEM - IMPLEMENTATION

## STATUS: IMPLEMENTERAR NU (3 av 15 kvar - 20%)

Baserat på `KOMPLETT_MAKLARE_ANALYS.md` och `ULTIMATE_FINAL_SUMMARY.md`.

---

## PROBLEM #13: FORMULÄR-DUPLICERING (~4h)

### Problem
Golvvärme efterfrågas 4 gånger:
1. Chip i "Badrum" → "Golvvärme i badrum"
2. Chip i "Uppvärmning" → "Golvvärme"
3. Fritextfält "Badrum beskrivning"
4. Fritextfält "Uppvärmning beskrivning"

**Mäklarens frustration:**
> "Jag har redan sagt att det finns golvvärme! Varför frågar ni 4 gånger?"

### Lösning: Smart Chip-to-Text Auto-Fill

**Strategi:**
- När mäklare väljer chip → auto-fyll fritextfält med strukturerad text
- Visa tydlig indikation att texten är auto-genererad
- Låt mäklare redigera/ta bort om de vill
- Normalisera dupliceringar vid submit (redan implementerat)

**Implementation:**

1. **Auto-fill när chip väljs:**
```typescript
// När "Renoverat kök" väljs:
→ Fritextfält fylls med: "Renoverat kök"
→ Mäklare kan lägga till: "Renoverat kök 2019, Ballingslöv, kvartskomposit"

// När "Golvvärme i badrum" väljs:
→ Badrum-fritextfält: "Golvvärme i badrum"
→ Uppvärmning-fritextfält: INTE påverkad (olika kontext)
```

2. **Smart context-aware auto-fill:**
```typescript
// Badrum-chips påverkar ENDAST badrum-fritextfält
// Uppvärmning-chips påverkar ENDAST uppvärmning-fritextfält
// Kök-chips påverkar ENDAST kök-fritextfält
```

3. **Visual feedback:**
```typescript
// Visa badge när auto-fill används:
<span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
  Auto-ifylld från chip
</span>
```

**Filer att modifiera:**
- `client/src/components/PromptFormProfessional.tsx` - Auto-fill logic
- Ingen backend-ändring (normalisering redan implementerad)

**Komplexitet:** Medel (3h)
**Impact:** Hög (minskar frustration dramatiskt)

---

## PROBLEM #14: GUIDAD VITEC-SETUP (~2h)

### Problem
Tar 15 minuter att sätta upp Vitec:
1. Gå till Inställningar
2. Hitta API-nyckel i Vitec (var?)
3. Hitta Kund-ID i Vitec (var?)
4. Klistra in båda
5. Testa att det fungerar
6. Gå tillbaka till formuläret

**Mäklarens frustration:**
> "Detta tar 15 minuter! Jag vill bara importera ett objekt!"

### Lösning: Guided Onboarding Flow

**Strategi:**
- Första gången: Visa guided setup med screenshots
- Steg-för-steg instruktioner
- Inline setup (inte separat sida)
- Testa direkt i flödet

**Implementation:**

1. **Onboarding banner (första gången):**
```tsx
// client/src/components/VitecOnboardingBanner.tsx (redan finns!)
// Förbättra med:
- Steg-för-steg guide
- Screenshots från Vitec
- "Hoppa över" option
- Progress indicator (Steg 1/3)
```

2. **Inline setup flow:**
```tsx
// När mäklare klickar "Koppla Vitec":
→ Modal öppnas med guided setup
→ Steg 1: "Logga in på Vitec Express"
→ Steg 2: "Gå till Inställningar → API-nycklar" (med screenshot)
→ Steg 3: "Kopiera API-nyckel och Kund-ID" (med screenshot)
→ Steg 4: "Klistra in här" (inline form)
→ Steg 5: "Testa anslutning" (auto-test)
→ ✅ "Klart! Nu kan du importera objekt"
```

3. **Screenshots att lägga till:**
```
/attached_assets/vitec-setup-step1.png - Vitec login
/attached_assets/vitec-setup-step2.png - API-nycklar sida
/attached_assets/vitec-setup-step3.png - Kopiera nyckel
```

**Filer att modifiera:**
- `client/src/components/VitecOnboardingBanner.tsx` - Guided flow
- `client/src/pages/IntegrationsSettings.tsx` - Inline setup option
- `client/src/components/IntegrationsPanel.tsx` - Onboarding trigger

**Komplexitet:** Medel (2h)
**Impact:** Hög (minskar setup-tid från 15 min → 2 min)

---

## PROBLEM #15: BÄTTRE FELMEDDELANDEN (~1h)

### Problem
När Hemnet-import misslyckas:
```
❌ "Kunde inte hämta text"
```

**Mäklarens frustration:**
> "Varför misslyckades det? Är det mitt fel? Vad ska jag göra?"

### Lösning: Förklarande Felmeddelanden

**Strategi:**
- Förklara VARFÖR det misslyckades
- Föreslå lösningar
- Visa retry-knapp
- Fallback till manuell input

**Implementation:**

1. **Hemnet-fel (redan bra i backend, förbättra frontend):**
```typescript
// server/lib/hemnet-integration.ts (redan bra!)
// Fel-typer:
- HemnetNotFoundError: "Annonsen hittades inte"
- HemnetRateLimitError: "Hemnet blockerade förfrågan"
- HemnetParseError: "Kunde inte läsa objektdata"

// Frontend ska visa dessa med lösningar:
```

2. **Frontend error display:**
```tsx
// client/src/components/IntegrationsPanel.tsx
// Förbättra error handling:

if (error.type === "HemnetNotFoundError") {
  return (
    <Alert variant="destructive">
      <AlertCircle className="w-4 h-4" />
      <AlertTitle>Annonsen hittades inte</AlertTitle>
      <AlertDescription>
        <p>Hemnet-annonsen kunde inte hittas. Detta kan bero på:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Annonsen har tagits bort från Hemnet</li>
          <li>Länken är felaktig eller ofullständig</li>
          <li>Annonsen är inte längre aktiv</li>
        </ul>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" onClick={retry}>
            Försök igen
          </Button>
          <Button size="sm" onClick={switchToManual}>
            Fyll i manuellt istället
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

if (error.type === "HemnetRateLimitError") {
  return (
    <Alert variant="warning">
      <AlertCircle className="w-4 h-4" />
      <AlertTitle>Hemnet blockerade förfrågan</AlertTitle>
      <AlertDescription>
        <p>Hemnet begränsar antalet förfrågningar per minut.</p>
        <p className="mt-2">Vänta 30 sekunder och försök igen.</p>
        <div className="mt-4">
          <Button size="sm" onClick={retryAfterDelay}>
            Försök igen om 30 sek
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

3. **Vitec-fel (förbättra):**
```tsx
// Vitec-specifika fel:
- VitecAuthError: "Ogiltig API-nyckel"
- VitecNotFoundError: "Objektet hittades inte"
- VitecApiError: "Vitec API-fel"

// Visa med lösningar:
if (error.type === "VitecAuthError") {
  return (
    <Alert variant="destructive">
      <AlertCircle className="w-4 h-4" />
      <AlertTitle>Ogiltig Vitec API-nyckel</AlertTitle>
      <AlertDescription>
        <p>Din Vitec API-nyckel fungerar inte. Kontrollera att:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>API-nyckeln är korrekt kopierad från Vitec</li>
          <li>Kund-ID stämmer med ditt Vitec-konto</li>
          <li>API-nyckeln har behörighet för PublicAdvertising</li>
        </ul>
        <div className="mt-4">
          <Button size="sm" onClick={openSettings}>
            Uppdatera Vitec-inställningar
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

**Filer att modifiera:**
- `client/src/components/IntegrationsPanel.tsx` - Error display
- `client/src/hooks/use-hemnet-analysis.ts` - Error handling
- Ingen backend-ändring (redan bra!)

**Komplexitet:** Låg (1h)
**Impact:** Medel (minskar förvirring, ökar tillit)

---

## IMPLEMENTATION PLAN

### Fas 1: Bättre Felmeddelanden (1h) - SNABB WIN
1. Förbättra error display i `IntegrationsPanel.tsx`
2. Lägg till retry-knappar
3. Lägg till fallback till manuell input
4. Testa alla fel-scenarion

### Fas 2: Guidad Vitec-Setup (2h) - MEDEL IMPACT
1. Förbättra `VitecOnboardingBanner.tsx` med steg-för-steg
2. Lägg till inline setup i `IntegrationsSettings.tsx`
3. Lägg till screenshots (placeholder först)
4. Testa onboarding-flödet

### Fas 3: Formulär-Duplicering (3h) - STOR ARBETE
1. Implementera auto-fill logic i `PromptFormProfessional.tsx`
2. Lägg till visual feedback för auto-fill
3. Testa alla chip-kombinationer
4. Verifiera att normalisering fungerar

---

## TOTAL TID: ~6 timmar

**Prioritering:**
1. **Fas 1** (1h) - Snabb win, låg komplexitet
2. **Fas 2** (2h) - Medel impact, medel komplexitet
3. **Fas 3** (3h) - Hög impact, hög komplexitet

**Rekommendation:**
- Implementera Fas 1 och 2 NU (3h totalt)
- Fas 3 kan vänta tills efter användarfeedback

---

## NÄSTA STEG

1. ✅ Läs alla relevanta filer
2. ⏳ Implementera Fas 1: Bättre felmeddelanden
3. ⏳ Implementera Fas 2: Guidad Vitec-setup
4. ⏳ Implementera Fas 3: Formulär-duplicering
5. ⏳ Testa alla 3 funktioner
6. ⏳ Dokumentera i `FINAL_COMPLETE_SUMMARY.md`

---

**Datum:** 2026-04-02
**Status:** PÅBÖRJAD
**Mål:** Lösa sista 20% av mäklarproblem
