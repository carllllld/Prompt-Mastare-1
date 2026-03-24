# KRITISK TEXTANALYS - Villa Ekorrvägen 10
**Datum:** 2026-03-24  
**Analystyp:** Djup rotorsaksanalys av genererade texter och UI-buggar

---

## SAMMANFATTNING

Denna analys identifierar **12 kritiska problem** i 4 kategorier:
1. **UI-buggar** (3 st) - Hindrar användaren från att se och använda feedback
2. **Textgenereringsproblem** (4 st) - AI producerar förbjudna fraser och dålig struktur  
3. **Valideringsproblem** (3 st) - Systemet fångar inte upp fel som det borde
4. **Juridiska problem** (2 st) - Hemnet-regelbrott som kan leda till avvisad annons

---

## DEL 1: KRITISKA UI-BUGGAR

### BUG 1.1: Feedback-panelen är inte scrollbar (KRITISK)
**Problem:** Användaren kan inte se alla feedback-items längst ner i listan.

**Rotorsak:**
```tsx
// client/src/components/ExpertFeedbackPanel.tsx, rad 207
<ScrollArea className="flex-1 max-h-[500px]">
```

`ScrollArea` har `max-h-[500px]` men när accordion-items expanderas blir innehållet längre. Användaren kan inte scrolla till items längst ner.

**Fix:**
```tsx
<ScrollArea className="flex-1 h-full">
  <div className="max-h-[600px] overflow-y-auto">
```

Eller bättre: Använd `flex-1` utan max-height och låt parent-containern styra höjden.

---

### BUG 1.2: Objektbeskrivningen saknar stycken i UI (KRITISK)
**Problem:** Texten visas som en enda lång paragraf i UI, men när man kopierar finns `\n\n` där.

**Rotorsak:**
```tsx
// client/src/components/TextEditor.tsx, rad 234
<div
  ref={editorRef}
  contentEditable
  suppressContentEditableWarning
  className="whitespace-pre-wrap ..."
>
  {text}
</div>
```

React renderar `{text}` som en text node. När `text` innehåller `\n\n`, renderas det som literal newlines i DOM men `contentEditable` div:en visar inte line breaks korrekt förrän användaren interagerar med den.

**Bevis:**
- Användaren ser: "Söderläget på Ekorrvägen 10 ger uteplatsen och terrassen många soltimmar och en tydlig utomhusdel att använda stora delar av året. Villan har 146 kvm i nyskick..."
- Men när man kopierar: Stycken finns där med `\n\n`

**Fix:**
```tsx
// Ta bort {text} från children och använd endast textContent i useEffect
<div
  ref={editorRef}
  contentEditable
  suppressContentEditableWarning
  className="whitespace-pre-wrap ..."
/>

// I useEffect:
useEffect(() => {
  if (editorRef.current) {
    editorRef.current.textContent = text;
  }
}, [text]);
```

---

### BUG 1.3: Dolda meningar i objektbeskrivningen (KRITISK)
**Problem:** "Ekonomi redovisas i annonsens separata fält.. fält.." syns inte i UI men finns när man kopierar.

**Rotorsak:** Samma som BUG 1.2 - texten finns i DOM men renderas inte visuellt förrän användaren interagerar.

**Extra problem:** Dubbel punkt ("fält.. fält..") är ett grammatikfel som borde ha fångats.

---

## DEL 2: TEXTGENERERINGSPROBLEM

### PROBLEM 2.1: Förbjuden fras "erbjuds" finns i texten (KRITISK)
**Bevis från juridisk feedback:**
> "innehåller ett förbjudet ord ("erbjuds")"

**Var finns det?**
Jag kan inte se "erbjuds" i de texter du skickade. Men juridisk feedback säger att det finns där. Detta betyder:
1. Antingen finns det i en dold del av texten (se BUG 1.3)
2. Eller så är det i ett auxiliary field (socialCopy, instagramCaption, etc.)

