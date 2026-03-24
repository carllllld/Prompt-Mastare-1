# Bugfix Requirements Document

## Introduction

The Expert Analyzer (AI-powered feedback system in `server/lib/perfect-swedish-analyzer.ts`) fails to detect violations that the validation system (`server/lib/text-validation.ts`) correctly identifies. This creates a critical user experience gap where users see no feedback in the ExpertFeedbackPanel UI despite their text containing forbidden phrases, Hemnet rule violations, and grammar errors. The validation warnings only reach Sentry (developers), not users, leading to potential legal compliance issues and rejected Hemnet listings.

**Impact:**
- Users don't see validation violations in the UI
- Users believe their text is perfect when it has critical legal/style issues
- Texts may be rejected by Hemnet or mislead buyers
- Validation warnings only logged to Sentry, not surfaced to users

**Affected Components:**
- `server/lib/perfect-swedish-analyzer.ts` (analyzer not detecting)
- `server/lib/text-validation.ts` (validation detecting correctly)
- `server/lib/text-rules.ts` (rules: FORBIDDEN_PHRASES, HEMNET_FORBIDDEN_PATTERNS, UNVERIFIABLE_CLAIMS)
- `server/lib/perfect-swedish-orchestrator.ts` (runs both systems)
- `client/src/components/ExpertFeedbackPanel.tsx` (displays analyzer results)

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN user generates text containing forbidden phrase "erbjuds" THEN the validation system logs warning to Sentry BUT the Expert Analyzer returns empty improvements array and compliant: true

1.2 WHEN user generates text containing unverifiable claim "i nyskick" without evidence THEN the validation system logs warning to Sentry BUT the Expert Analyzer returns empty improvements array and compliant: true

1.3 WHEN user generates text containing Hemnet rule violation "Kontakta mäklaren för fullständig ekonomisk information" THEN the validation system logs warning to Sentry BUT the Expert Analyzer returns empty improvements array and compliant: true

1.4 WHEN user generates text containing grammar error "fält.. fält.." (double period) THEN the validation system logs warning to Sentry BUT the Expert Analyzer returns empty improvements array and compliant: true

1.5 WHEN validation system detects violations in ANY field (improvedPrompt, socialCopy, instagramCaption, etc.) THEN the Expert Analyzer fails to detect the same violations in those fields

1.6 WHEN Expert Analyzer returns empty improvements array THEN the ExpertFeedbackPanel shows no feedback to user despite critical violations existing

### Expected Behavior (Correct)

2.1 WHEN user generates text containing forbidden phrase "erbjuds" THEN the Expert Analyzer SHALL return improvement item with severity: "critical", category: "style", issue: "Förbjuden fras: 'erbjuds'", suggestion: "Ersätt med 'har' eller 'finns'"

2.2 WHEN user generates text containing unverifiable claim "i nyskick" without evidence THEN the Expert Analyzer SHALL return improvement item with severity: "critical", category: "legal", issue: "Otydligt påstående: 'i nyskick' kräver bevis", suggestion: "Specificera renoveringsår eller skriv 'har genomgått omfattande renoveringar'"

2.3 WHEN user generates text containing Hemnet rule violation about economic references THEN the Expert Analyzer SHALL return improvement item with severity: "critical", category: "legal", issue: "Hemnet-regel: Ekonomihänvisning inte tillåten", suggestion: "Ta bort meningen om ekonomi"

2.4 WHEN user generates text containing grammar error "fält.. fält.." THEN the Expert Analyzer SHALL return improvement item with severity: "critical", category: "grammar", issue: "Dubbel punkt", suggestion: "Korrigera till en punkt"

2.5 WHEN validation system detects violations in ANY field THEN the Expert Analyzer SHALL detect the same violations in those fields and return corresponding improvement items

2.6 WHEN Expert Analyzer detects violations THEN the ExpertFeedbackPanel SHALL display all improvement items to user with appropriate severity indicators

2.7 WHEN Expert Analyzer detects critical violations THEN legalCheck.compliant SHALL be false and legalCheck.issues SHALL contain list of violation types

### Unchanged Behavior (Regression Prevention)

3.1 WHEN user generates text without violations THEN the Expert Analyzer SHALL CONTINUE TO return empty improvements array and compliant: true

3.2 WHEN Expert Analyzer detects non-critical style suggestions THEN it SHALL CONTINUE TO return them with severity: "suggestion" and appropriate category

3.3 WHEN Expert Analyzer identifies strengths in the text THEN it SHALL CONTINUE TO return them in the strengths array

3.4 WHEN Expert Analyzer calculates overallQuality score THEN it SHALL CONTINUE TO base it on detected issues (lower score when violations exist)

3.5 WHEN Expert Analyzer processes valid broker language (not in FORBIDDEN_PHRASES) THEN it SHALL CONTINUE TO not flag it as violation

3.6 WHEN Expert Analyzer timeout occurs THEN it SHALL CONTINUE TO return basic analysis with overallQuality: 7.0 and empty improvements

3.7 WHEN post-processor successfully removes violations before analyzer runs THEN the Expert Analyzer SHALL CONTINUE TO find no violations (correct behavior)
