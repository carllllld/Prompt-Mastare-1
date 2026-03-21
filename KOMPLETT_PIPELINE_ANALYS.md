# KOMPLETT PIPELINE-ANALYS: Alla steg i finalizeMainMarketingText()

**Datum:** 2026-03-21  
**Status:** FULLSTÄNDIG GENOMGÅNG

---

## Pipeline-ordning i finalizeMainMarketingText()

```typescript
async function finalizeMainMarketingText(
  text: unknown,
  platform: string,
  styleProfile?: any,
  style: WritingStyle = "balanced",
  options?: { allowParagraphs?: boolean; nullIfInvalid?: boolean },
  disposition?: any
): Promise<string | null>
```

### STEG-FÖR-STEG ANALYS

#### STEG 0: Sanitize input
```typescript
const sanitized = sanitizeGeneratedMarketingField(text, styleProfile, style, options, platform);
```
**Status:** ✅ Ingen paragraph-hantering behövs (bara validering)

---

#### STEG 1: stripPlatformDisallowedMainTextSentences
```typescript
let finalized = stripPlatformDisallowedMainTextSentences(sanitized, platform);
```
**Status:** ✅ FIXAD - Bevarar nu `\n\n`

---

#### STEG 2: Hemnet-specifik energiklass-filtrering
```typescript
if ((platform || "").toLowerCase() === "hemnet") {
  const sentences = finalized.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  
  // Filtrera bort energiklass
  const filteredSentences = sentences.filter(sentence => {
    const lower = sentence.toLowerCase();
    return !(/energiklass(?:en)?\s+[a-g]/i.test(lower)) && 
           !(/\bbostaden har energiklass\b/i.test(lower));
  });
  
  // Hantera tekniska meningar
  const technicalSentences = filteredSentences.filter(sentence => {
    const lower = sentence.toLowerCase();
    return /^fiber\s+är\s+installerat/i.test(lower) ||
           (/^uppvärmning sker via/i.test(lower) && sentence.split(/\s+/).length <= 8);
  });

  if (technicalSentences.length > 0) {
    const mainTextSentences = filteredSentences.filter((s) => !technicalSentences.includes(s));
    const technicalTail = technicalSentences
      .map((s) => s.replace(/^fiber\s+är\s+installerat/i, "Fiber är installerat")
                   .replace(/^uppvärmning sker via/i, "Uppvärmning sker via"))
      .join(". ")
      .replace(/\.\s*\./g, ".");
    finalized = `${mainTextSentences.join(" ")} ${technicalTail}`.replace(/\s{2,}/g, " ").trim();
  } else {
    finalized = filteredSentences.join(" ");
  }
}
```

**Status:** ❌ PROBLEM HITTAT!
- Detta steg STRIPPAR `\n\n` genom att använda `.join(" ")`
- Körs BARA för Hemnet
- Måste fixas för att bevara styckebrytningar

**FIX BEHÖVS:** Denna sektion måste också bevara `\n\n`

---

#### STEG 3: enforcePlatformMainTextHeuristics
```typescript
finalized = enforcePlatformMainTextHeuristics(finalized, platform, disposition);
```
**Status:** ✅ FIXAD - Bevarar nu `\n\n`

---

#### STEG 4: enforceOpeningStrengthByStyle
```typescript
finalized = enforceOpeningStrengthByStyle(finalized, style, disposition);
```
**Status:** ✅ FIXAD - Bevarar nu `\n\n`

---

#### STEG 5: enforceCriticalFactPresence
```typescript
finalized = enforceCriticalFactPresence(finalized, disposition);
```
**Status:** ⚠️ BEHÖVER GRANSKAS
- Lägger till meningar i slutet: `return ${text.trim()} ${sentences.join(" ")}`
- Använder `.join(" ")` men lägger bara till i slutet
- Borde vara OK men kan förbättras

---

#### STEG 6: Restaurangnamn-generalisering (inline regex)
```typescript
finalized = finalized.replace(/\b(Kikka|COME 2 EAT|ChopChop Asian Express Värmdö|ChopChop)\b/gi, 'restauranger');
finalized = finalized.replace(/\bflera lunch- och middagsalternativ som restauranger\b/gi, 'flera restauranger och caféer');
finalized = finalized.replace(/\boch restauranger när\b/gi, 'när');
finalized = finalized.replace(/\b(restauranger|caféer|matställen)(?:\s*,\s*\1)+(?:\s+och\s+\1)?/gi, '$1');
finalized = finalized.replace(/\b(restauranger|caféer|matställen)\s+och\s+\1\b/gi, '$1');
```
**Status:** ✅ OK - Regex-replacements bevarar `\n\n`

---

#### STEG 7: applyProfessionalNarrativePolish
```typescript
finalized = applyProfessionalNarrativePolish(finalized, disposition, style, platform);
```
**Status:** ✅ FIXAD - Bevarar nu `\n\n`