**Rotorsak:**
```typescript
// server/lib/text-rules.ts, rad 20
export const FORBIDDEN_PHRASES = [
  "erbjuder",
  "erbjuds",  // <-- Finns i listan
  ...
];
```

Men texten innehåller det ändå. Detta betyder att:
1. Post-processor missade att ersätta det
2. Eller AI:n genererade det EFTER post-processing (i auxiliary fields)

**Hypotes:** "erbjuds" finns troligen i `socialCopy` eller `instagramCaption` som genereras med lägre reasoning effort och kanske inte går genom samma post-processing.

---

### PROBLEM 2.2: Otydligt påstående "i nyskick" (JURIDISKT PROBLEM)
**Bevis från juridisk feedback:**
> "Påståendet "i nyskick" kan vara vilseledande om det inte kan styrkas objektivt"

**Var finns det:**
```
"Villan har 146 kvm i nyskick, med flera renoveringar..."
```

**Rotorsak:** AI:n drar slutsatser från renoveringsdata utan att ha bevis för att HELA villan är "i nyskick".

**Användarens input:**
- Kök renoverat 2023
- Badrum renoverat 2021
- Nya fönster och tjärpappstak

**AI:ns felaktiga slutsats:** "i nyskick" = hela villan

**Korrekt formulering:** "Villan om 146 kvm har genomgått flera renoveringar de senaste åren..."

---

### PROBLEM 2.3: Hemnet-regelbrott - ekonomihänvisning (JURIDISKT PROBLEM)
**Bevis från juridisk feedback:**
> "otillåten ekonomihänvisning enligt angivna Hemnet-regler"

**Var finns det:**
```
"Ekonomi redovisas i annonsens separata fält.. fält.."
```

**Rotorsak:** AI:n försöker vara hjälpsam och hänvisa till ekonomi-fältet, men Hemnet tillåter INTE sådana hänvisningar i objektbeskrivningen.

**Hemnet-regel:** Pris, avgift och driftskostnad får ENDAST stå i dedikerade fält, inte i löptext.

**Extra problem:** Dubbel punkt ("fält.. fält..") är ett grammatikfel.

---

### PROBLEM 2.4: Grammatikfel - dubbel punkt (KRITISKT)
**Bevis från juridisk feedback:**
> "grammatisk miss (dubbel punkt)"

**Var finns det:**
```
"Ekonomi redovisas i annonsens separata fält.. fält.."
```

**Rotorsak:** AI:n genererade en mening som slutar med punkt, sedan lade post-processor till något som också slutar med punkt.

**Hypotes:** Detta kan vara ett "stuttering" problem där AI:n upprepar sig själv när den är osäker.

---

## DEL 3: VALIDERINGSPROBLEM

### PROBLEM 3.1: "erbjuds" passerade validering (KRITISKT)
**Rotorsak:** Validering körs på `improvedPrompt` (huvudtexten) men inte på auxiliary fields.

**Bevis:**
```typescript
// server/lib/text-validation.ts, rad 148
for (const phrase of FORBIDDEN_PHRASES) {
  // Validerar endast huvudtexten
}
```

Men `socialCopy`, `instagramCaption`, `showingInvitation`, `shortAd` genereras separat och kanske inte valideras lika strikt.

**Fix:** Validera ALLA genererade fält, inte bara `improvedPrompt`.

---

### PROBLEM 3.2: "i nyskick" passerade juridisk validering
**Rotorsak:** Systemet har ingen regel för att flagga otydliga påståenden som "i nyskick", "mycket gott skick", "fräscht" utan bevis.

**Fix:** Lägg till regel:
```typescript
const UNVERIFIABLE_CLAIMS = [
  "i nyskick",
  "mycket gott skick",
  "fräscht",
  "välskött",
  "genomgående fint skick"
];

// Flagga dessa om de inte backas upp av specifika renoveringsår
```

---

### PROBLEM 3.3: Ekonomihänvisning passerade Hemnet-validering
**Rotorsak:** Systemet har ingen regel för att blockera ekonomihänvisningar i objektbeskrivningen.

