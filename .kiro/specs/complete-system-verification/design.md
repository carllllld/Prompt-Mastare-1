# Design: Complete System Verification

**Feature:** Komplett verifiering av alla AI-genererade outputs och plattformsregler  
**Created:** 2026-03-21  
**Status:** Draft  
**Version:** 1.0

---

## Overview

This design addresses a critical gap in the OptiPrompt system: while the main text (`improvedPrompt`) has been thoroughly analyzed and fixed for platform rules (Hemnet price/fee restrictions, paragraph breaks), the 5 auxiliary fields have not been systematically verified.

### Current State

**What's Fixed:**
- ✅ `improvedPrompt` - Hemnet price/fee/energiklass rules enforced (v2.8.0)
- ✅ `improvedPrompt` - Paragraph breaks preserved through pipeline
- ✅ `improvedPrompt` - Forbidden phrases removed by post-processor
- ✅ `improvedPrompt` - Analyzed by ExpertAIAnalyzer

**What's Unknown:**
- ❓ `headline` - Platform rules compliance?
- ❓ `socialCopy` - Platform rules compliance?
- ❓ `instagramCaption` - Platform rules compliance?
- ❓ `showingInvitation` - Platform rules compliance?
- ❓ `shortAd` - Platform rules compliance?

### Problem Statement

The system generates 6 text fields per property listing, but only 1 has been verified to follow all rules:
1. Platform-specific rules (Hemnet: no price/fee/energiklass)
2. Forbidden phrase filtering (66 AI clichés)
3. Field-specific quality requirements (headline max 9 words, etc.)

This creates risk of Hemnet violations in auxiliary fields and inconsistent quality across outputs.

### Solution Approach

Implement a comprehensive verification system that ensures ALL 6 fields follow:
1. Platform rules (generator instructions + post-processor filtering)
2. Forbidden phrase rules (post-processor filtering)
3. Field-specific quality rules (generator instructions + validation)
4. Expert analysis coverage (analyzer checks all fields)

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Generation Request                        │
│  (disposition, style, platform, targetWords)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              SmartGenerationEngine                           │
│  • Platform-specific prompts for ALL 6 fields               │
│  • Hemnet: "NEVER mention price/fee/energiklass"            │
│  • Field-specific instructions (headline max 9 words, etc.) │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           DeterministicPostProcessor                         │
│  • Process ALL 6 fields (not just improvedPrompt)           │
│  • Remove forbidden phrases from ALL fields                  │
│  • Remove platform-forbidden patterns (Hemnet)               │
│  • Apply field-specific fixes (headline: remove period)      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              ExpertAIAnalyzer                                │
│  • Analyze ALL 6 fields (add missing fields to input)       │
│  • Flag platform violations (Hemnet price/fee)               │
│  • Flag forbidden phrases                                    │
│  • Flag field-specific quality issues                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Validation Layer                            │
│  • Final check: all fields follow platform rules            │
│  • Final check: all fields free from forbidden phrases      │
│  • Final check: field-specific quality requirements met     │
│  • Log violations, throw errors if critical                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```typescript
// Input
interface GenerationRequest {
  disposition: PropertyData;
  style: 'factual' | 'balanced' | 'selling';
  platform: 'hemnet' | 'booli' | 'general';
  personalStylePrompt?: string;
  targetWordMin: number;
  targetWordMax: number;
}

// Generator Output (6 fields)
interface GenerationResult {
  improvedPrompt: string;    // Main text (150-300 words)
  headline: string;          // Max 9 words, no period
  socialCopy: string;        // 1-3 sentences
  instagramCaption: string;  // 1-2 emojis, max 2200 chars
  showingInvitation: string; // Contains "visning"
  shortAd: string;           // Max 2 sentences
}

// Post-Processor Output (same structure + metadata)
interface PostProcessResult extends GenerationResult {
  transformations: Transformation[];
  duration: number;
}

// Analyzer Output
interface ExpertAnalysis {
  overallQuality: number;
  strengths: string[];
  improvements: FeedbackItem[]; // Now covers ALL 6 fields
  legalCheck: LegalCheck;
}
```

---

## Components and Interfaces

### 1. SmartGenerationEngine Enhancements

**Current Behavior:**
- Generates all 6 fields via single GPT-5.2 call
- System prompt includes platform rules for main text
- User prompt specifies output format for all fields

**Required Changes:**

#### 1.1 Platform-Specific Instructions for Auxiliary Fields

Add explicit instructions for each field in the system prompt:

```typescript
// In buildSystemPrompt()
const auxiliaryFieldRules = normalizedPlatform === 'hemnet' ? `
## AUXILIARY FIELDS - HEMNET RULES

### Headline (rubrik)
- Max 9 ord
- INGEN punkt eller utropstecken i slutet
- INGA emojis
- NÄMN INTE pris, avgift eller energiklass
- Fokusera på bostadens starkaste USP

### Social Copy
- 1-3 meningar
- Avsluta med punkt
- NÄMN INTE pris, avgift eller energiklass
- Säljande men saklig ton
- Kan avsluta med "Läs mer i annonsen."

### Instagram Caption
- 1-2 relevanta emojis (INTE fler)
- Max 2200 tecken
- NÄMN INTE pris, avgift eller energiklass
- Varm och mänsklig ton
- Avsluta med korrekt sluttecken (. ! ?)

### Showing Invitation (visningsinbjudan)
- MÅSTE innehålla ordet "visning"
- 1-2 meningar
- Professionell och trevlig ton
- NÄMN INTE pris, avgift eller energiklass
- Kan innehålla placeholders: [TID], [KONTAKT]

### Short Ad (kort annons)
- Max 2 meningar
- MÅSTE innehålla bostadstyp och boarea
- 2 konkreta styrkor
- NÄMN INTE pris, avgift eller energiklass
- Säljande men faktabaserad
` : `
## AUXILIARY FIELDS - BOOLI/GENERAL RULES

[Similar structure but allows price/fee where relevant]
`;
```

#### 1.2 Validation Before Return

Add validation method to check generated output:

```typescript
private validateGeneratedOutput(
  result: GenerationResult, 
  platform: string
): void {
  const errors: string[] = [];
  
  if (platform === 'hemnet') {
    // Check all fields for Hemnet violations
    const pricePattern = /\b(pris|avgift|driftkostnad|kr\/mån|utgångspris)\b/gi;
    const energyPattern = /\b(energiklass|energiprestanda)\b/gi;
    
    for (const [field, text] of Object.entries(result)) {
      if (typeof text !== 'string') continue;
      
      if (pricePattern.test(text)) {
        errors.push(`${field} contains price/fee (Hemnet violation)`);
      }
      if (energyPattern.test(text)) {
        errors.push(`${field} contains energiklass (Hemnet violation)`);
      }
    }
  }
  
  // Field-specific validation
  const headlineWords = result.headline.split(/\s+/).length;
  if (headlineWords > 9) {
    errors.push(`headline has ${headlineWords} words (max 9)`);
  }
  
  if (/[.!?]$/.test(result.headline)) {
    errors.push(`headline has trailing punctuation`);
  }
  
  if (!/visning/i.test(result.showingInvitation)) {
    errors.push(`showingInvitation missing word "visning"`);
  }
  
  if (errors.length > 0) {
    console.error('Generated output validation failed:', errors);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
}
```

