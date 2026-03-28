# Deep Analysis: Vitec Integration & Textanalys Implementation

**Analysis Date:** 2026-03-28  
**Analyst:** Kiro AI  
**Scope:** Complete review of Vitec integration and Textanalys AI implementation

---

## Executive Summary

After comprehensive analysis of all code, I've identified **CRITICAL ISSUES** that need immediate attention:

### 🔴 CRITICAL ISSUES (Must Fix)

1. **AI Rewrite Prompt Has Typo** - "mäklartexteroch" instead of "mäklartexter och"
2. **Vitec Export Not Connected** - No route endpoint exists in routes.ts
3. **Missing Error Handling** - Several edge cases not covered
4. **AI Analysis Prompt Inconsistencies** - Some rules not enforced properly

### 🟡 IMPORTANT IMPROVEMENTS (Should Fix)

1. **AI Prompt Quality** - Can be significantly improved for better results
2. **Validation Logic** - Some gaps in deterministic validation
3. **User Experience** - Missing feedback and progress indicators

### ✅ STRENGTHS (Working Well)

1. **Hemnet Integration** - Robust parsing with fallbacks
2. **Image Analysis** - Good timeout and error handling
3. **Quota System** - Properly implemented
4. **UI Components** - Well-structured and accessible

---

## Part 1: Vitec Integration Analysis

### 1.1 Vitec Import (vitec-integration.ts)

**Status:** ✅ GOOD - Well implemented

**Strengths:**
- Comprehensive property mapping with 50+ fields
- Multiple fallback strategies for API endpoints
- Proper error handling with custom error classes
- Good TypeScript typing
- Sentry integration for monitoring

**Issues Found:**
```typescript
// ISSUE 1: API endpoint validation not tested
async validateApiKey(): Promise<boolean> {
  // Uses /api/Login/secure-resource which may not exist
  // Falls back to listing endpoint - good, but untested
}
```

**Recommendation:**
```typescript
// Add explicit endpoint testing
async validateApiKey(): Promise<boolean> {
  const endpoints = [
    '/api/Login/secure-resource',
    `/PublicAdvertising/Estate/${this.customerId}`,
    '/Fetcher/All'
  ];
  
  for (const endpoint of endpoints) {
    try {
      await this.request(endpoint);
      return true;
    } catch (err) {
      if (err instanceof VitecAuthError) return false;
      continue; // Try next endpoint
    }
  }
  return false;
}
```

### 1.2 Vitec Export (vitec-export.ts)

**Status:** 🔴 CRITICAL - Not connected to backend

**CRITICAL ISSUE:**
```typescript
// vitec-export.ts exists with full implementation
// BUT: No route in server/routes.ts!

// MISSING:
app.post("/api/vitec/export", requireAuth, async (req, res) => {
  // This endpoint DOES NOT EXIST
});
```

**Impact:**
- VitecExportButton component will fail with 404
- Users cannot export to Vitec
- Feature is non-functional

**Fix Required:**
```typescript
// Add to server/routes.ts around line 3700

app.post("/api/vitec/export", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { objectId, propertyData, generatedText } = req.body;

    // Get Vitec credentials from user settings
    const settings = await storage.getIntegrationSettings(user.id);
    if (!settings?.vitecApiKey || !settings?.vitecCustomerId) {
      return res.status(400).json({
        message: "Vitec-integration är inte konfigurerad. Gå till Integrationer för att konfigurera."
      });
    }

    // Validate export data
    const exportData: VitecExportData = {
      objectId,
      customerId: settings.vitecCustomerId,
      propertyType: propertyData.propertyType || "apartment",
      description: generatedText,
      headline: propertyData.headline,
      shortDescription: propertyData.shortDescription,
      landOwnership: propertyData.landOwnership,
      brfUnits: propertyData.brfUnits,
      nearbySchools: propertyData.nearbySchools,
      nearbyServices: propertyData.nearbyServices,
      generatedBy: "OptiPrompt",
      generatedAt: new Date().toISOString(),
    };

    const validation = validateExportData(exportData);
    if (!validation.valid) {
      return res.status(400).json({
        message: `Valideringsfel: ${validation.errors.join(', ')}`
      });
    }

    // Export to Vitec
    const { exportToVitec } = await import('./lib/vitec-export');
    const result = await exportToVitec(
      {
        apiKey: settings.vitecApiKey,
        customerId: settings.vitecCustomerId,
      },
      exportData
    );

    res.json(result);
  } catch (err) {
    console.error("Vitec export error:", err);
    Sentry.captureException(err, { tags: { integration: "vitec", action: "export" } });
    res.status(500).json({
      message: "Ett oväntat fel uppstod vid export till Vitec"
    });
  }
});
```

