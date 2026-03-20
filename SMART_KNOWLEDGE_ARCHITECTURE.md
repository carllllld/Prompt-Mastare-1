# Smart Knowledge Architecture för OptiPrompt

## Problem
Vi kan inte packa all domänkunskap i en enda prompt - det blir för stort och AI:n tappar fokus.

## Lösning: Hybrid Architecture

### Layer 1: Core Prompt (alltid inkluderad)
**Size:** ~15,000 tecken (~4,000 tokens)

```typescript
const CORE_PROMPT = {
  role: "Du är en erfaren svensk mäklare med 15 års erfarenhet...",
  
  process: `
    1. ANALYSERA dispositionen noggrant
    2. PLANERA textens struktur och nyckelbudskap
    3. SKRIV texten med perfekt svenska
    4. SJÄLVKONTROLLERA stavning, grammatik och mäklarrealism
  `,
  
  swedishRules: `
    - Perfekt stavning (å, ä, ö)
    - Korrekt grammatik och interpunktion
    - Naturlig svensk mäklarprosa
    - Undvik AI-klyschor: "välkommen till", "erbjuder", "bjuder på"
  `,
  
  examples: [
    {
      bad: "Välkommen till denna fantastiska lägenhet som erbjuder...",
      good: "Ljus trea i Vasastan med renoverat kök och balkong mot gården.",
      reason: "Undvik AI-klyschor, var konkret och faktabaserad"
    },
    // 5-10 exempel totalt
  ],
  
  selfCheck: `
    Innan du returnerar texten, verifiera:
    ☐ Perfekt stavning (inga fel på å, ä, ö)
    ☐ Korrekt grammatik
    ☐ Inga AI-klyschor
    ☐ Alla fakta från dispositionen inkluderade
    ☐ Naturlig mäklarprosa
  `
};
```

### Layer 2: Dynamic Context (läggs till baserat på input)
**Size:** 0-5,000 tecken (~0-1,500 tokens) beroende på input

```typescript
interface DynamicContext {
  area?: AreaKnowledge;
  propertyType?: PropertyTypeKnowledge;
  targetAudience?: TargetAudienceKnowledge;
  legalRequirements?: LegalRequirement[];
}

// Exempel: Area Knowledge
const AREA_KNOWLEDGE = {
  "Vasastan": {
    strengths: [
      "Centralt läge i innerstaden",
      "Nära till Odenplan och St Eriksplan",
      "Rikt kulturutbud och restauranger",
      "Goda kommunikationer (tunnelbana, buss)"
    ],
    targetBuyers: ["Unga professionella", "Barnfamiljer", "Seniorer"],
    typicalPhrases: [
      "I hjärtat av Vasastan",
      "Ett av Stockholms mest eftertraktade områden",
      "Nära till allt"
    ],
    avoid: [
      "Undvik att överdriva - Vasastan är känt, behöver inte säljas hårt",
      "Fokusera på läge och närhet till service"
    ]
  },
  
  "Södermalm": {
    strengths: [
      "Trendigt och levande område",
      "Nära till vatten och grönområden",
      "Restauranger, kaféer och butiker",
      "Stark gemenskap och kulturliv"
    ],
    targetBuyers: ["Unga professionella", "Kreativa yrkesgrupper", "Barnfamiljer"],
    typicalPhrases: [
      "På populära Södermalm",
      "I ett av stadens mest livliga områden",
      "Nära till Söders puls"
    ]
  }
  
  // ... fler områden
};

// Exempel: Property Type Knowledge
const PROPERTY_TYPE_KNOWLEDGE = {
  "lägenhet": {
    keyPoints: [
      "Boarea och antal rum",
      "Våningsplan och hiss",
      "Balkong/uteplats",
      "Avgift och vad den inkluderar"
    ],
    legalRequired: [
      "Boarea måste anges",
      "Avgift måste anges",
      "Energiklass om tillgänglig"
    ]
  },
  
  "villa": {
    keyPoints: [
      "Tomtstorlek och läge",
      "Antal rum och våningsplan",
      "Uppvärmningssystem",
      "Garage/carport"
    ],
    legalRequired: [
      "Tomtstorlek måste anges",
      "Uppvärmningssystem måste anges",
      "Energiklass om tillgänglig"
    ]
  }
};

// Exempel: Target Audience Knowledge
const TARGET_AUDIENCE_KNOWLEDGE = {
  "barnfamiljer": {
    focus: [
      "Närhet till skolor och förskolor",
      "Lekplatser och grönområden",
      "Trygg miljö",
      "Utrymme (antal rum, förvaring)"
    ],
    tone: "Trygg, familjär, praktisk",
    avoid: ["Nattliv", "Barer", "Festlokaler"]
  },
  
  "unga professionella": {
    focus: [
      "Kommunikationer till city",
      "Närhet till gym, restauranger, kaféer",
      "Modernt och fräscht",
      "Låg avgift/driftskostnad"
    ],
    tone: "Modern, urban, dynamisk",
    avoid: ["Barnvänligt", "Lugnt och tryggt"]
  },
  
  "seniorer": {
    focus: [
      "Hiss och tillgänglighet",
      "Närhet till service (apotek, vårdcentral)",
      "Trygg miljö",
      "Låga driftskostnader"
    ],
    tone: "Trygg, bekväm, praktisk",
    avoid: ["Trappor", "Renoveringsbehov"]
  }
};

// Smart selection function
function buildDynamicContext(disposition: any): string {
  let context = "";
  
  // Add area knowledge if available
  if (disposition.area && AREA_KNOWLEDGE[disposition.area]) {
    context += `\n## OMRÅDESKUNSKAP: ${disposition.area}\n`;
    context += formatAreaKnowledge(AREA_KNOWLEDGE[disposition.area]);
  }
  
  // Add property type knowledge
  if (disposition.propertyType && PROPERTY_TYPE_KNOWLEDGE[disposition.propertyType]) {
    context += `\n## OBJEKTTYP: ${disposition.propertyType}\n`;
    context += formatPropertyTypeKnowledge(PROPERTY_TYPE_KNOWLEDGE[disposition.propertyType]);
  }
  
  // Add target audience knowledge if specified
  if (disposition.targetAudience && TARGET_AUDIENCE_KNOWLEDGE[disposition.targetAudience]) {
    context += `\n## MÅLGRUPP: ${disposition.targetAudience}\n`;
    context += formatTargetAudienceKnowledge(TARGET_AUDIENCE_KNOWLEDGE[disposition.targetAudience]);
  }
  
  return context;
}
```

### Layer 3: Post-Processing Validation (deterministisk)
**Körs EFTER AI-generering, ingen AI-kostnad**

```typescript
interface ValidationResult {
  factConsistency: FactCheckResult;
  legalCompliance: LegalCheckResult;
  targetAudienceAlignment: AudienceCheckResult;
  issues: ValidationIssue[];
}

