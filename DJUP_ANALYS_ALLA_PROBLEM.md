# DJUP ANALYS: Alla problem med Perfect Swedish Pipeline

**Datum:** 2026-03-21  
**Status:** KRITISK - Två fundamentala problem identifierade

---

## PROBLEM 1: Pris/avgift i Hemnet-texter (KRITISKT)

### Vad som är fel
Generator-prompten för Hemnet STYCKE 5 säger:
```
"Avsluta med avgift och ev. driftkostnad."
```

### Varför detta är HELT FEL
På Hemnet visas pris, avgift och driftkostnad i **SEPARATA FÄLT** i annonsen. De ska **ALDRIG** nämnas i objektbeskrivningen.

### Korrekt Hemnet-struktur
**STYCKE 5 för Hemnet:**
- Läge: gatunamn, stadsdel
- Kommunikationer: avstånd i minuter till tunnelbana/pendeltåg
- Närservice: matbutik, skola, park (med namn)
- **INGEN EKONOMI** (pris, avgift, driftkostnad)

### Jämförelse plattformar
| Plattform | Ekonomi i text? | Energiklass i text? |
|-----------|----------------|---------------------|
| Hemnet    | ❌ NEJ (visas separat) | ❌ NEJ (visas separat) |
| Booli     | ✅ JA (kan nämnas) | ✅ JA (om säljargument) |
| Egen sida | ✅ JA (kan nämnas) | ✅ JA (kan nämnas) |

### Root cause
Prompten instruerar GPT att göra **FEL SAKER** för Hemnet. Detta är inte ett GPT-problem, det är ett **PROMPT-PROBLEM**.

---

## PROBLEM 2: Inga styckebrytningar (KRITISKT)

### Vad som händer
1. ✅ Post-processor LÄGGER TILL `\n\n` (logs visar `paragraph_enforcement`)
2. ✅ Backend SKICKAR `improvedPrompt` med `\n\n` via JSON
3. ✅ Frontend TAR EMOT data korrekt
4. ❌ Men texten VISAS utan styckebrytningar i UI

### Root cause: `finalizeMainMarketingText()` STRIPPAR newlines

**Kedjan som förstör styckebrytningar:**

```typescript
// 1. Post-processor lägger till \n\n
result.improvedPrompt = "Stycke 1.\n\nStycke 2.\n\nStycke 3."

// 2. routes.ts anropar finalizeMainMarketingText()
finalized = await finalizeMainMarketingText(
  result.improvedPrompt,
  platform,
  styleProfile,
  style,
  { allowParagraphs: true },  // ← Detta borde bevara \n\n
  disposition
);

// 3. PROBLEM: Alla dessa funktioner använder .join(" ") som STRIPPAR \n\n:
finalized = stripPlatformDisallowedMainTextSentences(finalized, platform);
// → sentences.join(" ") ← STRIPPAR \n\n

finalized = enforcePlatformMainTextHeuristics(finalized, platform, disposition);
// → sentences.join(" ") ← STRIPPAR \n\n

finalized = enforceOpeningStrengthByStyle(finalized, style, disposition);
// → sentences.join(" ") ← STRIPPAR \n\n

finalized = enforceLocationClosingQuality(finalized, platform, disposition);
// → sentences.join(" ") ← STRIPPAR \n\n

// 4. addParagraphs() försöker lägga tillbaka \n\n men det är för sent
// Texten har redan bearbetats och meningar kan ha ändrats
```

### Varför detta är ett problem

**Alla dessa funktioner:**
```typescript
const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
// ... gör ändringar ...
return sentences.join(" ");  // ← STRIPPAR ALLA \n\n
```

**Detta betyder:**
- Post-processor lägger till `\n\n` ✅
- Men `finalizeMainMarketingText()` tar bort dem ❌
- `addParagraphs()` försöker lägga tillbaka dem, men texten har redan ändrats

### Bevis från koden

**`stripPlatformDisallowedMainTextSentences` (line 1146):**
```typescript
const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const filtered = sentences.filter(...);
return filtered.join(" ");  // ← STRIPPAR \n\n
```

**`enforcePlatformMainTextHeuristics` (line 1156):**
```typescript
const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
// ... ändringar ...
return sentences.join(" ");  // ← STRIPPAR \n\n
```

**`enforceOpeningStrengthByStyle` (line 1194):**
```typescript
const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
// ... ändringar ...
return sentences.join(" ");  // ← STRIPPAR \n\n
```

**`enforceLocationClosingQuality` (line 1225):**
```typescript
const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
// ... ändringar ...
return sentences.join(" ");  // ← STRIPPAR \n\n
```

**`addParagraphs` (line 1854):**
```typescript
// CRITICAL FIX: If text already has paragraph breaks, preserve them!
const existingParagraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
if (existingParagraphs.length >= 3) {
  return text;  // ← Detta körs ALDRIG eftersom \n\n redan är borta!
}

// Försöker lägga tillbaka \n\n men texten har redan ändrats
const normalized = text.replace(/\n+/g, " ");  // ← Tar bort ALLA \n
```