### 1.3 Vitec Export Button (VitecExportButton.tsx)

**Status:** 🟡 GOOD UI - But backend missing

**Strengths:**
- Clean UI with preview
- Good error handling on frontend
- Proper loading states
- Accessible dialog

**Issues:**
```typescript
// ISSUE 1: Calls non-existent endpoint
const res = await apiRequest("POST", "/api/vitec/export", {
  // This will return 404
});

// ISSUE 2: No retry logic for transient failures
// ISSUE 3: No progress indicator for long exports
```

**Recommendations:**
1. Add retry logic with exponential backoff
2. Show progress for multi-step export
3. Add success confirmation with link to Vitec

---

## Part 2: Textanalys AI Implementation

### 2.1 Expert AI Analyzer (perfect-swedish-analyzer.ts)

**Status:** 🟡 GOOD FOUNDATION - Needs improvements

#### CRITICAL ISSUE #1: Typo in AI Prompt

```typescript
// LINE 3650 in routes.ts - AI REWRITE PROMPT
let rewritePrompt = `Du är en expert på svenska mäklartexteroch ska skriva om...`
//                                                        ^^^^ MISSING SPACE

// SHOULD BE:
let rewritePrompt = `Du är en expert på svenska mäklartexter och ska skriva om...`
//                                                        ^^^^^ FIXED
```

**Impact:** AI may misunderstand the instruction, leading to lower quality rewrites.

#### CRITICAL ISSUE #2: Inconsistent Rule Enforcement

```typescript
// The AI prompt says "MÅSTE flaggas" but doesn't enforce it
// Example: Hemnet forbidden patterns

const platformRulesSection = normalizedPlatform === 'hemnet' ? `
## HEMNET-SPECIFIKA REGLER (kontrollera dessa i ALLA fält) - KRITISKT!
- Energiklass eller energiprestanda FÅR INTE nämnas i NÅGON text
  → severity: "critical"
```

**Problem:** AI is told to flag as "critical" but there's no validation that it actually does.

**Solution:** Add post-processing validation:

```typescript
private enforceHemnetRules(
  analysis: Omit<ExpertAnalysis, 'duration'>,
  text: string
): Omit<ExpertAnalysis, 'duration'> {
  const hemnetViolations: FeedbackItem[] = [];
  
  // Check for energy class mentions
  if (/energiklass|energiprestanda|energi[a-g]/i.test(text)) {
    hemnetViolations.push({
      id: uuidv4(),
      issue: "Energiklass nämns i text (förbjudet på Hemnet)",
      location: "improvedPrompt",
      suggestion: "Ta bort energiklassreferens - visas i separat fält",
      category: "legal",
      severity: "critical",
      expert: "lawyer",
      actionable: true,
    });
  }
  
  // Check for price mentions
  if (/\d+\s*(kr|kronor|miljoner|mkr)/i.test(text)) {
    hemnetViolations.push({
      id: uuidv4(),
      issue: "Pris nämns i text (förbjudet på Hemnet)",
      location: "improvedPrompt",
      suggestion: "Ta bort prisreferens - visas i separat fält",
      category: "legal",
      severity: "critical",
      expert: "lawyer",
      actionable: true,
    });
  }
  
  return {
    ...analysis,
    improvements: [...analysis.improvements, ...hemnetViolations],
    legalCheck: {
      ...analysis.legalCheck,
      compliant: analysis.legalCheck.compliant && hemnetViolations.length === 0,
      issues: [...analysis.legalCheck.issues, ...hemnetViolations.map(v => v.issue)]
    }
  };
}
```

### 2.2 AI Prompt Quality Analysis

**Current Prompt Structure:**
```
1. Forbidden phrases list (good)
2. Unverifiable claims (good)
3. Platform rules (good)
4. Text to analyze (good)
5. Analysis instructions (needs improvement)
```

**ISSUE: Prompt is too long and unfocused**

Current prompt: ~2000 tokens  
Optimal: ~1200 tokens

**Improved Prompt Structure:**

```typescript
private buildAnalysisPrompt(request: AnalysisRequest): string {
  return `Du är en senior svensk mäklare OCH jurist. Analysera texten och ge feedback i JSON.

## KRITISKA REGLER (severity: "critical" om de bryts)

### Förbjudna fraser (AI-klyschor):
${this.getTopForbiddenPhrases(10)} // Only top 10 most common

### Hemnet-regler (om platform === "hemnet"):
1. Energiklass FÅR INTE nämnas → Ta bort
2. Pris/avgift FÅR INTE nämnas → Ta bort
3. Ekonomihänvisningar FÅR INTE förekomma → Ta bort

### Otydliga påståenden (kräver bevis):
- "Renoverat" → Kräver år
- "Nyskick" → Kräver besiktning
- "Låg avgift" → Kräver jämförelse

## TEXT ATT ANALYSERA

Huvudtext:
${request.improvedPrompt}

${request.headline ? `Rubrik: ${request.headline}` : ''}

## ANALYSERA

För VARJE problem, returnera:
{
  "issue": "Konkret problem",
  "location": "improvedPrompt|headline|...",
  "suggestion": "Konkret lösning",
  "category": "grammar|style|legal|broker_realism|clarity",
  "severity": "critical|important|suggestion",
  "expert": "broker|lawyer"
}

Fokusera på:
1. Kritiska regelbrott (förbjudna fraser, Hemnet-regler)
2. Juridiska problem (otydliga påståenden)
3. Grammatik och stil
4. Mäklarrealism (låter det som en riktig mäklare?)

Svara ENDAST med JSON:
{
  "overallQuality": 0-10,
  "strengths": ["styrka 1", "styrka 2", "styrka 3"],
  "improvements": [...],
  "legalCheck": {
    "compliant": true/false,
    "notes": "...",
    "issues": [...]
  }
}`;
}
```

**Benefits:**
- 40% shorter → faster response
- More focused → better quality
- Clearer instructions → more consistent results

### 2.3 Deterministic Validation

**Status:** ✅ GOOD - Well implemented

**Strengths:**
- Runs BEFORE AI (fast, reliable)
- Catches forbidden phrases
- Merges with AI results
- Memory-efficient (clears after merge)

**Minor Issue:**

```typescript
// text-validation.ts - Missing some edge cases