**Fix:** Lägg till Hemnet-regel:
```typescript
const HEMNET_FORBIDDEN_PATTERNS = [
  /ekonomi.*redovisas/gi,
  /se.*ekonomi.*fält/gi,
  /pris.*avgift.*drift/gi,
  /\d+\s*kr\/mån/gi  // Avgift i löptext
];
```

---

## DEL 4: TEXTSTRUKTUR OCH KVALITETSPROBLEM

### PROBLEM 4.1: Förbjuden fras "erbjuds" (STIL)
**Bevis från stil-feedback:**
> "Förbjuden fras förekommer: "erbjuds" (i listan över förbjudna fraser)."

**Förslag från AI:**
> "Byt ut "erbjuds" mot neutralt faktaspråk, t.ex. "Bostaden har 2 badrum" eller "Det finns 2 badrum"."

**Analys:** Korrekt feedback, men varför genererades "erbjuds" från början?

---

### PROBLEM 4.2: Saknade stycken i objektbeskrivningen
**Bevis:** Användaren ser en enda lång paragraf, men texten innehåller faktiskt `\n\n`.

**Rotorsak:** Se BUG 1.2 ovan.

**Kvalitetsproblem:** Även om styckena fanns, är strukturen dålig:
- Stycke 1: 8 meningar (för långt)
- Stycke 2: Saknas (borde finnas mellan "Förvaring..." och "Köket...")
- Stycke 3: Saknas (borde finnas mellan "Golven..." och "Bostaden har 2 badrum...")

**Korrekt struktur:**
1. Öppning: Läge + översikt (2-3 meningar)
2. Planlösning: Rum + flöde (2-3 meningar)
3. Kök: Renovering + detaljer (2-3 meningar)
4. Badrum: Renovering + detaljer (2-3 meningar)
5. Utomhus: Uteplats + jacuzzi (2-3 meningar)
6. Läge: Närhet + kommunikationer (2-3 meningar)

---

### PROBLEM 4.3: Repetitiv struktur - "Bostaden har X"
**Bevis:**
- "Villan har 146 kvm..."
- "Vardagsrummet har gott om plats..."
- "Bostaden har 2 badrum..."

**Analys:** AI:n använder samma meningsstruktur för ofta. Bättre variation:
- "Villan om 146 kvm..."
- "I vardagsrummet finns plats för..."
- "Två helkaklade badrum renoverades 2021..."

---

### PROBLEM 4.4: Saknad konkret information
**Bevis från tydlighet-feedback:**
> "Påståendet "i nyskick" kan vara vilseledande..."

**Analys:** AI:n borde ha skrivit:
- "Villan om 146 kvm har genomgått omfattande renoveringar: kök 2023, badrum 2021, nya fönster och tjärpappstak."

Istället för:
- "Villan har 146 kvm i nyskick, med flera renoveringar som är enkla att värdera i vardagen."

---

## DEL 5: MÖNSTER OCH ROTORSAKER

### MÖNSTER 1: AI genererar förbjudna fraser i auxiliary fields
**Bevis:** "erbjuds" finns någonstans men inte i huvudtexten (som användaren ser).

**Hypotes:** Auxiliary fields (`socialCopy`, `instagramCaption`, etc.) genereras med lägre reasoning effort och går inte genom samma post-processing.

**Fix:**
1. Använd samma reasoning effort för alla fält
2. Kör post-processing på ALLA fält
3. Validera ALLA fält innan de returneras

---

### MÖNSTER 2: AI drar otydliga slutsatser från data
**Exempel:**
- Input: "Kök renoverat 2023, badrum 2021"
- AI:s slutsats: "i nyskick" (för hela villan)

**Rotorsak:** AI:n försöker vara säljande men saknar instruktion att ENDAST använda verifierbara fakta.