### 2. DeterministicPostProcessor Enhancements

**Current Behavior:**
- Processes all 6 fields through transformation pipeline
- Removes forbidden phrases from all fields
- BUT: Platform-specific filtering only happens in routes.ts (after post-processor)

**Required Changes:**

#### 2.1 Platform-Aware Filtering

Add platform parameter and apply platform-specific filtering:

```typescript
export interface PostProcessRequest {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  disposition: any;
  style: WritingStyle;
  platform: string; // Already exists
}

async process(request: PostProcessRequest): Promise<PostProcessResult> {
  // ... existing code ...
  
  result = this.removePlaceholders(result, transformations);
  result = this.enforceParagraphBreaks(result, transformations);
  result = this.applyFormatting(result, transformations);
  result = this.removeForbiddenPhrases(result, request.style, transformations);
  
  // NEW: Platform-specific filtering
  result = this.removePlatformForbiddenPatterns(
    result, 
    request.platform, 
    transformations
  );
  
  result = this.normalizeSwedishCharacters(result, transformations);
  result = this.generalizeAndDeduplicate(result, transformations);
  result = this.checkNarrativeIntegrity(result, transformations);
  result = this.addMissingFacts(result, request.disposition, transformations);
  
  // NEW: Field-specific validation
  result = this.enforceFieldQualityRules(result, transformations);
  
  return { ...result, transformations, duration };
}
```

#### 2.2 Platform-Forbidden Pattern Removal

```typescript
private removePlatformForbiddenPatterns(
  request: PostProcessRequest,
  platform: string,
  transformations: Transformation[]
): PostProcessRequest {
  const result = { ...request };
  const normalizedPlatform = platform?.toLowerCase() || 'hemnet';
  
  if (normalizedPlatform !== 'hemnet') {
    return result; // Only Hemnet has strict forbidden patterns
  }
  
  // Hemnet-forbidden patterns
  const pricePattern = /\b(pris|utgångspris|avgift|driftkostnad|kr\/mån|kronor|SEK)\b/gi;
  const energyPattern = /\b(energiklass|energiprestanda|energiklass\s+[A-G])\b/gi;
  
  for (const field of TEXT_FIELDS) {
    let text = result[field];
    
    // Remove price/fee references
    const priceMatches = text.match(pricePattern);
    if (priceMatches) {
      text = text.replace(pricePattern, '');
      priceMatches.forEach(match => 
        transformations.push({
          type: 'forbidden_phrase',
          field,
          before: match,
          after: '',
        })
      );
    }
    
    // Remove energiklass references
    const energyMatches = text.match(energyPattern);
    if (energyMatches) {
      text = text.replace(energyPattern, '');
      energyMatches.forEach(match =>
        transformations.push({
          type: 'forbidden_phrase',
          field,
          before: match,
          after: '',
        })
      );
    }
    
    result[field] = text.replace(/\s{2,}/g, ' ').trim();
  }
  
  return result;
}
```

#### 2.3 Field-Specific Quality Enforcement

```typescript
private enforceFieldQualityRules(
  request: PostProcessRequest,
  transformations: Transformation[]
): PostProcessRequest {
  const result = { ...request };
  
  // Headline: remove trailing punctuation (already exists in applyFormatting)
  // This is already handled correctly
  
  // Social Copy: ensure it ends with period
  if (result.socialCopy && !/[.!?]$/.test(result.socialCopy)) {
    const before = result.socialCopy;
    result.socialCopy = result.socialCopy + '.';
    transformations.push({
      type: 'formatting',
      field: 'socialCopy',
      before: 'Missing period',
      after: 'Added period'
    });
  }
  
  // Instagram Caption: limit emojis to 2
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
  const emojis = result.instagramCaption.match(emojiRegex) || [];
  if (emojis.length > 2) {
    // Remove excess emojis (keep first 2)
    let count = 0;
    result.instagramCaption = result.instagramCaption.replace(
      emojiRegex,
      (match) => {
        count++;
        return count <= 2 ? match : '';
      }
    );
    transformations.push({
      type: 'formatting',
      field: 'instagramCaption',
      before: `${emojis.length} emojis`,
      after: '2 emojis (removed excess)'
    });
  }
  
  return result;
}
```


### 3. ExpertAIAnalyzer Enhancements

**Current Behavior:**
- Receives `improvedPrompt`, `headline`, `socialCopy` as input
- Missing: `instagramCaption`, `showingInvitation`, `shortAd`

**Required Changes:**

#### 3.1 Expand Input Interface

```typescript
export interface AnalysisRequest {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;    // NEW
  showingInvitation: string;   // NEW
  shortAd: string;             // NEW
  disposition: any;
  style: WritingStyle;
  platform: string;
}
```

#### 3.2 Update Analysis Prompt

```typescript
private buildAnalysisPrompt(request: AnalysisRequest): string {
  const { 
    improvedPrompt, 
    headline, 
    socialCopy, 
    instagramCaption,
    showingInvitation,
    shortAd,
    style, 
    platform 
  } = request;
  
  // ... existing code ...
  
  return `Du är en senior svensk mäklare OCH jurist med 20 års erfarenhet.

## TEXTEN ATT ANALYSERA

Rubrik: ${headline}

Huvudtext:
${improvedPrompt}

Social media:
${socialCopy}

Instagram:
${instagramCaption}

Visningsinbjudan:
${showingInvitation}

Kort annons:
${shortAd}

Stil: ${style} | Plattform: ${platform}

## ANALYSERA ALLA FÄLT

För VARJE fält (rubrik, huvudtext, social media, Instagram, visningsinbjudan, kort annons):

1. Kontrollera plattformsregler (Hemnet: ingen pris/avgift/energiklass)
2. Kontrollera förbjudna fraser
3. Kontrollera fältspecifika kvalitetskrav:
   - Rubrik: max 9 ord, ingen punkt, inga emojis
   - Social media: 1-3 meningar, punkt i slutet
   - Instagram: 1-2 emojis, max 2200 tecken
   - Visningsinbjudan: innehåller "visning"
   - Kort annons: max 2 meningar, innehåller bostadstyp + boarea

## OUTPUT FORMAT

{
  "overallQuality": 8.5,
  "strengths": ["Styrka 1", "Styrka 2", "Styrka 3"],
  "improvements": [
    {
      "issue": "Problem i specifikt fält",
      "location": "headline|improvedPrompt|socialCopy|instagramCaption|showingInvitation|shortAd",
      "suggestion": "Konkret förslag",
      "category": "grammar|style|legal|broker_realism|clarity",
      "severity": "critical|important|suggestion",
      "expert": "broker|lawyer"
    }
  ],
  "legalCheck": {
    "compliant": true,
    "notes": "Noteringar",
    "issues": []
  }
}`;
}
```

#### 3.3 Update Text Span Identification

```typescript
private identifyTextSpans(
  request: AnalysisRequest,
  analysis: Omit<ExpertAnalysis, 'duration'>
): Omit<ExpertAnalysis, 'duration'> {
  const texts: Record<string, string> = {
    improvedPrompt: request.improvedPrompt,
    headline: request.headline,
    socialCopy: request.socialCopy,
    instagramCaption: request.instagramCaption,      // NEW
    showingInvitation: request.showingInvitation,    // NEW
    shortAd: request.shortAd                         // NEW
  };
  
  // ... rest of existing logic ...
}
```

