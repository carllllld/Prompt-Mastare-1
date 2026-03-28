# Design Document

## Overview

This document provides the technical design for transforming the Hemnet import feature from a form-filling tool into a comprehensive text analysis and improvement system. The design leverages existing components (expert analysis pipeline, inline highlights, one-click fixes) while adding new functionality for analyzing existing listing text.

## High-Level Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  HemnetAnalysisPage                                             │
│  ├── HemnetImportSection (URL input + mode selector)            │
│  ├── OriginalTextDisplay (with InlineHighlights)                │
│  ├── ExpertFeedbackPanel (categorized feedback)                 │
│  ├── ImprovedTextDisplay (side-by-side comparison)              │
│  └── ImageGallery (imported images)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Express)                           │
├─────────────────────────────────────────────────────────────────┤
│  /api/integrations/hemnet/analyze (new endpoint)                │
│  ├── fetchHemnetProperty() - reuse existing                     │
│  ├── analyzeText() - new function                               │
│  ├── expertAnalysisPipeline() - reuse existing                  │
│  └── generateImprovedVersion() - new function                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
├─────────────────────────────────────────────────────────────────┤
│  Hemnet.se (scraping)                                           │
│  OpenAI GPT-5.2 (expert analysis)                               │
│  Image CDN (cached images)                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Import Flow**:
   - User pastes Hemnet URL
   - Frontend validates URL format
   - Backend scrapes Hemnet page
   - Extract text + images + metadata
   - Return to frontend for display

2. **Analysis Flow**:
   - Frontend sends text to analysis endpoint
   - Backend runs expert analysis pipeline
   - Generate feedback items with text spans
   - Stream progress updates via WebSocket
   - Return analysis results

3. **Fix Application Flow**:
   - User clicks fix button
   - Frontend applies text replacement
   - Update local state (undo history)
   - Mark feedback as resolved
   - Re-render with updated text

4. **Improved Version Flow**:
   - User clicks "Generate Improved"
   - Frontend collects all accepted fixes
   - Backend applies fixes in order
   - Return improved version
   - Display side-by-side comparison

## Component Design

### Frontend Components

#### 1. HemnetAnalysisPage (New)

**Purpose**: Main page for Hemnet text analysis feature

**Location**: `client/src/pages/HemnetAnalysis.tsx`

**Props**: None (uses URL params for state)

**State**:
```typescript
interface HemnetAnalysisState {
  mode: 'generate' | 'analyze';
  hemnetUrl: string;
  originalText: string;
  editedText: string;
  metadata: HemnetProperty | null;
  images: string[];
  analysis: ExpertAnalysis | null;
  improvedVersion: string | null;
  isLoading: boolean;
  error: string | null;
}
```

**Key Methods**:
- `handleImport(url: string)` - Import from Hemnet
- `handleAnalyze()` - Trigger analysis
- `handleGenerateImproved()` - Generate improved version
- `handleModeChange(mode)` - Switch between generate/analyze


#### 2. HemnetImportSection (Modified)

**Purpose**: URL input with mode selector (generate vs analyze)

**Location**: `client/src/components/IntegrationsPanel.tsx` (extend existing)

**Props**:
```typescript
interface HemnetImportSectionProps {
  mode: 'generate' | 'analyze';
  onModeChange: (mode: 'generate' | 'analyze') => void;
  onImport: (data: HemnetImportResult) => void;
  isPro: boolean;
}
```

**UI Structure**:
```
┌─────────────────────────────────────────────────────────┐
│ Mode Selector: [Generate New] [Analyze Existing]       │
├─────────────────────────────────────────────────────────┤
│ URL Input: [https://hemnet.se/bostader/...]  [Import]  │
└─────────────────────────────────────────────────────────┘
```

**Behavior**:
- Show mode selector as tabs or radio buttons
- Validate URL format before import
- Show loading state during import
- Display error messages inline
- Track quota usage separately for analysis

#### 3. OriginalTextDisplay (New)

**Purpose**: Display imported text with inline highlights

**Location**: `client/src/components/HemnetTextDisplay.tsx`

**Props**:
```typescript
interface OriginalTextDisplayProps {
  text: string;
  feedback: FeedbackItem[];
  onTextChange: (newText: string) => void;
  onFixClick: (feedbackId: string) => void;
  isEditable: boolean;
}
```

**Features**:
- Reuse `InlineHighlights` component
- Show colored underlines for issues
- Tooltip on hover with details
- Click to apply fix
- Undo/redo support

#### 4. ImprovedTextDisplay (New)

**Purpose**: Side-by-side comparison of original vs improved

**Location**: `client/src/components/HemnetComparison.tsx`

**Props**:
```typescript
interface ImprovedTextDisplayProps {
  originalText: string;
  improvedText: string;
  changes: TextChange[];
  onCopy: () => void;
  onExport: () => void;
}

interface TextChange {
  type: 'addition' | 'deletion' | 'modification';
  originalSpan: { start: number; end: number };
  improvedSpan: { start: number; end: number };
  category: FeedbackCategory;
}
```

