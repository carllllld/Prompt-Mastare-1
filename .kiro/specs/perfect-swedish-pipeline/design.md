# Design Document: Perfect Swedish Pipeline

## Overview

The Perfect Swedish Pipeline is a complete redesign of OptiPrompt's text generation system, transforming the current 7-step architecture into an optimized 3-step pipeline. This redesign addresses critical quality and performance issues while introducing powerful editing tools that empower brokers to quickly achieve perfect texts.

### Current State Problems

- 70% success rate (30% of generations require regeneration)
- 65-second average generation time
- Inconsistent Swedish quality with spelling errors
- Complex 7-step pipeline with multiple failure points
- Limited broker control over improvements

### Target State Goals

- 95%+ success rate
- <25 seconds total generation time
- Zero spelling errors (100% correct Swedish)
- 95%+ grammatical correctness
- 90%+ broker realism (avoiding AI clichés)
- Intuitive editing tools with AI-assisted improvements

### Strategic Approach

The new pipeline combines three complementary strategies:

1. **Smart Generation**: Powerful AI with explicit focus on perfect Swedish
2. **Deterministic Post-Processing**: Reliable fixes for known issues
3. **Expert AI Analysis**: Professional feedback from AI broker + lawyer perspectives

This is complemented by frontend editing tools that make it easy for brokers to apply suggestions and improve specific text sections.


## Architecture

### High-Level Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                           │
│  { disposition, style, platform, personalStyle, ... }           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE ORCHESTRATOR                         │
│  - A/B test assignment (control vs treatment)                   │
│  - Feature flag check                                           │
│  - Session consistency                                          │
│  - Metrics initialization                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────┐            ┌─────────────────┐
│  OLD 7-STEP     │            │  NEW 3-STEP     │
│  PIPELINE       │            │  PIPELINE       │
│  (Control)      │            │  (Treatment)    │
└─────────────────┘            └────────┬────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
         ┌──────────────────┐ ┌─────────────────┐ ┌──────────────────┐
         │  STEP 1:         │ │  STEP 2:        │ │  STEP 3:         │
         │  SMART           │ │  DETERMINISTIC  │ │  EXPERT AI       │
         │  GENERATION      │ │  POST-PROCESSOR │ │  ANALYSIS        │
         │                  │ │                 │ │                  │
         │  GPT-5.2         │ │  Regex fixes    │ │  GPT-5.2         │
         │  reasoning:      │ │  Placeholder    │ │  reasoning:      │
         │  medium          │ │  removal        │ │  low             │
         │                  │ │  Formatting     │ │                  │
         │  15-18s          │ │  <1s            │ │  5-7s            │
         └────────┬─────────┘ └────────┬────────┘ └────────┬─────────┘
                  │                    │                    │
                  └────────────────────┴────────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  PIPELINE RESULT                     │
                    │  {                                   │
                    │    improvedPrompt: string,           │
                    │    headline: string,                 │
                    │    socialCopy: string,               │
                    │    expertAnalysis: {                 │
                    │      overallQuality: number,         │
                    │      strengths: string[],            │
                    │      improvements: Feedback[],       │
                    │      legalCheck: {...}               │
                    │    },                                │
                    │    metrics: {...}                    │
                    │  }                                   │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  FRONTEND EDITING TOOLS              │
                    │  - Inline Highlights                 │
                    │  - Expert Feedback Panel             │
                    │  - One-Click Fix                     │
                    │  - AI-Assisted Selection Edit        │
                    └──────────────────────────────────────┘
```

### System Components

#### Backend Components

1. **Pipeline Orchestrator** (`server/lib/perfect-swedish-orchestrator.ts`)
   - A/B test assignment and session management
   - Pipeline selection (old vs new)
   - Retry logic with exponential backoff
   - Fallback to old pipeline on failure
   - Metrics collection and logging

2. **Smart Generation Engine** (`server/lib/perfect-swedish-generator.ts`)
   - GPT-5.2 API integration with reasoning:medium
   - Optimized prompt engineering for perfect Swedish
   - Self-checking instructions for spelling/grammar
   - Concrete examples of correct/incorrect Swedish
   - Step-by-step generation process

3. **Deterministic Post-Processor** (`server/lib/perfect-swedish-post-processor.ts`)
   - Placeholder removal and replacement
   - Forbidden phrase detection and removal
   - Formatting fixes (punctuation, spacing, capitalization)
   - Swedish character normalization
   - Generalization and deduplication
   - Transformation logging

4. **Expert AI Analyzer** (`server/lib/perfect-swedish-analyzer.ts`)
   - GPT-5.2 API integration with reasoning:low
   - Dual perspective analysis (broker + lawyer)
   - Structured JSON feedback generation
   - Text span identification
   - Actionable suggestion generation
   - Quality scoring

5. **A/B Testing Infrastructure** (`server/lib/perfect-swedish-ab-test.ts`)
   - Feature flag management
   - Random assignment with session consistency
   - Metrics tracking per variant
   - Manual override support
   - Statistical analysis utilities

#### Frontend Components

1. **InlineHighlights Component** (`client/src/components/InlineHighlights.tsx`)
   - Text span highlighting with color coding
   - Tooltip display on hover
   - Fix button integration
   - Real-time update on text edits
   - Overlapping highlight support

2. **ExpertFeedbackPanel Component** (`client/src/components/ExpertFeedbackPanel.tsx`)
   - Feedback grouping by category
   - Category counts and filtering
   - Click-to-scroll navigation
   - Action button integration
   - Real-time feedback resolution

3. **OneClickFix Component** (`client/src/components/OneClickFix.tsx`)
   - Automatic fix application
   - Undo/redo support
   - Feedback item removal
   - Highlight synchronization
   - Error handling and user feedback

4. **AIAssistedSelectionEdit Component** (`client/src/components/AIAssistedSelectionEdit.tsx`)
   - Text selection detection
   - AI suggestion generation
   - Alternative preview display
   - Text replacement with undo
   - Context preservation

### Data Flow

#### Generation Request Flow

```
1. User submits disposition
   ↓
2. Orchestrator assigns A/B variant
   ↓
3. If treatment group:
   a. Smart Generation (15-18s)
      - Build optimized prompt
      - Call GPT-5.2 with reasoning:medium
      - Extract generated text
   b. Post-Processing (<1s)
      - Remove placeholders
      - Fix formatting
      - Remove forbidden phrases
      - Normalize characters
   c. Expert Analysis (5-7s)
      - Build analysis prompt
      - Call GPT-5.2 with reasoning:low
      - Parse structured feedback
   ↓
4. Return result with metrics
   ↓
5. Frontend renders with editing tools
```

#### Edit Request Flow

```
1. User interacts with editing tool
   ↓
2. Frontend determines action type:
   - One-click fix: Apply suggestion directly
   - AI-assisted edit: Call backend for suggestions
   ↓
3. If AI-assisted:
   a. Send selection + full text context
   b. Backend calls GPT-5.2 (3-5s)
   c. Return 2-3 alternatives
   ↓
4. User selects option
   ↓
5. Frontend applies change with undo support
   ↓
6. Highlights and feedback update in real-time
```

### Technology Stack Integration

#### Backend Technologies

- **Express.js**: REST API endpoints for pipeline execution
- **OpenAI GPT-5.2**: 
  - Smart Generation: `reasoning: "medium"` for quality
  - Expert Analysis: `reasoning: "low"` for speed
  - Selection Edit: `reasoning: "low"` for responsiveness
- **PostgreSQL**: Store generation history, A/B test assignments, metrics
- **Redis**: Cache prompt templates, session assignments
- **WebSocket (ws)**: Real-time progress updates during generation
- **Zod**: Schema validation for API requests/responses
- **p-retry**: Retry logic with exponential backoff

#### Frontend Technologies

- **React 18**: Component-based UI with hooks
- **TanStack Query**: Server state management and caching
- **Radix UI**: Accessible primitives for tooltips, popovers, dialogs
- **Tailwind CSS**: Styling with custom color coding for severity levels
- **Framer Motion**: Smooth animations for highlights and transitions
- **Wouter**: Client-side routing
- **Zod**: Type-safe form validation

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         RENDER                               │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Web Service     │         │  PostgreSQL      │         │
│  │  (Node.js)       │◄────────┤  Database        │         │
│  │                  │         │                  │         │
│  │  - Express API   │         │  - Generations   │         │
│  │  - WebSocket     │         │  - A/B Tests     │         │
│  │  - Static Files  │         │  - Metrics       │         │
│  └────────┬─────────┘         └──────────────────┘         │
│           │                                                  │
│           │                   ┌──────────────────┐         │
│           └───────────────────┤  Redis           │         │
│                               │  Cache           │         │
│                               │                  │         │
│                               │  - Prompts       │         │
│                               │  - Sessions      │         │
│                               └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
              ┌──────────────────┐
              │  OpenAI API      │
              │  GPT-5.2         │
              └──────────────────┘
```


## Components and Interfaces

### Backend Components

#### 1. Pipeline Orchestrator

**File**: `server/lib/perfect-swedish-orchestrator.ts`

**Responsibilities**:
- Coordinate the 3-step pipeline execution
- Manage A/B testing and feature flags
- Handle retries and fallbacks
- Collect and emit metrics
- Manage WebSocket progress updates

**Key Interfaces**:

```typescript
interface PipelineRequest {
  disposition: any;
  style: WritingStyle;
  platform: string;
  personalStylePrompt?: string;
  targetWordMin: number;
  targetWordMax: number;
  userId: number;
  sessionId: string;
  forceVariant?: 'control' | 'treatment';
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
  variant: 'control' | 'treatment';
  fallbackUsed: boolean;
}

interface PipelineMetrics {
  totalDuration: number;
  step1Duration?: number;
  step2Duration?: number;
  step3Duration?: number;
  retryCount: number;
  success: boolean;
  errorType?: string;
  timestamp: Date;
}
```

**Key Methods**:

```typescript
class PerfectSwedishOrchestrator {
  async execute(request: PipelineRequest): Promise<PipelineResult>;
  private assignVariant(userId: number, sessionId: string): 'control' | 'treatment';
  private executeNewPipeline(request: PipelineRequest): Promise<PipelineResult>;
  private executeOldPipeline(request: PipelineRequest): Promise<PipelineResult>;
  private handleRetry(error: Error, attempt: number): Promise<void>;
  private fallbackToOldPipeline(request: PipelineRequest): Promise<PipelineResult>;
  private emitProgress(step: string, progress: number): void;
  private collectMetrics(result: PipelineResult): void;
}
```

#### 2. Smart Generation Engine

**File**: `server/lib/perfect-swedish-generator.ts`

**Responsibilities**:
- Build optimized prompts for perfect Swedish
- Call OpenAI GPT-5.2 with reasoning:medium
- Extract and validate generated text
- Handle generation errors

**Key Interfaces**:

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
  tokensUsed: number;
}
```

**Prompt Strategy**:

The prompt is structured in multiple sections:

1. **System Role**: "Du är en erfaren svensk mäklare med 15 års erfarenhet..."
2. **Process Instructions**: Step-by-step generation process (analyze → plan → write → self-check)
3. **Swedish Language Rules**: Explicit rules for spelling, grammar, punctuation
4. **Examples**: Concrete examples of correct vs incorrect Swedish
5. **Self-Check Checklist**: Mandatory verification steps before completion
6. **Disposition Data**: Structured property information
7. **Output Format**: JSON structure specification

**Key Methods**:

```typescript
class SmartGenerationEngine {
  async generate(request: GenerationRequest): Promise<GenerationResult>;
  private buildPrompt(request: GenerationRequest): string;
  private buildSystemPrompt(): string;
  private buildSwedishRules(): string;
  private buildExamples(): string;
  private buildSelfCheckInstructions(): string;
  private callOpenAI(prompt: string): Promise<OpenAI.ChatCompletion>;
  private extractResult(completion: OpenAI.ChatCompletion): GenerationResult;
  private validateSwedishQuality(text: string): QualityMetrics;
}
```

#### 3. Deterministic Post-Processor

**File**: `server/lib/perfect-swedish-post-processor.ts`

**Responsibilities**:
- Remove and replace placeholders
- Apply formatting fixes
- Remove forbidden phrases
- Normalize Swedish characters
- Log all transformations

**Key Interfaces**:

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

interface PostProcessResult {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  transformations: Transformation[];
  duration: number;
}

interface Transformation {
  type: 'placeholder' | 'formatting' | 'forbidden_phrase' | 'normalization' | 'generalization';
  field: string;
  before: string;
  after: string;
  position?: { start: number; end: number };
}
```

**Key Methods**:

```typescript
class DeterministicPostProcessor {
  async process(request: PostProcessRequest): Promise<PostProcessResult>;
  private removePlaceholders(text: string): { text: string; transformations: Transformation[] };
  private applyFormatting(text: string): { text: string; transformations: Transformation[] };
  private removeForbiddenPhrases(text: string, style: WritingStyle): { text: string; transformations: Transformation[] };
  private normalizeSwedishCharacters(text: string): { text: string; transformations: Transformation[] };
  private generalizeAndDeduplicate(text: string): { text: string; transformations: Transformation[] };
  private logTransformations(transformations: Transformation[]): void;
}
```

**Transformation Rules**:

1. **Placeholder Removal**:
   - `[TID]`, `[KONTAKT]`, `[MÄKLARE]` → remove completely
   - `[ADRESS]` → replace with actual address if available

