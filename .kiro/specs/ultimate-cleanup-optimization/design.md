# Design Document: Ultimate Cleanup & Optimization

## Översikt

Detta är en omfattande cleanup och optimering av OptiPrompt-systemet för att göra det till det bästa verktyget för svenska mäklare. Projektet tar bort det gamla 7-stegs pipelinen helt, eliminerar A/B-test infrastrukturen, och gör den nya 3-stegs pipelinen till standard. Målet är ett enklare, snabbare och mer underhållbart system med garanterad prestanda <20s och 98%+ success rate.

Systemet har blivit komplext med både gamla och nya pipelines körande samtidigt, vilket skapar förvirring och prestandaproblem. Genom att ta bort allt som inte används och optimera kvarvarande kod får vi ett system som är lätt att förstå, underhålla och vidareutveckla.

## Arkitektur

```mermaid
graph TD
    A[Client Request] --> B[Routes Layer]
    B --> C[Perfect Swedish Orchestrator]
    C --> D[Smart Generator]
    C --> E[Post Processor]
    C --> F[Expert Analyzer]
    
    D --> G[OpenAI GPT-5.2]
    F --> G
    
    C --> H[Redis Cache]
    C --> I[PostgreSQL]
    
    J[Monitoring] --> C
    J --> K[Sentry]
    
    style C fill:#90EE90
    style D fill:#90EE90
    style E fill:#90EE90
    style F fill:#90EE90
    style B fill:#FFB6C1
    
    L[OLD: Listing Orchestrator] -.-> M[REMOVE]
    N[OLD: A/B Test Manager] -.-> M
    O[OLD: 7-Step Pipeline] -.-> M
    
    style L fill:#FF6B6B
    style N fill:#FF6B6B
    style O fill:#FF6B6B
    style M fill:#FF0000


## Huvudflöde

```mermaid
sequenceDiagram
    participant Client
    participant Routes
    participant Orchestrator
    participant Generator
    participant PostProcessor
    participant Analyzer
    participant OpenAI
    participant DB
    
    Client->>Routes: POST /api/optimize
    Routes->>Orchestrator: execute(request)
    
    Note over Orchestrator: Step 1: Smart Generation
    Orchestrator->>Generator: generate(request)
    Generator->>OpenAI: GPT-5.2 (reasoning: medium)
    OpenAI-->>Generator: Main text + aux fields
    Generator-->>Orchestrator: GenerationResult
    
    Note over Orchestrator: Step 2: Post-Processing
    Orchestrator->>PostProcessor: process(result)
    PostProcessor-->>Orchestrator: Cleaned & validated text
    
    Note over Orchestrator: Step 3: Expert Analysis
    Orchestrator->>Analyzer: analyze(text)
    Analyzer->>OpenAI: GPT-5.2 (reasoning: low)
    OpenAI-->>Analyzer: Quality feedback
    Analyzer-->>Orchestrator: ExpertAnalysis
    
    Orchestrator->>DB: Save metrics
    Orchestrator-->>Routes: PipelineResult
    Routes-->>Client: Complete response


## Komponenter och Gränssnitt

### PerfectSwedishOrchestrator (BEHÅLL & FÖRBÄTTRA)

**Syfte**: Huvudorkestrering av 3-stegs pipelinen

**Gränssnitt**:
```typescript
interface PipelineRequest {
  disposition: any;
  style: WritingStyle;
  platform: string;
  personalStylePrompt?: string;
  targetWordMin: number;
  targetWordMax: number;
  userId: string;
  sessionId: string;
}

interface PipelineResult {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  expertAnalysis?: ExpertAnalysis;
  metrics: PipelineMetrics;
}
```

**Ansvar**:
- Koordinera 3-stegs pipeline
- Hantera retry-logik (max 2 retries)
- Emittera progress events via WebSocket
- Logga metrics till databas
- Ingen fallback till gamla systemet (tas bort)


### SmartGenerationEngine (BEHÅLL)

**Syfte**: Generera huvudtext och aux-fält i ett enda API-anrop

**Gränssnitt**:
```typescript
interface GenerationRequest {
  disposition: any;
  style: WritingStyle;
  platform: string;
  personalStylePrompt?: string;
  targetWordMin: number;
  targetWordMax: number;
}

interface GenerationResult {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  duration: number;
}
```

**Ansvar**:
- Generera all text i ett anrop (reasoning: medium)
- Garantera att alla aux-fält genereras
- Hantera token budget korrekt (5500-8000 tokens)
- Returnera komplett resultat eller kasta fel


### DeterministicPostProcessor (BEHÅLL & FÖRBÄTTRA)

**Syfte**: Deterministisk bearbetning av genererad text

**Gränssnitt**:
```typescript
interface PostProcessRequest {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  disposition: any;
  style: WritingStyle;
  platform: string;
}

interface PostProcessResult extends PostProcessRequest {
  transformations: string[];
  duration: number;
}
```

**Ansvar**:
- Fixa restaurangnamn-validering
- Säkerställa narrativ integritet (inga saknade punkter)
- Lägga till saknade fakta (energiklass, värmesystem)
- Deterministiska transformationer (inga AI-anrop)
- Graceful degradation vid fel


### ExpertAIAnalyzer (BEHÅLL)

**Syfte**: AI-driven kvalitetsanalys och feedback

**Gränssnitt**:
```typescript
interface AnalysisRequest {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  disposition: any;
  style: WritingStyle;
  platform: string;
}

interface ExpertAnalysis {
  overallQuality: number;
  feedback: FeedbackItem[];
  duration: number;
}

interface FeedbackItem {
  id: string;
  issue: string;
  location: string;
  suggestion: string;
  category: 'grammar' | 'style' | 'legal' | 'broker_realism' | 'clarity';
  severity: 'critical' | 'important' | 'suggestion';
  expert: 'broker' | 'lawyer';
  actionable: boolean;
  autoFix?: string;
}
```

**Ansvar**:
- Analysera kvalitet med GPT-5.2 (reasoning: low)
- Ge konkret, actionable feedback
- Kategorisera problem efter typ och allvarlighetsgrad
- Föreslå auto-fixes där möjligt
- Graceful degradation vid fel


### Komponenter som TAS BORT

**ListingOrchestrator** (listing-orchestrator.ts)
- Gamla 7-stegs pipelinen
- Blueprint-system (över-komplext)
- Collaboration model (oanvänt)
- Ersätts helt av PerfectSwedishOrchestrator

**ABTestManager** (perfect-swedish-ab-test.ts)
- A/B-test logik
- Variant assignment
- Session consistency tracking
- Metrics aggregation
- Ingen A/B-test längre - bara nya pipelinen

**Gamla Pipeline-komponenter**:
- listing-agent-iteration.ts
- listing-loop-coordinator.ts
- listing-decision-engine.ts
- listing-quality-guards.ts
- listing-refinement-coordinator.ts
- listing-final-audit-subflow.ts
- listing-broker-realism-scorecard.ts
- listing-pipeline-observability.ts (delvis - behåll metrics)

**Frontend exempel-komponenter**:
- EditingToolsExample.tsx (bara exempel, inte produktionskod)


## Datamodeller

### Pipeline Request/Response (FÖRENKLAD)