---

## PROBLEM 3: Arkitekturfel - Pipeline-ordning

### Nuvarande ordning (FEL)
```
1. Generator → skapar text med \n\n
2. Post-processor → lägger till fler \n\n
3. finalizeMainMarketingText() → STRIPPAR ALLA \n\n
4. addParagraphs() → försöker lägga tillbaka \n\n (för sent)
```

### Korrekt ordning (RÄTT)
```
1. Generator → skapar text med \n\n
2. finalizeMainMarketingText() → bearbetar text MEN BEVARAR \n\n
3. Post-processor → lägger till fler \n\n om nödvändigt
4. INGEN addParagraphs() behövs
```

### Varför nuvarande ordning är fel

**Problem:**
- `finalizeMainMarketingText()` anropas EFTER post-processor
- Den strippar alla `\n\n` som post-processor lagt till
- `addParagraphs()` försöker fixa det men texten har redan ändrats

**Lösning:**
- Flytta `finalizeMainMarketingText()` FÖRE post-processor
- ELLER: Fixa alla funktioner att bevara `\n\n`

---

## LÖSNINGAR (prioritetsordning)

### LÖSNING 1: Fix Hemnet-prompt (HÖGSTA PRIORITET)

**Ändra i `server/lib/perfect-swedish-generator.ts`:**

```typescript
// FÖRE (FEL):
STYCKE 5 — LÄGE, KOMMUNIKATIONER, EKONOMI (2–3 meningar)
...Avsluta med avgift och ev. driftkostnad.

// EFTER (RÄTT):
STYCKE 5 — LÄGE OCH KOMMUNIKATIONER (2–3 meningar)
Konkret lägesbeskrivning: gatunamn, stadsdel, avstånd i minuter till tunnelbana/pendeltåg/spårvagn.
Nearby: matbutik, skola, park — med namn.
VIKTIGT: NÄMN INTE pris, avgift eller driftkostnad — det visas i separata fält på Hemnet.
```

**Lägg till i Plattformsregler:**
```typescript
- NÄMN ALDRIG pris, utgångspris, avgift eller driftkostnad i texten — det visas i separata fält
```

**Bumpa PROMPT_VERSION:**
```typescript
private readonly PROMPT_VERSION = '2.7.0';  // Från 2.6.0
```

### LÖSNING 2A: Fix paragraph-stripping (ENKLAST)

**Ändra alla funktioner i `server/routes.ts` att bevara `\n\n`:**

```typescript
function stripPlatformDisallowedMainTextSentences(text: string, platform: string): string {
  if (!text) return text;
  const blockedPatterns = PLATFORM_MAIN_TEXT_BLOCKLIST[(platform || "").toLowerCase()] || [];
  if (blockedPatterns.length === 0) return text;

  // FÖRE: Split på meningar, join med space
  // const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  // return filtered.join(" ");

  // EFTER: Bevara styckebrytningar
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const processedParagraphs = paragraphs.map(paragraph => {
    const sentences = paragraph.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const filtered = sentences.filter((sentence) => 
      blockedPatterns.every((pattern) => !pattern.test(sentence))
    );
    return filtered.join(" ");
  });
  return processedParagraphs.join("\n\n");
}
```

**Samma fix för:**
- `enforcePlatformMainTextHeuristics`
- `enforceOpeningStrengthByStyle`
- `enforceLocationClosingQuality`
- `applyProfessionalNarrativePolish`

### LÖSNING 2B: Flytta finalizeMainMarketingText (BÄTTRE)

**Ändra pipeline-ordning i orchestrator:**

```typescript
// FÖRE (FEL):
1. Generator
2. Post-processor (lägger till \n\n)
3. finalizeMainMarketingText (strippar \n\n)

// EFTER (RÄTT):
1. Generator
2. finalizeMainMarketingText (bearbetar text)
3. Post-processor (lägger till \n\n)
```

**Men detta kräver:**
- Ändra `server/routes.ts` där `finalizeMainMarketingText` anropas
- Testa att alla funktioner fungerar i ny ordning
- Mer riskabelt än LÖSNING 2A

### LÖSNING 3: Lägg till validation

**Efter generation, innan response:**

```typescript
// Validate Hemnet-specific rules
if (platform === 'hemnet') {
  const pricePatterns = /\b(pris|avgift|driftkostnad|kr\/mån|utgångspris)\b/gi;
  if (pricePatterns.test(result.improvedPrompt)) {
    console.error('[HEMNET VIOLATION] Text contains price/fee information');
    // Strip the offending sentences
    result.improvedPrompt = stripPriceReferences(result.improvedPrompt);
  }
}

// Validate paragraph breaks
const paragraphCount = (result.improvedPrompt.match(/\n\n/g) || []).length;
if (paragraphCount < 3) {
  console.error('[PARAGRAPH VIOLATION] Text has only', paragraphCount, 'breaks, need 3+');
  throw new Error('Generated text missing paragraph breaks');
}
```