**UI Structure**:
```
┌──────────────────────┬──────────────────────┐
│   Original Text      │   Improved Text      │
├──────────────────────┼──────────────────────┤
│ Text with deletions  │ Text with additions  │
│ highlighted in red   │ highlighted in green │
└──────────────────────┴──────────────────────┘
```

#### 5. ImageGallery (Reuse Existing)

**Purpose**: Display imported Hemnet images

**Location**: Reuse existing image display logic from `ResultSection.tsx`

**Features**:
- Grid layout with thumbnails
- Click to view full-screen
- Show image count
- Handle loading/error states

### Backend Components

#### 1. Hemnet Analysis Endpoint (New)

**Route**: `POST /api/integrations/hemnet/analyze`

**Request Schema**:
```typescript
const hemnetAnalyzeSchema = z.object({
  url: z.string().url().refine(
    (url) => /hemnet\.se\/bostader\//.test(url),
    "URL must be a hemnet.se/bostader/ link"
  ),
  mode: z.enum(['analyze', 'generate']).default('analyze'),
});
```

**Response Schema**:
```typescript
const hemnetAnalyzeResponseSchema = z.object({
  property: hemnetPropertySchema,
  originalText: z.string(),
  analysis: expertAnalysisSchema,
  images: z.array(z.string()),
  metadata: z.object({
    wordCount: z.number(),
    paragraphCount: z.number(),
    sentenceCount: z.number(),
  }),
});
```

**Implementation**:
```typescript
async function handleHemnetAnalyze(req, res) {
  // 1. Validate request
  const { url, mode } = hemnetAnalyzeSchema.parse(req.body);
  
  // 2. Check quota (separate from text generation)
  await checkAnalysisQuota(req.user);
  
  // 3. Fetch Hemnet property (reuse existing)
  const property = await fetchHemnetProperty(url);
  
  // 4. Extract description text
  const originalText = property.description || '';
  if (!originalText || originalText.length < 50) {
    throw new Error('No description found in listing');
  }
  
  // 5. Run expert analysis pipeline
  const analysis = await runExpertAnalysis(originalText, property);
  
  // 6. Track usage
  await trackAnalysisUsage(req.user);
  
  // 7. Return results
  return res.json({
    property,
    originalText,
    analysis,
    images: property.imageUrls || [],
    metadata: {
      wordCount: originalText.split(/\s+/).length,
      paragraphCount: originalText.split('\n\n').length,
      sentenceCount: originalText.split(/[.!?]+/).length,
    },
  });
}
```

#### 2. Expert Analysis Pipeline (Reuse Existing)

**Function**: `runExpertAnalysis(text: string, context: any)`

**Location**: Reuse existing pipeline from `server/routes.ts`

**Modifications Needed**:
- Extract into separate module: `server/lib/expert-analysis.ts`
- Make context parameter optional
- Add text span detection for feedback items
- Generate auto-fix suggestions for actionable items

**Pipeline Steps**:
1. **Broker Analysis**: Analyze broker realism, style, structure
2. **Lawyer Analysis**: Check legal compliance, forbidden phrases
3. **Grammar Check**: Identify grammar and spelling issues
4. **Clarity Check**: Detect unclear or ambiguous phrasing
5. **Text Span Detection**: Map issues to character positions
6. **Auto-Fix Generation**: Create replacement text for fixes

**Output Format**:
```typescript
interface ExpertAnalysis {
  overallQuality: number; // 0-10
  strengths: string[];
  improvements: FeedbackItem[];
  legalCheck: {
    compliant: boolean;
    notes: string;
    issues: string[];
  };
  duration: number; // ms
}

interface FeedbackItem {
  id: string; // unique identifier
  issue: string; // problem description
  location: string; // human-readable location
  textSpan?: { start: number; end: number; field: string };
  suggestion: string; // how to fix
  category: 'grammar' | 'style' | 'legal' | 'broker_realism' | 'clarity';
  severity: 'critical' | 'important' | 'suggestion';
  expert: 'broker' | 'lawyer';
  actionable: boolean; // can be auto-fixed
  autoFix?: string; // replacement text
}
```

#### 3. Improved Version Generator (New)

**Function**: `generateImprovedVersion(originalText: string, acceptedFixes: FeedbackItem[])`

**Location**: `server/lib/hemnet-text-improver.ts`

**Algorithm**:
```typescript
function generateImprovedVersion(
  originalText: string,
  acceptedFixes: FeedbackItem[]
): string {
  // 1. Sort fixes by start position (descending)
  const sortedFixes = acceptedFixes
    .filter(f => f.textSpan && f.autoFix)
    .sort((a, b) => b.textSpan!.start - a.textSpan!.start);
  
  // 2. Apply fixes from end to start (preserves positions)
  let improvedText = originalText;
  for (const fix of sortedFixes) {
    const { start, end } = fix.textSpan!;
    improvedText = 
      improvedText.slice(0, start) +
      fix.autoFix +
      improvedText.slice(end);
  }
  
  // 3. Return improved text
  return improvedText;
}
```

**Validation**:
- Ensure text spans don't overlap
- Validate character positions are within bounds
- Handle edge cases (empty text, no fixes, etc.)

## Data Models

### TypeScript Interfaces