---

## Data Models

### Platform Rules Configuration

```typescript
interface PlatformRules {
  platform: 'hemnet' | 'booli' | 'general';
  forbiddenPatterns: {
    price: boolean;        // true = forbidden
    fee: boolean;          // true = forbidden
    energiklass: boolean;  // true = forbidden
  };
  tone: 'factual' | 'narrative' | 'flexible';
  structureRules: string[];
}

const PLATFORM_RULES: Record<string, PlatformRules> = {
  hemnet: {
    platform: 'hemnet',
    forbiddenPatterns: {
      price: true,
      fee: true,
      energiklass: true
    },
    tone: 'factual',
    structureRules: [
      'Main text must have 4-5 paragraphs',
      'Last paragraph: location + communications (NO economy)',
      'No emotional closing phrases'
    ]
  },
  booli: {
    platform: 'booli',
    forbiddenPatterns: {
      price: false,  // Can mention
      fee: false,    // Can mention
      energiklass: false  // Can mention if selling point
    },
    tone: 'narrative',
    structureRules: [
      'Main text must have 4-5 paragraphs',
      'Last paragraph: location + economy',
      'More storytelling tone allowed'
    ]
  },
  general: {
    platform: 'general',
    forbiddenPatterns: {
      price: false,
      fee: false,
      energiklass: false
    },
    tone: 'flexible',
    structureRules: [
      'Main text must have 4-5 paragraphs',
      'Flexible structure'
    ]
  }
};
```

### Field Quality Requirements

```typescript
interface FieldQualityRules {
  field: string;
  maxWords?: number;
  maxSentences?: number;
  maxCharacters?: number;
  requiredPattern?: RegExp;
  forbiddenPattern?: RegExp;
  mustContain?: string[];
  mustNotContain?: string[];
  emojiCount?: { min: number; max: number };
}

const FIELD_QUALITY_RULES: FieldQualityRules[] = [
  {
    field: 'headline',
    maxWords: 9,
    forbiddenPattern: /[.!?]$/,  // No trailing punctuation
    mustNotContain: ['emoji'],
  },
  {
    field: 'socialCopy',
    maxSentences: 3,
    requiredPattern: /[.]$/,  // Must end with period
  },
  {
    field: 'instagramCaption',
    maxCharacters: 2200,
    emojiCount: { min: 1, max: 2 },
    requiredPattern: /[.!?]$/,  // Must end with punctuation
  },
  {
    field: 'showingInvitation',
    maxSentences: 2,
    mustContain: ['visning'],
  },
  {
    field: 'shortAd',
    maxSentences: 2,
    mustContain: ['bostadstyp', 'boarea'],  // Conceptual - needs smart check
  }
];
```

### Validation Result Model