2. **Formatting Fixes**:
   - `"beroende Köket"` → `"beroende. Köket"` (add missing period)
   - `"Headline."` → `"Headline"` (remove period from headline)
   - Multiple spaces → single space
   - Incorrect capitalization after period

3. **Forbidden Phrase Removal**:
   - Use regex patterns from `FORBIDDEN_PHRASES`
   - Respect style exemptions (balanced, selling)
   - Log each removal

4. **Generalization**:
   - `"Restaurang X, Restaurang Y"` → `"restauranger"`
   - Deduplicate repeated generalizations

5. **Character Normalization**:
   - Ensure UTF-8 encoding for å, ä, ö
   - Fix common encoding issues

#### 4. Expert AI Analyzer

**File**: `server/lib/perfect-swedish-analyzer.ts`

**Responsibilities**:
- Analyze text from broker and lawyer perspectives
- Generate structured feedback with text spans
- Provide actionable improvement suggestions
- Score overall quality

**Key Interfaces**:

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
  overallQuality: number; // 0-10
  strengths: string[];
  improvements: FeedbackItem[];
  legalCheck: LegalCheck;
  duration: number;
}

interface FeedbackItem {
  id: string;
  issue: string;
  location: string; // Human-readable location
  textSpan?: { start: number; end: number; field: string };
  suggestion: string;
  category: 'grammar' | 'style' | 'legal' | 'broker_realism' | 'clarity';
  severity: 'critical' | 'important' | 'suggestion';
  expert: 'broker' | 'lawyer';
  actionable: boolean;
  autoFix?: string; // Exact replacement text if actionable
}

interface LegalCheck {
  compliant: boolean;
  notes: string;
  issues: string[];
}
```

**Key Methods**:

```typescript
class ExpertAIAnalyzer {
  async analyze(request: AnalysisRequest): Promise<ExpertAnalysis>;
  private buildAnalysisPrompt(request: AnalysisRequest): string;
  private callOpenAI(prompt: string): Promise<OpenAI.ChatCompletion>;
  private parseAnalysisResult(completion: OpenAI.ChatCompletion): ExpertAnalysis;
  private identifyTextSpans(text: string, feedback: FeedbackItem[]): FeedbackItem[];
  private generateAutoFixes(feedback: FeedbackItem[]): FeedbackItem[];
  private validateAnalysisStructure(analysis: ExpertAnalysis): void;
}
```

**Analysis Prompt Strategy**:

The analysis prompt includes:

1. **Expert Role**: "Du är en senior svensk mäklare OCH jurist med 20 års erfarenhet..."
2. **Analysis Process**: Step-by-step analysis (read → identify strengths → identify improvements → legal check)
3. **Feedback Guidelines**: Concrete, specific, actionable feedback
4. **Output Format**: Strict JSON schema with examples
5. **Quality Criteria**: What makes good vs bad broker text

#### 5. A/B Testing Infrastructure

**File**: `server/lib/perfect-swedish-ab-test.ts`

**Responsibilities**:
- Manage feature flags
- Assign users to variants
- Ensure session consistency
- Track metrics per variant
- Support manual overrides

**Key Interfaces**:

```typescript
interface ABTestConfig {
  enabled: boolean;
  treatmentPercentage: number; // 0-100
  sessionConsistency: boolean;
  allowManualOverride: boolean;
}

interface ABTestAssignment {
  userId: number;
  sessionId: string;
  variant: 'control' | 'treatment';
  assignedAt: Date;
  manualOverride: boolean;
}

interface ABTestMetrics {
  variant: 'control' | 'treatment';
  successRate: number;
  avgGenerationTime: number;
  avgUserSatisfaction: number;
  regenerationRate: number;
  sampleSize: number;
}
```

**Key Methods**:

```typescript
class ABTestManager {
  async assignVariant(userId: number, sessionId: string, forceVariant?: string): Promise<'control' | 'treatment'>;
  async getAssignment(userId: number, sessionId: string): Promise<ABTestAssignment | null>;
  async trackMetric(variant: string, metric: string, value: number): Promise<void>;
  async getMetrics(variant: string): Promise<ABTestMetrics>;
  async isEnabled(): Promise<boolean>;
  private hashAssignment(userId: number, sessionId: string): number;
  private shouldAssignTreatment(hash: number): boolean;
}
```

### Frontend Components

#### 1. InlineHighlights Component

**File**: `client/src/components/InlineHighlights.tsx`

**Responsibilities**:
- Render text with highlighted spans
- Show tooltips on hover
- Handle overlapping highlights
- Update on text edits

**Props Interface**:

```typescript
interface InlineHighlightsProps {
  text: string;
  feedback: FeedbackItem[];
  onFixClick: (feedbackId: string) => void;
  onTextChange: (newText: string) => void;
}
```

**Key Features**:
- Color coding: red (critical), yellow (important), blue (suggestion)
- Tooltip with feedback details and fix button
- Support for multiple overlapping highlights
- Real-time synchronization with text edits

#### 2. ExpertFeedbackPanel Component

**File**: `client/src/components/ExpertFeedbackPanel.tsx`

**Responsibilities**:
- Display all feedback grouped by category
- Show category counts
- Navigate to text spans on click
- Provide action buttons

**Props Interface**:

```typescript
interface ExpertFeedbackPanelProps {
  analysis: ExpertAnalysis;
  onFeedbackClick: (feedbackId: string) => void;
  onFixClick: (feedbackId: string) => void;
  onAISuggestClick: (feedbackId: string) => void;
  onDismissClick: (feedbackId: string) => void;
}
```

**Key Features**:
- Grouped by category with counts
- Filterable by severity
- Click to scroll and highlight
- Action buttons per feedback item

#### 3. OneClickFix Component

**File**: `client/src/components/OneClickFix.tsx`

**Responsibilities**:
- Apply automatic fixes
- Support undo/redo
- Update highlights and feedback
- Handle errors gracefully

**Props Interface**:

```typescript
interface OneClickFixProps {
  feedbackId: string;
  autoFix: string;
  textSpan: { start: number; end: number; field: string };
  onApply: (feedbackId: string, newText: string) => void;
  onError: (error: string) => void;
}
```

**Key Features**:
- Instant application with preview
- Undo/redo stack management
- Feedback item removal on success
- Error handling with user feedback

#### 4. AIAssistedSelectionEdit Component

**File**: `client/src/components/AIAssistedSelectionEdit.tsx`

**Responsibilities**:
- Detect text selection
- Request AI suggestions
- Display alternatives
- Apply selected suggestion

**Props Interface**:

```typescript
interface AIAssistedSelectionEditProps {
  fullText: string;
  onSuggestionApply: (original: string, replacement: string) => void;
}

interface SelectionEditRequest {
  selectedText: string;
  fullContext: string;
  style: WritingStyle;
  platform: string;
}

interface SelectionEditResponse {
  suggestions: string[];
  duration: number;
}
```

**Key Features**:
- Selection detection with "Improve with AI" button
- Loading state during API call
- Preview of 2-3 alternatives
- Undo support after application


## Data Models

### Database Schema

#### 1. Pipeline Generations Table

Stores all generation attempts with metrics and variant information.

```sql
CREATE TABLE pipeline_generations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('control', 'treatment')),
  
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
  
  -- Metrics
  total_duration INTEGER, -- milliseconds
  step1_duration INTEGER,
  step2_duration INTEGER,
  step3_duration INTEGER,
  retry_count INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL,
  error_type TEXT,
  fallback_used BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_pipeline_generations_user_id (user_id),
  INDEX idx_pipeline_generations_variant (variant),
  INDEX idx_pipeline_generations_created_at (created_at),
  INDEX idx_pipeline_generations_success (success)
);
```

#### 2. AB Test Assignments Table

Tracks user assignments to A/B test variants with session consistency.

```sql
CREATE TABLE ab_test_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('control', 'treatment')),
  manual_override BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one assignment per user-session
  UNIQUE (user_id, session_id),
  
  -- Indexes
  INDEX idx_ab_test_assignments_user_id (user_id),
  INDEX idx_ab_test_assignments_session_id (session_id)
);
```

#### 3. Pipeline Metrics Table

Aggregated metrics per variant for monitoring and analysis.

```sql
CREATE TABLE pipeline_metrics (
  id SERIAL PRIMARY KEY,
  variant TEXT NOT NULL CHECK (variant IN ('control', 'treatment')),
  metric_date DATE NOT NULL,
  
  -- Success metrics
  total_generations INTEGER NOT NULL DEFAULT 0,
  successful_generations INTEGER NOT NULL DEFAULT 0,
  failed_generations INTEGER NOT NULL DEFAULT 0,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  
  -- Performance metrics
  avg_total_duration FLOAT,
  p50_total_duration FLOAT,
  p95_total_duration FLOAT,
  p99_total_duration FLOAT,
  
  -- Quality metrics
  avg_user_satisfaction FLOAT,
  regeneration_count INTEGER NOT NULL DEFAULT 0,
  minor_edit_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one row per variant per day
  UNIQUE (variant, metric_date),
  
  -- Indexes
  INDEX idx_pipeline_metrics_variant (variant),
  INDEX idx_pipeline_metrics_date (metric_date)
);
```

#### 4. User Feedback Table

Stores user satisfaction and feedback on generated texts.

```sql
CREATE TABLE user_feedback (
  id SERIAL PRIMARY KEY,
  generation_id INTEGER NOT NULL REFERENCES pipeline_generations(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  
  -- Feedback data
  satisfaction_score INTEGER CHECK (satisfaction_score IN (-1, 1)), -- thumbs down/up
  regenerated BOOLEAN DEFAULT FALSE,
  edit_type TEXT CHECK (edit_type IN ('none', 'minor', 'major', 'complete_rewrite')),
  time_to_final_text INTEGER, -- seconds from generation to acceptance
  
  -- Optional text feedback
  feedback_text TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_user_feedback_generation_id (generation_id),
  INDEX idx_user_feedback_user_id (user_id)
);
```

#### 5. Expert Feedback Items Table

Stores individual feedback items from expert analysis for analytics.

```sql
CREATE TABLE expert_feedback_items (
  id SERIAL PRIMARY KEY,
  generation_id INTEGER NOT NULL REFERENCES pipeline_generations(id),
  
  -- Feedback data
  feedback_id TEXT NOT NULL, -- UUID from analysis
  issue TEXT NOT NULL,
  location TEXT NOT NULL,
  text_span JSONB, -- { start, end, field }
  suggestion TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('grammar', 'style', 'legal', 'broker_realism', 'clarity')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'important', 'suggestion')),
  expert TEXT NOT NULL CHECK (expert IN ('broker', 'lawyer')),
  actionable BOOLEAN NOT NULL,
  auto_fix TEXT,
  
  -- User interaction
  applied BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_expert_feedback_generation_id (generation_id),
  INDEX idx_expert_feedback_category (category),
  INDEX idx_expert_feedback_severity (severity)
);
```

### Redis Cache Schema

#### 1. Session Assignments

Cache A/B test assignments for fast lookup.

```
Key: ab_test:session:{sessionId}
Value: { userId, variant, assignedAt }
TTL: 24 hours
```

#### 2. Prompt Templates

Cache compiled prompt templates to avoid rebuilding.

```
Key: prompt:template:{templateName}:{version}
Value: { template, compiledAt }
TTL: 1 hour
```

#### 3. Feature Flags

Cache feature flag states for fast access.

```
Key: feature:flag:{flagName}
Value: { enabled, config }
TTL: 5 minutes
```

### API Request/Response Models

#### 1. Generate Text Request

```typescript
interface GenerateTextRequest {
  disposition: {
    property: {
      type: string;
      address: string;
      size: number;
      rooms: number;
      layout?: string;
      preferred_outdoor_term?: string;
      // ... other property fields
    };
    location: {
      area: string;
      transport?: string;
      amenities?: string[];
      services?: string[];
    };
    unique_features?: string[];
    // ... other disposition fields
  };
  style: 'factual' | 'balanced' | 'selling';
  platform: 'hemnet' | 'booli' | 'general';
  personalStylePrompt?: string;
  targetWordMin: number;
  targetWordMax: number;
  forceVariant?: 'control' | 'treatment'; // For testing
}
```

#### 2. Generate Text Response

```typescript
interface GenerateTextResponse {
  // Generated content
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  
  // Expert analysis (only for treatment variant)
  expertAnalysis?: {
    overallQuality: number;
    strengths: string[];
    improvements: Array<{
      id: string;
      issue: string;
      location: string;
      textSpan?: { start: number; end: number; field: string };
      suggestion: string;
      category: 'grammar' | 'style' | 'legal' | 'broker_realism' | 'clarity';
      severity: 'critical' | 'important' | 'suggestion';
      expert: 'broker' | 'lawyer';
      actionable: boolean;
      autoFix?: string;
    }>;
    legalCheck: {
      compliant: boolean;
      notes: string;
      issues: string[];
    };
  };
  