```typescript
// Hemnet property data (existing, from hemnet-integration.ts)
interface HemnetProperty {
  id: string;
  url: string;
  address: string;
  city: string;
  description?: string;
  imageUrls?: string[];
  // ... other fields
}

// Analysis result (new)
interface HemnetAnalysisResult {
  property: HemnetProperty;
  originalText: string;
  analysis: ExpertAnalysis;
  images: string[];
  metadata: {
    wordCount: number;
    paragraphCount: number;
    sentenceCount: number;
  };
}

// Improved version result (new)
interface ImprovedVersionResult {
  improvedText: string;
  changes: TextChange[];
  appliedFixes: string[]; // feedback IDs
  stats: {
    originalWordCount: number;
    improvedWordCount: number;
    fixesApplied: number;
  };
}

// Text change for comparison (new)
interface TextChange {
  type: 'addition' | 'deletion' | 'modification';
  originalSpan: { start: number; end: number };
  improvedSpan: { start: number; end: number };
  category: FeedbackCategory;
  description: string;
}
```

### Zod Schemas

```typescript
// Add to shared/schema.ts

export const hemnetAnalyzeRequestSchema = z.object({
  url: z.string().url().refine(
    (url) => /hemnet\.se\/bostader\//.test(url),
    "URL must be a hemnet.se/bostader/ link"
  ),
  mode: z.enum(['analyze', 'generate']).default('analyze'),
});

export const hemnetAnalyzeResponseSchema = z.object({
  property: z.object({
    id: z.string(),
    url: z.string(),
    address: z.string(),
    city: z.string(),
    description: z.string().optional(),
    imageUrls: z.array(z.string()).optional(),
  }),
  originalText: z.string(),
  analysis: z.object({
    overallQuality: z.number(),
    strengths: z.array(z.string()),
    improvements: z.array(z.object({
      id: z.string(),
      issue: z.string(),
      location: z.string(),
      textSpan: z.object({
        start: z.number(),
        end: z.number(),
        field: z.string(),
      }).optional(),
      suggestion: z.string(),
      category: z.enum(['grammar', 'style', 'legal', 'broker_realism', 'clarity']),
      severity: z.enum(['critical', 'important', 'suggestion']),
      expert: z.enum(['broker', 'lawyer']),
      actionable: z.boolean(),
      autoFix: z.string().optional(),
    })),
    legalCheck: z.object({
      compliant: z.boolean(),
      notes: z.string(),
      issues: z.array(z.string()),
    }),
    duration: z.number(),
  }),
  images: z.array(z.string()),
  metadata: z.object({
    wordCount: z.number(),
    paragraphCount: z.number(),
    sentenceCount: z.number(),
  }),
});

export const generateImprovedRequestSchema = z.object({
  originalText: z.string().min(50).max(5000),
  acceptedFixes: z.array(z.string()), // feedback IDs
  allFeedback: z.array(z.object({
    id: z.string(),
    textSpan: z.object({
      start: z.number(),
      end: z.number(),
      field: z.string(),
    }),
    autoFix: z.string(),
  })),
});
```


## API Design

### Endpoints

#### 1. POST /api/integrations/hemnet/analyze

**Purpose**: Analyze existing Hemnet listing text

**Authentication**: Required

**Rate Limiting**: 10 requests per minute per user

**Request**:
```json
{
  "url": "https://www.hemnet.se/bostader/lagenhet-3rum-sodermalm-stockholm-18123456",
  "mode": "analyze"
}
```

**Response (Success - 200)**:
```json
{
  "property": {
    "id": "18123456",
    "url": "https://www.hemnet.se/bostader/...",
    "address": "Götgatan 123",
    "city": "Stockholm",
    "description": "Välkommen till denna charmiga...",
    "imageUrls": ["/api/integrations/hemnet/image/abc123", ...]
  },
  "originalText": "Välkommen till denna charmiga...",
  "analysis": {
    "overallQuality": 7.5,
    "strengths": ["Tydlig struktur", "Bra faktabalans"],
    "improvements": [
      {
        "id": "fb_001",
        "issue": "Klyschig öppning med 'Välkommen till'",
        "location": "Första meningen",
        "textSpan": { "start": 0, "end": 28, "field": "description" },
        "suggestion": "Börja med konkret fakta istället för generisk hälsning",
        "category": "broker_realism",
        "severity": "important",
        "expert": "broker",
        "actionable": true,
        "autoFix": "Denna charmiga"
      }
    ],
    "legalCheck": {
      "compliant": true,
      "notes": "Inga juridiska problem hittade",
      "issues": []
    },
    "duration": 3500
  },
  "images": ["/api/integrations/hemnet/image/abc123", ...],
  "metadata": {
    "wordCount": 342,
    "paragraphCount": 5,
    "sentenceCount": 18
  }
}
```

**Response (Error - 400)**:
```json
{
  "message": "Ingen beskrivning hittades i annonsen",
  "code": "NO_DESCRIPTION"
}
```

**Response (Error - 429)**:
```json
{
  "message": "Analyskvoten är slut för denna månad",
  "code": "QUOTA_EXCEEDED",
  "usage": {
    "used": 5,
    "limit": 5
  },
  "upgradeRequired": true
}
```