export function findRuleViolations(
  text: string,
  platform: string,
  style: WritingStyle
): string[] {
  // ISSUE: Doesn't check for double punctuation
  // Example: "Välkommen.." should be flagged
  
  // ISSUE: Doesn't check for excessive exclamation marks
  // Example: "Fantastiskt!!" should be flagged
}
```

**Fix:**

```typescript
export function findRuleViolations(
  text: string,
  platform: string,
  style: WritingStyle
): string[] {
  const violations: string[] = [];
  
  // Existing checks...
  
  // Check for double punctuation
  if (/\.{2,}|!{2,}|\?{2,}/.test(text)) {
    violations.push("Dubbel punktering hittad (t.ex. '..' eller '!!')");
  }
  
  // Check for excessive exclamation marks
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    violations.push(`För många utropstecken (${exclamationCount} st) - max 2 rekommenderas`);
  }
  
  // Check for ALL CAPS words (except abbreviations)
  const allCapsWords = text.match(/\b[A-ZÅÄÖ]{4,}\b/g);
  if (allCapsWords && allCapsWords.length > 0) {
    violations.push(`Ord i versaler hittade: ${allCapsWords.join(', ')}`);
  }
  
  return violations;
}
```

---

## Part 3: Hemnet Integration Analysis

### 3.1 Hemnet Scraping (hemnet-integration.ts)

**Status:** ✅ EXCELLENT - Very robust

**Strengths:**
- Multiple parsing strategies (JSON-LD + __NEXT_DATA__)
- Comprehensive error handling
- Rate limit detection with retry
- Proper timeout handling (20s)
- Good fallback logic

**Minor Improvements:**

```typescript
// IMPROVEMENT 1: Add caching to avoid re-fetching same URL