  // Metadata
  variant: 'control' | 'treatment';
  generationId: number;
  metrics: {
    totalDuration: number;
    step1Duration?: number;
    step2Duration?: number;
    step3Duration?: number;
    retryCount: number;
  };
  fallbackUsed: boolean;
}
```

#### 3. AI-Assisted Selection Edit Request

```typescript
interface SelectionEditRequest {
  generationId: number;
  selectedText: string;
  fullContext: string;
  field: 'improvedPrompt' | 'headline' | 'socialCopy' | 'instagramCaption' | 'showingInvitation' | 'shortAd';
  style: 'factual' | 'balanced' | 'selling';
  platform: 'hemnet' | 'booli' | 'general';
}
```

#### 4. AI-Assisted Selection Edit Response

```typescript
interface SelectionEditResponse {
  suggestions: string[];
  duration: number;
}
```

#### 5. Apply Fix Request

```typescript
interface ApplyFixRequest {
  generationId: number;
  feedbackId: string;
  field: string;
  textSpan: { start: number; end: number };
  replacement: string;
}
```

#### 6. Apply Fix Response

```typescript
interface ApplyFixResponse {
  success: boolean;
  newText: string;
  error?: string;
}
```

#### 7. Submit Feedback Request

```typescript
interface SubmitFeedbackRequest {
  generationId: number;
  satisfactionScore: -1 | 1; // thumbs down/up
  regenerated: boolean;
  editType: 'none' | 'minor' | 'major' | 'complete_rewrite';
  timeToFinalText: number; // seconds
  feedbackText?: string;
}
```

#### 8. Submit Feedback Response

```typescript
interface SubmitFeedbackResponse {
  success: boolean;
  feedbackId: number;
}
```

### WebSocket Event Models

#### 1. Progress Events

Emitted during pipeline execution to update frontend.

```typescript
interface ProgressEvent {
  type: 'progress';
  generationId: number;
  step: 'smart_generation' | 'post_processing' | 'expert_analysis';
  progress: number; // 0-100
  message: string;
  timestamp: Date;
}
```

#### 2. Completion Events

Emitted when pipeline completes (success or failure).

```typescript
interface CompletionEvent {
  type: 'completion';
  generationId: number;
  success: boolean;
  result?: GenerateTextResponse;
  error?: {
    message: string;
    type: string;
    retryable: boolean;
  };
  timestamp: Date;
}
```

#### 3. Fallback Events

Emitted when pipeline falls back to old system.

```typescript
interface FallbackEvent {
  type: 'fallback';
  generationId: number;
  reason: string;
  timestamp: Date;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas where properties can be consolidated to avoid redundancy:

**Consolidation Decisions**:

1. **Pipeline execution order properties (2.1, 3.1)** can be combined into a single property about the complete pipeline sequence
2. **Performance properties (1.2, 2.2, 3.2, 4.1)** are all testing timing constraints and can be grouped conceptually, though each step needs separate validation
3. **Logging properties (1.7, 2.8, 4.6, 12.6, 12.7)** all verify that operations are logged correctly and can share testing infrastructure
4. **UI update properties (5.7, 6.7)** both test real-time reactivity and can use similar testing approaches
5. **Undo properties (7.2, 8.7)** both test undo functionality and can share implementation

The properties below represent the unique, non-redundant validation requirements.

### Smart Generation Properties

#### Property 1: Generation Performance Constraint

*For any* generation request, the Smart Generation step should complete within 15-18 seconds.

**Validates: Requirements 1.2**

#### Property 2: Zero Spelling Errors

*For any* generated Swedish text, when validated with a Swedish spell checker, there should be zero spelling errors.

**Validates: Requirements 1.3**

#### Property 3: Grammatical Correctness Threshold

*For any* generated text, when analyzed with Swedish grammar checking tools, the grammatical correctness score should be 95% or higher.

**Validates: Requirements 1.4**

#### Property 4: Broker Realism Score

*For any* generated text, when scored against the broker realism rubric (checking for AI clichés and forbidden phrases), the score should be 90% or higher.

**Validates: Requirements 1.5**

#### Property 5: Generation Error Logging

*For any* Smart Generation failure, the error logs should contain the failure reason, input parameters, and timestamp.

**Validates: Requirements 1.7**

### Post-Processing Properties

#### Property 6: Pipeline Execution Order

*For any* pipeline execution, the Post-Processor should execute after Smart Generation completes, and Expert Analyzer should execute after Post-Processor completes.

**Validates: Requirements 2.1, 3.1**

#### Property 7: Post-Processing Performance

*For any* post-processing operation, the execution time should be less than 1 second.

**Validates: Requirements 2.2**

#### Property 8: Placeholder Removal

*For any* text containing placeholders ([TID], [KONTAKT], [MÄKLARE]), after post-processing, the text should contain no placeholder markers.

**Validates: Requirements 2.3**

#### Property 9: Formatting Consistency

*For any* text with formatting issues (missing periods, incorrect spacing, capitalization errors), after post-processing, these issues should be corrected according to the formatting rules.

**Validates: Requirements 2.4**

#### Property 10: Forbidden Phrase Removal

*For any* text containing forbidden phrases from the FORBIDDEN_PHRASES list, after post-processing with the appropriate style filter, the text should not contain any forbidden phrases that apply to that style.

**Validates: Requirements 2.5**

#### Property 11: Swedish Character Normalization

*For any* text containing Swedish characters (å, ä, ö), after post-processing, all characters should be correctly encoded in UTF-8.

**Validates: Requirements 2.6**

#### Property 12: Post-Processing Idempotence

*For any* text, running the post-processor twice should produce identical output (same input → same output).

**Validates: Requirements 2.7**

#### Property 13: Transformation Logging

*For any* post-processing operation that applies transformations, the logs should contain all transformation details (type, field, before, after, position).

**Validates: Requirements 2.8**

### Expert Analysis Properties

#### Property 14: Analysis Performance

*For any* expert analysis request, the execution time should be between 5-7 seconds.

**Validates: Requirements 3.2**

#### Property 15: Dual Perspective Analysis

*For any* expert analysis result, the feedback items should include contributions from both the AI-mäklare perspective and the AI-jurist perspective.

**Validates: Requirements 3.3**

#### Property 16: Structured JSON Output

*For any* expert analysis result, the output should be valid JSON conforming to the ExpertAnalysis schema with all required fields present.

**Validates: Requirements 3.4**

#### Property 17: Text Span Identification

*For any* feedback item in the expert analysis, if the issue relates to specific text, the feedback should include text span information (start, end, field).

**Validates: Requirements 3.5**

#### Property 18: Concrete Suggestions

*For any* feedback item in the expert analysis, the suggestion field should contain a concrete, actionable improvement recommendation.

**Validates: Requirements 3.6**

#### Property 19: Category Constraint

*For any* feedback item in the expert analysis, the category should be one of: "grammar", "style", "legal", "broker_realism", or "clarity".

**Validates: Requirements 3.7**

#### Property 20: Severity Constraint

*For any* feedback item in the expert analysis, the severity should be one of: "critical", "important", or "suggestion".

**Validates: Requirements 3.8**

#### Property 21: Actionable Fix Format

*For any* feedback item marked as actionable, the autoFix field should contain text that can be programmatically applied to replace the identified text span.

**Validates: Requirements 3.9**

### Pipeline Performance and Reliability Properties

#### Property 22: Total Pipeline Performance

*For any* complete pipeline execution (all three steps), the total duration should be less than 25 seconds.

**Validates: Requirements 4.1**

#### Property 23: Success Rate Threshold

*For any* set of 100 consecutive pipeline executions, at least 95 should complete successfully without falling back to the old pipeline.

**Validates: Requirements 4.2**

#### Property 24: Retry with Exponential Backoff

*For any* step failure, the pipeline should retry up to 2 times with exponentially increasing delays (e.g., 1s, 2s, 4s).

**Validates: Requirements 4.3**

#### Property 25: Error Information on Final Failure

*For any* pipeline execution where all retries fail, the response should contain detailed error information including error type, message, and context.

**Validates: Requirements 4.4**

#### Property 26: A/B Test Parallel Execution

*For any* generation request during the A/B testing phase, both the old and new pipelines should be available, and the assigned variant should determine which executes.

**Validates: Requirements 4.5**

#### Property 27: Performance Metrics Logging

*For any* pipeline execution, the logs should contain metrics for each step including duration, success/failure status, and retry count.

**Validates: Requirements 4.6**

#### Property 28: WebSocket Progress Events

*For any* pipeline execution, WebSocket progress events should be emitted at the start and completion of each step.

**Validates: Requirements 4.7**

### Frontend Inline Highlights Properties

#### Property 29: Visual Marker Display

*For any* feedback item with a text span, the InlineHighlights component should render a visual marker on the corresponding text.

**Validates: Requirements 5.1**

#### Property 30: Severity Color Coding

*For any* highlight, the color should match the severity: red for critical, yellow for important, blue for suggestion.

**Validates: Requirements 5.2**

#### Property 31: Tooltip on Hover

*For any* highlight, hovering over it should display a tooltip containing the feedback details.

**Validates: Requirements 5.3**

#### Property 32: Category Icon in Tooltip

*For any* tooltip, it should display an icon representing the feedback category.

**Validates: Requirements 5.4**

#### Property 33: Fix Button for Actionable Feedback

*For any* tooltip showing actionable feedback, it should include a "Fix" button.

**Validates: Requirements 5.5**

#### Property 34: Real-time Highlight Updates

*For any* text edit, the highlights should update to reflect the new text positions within 100ms.

**Validates: Requirements 5.7**

### Expert Feedback Panel Properties

#### Property 35: Category Grouping

*For any* set of feedback items, the ExpertFeedbackPanel should group them by category with each category clearly labeled.

**Validates: Requirements 6.1**

#### Property 36: Category Counts

*For any* category in the feedback panel, the displayed count should equal the number of feedback items in that category.

**Validates: Requirements 6.2**

#### Property 37: Click-to-Scroll Navigation

*For any* feedback item click in the panel, the page should scroll to the corresponding text span and highlight it.

**Validates: Requirements 6.3**

#### Property 38: Severity Display

*For any* feedback item in the panel, the severity level should be visually displayed.

**Validates: Requirements 6.4**

#### Property 39: Expert Attribution

*For any* feedback item in the panel, it should indicate whether it came from the AI-mäklare or AI-jurist.

**Validates: Requirements 6.5**

#### Property 40: Action Buttons Presence

*For any* feedback item in the panel, it should have action buttons for "Fix automatically", "Get AI suggestion", and "Dismiss".

**Validates: Requirements 6.6**

#### Property 41: Real-time Panel Updates

*For any* feedback resolution (applied or dismissed), the panel should update within 100ms to reflect the change.

**Validates: Requirements 6.7**

### One-Click Fix Properties

#### Property 42: Automatic Fix Application

*For any* actionable feedback with an autoFix, clicking "Fix automatically" should apply the suggested change to the text.

**Validates: Requirements 7.1**

#### Property 43: Undo Support

*For any* applied fix, pressing Ctrl+Z (or Cmd+Z) should undo the change and restore the previous text.

**Validates: Requirements 7.2**

#### Property 44: Feedback Removal on Success

*For any* successfully applied fix, the corresponding feedback item should be removed from the feedback list.

**Validates: Requirements 7.3**

#### Property 45: Highlight Synchronization

*For any* applied fix, the inline highlights should update to reflect the text change.

**Validates: Requirements 7.4**

#### Property 46: Error Handling for Unapplicable Fixes

*For any* fix that cannot be applied (e.g., text has changed), an error message should be displayed to the user.

**Validates: Requirements 7.5**

#### Property 47: Fix Application Logging

*For any* applied fix, the action should be logged with the feedback ID, user ID, and timestamp for analytics.

**Validates: Requirements 7.6**

### AI-Assisted Selection Edit Properties

#### Property 48: Selection Button Display

*For any* text selection, an "Improve with AI" button should appear near the selection.

**Validates: Requirements 8.1**

#### Property 49: API Call on Button Click

*For any* "Improve with AI" button click, an API request should be sent with the selected text and full context.

**Validates: Requirements 8.2**

#### Property 50: Selection Edit Performance

*For any* AI-assisted selection edit request, the response should be received within 3-5 seconds.

**Validates: Requirements 8.3**

#### Property 51: Multiple Suggestions

*For any* selection edit response, it should contain 2-3 alternative suggestions.

**Validates: Requirements 8.4**

#### Property 52: Suggestion Preview Display

*For any* selection edit response, the suggestions should be displayed in a popover with preview text.

**Validates: Requirements 8.5**

#### Property 53: Text Replacement on Selection

*For any* suggestion selection, the original text should be replaced with the chosen suggestion.

**Validates: Requirements 8.6**

#### Property 54: Context Preservation

*For any* selection edit API request, the full text context should be included in the request payload.

**Validates: Requirements 8.8**

### A/B Testing Properties

#### Property 55: Feature Flag Control

*For any* generation request, if the feature flag is disabled, the old 7-step pipeline should execute regardless of user assignment.

**Validates: Requirements 9.1**

#### Property 56: Random Assignment

*For any* new user session, the variant assignment should be random with approximately 50% assigned to each group (within statistical variance).

**Validates: Requirements 9.2**

#### Property 57: Pipeline Version Logging

*For any* generation, the logs should record which pipeline variant was used.

**Validates: Requirements 9.3**

#### Property 58: Per-Variant Metrics Tracking

*For any* generation, metrics (success rate, generation time, user satisfaction) should be tracked separately for the assigned variant.

**Validates: Requirements 9.4**

#### Property 59: Manual Override Support

*For any* generation request with a forceVariant parameter, that variant should be used regardless of random assignment.

**Validates: Requirements 9.5**

#### Property 60: Session Consistency

*For any* user session, all generations within that session should use the same pipeline variant.

**Validates: Requirements 9.6**

#### Property 61: Comprehensive Metrics Collection

*For any* generation, the system should collect all specified metrics: success_rate, avg_generation_time, regeneration_rate, and user_satisfaction_score.

**Validates: Requirements 9.7**

### Monitoring Properties

#### Property 62: Success Rate Alerting

*For any* 1-hour window, if the success rate drops below 95%, an alert should be triggered.

**Validates: Requirements 10.1**

#### Property 63: Performance Alerting

*For any* 1-hour window, if the average generation time exceeds 25 seconds, an alert should be triggered.

**Validates: Requirements 10.2**

#### Property 64: User Satisfaction Tracking

*For any* generation with user feedback (thumbs up/down), the satisfaction score should be recorded and aggregated.

**Validates: Requirements 10.3**

#### Property 65: Minor Edit Tracking

*For any* generation where the user makes edits, the system should classify the edit type (none, minor, major, complete_rewrite) and track the percentage with minor edits.

**Validates: Requirements 10.4**

#### Property 66: Regeneration Rate Tracking

*For any* generation, if the user regenerates, this should be tracked and the regeneration rate calculated.

**Validates: Requirements 10.5**

#### Property 67: Time to Final Text Tracking

*For any* generation, the system should measure the time from generation completion to user acceptance (final text).

**Validates: Requirements 10.6**

#### Property 68: Metrics Export

*For any* collected metric, it should be exported to the monitoring dashboard (Sentry or configured system).

**Validates: Requirements 10.7**

#### Property 69: Daily Summary Reports

*For any* day, a summary report should be generated containing all key metrics for both variants.

**Validates: Requirements 10.8**

### Backward Compatibility Properties

#### Property 70: API Interface Compatibility

*For any* generation request using the old API format, the new pipeline should accept and process it correctly.

**Validates: Requirements 11.1**

#### Property 71: Response Structure Compatibility

*For any* generation response, it should contain all fields expected by existing clients, with new fields added as optional extensions.

**Validates: Requirements 11.2**

#### Property 72: Property Type Support

*For any* existing property type (bostadsrätt, villa, fritidshus, etc.), the new pipeline should generate appropriate text.

**Validates: Requirements 11.3**

#### Property 73: Personal Style Respect

*For any* generation request with a personal style prompt, the generated text should reflect that style.

**Validates: Requirements 11.4**

#### Property 74: Quota Integration

*For any* generation, the user's quota should be checked before execution and decremented after successful completion.

**Validates: Requirements 11.5**

#### Property 75: WebSocket Compatibility

*For any* generation, progress updates should be sent via the existing WebSocket infrastructure.

**Validates: Requirements 11.6**

#### Property 76: PDF Export Compatibility

*For any* generated text, it should be exportable to PDF using the existing export functionality.

**Validates: Requirements 11.7**

### Error Handling and Fallback Properties

#### Property 77: Fallback to Old Pipeline

*For any* Smart Generation failure after all retries, the system should automatically fall back to the old 7-step pipeline.

**Validates: Requirements 12.1**

#### Property 78: Post-Processor Graceful Degradation

*For any* Post-Processor failure, the pipeline should continue with the unprocessed text and log the error.

**Validates: Requirements 12.2**

#### Property 79: Expert Analyzer Graceful Degradation

*For any* Expert Analyzer failure, the pipeline should return the text without analysis feedback.

**Validates: Requirements 12.3**

#### Property 80: Non-Empty Result Guarantee

*For any* pipeline execution, the result should never be empty or null; at minimum, it should return the original disposition text or an error message.

**Validates: Requirements 12.4**

#### Property 81: Fallback User Notification

*For any* fallback to the old pipeline, a UI message should be displayed informing the user.

**Validates: Requirements 12.5**

#### Property 82: Fallback Event Logging

*For any* fallback occurrence, the event should be logged with the reason, user ID, and timestamp.

**Validates: Requirements 12.6**

#### Property 83: Error Context Logging

*For any* error log entry, it should include context information: user_id, property_id, pipeline_step, and error_message.

**Validates: Requirements 12.7**


## Error Handling

### Error Classification

Errors are classified into three categories to determine appropriate handling:

1. **Retryable Errors**: Temporary failures that may succeed on retry
   - Network timeouts
   - OpenAI API rate limits
   - Temporary service unavailability
   - Database connection errors

2. **Non-Retryable Errors**: Permanent failures that won't succeed on retry
   - Invalid input data
   - Authentication failures
   - Quota exceeded
   - Malformed API responses

3. **Degradable Errors**: Failures where the pipeline can continue with reduced functionality
   - Post-Processor failures (continue with unprocessed text)
   - Expert Analyzer failures (continue without analysis)

### Error Handling Strategy by Component

#### Smart Generation Engine

**Retryable Errors**:
- OpenAI API timeout → Retry with exponential backoff (1s, 2s, 4s)
- Rate limit exceeded → Wait and retry with backoff
- Network errors → Retry up to 2 times

**Non-Retryable Errors**:
- Invalid API key → Return error immediately, log to Sentry
- Malformed disposition → Validate input, return validation error
- Quota exceeded → Return quota error, don't retry

**Fallback Strategy**:
- After 2 failed retries → Fall back to old 7-step pipeline
- Log fallback event with reason
- Notify user via WebSocket
- Continue with old pipeline result

**Error Response Format**:
```typescript
interface GenerationError {
  type: 'generation_error';
  step: 'smart_generation';
  retryable: boolean;
  message: string;
  details: {
    apiError?: string;
    statusCode?: number;
    retryCount: number;
  };
  timestamp: Date;
}
```

#### Deterministic Post-Processor

**Graceful Degradation**:
- If any transformation fails → Log error, skip that transformation
- Continue with remaining transformations
- Return partially processed text
- Include transformation errors in response

**Error Logging**:
```typescript
interface PostProcessorError {
  type: 'post_processor_error';
  transformation: string;
  field: string;
  error: string;
  inputText: string; // First 100 chars for debugging
  timestamp: Date;
}
```

**Recovery Strategy**:
- Never fail the entire pipeline
- Always return text (processed or unprocessed)
- Log all errors for monitoring
- Alert if error rate exceeds 5%

#### Expert AI Analyzer

**Graceful Degradation**:
- If analysis fails → Return text without expert feedback
- Set `expertAnalysis` to null in response
- Log error with full context
- User can still use generated text

**Retryable Errors**:
- OpenAI API timeout → Retry once with 2s delay
- Network errors → Retry once

**Non-Retryable Errors**:
- Malformed JSON response → Log error, return null analysis
- Invalid analysis structure → Log error, return null analysis

**Error Response Format**:
```typescript
interface AnalysisError {
  type: 'analysis_error';
  step: 'expert_analysis';
  retryable: boolean;
  message: string;
  details: {
    apiError?: string;
    parseError?: string;
    retryCount: number;
  };
  timestamp: Date;
}
```

### Retry Logic Implementation

**Exponential Backoff Algorithm**:

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!isRetryable(error)) {
        throw error;
      }
      
      // Don't delay after last attempt
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