**Fix:** Lägg till i system prompt:
```
KRITISK REGEL: Använd ENDAST verifierbara fakta från input.
- "Kök renoverat 2023" = OK
- "i nyskick" = INTE OK (om inte hela villan renoverats samma år)
- "mycket gott skick" = INTE OK (subjektivt)
```

---

### MÖNSTER 3: Post-processor missar vissa fraser
**Bevis:** "erbjuds" finns i FORBIDDEN_PHRASES men passerade ändå.

**Rotorsak:** Post-processor kör regex-ersättningar men kanske inte på alla fält.

**Fix:** Se MÖNSTER 1 ovan.

---

### MÖNSTER 4: Validering körs inte på alla fält
**Bevis:** Juridisk feedback fångade "erbjuds" men systemet släppte igenom det.

**Rotorsak:** `findRuleViolations()` och `validateOptimizationResult()` validerar troligen endast `improvedPrompt`.

**Fix:**
```typescript
// Validera ALLA fält
const allFields = [
  result.improvedPrompt,
  result.headline,
  result.socialCopy,
  result.instagramCaption,
  result.showingInvitation,
  result.shortAd
];

for (const field of allFields) {
  const violations = findRuleViolations(field, style, platform);
  if (violations.length > 0) {
    // Flagga eller fixa
  }
}
```

---

## DEL 6: PRIORITERADE FIXES

### FIX 1: UI-buggar (HÖGSTA PRIORITET)
**Varför:** Användaren kan inte använda systemet korrekt.

1. **ExpertFeedbackPanel scrolling:**
   - Ta bort `max-h-[500px]`
   - Använd `flex-1 h-full` och låt parent styra höjden
   - Alternativt: Använd `max-h-[calc(100vh-400px)]` för dynamisk höjd

2. **TextEditor stycken:**
   - Ta bort `{text}` från children
   - Använd endast `textContent` i useEffect
   - Verifiera att `whitespace-pre-wrap` fungerar

3. **Dolda meningar:**
   - Samma fix som #2 ovan

---

### FIX 2: Validering av alla fält (HÖGSTA PRIORITET)
**Varför:** Förhindrar juridiska problem och Hemnet-avslag.

```typescript
// server/lib/perfect-swedish-orchestrator.ts
async execute(request: OrchestrationRequest): Promise<OrchestrationResult> {
  // ... generering ...
  
  // NYTT: Validera ALLA fält
  const fieldsToValidate = {
    improvedPrompt: result.improvedPrompt,
    headline: result.headline,
    socialCopy: result.socialCopy,
    instagramCaption: result.instagramCaption,
    showingInvitation: result.showingInvitation,
    shortAd: result.shortAd
  };
  
  for (const [fieldName, fieldValue] of Object.entries(fieldsToValidate)) {
    const violations = findRuleViolations(fieldValue, request.style, request.platform);
    if (violations.length > 0) {
      console.warn(`[Orchestrator] Violations in ${fieldName}:`, violations);
      // Kör post-processing igen eller flagga för manuell granskning
    }
  }
  
  return result;
}
```

---

### FIX 3: Post-processing av alla fält (HÖGSTA PRIORITET)
**Varför:** Förhindrar förbjudna fraser i alla fält.

```typescript
// server/lib/perfect-swedish-post-processor.ts
async process(request: PostProcessRequest): Promise<PostProcessResult> {
  // Kör post-processing på ALLA fält
  const processedFields = {
    improvedPrompt: this.cleanText(request.improvedPrompt, request.style, request.platform),
    headline: this.cleanText(request.headline, request.style, request.platform),
    socialCopy: this.cleanText(request.socialCopy, request.style, request.platform),
    instagramCaption: this.cleanText(request.instagramCaption, request.style, request.platform),
    showingInvitation: this.cleanText(request.showingInvitation, request.style, request.platform),
    shortAd: this.cleanText(request.shortAd, request.style, request.platform)
  };
  
  return processedFields;
}
```

---