const HEMNET_CACHE = new Map<string, { data: HemnetProperty; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchHemnetProperty(url: string): Promise<HemnetProperty> {
  // Check cache first
  const cached = HEMNET_CACHE.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const property = await fetchHemnetPropertyInternal(url);
  
  // Cache result
  HEMNET_CACHE.set(url, { data: property, timestamp: Date.now() });
  
  // Clean old cache entries
  if (HEMNET_CACHE.size > 100) {
    const oldestKey = Array.from(HEMNET_CACHE.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    HEMNET_CACHE.delete(oldestKey);
  }
  
  return property;
}
```

### 3.2 Image Analysis (image-analyzer.ts)

**Status:** ✅ GOOD - Well implemented

**Strengths:**
- Proper timeout handling (15s per image)
- Sequential processing to avoid rate limits
- Good error recovery
- Focused prompt (only real estate features)

**ISSUE: Using wrong model**

```typescript
// CURRENT:
const response = await openai.chat.completions.create({
  model: "gpt-4-turbo", // ❌ OLD MODEL
  // ...
});

// SHOULD BE:
const response = await openai.chat.completions.create({
  model: "gpt-4o", // ✅ LATEST MODEL with vision
  // Better vision capabilities
  // Faster response
  // Lower cost
});
```

**IMPROVEMENT: Better prompt**

```typescript
const ANALYSIS_PROMPT = `Du är en expert på svenska fastighetsannonser. Analysera bilden och extrahera ENDAST information relevant för mäklarbeskrivning.

FOKUSERA PÅ:
- Rumstyp (kök, badrum, sovrum, vardagsrum)
- Material (parkett, klinker, marmor, trä)
- Ljus (naturligt ljus, fönster mot söder)
- Skick (renoverat, väl underhållet)
- Arkitektur (högt i tak, öppen planlösning, takfönster)

IGNORERA:
- Möbler, dekoration, personliga föremål
- Människor, husdjur, växter
- Allt som är tillfälligt

Svara JSON:
{
  "roomType": "kök|badrum|sovrum|vardagsrum|hall|null",
  "features": ["feature1", "feature2"],
  "materials": ["material1"],
  "lighting": "beskrivning eller null",
  "condition": "renoverat|väl underhållet|null",
  "observations": "kort sammanfattning"
}

EXEMPEL:
Bild av kök → {
  "roomType": "kök",
  "features": ["öppen planlösning", "köksö", "integrerade vitvaror"],
  "materials": ["vit marmor", "ekparkett"],
  "lighting": "naturligt ljus från stora fönster",
  "condition": "renoverat",
  "observations": "Modernt kök med öppen planlösning mot vardagsrum, vita marmorbänkar och ekparkett"
}`;
```

---

## Part 4: AI Rewrite Implementation

### 4.1 Rewrite Endpoint (routes.ts)

**Status:** 🔴 CRITICAL TYPO + 🟡 IMPROVEMENTS NEEDED

**CRITICAL FIX #1: Typo**

```typescript
// LINE 3650 - CURRENT (WRONG):
let rewritePrompt = `Du är en expert på svenska mäklartexteroch ska skriva om...`

// FIXED:
let rewritePrompt = `Du är en expert på svenska mäklartexter och ska skriva om...`
```

**IMPROVEMENT #1: Better prompt structure**

```typescript
// CURRENT: Prompt is too verbose and unfocused
// IMPROVED:

let rewritePrompt = `Du är en senior svensk mäklare med 15 års erfarenhet. Skriv om objektbeskrivningen.

## ORIGINAL TEXT
${trimmedText}

## PROBLEM ATT ÅTGÄRDA
${improvements && improvements.length > 0 
  ? improvements.map((imp: any, idx: number) => 
      `${idx + 1}. ${imp.category.toUpperCase()}: ${imp.issue}\n   → Lösning: ${imp.suggestion}`
    ).join('\n\n')
  : 'Inga specifika problem - förbättra allmän kvalitet'}

${context ? `## MÄKLARENS INSTRUKTIONER\n${context}\n` : ''}

## REGLER FÖR OMSKRIVNING

1. BEHÅLL all faktainformation (mått, år, material)
2. ÅTGÄRDA alla problem ovan
3. FÖLJ mäklarens instruktioner
4. UNDVIK AI-klyschor: "välkommen", "charmig", "drömmen", "perfekt"
5. SKRIV som en erfaren mäklare - naturligt och professionellt
6. BÖRJA med bostadens starkaste USP (inte bara storlek/adress)
7. AVSLUTA INTE med emotionella fraser

## OUTPUT
Skriv ENDAST den omskrivna texten. Ingen förklaring, ingen kommentar.`;
```

**IMPROVEMENT #2: Add quality check**

```typescript
// After getting rewritten text, validate it

const rewrittenText = completion.choices[0]?.message?.content?.trim() || '';

if (!rewrittenText) {
  return res.status(500).json({ message: "Kunde inte generera omskriven text" });
}

// VALIDATE rewritten text
const { ExpertAIAnalyzer } = await import('./lib/perfect-swedish-analyzer');
const analyzer = new ExpertAIAnalyzer();

const validation = await analyzer.analyze({
  improvedPrompt: rewrittenText,
  headline: '',
  socialCopy: '',
  instagramCaption: '',
  showingInvitation: '',
  shortAd: '',
  disposition: null,
  style: 'professional',
  platform: 'hemnet'
});

// If rewritten text has critical issues, retry or warn user
if (validation.improvements.some(i => i.severity === 'critical')) {
  console.warn('Rewritten text has critical issues:', validation.improvements);
  // Could retry with stricter prompt or return warning
}

// Return rewritten text with quality score
res.json({
  rewrittenText,
  changes: improvements?.map((imp: any) => imp.issue) || [],
  qualityScore: validation.overallQuality,
  remainingIssues: validation.improvements.filter(i => i.severity === 'critical').length
});
```

---

## Part 5: Frontend Implementation

### 5.1 HemnetAnalysis.tsx

**Status:** ✅ GOOD - Well structured

**Strengths:**
- Clean component structure
- Good state management
- Proper error handling
- Accessible UI

**IMPROVEMENT: Add progress indicators**

```typescript
// Add progress state
const [analysisProgress, setAnalysisProgress] = useState<{
  step: string;
  progress: number;
}>({ step: '', progress: 0 });

// Update during analysis
const handleAnalyze = useCallback(() => {
  setAnalysisProgress({ step: 'Hämtar data från Hemnet...', progress: 20 });
  
  hemnetMutation.mutate(hemnetUrl, {
    onSuccess: (data) => {
      setAnalysisProgress({ step: 'Analyserar text...', progress: 60 });
      // ... rest of logic
      setAnalysisProgress({ step: 'Klar!', progress: 100 });
    },
  });
}, [hemnetUrl, hemnetMutation]);

// Show progress in UI
{hemnetMutation.isPending && (
  <div className="mt-4">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{analysisProgress.step}</span>
    </div>
    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
      <div 
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${analysisProgress.progress}%` }}
      />
    </div>
  </div>
)}
```

---

## Part 6: Critical Fixes Summary

### Must Fix Immediately

1. **Add Vitec Export Endpoint**
   - File: `server/routes.ts`
   - Add POST /api/vitec/export route
   - Priority: CRITICAL

2. **Fix AI Rewrite Typo**
   - File: `server/routes.ts` line 3650
   - Change "mäklartexteroch" → "mäklartexter och"
   - Priority: CRITICAL

3. **Add Hemnet Rule Enforcement**
   - File: `server/lib/perfect-swedish-analyzer.ts`
   - Add `enforceHemnetRules()` method
   - Priority: CRITICAL

4. **Update Image Analysis Model**
   - File: `server/lib/image-analyzer.ts`
   - Change "gpt-4-turbo" → "gpt-4o"
   - Priority: IMPORTANT

### Should Fix Soon

5. **Improve AI Prompts**
   - Shorten and focus prompts
   - Add better examples
   - Priority: IMPORTANT

6. **Add Validation to Rewrite**
   - Validate rewritten text quality
   - Retry if critical issues found
   - Priority: IMPORTANT

7. **Add Progress Indicators**
   - Show analysis progress
   - Better UX during long operations
   - Priority: NICE TO HAVE

---

## Part 7: Testing Checklist

### Vitec Integration
- [ ] Test Vitec import with real API key
- [ ] Test Vitec export (after adding endpoint)
- [ ] Test error handling (invalid API key, network errors)
- [ ] Test with different property types

### Textanalys
- [ ] Test Hemnet URL analysis
- [ ] Test manual text analysis
- [ ] Test AI rewrite with various instructions
- [ ] Test quota limits
- [ ] Test error cases (invalid URL, too short text)

### AI Quality
- [ ] Verify forbidden phrases are caught
- [ ] Verify Hemnet rules are enforced
- [ ] Verify rewritten text quality
- [ ] Test with edge cases (very short, very long, special characters)

---

## Conclusion

**Overall Assessment:** 🟡 GOOD FOUNDATION - Needs critical fixes

**Strengths:**
- Solid architecture
- Good error handling
- Comprehensive feature set
- Well-structured code

**Critical Issues:**
- Vitec export not connected
- AI prompt typo
- Missing rule enforcement

**Recommendation:**
Fix the 4 critical issues immediately, then deploy. The foundation is solid, but these bugs will cause user-facing failures.

**Estimated Fix Time:**
- Critical fixes: 2-3 hours
- Important improvements: 4-6 hours
- Nice-to-have: 8-10 hours

**Priority Order:**
1. Add Vitec export endpoint (30 min)
2. Fix AI rewrite typo (5 min)
3. Add Hemnet rule enforcement (1 hour)
4. Update image model (5 min)
5. Improve AI prompts (2 hours)
6. Add validation to rewrite (1 hour)
7. Add progress indicators (2 hours)