function isRetryable(error: Error): boolean {
  // Network errors
  if (error.message.includes('ECONNREFUSED') || 
      error.message.includes('ETIMEDOUT')) {
    return true;
  }
  
  // OpenAI rate limits
  if (error.message.includes('rate_limit_exceeded')) {
    return true;
  }
  
  // Temporary service errors
  if (error.message.includes('503') || 
      error.message.includes('502')) {
    return true;
  }
  
  return false;
}
```

### Fallback Mechanism

**Fallback Decision Tree**:

```
Generation Request
    ↓
Smart Generation Attempt 1
    ↓
  Failed? → Retry (2s delay)
    ↓
Smart Generation Attempt 2
    ↓
  Failed? → Retry (4s delay)
    ↓
Smart Generation Attempt 3
    ↓
  Failed? → FALLBACK TO OLD PIPELINE
    ↓
Execute Old 7-Step Pipeline
    ↓
Return Result with fallbackUsed: true
```

**Fallback Implementation**:

```typescript
async function executeWithFallback(
  request: PipelineRequest
): Promise<PipelineResult> {
  try {
    // Try new 3-step pipeline with retries
    return await retryWithBackoff(
      () => executeNewPipeline(request),
      2,
      1000
    );
  } catch (error) {
    // Log fallback event
    logger.warn('Falling back to old pipeline', {
      userId: request.userId,
      error: error.message,
      retryCount: 2
    });
    
    // Emit WebSocket event
    emitFallbackEvent(request.sessionId, {
      reason: error.message,
      timestamp: new Date()
    });
    
    // Execute old pipeline
    const result = await executeOldPipeline(request);
    result.fallbackUsed = true;
    result.variant = 'control';
    
    return result;
  }
}
```

### Error Monitoring and Alerting

**Sentry Integration**:

```typescript
import * as Sentry from '@sentry/node';

function logError(error: Error, context: any) {
  Sentry.captureException(error, {
    tags: {
      component: context.component,
      step: context.step,
      variant: context.variant
    },
    extra: {
      userId: context.userId,
      generationId: context.generationId,
      retryCount: context.retryCount
    }
  });
}
```

**Alert Conditions**:

1. **Critical Alerts** (immediate notification):
   - Success rate drops below 90% in any 15-minute window
   - Average generation time exceeds 30 seconds
   - Fallback rate exceeds 20%
   - Database connection failures

2. **Warning Alerts** (notification within 1 hour):
   - Success rate drops below 95%
   - Average generation time exceeds 25 seconds
   - Fallback rate exceeds 10%
   - Post-processor error rate exceeds 5%

3. **Info Alerts** (daily summary):
   - Daily success rate and performance metrics
   - A/B test results comparison
   - User satisfaction scores
   - Most common error types

### User-Facing Error Messages

**Error Message Guidelines**:
- Be specific but not technical
- Provide actionable next steps
- Maintain professional tone
- Avoid blaming the user

**Error Message Examples**:

```typescript
const ERROR_MESSAGES = {
  generation_timeout: {
    title: 'Genereringen tog för lång tid',
    message: 'Vi kunde inte generera texten inom rimlig tid. Försök igen eller kontakta support om problemet kvarstår.',
    action: 'Försök igen'
  },
  
  quota_exceeded: {
    title: 'Din kvot är slut',
    message: 'Du har använt alla dina genereringar för denna månad. Uppgradera ditt abonnemang för att fortsätta.',
    action: 'Uppgradera'
  },
  
  invalid_disposition: {
    title: 'Ofullständig information',
    message: 'Dispositionen saknar viktig information. Kontrollera att alla obligatoriska fält är ifyllda.',
    action: 'Granska disposition'
  },
  
  service_unavailable: {
    title: 'Tjänsten är tillfälligt otillgänglig',
    message: 'Vi har tekniska problem just nu. Försök igen om några minuter.',
    action: 'Försök igen'
  },
  
  fallback_used: {
    title: 'Använder alternativ metod',
    message: 'Vi använder vår tidigare genereringsmetod för att säkerställa att du får ett resultat.',
    action: 'OK'
  }
};
```

### Error Recovery Procedures

**For Developers**:

1. **High Error Rate**:
   - Check Sentry for error patterns
   - Review recent deployments
   - Check OpenAI API status
   - Verify database connectivity
   - Review rate limit settings

2. **Slow Performance**:
   - Check OpenAI API response times
   - Review database query performance
   - Check Redis cache hit rates
   - Monitor server CPU/memory usage

3. **Fallback Rate Spike**:
   - Investigate Smart Generation failures
   - Check prompt template changes
   - Review OpenAI model availability
   - Verify API key validity

**For Operations**:

1. **Service Degradation**:
   - Enable feature flag to disable new pipeline
   - All users fall back to old pipeline
   - Investigate and fix issues
   - Gradually re-enable new pipeline

2. **Database Issues**:
   - Check connection pool settings
   - Review slow query logs
   - Verify database disk space
   - Check for lock contention

3. **OpenAI API Issues**:
   - Check API status page
   - Verify rate limits
   - Review API key permissions
   - Consider temporary rate limit increase


## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific examples and edge cases with property-based tests for comprehensive validation across all inputs.

**Unit Tests**: Focus on specific examples, edge cases, and integration points
**Property Tests**: Verify universal properties across randomized inputs

Together, these approaches provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing Configuration

**Library**: We will use `fast-check` for JavaScript/TypeScript property-based testing.

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `Feature: perfect-swedish-pipeline, Property {number}: {property_text}`

**Example Property Test**:

```typescript
import fc from 'fast-check';