```typescript
// Före: Komplex med A/B-test och fallback
interface OldPipelineRequest {
  disposition: any;
  style: WritingStyle;
  platform: string;
  personalStylePrompt?: string;
  targetWordMin: number;
  targetWordMax: number;
  userId: string;
  sessionId: string;
  forceVariant?: 'control' | 'treatment'; // TA BORT
}

// Efter: Enkel och direkt
interface PipelineRequest {
  disposition: any;
  style: WritingStyle;
  platform: string;
  personalStylePrompt?: string;
  targetWordMin: number;
  targetWordMax: number;
  userId: string;
  sessionId: string;
}
```

**Valideringsregler**:
- disposition: Måste innehålla property-data
- style: 'factual' | 'balanced' | 'selling'
- platform: 'hemnet' | 'booli' | 'egen'
- targetWordMin: 150-600
- targetWordMax: 250-800
- userId: Giltig user ID från session
- sessionId: Unik session identifier


### Database Schema (FÖRENKLAD)

**Tabeller som TAS BORT**:
```sql
-- A/B-test tabeller (inte längre nödvändiga)
DROP TABLE IF EXISTS ab_test_assignments;
DROP TABLE IF EXISTS pipeline_metrics_v2;
DROP TABLE IF EXISTS user_feedback;
DROP TABLE IF EXISTS expert_feedback_items;

-- Gamla experiment-tabeller
DROP TABLE IF EXISTS experiment_assignments;
DROP TABLE IF EXISTS experiment_results;
```

**Tabeller som BEHÅLLS**:
```sql
-- Förenklad pipeline_generations (utan variant)
CREATE TABLE pipeline_generations (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  session_id TEXT NOT NULL,
  
  -- Request data
  disposition JSONB NOT NULL,
  style TEXT NOT NULL,
  platform TEXT NOT NULL,
  personal_style_prompt TEXT,
  target_word_min INTEGER NOT NULL,
  target_word_max INTEGER NOT NULL,
  
  -- Result data
  improved_prompt TEXT,
  headline TEXT,
  social_copy TEXT,
  instagram_caption TEXT,
  showing_invitation TEXT,
  short_ad TEXT,
  expert_analysis JSONB,
  
  -- Metrics (förenklad)
  total_duration INTEGER,
  step1_duration INTEGER,
  step2_duration INTEGER,
  step3_duration INTEGER,
  retry_count INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL,
  error_type TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```


### Text Validation Rules (OPTIMERAD)

**Före: För strikt validering**
```typescript
// Blockerar legitim mäklarprosa
const FORBIDDEN_PHRASES = [
  "kommunikationer",      // Legitimt mäklarord!
  "närhet till service",  // Legitimt mäklarord!
  "smidig pendling",      // Legitimt mäklarord!
  "gott om utrymme",      // Naturlig svenska!
  // ... 50+ fraser
];

// För strikta gränser
if (detFinnsCount > 2) violations.push(...);
if (denHarCount > 3) violations.push(...);
```

**Efter: Fokuserad på verkliga AI-klyschor**
```typescript
// Bara rena AI-signaturer
const FORBIDDEN_PHRASES = [
  "välkommen till",
  "erbjuder",
  "bjuder på",
  "präglas av",
  "för den som",
  "vilket gör",
  "skapar en känsla av",
  "i hjärtat av",
  "missa inte",
  // ... ~20 fraser (ner från 50+)
];

// Context-aware gränser
if (detFinnsCount > 3 && wordCount < 300) violations.push(...);
if (denHarCount > 4 && wordCount < 300) violations.push(...);
```


## Algoritmisk Pseudokod

### Huvudprocessen: Pipeline Execution

```typescript
async function executePipeline(request: PipelineRequest): Promise<PipelineResult> {
  const startTime = Date.now();
  let retryCount = 0;

  // Retry logic med exponential backoff
  try {
    const result = await pRetry(
      async () => {
        // Step 1: Smart Generation (8-12s)
        emitProgress(request.sessionId, 'smart_generation', 0);
        const generationResult = await smartGenerator.generate({
          disposition: request.disposition,
          style: request.style,
          platform: request.platform,
          personalStylePrompt: request.personalStylePrompt,
          targetWordMin: request.targetWordMin,
          targetWordMax: request.targetWordMax
        });
        emitProgress(request.sessionId, 'smart_generation', 100);

        // Step 2: Post-Processing (1-2s, deterministisk)
        emitProgress(request.sessionId, 'post_processing', 0);
        const postProcessResult = await postProcessor.process({
          ...generationResult,
          disposition: request.disposition,
          style: request.style,
          platform: request.platform
        });
        emitProgress(request.sessionId, 'post_processing', 100);

        // Step 3: Expert Analysis (3-5s)
        emitProgress(request.sessionId, 'expert_analysis', 0);
        const expertAnalysis = await expertAnalyzer.analyze({
          improvedPrompt: postProcessResult.improvedPrompt,
          headline: postProcessResult.headline,
          socialCopy: postProcessResult.socialCopy,
          disposition: request.disposition,
          style: request.style,
          platform: request.platform
        });
        emitProgress(request.sessionId, 'expert_analysis', 100);

        return {
          ...postProcessResult,
          expertAnalysis
        };
      },
      {
        retries: 2,
        minTimeout: 1000,
        maxTimeout: 4000,
        factor: 2,
        onFailedAttempt: (error) => {
          retryCount = error.attemptNumber - 1;
          if (!isRetryableError(error)) throw error;
        }
      }
    );

    const totalDuration = Date.now() - startTime;
    
    // Spara metrics
    await saveMetrics({
      userId: request.userId,
      sessionId: request.sessionId,
      success: true,
      totalDuration,
      retryCount,
      ...result
    });

    return result;
  } catch (error) {
    // Ingen fallback - logga och kasta fel
    await logError(error, request);
    throw error;
  }
}
```

**Preconditions:**
- request är validerad och well-formed
- userId finns i databasen
- OpenAI API key är konfigurerad
- Redis och PostgreSQL är tillgängliga

**Postconditions:**
- Returnerar komplett PipelineResult med alla fält
- totalDuration < 20000ms (20s) i 95% av fallen
- success === true eller exception kastas
- Metrics sparade i databas

**Loop Invariants:**
- Progress events emitteras för varje steg
- Retry count ökar monotont
- Alla steg körs i sekvens (1 → 2 → 3)


### Smart Generation Algorithm

```typescript
async function generateText(request: GenerationRequest): Promise<GenerationResult> {
  const startTime = Date.now();
  
  // Beräkna token budget (OPTIMERAD)
  const tokenBudget = computeTokenBudget(request.targetWordMax);
  // Floor: 5500 tokens (upp från 4800)
  // Ceiling: 8000 tokens (upp från 7000)
  
  // Bygg prompt
  const systemPrompt = buildSystemPrompt(request);
  const userPrompt = buildUserPrompt(request);
  
  // Kontrollera prompt size
  const totalPromptSize = systemPrompt.length + userPrompt.length;
  
  // Höjd threshold för minimalFields
  const useMinimalFields = totalPromptSize > 30000; // Upp från 26000
  
  // Anropa OpenAI med reasoning: medium
  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    reasoning_effort: 'medium',
    max_tokens: tokenBudget,
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });
  
  // Parse och validera response
  const result = JSON.parse(response.choices[0].message.content);
  
  // Verifiera att ALLA fält finns
  if (!result.improvedPrompt || !result.headline || !result.socialCopy ||
      !result.instagramCaption || !result.showingInvitation || !result.shortAd) {
    throw new Error('Incomplete generation: missing required fields');
  }
  
  return {
    ...result,
    duration: Date.now() - startTime
  };
}
```