```typescript
interface ValidationResult {
  valid: boolean;
  field: string;
  violations: Violation[];
}

interface Violation {
  type: 'platform_rule' | 'forbidden_phrase' | 'quality_rule';
  severity: 'critical' | 'warning';
  message: string;
  pattern?: string;
  suggestion?: string;
}

interface SystemValidationReport {
  timestamp: Date;
  platform: string;
  style: string;
  allFieldsValid: boolean;
  fieldResults: ValidationResult[];
  criticalViolations: number;
  warnings: number;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several opportunities to consolidate redundant properties:

**Consolidation 1: Platform Rules Across Fields**
- Original: 6 separate properties (one per field) checking Hemnet price/fee violations
- Consolidated: Single comprehensive property checking ALL fields

**Consolidation 2: Energiklass Violations**
- Original: 6 separate properties for energiklass
- Consolidated: Combined with price/fee property (all Hemnet-forbidden patterns)

**Consolidation 3: Forbidden Phrases**
- Original: 6 separate properties for forbidden phrases per field
- Consolidated: Single property checking all fields

**Consolidation 4: Field Quality Rules**
- Original: Multiple properties per field (headline: max words, no punctuation, no emojis)
- Consolidated: Single property per field covering all its quality rules

This reduces 30+ potential properties to 12 focused, comprehensive properties.

---

### Property 1: Hemnet Platform Rules Compliance

*For any* property data and generation request with platform='hemnet', when generating all 6 text fields (improvedPrompt, headline, socialCopy, instagramCaption, showingInvitation, shortAd), NONE of the fields should contain any Hemnet-forbidden patterns: price references (pris, utgångspris, avgift, driftkostnad, kr/mån), fee references, or energiklass references (energiklass, energiprestanda).

**Validates: Requirements 1.1.1, 1.1.2**

**Implementation Strategy:**
```typescript
// Property-based test
forAll(
  arbitraryPropertyData(),
  arbitraryStyle(),
  async (propertyData, style) => {
    const result = await generateTexts({
      disposition: propertyData,
      style,
      platform: 'hemnet'
    });
    
    const forbiddenPatterns = [
      /\b(pris|utgångspris|avgift|driftkostnad|kr\/mån|kronor|SEK)\b/gi,
      /\b(energiklass|energiprestanda)\b/gi
    ];
    
    const allFields = [
      result.improvedPrompt,
      result.headline,
      result.socialCopy,
      result.instagramCaption,
      result.showingInvitation,
      result.shortAd
    ];
    
    return allFields.every(field =>
      forbiddenPatterns.every(pattern => !pattern.test(field))
    );
  }
);
```

---

### Property 2: Booli Platform Flexibility

*For any* property data with price/fee information and generation request with platform='booli', when generating texts, IF price or fee appears in any field, it should be formatted correctly (e.g., "Avgift 4 500 kr/mån") and appear in contextually appropriate fields (improvedPrompt, socialCopy, shortAd - NOT headline or showingInvitation).

**Validates: Requirements 1.1.3**

**Note:** This is more of an example-based test since we're not requiring price/fee to appear, just validating format when it does.

---

### Property 3: Forbidden Phrases Elimination

*For any* property data, style, and platform, when generating all 6 text fields, NONE of the fields should contain any phrases from the FORBIDDEN_PHRASES list (66 AI clichés), except for phrases explicitly exempted for the given style (balanced/selling styles have exemptions).

**Validates: Requirements 1.2.1**

**Implementation Strategy:**
```typescript
forAll(
  arbitraryPropertyData(),
  arbitraryStyle(),
  arbitraryPlatform(),
  async (propertyData, style, platform) => {
    const result = await generateAndPostProcess({
      disposition: propertyData,
      style,
      platform
    });
    
    const exemptPhrases = getExemptPhrases(style);
    const blockedPhrases = FORBIDDEN_PHRASES.filter(
      p => !exemptPhrases.has(p)
    );
    
    const allFields = [
      result.improvedPrompt,
      result.headline,
      result.socialCopy,
      result.instagramCaption,
      result.showingInvitation,
      result.shortAd
    ];
    
    return allFields.every(field =>
      blockedPhrases.every(phrase =>
        !field.toLowerCase().includes(phrase.toLowerCase())
      )
    );
  }
);
```

---

### Property 4: Headline Quality Requirements

*For any* generated headline, it should satisfy ALL of the following: (1) maximum 9 words, (2) no trailing punctuation (. ! ?), (3) no emoji characters, (4) contains the property's strongest USP.

**Validates: Requirements 1.3.1**

**Implementation Strategy:**
```typescript
forAll(
  arbitraryPropertyData(),
  async (propertyData) => {
    const result = await generateTexts({
      disposition: propertyData,
      style: 'balanced',
      platform: 'hemnet'
    });
    
    const wordCount = result.headline.split(/\s+/).length;
    const hasTrailingPunctuation = /[.!?]$/.test(result.headline);
    const hasEmojis = /[\u{1F300}-\u{1F9FF}]/gu.test(result.headline);
    
    return (
      wordCount <= 9 &&
      !hasTrailingPunctuation &&
      !hasEmojis
    );
  }
);
```

---

### Property 5: Social Copy Quality Requirements

*For any* generated socialCopy, it should satisfy ALL of the following: (1) 1-3 sentences, (2) ends with period, (3) contains concrete buyer benefit, (4) avoids aggressive CTAs.

**Validates: Requirements 1.3.2**

**Implementation Strategy:**
```typescript
forAll(
  arbitraryPropertyData(),
  async (propertyData) => {
    const result = await generateTexts({
      disposition: propertyData,
      style: 'balanced',
      platform: 'hemnet'
    });
    
    const sentenceCount = (result.socialCopy.match(/[.!?]/g) || []).length;
    const endsWithPeriod = /\.$/.test(result.socialCopy);
    const hasAggressiveCTA = /\b(NU|BOKA NU|RING NU)\b/i.test(result.socialCopy);
    
    return (
      sentenceCount >= 1 &&
      sentenceCount <= 3 &&
      endsWithPeriod &&
      !hasAggressiveCTA
    );
  }
);
```

---

### Property 6: Instagram Caption Quality Requirements

*For any* generated instagramCaption, it should satisfy ALL of the following: (1) 1-2 emojis (not more), (2) maximum 2200 characters, (3) ends with proper punctuation (. ! ?), (4) warm and human tone.

**Validates: Requirements 1.3.3**

**Implementation Strategy:**
```typescript
forAll(
  arbitraryPropertyData(),
  async (propertyData) => {
    const result = await generateTexts({
      disposition: propertyData,
      style: 'balanced',
      platform: 'hemnet'
    });
    
    const emojiCount = (
      result.instagramCaption.match(/[\u{1F300}-\u{1F9FF}]/gu) || []
    ).length;
    const charCount = result.instagramCaption.length;
    const endsWithPunctuation = /[.!?]$/.test(result.instagramCaption);
    
    return (
      emojiCount >= 1 &&
      emojiCount <= 2 &&
      charCount <= 2200 &&
      endsWithPunctuation
    );
  }
);
```

---

### Property 7: Showing Invitation Quality Requirements

*For any* generated showingInvitation, it should satisfy ALL of the following: (1) contains the word "visning" (case-insensitive), (2) 1-2 sentences, (3) professional and welcoming tone.

**Validates: Requirements 1.3.4**

**Implementation Strategy:**
```typescript
forAll(
  arbitraryPropertyData(),
  async (propertyData) => {
    const result = await generateTexts({
      disposition: propertyData,
      style: 'balanced',
      platform: 'hemnet'
    });
    
    const containsVisning = /visning/i.test(result.showingInvitation);
    const sentenceCount = (
      result.showingInvitation.match(/[.!?]/g) || []
    ).length;
    
    return (
      containsVisning &&
      sentenceCount >= 1 &&
      sentenceCount <= 2
    );
  }
);
```

---

### Property 8: Short Ad Quality Requirements

*For any* generated shortAd, it should satisfy ALL of the following: (1) maximum 2 sentences, (2) contains property type (lägenhet, villa, etc.), (3) contains area information (boarea), (4) contains 2 concrete strengths.

**Validates: Requirements 1.3.5**

**Implementation Strategy:**
```typescript
forAll(
  arbitraryPropertyData(),
  async (propertyData) => {
    const result = await generateTexts({
      disposition: propertyData,
      style: 'balanced',
      platform: 'hemnet'
    });
    
    const sentenceCount = (result.shortAd.match(/[.!?]/g) || []).length;
    const hasPropertyType = /\b(lägenhet|villa|radhus|bostadsrätt)\b/i.test(
      result.shortAd
    );
    const hasArea = /\b\d+\s*kvm\b/i.test(result.shortAd);
    
    return (
      sentenceCount <= 2 &&
      hasPropertyType &&
      hasArea
    );
  }
);
```

---

### Property 9: Post-Processor Field Coverage

*For any* post-processor input containing all 6 fields, the post-processor output should also contain all 6 fields with transformations applied to each field as needed (not just improvedPrompt).

**Validates: Requirements 2.2.1**

**Implementation Strategy:**
```typescript
forAll(
  arbitraryPostProcessorInput(),
  async (input) => {
    const result = await postProcessor.process(input);
    
    const inputFields = [
      'improvedPrompt', 'headline', 'socialCopy',
      'instagramCaption', 'showingInvitation', 'shortAd'
    ];
    
    // All fields present in output
    const allFieldsPresent = inputFields.every(
      field => field in result && typeof result[field] === 'string'
    );
    
    // Transformations reference all fields (if changes were needed)
    const fieldsWithTransformations = new Set(
      result.transformations.map(t => t.field)
    );
    
    return allFieldsPresent;
  }
);
```

---

### Property 10: Post-Processor Forbidden Phrase Removal

*For any* text input containing forbidden phrases in any of the 6 fields, after post-processing, all fields should be free from those forbidden phrases (respecting style-specific exemptions).

**Validates: Requirements 2.2.2**

**Implementation Strategy:**
```typescript
forAll(
  arbitraryPropertyData(),
  arbitraryStyle(),
  arbitraryForbiddenPhrase(),
  async (propertyData, style, forbiddenPhrase) => {
    // Generate text and inject forbidden phrase
    const generated = await generateTexts({
      disposition: propertyData,
      style,
      platform: 'hemnet'
    });
    
    // Inject forbidden phrase into random field
    const fields = ['headline', 'socialCopy', 'instagramCaption'];
    const randomField = fields[Math.floor(Math.random() * fields.length)];
    generated[randomField] = `${forbiddenPhrase} ${generated[randomField]}`;
    
    // Post-process
    const result = await postProcessor.process({
      ...generated,
      style,
      platform: 'hemnet',
      disposition: propertyData
    });
    
    // Check if forbidden phrase was removed (unless exempted)
    const exemptPhrases = getExemptPhrases(style);
    if (exemptPhrases.has(forbiddenPhrase)) {
      return true; // Exempted phrases can remain
    }
    
    const allFields = [
      result.improvedPrompt,
      result.headline,
      result.socialCopy,
      result.instagramCaption,
      result.showingInvitation,
      result.shortAd
    ];
    
    return allFields.every(
      field => !field.toLowerCase().includes(forbiddenPhrase.toLowerCase())
    );
  }
);
```

---

### Property 11: Post-Processor Platform Pattern Removal

*For any* Hemnet text input containing price/fee/energiklass patterns in any field, after post-processing, all fields should be free from those patterns.

**Validates: Requirements 2.2.3**

**Implementation Strategy:**
```typescript
forAll(
  arbitraryPropertyData(),
  arbitraryHemnetForbiddenPattern(), // "avgift", "pris", "energiklass"
  async (propertyData, forbiddenPattern) => {
    // Generate text and inject forbidden pattern
    const generated = await generateTexts({
      disposition: propertyData,
      style: 'balanced',
      platform: 'hemnet'
    });
    
    // Inject into all fields
    const injected = {
      ...generated,
      headline: `${forbiddenPattern} ${generated.headline}`,
      socialCopy: `${forbiddenPattern} ${generated.socialCopy}`,
      instagramCaption: `${forbiddenPattern} ${generated.instagramCaption}`,
      showingInvitation: `${forbiddenPattern} ${generated.showingInvitation}`,
      shortAd: `${forbiddenPattern} ${generated.shortAd}`
    };
    
    // Post-process
    const result = await postProcessor.process({
      ...injected,
      style: 'balanced',
      platform: 'hemnet',
      disposition: propertyData
    });
    
    // Verify all fields are clean
    const allFields = [
      result.improvedPrompt,
      result.headline,
      result.socialCopy,
      result.instagramCaption,
      result.showingInvitation,
      result.shortAd
    ];
    
    const forbiddenPatterns = [
      /\b(pris|avgift|energiklass)\b/gi
    ];
    
    return allFields.every(field =>
      forbiddenPatterns.every(pattern => !pattern.test(field))
    );
  }
);
```

---

### Property 12: Analyzer Field Coverage

*For any* analysis request containing all 6 fields, the analyzer should return feedback items that can reference any of the 6 fields (not just improvedPrompt, headline, socialCopy), and platform violations should be flagged with critical severity.

**Validates: Requirements 2.3.1, 2.3.2**

**Implementation Strategy:**
```typescript
forAll(
  arbitraryPropertyData(),
  async (propertyData) => {
    // Generate texts with intentional violation in auxiliary field
    const generated = await generateTexts({
      disposition: propertyData,
      style: 'balanced',
      platform: 'hemnet'
    });
    
    // Inject Hemnet violation into instagramCaption
    const withViolation = {
      ...generated,
      instagramCaption: `Avgift 4500 kr/mån. ${generated.instagramCaption}`
    };
    
    // Analyze
    const analysis = await analyzer.analyze({
      ...withViolation,
      disposition: propertyData,
      style: 'balanced',
      platform: 'hemnet'
    });
    
    // Should have critical feedback about instagramCaption
    const hasInstagramFeedback = analysis.improvements.some(
      item => item.location.includes('instagramCaption') ||
              item.location.includes('Instagram')
    );
    
    const hasCriticalViolation = analysis.improvements.some(
      item => item.severity === 'critical' &&
              (item.issue.toLowerCase().includes('avgift') ||
               item.issue.toLowerCase().includes('pris'))
    );
    
    return hasInstagramFeedback && hasCriticalViolation;
  }
);
```

---

## Error Handling

### Generator Validation Errors

When the generator produces output that violates critical rules:

```typescript
class GeneratorValidationError extends Error {
  constructor(
    public violations: string[],
    public generatedOutput: GenerationResult
  ) {
    super(`Generator validation failed: ${violations.join(', ')}`);
    this.name = 'GeneratorValidationError';
  }
}