describe('Property 12: Post-Processing Idempotence', () => {
  it('should produce identical output when run twice', () => {
    // Feature: perfect-swedish-pipeline, Property 12: Post-processing idempotence
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 500 }),
        fc.constantFrom('factual', 'balanced', 'selling'),
        fc.constantFrom('hemnet', 'booli', 'general'),
        (text, style, platform) => {
          const processor = new DeterministicPostProcessor();
          const request = { 
            improvedPrompt: text,
            headline: '',
            socialCopy: '',
            instagramCaption: '',
            showingInvitation: '',
            shortAd: '',
            disposition: {},
            style,
            platform
          };
          
          const result1 = processor.process(request);
          const result2 = processor.process(request);
          
          expect(result1.improvedPrompt).toBe(result2.improvedPrompt);
          expect(result1.transformations).toEqual(result2.transformations);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

#### Backend Unit Tests

**Smart Generation Engine Tests**:

```typescript
describe('SmartGenerationEngine', () => {
  describe('Prompt Building', () => {
    it('should include Swedish language rules in prompt', () => {
      const engine = new SmartGenerationEngine();
      const prompt = engine.buildPrompt({
        disposition: mockDisposition,
        style: 'balanced',
        platform: 'hemnet',
        targetWordMin: 200,
        targetWordMax: 400
      });
      
      expect(prompt).toContain('STAVNING');
      expect(prompt).toContain('GRAMMATIK');
      expect(prompt).toContain('INTERPUNKTION');
    });
    
    it('should include self-check instructions', () => {
      const engine = new SmartGenerationEngine();
      const prompt = engine.buildPrompt(mockRequest);
      
      expect(prompt).toContain('SJÄLVKONTROLL');
      expect(prompt).toContain('stavat ALLA ord rätt');
    });
  });
  
  describe('Performance', () => {
    it('should complete within 18 seconds', async () => {
      const engine = new SmartGenerationEngine();
      const start = Date.now();
      
      await engine.generate(mockRequest);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(18000);
    }, 20000);
  });
  
  describe('Error Handling', () => {
    it('should log detailed error on failure', async () => {
      const engine = new SmartGenerationEngine();
      const logSpy = jest.spyOn(logger, 'error');
      
      // Force an error
      jest.spyOn(openai, 'chat').mockRejectedValue(new Error('API Error'));
      
      await expect(engine.generate(mockRequest)).rejects.toThrow();
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Smart Generation failed'),
        expect.objectContaining({
          error: expect.any(String),
          disposition: expect.any(Object)
        })
      );
    });
  });
});
```

**Post-Processor Tests**:

```typescript
describe('DeterministicPostProcessor', () => {
  describe('Placeholder Removal', () => {
    it('should remove [TID] placeholder', () => {
      const processor = new DeterministicPostProcessor();
      const result = processor.process({
        improvedPrompt: 'Visning [TID]. Välkommen!',
        // ... other fields
      });
      
      expect(result.improvedPrompt).not.toContain('[TID]');
    });
    
    it('should remove all placeholder types', () => {
      const processor = new DeterministicPostProcessor();
      const text = 'Kontakta [MÄKLARE] på [KONTAKT] för visning [TID].';
      const result = processor.process({
        improvedPrompt: text,
        // ... other fields
      });
      
      expect(result.improvedPrompt).not.toMatch(/\[.*?\]/);
    });
  });
  
  describe('Forbidden Phrase Removal', () => {
    it('should remove "välkommen till" in all styles', () => {
      const processor = new DeterministicPostProcessor();
      
      ['factual', 'balanced', 'selling'].forEach(style => {
        const result = processor.process({
          improvedPrompt: 'Välkommen till denna villa...',
          style: style as WritingStyle,
          // ... other fields
        });
        
        expect(result.improvedPrompt.toLowerCase()).not.toContain('välkommen till');
      });
    });
    
    it('should respect style exemptions for "fantastisk"', () => {
      const processor = new DeterministicPostProcessor();
      
      // Should remove in factual
      const factual = processor.process({
        improvedPrompt: 'En fantastisk villa...',
        style: 'factual',
        // ... other fields
      });
      expect(factual.improvedPrompt.toLowerCase()).not.toContain('fantastisk');
      
      // Should keep in selling
      const selling = processor.process({
        improvedPrompt: 'En fantastisk villa...',
        style: 'selling',
        // ... other fields
      });
      expect(selling.improvedPrompt.toLowerCase()).toContain('fantastisk');
    });
  });
  
  describe('Formatting Fixes', () => {
    it('should add missing period between sentences', () => {
      const processor = new DeterministicPostProcessor();
      const result = processor.process({
        improvedPrompt: 'Bra läge Köket är renoverat',
        // ... other fields
      });
      
      expect(result.improvedPrompt).toMatch(/läge\.\s+Köket/);
    });
    
    it('should remove period from headline', () => {
      const processor = new DeterministicPostProcessor();
      const result = processor.process({
        headline: 'Charmig villa med pool.',
        // ... other fields
      });
      
      expect(result.headline).toBe('Charmig villa med pool');
    });
  });
  
  describe('Performance', () => {
    it('should complete within 1 second', () => {
      const processor = new DeterministicPostProcessor();
      const start = Date.now();
      
      processor.process(mockRequest);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });
});
```

**Expert Analyzer Tests**:

```typescript
describe('ExpertAIAnalyzer', () => {
  describe('Analysis Structure', () => {
    it('should return valid ExpertAnalysis structure', async () => {
      const analyzer = new ExpertAIAnalyzer();
      const result = await analyzer.analyze(mockRequest);
      
      expect(result).toHaveProperty('overallQuality');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('improvements');
      expect(result).toHaveProperty('legalCheck');
      expect(result.overallQuality).toBeGreaterThanOrEqual(0);
      expect(result.overallQuality).toBeLessThanOrEqual(10);
    });
    
    it('should include both broker and lawyer perspectives', async () => {
      const analyzer = new ExpertAIAnalyzer();
      const result = await analyzer.analyze(mockRequest);
      
      const experts = result.improvements.map(item => item.expert);
      expect(experts).toContain('broker');
      expect(experts).toContain('lawyer');
    });
  });
  
  describe('Feedback Items', () => {
    it('should include text spans for location-specific feedback', async () => {
      const analyzer = new ExpertAIAnalyzer();
      const result = await analyzer.analyze(mockRequest);
      
      const locationSpecific = result.improvements.filter(
        item => item.location !== 'General'
      );
      
      locationSpecific.forEach(item => {
        expect(item.textSpan).toBeDefined();
        expect(item.textSpan.start).toBeGreaterThanOrEqual(0);
        expect(item.textSpan.end).toBeGreaterThan(item.textSpan.start);
      });
    });
    
    it('should use only allowed categories', async () => {
      const analyzer = new ExpertAIAnalyzer();
      const result = await analyzer.analyze(mockRequest);
      
      const allowedCategories = ['grammar', 'style', 'legal', 'broker_realism', 'clarity'];
      
      result.improvements.forEach(item => {
        expect(allowedCategories).toContain(item.category);
      });
    });
    
    it('should use only allowed severity levels', async () => {
      const analyzer = new ExpertAIAnalyzer();
      const result = await analyzer.analyze(mockRequest);
      
      const allowedSeverities = ['critical', 'important', 'suggestion'];
      
      result.improvements.forEach(item => {
        expect(allowedSeverities).toContain(item.severity);
      });
    });
  });
  
  describe('Performance', () => {
    it('should complete within 7 seconds', async () => {
      const analyzer = new ExpertAIAnalyzer();
      const start = Date.now();
      
      await analyzer.analyze(mockRequest);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(7000);
    }, 10000);
  });
});
```

**Pipeline Orchestrator Tests**:

```typescript
describe('PerfectSwedishOrchestrator', () => {
  describe('A/B Testing', () => {
    it('should assign variant consistently within session', async () => {
      const orchestrator = new PerfectSwedishOrchestrator();
      const userId = 123;
      const sessionId = 'test-session';
      
      const variant1 = await orchestrator.assignVariant(userId, sessionId);
      const variant2 = await orchestrator.assignVariant(userId, sessionId);
      
      expect(variant1).toBe(variant2);
    });
    
    it('should respect manual override', async () => {
      const orchestrator = new PerfectSwedishOrchestrator();
      
      const result = await orchestrator.execute({
        ...mockRequest,
        forceVariant: 'treatment'
      });
      
      expect(result.variant).toBe('treatment');
    });
  });
  
  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      const orchestrator = new PerfectSwedishOrchestrator();
      const executeSpy = jest.spyOn(orchestrator as any, 'executeNewPipeline');
      
      // Fail twice, succeed on third attempt
      executeSpy
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce(mockResult);
      
      const result = await orchestrator.execute(mockRequest);
      
      expect(executeSpy).toHaveBeenCalledTimes(3);
      expect(result.metrics.retryCount).toBe(2);
    });
    
    it('should not retry on non-retryable errors', async () => {
      const orchestrator = new PerfectSwedishOrchestrator();
      const executeSpy = jest.spyOn(orchestrator as any, 'executeNewPipeline');
      
      executeSpy.mockRejectedValueOnce(new Error('Invalid API key'));
      
      await expect(orchestrator.execute(mockRequest)).rejects.toThrow();
      
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Fallback Mechanism', () => {
    it('should fall back to old pipeline after retries exhausted', async () => {
      const orchestrator = new PerfectSwedishOrchestrator();
      const newPipelineSpy = jest.spyOn(orchestrator as any, 'executeNewPipeline');
      const oldPipelineSpy = jest.spyOn(orchestrator as any, 'executeOldPipeline');
      
      newPipelineSpy.mockRejectedValue(new Error('ETIMEDOUT'));
      oldPipelineSpy.mockResolvedValue(mockResult);
      
      const result = await orchestrator.execute(mockRequest);
      
      expect(newPipelineSpy).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(oldPipelineSpy).toHaveBeenCalledTimes(1);
      expect(result.fallbackUsed).toBe(true);
      expect(result.variant).toBe('control');
    });
  });
  
  describe('Performance', () => {
    it('should complete within 25 seconds', async () => {
      const orchestrator = new PerfectSwedishOrchestrator();
      const start = Date.now();
      
      await orchestrator.execute(mockRequest);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(25000);
    }, 30000);
  });
});
```

#### Frontend Unit Tests

**InlineHighlights Component Tests**:

```typescript
describe('InlineHighlights', () => {
  it('should render highlights for all feedback items', () => {
    const feedback = [
      { id: '1', textSpan: { start: 0, end: 10, field: 'improvedPrompt' }, severity: 'critical' },
      { id: '2', textSpan: { start: 20, end: 30, field: 'improvedPrompt' }, severity: 'important' }
    ];
    
    const { container } = render(
      <InlineHighlights text="Test text here with issues" feedback={feedback} />
    );
    
    const highlights = container.querySelectorAll('[data-highlight]');
    expect(highlights).toHaveLength(2);
  });
  
  it('should use correct color for severity', () => {
    const feedback = [
      { id: '1', textSpan: { start: 0, end: 4, field: 'improvedPrompt' }, severity: 'critical' }
    ];
    
    const { container } = render(
      <InlineHighlights text="Test" feedback={feedback} />
    );
    
    const highlight = container.querySelector('[data-highlight]');
    expect(highlight).toHaveClass('bg-red-200'); // or appropriate Tailwind class
  });
  
  it('should show tooltip on hover', async () => {
    const feedback = [
      { 
        id: '1', 
        textSpan: { start: 0, end: 4, field: 'improvedPrompt' }, 
        severity: 'critical',
        issue: 'Test issue',
        suggestion: 'Test suggestion'
      }
    ];
    
    const { container, findByText } = render(
      <InlineHighlights text="Test" feedback={feedback} />
    );
    
    const highlight = container.querySelector('[data-highlight]');
    fireEvent.mouseEnter(highlight);
    
    const tooltip = await findByText('Test issue');
    expect(tooltip).toBeInTheDocument();
  });
});
```

**ExpertFeedbackPanel Component Tests**:

```typescript
describe('ExpertFeedbackPanel', () => {
  it('should group feedback by category', () => {
    const analysis = {
      overallQuality: 8.5,
      strengths: [],
      improvements: [
        { id: '1', category: 'grammar', severity: 'critical' },
        { id: '2', category: 'grammar', severity: 'important' },
        { id: '3', category: 'style', severity: 'suggestion' }
      ],
      legalCheck: { compliant: true, notes: '', issues: [] }
    };
    
    const { getByText } = render(
      <ExpertFeedbackPanel analysis={analysis} />
    );
    
    expect(getByText(/grammar/i)).toBeInTheDocument();
    expect(getByText(/style/i)).toBeInTheDocument();
  });
  
  it('should show correct count per category', () => {
    const analysis = {
      overallQuality: 8.5,
      strengths: [],
      improvements: [
        { id: '1', category: 'grammar', severity: 'critical' },
        { id: '2', category: 'grammar', severity: 'important' }
      ],
      legalCheck: { compliant: true, notes: '', issues: [] }
    };
    
    const { getByText } = render(
      <ExpertFeedbackPanel analysis={analysis} />
    );
    
    expect(getByText(/grammar.*2/i)).toBeInTheDocument();
  });
  
  it('should call onFeedbackClick when item is clicked', () => {
    const onFeedbackClick = jest.fn();
    const analysis = {
      overallQuality: 8.5,
      strengths: [],
      improvements: [
        { id: '1', category: 'grammar', severity: 'critical', issue: 'Test issue' }
      ],
      legalCheck: { compliant: true, notes: '', issues: [] }
    };
    
    const { getByText } = render(
      <ExpertFeedbackPanel analysis={analysis} onFeedbackClick={onFeedbackClick} />
    );
    
    fireEvent.click(getByText('Test issue'));
    
    expect(onFeedbackClick).toHaveBeenCalledWith('1');
  });
});
```

### Integration Tests

**End-to-End Pipeline Test**:

```typescript
describe('Perfect Swedish Pipeline Integration', () => {
  it('should complete full pipeline successfully', async () => {
    const request = {
      disposition: mockDisposition,
      style: 'balanced' as WritingStyle,
      platform: 'hemnet',
      targetWordMin: 200,
      targetWordMax: 400,
      userId: 1,
      sessionId: 'test-session'
    };
    
    const orchestrator = new PerfectSwedishOrchestrator();
    const result = await orchestrator.execute(request);
    
    // Verify all steps completed
    expect(result.improvedPrompt).toBeTruthy();
    expect(result.headline).toBeTruthy();
    expect(result.expertAnalysis).toBeTruthy();
    
    // Verify performance
    expect(result.metrics.totalDuration).toBeLessThan(25000);
    
    // Verify quality
    expect(result.improvedPrompt).not.toContain('[TID]');
    expect(result.improvedPrompt).not.toContain('[KONTAKT]');
    expect(result.improvedPrompt.toLowerCase()).not.toContain('välkommen till');
  }, 30000);
});
```

### Test Coverage Goals

- **Unit Test Coverage**: 80%+ for all backend components
- **Integration Test Coverage**: 90%+ for critical paths
- **Property Test Coverage**: 100% of correctness properties
- **E2E Test Coverage**: All user workflows

### Continuous Integration

**Test Execution in CI**:

```yaml
# .github/workflows/test.yml
name: Test Perfect Swedish Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run property tests
        run: npm run test:property
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          OPENAI_API_KEY: ${{ secrets.TEST_OPENAI_API_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```


## Prompt Engineering Strategy

### Smart Generation Prompt Architecture

The Smart Generation prompt is the most critical component for achieving perfect Swedish. It follows a structured approach with explicit instructions, examples, and self-checking mechanisms.

#### Prompt Structure

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SYSTEM ROLE (Who you are)                                │
│    - Experienced Swedish broker with 15 years experience    │
│    - Expert in Swedish grammar and spelling                 │
│    - Professional, natural writing style                    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PROCESS INSTRUCTIONS (How to work)                       │
│    Step 1: Analyze disposition                              │
│    Step 2: Plan structure                                   │
│    Step 3: Write with perfect Swedish                       │
│    Step 4: Self-check                                       │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SWEDISH LANGUAGE RULES (Critical requirements)           │
│    - Spelling rules with examples                           │
│    - Grammar rules with examples                            │
│    - Punctuation rules with examples                        │
│    - Natural language guidelines                            │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CONCRETE EXAMPLES (Right vs Wrong)                       │
│    ✓ Correct: "Köket renoverades 2023..."                  │
│    ✗ Wrong: "Köket renoverat 2023..."                      │
│    (10-15 examples covering common mistakes)                │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SELF-CHECK CHECKLIST (Mandatory verification)            │
│    ✓ Har jag stavat ALLA ord rätt?                         │
│    ✓ Är grammatiken korrekt?                               │
│    ✓ Är interpunktionen korrekt?                           │
│    ✓ Låter det naturligt på svenska?                       │
│    ✓ Har jag undvikit upprepningar?                        │
│    ✓ Har jag undvikit AI-klyschor?                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. DISPOSITION DATA (Property information)                  │
│    - Structured property data                               │
│    - Location information                                   │
│    - Unique features                                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. OUTPUT FORMAT (JSON structure)                           │
│    {                                                        │
│      "improvedPrompt": "...",                              │
│      "headline": "...",                                    │
│      "socialCopy": "...",                                  │
│      ...                                                    │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

#### System Role Prompt

```markdown
Du är en erfaren svensk mäklare med 15 års erfarenhet av att skriva 
bostadsannonser. Du är EXTREMT noggrann med svensk grammatik och stavning.

Din expertis:
- Perfekt svenska: Du skriver felfri svenska utan stavfel eller grammatiska misstag
- Naturligt språk: Du undviker AI-klyschor och skriver som en riktig mäklare
- Konkret beskrivning: Du fokuserar på verifierbara fakta och konkreta detaljer
- Professionell ton: Du balanserar säljande språk med trovärdighet

Din uppgift är att skriva en objektbeskrivning som mäklare älskar att arbeta med.
```

#### Swedish Language Rules Section

```markdown
## KRITISKA REGLER FÖR SVENSKA

### 1. STAVNING (VIKTIGAST!)

Dubbelkolla VARJE ord innan du är klar. Vanliga misstag att undvika:

**Sammansatta ord:**
✓ Rätt: köksö, kompositbänk, vardagsrum, sovrum
✗ Fel: kökö, komposit bänk, vardags rum, sov rum

**Ortnamn och platser:**
✓ Rätt: Mörtnäs, Södermalm, Östermalm
✗ Fel: Mörtnäss, Söder Malm, Öster Malm

**Material och teknik:**
✓ Rätt: kompositbänk, helkaklat, parkettgolv
✗ Fel: komposit bänk, hel kaklat, parkett golv

**Bindestreck i sammansättningar:**
✓ Rätt: Siemens-vitvaror, 3-rums, södervänd
✗ Fel: Siemens vitvaror, 3 rums, söder vänd

### 2. GRAMMATIK

**Tempus (tid):**
✓ Rätt: "renoverades 2023" (preteritum för avslutad handling)
✗ Fel: "renoverat 2023" (perfekt particip utan hjälpverb)

✓ Rätt: "har renoverats" (perfekt med hjälpverb)
✗ Fel: "har renoverat" (fel form)

**Genus (kön):**
✓ Rätt: köket (neutrum), bostaden (utrum), rummet (neutrum)
✗ Fel: köken, bostaderna, rummen (fel form)

**Plural:**
✓ Rätt: badrum → badrum (oförändrat i plural)
✗ Fel: badrum → badrummen

✓ Rätt: sovrum → sovrum (oförändrat i plural)
✗ Fel: sovrum → sovrummen

**Adjektivböjning:**
✓ Rätt: "den södervända uteplatsen" (bestämd form, -a)
✗ Fel: "den södervänd uteplatsen" (grundform)

✓ Rätt: "ett renoverat kök" (neutrum, -t)
✗ Fel: "ett renoverad kök" (utrum-form)

### 3. INTERPUNKTION

**Punkt mellan meningar:**
✓ Rätt: "Köket är renoverat. Badrummet är helkaklat."
✗ Fel: "Köket är renoverat, badrummet är helkaklat." (komma mellan huvudsatser)

**Ingen punkt i rubrik:**
✓ Rätt: "Charmig villa med pool"
✗ Fel: "Charmig villa med pool."

**Komma före "och":**
✓ Rätt: "kök, vardagsrum och sovrum" (ingen komma före sista "och")
✗ Fel: "kök, vardagsrum, och sovrum"

✓ Rätt: "Köket är stort, modernt och ljust" (uppräkning av adjektiv)
✗ Fel: "Köket är stort modernt och ljust" (saknar komman)

### 4. NATURLIGT SPRÅK

**Använd AKTIVA verb:**
✓ Rätt: har, ger, samlar, ligger, finns
✗ Fel: erbjuder, bjuder på, inbjuder till

**Undvik PASSIVA konstruktioner:**
✓ Rätt: "Köket har köksö och kompositbänk"
✗ Fel: "Köket erbjuder köksö och kompositbänk"

**Undvik AI-KLYSCHOR:**
✗ Fel: "Välkommen till", "fantastisk", "drömboende", "för den som", 
       "i hjärtat av", "skapar en känsla av"
✓ Rätt: Börja direkt med konkret information, använd naturliga beskrivningar

**Var KONKRET, inte abstrakt:**
✓ Rätt: "Köket renoverades 2023 med köksö, kompositbänk och Siemens-vitvaror"
✗ Fel: "Köket erbjuder generösa ytor och moderna lösningar"
```

#### Concrete Examples Section

```markdown
## EXEMPEL PÅ PERFEKT SVENSKA

### Exempel 1: Köksbeskrivning

✓ RÄTT:
"Köket renoverades 2023 med köksö, kompositbänk och integrerade 
Siemens-vitvaror. Planlösningen samlar kök och vardagsrum i vinkel, 
med skjutdörrar ut mot den södervända uteplatsen."

✗ FEL:
"Köket renoverat 2023 med kökö, komposit bänk och integrerade 
Siemens vitvaror. Planlösningen erbjuder kök och vardagsrum i vinkel, 
med skjutdörrar ut mot den södervänd uteplatsen."

Fel i exemplet:
- "renoverat" → ska vara "renoverades" (preteritum)
- "kökö" → ska vara "köksö" (sammansatt ord)
- "komposit bänk" → ska vara "kompositbänk" (sammansatt ord)
- "Siemens vitvaror" → ska vara "Siemens-vitvaror" (bindestreck)
- "erbjuder" → ska vara "samlar" eller "har" (aktivt verb)
- "södervänd" → ska vara "södervända" (bestämd form adjektiv)

### Exempel 2: Öppningsmening

✓ RÄTT:
"En södervänd uteplats med inbyggd jacuzzi och utsikt över vattnet. 
Villa om 146 kvm med öppen planlösning och renoverat kök från 2023."

✗ FEL:
"Välkommen till denna fantastiska villa som erbjuder generösa ytor 
och moderna lösningar i ett attraktivt läge."

Fel i exemplet:
- "Välkommen till" → AI-klysch, börja direkt med konkret USP
- "fantastiska" → överdrivet adjektiv
- "erbjuder" → passivt verb
- "generösa ytor" → vagt, ange konkret storlek
- "moderna lösningar" → abstrakt, beskriv konkret vad som är modernt

### Exempel 3: Lägesbeskrivning

✓ RÄTT:
"Lugnt läge i Mörtnäs med 5 minuter till pendelbåt och 10 minuter 
till Waxholms centrum. Mataffär och förskola ligger runt hörnet."

✗ FEL:
"Bostaden ligger i hjärtat av Mörtnäss och erbjuder närhet till 
stadens puls med alla bekvämligheter inom räckhåll."

Fel i exemplet:
- "i hjärtat av" → AI-klysch
- "Mörtnäss" → felstavat, ska vara "Mörtnäs"
- "erbjuder" → passivt verb
- "stadens puls" → AI-klysch
- "alla bekvämligheter" → vagt, var konkret
```

#### Self-Check Checklist

```markdown
## SJÄLVKONTROLL (KRITISKT!)

Innan du är klar, kontrollera VARJE punkt:

1. ✓ Har jag stavat ALLA ord rätt?
   - Särskilt sammansatta ord (köksö, kompositbänk)
   - Särskilt ortnamn (Mörtnäs, Södermalm)
   - Särskilt material (helkaklat, parkettgolv)

2. ✓ Är grammatiken korrekt?
   - Rätt tempus: "renoverades" inte "renoverat"
   - Rätt genus: "köket" inte "köken"
   - Rätt adjektivböjning: "södervända" inte "södervänd"

3. ✓ Är interpunktionen korrekt?
   - Punkt mellan meningar (inte komma)
   - Ingen punkt i rubrik
   - Komma före "och" bara vid uppräkning av 3+

4. ✓ Låter det naturligt på svenska?
   - Aktiva verb (har, ger) inte passiva (erbjuder)
   - Konkreta beskrivningar, inte abstrakta
   - Naturligt mäklarspråk, inte AI-genererat

5. ✓ Har jag undvikit upprepningar?
   - Samma ord/fraser upprepas inte onödigt
   - Varierat meningsstarter
   - Varierat ordval

6. ✓ Har jag undvikit AI-klyschor?
   - Ingen "välkommen till"
   - Ingen "fantastisk", "drömboende"
   - Ingen "för den som", "i hjärtat av"
   - Ingen "erbjuder", "bjuder på"

Om du svarar NEJ på någon punkt: GÅ TILLBAKA OCH FIXA!
```

### Expert Analysis Prompt Architecture

The Expert Analysis prompt creates a dual-perspective review from both a broker and lawyer viewpoint.

#### Analysis Prompt Structure

```markdown
Du är en senior svensk mäklare OCH jurist med 20 års erfarenhet. 
Din uppgift är att analysera mäklartexter och ge konstruktiv, 
professionell feedback.

## DIN EXPERTIS

### 1. MÄKLARPROSA (Broker Perspective)
- Du känner igen naturligt vs AI-genererat språk
- Du vet vad som säljer vs vad som är generiskt
- Du förstår målgrupper och tonalitet
- Du identifierar upprepningar och svaga formuleringar

### 2. JURIDIK (Lawyer Perspective)
- Du känner till mäklarregler och konsumentskydd
- Du identifierar vilseledande påståenden
- Du säkerställer faktakorrekthet
- Du kontrollerar att texten följer branschregler

### 3. PEDAGOGIK (Teaching Approach)
- Du ger KONKRETA förslag (inte vaga)
- Du förklarar VARFÖR något är bra/dåligt
- Du är KONSTRUKTIV (inte bara kritisk)
- Du prioriterar de viktigaste förbättringarna

## DIN ANALYSPROCESS

### STEG 1: LÄS TEXTEN
Läs hela texten noggrant. Notera:
- Vad är BRA? (minst 3 konkreta styrkor)
- Vad kan FÖRBÄTTRAS? (konkreta problem med lösningar)
- Finns JURIDISKA problem? (vilseledande, felaktigt, olämpligt)

### STEG 2: IDENTIFIERA STYRKOR
Lista 3-5 konkreta styrkor. Exempel:
✓ "Stark öppning med konkret USP (jacuzzi med utsikt)"
✓ "Naturligt mäklarspråk utan AI-klyschor"
✓ "Bra balans mellan fakta och säljande ton"
✓ "Tydlig struktur med logiskt flöde"
✓ "Konkreta detaljer (renoverat 2023, Siemens-vitvaror)"

### STEG 3: IDENTIFIERA FÖRBÄTTRINGSOMRÅDEN
För varje problem, ge:
- VAD är problemet? (konkret beskrivning)
- VAR finns det? (exakt plats: stycke, mening)
- HUR fixar man det? (konkret förslag)
- Hur ALLVARLIGT är det? (critical/important/suggestion)

Exempel:
{
  "issue": "Adress upprepas i öppning",
  "location": "Stycke 1, mening 2",
  "suggestion": "Ta bort 'på Ekorrvägen 10...' från andra meningen 
                 eftersom adressen redan nämnts i första meningen",
  "severity": "suggestion",
  "category": "clarity",
  "expert": "broker"
}

### STEG 4: JURIDISK KONTROLL
Kontrollera:
- Finns vilseledande påståenden? (överdrifter, obekräftade fakta)
- Är fakta korrekt presenterade? (storlekar, år, material)
- Följer texten mäklarregler? (ingen diskriminering, korrekt info)

## OUTPUT FORMAT

Svara ENDAST med JSON i denna exakta struktur:

{
  "overallQuality": 8.5,  // 0-10, där 10 är perfekt
  "strengths": [
    "Konkret styrka 1",
    "Konkret styrka 2",
    "Konkret styrka 3"
  ],
  "improvements": [
    {
      "id": "uuid",
      "issue": "Konkret problem",
      "location": "Exakt var (stycke X, mening Y)",
      "textSpan": { "start": 45, "end": 67, "field": "improvedPrompt" },
      "suggestion": "Konkret förslag hur man fixar",
      "category": "grammar|style|legal|broker_realism|clarity",
      "severity": "critical|important|suggestion",
      "expert": "broker|lawyer",
      "actionable": true,
      "autoFix": "Exakt ersättningstext (om actionable)"
    }
  ],
  "legalCheck": {
    "compliant": true,
    "notes": "Eventuella juridiska noteringar",
    "issues": []
  }
}

## KATEGORIER

- **grammar**: Grammatiska fel, stavfel, interpunktion
- **style**: Språklig stil, tonalitet, ordval
- **legal**: Juridiska problem, vilseledande påståenden
- **broker_realism**: AI-klyschor, onaturligt språk
- **clarity**: Otydlighet, upprepningar, struktur

## SEVERITY LEVELS

- **critical**: Måste fixas (grammatikfel, juridiska problem)
- **important**: Bör fixas (AI-klyschor, upprepningar)
- **suggestion**: Kan förbättras (mindre stilfrågor)
```

### Prompt Optimization Techniques

#### 1. Few-Shot Learning

Include 2-3 complete examples in the prompt showing the desired output quality:

```markdown
## EXEMPEL PÅ PERFEKT OUTPUT

Input disposition: [villa, 146 kvm, renoverat kök 2023, jacuzzi]

Output:
{
  "improvedPrompt": "En södervänd uteplats med inbyggd jacuzzi och 
  utsikt över vattnet. Villa om 146 kvm med öppen planlösning och 
  renoverat kök från 2023...",
  "headline": "Villa med jacuzzi och sjöutsikt",
  ...
}
```

#### 2. Chain-of-Thought Prompting

Explicitly instruct the model to think step-by-step:

```markdown
Innan du skriver, tänk igenom:
1. Vad är mest unikt med denna bostad?
2. Vilka fakta är viktigast för köparen?
3. Hur kan jag vara konkret och specifik?
4. Vilka ord/fraser ska jag undvika?

Skriv sedan texten baserat på din analys.
```

#### 3. Self-Consistency

Ask the model to verify its own output:

```markdown
Efter att du skrivit texten, läs igenom den och kontrollera:
- Finns några stavfel? Om ja, rätta dem.
- Finns några AI-klyschor? Om ja, skriv om.
- Är alla meningar grammatiskt korrekta? Om nej, fixa dem.
```

#### 4. Temperature and Top-P Tuning

For Smart Generation (reasoning:medium):
- Temperature: 0.7 (balanced creativity and consistency)
- Top-P: 0.9 (diverse but coherent output)

For Expert Analysis (reasoning:low):
- Temperature: 0.3 (more deterministic, consistent feedback)
- Top-P: 0.8 (focused, relevant suggestions)

#### 5. Token Budget Management

- Smart Generation: ~2000 tokens for prompt, ~1500 tokens for completion
- Expert Analysis: ~1500 tokens for prompt, ~1000 tokens for completion
- Selection Edit: ~500 tokens for prompt, ~300 tokens for completion

### Prompt Version Control

Store prompts in version-controlled templates:

```typescript
// server/lib/prompts/smart-generation-v1.ts
export const SMART_GENERATION_PROMPT_V1 = {
  version: '1.0.0',
  systemRole: `...`,
  processInstructions: `...`,
  swedishRules: `...`,
  examples: `...`,
  selfCheck: `...`,
  outputFormat: `...`
};

// server/lib/prompts/expert-analysis-v1.ts
export const EXPERT_ANALYSIS_PROMPT_V1 = {
  version: '1.0.0',
  systemRole: `...`,
  analysisProcess: `...`,
  outputFormat: `...`
};
```

### A/B Testing Prompts

Test prompt variations to optimize quality:

```typescript
interface PromptVariant {
  id: string;
  version: string;
  changes: string;
  metrics: {
    spellingErrorRate: number;
    grammarScore: number;
    brokerRealismScore: number;
    avgGenerationTime: number;
  };
}

// Example: Test different self-check emphasis
const variantA = {
  id: 'self-check-emphasis-high',
  selfCheck: 'KRITISKT! Dubbelkolla VARJE ord...'
};

const variantB = {
  id: 'self-check-emphasis-medium',
  selfCheck: 'Viktigt: Kontrollera stavning...'
};
```


## Performance Optimization

### Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Smart Generation | 15-18s | <20s |
| Post-Processing | <1s | <2s |
| Expert Analysis | 5-7s | <10s |
| Total Pipeline | <25s | <30s |
| Success Rate | 95%+ | >90% |

### Optimization Strategies

#### 1. Parallel Execution Where Possible

While the main pipeline steps must run sequentially, auxiliary operations can run in parallel:

```typescript
async function executeNewPipeline(request: PipelineRequest): Promise<PipelineResult> {
  // Step 1: Smart Generation (must complete first)
  const generationResult = await smartGeneration.generate(request);
  
  // Step 2: Post-Processing (must complete before analysis)
  const postProcessResult = await postProcessor.process({
    ...generationResult,
    disposition: request.disposition,
    style: request.style,
    platform: request.platform
  });
  
  // Step 3: Expert Analysis + Metrics Collection (parallel)
  const [analysisResult, metricsLogged] = await Promise.all([
    expertAnalyzer.analyze({
      improvedPrompt: postProcessResult.improvedPrompt,
      headline: postProcessResult.headline,
      socialCopy: postProcessResult.socialCopy,
      disposition: request.disposition,
      style: request.style,
      platform: request.platform
    }),
    logMetrics({
      step1Duration: generationResult.duration,
      step2Duration: postProcessResult.duration
    })
  ]);
  
  return {
    ...postProcessResult,
    expertAnalysis: analysisResult,
    metrics: {
      totalDuration: generationResult.duration + postProcessResult.duration + analysisResult.duration,
      step1Duration: generationResult.duration,
      step2Duration: postProcessResult.duration,
      step3Duration: analysisResult.duration,
      retryCount: 0
    }
  };
}
```

#### 2. OpenAI API Optimization

**Request Optimization**:
- Use streaming for real-time progress updates
- Set appropriate max_tokens limits
- Use reasoning:medium for generation, reasoning:low for analysis
- Implement request batching where possible

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-5.2',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 1500,
  reasoning: 'medium',
  stream: true, // Enable streaming for progress updates
  timeout: 20000 // 20 second timeout
});

// Process stream for progress updates
for await (const chunk of completion) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    emitProgress('smart_generation', calculateProgress(content));
  }
}
```

**Connection Pooling**:
```typescript
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 20000
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: httpsAgent
});
```

#### 3. Caching Strategy

**Redis Caching**:

```typescript
// Cache prompt templates (1 hour TTL)
async function getPromptTemplate(name: string, version: string): Promise<string> {
  const cacheKey = `prompt:template:${name}:${version}`;
  
  const cached = await redis.get(cacheKey);
  if (cached) return cached;
  
  const template = await loadPromptTemplate(name, version);
  await redis.setex(cacheKey, 3600, template);
  
  return template;
}

