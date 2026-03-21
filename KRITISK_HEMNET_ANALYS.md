# KRITISK ANALYS: Hemnet-texter är felaktiga

## Problem 1: Pris/avgift nämns i Hemnet-texter (KRITISKT FEL)

### Vad som är fel
Generator-prompten säger för Hemnet STYCKE 5:
> "Avsluta med avgift och ev. driftkostnad."

### Varför detta är fel
På Hemnet visas pris, avgift och driftkostnad i SEPARATA FÄLT i annonsen. De ska ALDRIG nämnas i objektbeskrivningen.

### Korrekt Hemnet-struktur
**STYCKE 5 för Hemnet ska vara:**
- Läge: gatunamn, stadsdel
- Kommunikationer: avstånd i minuter till tunnelbana/pendeltåg/spårvagn
- Närservice: matbutik, skola, park (med namn)
- **INGEN EKONOMI** (pris, avgift, driftkostnad)

### Jämförelse med andra plattformar
- **Hemnet**: Ekonomi visas i separata fält → NÄMN INTE i text
- **Booli**: Ekonomi kan nämnas i text → "Avgift och driftkostnad"
- **Egen sida**: Ekonomi kan nämnas i text → "Utgångspris X kr"

---

## Problem 2: Inga styckebrytningar i UI (FORTFARANDE INTE LÖST)

### Vad vi vet
1. Post-processor LÄGGER TILL `\n\n` (logs visar `paragraph_enforcement: 1`)
2. Backend SKICKAR `improvedPrompt` med `\n\n` via JSON
3. Frontend TAR EMOT data korrekt
4. Men texten VISAS utan styckebrytningar i UI

### Möjliga orsaker
1. **InlineHighlights strippar newlines** när expertAnalysis finns
2. **TextEditor strippar newlines** när expertAnalysis INTE finns
3. **Något i rendering-kedjan** konverterar `\n\n` till spaces

### Vad jag fixade (men fungerade inte)
- Ändrade `innerText` → `textContent` i TextEditor
- Men InlineHighlights används när expertAnalysis finns!

### Verklig lösning
Behöver fixa BÅDA:
1. TextEditor (redan fixat med `textContent`)
2. InlineHighlights (använder `whitespace-pre-wrap` men kanske inte räcker)

---

## Problem 3: GPT-5.2 ignorerar instruktioner

### Observation
Trots tydliga instruktioner i prompten:
- GPT lägger FORTFARANDE till avgift/pris i Hemnet-texter
- GPT skapar FORTFARANDE texter utan styckebrytningar

### Möjliga orsaker
1. **Prompt är för lång** → GPT missar viktiga delar
2. **Instruktioner är motsägelsefulla** → GPT väljer fel tolkning
3. **Exempel saknas** → GPT förstår inte vad som menas
4. **Redis cache** → Gammal prompt används (men PROMPT_VERSION är 2.6.0)

### Lösning
1. **Förenkla prompten** - ta bort onödig text
2. **Lägg till NEGATIVA exempel** - visa vad som INTE ska göras
3. **Gör regler mer explicita** - använd CAPS och upprepning
4. **Lägg till validation** - kolla output och varna om fel

---

## Rekommenderade åtgärder (prioritetsordning)

### 1. FIX HEMNET-PROMPT (HÖGSTA PRIORITET)
**Ändra STYCKE 5 för Hemnet:**
```
STYCKE 5 — LÄGE OCH KOMMUNIKATIONER (2–3 meningar)
Konkret lägesbeskrivning: gatunamn, stadsdel, avstånd i minuter till tunnelbana/pendeltåg/spårvagn. 
Nearby: matbutik, skola, park — med namn.
VIKTIGT: NÄMN INTE pris, avgift eller driftkostnad — det visas i separata fält på Hemnet.
```

**Lägg till i Plattformsregler:**
```
- NÄMN ALDRIG pris, utgångspris, avgift eller driftkostnad i texten — det visas i separata fält
```

### 2. FIX STYCKEBRYTNINGAR
**Två möjliga lösningar:**

**A. Enklaste (rekommenderad):**
Lägg till explicit validering i post-processor som KASTAR FEL om texten saknar `\n\n`:
```typescript
if (!/\n\n/.test(result.improvedPrompt)) {
  throw new Error('Generated text missing paragraph breaks');
}
```

**B. Mer robust:**
Lägg till i generator-prompten:
```
KRITISKT: Din output MÅSTE innehålla minst 3 styckebrytningar (\n\n).
Exempel på korrekt format:
"Första stycket här.\n\nAndra stycket här.\n\nTredje stycket här."
```

### 3. LÄGG TILL POST-GENERATION VALIDATION
Efter generation, innan response:
```typescript
// Validate Hemnet-specific rules
if (platform === 'hemnet') {
  const pricePatterns = /\b(pris|avgift|driftkostnad|kr\/mån|utgångspris)\b/gi;
  if (pricePatterns.test(result.improvedPrompt)) {
    console.warn('[HEMNET VIOLATION] Text contains price/fee information');
    // Either: throw error and retry
    // Or: strip the offending sentence
  }
}

// Validate paragraph breaks
const paragraphCount = (result.improvedPrompt.match(/\n\n/g) || []).length;
if (paragraphCount < 3) {
  console.warn('[PARAGRAPH VIOLATION] Text has only', paragraphCount, 'breaks, need 3+');
  // Force paragraph breaks via post-processor
}
```

### 4. FÖRBÄTTRA PROMPT-STRUKTUR
**Nuvarande problem:**
- Prompt är ~200 rader lång
- Viktiga regler drunknar i text
- GPT-5.2 reasoning mode kan missa detaljer

**Lösning:**
```
## KRITISKA REGLER (MÅSTE FÖLJAS)

1. STYCKEBRYTNINGAR: Använd \n\n mellan VARJE stycke (minst 3 stycken)
2. HEMNET-EKONOMI: NÄMN ALDRIG pris, avgift eller driftkostnad
3. HEMNET-ENERGI: NÄMN ALDRIG energiklass eller energiprestanda

Om du bryter mot dessa regler kommer texten att kasseras.
```

---

## Slutsats

Du har helt rätt i din kritik. Systemet har två fundamentala problem:

1. **Hemnet-prompten är felaktig** - den instruerar GPT att lägga till ekonomi som INTE ska finnas
2. **Styckebrytningar fungerar inte** - trots att post-processor lägger till dem

Båda problemen kräver omedelbar fix. Jag rekommenderar att vi:
1. Fixar Hemnet-prompten FÖRST (enkel ändring, stor effekt)
2. Lägger till validation som KASTAR FEL om regler bryts
3. Testar i produktion med riktiga Hemnet-texter

Vill du att jag implementerar dessa fixes nu?