#### 2. POST /api/integrations/hemnet/generate-improved

**Purpose**: Generate improved version with accepted fixes

**Authentication**: Required

**Request**:
```json
{
  "originalText": "Välkommen till denna charmiga...",
  "acceptedFixes": ["fb_001", "fb_003", "fb_007"],
  "allFeedback": [
    {
      "id": "fb_001",
      "textSpan": { "start": 0, "end": 28, "field": "description" },
      "autoFix": "Denna charmiga"
    }
  ]
}
```

**Response (Success - 200)**:
```json
{
  "improvedText": "Denna charmiga lägenhet...",
  "changes": [
    {
      "type": "deletion",
      "originalSpan": { "start": 0, "end": 14 },
      "improvedSpan": { "start": 0, "end": 0 },
      "category": "broker_realism",
      "description": "Removed 'Välkommen till'"
    }
  ],
  "appliedFixes": ["fb_001", "fb_003", "fb_007"],
  "stats": {
    "originalWordCount": 342,
    "improvedWordCount": 338,
    "fixesApplied": 3
  }
}
```

#### 3. GET /api/integrations/hemnet/image/:cacheKey

**Purpose**: Serve cached Hemnet images

**Authentication**: Not required (public cache)

**Existing**: Already implemented in `server/lib/image-downloader.ts`

**No changes needed**

### Database Schema Changes

#### Add Analysis Quota Tracking

**Table**: `usage_tracking` (existing, add column)

```sql
ALTER TABLE usage_tracking
ADD COLUMN hemnet_analyses_used INTEGER DEFAULT 0 NOT NULL;
```

**Migration**: `db/migrations/add_hemnet_analysis_quota.sql`

#### Update Usage Tracking Schema

```typescript
// In shared/schema.ts
export const usageTracking = pgTable("usage_tracking", {
  // ... existing columns
  hemnetAnalysesUsed: integer("hemnet_analyses_used").default(0).notNull(),
});

// Update PLAN_LIMITS
export const PLAN_LIMITS = {
  free: { 
    texts: 2, 
    areaSearches: 0, 
    textEdits: 0, 
    personalStyleAnalyses: 0,
    hemnetAnalyses: 1, // NEW
  },
  pro: { 
    texts: 10, 
    areaSearches: 999999, 
    textEdits: 40, 
    personalStyleAnalyses: 999999,
    hemnetAnalyses: 5, // NEW
  },
  premium: { 
    texts: 25, 
    areaSearches: 999999, 
    textEdits: 120, 
    personalStyleAnalyses: 999999,
    hemnetAnalyses: 15, // NEW
  },
} as const;
```

## UI/UX Design

### Page Layout

#### Option A: Separate Page (Recommended)

**Route**: `/app/hemnet-analysis`

**Advantages**:
- Clean separation of concerns
- Dedicated space for analysis UI
- Easier to maintain
- Better UX for focused workflow

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Header (same as Home)                                       │
├─────────────────────────────────────────────────────────────┤
│ Import Section                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Generate New] [Analyze Existing]                       │ │
│ │ URL: [https://hemnet.se/...] [Import]                   │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Analysis Results (2-column layout)                          │
│ ┌──────────────────────┬──────────────────────────────────┐ │
│ │ Original Text        │ Expert Feedback Panel            │ │
│ │ (with highlights)    │ (categorized feedback)           │ │
│ │                      │                                  │ │
│ │ [Generate Improved]  │ [Apply All Fixes]                │ │
│ └──────────────────────┴──────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Improved Version (side-by-side comparison)                  │
│ ┌──────────────────────┬──────────────────────────────────┐ │
│ │ Original             │ Improved                         │ │
│ │ (deletions in red)   │ (additions in green)             │ │
│ └──────────────────────┴──────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Image Gallery                                               │
│ [img] [img] [img] [img] [img]                               │
└─────────────────────────────────────────────────────────────┘
```

#### Option B: Integrated into Home Page

**Advantages**:
- Single entry point
- Familiar UI
- Less navigation

**Disadvantages**:
- Cluttered interface
- Harder to maintain
- Confusing mode switching

**Recommendation**: Use Option A (separate page)

### State Management

#### React Query Hooks

```typescript
// Fetch and analyze Hemnet listing
export function useHemnetAnalysis() {
  return useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest('POST', '/api/integrations/hemnet/analyze', { url });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/status'] });
    },
  });
}