**Preconditions:**
- request.targetWordMax är mellan 250-800
- request.disposition innehåller property-data
- OpenAI API är tillgänglig

**Postconditions:**
- Alla 6 fält är genererade och non-empty
- improvedPrompt är mellan targetWordMin och targetWordMax ord
- duration < 15000ms i 95% av fallen
- JSON är välformad och parsebar

**Loop Invariants:** N/A (ingen loop)


### Post-Processing Algorithm

```typescript
async function processText(request: PostProcessRequest): Promise<PostProcessResult> {
  const startTime = Date.now();
  const transformations: string[] = [];
  
  let text = request.improvedPrompt;
  
  // 1. Fixa restaurangnamn-validering
  const restaurantPattern = /\b(restaurang|café|fik)\s+([A-ZÅÄÖ][a-zåäö]+)/gi;
  const matches = text.match(restaurantPattern);
  if (matches) {
    for (const match of matches) {
      // Verifiera mot disposition eller ta bort
      if (!isValidRestaurant(match, request.disposition)) {
        text = text.replace(match, 'restauranger');
        transformations.push(`Removed unverified restaurant: ${match}`);
      }
    }
  }
  
  // 2. Säkerställ narrativ integritet (inga saknade punkter)
  text = fixNarrativeIntegrity(text);
  if (text !== request.improvedPrompt) {
    transformations.push('Fixed narrative integrity');
  }
  
  // 3. Lägg till saknade fakta
  const missingFacts = findMissingFacts(text, request.disposition);
  if (missingFacts.length > 0) {
    text = addMissingFacts(text, missingFacts);
    transformations.push(`Added missing facts: ${missingFacts.join(', ')}`);
  }
  
  // 4. Validera och rensa
  text = cleanText(text);
  
  return {
    ...request,
    improvedPrompt: text,
    transformations,
    duration: Date.now() - startTime
  };
}
```

**Preconditions:**
- request innehåller alla genererade fält
- disposition är tillgänglig för fact-checking

**Postconditions:**
- Text är rengjord och validerad
- Inga overifierade restaurangnamn
- Narrativ integritet säkerställd
- Viktiga fakta tillagda om de saknades
- duration < 2000ms

**Loop Invariants:**
- transformations array växer monotont
- Original text bevaras i request


### Validation Algorithm (OPTIMERAD)

```typescript
function validateText(text: string, style: WritingStyle): ValidationResult {
  const violations: string[] = [];
  const wordCount = countWords(text);
  
  // 1. Förbjudna fraser (REDUCERAD LISTA)
  const forbiddenPhrases = [
    "välkommen till", "erbjuder", "bjuder på", "präglas av",
    "för den som", "vilket gör", "skapar en känsla av",
    "i hjärtat av", "missa inte"
  ];
  
  for (const phrase of forbiddenPhrases) {
    if (text.toLowerCase().includes(phrase)) {
      violations.push(`Förbjuden fras: "${phrase}"`);
    }
  }
  
  // 2. Upprepningar (CONTEXT-AWARE)
  const detFinnsCount = countOccurrences(text, /det finns/gi);
  const denHarCount = countOccurrences(text, /den har/gi);
  const liggerCount = countOccurrences(text, /ligger \d+/gi);
  const vilketCount = countOccurrences(text, /vilket/gi);
  
  // Högre gränser för längre texter
  if (detFinnsCount > 3 && wordCount < 300) {
    violations.push(`"Det finns" upprepas ${detFinnsCount} gånger`);
  }
  if (denHarCount > 4 && wordCount < 300) {
    violations.push(`"Den har" upprepas ${denHarCount} gånger`);
  }
  if (liggerCount > 3) {
    violations.push(`"ligger [avstånd]" upprepas ${liggerCount} gånger`);
  }
  if (vilketCount > 3) {
    violations.push(`"vilket" upprepas ${vilketCount} gånger`);
  }
  
  // 3. Monoton meningsstart (HÖJD THRESHOLD)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceStarts = sentences.map(s => s.trim().split(/\s+/)[0].toLowerCase());
  const startCounts = countFrequencies(sentenceStarts);
  
  const exemptWords = ['brf', 'avgift', 'bostaden', 'lägenheten', 'köket', 'badrummet'];
  
  for (const [word, count] of Object.entries(startCounts)) {
    if (count >= 5 && sentences.length >= 10 && !exemptWords.includes(word)) {
      violations.push(`Monoton meningsstart: "${word}" börjar ${count} meningar`);
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
    wordCount
  };
}
```

**Preconditions:**
- text är non-empty string
- style är valid WritingStyle

**Postconditions:**
- Returnerar ValidationResult med violations array
- valid === true om violations.length === 0
- Fokuserar på verkliga AI-klyschor, inte legitim mäklarprosa

**Loop Invariants:**
- violations array växer monotont
- Varje violation är en beskrivande sträng


## Exempel på Användning

### Komplett Pipeline Execution

```typescript
// Client-side request
const response = await fetch('/api/optimize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    disposition: {
      property: {
        type: 'lägenhet',
        size: 75,
        rooms: 3,
        address: 'Storgatan 1',
        layout: 'Rymlig trea med öppen planlösning'
      },
      location: {
        area: 'Vasastan',
        transport: 'T-bana 5 min',
        amenities: ['ICA', 'Systembolaget', 'Apotek']
      }
    },
    style: 'balanced',
    platform: 'hemnet',
    targetWordMin: 250,
    targetWordMax: 400
  })
});

const result = await response.json();
// result innehåller alla 6 fält + expertAnalysis + metrics
```

### WebSocket Progress Updates

```typescript
// Client lyssnar på progress events
ws.on('message', (data) => {
  const event = JSON.parse(data);
  
  switch (event.type) {
    case 'progress':
      console.log(`${event.step}: ${event.progress}% - ${event.message}`);
      break;
    case 'completion':
      console.log('Pipeline klar!');
      break;
  }
});

// Server emitterar events
emitProgress(sessionId, {
  type: 'progress',
  step: 'smart_generation',
  progress: 50,
  message: 'Genererar text...',
  timestamp: new Date()
});
```


### Frontend Integration

```typescript
// InlineHighlights integration (BEHÅLL)
import { InlineHighlights } from '@/components/InlineHighlights';

function ResultView({ result }: { result: PipelineResult }) {
  return (
    <InlineHighlights
      text={result.improvedPrompt}
      highlights={result.expertAnalysis?.feedback || []}
      onApplyFix={(feedbackId) => {
        // Apply auto-fix
      }}
    />
  );
}

// ExpertFeedbackPanel integration (BEHÅLL)
import { ExpertFeedbackPanel } from '@/components/ExpertFeedbackPanel';

function FeedbackView({ analysis }: { analysis: ExpertAnalysis }) {
  return (
    <ExpertFeedbackPanel
      feedback={analysis.feedback}
      onApplyFix={(feedbackId) => {
        // Apply fix
      }}
      onDismiss={(feedbackId) => {
        // Dismiss feedback
      }}
    />
  );
}

// OneClickFix hook (BEHÅLL)
import { useOneClickFix } from '@/hooks/use-one-click-fix';

function Editor() {
  const { applyFix, isApplying } = useOneClickFix();
  
  const handleFix = async (feedbackItem: FeedbackItem) => {
    if (feedbackItem.autoFix) {
      await applyFix(feedbackItem.id, feedbackItem.autoFix);
    }
  };
  
  return <button onClick={() => handleFix(item)}>Fixa</button>;
}
```