// Cache A/B test assignments (24 hour TTL)
async function getABTestAssignment(userId: number, sessionId: string): Promise<string> {
  const cacheKey = `ab_test:session:${sessionId}`;
  
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached).variant;
  
  const assignment = await assignVariant(userId, sessionId);
  await redis.setex(cacheKey, 86400, JSON.stringify(assignment));
  
  return assignment.variant;
}

// Cache forbidden phrases list (5 minute TTL)
async function getForbiddenPhrases(style: WritingStyle): Promise<string[]> {
  const cacheKey = `forbidden:phrases:${style}`;
  
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const phrases = computeForbiddenPhrases(style);
  await redis.setex(cacheKey, 300, JSON.stringify(phrases));
  
  return phrases;
}
```

#### 4. Database Query Optimization

**Connection Pooling**:
```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Prepared Statements**:
```typescript
// Prepare frequently used queries
const INSERT_GENERATION = `
  INSERT INTO pipeline_generations 
  (user_id, session_id, variant, disposition, style, platform, 
   improved_prompt, headline, expert_analysis, total_duration, success)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  RETURNING id
`;

async function saveGeneration(data: GenerationData): Promise<number> {
  const result = await pool.query(INSERT_GENERATION, [
    data.userId,
    data.sessionId,
    data.variant,
    JSON.stringify(data.disposition),
    data.style,
    data.platform,
    data.improvedPrompt,
    data.headline,
    JSON.stringify(data.expertAnalysis),
    data.totalDuration,
    data.success
  ]);
  
  return result.rows[0].id;
}
```