### FIX 4: Hemnet-regler (HÖG PRIORITET)
**Varför:** Förhindrar avvisade annonser.

```typescript
// server/lib/text-rules.ts
export const HEMNET_FORBIDDEN_PATTERNS = [
  // Ekonomihänvisningar
  { pattern: /ekonomi.*redovisas/gi, message: "Ekonomihänvisning inte tillåten i objektbeskrivning" },
  { pattern: /se.*ekonomi.*fält/gi, message: "Hänvisning till ekonomifält inte tillåten" },
  { pattern: /pris.*avgift.*drift/gi, message: "Ekonomisk information ska endast stå i dedikerade fält" },
  
  // Avgift i löptext (Hemnet-regel: endast i dedikerat fält)
  { pattern: /\d+\s*kr\/mån/gi, message: "Avgift får inte stå i objektbeskrivning" },
  { pattern: /\d+\s*kronor.*månad/gi, message: "Avgift får inte stå i objektbeskrivning" },
  
  // Pris i löptext
  { pattern: /\d+\s*mkr/gi, message: "Pris får inte stå i objektbeskrivning" },
  { pattern: /\d+\s*miljoner/gi, message: "Pris får inte stå i objektbeskrivning" }
];
```

---

### FIX 5: Otydliga påståenden (HÖG PRIORITET)
**Varför:** Juridisk risk och köparförvirring.

```typescript
// server/lib/text-rules.ts
export const UNVERIFIABLE_CLAIMS = [
  { claim: "i nyskick", requiresEvidence: "renoveringsår för hela bostaden" },
  { claim: "mycket gott skick", requiresEvidence: "specifika renoveringar eller besiktning" },
  { claim: "fräscht", requiresEvidence: "renoveringsår eller målning" },
  { claim: "välskött", requiresEvidence: "underhållshistorik" },
  { claim: "genomgående fint skick", requiresEvidence: "besiktning eller omfattande renovering" }
];

// Validering:
function validateClaims(text: string, disposition: any): string[] {
  const issues: string[] = [];
  
  for (const { claim, requiresEvidence } of UNVERIFIABLE_CLAIMS) {
    if (text.toLowerCase().includes(claim)) {
      // Kolla om vi har bevis
      const hasEvidence = checkForEvidence(disposition, requiresEvidence);
      if (!hasEvidence) {
        issues.push(`Påståendet "${claim}" kräver ${requiresEvidence}`);
      }
    }
  }
  
  return issues;
}
```

---

### FIX 6: Styckeindelning (MEDEL PRIORITET)
**Varför:** Läsbarhet och professionalism.

```typescript
// server/lib/perfect-swedish-generator.ts
const PARAGRAPH_STRUCTURE_RULES = `
STYCKEINDELNING (KRITISKT):
1. Öppning (2-3 meningar): Läge + översikt
2. Planlösning (2-3 meningar): Rum + flöde
3. Kök (2-3 meningar): Renovering + detaljer
4. Badrum (2-3 meningar): Renovering + detaljer
5. Utomhus (2-3 meningar): Uteplats/balkong + detaljer
6. Läge (2-3 meningar): Närhet + kommunikationer

ANVÄND \\n\\n mellan varje stycke.
MAX 3 meningar per stycke.
`;
```

---

## DEL 7: TESTPLAN

### TEST 1: UI-buggar
1. Generera text med många feedback-items (>10)
2. Expandera alla kategorier
3. Verifiera att man kan scrolla till sista item
4. Verifiera att stycken visas korrekt i TextEditor
5. Verifiera att alla meningar syns (inga dolda)

### TEST 2: Förbjudna fraser
1. Generera 10 texter med olika objekt
2. Validera att INGEN text innehåller "erbjuds", "erbjuder", "välkommen till"
3. Validera ALLA fält (improvedPrompt, socialCopy, instagramCaption, etc.)

### TEST 3: Hemnet-regler
1. Generera text med ekonomidata (pris, avgift)
2. Verifiera att objektbeskrivningen INTE innehåller:
   - "Ekonomi redovisas..."
   - "X kr/mån"
   - "X mkr"