async function validateOutput(
  output: GenerationResult,
  input: GenerationRequest
): Promise<ValidationResult> {
  
  // 1. Fact consistency check
  const factCheck = checkFactConsistency(output, input);
  // Exempel: Input säger "3 rum" men output säger "4 rum" → ERROR
  
  // 2. Legal compliance check
  const legalCheck = checkLegalCompliance(output, input);
  // Exempel: Bostadsrätt utan avgift angiven → ERROR
  
  // 3. Target audience alignment check
  const audienceCheck = checkTargetAudienceAlignment(output, input);
  // Exempel: Text för barnfamiljer men nämner bara nattliv → WARNING
  
  return {
    factConsistency: factCheck,
    legalCompliance: legalCheck,
    targetAudienceAlignment: audienceCheck,
    issues: [...factCheck.issues, ...legalCheck.issues, ...audienceCheck.issues]
  };
}

// Fact consistency checker
function checkFactConsistency(output: GenerationResult, input: GenerationRequest): FactCheckResult {
  const issues: ValidationIssue[] = [];
  
  // Extract facts from input
  const inputFacts = {
    rooms: input.disposition.totalRooms,
    area: input.disposition.livingArea,
    floor: input.disposition.floor,
    // ... etc
  };
  
  // Extract facts from output (regex-based)
  const outputFacts = extractFactsFromText(output.improvedPrompt);
  
  // Compare
  if (inputFacts.rooms !== outputFacts.rooms) {
    issues.push({
      type: 'fact_mismatch',
      severity: 'critical',
      field: 'rooms',
      expected: inputFacts.rooms,
      actual: outputFacts.rooms,
      message: `Input anger ${inputFacts.rooms} rum men texten säger ${outputFacts.rooms} rum`
    });
  }
  
  // ... fler checks
  
  return {
    consistent: issues.length === 0,
    issues
  };
}

// Legal compliance checker
function checkLegalCompliance(output: GenerationResult, input: GenerationRequest): LegalCheckResult {
  const issues: ValidationIssue[] = [];
  
  // Check required fields based on property type
  if (input.disposition.propertyType === 'bostadsrätt') {
    if (!output.improvedPrompt.includes('avgift') && !input.disposition.monthlyFee) {
      issues.push({
        type: 'legal_requirement',
        severity: 'critical',
        field: 'monthlyFee',
        message: 'Bostadsrätt måste ange avgift'
      });
    }
  }
  
  // Check energy class if available
  if (input.disposition.energyClass && !output.improvedPrompt.includes(input.disposition.energyClass)) {
    issues.push({
      type: 'legal_requirement',
      severity: 'important',
      field: 'energyClass',
      message: 'Energiklass finns i input men saknas i texten'
    });
  }
  
  // ... fler checks
  
  return {
    compliant: issues.filter(i => i.severity === 'critical').length === 0,
    issues
  };
}
```

### Layer 4: Expert Analysis (separat AI-anrop)
**Redan implementerat i `perfect-swedish-analyzer.ts`**

```typescript
// Detta körs redan efter generation
const expertAnalysis = await expertAnalyzer.analyze({
  improvedPrompt: output.improvedPrompt,
  headline: output.headline,
  socialCopy: output.socialCopy,
  disposition: input.disposition,
  style: input.style,
  platform: input.platform
});