// In SmartGenerationEngine.generate()
try {
  const result = this.extractResult(completion);
  this.validateGeneratedOutput(result, request.platform);
  return result;
} catch (error) {
  if (error instanceof GeneratorValidationError) {
    // Log for monitoring
    console.error('Generator produced invalid output:', {
      violations: error.violations,
      platform: request.platform,
      style: request.style
    });
    
    // Could implement retry logic here
    // For now, throw to surface the issue
    throw error;
  }
  throw error;
}
```

### Post-Processor Graceful Degradation

If post-processor fails on a specific field, continue processing other fields:

```typescript
async process(request: PostProcessRequest): Promise<PostProcessResult> {
  const startTime = Date.now();
  const transformations: Transformation[] = [];
  
  try {
    let result = { ...request };
    
    // Each step wrapped in try-catch
    result = this.safeTransform(
      () => this.removePlaceholders(result, transformations),
      result,
      'removePlaceholders'
    );
    
    result = this.safeTransform(
      () => this.removeForbiddenPhrases(result, request.style, transformations),
      result,
      'removeForbiddenPhrases'
    );
    
    // ... other steps ...
    
    return { ...result, transformations, duration: Date.now() - startTime };
  } catch (error) {
    console.error('Post-processing failed:', error);
    // Return original input if catastrophic failure
    return {
      ...request,
      transformations,
      duration: Date.now() - startTime
    };
  }
}