3. Verifiera att ekonomidata finns i dedikerade fält

### TEST 4: Otydliga påståenden
1. Generera text med renoveringsdata
2. Verifiera att texten INTE innehåller "i nyskick" om inte hela bostaden renoverats
3. Verifiera att påståenden backas upp av fakta

---

## DEL 8: LÅNGSIKTIG FÖRBÄTTRING

### FÖRBÄTTRING 1: Unified validation pipeline
Skapa en enda valideringspipeline som körs på ALLA fält:

```typescript
class UnifiedValidator {
  validate(allFields: GeneratedFields, context: ValidationContext): ValidationResult {
    const issues: Issue[] = [];
    
    // Validera varje fält
    for (const [fieldName, fieldValue] of Object.entries(allFields)) {
      issues.push(...this.validateField(fieldName, fieldValue, context));
    }
    
    return { issues, passed: issues.length === 0 };
  }
  
  private validateField(name: string, value: string, context: ValidationContext): Issue[] {
    return [
      ...this.checkForbiddenPhrases(value, context.style),
      ...this.checkPlatformRules(value, context.platform),
      ...this.checkUnverifiableClaims(value, context.disposition),
      ...this.checkGrammar(value),
      ...this.checkStructure(value, name)
    ];
  }
}
```

### FÖRBÄTTRING 2: Evidence-based claims
AI:n ska ENDAST göra påståenden som backas upp av data:

```typescript
interface EvidenceCheck {
  claim: string;
  requiredEvidence: (disposition: any) => boolean;
  alternative: string;
}

const EVIDENCE_CHECKS: EvidenceCheck[] = [
  {
    claim: "i nyskick",
    requiredEvidence: (d) => {
      const currentYear = new Date().getFullYear();
      return d.renovations?.every((r: any) => r.year >= currentYear - 2);
    },
    alternative: "har genomgått omfattande renoveringar de senaste åren"
  }
];
```

### FÖRBÄTTRING 3: Structured paragraph generation
Generera stycken separat och sätt ihop dem:

```typescript
interface ParagraphPlan {
  opening: { facts: string[], maxSentences: 3 },
  layout: { facts: string[], maxSentences: 3 },
  kitchen: { facts: string[], maxSentences: 3 },
  bathroom: { facts: string[], maxSentences: 3 },
  outdoor: { facts: string[], maxSentences: 3 },
  location: { facts: string[], maxSentences: 3 }
}

// Generera varje stycke separat
const paragraphs = await Promise.all([
  generateParagraph(plan.opening),
  generateParagraph(plan.layout),
  generateParagraph(plan.kitchen),
  // ...
]);

// Sätt ihop med \n\n
const fullText = paragraphs.join('\n\n');
```

---

## SLUTSATS

**12 kritiska problem identifierade:**
- 3 UI-buggar som hindrar användning
- 4 textgenereringsproblem som skapar dålig kvalitet
- 3 valideringsproblem som släpper igenom fel
- 2 juridiska problem som kan leda till avvisade annonser

**Rotorsaker:**
1. Auxiliary fields valideras inte lika strikt som huvudtext
2. Post-processing körs inte på alla fält
3. UI-komponenter renderar inte line breaks korrekt
4. AI:n drar otydliga slutsatser från data
5. Hemnet-regler saknas i valideringen

**Prioriterade fixes:**
1. UI-buggar (omedelbart)
2. Validering av alla fält (omedelbart)
3. Post-processing av alla fält (omedelbart)
4. Hemnet-regler (inom 24h)
5. Otydliga påståenden (inom 48h)
6. Styckeindelning (inom 1 vecka)

**Långsiktig förbättring:**
- Unified validation pipeline
- Evidence-based claims
- Structured paragraph generation

---

**Nästa steg:** Implementera FIX 1-3 omedelbart, sedan FIX 4-6 inom en vecka.