---

#### STEG 8: enforceLocationClosingQuality
```typescript
finalized = enforceLocationClosingQuality(finalized, platform, disposition);
```
**Status:** ✅ FIXAD - Bevarar nu `\n\n`

---

#### STEG 9: addParagraphs (optional)
```typescript
if (options?.allowParagraphs) {
  finalized = addParagraphs(finalized);
}
```
**Status:** ✅ OK - Har redan check för befintliga `\n\n`

---

## PROBLEM HITTAT: STEG 2 (Hemnet energiklass-filtrering)

### Root cause
Hemnet-specifik energiklass-filtrering använder:
```typescript
const sentences = finalized.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
// ... filtrering ...
finalized = filteredSentences.join(" ");  // ← STRIPPAR \n\n
```

### Impact
- Körs BARA för Hemnet
- Strippar ALLA `\n\n` som STEG 1 bevarade
- Betyder att Hemnet-texter ALDRIG får styckebrytningar

### Fix Required
Måste ändra STEG 2 att bevara `\n\n` precis som de andra funktionerna.

---

## ANDRA FUNKTIONER ATT GRANSKA

### enforceCriticalFactPresence (STEG 5)
**Nuvarande kod:**
```typescript
if (sentences.length === 0) return text;
return `${text.trim()} ${sentences.join(" ")}`.replace(/\s{2,}/g, " ").trim();
```

**Problem:**
- Lägger till meningar i slutet med `.join(" ")`
- Men texten har redan `\n\n` från tidigare steg
- Lägger till i slutet = sista stycket

**Rekommendation:**
Borde lägga till meningar i rätt stycke (inte bara i slutet), men det är en mindre issue.

---

## SAMMANFATTNING

### ✅ Fixade funktioner (5 st)
1. `stripPlatformDisallowedMainTextSentences` - Bevarar `\n\n`
2. `enforcePlatformMainTextHeuristics` - Bevarar `\n\n`
3. `enforceOpeningStrengthByStyle` - Bevarar `\n\n`
4. `applyProfessionalNarrativePolish` - Bevarar `\n\n`
5. `enforceLocationClosingQuality` - Bevarar `\n\n`

### ❌ Behöver fixas (1 st)
1. **Hemnet energiklass-filtrering (STEG 2)** - Strippar `\n\n`

### ⚠️ Kan förbättras (1 st)
1. `enforceCriticalFactPresence` - Lägger till meningar i slutet istället för i rätt stycke

---

## KRITISK FIX BEHÖVS

### STEG 2: Hemnet energiklass-filtrering

**Före (FEL):**
```typescript
if ((platform || "").toLowerCase() === "hemnet") {
  const sentences = finalized.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  // ... filtrering ...
  finalized = filteredSentences.join(" ");  // ← STRIPPAR \n\n
}
```

**Efter (RÄTT):**
```typescript
if ((platform || "").toLowerCase() === "hemnet") {
  // CRITICAL FIX: Preserve paragraph breaks while filtering
  const paragraphs = finalized.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  
  const processedParagraphs = paragraphs.map(paragraph => {
    const sentences = paragraph.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    
    // Filtrera bort energiklass
    const filteredSentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return !(/energiklass(?:en)?\s+[a-g]/i.test(lower)) && 
             !(/\bbostaden har energiklass\b/i.test(lower));
    });
    
    // Hantera tekniska meningar
    const technicalSentences = filteredSentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return /^fiber\s+är\s+installerat/i.test(lower) ||
             (/^uppvärmning sker via/i.test(lower) && sentence.split(/\s+/).length <= 8);
    });

    if (technicalSentences.length > 0) {
      const mainTextSentences = filteredSentences.filter((s) => !technicalSentences.includes(s));
      const technicalTail = technicalSentences
        .map((s) => s.replace(/^fiber\s+är\s+installerat/i, "Fiber är installerat")
                     .replace(/^uppvärmning sker via/i, "Uppvärmning sker via"))
        .join(". ")
        .replace(/\.\s*\./g, ".");
      return `${mainTextSentences.join(" ")} ${technicalTail}`.replace(/\s{2,}/g, " ").trim();
    } else {
      return filteredSentences.join(" ");
    }
  });
  
  finalized = processedParagraphs.join("\n\n");
}
```

---

## SLUTSATS

Jag missade ETT kritiskt steg: **Hemnet energiklass-filtrering (STEG 2)**

Detta steg körs BARA för Hemnet och strippar ALLA `\n\n` som tidigare steg bevarade.

**Detta förklarar varför:**
- Booli/Egen sida kanske fungerar (de kör inte STEG 2)
- Men Hemnet ALDRIG får styckebrytningar (STEG 2 strippar dem)

**FIX BEHÖVS OMEDELBART:** Fixa STEG 2 att bevara `\n\n` precis som de andra funktionerna.