// Generate improved version
export function useGenerateImproved() {
  return useMutation({
    mutationFn: async (data: GenerateImprovedRequest) => {
      const res = await apiRequest('POST', '/api/integrations/hemnet/generate-improved', data);
      return res.json();
    },
  });
}
```

#### Local State (useState)

```typescript
// In HemnetAnalysisPage component
const [mode, setMode] = useState<'generate' | 'analyze'>('analyze');
const [originalText, setOriginalText] = useState('');
const [editedText, setEditedText] = useState('');
const [acceptedFixes, setAcceptedFixes] = useState<string[]>([]);
const [dismissedFixes, setDismissedFixes] = useState<string[]>([]);
const [improvedVersion, setImprovedVersion] = useState<string | null>(null);
```

#### Undo/Redo State

```typescript
// Reuse existing useOneClickFix hook
const { applyFix, undo, redo, canUndo, canRedo } = useOneClickFix({
  onFixApplied: (feedbackId, newText) => {
    setEditedText(newText);
    setAcceptedFixes(prev => [...prev, feedbackId]);
  },
});
```

### User Flows

#### Flow 1: Analyze Existing Listing

1. User navigates to `/app/hemnet-analysis`
2. User selects "Analyze Existing" mode
3. User pastes Hemnet URL
4. User clicks "Import"
5. System fetches listing and analyzes text
6. System displays original text with inline highlights
7. System displays categorized feedback panel
8. User hovers over highlighted text to see details
9. User clicks "Fixa" button to apply fix
10. System updates text and marks fix as accepted
11. User repeats for other fixes
12. User clicks "Generate Improved Version"
13. System displays side-by-side comparison
14. User copies improved text or exports as PDF

#### Flow 2: Generate New Text (Existing)

1. User navigates to `/app/hemnet-analysis`
2. User selects "Generate New" mode
3. User pastes Hemnet URL
4. User clicks "Import"
5. System fills form fields with property data
6. User redirected to Home page with pre-filled form
7. User generates new text (existing workflow)

#### Flow 3: Quota Exceeded

1. User attempts to analyze listing
2. System checks quota
3. Quota exceeded → show upgrade prompt
4. User clicks "Upgrade to Pro"
5. Redirect to Stripe checkout
6. After payment, quota increased
7. User can analyze listings

## Integration Points

### 1. Expert Analysis Pipeline

**Current Location**: Inline in `server/routes.ts` (POST /api/optimize)

**Required Changes**:
- Extract into separate module: `server/lib/expert-analysis.ts`
- Make reusable for both text generation and analysis
- Add text span detection for feedback items
- Generate auto-fix suggestions

**New Module Structure**:
```typescript
// server/lib/expert-analysis.ts

export async function runExpertAnalysis(
  text: string,
  context?: {
    propertyType?: string;
    platform?: string;
    metadata?: Record<string, any>;
  }
): Promise<ExpertAnalysis> {
  // 1. Run broker analysis
  const brokerFeedback = await analyzeBrokerRealism(text, context);
  
  // 2. Run lawyer analysis
  const lawyerFeedback = await analyzeLegalCompliance(text, context);
  
  // 3. Run grammar check
  const grammarFeedback = await analyzeGrammar(text);
  
  // 4. Run clarity check
  const clarityFeedback = await analyzeClarity(text);
  
  // 5. Detect text spans for all feedback
  const feedbackWithSpans = await detectTextSpans(
    text,
    [...brokerFeedback, ...lawyerFeedback, ...grammarFeedback, ...clarityFeedback]
  );
  
  // 6. Generate auto-fixes
  const feedbackWithFixes = await generateAutoFixes(text, feedbackWithSpans);
  
  // 7. Calculate overall quality
  const overallQuality = calculateQualityScore(feedbackWithFixes);
  
  // 8. Extract strengths
  const strengths = extractStrengths(text, feedbackWithFixes);
  
  return {
    overallQuality,
    strengths,
    improvements: feedbackWithFixes,
    legalCheck: {
      compliant: lawyerFeedback.every(f => f.severity !== 'critical'),
      notes: generateLegalNotes(lawyerFeedback),
      issues: lawyerFeedback.filter(f => f.severity === 'critical').map(f => f.issue),
    },
    duration: Date.now() - startTime,
  };
}
```

### 2. Image Downloader

**Current Location**: `server/lib/image-downloader.ts`

**Required Changes**: None (already supports caching)

**Usage**:
```typescript
// In hemnet-integration.ts
const property = await fetchHemnetProperty(url);

// Images are automatically downloaded and cached
// Access via: /api/integrations/hemnet/image/:cacheKey
```

### 3. Inline Highlights Component

**Current Location**: `client/src/components/InlineHighlights.tsx`

**Required Changes**: None (already supports text spans and fix clicks)

**Usage**:
```typescript
<InlineHighlights
  text={editedText}
  feedback={analysis.improvements}
  field="description"
  onFixClick={handleFixClick}
  onTextChange={setEditedText}
/>
```

### 4. Expert Feedback Panel

**Current Location**: `client/src/components/ExpertFeedbackPanel.tsx`

**Required Changes**: None (already supports categorized feedback)

**Usage**:
```typescript
<ExpertFeedbackPanel
  analysis={analysis}
  onFeedbackClick={handleFeedbackClick}
  onFixClick={handleFixClick}
  onAISuggestClick={handleAISuggestClick}
  onDismissClick={handleDismissClick}