## Felhantering

### Fel-scenario 1: OpenAI API Timeout

**Villkor**: OpenAI API svarar inte inom 30s

**Respons**: 
- Retry med exponential backoff (max 2 retries)
- Logga till Sentry med context
- Emittera progress event om retry

**Återhämtning**:
- Om alla retries misslyckas: kasta error till client
- Client visar användarvänligt felmeddelande
- Användare kan försöka igen

```typescript
try {
  const result = await pRetry(
    () => openai.chat.completions.create(...),
    {
      retries: 2,
      minTimeout: 1000,
      maxTimeout: 4000,
      onFailedAttempt: (error) => {
        Sentry.captureMessage('OpenAI retry', {
          level: 'warning',
          extra: { attempt: error.attemptNumber }
        });
      }
    }
  );
} catch (error) {
  Sentry.captureException(error);
  throw new Error('AI-tjänsten svarar inte. Försök igen om en stund.');
}
```

### Fel-scenario 2: Ofullständig Generering

**Villkor**: OpenAI returnerar JSON utan alla fält

**Respons**:
- Validera response omedelbart
- Kasta error om fält saknas
- Trigger retry-logik

**Återhämtning**:
- Retry genererar ofta kompletta fält
- Om persistent: logga till Sentry för analys
- Användare får felmeddelande

```typescript
const result = JSON.parse(response.choices[0].message.content);

if (!result.improvedPrompt || !result.headline || !result.socialCopy ||
    !result.instagramCaption || !result.showingInvitation || !result.shortAd) {
  throw new Error('Incomplete generation: missing required fields');
}
```


### Fel-scenario 3: Post-Processing Failure

**Villkor**: Post-processor kastar error

**Respons**:
- Graceful degradation: fortsätt med obearbetad text
- Logga warning till Sentry
- Markera i metrics att post-processing hoppades över

**Återhämtning**:
- Användare får fortfarande resultat
- Kvalitet kan vara något lägre
- System fortsätter fungera

```typescript
try {
  postProcessResult = await postProcessor.process(request);
} catch (error) {
  console.error('Post-processing failed, continuing with unprocessed text');
  Sentry.captureException(error, { level: 'warning' });
  
  postProcessResult = {
    ...generationResult,
    transformations: [],
    duration: 0
  };
}
```

### Fel-scenario 4: Expert Analysis Failure

**Villkor**: Expert analyzer kastar error

**Respons**:
- Graceful degradation: fortsätt utan analys
- Logga warning till Sentry
- Returnera result utan expertAnalysis

**Återhämtning**:
- Användare får text men ingen feedback
- InlineHighlights och ExpertFeedbackPanel visar inget
- Kärnfunktionalitet (textgenerering) fungerar

```typescript
try {
  expertAnalysis = await expertAnalyzer.analyze(request);
} catch (error) {
  console.error('Expert analysis failed, continuing without analysis');
  Sentry.captureException(error, { level: 'warning' });
  expertAnalysis = undefined;
}
```


## Teststrategi

### Unit Testing

**Komponenter att testa**:
- SmartGenerationEngine: Mock OpenAI responses
- DeterministicPostProcessor: Test transformations
- ExpertAIAnalyzer: Mock analysis responses
- Validation functions: Test edge cases
- Token budget calculation: Test all scenarios

**Exempel**:
```typescript
describe('SmartGenerationEngine', () => {
  it('should generate all required fields', async () => {
    const mockResponse = {
      improvedPrompt: 'Test text...',
      headline: 'Test headline',
      socialCopy: 'Test social',
      instagramCaption: 'Test instagram',
      showingInvitation: 'Test invitation',
      shortAd: 'Test ad'
    };
    
    mockOpenAI.mockResolvedValue(mockResponse);
    
    const result = await generator.generate(request);
    
    expect(result).toHaveProperty('improvedPrompt');
    expect(result).toHaveProperty('headline');
    expect(result).toHaveProperty('socialCopy');
    expect(result).toHaveProperty('instagramCaption');
    expect(result).toHaveProperty('showingInvitation');
    expect(result).toHaveProperty('shortAd');
  });
  
  it('should throw error if fields are missing', async () => {
    mockOpenAI.mockResolvedValue({ improvedPrompt: 'Test' });
    
    await expect(generator.generate(request)).rejects.toThrow(
      'Incomplete generation'
    );
  });
});
```

### Integration Testing

**Scenarier att testa**:
- Komplett pipeline execution (end-to-end)
- Retry-logik vid failures
- Graceful degradation vid post-processing/analysis failures
- WebSocket progress events
- Database metrics logging

**Exempel**:
```typescript
describe('Pipeline Integration', () => {
  it('should complete full pipeline in <20s', async () => {
    const startTime = Date.now();
    
    const result = await orchestrator.execute(request);
    
    const duration = Date.now() - startTime;
    
    expect(result.metrics.success).toBe(true);
    expect(duration).toBeLessThan(20000);
    expect(result.improvedPrompt).toBeTruthy();
    expect(result.expertAnalysis).toBeDefined();
  });
});
```


### Property-Based Testing

**Test Library**: fast-check (JavaScript/TypeScript)

**Properties att testa**:

**Property 1: Token Budget Monotonicity**
```typescript
import fc from 'fast-check';

test('token budget increases with target word count', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 250, max: 800 }),
      fc.integer({ min: 250, max: 800 }),
      (wordCount1, wordCount2) => {
        const budget1 = computeTokenBudget(wordCount1);
        const budget2 = computeTokenBudget(wordCount2);
        
        if (wordCount1 < wordCount2) {
          return budget1 <= budget2;
        }
        return true;
      }
    )
  );
});
```

**Property 2: Validation Idempotence**
```typescript
test('validation is idempotent', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 100, maxLength: 1000 }),
      (text) => {
        const result1 = validateText(text, 'balanced');
        const result2 = validateText(text, 'balanced');
        
        return JSON.stringify(result1) === JSON.stringify(result2);
      }
    )
  );
});
```

**Property 3: Post-Processing Preserves Length**
```typescript
test('post-processing does not drastically change length', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 500, maxLength: 2000 }),
      async (text) => {
        const request = { improvedPrompt: text, /* ... */ };
        const result = await postProcessor.process(request);
        
        const originalLength = text.length;
        const processedLength = result.improvedPrompt.length;
        
        // Length should not change by more than 20%
        return Math.abs(processedLength - originalLength) / originalLength < 0.2;
      }
    )
  );
});
```


### Regression Testing

**Befintliga tester att köra**:
- `npm run test:regression` - Kör alla regression tests
- `npm run test:canary` - Kör canary quality tests

**Nya regression tests**:
```typescript
describe('Cleanup Regression Tests', () => {
  it('should not use old pipeline components', async () => {
    const result = await orchestrator.execute(request);
    
    // Verifiera att gamla komponenter inte används
    expect(result).not.toHaveProperty('variant');
    expect(result).not.toHaveProperty('fallbackUsed');
  });
  
  it('should always generate aux fields', async () => {
    const result = await orchestrator.execute(request);
    
    expect(result.headline).toBeTruthy();
    expect(result.socialCopy).toBeTruthy();
    expect(result.instagramCaption).toBeTruthy();
    expect(result.showingInvitation).toBeTruthy();
    expect(result.shortAd).toBeTruthy();
  });
  
  it('should complete in <20s for 95% of requests', async () => {
    const durations: number[] = [];
    
    for (let i = 0; i < 20; i++) {
      const startTime = Date.now();
      await orchestrator.execute(request);
      durations.push(Date.now() - startTime);
    }
    
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)];
    
    expect(p95).toBeLessThan(20000);
  });
});
```