---

## IMPLEMENTATION PLAN

### Fas 1: Hemnet-fix (OMEDELBART)
1. ✅ Ändra STYCKE 5 i generator-prompt
2. ✅ Lägg till "NÄMN ALDRIG pris/avgift" i Plattformsregler
3. ✅ Bumpa PROMPT_VERSION till 2.7.0
4. ✅ Lägg till Hemnet-validering i analyzer
5. ✅ Deploy och testa

**Estimat:** 15 minuter  
**Risk:** Låg (enkel prompt-ändring)

### Fas 2: Paragraph-fix (SAMMA DAG)
1. ✅ Fixa `stripPlatformDisallowedMainTextSentences` att bevara `\n\n`
2. ✅ Fixa `enforcePlatformMainTextHeuristics` att bevara `\n\n`
3. ✅ Fixa `enforceOpeningStrengthByStyle` att bevara `\n\n`
4. ✅ Fixa `enforceLocationClosingQuality` att bevara `\n\n`
5. ✅ Fixa `applyProfessionalNarrativePolish` att bevara `\n\n`
6. ✅ Deploy och testa

**Estimat:** 45 minuter  
**Risk:** Medel (många funktioner att ändra)

### Fas 3: Validation (SAMMA DAG)
1. ✅ Lägg till Hemnet price/fee validation
2. ✅ Lägg till paragraph break validation
3. ✅ Lägg till logging för violations
4. ✅ Deploy och testa

**Estimat:** 20 minuter  
**Risk:** Låg (bara validation)

---

## TESTING CHECKLIST

### Hemnet-test
- [ ] Generera Hemnet-text med avgift i disposition
- [ ] Verifiera att INGEN avgift/pris nämns i `improvedPrompt`
- [ ] Verifiera att INGEN energiklass nämns i `improvedPrompt`
- [ ] Verifiera att STYCKE 5 innehåller läge + kommunikationer

### Booli-test
- [ ] Generera Booli-text med avgift i disposition
- [ ] Verifiera att avgift/pris KAN nämnas i `improvedPrompt`
- [ ] Verifiera att energiklass KAN nämnas om säljargument

### Paragraph-test
- [ ] Generera text för alla plattformar
- [ ] Verifiera att `improvedPrompt` innehåller minst 3 `\n\n`
- [ ] Verifiera att texten visas med styckebrytningar i UI
- [ ] Verifiera att TextEditor visar styckebrytningar
- [ ] Verifiera att InlineHighlights visar styckebrytningar

### Regression-test
- [ ] Kör alla befintliga tester
- [ ] Verifiera att expert feedback fortfarande fungerar
- [ ] Verifiera att kvalitetspoäng är rimliga
- [ ] Verifiera att forbidden phrases inte finns

---

## EXPECTED BEHAVIOR EFTER FIX

### Hemnet-text (KORREKT)
```
Helrenoverat kök 2022 med köksö och södervända balkongen ger den här 3:an på Södermalm ett tydligt övertag.

Planlösningen samlar kök och vardagsrum i vinkel, med skjutdörrar ut mot den södervända uteplatsen. Köket har kompositbänk, gott om förvaring och integrerade Siemens-vitvaror.

Tre sovrum fungerar väl som barnrum, gästrum eller hemmakontor. Två helkaklade badrum renoverades 2021 med duschvägg i glas och badkar.

Södermalm med närhet till Medborgarplatsen och Skanstull. Tunnelbanan nås på 5 minuter och Coop finns runt hörnet.
```

**Notera:**
- ✅ 4 stycken med `\n\n` mellan varje
- ✅ INGEN mention av avgift, pris eller driftkostnad
- ✅ INGEN mention av energiklass
- ✅ Sista stycket = läge + kommunikationer (INGEN ekonomi)

### Booli-text (KORREKT)
```
[Samma struktur men kan sluta med:]

Södermalm med närhet till Medborgarplatsen. Tunnelbanan nås på 5 minuter. Avgift 4 500 kr/mån, driftkostnad 800 kr/mån.
```

**Notera:**
- ✅ Avgift/driftkostnad KAN nämnas för Booli
- ✅ Fortfarande 4 stycken med `\n\n`

---

## SLUTSATS

Du har helt rätt i din kritik. Systemet har **TVÅ FUNDAMENTALA PROBLEM**:

1. **Hemnet-prompten är felaktig** - den instruerar GPT att lägga till ekonomi som INTE ska finnas
2. **Pipeline strippar styckebrytningar** - `finalizeMainMarketingText()` tar bort alla `\n\n` som post-processor lagt till

**Båda problemen är FIXBARA:**
- Problem 1: Ändra prompt (15 min)
- Problem 2: Fixa 5 funktioner att bevara `\n\n` (45 min)

**Total tid:** ~1 timme  
**Risk:** Låg-medel  
**Impact:** KRITISK - fixar båda huvudproblemen

Vill du att jag implementerar dessa fixes nu?