/>
```

### 5. One-Click Fix Hook

**Current Location**: `client/src/hooks/use-one-click-fix.ts`

**Required Changes**: None (already supports undo/redo)

**Usage**:
```typescript
const { applyFix, undo, redo, canUndo, canRedo } = useOneClickFix({
  onFixApplied: (feedbackId, newText) => {
    setEditedText(newText);
    setAcceptedFixes(prev => [...prev, feedbackId]);
  },
});
```


## Error Handling

### Error Scenarios

#### 1. Invalid Hemnet URL

**Trigger**: User provides non-Hemnet URL or malformed URL

**Response**:
```json
{
  "message": "Ogiltig Hemnet-URL. URL:en måste vara en hemnet.se/bostader/-länk.",
  "code": "INVALID_URL"
}
```

**UI Behavior**:
- Show error message inline below URL input
- Highlight URL input field in red
- Provide example of valid URL

#### 2. Listing Not Found

**Trigger**: Hemnet returns 404 (listing removed or doesn't exist)

**Response**:
```json
{
  "message": "Hemnet-annonsen hittades inte. Den kan ha tagits bort.",
  "code": "NOT_FOUND"
}
```

**UI Behavior**:
- Show error toast
- Clear URL input
- Suggest checking URL or trying another listing

#### 3. No Description Text

**Trigger**: Listing exists but has no description field

**Response**:
```json
{
  "message": "Ingen beskrivning hittades i annonsen",
  "code": "NO_DESCRIPTION"
}
```

**UI Behavior**:
- Show warning message
- Explain that analysis requires description text
- Suggest using "Generate New" mode instead

#### 4. Rate Limiting

**Trigger**: Hemnet blocks request (429 status)

**Response**:
```json
{
  "message": "Hemnet blockerade förfrågan. Försök igen om en stund.",
  "code": "RATE_LIMITED"
}
```

**Backend Behavior**:
- Retry with exponential backoff (3 attempts)
- Wait 1s, 2s, 4s between retries
- If all retries fail, return error

**UI Behavior**:
- Show error toast with retry countdown
- Disable import button temporarily
- Auto-retry after countdown

#### 5. Quota Exceeded

**Trigger**: User has used all analysis quota for the month

**Response**:
```json
{
  "message": "Analyskvoten är slut för denna månad",
  "code": "QUOTA_EXCEEDED",
  "usage": {
    "used": 5,
    "limit": 5
  },
  "upgradeRequired": true,
  "currentPlan": "pro",
  "upgradeOptions": {
    "premium": {
      "analyses": 15,
      "price": "599kr/månad"
    }
  }
}
```

**UI Behavior**:
- Show upgrade modal
- Display current usage and limit
- Show upgrade options with benefits
- Provide "Upgrade Now" button

#### 6. Analysis Timeout

**Trigger**: Expert analysis takes longer than 30 seconds

**Response**:
```json
{
  "message": "Analysen tog för lång tid",
  "code": "TIMEOUT",
  "partialResults": {
    "overallQuality": 7.5,
    "improvements": [...] // partial feedback
  }
}
```

**UI Behavior**:
- Show partial results with warning
- Explain that some feedback may be missing
- Provide "Retry Analysis" button

#### 7. Text Too Short

**Trigger**: Description text is less than 50 words

**Response**: Success with warning

**UI Behavior**:
- Show warning badge: "Kort text - begränsad analys"
- Display analysis results normally
- Explain that longer texts get better analysis

#### 8. Text Too Long

**Trigger**: Description text exceeds 1200 words

**Response**: Success with truncation

**Backend Behavior**:
- Truncate text to 1200 words
- Analyze truncated version
- Add warning to response

**UI Behavior**:
- Show warning: "Texten trunkerades till 1200 ord"
- Display analysis for truncated version
- Provide option to analyze full text (Premium only)

### Error Recovery Strategies

#### Retry Logic

```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      
      // Don't retry on client errors (4xx)
      if (err.status >= 400 && err.status < 500 && err.status !== 429) {
        throw err;
      }
      
      // Retry on rate limit or server errors
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  throw lastError;
}
```

#### Graceful Degradation

```typescript
// If expert analysis fails, return basic analysis
async function analyzeWithFallback(text: string): Promise<ExpertAnalysis> {
  try {
    return await runExpertAnalysis(text);
  } catch (err) {
    console.error('Expert analysis failed, using fallback:', err);
    
    // Return basic analysis
    return {
      overallQuality: 5,
      strengths: ['Texten är läsbar'],
      improvements: [],
      legalCheck: {
        compliant: true,
        notes: 'Grundläggande kontroll genomförd',
        issues: [],
      },
      duration: 0,
    };
  }
}
```

#### User Feedback

```typescript
// Show progress during long operations
function showAnalysisProgress() {
  const steps = [
    'Hämtar annons från Hemnet...',
    'Analyserar text med mäklarexpert...',
    'Kontrollerar juridisk efterlevnad...',
    'Genererar förbättringsförslag...',
    'Skapar automatiska fixar...',
  ];
  
  let currentStep = 0;
  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      setProgressMessage(steps[currentStep]);
      currentStep++;
    }
  }, 3000);
  
  return () => clearInterval(interval);
}
```

## Performance Considerations

### Caching Strategy

#### 1. Hemnet Page Cache

**Purpose**: Avoid re-scraping same listing multiple times

**Implementation**:
```typescript
// In-memory cache with TTL
const hemnetCache = new Map<string, { data: HemnetProperty; expires: number }>();