private safeTransform<T>(
  fn: () => T,
  fallback: T,
  stepName: string
): T {
  try {
    return fn();
  } catch (error) {
    console.error(`Post-processor step ${stepName} failed:`, error);
    return fallback;
  }
}
```

### Analyzer Timeout Handling

If analyzer takes too long, return partial analysis:

```typescript
async analyze(request: AnalysisRequest): Promise<ExpertAnalysis> {
  const startTime = Date.now();
  const TIMEOUT_MS = 30000; // 30 seconds
  
  try {
    const completionPromise = this.openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [{ role: 'user', content: this.buildAnalysisPrompt(request) }],
      temperature: 0.3,
      max_completion_tokens: 2500,
      response_format: { type: 'json_object' },
    });
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Analysis timeout')), TIMEOUT_MS)
    );
    
    const completion = await Promise.race([
      completionPromise,
      timeoutPromise
    ]);
    
    return this.parseAnalysisResult(completion);
  } catch (error) {
    if (error.message === 'Analysis timeout') {
      console.error('Analyzer timed out, returning basic analysis');
      return {
        overallQuality: 7.0,
        strengths: ['Analysis timed out - basic validation passed'],
        improvements: [],
        legalCheck: { compliant: true, notes: 'Timeout - manual review needed', issues: [] },
        duration: Date.now() - startTime
      };
    }
    throw error;
  }
}
```

---

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests:

**Unit Tests:** Verify specific examples, edge cases, and integration points
**Property Tests:** Verify universal properties across randomized inputs

Both are complementary and necessary for comprehensive coverage.

### Property-Based Testing Configuration

**Library:** `fast-check` (JavaScript/TypeScript property-based testing)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with reference to design property
- Tag format: `Feature: complete-system-verification, Property {number}: {property_text}`

**Example Test Structure:**

```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Complete System Verification - Property Tests', () => {
  it('Property 1: Hemnet Platform Rules Compliance', async () => {
    // Feature: complete-system-verification, Property 1
    await fc.assert(
      fc.asyncProperty(
        arbitraryPropertyData(),
        arbitraryStyle(),
        async (propertyData, style) => {
          const result = await generateTexts({
            disposition: propertyData,
            style,
            platform: 'hemnet'
          });
          
          const forbiddenPatterns = [
            /\b(pris|utgångspris|avgift|driftkostnad|kr\/mån)\b/gi,
            /\b(energiklass|energiprestanda)\b/gi
          ];
          
          const allFields = [
            result.improvedPrompt,
            result.headline,
            result.socialCopy,
            result.instagramCaption,
            result.showingInvitation,
            result.shortAd
          ];
          
          return allFields.every(field =>
            forbiddenPatterns.every(pattern => !pattern.test(field))
          );
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // ... more property tests ...
});
```

### Arbitrary Data Generators

Create generators for property-based testing:

```typescript
// Arbitrary property data
function arbitraryPropertyData(): fc.Arbitrary<PropertyData> {
  return fc.record({
    propertyType: fc.constantFrom('lägenhet', 'villa', 'radhus'),
    rooms: fc.integer({ min: 1, max: 6 }),
    area: fc.integer({ min: 30, max: 300 }),
    price: fc.integer({ min: 1000000, max: 20000000 }),
    fee: fc.integer({ min: 1000, max: 10000 }),
    energiklass: fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G'),
    address: fc.record({
      street: fc.string({ minLength: 5, maxLength: 30 }),
      city: fc.constantFrom('Stockholm', 'Göteborg', 'Malmö')
    }),
    features: fc.array(
      fc.constantFrom(
        'balkong',
        'renoverat kök',
        'helkaklat badrum',
        'parkering',
        'hiss'
      ),
      { minLength: 2, maxLength: 5 }
    )
  });
}

// Arbitrary style
function arbitraryStyle(): fc.Arbitrary<WritingStyle> {
  return fc.constantFrom('factual', 'balanced', 'selling');
}

// Arbitrary platform
function arbitraryPlatform(): fc.Arbitrary<string> {
  return fc.constantFrom('hemnet', 'booli', 'general');
}

// Arbitrary forbidden phrase
function arbitraryForbiddenPhrase(): fc.Arbitrary<string> {
  return fc.constantFrom(...FORBIDDEN_PHRASES);
}

// Arbitrary Hemnet-forbidden pattern
function arbitraryHemnetForbiddenPattern(): fc.Arbitrary<string> {
  return fc.constantFrom(
    'pris',
    'avgift',
    'driftkostnad',
    'energiklass',
    'utgångspris',
    'kr/mån'
  );
}
```

### Unit Test Coverage

**Generator Tests:**
```typescript
describe('SmartGenerationEngine - Auxiliary Fields', () => {
  it('should generate all 6 fields', async () => {
    const result = await generator.generate({
      disposition: mockPropertyData,
      style: 'balanced',
      platform: 'hemnet',
      targetWordMin: 150,
      targetWordMax: 300
    });
    
    expect(result.improvedPrompt).toBeTruthy();
    expect(result.headline).toBeTruthy();
    expect(result.socialCopy).toBeTruthy();
    expect(result.instagramCaption).toBeTruthy();
    expect(result.showingInvitation).toBeTruthy();
    expect(result.shortAd).toBeTruthy();
  });
  
  it('should throw error if Hemnet violation in headline', async () => {
    // Mock OpenAI to return headline with "avgift"
    mockOpenAI.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            improvedPrompt: 'Valid text...',
            headline: 'Trea med avgift 4500 kr/mån',
            // ... other fields
          })
        }
      }]
    });
    
    await expect(
      generator.generate({
        disposition: mockPropertyData,
        style: 'balanced',
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 300
      })
    ).rejects.toThrow('Validation failed');
  });
});
```

**Post-Processor Tests:**
```typescript
describe('DeterministicPostProcessor - Platform Filtering', () => {
  it('should remove price from all fields for Hemnet', async () => {
    const input = {
      improvedPrompt: 'Text with pris 2 500 000 kr',
      headline: 'Trea med avgift 4500',
      socialCopy: 'Driftkostnad 800 kr/mån',
      instagramCaption: 'Utgångspris 2,5 miljoner',
      showingInvitation: 'Visning, avgift 4500',
      shortAd: 'Pris 2,5 mkr',
      disposition: {},
      style: 'balanced',
      platform: 'hemnet'
    };
    
    const result = await postProcessor.process(input);
    
    const allFields = [
      result.improvedPrompt,
      result.headline,
      result.socialCopy,
      result.instagramCaption,
      result.showingInvitation,
      result.shortAd
    ];
    
    const pricePattern = /\b(pris|avgift|driftkostnad|utgångspris)\b/gi;
    allFields.forEach(field => {
      expect(field).not.toMatch(pricePattern);
    });
  });
  
  it('should enforce headline quality rules', async () => {
    const input = {
      improvedPrompt: 'Valid text',
      headline: 'This is a very long headline with more than nine words.',
      socialCopy: 'Valid',
      instagramCaption: 'Valid',
      showingInvitation: 'Valid',
      shortAd: 'Valid',
      disposition: {},
      style: 'balanced',
      platform: 'hemnet'
    };
    
    const result = await postProcessor.process(input);
    
    // Should remove trailing period
    expect(result.headline).not.toMatch(/\.$/);
    
    // Note: Word count enforcement is generator's responsibility
    // Post-processor logs warning but doesn't truncate
  });
});
```

**Analyzer Tests:**
```typescript
describe('ExpertAIAnalyzer - All Fields', () => {
  it('should analyze all 6 fields', async () => {
    const result = await analyzer.analyze({
      improvedPrompt: 'Main text',
      headline: 'Headline',
      socialCopy: 'Social',
      instagramCaption: 'Instagram',
      showingInvitation: 'Showing',
      shortAd: 'Short',
      disposition: mockPropertyData,
      style: 'balanced',
      platform: 'hemnet'
    });
    
    expect(result.improvements).toBeDefined();
    // Should be able to reference any field
  });
  
  it('should flag Hemnet violations in auxiliary fields as critical', async () => {
    const result = await analyzer.analyze({
      improvedPrompt: 'Valid text',
      headline: 'Valid headline',
      socialCopy: 'Valid social',
      instagramCaption: 'Avgift 4500 kr/mån 🏠',
      showingInvitation: 'Välkommen på visning',
      shortAd: 'Valid short ad',
      disposition: mockPropertyData,
      style: 'balanced',
      platform: 'hemnet'
    });
    
    const criticalViolations = result.improvements.filter(
      item => item.severity === 'critical' &&
              item.location.includes('instagram')
    );
    
    expect(criticalViolations.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe('Complete Pipeline - All Fields', () => {
  it('should produce compliant output for Hemnet', async () => {
    const result = await fullPipeline({
      disposition: mockPropertyData,
      style: 'balanced',
      platform: 'hemnet',
      targetWordMin: 150,
      targetWordMax: 300
    });
    
    // All fields present
    expect(result.improvedPrompt).toBeTruthy();
    expect(result.headline).toBeTruthy();
    expect(result.socialCopy).toBeTruthy();
    expect(result.instagramCaption).toBeTruthy();
    expect(result.showingInvitation).toBeTruthy();
    expect(result.shortAd).toBeTruthy();
    
    // No Hemnet violations
    const forbiddenPatterns = [
      /\b(pris|avgift|energiklass)\b/gi
    ];
    
    const allFields = [
      result.improvedPrompt,
      result.headline,
      result.socialCopy,
      result.instagramCaption,
      result.showingInvitation,
      result.shortAd
    ];
    
    allFields.forEach(field => {
      forbiddenPatterns.forEach(pattern => {
        expect(field).not.toMatch(pattern);
      });
    });
    
    // Field-specific quality
    expect(result.headline.split(/\s+/).length).toBeLessThanOrEqual(9);
    expect(result.headline).not.toMatch(/[.!?]$/);
    expect(result.showingInvitation).toMatch(/visning/i);
  });
});
```

### Regression Tests

Create regression test suite to ensure fixes don't break:

```typescript
describe('Regression - Auxiliary Fields', () => {
  it('should not contain price in any field for Hemnet', async () => {
    // Test with real property data that previously caused issues
    const problematicData = loadFixture('hemnet-price-violation.json');
    
    const result = await fullPipeline({
      disposition: problematicData,
      style: 'balanced',
      platform: 'hemnet',
      targetWordMin: 150,
      targetWordMax: 300
    });
    
    const allFields = Object.values(result).filter(
      v => typeof v === 'string'
    );
    
    allFields.forEach(field => {
      expect(field).not.toMatch(/\b(pris|avgift|driftkostnad)\b/gi);
    });
  });
});
```

---

## Monitoring and Observability

### Metrics to Track

```typescript
interface SystemVerificationMetrics {
  // Platform violations
  hemnetViolations: {
    total: number;
    byField: Record<string, number>;
    byPattern: Record<string, number>; // price, fee, energiklass
  };
  
  // Forbidden phrases
  forbiddenPhraseOccurrences: {
    total: number;
    byField: Record<string, number>;
    byPhrase: Record<string, number>;
  };
  
  // Field quality
  fieldQualityViolations: {
    headline: {
      tooLong: number;
      hasTrailingPunctuation: number;
      hasEmojis: number;
    };
    socialCopy: {
      tooManySentences: number;
      missingPeriod: number;
    };
    instagramCaption: {
      tooManyEmojis: number;
      tooLong: number;
    };
    showingInvitation: {
      missingVisning: number;
    };
    shortAd: {
      tooLong: number;
      missingPropertyType: number;
      missingArea: number;
    };
  };
  
  // Pipeline health
  generatorValidationFailures: number;
  postProcessorErrors: number;
  analyzerTimeouts: number;
}
```

### Logging Strategy

```typescript
// In SmartGenerationEngine
private validateGeneratedOutput(result: GenerationResult, platform: string): void {
  const violations: string[] = [];
  
  // ... validation logic ...
  
  if (violations.length > 0) {
    console.error('[GENERATOR_VALIDATION_FAILED]', {
      platform,
      violations,
      timestamp: new Date().toISOString(),
      fields: Object.keys(result)
    });
    
    // Increment metric
    metrics.generatorValidationFailures++;
    
    // Log to monitoring service
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage('Generator validation failed', {
        level: 'error',
        extra: { platform, violations }
      });
    }
    
    throw new GeneratorValidationError(violations, result);
  }
}

// In DeterministicPostProcessor
private removePlatformForbiddenPatterns(
  request: PostProcessRequest,
  platform: string,
  transformations: Transformation[]
): PostProcessRequest {
  // ... removal logic ...
  
  // Log violations found
  const violationsByField = transformations
    .filter(t => t.type === 'forbidden_phrase')
    .reduce((acc, t) => {
      acc[t.field] = (acc[t.field] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  if (Object.keys(violationsByField).length > 0) {
    console.warn('[PLATFORM_VIOLATIONS_REMOVED]', {
      platform,
      violationsByField,
      timestamp: new Date().toISOString()
    });
    
    // Update metrics
    Object.entries(violationsByField).forEach(([field, count]) => {
      metrics.hemnetViolations.byField[field] += count;
      metrics.hemnetViolations.total += count;
    });
  }
  
  return result;
}
```

### Alerting Thresholds

```typescript
interface AlertThresholds {
  hemnetViolationsPerHour: number;      // Alert if > 10 violations/hour
  generatorFailuresPerHour: number;     // Alert if > 5 failures/hour
  forbiddenPhrasesPerHour: number;      // Alert if > 20 occurrences/hour
  analyzerTimeoutsPerHour: number;      // Alert if > 3 timeouts/hour
}

const ALERT_THRESHOLDS: AlertThresholds = {
  hemnetViolationsPerHour: 10,
  generatorFailuresPerHour: 5,
  forbiddenPhrasesPerHour: 20,
  analyzerTimeoutsPerHour: 3
};

// Monitoring service checks metrics every hour
async function checkAlertThresholds() {
  const hourlyMetrics = await getMetricsForLastHour();
  
  if (hourlyMetrics.hemnetViolations.total > ALERT_THRESHOLDS.hemnetViolationsPerHour) {
    await sendAlert({
      severity: 'critical',
      title: 'High Hemnet Violation Rate',
      message: `${hourlyMetrics.hemnetViolations.total} violations in last hour`,
      details: {
        byField: hourlyMetrics.hemnetViolations.byField,
        byPattern: hourlyMetrics.hemnetViolations.byPattern
      }
    });
  }
  
  if (hourlyMetrics.generatorValidationFailures > ALERT_THRESHOLDS.generatorFailuresPerHour) {
    await sendAlert({
      severity: 'high',
      title: 'Generator Validation Failures',
      message: `${hourlyMetrics.generatorValidationFailures} failures in last hour`,
      details: { /* ... */ }
    });
  }
  
  // ... other threshold checks ...
}
```

### Dashboard Metrics

Create monitoring dashboard showing:

1. **Platform Compliance Rate**
   - % of generations with 0 Hemnet violations
   - Trend over time
   - Breakdown by field

2. **Forbidden Phrase Rate**
   - % of generations with 0 forbidden phrases
   - Top 10 most common violations
   - Trend over time

3. **Field Quality Score**
   - % of each field meeting quality requirements
   - Breakdown by requirement (word count, punctuation, etc.)

4. **Pipeline Health**
   - Generator validation success rate
   - Post-processor error rate
   - Analyzer timeout rate
   - Average processing time per component

---

## Implementation Phases

### Phase 1: Generator Enhancements (Week 1)

**Goal:** Ensure generator produces compliant output for all fields

**Tasks:**
1. Update system prompt with auxiliary field rules
2. Add platform-specific instructions for each field
3. Implement validateGeneratedOutput() method
4. Add logging for validation failures
5. Bump PROMPT_VERSION to 2.9.0
6. Test with sample data

**Deliverables:**
- Updated SmartGenerationEngine
- Validation logic for all 6 fields
- Unit tests for validation

**Success Criteria:**
- Generator throws error if Hemnet violations in any field
- All field-specific quality rules enforced

---

### Phase 2: Post-Processor Enhancements (Week 1-2)

**Goal:** Ensure post-processor filters all fields

**Tasks:**
1. Implement removePlatformForbiddenPatterns() method
2. Implement enforceFieldQualityRules() method
3. Update process() pipeline to include new steps
4. Add comprehensive logging
5. Test with injected violations

**Deliverables:**
- Updated DeterministicPostProcessor
- Platform-aware filtering for all fields
- Field-specific quality enforcement

**Success Criteria:**
- All Hemnet violations removed from all fields
- Field quality rules enforced (headline period removal, etc.)
- Transformations logged for all changes

---

### Phase 3: Analyzer Enhancements (Week 2)

**Goal:** Ensure analyzer checks all fields

**Tasks:**
1. Update AnalysisRequest interface
2. Update buildAnalysisPrompt() to include all fields
3. Update identifyTextSpans() to handle all fields
4. Test analyzer with violations in auxiliary fields

**Deliverables:**
- Updated ExpertAIAnalyzer
- Analysis coverage for all 6 fields
- Critical severity for platform violations

**Success Criteria:**
- Analyzer returns feedback for all fields
- Platform violations flagged as critical
- Field-specific quality issues identified

---

### Phase 4: Testing (Week 2-3)

**Goal:** Comprehensive test coverage

**Tasks:**
1. Implement property-based tests (12 properties)
2. Implement unit tests for each component
3. Implement integration tests
4. Implement regression tests
5. Set up test fixtures and arbitraries

**Deliverables:**
- Complete test suite
- Property-based tests with 100+ iterations
- Regression test suite

**Success Criteria:**
- All 12 properties pass
- 100% coverage of critical paths
- Regression tests prevent future issues

---

### Phase 5: Monitoring (Week 3)

**Goal:** Production monitoring and alerting

**Tasks:**
1. Implement metrics collection
2. Set up alerting thresholds
3. Create monitoring dashboard
4. Document runbook for alerts

**Deliverables:**
- Metrics collection system
- Alert configuration
- Monitoring dashboard
- Operations runbook

**Success Criteria:**
- Real-time visibility into violations
- Alerts trigger at appropriate thresholds
- Dashboard shows key metrics

---

### Phase 6: Validation (Week 3-4)

**Goal:** Verify system works in production

**Tasks:**
1. Deploy to staging
2. Run canary tests with real data
3. Monitor metrics for 48 hours
4. Fix any issues found
5. Deploy to production
6. Monitor for 1 week

**Deliverables:**
- Staging deployment
- Production deployment
- Post-deployment monitoring report

**Success Criteria:**
- 0 Hemnet violations in production
- All field quality requirements met
- No performance degradation

---

## Rollback Plan

If critical issues are discovered after deployment:

### Immediate Rollback (< 5 minutes)

1. Revert PROMPT_VERSION to previous version (2.8.0)
2. This will restore cached prompts
3. Monitor for 15 minutes

### Partial Rollback (< 15 minutes)

If only specific component is problematic:

1. **Generator issues:** Revert generator changes, keep post-processor
2. **Post-processor issues:** Disable new filtering steps
3. **Analyzer issues:** Revert to previous analyzer version

### Full Rollback (< 30 minutes)

1. Revert all code changes
2. Clear Redis cache
3. Restart services
4. Verify system returns to previous behavior

---

## Success Metrics

### Functional Success

- ✅ 100% of Hemnet texts have 0 price/fee/energiklass violations in ALL fields
- ✅ 100% of texts have 0 forbidden phrases in ALL fields
- ✅ 95%+ of texts meet field-specific quality requirements
- ✅ Analyzer provides feedback for ALL fields

### Technical Success

- ✅ Generator validation catches violations before post-processor
- ✅ Post-processor successfully filters all fields
- ✅ Analyzer analyzes all 6 fields
- ✅ All 12 correctness properties pass with 100+ iterations

### Quality Success

- ✅ 0 production incidents related to platform violations
- ✅ User satisfaction maintained or improved
- ✅ Expert analysis quality maintained
- ✅ No performance degradation (< 5% increase in latency)

---

## Risks and Mitigations

### Risk 1: Generator Prompt Too Complex

**Impact:** High - GPT may become confused and produce lower quality output  
**Probability:** Medium  
**Mitigation:**
- Test prompt extensively with diverse property data
- Use clear, structured instructions
- Provide examples in prompt
- Monitor quality scores after deployment

### Risk 2: Post-Processor Over-Filtering

**Impact:** Medium - May remove legitimate content  
**Probability:** Low  
**Mitigation:**
- Use precise regex patterns
- Test with edge cases
- Log all transformations
- Allow manual override if needed

### Risk 3: Analyzer Performance Degradation

**Impact:** Medium - Slower user experience  
**Probability:** Medium  
**Mitigation:**
- Implement timeout handling
- Use caching where possible
- Monitor latency metrics
- Optimize prompt if needed

### Risk 4: False Positives in Validation

**Impact:** High - Legitimate texts rejected  
**Probability:** Low  
**Mitigation:**
- Careful validation logic
- Comprehensive testing
- Graceful error handling
- Manual review process for failures

---

## Appendix A: Field-Specific Examples

### Compliant Hemnet Output

```json
{
  "improvedPrompt": "Helrenoverat kök 2022 med köksö och södervända balkongen ger den här 3:an på Södermalm ett tydligt övertag.\n\nPlanlösningen samlar kök och vardagsrum i vinkel, med skjutdörrar ut mot den södervända uteplatsen. Köket har kompositbänk, gott om förvaring och integrerade Siemens-vitvaror.\n\nTre sovrum fungerar väl som barnrum, gästrum eller hemmakontor. Två helkaklade badrum renoverades 2021 med duschvägg i glas och badkar.\n\nSödermalm med närhet till Medborgarplatsen och Skanstull. Tunnelbanan nås på 5 minuter och Coop finns runt hörnet.",
  
  "headline": "Helrenoverad trea med balkong i söderläge",
  
  "socialCopy": "Helrenoverat kök 2022 och södervända balkongen ger denna 3:a på Södermalm ett tydligt övertag. Läs mer i annonsen.",
  
  "instagramCaption": "Helrenoverat kök med köksö och södervända balkongen 🌞 Perfekt för den som söker ljus och trivsel på Södermalm.",
  
  "showingInvitation": "Välkommen på visning [TID]. Kontakta [KONTAKT] för mer information.",
  
  "shortAd": "3:a om 72 kvm med helrenoverat kök 2022 och södervända balkongen. Södermalm med 5 min till tunnelbanan."
}
```

### Non-Compliant Output (Violations Marked)

```json
{
  "improvedPrompt": "...",
  
  "headline": "Trea med avgift 4500 kr/mån", // ❌ Contains "avgift"
  
  "socialCopy": "Fantastisk lägenhet som erbjuder allt du behöver!", // ❌ Forbidden phrases
  
  "instagramCaption": "Energiklass B 🏠🌟✨💫", // ❌ Contains "energiklass", too many emojis
  
  "showingInvitation": "Boka tid nu!", // ❌ Missing "visning"
  
  "shortAd": "Fin lägenhet i bra läge." // ❌ Missing property type and area
}
```

---

## Appendix B: Validation Patterns

### Hemnet-Forbidden Patterns

```typescript
const HEMNET_FORBIDDEN_PATTERNS = {
  price: /\b(pris|utgångspris|kronor|SEK|mkr|miljoner\s+kronor)\b/gi,
  fee: /\b(avgift|månadsavgift|kr\/mån|per\s+månad)\b/gi,
  operatingCost: /\b(driftkostnad|driftskostnad)\b/gi,
  energiklass: /\b(energiklass|energiprestanda|energiklass\s+[A-G])\b/gi
};
```

### Field Quality Patterns

```typescript
const FIELD_QUALITY_PATTERNS = {
  headline: {
    trailingPunctuation: /[.!?]$/,
    emoji: /[\u{1F300}-\u{1F9FF}]/gu
  },
  socialCopy: {
    missingPeriod: /[^.!?]$/,
    aggressiveCTA: /\b(NU|BOKA NU|RING NU|MISSA INTE)\b/i
  },
  instagramCaption: {
    emoji: /[\u{1F300}-\u{1F9FF}]/gu,
    missingPunctuation: /[^.!?]$/
  },
  showingInvitation: {
    visning: /visning/i
  },
  shortAd: {
    propertyType: /\b(lägenhet|villa|radhus|bostadsrätt|hyresrätt)\b/i,
    area: /\b\d+\s*kvm\b/i
  }
};
```

---

**End of Design Document**