## Prestandaöverväganden

### Målsättningar

- **Generation time**: <20s för 95% av requests (ner från nuvarande ~63s)
- **Success rate**: 98%+ (upp från nuvarande ~95%)
- **CPU usage**: <70% average
- **Memory usage**: <80% average
- **Zero spelling errors**: 100% korrekt stavning
- **Zero copyiga formuleringar**: Inga AI-klyschor

### Optimeringar

**1. Token Budget Optimization**
```typescript
// Före: 4800-7000 tokens (för lågt)
// Efter: 5500-8000 tokens (optimalt)

function computeTokenBudget(targetWordMax: number): number {
  const safeWordMax = clamp(targetWordMax, 250, 800);
  const mainTextTokens = Math.round(safeWordMax * 2.4);
  const auxTokens = 1200;
  
  return clamp(
    mainTextTokens + auxTokens,
    5500,  // Floor: +700 tokens
    8000   // Ceiling: +1000 tokens
  );
}
```

**Förväntad effekt**:
- -90% token trunkering
- +15% kvalitet
- -30% retry rate

**2. MinimalFields Threshold**
```typescript
// Före: 26000 chars (för lågt)
// Efter: 30000 chars (optimalt)

const useMinimalFields = totalPromptSize > 30000;
```

**Förväntad effekt**:
- +20% aux-fält täckning
- Bättre kvalitet för längre texter
- Färre incomplete generations


**3. Validation Optimization**
```typescript
// Före: 50+ förbjudna fraser, strikta gränser
// Efter: ~20 förbjudna fraser, context-aware gränser

// Reducerad lista fokuserad på verkliga AI-klyschor
const FORBIDDEN_PHRASES = [
  "välkommen till", "erbjuder", "bjuder på", "präglas av",
  "för den som", "vilket gör", "skapar en känsla av",
  "i hjärtat av", "missa inte"
  // ... totalt ~20 fraser
];

// Context-aware validering
if (detFinnsCount > 3 && wordCount < 300) {
  violations.push(...);
}
```

**Förväntad effekt**:
- -60% false positives
- Mer naturlig mäklarprosa
- Färre onödiga retries