async function fetchHemnetPropertyCached(url: string): Promise<HemnetProperty> {
  const cacheKey = extractHemnetId(url);
  const cached = hemnetCache.get(cacheKey);
  
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  const property = await fetchHemnetProperty(url);
  
  // Cache for 1 hour
  hemnetCache.set(cacheKey, {
    data: property,
    expires: Date.now() + 3600000,
  });
  
  return property;
}
```

**TTL**: 1 hour (listings don't change frequently)

#### 2. Image Cache

**Current**: Already implemented in `image-downloader.ts`

**No changes needed**

#### 3. Analysis Results Cache

**Purpose**: Avoid re-analyzing same text

**Implementation**:
```typescript
// Redis cache for analysis results
async function analyzeTextCached(text: string): Promise<ExpertAnalysis> {
  const cacheKey = `analysis:${hashText(text)}`;
  
  // Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Run analysis
  const analysis = await runExpertAnalysis(text);
  
  // Cache for 24 hours
  await redis.setex(cacheKey, 86400, JSON.stringify(analysis));
  
  return analysis;
}

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
```

**TTL**: 24 hours (analysis doesn't change for same text)

### Rate Limiting

#### 1. Per-User Rate Limits

**Purpose**: Prevent abuse and ensure fair usage

**Implementation**:
```typescript
// In server/lib/rate-limiter.ts
export const hemnetAnalysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'För många analysförfrågningar. Försök igen om en minut.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to route
app.post('/api/integrations/hemnet/analyze', hemnetAnalysisLimiter, handleHemnetAnalyze);
```

#### 2. Hemnet Scraping Rate Limits

**Purpose**: Avoid being blocked by Hemnet

**Implementation**:
```typescript
// Global rate limiter for Hemnet requests
const hemnetRequestQueue = new PQueue({
  concurrency: 2, // Max 2 concurrent requests
  interval: 1000, // Per second
  intervalCap: 2, // Max 2 requests per second
});

async function fetchHemnetProperty(url: string): Promise<HemnetProperty> {
  return hemnetRequestQueue.add(() => fetchHemnetPropertyInternal(url));
}
```

### Optimization Strategies

#### 1. Parallel Processing

```typescript
// Run broker and lawyer analysis in parallel
async function runExpertAnalysis(text: string): Promise<ExpertAnalysis> {
  const [brokerFeedback, lawyerFeedback, grammarFeedback] = await Promise.all([
    analyzeBrokerRealism(text),
    analyzeLegalCompliance(text),
    analyzeGrammar(text),
  ]);
  
  // ... rest of analysis
}
```

#### 2. Lazy Loading

```typescript
// Load images only when user scrolls to gallery
<ImageGallery
  images={images}
  loading="lazy"
  onVisible={() => loadImages()}
/>
```

#### 3. Debounced Text Updates

```typescript
// Debounce text changes to avoid excessive re-renders
const debouncedSetText = useMemo(
  () => debounce((text: string) => setEditedText(text), 300),
  []
);
```

#### 4. Virtualized Lists

```typescript
// Use virtual scrolling for large feedback lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={feedback.length}
  itemSize={120}
  width="100%"
>
  {({ index, style }) => (
    <FeedbackItem
      key={feedback[index].id}
      feedback={feedback[index]}
      style={style}
    />
  )}
</FixedSizeList>
```

### Performance Metrics

**Target Metrics**:
- Hemnet scraping: < 2 seconds
- Expert analysis: < 10 seconds
- Text span detection: < 1 second
- Auto-fix generation: < 2 seconds
- Total analysis time: < 15 seconds

**Monitoring**:
- Log analysis duration for each request
- Track cache hit rates
- Monitor rate limit violations
- Alert on slow requests (> 30 seconds)

## Security Considerations

### Input Validation

```typescript
// Validate Hemnet URL format
function validateHemnetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === 'www.hemnet.se' || parsed.hostname === 'hemnet.se') &&
      /\/bostader\/[a-z0-9-]+-\d+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

// Sanitize text input
function sanitizeText(text: string): string {
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .trim();
}
```

### Authentication & Authorization

```typescript
// Require authentication for analysis
app.post('/api/integrations/hemnet/analyze', requireAuth, async (req, res) => {
  // Check user plan
  const userPlan = await getUserPlan(req.user.id);
  
  // Check quota
  const usage = await getUsage(req.user.id);
  const limit = PLAN_LIMITS[userPlan].hemnetAnalyses;
  
  if (usage.hemnetAnalysesUsed >= limit) {
    return res.status(429).json({
      message: 'Analyskvoten är slut',
      code: 'QUOTA_EXCEEDED',
    });
  }
  
  // ... proceed with analysis
});
```

### Data Privacy

```typescript
// Don't store analyzed text permanently
// Only cache for performance (with TTL)

// Don't log sensitive property data
logger.info('Hemnet analysis completed', {
  userId: req.user.id,
  hemnetId: property.id, // OK to log
  // Don't log: address, description, images
});
```

### Rate Limiting (Security)

```typescript
// Aggressive rate limiting to prevent abuse
export const hemnetAnalysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});
```

## Testing Strategy

### Unit Tests

```typescript
// Test text span detection
describe('detectTextSpans', () => {
  it('should detect correct character positions', () => {
    const text = 'Välkommen till denna charmiga lägenhet';
    const issue = 'Klyschig öppning';
    
    const span = detectTextSpan(text, issue, 'Välkommen till');
    
    expect(span).toEqual({ start: 0, end: 14, field: 'description' });
  });
});