// Ger feedback på:
// - Grammatik och stavning
// - Stil och ton
// - Juridisk korrekthet
// - Mäklarrealism
// - Klarhet och läsbarhet
```

## Implementation Plan

### Steg 1: Skapa kunskapsbas (1 vecka)
```typescript
// server/lib/knowledge-base.ts
export const AREA_KNOWLEDGE = { /* ... */ };
export const PROPERTY_TYPE_KNOWLEDGE = { /* ... */ };
export const TARGET_AUDIENCE_KNOWLEDGE = { /* ... */ };

export function buildDynamicContext(disposition: any): string {
  // Smart selection logic
}
```

### Steg 2: Uppdatera generator (1 dag)
```typescript
// server/lib/perfect-swedish-generator.ts
async function generate(request: GenerationRequest): Promise<GenerationResult> {
  // Build core prompt
  const corePrompt = buildCorePrompt();
  
  // Add dynamic context
  const dynamicContext = buildDynamicContext(request.disposition);
  
  // Combine
  const fullPrompt = corePrompt + dynamicContext + buildUserPrompt(request);
  
  // Generate
  const result = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      { role: 'system', content: fullPrompt },
      { role: 'user', content: JSON.stringify(request.disposition) }
    ],
    reasoning_effort: 'medium',
    // ...
  });
  
  return parseResult(result);
}
```

### Steg 3: Lägg till post-processing validation (2 dagar)
```typescript
// server/lib/semantic-validator.ts
export async function validateOutput(
  output: GenerationResult,
  input: GenerationRequest
): Promise<ValidationResult> {
  // Fact checking
  // Legal compliance
  // Target audience alignment
}

// Integrera i orchestrator
const result = await generator.generate(request);
const validation = await semanticValidator.validate(result, request);

if (!validation.factConsistency.consistent) {
  // Retry with explicit fact correction instructions
}
```

### Steg 4: Testa och iterera (1 vecka)
- Kör A/B-test med och utan dynamic context
- Mät success rate, generation time, user satisfaction
- Justera kunskapsbas baserat på feedback

## Token Budget Analysis

```
FÖRE (nuvarande):
- System prompt: 15,000 tecken (~4,000 tokens)
- User prompt: 10,000 tecken (~2,500 tokens)
- Total input: ~6,500 tokens
- Output: ~2,000 tokens
- Total: ~8,500 tokens

EFTER (med dynamic context):
- Core prompt: 15,000 tecken (~4,000 tokens)
- Dynamic context: 5,000 tecken (~1,500 tokens) [MAX]
- User prompt: 10,000 tecken (~2,500 tokens)
- Total input: ~8,000 tokens
- Output: ~2,000 tokens
- Total: ~10,000 tokens

GPT-5.2 limit: 128,000 tokens
Margin: 118,000 tokens (92% headroom)
```

**Vi har gott om utrymme!**

## Fördelar med denna approach

✅ **Skalbar:** Lägg till mer kunskap utan att överbelasta prompts
✅ **Fokuserad:** AI:n får bara relevant information
✅ **Testbar:** Varje layer kan testas separat
✅ **Underhållbar:** Lätt att uppdatera kunskapsbas
✅ **Snabb:** Dynamic context läggs till i millisekunder
✅ **Deterministisk validering:** Inga extra AI-kostnader för fact-checking

## Nackdelar och risker

⚠️ **Mer komplexitet:** Fler komponenter att underhålla
⚠️ **Kunskapsbas måste underhållas:** Kräver kontinuerlig uppdatering
⚠️ **Selection logic:** Måste vara smart för att välja rätt kontext

## Slutsats

**JA, AI:n kan hantera detta!** Men inte genom att packa allt i en enda prompt. Istället använder vi en smart hybrid-arkitektur:

1. **Core prompt:** Alltid inkluderad, fokuserar på process och svenska
2. **Dynamic context:** Läggs till baserat på input (område, objekttyp, målgrupp)
3. **Post-processing validation:** Deterministisk fact-checking och legal compliance
4. **Expert analysis:** Separat AI-anrop för kvalitetsfeedback

Detta ger oss:
- Djup domänkunskap utan att överbelasta prompts
- Fokuserad AI-attention på relevant information
- Deterministisk validering utan extra AI-kostnader
- Skalbarhet för framtida kunskapsutökning

**Nästa steg:** Implementera Layer 1-3 enligt plan ovan (2 veckor arbete).