**4. Redis Caching**
```typescript
// Cacha disposition parsing och validation results
const cacheKey = `disposition:${hash(disposition)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const parsed = parseDisposition(disposition);
await redis.setex(cacheKey, 3600, JSON.stringify(parsed));
```

**Förväntad effekt**:
- -20% processing time för upprepade requests
- Mindre CPU-användning
- Bättre skalbarhet

**5. Parallel Processing (Framtida)**
```typescript
// Kör post-processing och expert analysis parallellt
const [postProcessResult, expertAnalysis] = await Promise.all([
  postProcessor.process(generationResult),
  expertAnalyzer.analyze(generationResult)
]);
```

**Förväntad effekt**:
- -30% total pipeline time
- <15s generation time
- Bättre resource utilization


## Säkerhetsöverväganden

### Dataskydd

**Input Validation**:
- Validera alla user inputs med Zod schemas
- Sanitera disposition data innan AI-anrop
- Begränsa prompt size till max 50000 chars
- Rate limiting: max 10 requests/minut per användare

```typescript
const dispositionSchema = z.object({
  property: z.object({
    type: z.string().max(50),
    size: z.number().min(10).max(1000),
    rooms: z.number().min(1).max(20),
    address: z.string().max(200)
  }),
  location: z.object({
    area: z.string().max(100),
    transport: z.string().max(200),
    amenities: z.array(z.string().max(100)).max(20)
  })
});

// Validera innan processing
const validated = dispositionSchema.parse(request.disposition);
```

**Output Sanitization**:
- Sanitera AI-genererad text innan lagring
- Ta bort potentiellt skadlig HTML/JavaScript
- Validera att output är valid UTF-8
- Logga alla outputs för audit trail

**API Security**:
- Kräv authentication för alla endpoints
- Använd HTTPS för all kommunikation
- Implementera CORS policies
- Rate limiting på API-nivå

### PII Hantering

**Personuppgifter i disposition**:
- Anonymisera adresser i logs
- Kryptera känslig data i databas
- GDPR-compliant data retention (30 dagar)
- Möjlighet att radera all användardata

```typescript
// Anonymisera för logging
function anonymizeForLogging(disposition: any): any {
  return {
    ...disposition,
    property: {
      ...disposition.property,
      address: '[REDACTED]'
    }
  };
}

Sentry.captureMessage('Pipeline execution', {
  extra: {
    disposition: anonymizeForLogging(request.disposition)
  }
});
```


### OpenAI API Security

**API Key Management**:
- Lagra API keys i environment variables
- Rotera keys regelbundet
- Använd separata keys för dev/staging/prod
- Monitora API usage för anomalier

**Request Security**:
- Begränsa max_tokens för att förhindra abuse
- Timeout på 30s för alla AI-anrop
- Logga alla API-anrop för audit
- Implementera cost tracking

```typescript
// Cost tracking
async function trackOpenAICost(
  tokens: number,
  model: string,
  userId: string
): Promise<void> {
  const costPerToken = model === 'gpt-5.2' ? 0.00003 : 0.00001;
  const cost = tokens * costPerToken;
  
  await db.insert(apiCosts).values({
    userId,
    model,
    tokens,
    cost,
    timestamp: new Date()
  });
}
```

## Beroenden

### Backend Dependencies (BEHÅLL)

**Core**:
- express: ^4.18.0 - Web framework
- typescript: ^5.0.0 - Type safety
- drizzle-orm: ^0.29.0 - Database ORM
- pg: ^8.11.0 - PostgreSQL client
- redis: ^4.6.0 - Caching

**AI & Processing**:
- openai: ^4.20.0 - OpenAI API client
- p-retry: ^6.0.0 - Retry logic
- p-limit: ^5.0.0 - Concurrency control

**Monitoring & Security**:
- @sentry/node: ^7.80.0 - Error tracking
- helmet: ^7.1.0 - Security headers
- cors: ^2.8.5 - CORS handling
- express-rate-limit: ^7.1.0 - Rate limiting

**Validation**:
- zod: ^3.22.0 - Schema validation

### Frontend Dependencies (BEHÅLL)

**Core**:
- react: ^18.2.0 - UI framework
- typescript: ^5.0.0 - Type safety
- vite: ^7.0.0 - Build tool
- wouter: ^3.0.0 - Routing

**State & Data**:
- @tanstack/react-query: ^5.0.0 - Server state
- react-hook-form: ^7.48.0 - Form handling

**UI Components**:
- @radix-ui/*: ^1.0.0 - Primitives
- tailwindcss: ^3.4.0 - Styling
- framer-motion: ^10.16.0 - Animation
- lucide-react: ^0.294.0 - Icons


### Dependencies att TA BORT

Inga externa dependencies behöver tas bort. Cleanup fokuserar på att ta bort intern kod och filer.

## Detaljerad Cleanup-plan

### Filer att TA BORT

**Backend - Gamla Pipeline (server/lib/)**:
```
server/lib/listing-orchestrator.ts                    # 7-stegs pipeline
server/lib/listing-agent-iteration.ts                 # Agent iteration logic
server/lib/listing-loop-coordinator.ts                # Loop coordination
server/lib/listing-decision-engine.ts                 # Decision making
server/lib/listing-quality-guards.ts                  # Quality gates
server/lib/listing-refinement-coordinator.ts          # Refinement logic
server/lib/listing-final-audit-subflow.ts            # Final audit
server/lib/listing-broker-realism-scorecard.ts       # Realism scoring
server/lib/listing-pipeline-observability.ts         # Old observability
server/lib/perfect-swedish-ab-test.ts                # A/B test manager
```

**Backend - Tester för gamla systemet (server/tests/)**:
```
server/tests/listing-orchestrator.test.ts
server/tests/listing-decision-engine.test.ts
server/tests/forbidden-phrases-integration.test.ts   # Delvis - uppdatera
```

**Frontend - Exempel-komponenter (client/src/components/)**:
```
client/src/components/EditingToolsExample.tsx        # Bara exempel
```

**Dokumentation - Gamla planer (root)**:
```
ACTION_PLAN.md
AI_FIRST_REDESIGN.md
DEEP_THINKING_PROMPT_STRATEGY.md
FINAL_COMPLETE_FIX.md
FINAL_DEEP_ANALYSIS.md
FINAL_FIX_COMPLETE.md
FINAL_IMPLEMENTATION_PLAN.md
FULLSTÄNDIG_ANALYS.md
OPTIMIZATION_COMPLETE.md
OPTIMIZATION_STATUS.md
PIPELINE_OPTIMIZATION_PLAN.md
PRODUCTION_ANALYSIS.md
REAL_SOLUTION.md
```

**Dokumentation - Spec-dokument (behåll bara operationella)**:
```
.kiro/specs/perfect-swedish-pipeline/TASK_*_COMPLETION_SUMMARY.md
.kiro/specs/perfect-swedish-pipeline/TASKS_*_IMPLEMENTATION.md
.kiro/specs/perfect-swedish-pipeline/IMPLEMENTATION_COMPLETE.md
.kiro/specs/perfect-swedish-pipeline/ROUTES_INTEGRATION_TODO.md
```

**BEHÅLL dessa operationella dokument**:
```
.kiro/specs/perfect-swedish-pipeline/DEPLOYMENT_GUIDE.md
.kiro/specs/perfect-swedish-pipeline/OPERATIONS_RUNBOOK.md
.kiro/specs/perfect-swedish-pipeline/TROUBLESHOOTING_GUIDE.md
.kiro/specs/perfect-swedish-pipeline/ROLLBACK_PLAN.md
.kiro/specs/perfect-swedish-pipeline/MONITORING_SETUP.md
.kiro/specs/perfect-swedish-pipeline/LOAD_TESTING_QUICK_START.md
.kiro/specs/perfect-swedish-pipeline/PERFORMANCE_CHARACTERISTICS.md
```


### Kod att MODIFIERA

**server/routes.ts** (6795 rader):
```typescript
// TA BORT:
// - Import av listing-orchestrator
// - Import av listing-decision-engine
// - Import av listing-loop-coordinator
// - Import av listing-final-audit-subflow
// - Import av listing-refinement-coordinator
// - Alla referenser till gamla pipelinen
// - A/B-test logik
// - Fallback till gamla systemet

// BEHÅLL:
// - Import av perfect-swedish-orchestrator
// - Import av perfect-swedish-generator
// - Import av perfect-swedish-post-processor
// - Import av perfect-swedish-analyzer
// - Alla andra routes (auth, stripe, teams, etc.)

// ÄNDRA:
// - Token budget: 4800→5500, 7000→8000
// - MinimalFields threshold: 26000→30000
// - Ta bort forceVariant parameter
// - Förenkla response (ingen variant/fallbackUsed)
```

**server/lib/text-validation.ts**:
```typescript
// ÄNDRA:
// - Höj gränser för "det finns": 2→3
// - Höj gränser för "den har": 3→4
// - Höj gränser för "ligger": 2→3
// - Höj gränser för "vilket": 2→3
// - Lägg till context-awareness (wordCount check)
// - Monoton meningsstart: 4→5, 8→10
// - Lägg till fler exempt words
```

**server/lib/text-rules.ts**:
```typescript
// ÄNDRA FORBIDDEN_PHRASES:
// TA BORT dessa legitima mäklarord:
const REMOVE = [
  "kommunikationer",
  "närhet till service",
  "smidig pendling",
  "i mycket gott skick",
  "gott om utrymme",
  "ligger centralt i",
  "natur och stadsliv",
  "det finns även",
  "det finns också"
];

// BEHÅLL bara rena AI-klyschor:
const KEEP = [
  "välkommen till",
  "erbjuder",
  "bjuder på",
  "präglas av",
  "för den som",
  "vilket gör",
  "skapar en känsla av",
  "i hjärtat av",
  "missa inte"
];
```


**server/lib/perfect-swedish-orchestrator.ts**:
```typescript
// TA BORT:
// - fallbackToOldPipeline() method
// - forceVariant parameter
// - variant tracking
// - fallbackUsed flag

// ÄNDRA:
// - Förenkla PipelineRequest interface
// - Förenkla PipelineResult interface
// - Ta bort A/B-test logik
// - Förbättra error messages
```

**server/lib/perfect-swedish-post-processor.ts**:
```typescript
// LÄGG TILL:
// - Restaurangnamn-validering
// - Narrativ integritet check
// - Saknade fakta detection (energiklass, värmesystem)
// - Bättre error handling
```

**server/db.ts**:
```typescript
// LÄGG TILL migration för att:
// - DROP TABLE ab_test_assignments
// - DROP TABLE pipeline_metrics_v2
// - DROP TABLE user_feedback
// - DROP TABLE expert_feedback_items
// - DROP TABLE experiment_assignments
// - DROP TABLE experiment_results
// - ALTER TABLE pipeline_generations (ta bort variant, fallback_used)
```

**Frontend - Ingen ändring behövs**:
- InlineHighlights.tsx - BEHÅLL
- ExpertFeedbackPanel.tsx - BEHÅLL
- use-one-click-fix.ts - BEHÅLL
- Alla andra komponenter - BEHÅLL

### Environment Variables

**TA BORT**:
```bash
PERFECT_SWEDISH_PIPELINE_ENABLED=true  # Inte längre nödvändig
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=50 # Inte längre nödvändig
```

**BEHÅLL alla andra**:
```bash
DATABASE_URL=...
OPENAI_API_KEY=...
REDIS_URL=...
SENTRY_DSN=...
# ... etc
```


## Implementation Roadmap

### Fas 1: Preparation (1 dag)

**Mål**: Säkerhetskopiera och dokumentera nuvarande system

**Aktiviteter**:
1. Skapa full backup av databas
2. Tagga nuvarande version i git: `v1.0-pre-cleanup`
3. Dokumentera alla aktiva feature flags
4. Exportera A/B-test metrics för analys
5. Verifiera att alla tester passerar

**Deliverables**:
- Database backup
- Git tag
- Metrics export
- Test report

### Fas 2: Backend Cleanup (2 dagar)

**Mål**: Ta bort gamla pipelinen och A/B-test infrastruktur

**Dag 1 - Kod cleanup**:
1. Ta bort gamla pipeline-filer (10 filer)
2. Ta bort A/B-test manager
3. Uppdatera routes.ts (ta bort imports och referenser)
4. Uppdatera perfect-swedish-orchestrator.ts
5. Kör tester och fixa breaking changes

**Dag 2 - Optimeringar**:
1. Höj token budget (5500-8000)
2. Höj minimalFields threshold (30000)
3. Optimera text-validation.ts
4. Optimera text-rules.ts (reducera FORBIDDEN_PHRASES)
5. Förbättra perfect-swedish-post-processor.ts
6. Kör regression tests

**Deliverables**:
- Rengjord kodbas
- Optimerade komponenter
- Alla tester gröna


### Fas 3: Database Migration (1 dag)

**Mål**: Förenkla databas-schema

**Aktiviteter**:
1. Skapa migration script
2. Testa migration på staging
3. Exportera data från tabeller som ska tas bort
4. Kör migration på production
5. Verifiera data integrity

**Migration Script**:
```sql
-- Backup data först
CREATE TABLE ab_test_assignments_backup AS SELECT * FROM ab_test_assignments;
CREATE TABLE pipeline_metrics_v2_backup AS SELECT * FROM pipeline_metrics_v2;

-- Ta bort A/B-test tabeller
DROP TABLE IF EXISTS ab_test_assignments CASCADE;
DROP TABLE IF EXISTS pipeline_metrics_v2 CASCADE;
DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS expert_feedback_items CASCADE;
DROP TABLE IF EXISTS experiment_assignments CASCADE;
DROP TABLE IF EXISTS experiment_results CASCADE;

-- Förenkla pipeline_generations
ALTER TABLE pipeline_generations DROP COLUMN IF EXISTS variant;
ALTER TABLE pipeline_generations DROP COLUMN IF EXISTS fallback_used;

-- Verifiera
SELECT COUNT(*) FROM pipeline_generations;
```

**Deliverables**:
- Migration script
- Data backup
- Förenklat schema
- Verification report

### Fas 4: Documentation Cleanup (0.5 dag)

**Mål**: Ta bort gamla dokument, behåll operationella

**Aktiviteter**:
1. Ta bort gamla planerings-dokument (13 filer)
2. Ta bort gamla task completion summaries
3. Uppdatera README.md
4. Uppdatera DEPLOYMENT_GUIDE.md
5. Skapa CLEANUP_CHANGELOG.md

**Deliverables**:
- Rengjord dokumentation
- Uppdaterad README
- Changelog


### Fas 5: Testing & Validation (1 dag)

**Mål**: Verifiera att allt fungerar korrekt

**Aktiviteter**:
1. Kör full testsvit
2. Kör regression tests
3. Kör canary quality tests
4. Load testing (k6)
5. Manual testing av kritiska flöden
6. Performance benchmarking

**Test Scenarios**:
```typescript
// 1. Basic generation
test('should generate complete text in <20s', async () => {
  const result = await orchestrator.execute(request);
  expect(result.metrics.totalDuration).toBeLessThan(20000);
  expect(result.improvedPrompt).toBeTruthy();
  expect(result.headline).toBeTruthy();
});

// 2. All aux fields present
test('should generate all aux fields', async () => {
  const result = await orchestrator.execute(request);
  expect(result.socialCopy).toBeTruthy();
  expect(result.instagramCaption).toBeTruthy();
  expect(result.showingInvitation).toBeTruthy();
  expect(result.shortAd).toBeTruthy();
});

// 3. No old pipeline references
test('should not use old pipeline', async () => {
  const result = await orchestrator.execute(request);
  expect(result).not.toHaveProperty('variant');
  expect(result).not.toHaveProperty('fallbackUsed');
});

// 4. Validation improvements
test('should allow legitimate broker phrases', () => {
  const text = 'Bostaden har gott om utrymme och smidig pendling.';
  const result = validateText(text, 'balanced');
  expect(result.violations).toHaveLength(0);
});

// 5. Performance
test('95th percentile <20s', async () => {
  const durations = await runMultipleGenerations(20);
  const p95 = percentile(durations, 95);
  expect(p95).toBeLessThan(20000);
});
```

**Deliverables**:
- Test report
- Performance benchmarks
- Quality metrics
- Sign-off för production deploy


### Fas 6: Deployment (0.5 dag)

**Mål**: Deploya till production säkert

**Aktiviteter**:
1. Deploy till staging
2. Smoke tests på staging
3. Deploy till production (Render auto-deploy)
4. Monitora metrics i 2 timmar
5. Verifiera success rate och performance
6. Kommunicera till användare

**Deployment Checklist**:
- [ ] All tests passing
- [ ] Database migration tested
- [ ] Staging deployment successful
- [ ] Smoke tests passing
- [ ] Rollback plan ready
- [ ] Monitoring dashboards configured
- [ ] On-call engineer available
- [ ] Production deployment
- [ ] Post-deployment verification
- [ ] User communication sent

**Monitoring Metrics**:
```typescript
// Övervaka dessa metrics i 2 timmar efter deploy
const criticalMetrics = {
  successRate: '>98%',           // Måste vara över 98%
  avgDuration: '<20s',           // Måste vara under 20s
  p95Duration: '<25s',           // 95th percentile under 25s
  errorRate: '<2%',              // Fel under 2%
  auxFieldsCoverage: '100%',     // Alla aux-fält genererade
  cpuUsage: '<70%',              // CPU under 70%
  memoryUsage: '<80%'            // Minne under 80%
};
```

**Rollback Plan**:
```bash
# Om något går fel:
git revert HEAD
git push origin main
# Render auto-deployer föregående version

# Återställ databas om nödvändigt:
psql $DATABASE_URL < backup.sql
```

**Deliverables**:
- Production deployment
- Monitoring report
- User communication
- Post-mortem (om problem uppstår)


## Success Metrics

### Prestanda-mål

**Före cleanup**:
- Generation time: ~63s average
- Success rate: ~95%
- Aux fields coverage: ~70% (minimalFields mode)
- Token trunkering: ~10% av requests
- False positives: ~40% av validations

**Efter cleanup (målsättning)**:
- Generation time: <20s average (95th percentile)
- Success rate: >98%
- Aux fields coverage: 100%
- Token trunkering: <1% av requests
- False positives: <15% av validations

### Kvalitetsmål

**Före cleanup**:
- Spelling errors: ~0% (redan bra)
- AI clichés: ~5% av texter
- Broker realism: ~85% score
- User satisfaction: ~80%

**Efter cleanup (målsättning)**:
- Spelling errors: 0% (behåll)
- AI clichés: <2% av texter
- Broker realism: >90% score
- User satisfaction: >90%

### Tekniska mål

**Före cleanup**:
- Code files: 38 lib files + monolithic routes
- Documentation files: 30+ (många obsoleta)
- Database tables: 12 (många oanvända)
- Test coverage: ~75%

**Efter cleanup (målsättning)**:
- Code files: 28 lib files (10 borttagna)
- Documentation files: 15 (operationella)
- Database tables: 6 (6 borttagna)
- Test coverage: >80%

### Business Metrics

**Målsättning**:
- User retention: +10%
- Regeneration rate: -30%
- Support tickets: -40%
- NPS score: +15 points
- Churn rate: -20%


## Risk Management

### Risk 1: Data Loss vid Migration

**Sannolikhet**: Låg  
**Impact**: Hög

**Mitigation**:
- Full database backup innan migration
- Testa migration på staging först
- Behåll backup-tabeller i 30 dagar
- Rollback plan redo

**Contingency**:
```sql
-- Om något går fel, återställ från backup
CREATE TABLE pipeline_generations AS 
  SELECT * FROM pipeline_generations_backup;
```

### Risk 2: Performance Regression

**Sannolikhet**: Medel  
**Impact**: Hög

**Mitigation**:
- Omfattande load testing innan deploy
- Gradvis rollout (canary deployment)
- Monitora metrics kontinuerligt
- Rollback plan redo

**Contingency**:
- Omedelbar rollback om p95 > 25s
- Omedelbar rollback om success rate < 95%
- Analysera logs och fixa root cause

### Risk 3: Breaking Changes för Användare

**Sannolikhet**: Låg  
**Impact**: Medel

**Mitigation**:
- API-kompatibilitet bibehålls
- Frontend behöver inga ändringar
- Testa alla kritiska user flows
- Kommunicera ändringar i förväg

**Contingency**:
- Support team förberedd
- Snabb hotfix-process
- Rollback om kritiska problem

### Risk 4: Ökade OpenAI Costs

**Sannolikhet**: Medel  
**Impact**: Medel

**Mitigation**:
- Höjd token budget är motiverad (mindre retries)
- Monitora costs dagligen
- Sätt budget alerts i OpenAI dashboard
- Optimera prompts kontinuerligt

**Contingency**:
- Justera token budget om costs ökar >20%
- Implementera mer aggressiv caching
- Överväg prompt compression


## Monitoring & Observability

### Key Metrics att Övervaka

**Performance Metrics**:
```typescript
// Sentry custom metrics
Sentry.metrics.distribution('pipeline.duration', duration, {
  tags: {
    style: request.style,
    platform: request.platform,
    plan: user.plan
  }
});

Sentry.metrics.increment('pipeline.success', {
  tags: { plan: user.plan }
});

Sentry.metrics.increment('pipeline.failure', {
  tags: { 
    plan: user.plan,
    error_type: error.name
  }
});
```

**Quality Metrics**:
```typescript
// Spara till databas för analys
await db.insert(qualityMetrics).values({
  generationId: result.id,
  wordCount: countWords(result.improvedPrompt),
  auxFieldsComplete: hasAllAuxFields(result),
  validationViolations: violations.length,
  expertScore: result.expertAnalysis?.overallQuality,
  timestamp: new Date()
});
```

**Business Metrics**:
```typescript
// Tracka user satisfaction
await db.insert(userSatisfaction).values({
  userId: request.userId,
  generationId: result.id,
  regenerated: false,
  editType: 'none',
  timestamp: new Date()
});
```

### Dashboards

**Grafana Dashboard - Pipeline Performance**:
- Average generation time (line chart)
- P50, P95, P99 latency (line chart)
- Success rate (gauge)
- Error rate by type (bar chart)
- Throughput (requests/minute)

**Grafana Dashboard - Quality**:
- Aux fields coverage (gauge)
- Validation violations (bar chart)
- Expert analysis scores (histogram)
- User satisfaction (line chart)
- Regeneration rate (line chart)

**Sentry Dashboard - Errors**:
- Error rate by type
- Error frequency over time
- Most common errors
- Error impact (affected users)


### Alerts

**Critical Alerts** (PagerDuty/Slack):
```typescript
// Success rate < 95%
if (successRate < 0.95) {
  alert('CRITICAL: Pipeline success rate below 95%');
}

// P95 latency > 30s
if (p95Latency > 30000) {
  alert('CRITICAL: P95 latency above 30s');
}

// Error rate > 5%
if (errorRate > 0.05) {
  alert('CRITICAL: Error rate above 5%');
}

// OpenAI API down
if (openaiErrors > 10 in 5min) {
  alert('CRITICAL: OpenAI API issues detected');
}
```

**Warning Alerts** (Slack):
```typescript
// Success rate < 98%
if (successRate < 0.98) {
  alert('WARNING: Pipeline success rate below target');
}

// P95 latency > 25s
if (p95Latency > 25000) {
  alert('WARNING: P95 latency above target');
}

// Aux fields coverage < 100%
if (auxFieldsCoverage < 1.0) {
  alert('WARNING: Aux fields not always generated');
}
```

## Framtida Förbättringar

### Kort sikt (1-3 månader)

**1. Parallel Processing**:
- Kör post-processing och expert analysis parallellt
- Förväntad förbättring: -30% total tid
- Komplexitet: Medel

**2. Prompt Caching**:
- Cacha statiska delar av system prompt
- Förväntad förbättring: -15% OpenAI costs
- Komplexitet: Låg

**3. Smart Retry Logic**:
- Intelligent retry baserat på error type
- Förväntad förbättring: +2% success rate
- Komplexitet: Låg

### Medellång sikt (3-6 månader)

**1. Routes Refactoring**:
- Dela upp monolitisk routes.ts i moduler
- Förbättrad maintainability
- Komplexitet: Hög

**2. Advanced Caching**:
- Cacha hela generationer för identiska inputs
- Förväntad förbättring: -50% för cache hits
- Komplexitet: Medel

**3. A/B Testing Framework (ny)**:
- Enklare framework för att testa nya features
- Inte för pipeline-val, utan för feature toggles
- Komplexitet: Medel

### Lång sikt (6-12 månader)

**1. Multi-Model Support**:
- Stöd för flera AI-modeller (GPT-5.2, Claude, etc.)
- Välj bästa modell per use case
- Komplexitet: Hög

**2. Real-time Collaboration**:
- Flera användare kan redigera samtidigt
- WebSocket-baserad sync
- Komplexitet: Hög

**3. Advanced Analytics**:
- ML-baserad quality prediction
- Personaliserade rekommendationer
- Komplexitet: Hög


## Slutsats

Ultimate Cleanup & Optimization är en omfattande modernisering av OptiPrompt som tar bort komplexitet och fokuserar på vad som faktiskt fungerar. Genom att eliminera det gamla 7-stegs systemet, A/B-test infrastrukturen och över-strikt validering får vi ett system som är:

**Enklare**:
- 10 färre kod-filer
- 15 färre dokumentations-filer
- 6 färre databas-tabeller
- Lättare att förstå och underhålla

**Snabbare**:
- <20s generation time (ner från ~63s)
- Färre retries och fallbacks
- Optimerad token budget
- Bättre resource utilization

**Bättre**:
- 98%+ success rate (upp från ~95%)
- 100% aux-fält täckning (upp från ~70%)
- Färre false positives i validering
- Mer naturlig mäklarprosa

**Mer pålitligt**:
- Ingen fallback till gamla systemet
- Tydligare error handling
- Bättre monitoring
- Enklare debugging

Projektet levererar på alla huvudmål:
1. ✅ Gamla systemet borttaget helt
2. ✅ Kod städad och förenklad
3. ✅ Prestanda optimerad (<20s, 98%+ success)
4. ✅ Kvalitet förbättrad (alla buggar fixade)
5. ✅ Deployment förenklad (lättare att förstå)

Med denna cleanup blir OptiPrompt det bästa verktyget för svenska mäklare - snabbt, pålitligt och enkelt att använda.

---

**Total implementation tid**: 5.5 dagar
**Risk level**: Medel (mitigerad med god planering)
**Expected ROI**: Hög (bättre kvalitet, nöjdare användare, lägre churn)
**Maintenance burden**: -60% (mycket enklare kodbas)

**Rekommendation**: Genomför projektet enligt plan. Fördelarna överväger riskerna kraftigt.