**Batch Inserts for Metrics**:
```typescript
// Batch insert feedback items instead of one-by-one
async function saveFeedbackItems(generationId: number, items: FeedbackItem[]): Promise<void> {
  if (items.length === 0) return;
  
  const values = items.map((item, index) => {
    const offset = index * 10;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, 
            $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, 
            $${offset + 9}, $${offset + 10})`;
  }).join(', ');
  
  const params = items.flatMap(item => [
    generationId,
    item.id,
    item.issue,
    item.location,
    JSON.stringify(item.textSpan),
    item.suggestion,
    item.category,
    item.severity,
    item.expert,
    item.actionable
  ]);
  
  await pool.query(`
    INSERT INTO expert_feedback_items 
    (generation_id, feedback_id, issue, location, text_span, 
     suggestion, category, severity, expert, actionable)
    VALUES ${values}
  `, params);
}
```

#### 5. Post-Processor Optimization

**Compiled Regex Patterns**:
```typescript
// Pre-compile regex patterns for reuse
const PLACEHOLDER_PATTERNS = {
  TID: /\[TID\]/gi,
  KONTAKT: /\[KONTAKT\]/gi,
  MÄKLARE: /\[MÄKLARE\]/gi,
  ADRESS: /\[ADRESS\]/gi
};

const FORMATTING_PATTERNS = {
  missingPeriod: /([a-zåäö])\s+([A-ZÅÄÖ])/g,
  multipleSpaces: /\s{2,}/g,
  headlinePeriod: /\.$/
};

// Compile forbidden phrase patterns once
const FORBIDDEN_PHRASE_PATTERNS = FORBIDDEN_PHRASES.map(phrase => ({
  phrase,
  pattern: new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
}));
```

**Efficient String Operations**:
```typescript
// Use string builder pattern for multiple replacements
function applyTransformations(text: string, transformations: Array<[RegExp, string]>): string {
  let result = text;
  
  for (const [pattern, replacement] of transformations) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

// Batch transformations instead of multiple passes
function postProcess(text: string): string {
  return applyTransformations(text, [
    [PLACEHOLDER_PATTERNS.TID, ''],
    [PLACEHOLDER_PATTERNS.KONTAKT, ''],
    [PLACEHOLDER_PATTERNS.MÄKLARE, ''],
    [FORMATTING_PATTERNS.multipleSpaces, ' '],
    [FORMATTING_PATTERNS.missingPeriod, '$1. $2']
  ]);
}
```

#### 6. WebSocket Optimization

**Connection Pooling**:
```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  server: httpServer,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    threshold: 1024
  }
});
```

**Efficient Event Emission**:
```typescript
// Batch progress updates to avoid flooding
class ProgressEmitter {
  private lastEmit: number = 0;
  private minInterval: number = 500; // ms
  
  emit(sessionId: string, event: ProgressEvent): void {
    const now = Date.now();
    
    if (now - this.lastEmit < this.minInterval) {
      return; // Skip if too soon
    }
    
    this.lastEmit = now;
    
    const ws = getWebSocket(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }
}
```

#### 7. Memory Management

**Streaming Large Responses**:
```typescript
// Stream large text responses instead of buffering
async function streamGeneration(request: PipelineRequest): Promise<void> {
  const stream = await openai.chat.completions.create({
    ...config,
    stream: true
  });
  
  let buffer = '';
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    buffer += content;
    
    // Emit progress without storing full text in memory
    if (buffer.length > 100) {
      emitProgress('smart_generation', buffer.length);
    }
  }
  
  return buffer;
}
```

**Garbage Collection Hints**:
```typescript
// Clear large objects after use
async function executeGeneration(request: PipelineRequest): Promise<PipelineResult> {
  let disposition = request.disposition;
  
  const result = await generate(disposition);
  
  // Clear reference to allow GC
  disposition = null;
  
  return result;
}
```

### Performance Monitoring

**Metrics Collection**:

```typescript
interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