// Test auto-fix generation
describe('generateAutoFix', () => {
  it('should generate valid replacement text', () => {
    const text = 'Välkommen till denna charmiga lägenhet';
    const issue = 'Remove generic greeting';
    
    const fix = generateAutoFix(text, issue, { start: 0, end: 14 });
    
    expect(fix).toBe('Denna');
  });
});
```

### Integration Tests

```typescript
// Test full analysis flow
describe('POST /api/integrations/hemnet/analyze', () => {
  it('should analyze Hemnet listing successfully', async () => {
    const response = await request(app)
      .post('/api/integrations/hemnet/analyze')
      .set('Cookie', authCookie)
      .send({ url: 'https://www.hemnet.se/bostader/test-123' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('analysis');
    expect(response.body.analysis.improvements).toBeInstanceOf(Array);
  });
  
  it('should enforce quota limits', async () => {
    // Use up quota
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/integrations/hemnet/analyze')
        .set('Cookie', authCookie)
        .send({ url: `https://www.hemnet.se/bostader/test-${i}` });
    }
    
    // Next request should fail
    const response = await request(app)
      .post('/api/integrations/hemnet/analyze')
      .set('Cookie', authCookie)
      .send({ url: 'https://www.hemnet.se/bostader/test-999' });
    
    expect(response.status).toBe(429);
    expect(response.body.code).toBe('QUOTA_EXCEEDED');
  });
});
```

### E2E Tests

```typescript
// Test user flow with Playwright
test('analyze Hemnet listing and apply fixes', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to analysis page
  await page.goto('/app/hemnet-analysis');
  
  // Select analyze mode
  await page.click('text=Analyze Existing');
  
  // Enter Hemnet URL
  await page.fill('[name="url"]', 'https://www.hemnet.se/bostader/test-123');
  await page.click('text=Import');
  
  // Wait for analysis
  await page.waitForSelector('text=Expertfeedback');
  
  // Apply first fix
  await page.click('button:has-text("Fixa"):first');
  
  // Verify text updated
  const editedText = await page.textContent('[data-testid="edited-text"]');
  expect(editedText).not.toContain('Välkommen till');
  
  // Generate improved version
  await page.click('text=Generate Improved Version');
  
  // Verify comparison displayed
  await page.waitForSelector('[data-testid="comparison-view"]');
});
```

## Deployment Considerations

### Environment Variables

```bash
# No new environment variables needed
# Reuses existing:
# - OPENAI_API_KEY (for expert analysis)
# - REDIS_URL (for caching)
# - DATABASE_URL (for quota tracking)
```

### Database Migrations

```sql
-- Migration: add_hemnet_analysis_quota.sql
ALTER TABLE usage_tracking
ADD COLUMN hemnet_analyses_used INTEGER DEFAULT 0 NOT NULL;

-- Update existing rows
UPDATE usage_tracking
SET hemnet_analyses_used = 0
WHERE hemnet_analyses_used IS NULL;
```

### Feature Flags

```typescript
// Enable/disable feature per environment
const FEATURE_FLAGS = {
  hemnetAnalysis: process.env.ENABLE_HEMNET_ANALYSIS === 'true',
};

// Check flag before rendering UI
{FEATURE_FLAGS.hemnetAnalysis && (
  <Link href="/app/hemnet-analysis">Hemnet Analysis</Link>
)}
```

### Rollout Strategy

1. **Phase 1**: Deploy to staging
   - Test with internal users
   - Verify quota tracking
   - Monitor performance

2. **Phase 2**: Beta release (Premium only)
   - Enable for Premium users
   - Collect feedback
   - Fix bugs

3. **Phase 3**: General availability
   - Enable for all tiers
   - Monitor usage patterns
   - Adjust quotas if needed

### Monitoring

```typescript
// Log key metrics
logger.info('Hemnet analysis completed', {
  userId: req.user.id,
  duration: analysis.duration,
  feedbackCount: analysis.improvements.length,
  qualityScore: analysis.overallQuality,
});

// Alert on errors
if (error.code === 'RATE_LIMITED') {
  Sentry.captureMessage('Hemnet rate limit hit', {
    level: 'warning',
    extra: { userId: req.user.id },
  });
}
```

## Future Enhancements

### Phase 2 Features

1. **Batch Analysis**: Analyze multiple listings at once
2. **Historical Tracking**: Track quality improvements over time
3. **Custom Rules**: Allow users to define custom feedback rules
4. **AI Rewriting**: Full AI rewrite (not just fixes)
5. **Export to Hemnet**: Direct integration to update listings

### Technical Debt

1. **Extract Expert Analysis**: Move from routes.ts to separate module
2. **Improve Text Span Detection**: Use NLP for better accuracy
3. **Add Unit Tests**: Comprehensive test coverage
4. **Optimize Caching**: Use Redis for all caches
5. **Add Telemetry**: Track user behavior and feature usage