class PerformanceMonitor {
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      await this.recordMetric({
        operation,
        duration,
        timestamp: new Date(),
        metadata: { ...metadata, success: true }
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      await this.recordMetric({
        operation,
        duration,
        timestamp: new Date(),
        metadata: { ...metadata, success: false, error: error.message }
      });
      
      throw error;
    }
  }
  
  private async recordMetric(metric: PerformanceMetrics): Promise<void> {
    // Log to monitoring system
    logger.info('Performance metric', metric);
    
    // Send to Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${metric.operation}: ${metric.duration}ms`,
      level: 'info',
      data: metric.metadata
    });
    
    // Alert if threshold exceeded
    if (this.exceedsThreshold(metric)) {
      await this.sendAlert(metric);
    }
  }
  
  private exceedsThreshold(metric: PerformanceMetrics): boolean {
    const thresholds: Record<string, number> = {
      'smart_generation': 20000,
      'post_processing': 2000,
      'expert_analysis': 10000,
      'total_pipeline': 30000
    };
    
    return metric.duration > (thresholds[metric.operation] || Infinity);
  }
}
```

**Real-Time Dashboards**:

```typescript
// Export metrics to monitoring dashboard
async function exportMetrics(): Promise<void> {
  const metrics = await pool.query(`
    SELECT 
      variant,
      AVG(total_duration) as avg_duration,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_duration) as p50_duration,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration) as p95_duration,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY total_duration) as p99_duration,
      COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*) as success_rate
    FROM pipeline_generations
    WHERE created_at > NOW() - INTERVAL '1 hour'
    GROUP BY variant
  `);
  
  for (const row of metrics.rows) {
    // Send to monitoring system (e.g., Sentry, Datadog)
    await sendMetric('pipeline.duration.avg', row.avg_duration, { variant: row.variant });
    await sendMetric('pipeline.duration.p95', row.p95_duration, { variant: row.variant });
    await sendMetric('pipeline.success_rate', row.success_rate, { variant: row.variant });
  }
}
```

### Load Testing

**Test Scenarios**:

```typescript
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<30000'], // 95% of requests under 30s
    'http_req_failed': ['rate<0.05'],     // Less than 5% failure rate
  },
};

export default function () {
  const payload = JSON.stringify({
    disposition: generateMockDisposition(),
    style: 'balanced',
    platform: 'hemnet',
    targetWordMin: 200,
    targetWordMax: 400
  });
  
  const response = http.post('http://localhost:5000/api/optimize', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'duration < 25s': (r) => r.timings.duration < 25000,
    'has improvedPrompt': (r) => JSON.parse(r.body).improvedPrompt !== undefined,
  });
}
```

### Scalability Considerations

**Horizontal Scaling**:
- Deploy multiple instances behind load balancer
- Use Redis for shared session state
- Database connection pooling per instance
- Stateless design for easy scaling

**Rate Limiting**:
```typescript
import rateLimit from 'express-rate-limit';

const pipelineLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per user
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Du har nått din gräns för genereringar. Försök igen om en minut.'
    });
  }
});

app.post('/api/optimize', pipelineLimiter, async (req, res) => {
  // Handle request
});
```

**Queue-Based Processing** (for future scaling):
```typescript
import Bull from 'bull';

const generationQueue = new Bull('generation', {
  redis: process.env.REDIS_URL
});

// Producer
async function queueGeneration(request: PipelineRequest): Promise<string> {
  const job = await generationQueue.add(request, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
  
  return job.id;
}

// Consumer
generationQueue.process(async (job) => {
  const request = job.data;
  const result = await orchestrator.execute(request);
  return result;
});
```


## Implementation Roadmap

### Phase 1: Backend Core (Week 1)

**Days 1-2: Smart Generation Engine**
- Create `server/lib/perfect-swedish-generator.ts`
- Implement prompt building with Swedish language rules
- Add concrete examples and self-check instructions
- Integrate OpenAI GPT-5.2 with reasoning:medium
- Add error handling and retry logic
- Write unit tests for prompt building
- Test with 20 different dispositions

**Days 3-4: Post-Processor**
- Create `server/lib/perfect-swedish-post-processor.ts`
- Implement placeholder removal
- Add formatting fixes (punctuation, spacing)
- Implement forbidden phrase removal with style awareness
- Add Swedish character normalization
- Implement transformation logging
- Write unit tests for each transformation type
- Verify idempotence with property tests

**Day 5: Expert Analyzer**
- Create `server/lib/perfect-swedish-analyzer.ts`
- Implement analysis prompt with dual perspective
- Integrate OpenAI GPT-5.2 with reasoning:low
- Add JSON parsing and validation
- Implement text span identification
- Add auto-fix generation for actionable feedback
- Write unit tests for analysis structure

### Phase 2: Pipeline Integration (Week 2)

**Days 6-7: Pipeline Orchestrator**
- Create `server/lib/perfect-swedish-orchestrator.ts`
- Implement 3-step pipeline execution
- Add retry logic with exponential backoff
- Implement fallback to old pipeline
- Add WebSocket progress events
- Integrate with existing quota system
- Write integration tests for full pipeline

**Days 8-9: A/B Testing Infrastructure**
- Create `server/lib/perfect-swedish-ab-test.ts`
- Implement feature flag management
- Add variant assignment with session consistency
- Create database tables for assignments and metrics
- Implement metrics tracking per variant
- Add manual override support
- Write tests for assignment consistency

**Day 10: API Integration**
- Add new endpoint `/api/optimize-v2` (or update existing)
- Integrate orchestrator with routes
- Add backward compatibility checks
- Implement error handling and user notifications
- Add Sentry integration for monitoring
- Test with existing frontend

### Phase 3: Frontend Enhancement (Week 3)

**Days 11-12: InlineHighlights Component**
- Create `client/src/components/InlineHighlights.tsx`
- Implement text span highlighting with color coding
- Add tooltip display on hover
- Implement Fix button integration
- Add support for overlapping highlights
- Implement real-time updates on text edits
- Write component tests

**Days 13-14: ExpertFeedbackPanel Component**
- Create `client/src/components/ExpertFeedbackPanel.tsx`
- Implement feedback grouping by category
- Add category counts and filtering
- Implement click-to-scroll navigation
- Add action buttons (Fix, AI Suggest, Dismiss)
- Implement real-time feedback resolution
- Write component tests

**Days 15-16: OneClickFix & AIAssistedSelectionEdit**
- Create `client/src/components/OneClickFix.tsx`
- Implement automatic fix application
- Add undo/redo support
- Create `client/src/components/AIAssistedSelectionEdit.tsx`
- Implement text selection detection
- Add AI suggestion generation
- Implement preview and replacement
- Write component tests

**Day 17: Integration & Polish**
- Integrate all components into ResultSection
- Add loading states and error handling
- Implement WebSocket event handling
- Add animations and transitions
- Test complete user workflow
- Fix bugs and polish UX

### Phase 4: Testing & Optimization (Week 4)

**Days 18-19: Comprehensive Testing**
- Write property-based tests for all correctness properties
- Add integration tests for complete workflows
- Perform load testing with k6
- Test with real broker dispositions
- Gather internal feedback
- Fix identified issues

**Days 20-21: Performance Optimization**
- Profile pipeline performance
- Optimize slow operations
- Implement caching where beneficial
- Optimize database queries
- Test under load
- Verify performance targets met

**Days 22-23: Monitoring & Alerting**
- Set up Sentry monitoring
- Configure alert thresholds
- Create monitoring dashboards
- Implement daily summary reports
- Test alert notifications
- Document monitoring procedures

**Day 24: Documentation & Deployment Prep**
- Complete API documentation
- Write deployment guide
- Create runbook for operations
- Document troubleshooting procedures
- Prepare rollback plan
- Final code review

### Phase 5: Gradual Rollout (Week 5)

**Day 25: Staging Deployment**
- Deploy to staging environment
- Run smoke tests
- Test with staging data
- Verify monitoring and alerts
- Fix any deployment issues

**Days 26-27: Canary Deployment (10%)**
- Enable feature flag for 10% of users
- Monitor success rate and performance
- Collect user feedback
- Analyze A/B test metrics
- Fix any critical issues

**Days 28-29: Expanded Rollout (50%)**
- Increase to 50% of users
- Continue monitoring metrics
- Analyze comparative performance
- Gather more user feedback
- Optimize based on findings

**Day 30: Full Rollout (100%)**
- Enable for all users
- Monitor for 24 hours
- Analyze final metrics
- Celebrate success! 🎉
- Plan next iteration

### Success Criteria

**Quality Metrics**:
- ✅ Zero spelling errors (100% correct Swedish)
- ✅ 95%+ grammatical correctness
- ✅ 90%+ broker realism score
- ✅ Expert analysis quality score >9.0

**Performance Metrics**:
- ✅ Total pipeline time <25 seconds
- ✅ Smart Generation: 15-18 seconds
- ✅ Post-Processing: <1 second
- ✅ Expert Analysis: 5-7 seconds

**Reliability Metrics**:
- ✅ 95%+ success rate
- ✅ <10% fallback rate
- ✅ <5% error rate

**User Satisfaction Metrics**:
- ✅ 90%+ satisfied with initial quality
- ✅ 85%+ use expert feedback
- ✅ 80%+ accept with minor edits
- ✅ <15% regeneration rate

### Risk Mitigation

**Risk 1: OpenAI API Reliability**
- Mitigation: Implement robust retry logic
- Mitigation: Fall back to old pipeline on failure
- Mitigation: Monitor API status and adjust rate limits

**Risk 2: Performance Degradation**
- Mitigation: Implement caching for common operations
- Mitigation: Optimize database queries
- Mitigation: Set up performance monitoring and alerts

**Risk 3: Quality Regression**
- Mitigation: Comprehensive testing before rollout
- Mitigation: A/B testing to compare with old pipeline
- Mitigation: Quick rollback capability via feature flag

**Risk 4: User Adoption**
- Mitigation: Clear communication about new features
- Mitigation: Intuitive UI for editing tools
- Mitigation: Gradual rollout to gather feedback

**Risk 5: Database Load**
- Mitigation: Connection pooling and query optimization
- Mitigation: Batch inserts for metrics
- Mitigation: Monitor database performance

### Rollback Plan

If critical issues are discovered:

1. **Immediate Rollback** (< 5 minutes):
   - Disable feature flag via environment variable
   - All users fall back to old 7-step pipeline
   - No code deployment needed

2. **Investigation** (< 1 hour):
   - Review error logs in Sentry
   - Analyze performance metrics
   - Identify root cause

3. **Fix & Redeploy** (< 4 hours):
   - Implement fix
   - Test in staging
   - Deploy to production
   - Re-enable feature flag gradually

4. **Communication**:
   - Notify users of temporary issue (if visible)
   - Update status page
   - Post-mortem document for team

### Post-Launch Activities

**Week 6: Monitoring & Optimization**
- Daily review of metrics
- Analyze user feedback
- Identify optimization opportunities
- Fix minor bugs
- Tune prompts based on results

**Week 7-8: Iteration**
- Implement prompt improvements
- Add requested features
- Optimize performance bottlenecks
- Enhance error messages
- Improve monitoring

**Month 2: Analysis & Planning**
- Comprehensive A/B test analysis
- User satisfaction survey
- ROI calculation
- Plan next features
- Document lessons learned

## Appendix

### Glossary

- **Smart Generation**: First pipeline step using GPT-5.2 reasoning:medium to generate high-quality Swedish text
- **Post-Processor**: Second pipeline step applying deterministic transformations
- **Expert Analyzer**: Third pipeline step providing AI-driven feedback from broker and lawyer perspectives
- **Inline Highlights**: UI component showing feedback directly in text with visual markers
- **Expert Feedback Panel**: UI component displaying structured feedback grouped by category
- **One-Click Fix**: Feature allowing automatic application of suggested improvements
- **AI-Assisted Selection Edit**: Feature providing AI suggestions for selected text
- **A/B Testing**: Methodology for comparing new pipeline against old pipeline
- **Fallback**: Automatic switch to old pipeline when new pipeline fails
- **Broker Realism**: Measure of how natural and authentic text sounds to real estate brokers
- **Property-Based Testing**: Testing methodology that verifies properties across many generated inputs

### References

- **OpenAI GPT-5.2 Documentation**: https://platform.openai.com/docs
- **Swedish Grammar Rules**: Svenska Akademiens grammatik
- **Real Estate Marketing Best Practices**: Mäklarsamfundet guidelines
- **Property-Based Testing**: fast-check documentation
- **React Testing Library**: https://testing-library.com/react
- **Radix UI**: https://www.radix-ui.com/
- **TanStack Query**: https://tanstack.com/query

### Related Documents

- `requirements.md`: Detailed requirements for perfect-swedish-pipeline
- `FINAL_IMPLEMENTATION_PLAN.md`: Original implementation strategy
- `server/lib/text-rules.ts`: Forbidden phrases and language rules
- `server/lib/text-validation.ts`: Text validation logic
- `server/lib/listing-orchestrator.ts`: Current pipeline orchestration

### Contact & Support

**Development Team**:
- Backend Lead: [Contact]
- Frontend Lead: [Contact]
- QA Lead: [Contact]

**Escalation**:
- Critical Issues: [Contact]
- Performance Issues: [Contact]
- User Feedback: [Contact]

---

**Document Version**: 1.0.0  
**Last Updated**: 2024-01-20  
**Status**: Ready for Implementation  
**Approved By**: [Pending]

