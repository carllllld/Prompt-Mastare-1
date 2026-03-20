# Requirements Document

## Introduction

Perfect Swedish Pipeline är en ombyggnad av OptiPrompts textgenereringspipeline från nuvarande 7-stegs arkitektur till en optimerad 3-stegs pipeline. Målet är att förbättra success rate från 70% till 95%+, minska genereringstid från 65s till <25s, och leverera perfekt svensk text som mäklare älskar att arbeta med.

Systemet kombinerar kraftfull AI-generering med deterministisk post-processing och expert-analys, tillsammans med intuitiva editing-verktyg som gör det enkelt för mäklare att snabbt få perfekta texter.

## Glossary

- **Pipeline**: Den backend-process som genererar och analyserar mäklartexter
- **Smart_Generation**: Första steget i nya pipelinen som använder GPT-5.2 reasoning för att generera högkvalitativ svensk text
- **Post_Processor**: Andra steget som applicerar deterministiska fixes (platshållare, formatering, etc.)
- **Expert_Analyzer**: Tredje steget där AI-mäklare och AI-jurist analyserar texten och ger förbättringsförslag
- **Inline_Highlights**: Frontend-komponent som visar förbättringsförslag direkt i texten med visuella markeringar
- **Expert_Feedback_Panel**: Frontend-panel som visar strukturerad feedback från Expert_Analyzer
- **One_Click_Fix**: Funktion som låter mäklare applicera förbättringsförslag med ett klick
- **AI_Assisted_Selection_Edit**: Funktion där mäklare markerar text och får AI-förslag för förbättring
- **Success_Rate**: Andel genereringar som producerar användbar text utan att behöva regenereras
- **Fail_Safe_Mode**: Fallback-läge i nuvarande system när pipeline failar
- **Broker_Realism**: Mått på hur naturligt och autentiskt texten låter för en mäklare (inte AI-klyschor)

## Requirements

### Requirement 1: Smart Generation Pipeline Step

**User Story:** Som mäklare vill jag att systemet genererar perfekt svensk text snabbt, så att jag slipper stavfel och grammatiska fel.

#### Acceptance Criteria

1. THE Smart_Generation SHALL use GPT-5.2 with reasoning mode set to "medium"
2. WHEN generating text, THE Smart_Generation SHALL complete within 15-18 seconds
3. THE Smart_Generation SHALL produce text with zero spelling errors (100% correct Swedish)
4. THE Smart_Generation SHALL produce text with 95% or higher grammatical correctness
5. THE Smart_Generation SHALL produce text with 90% or higher broker realism score (avoiding AI clichés)
6. THE Smart_Generation SHALL use an optimized prompt that explicitly focuses on perfect Swedish language
7. WHEN Smart_Generation fails, THE Pipeline SHALL log detailed error information including failure reason and input parameters

### Requirement 2: Deterministic Post-Processing Step

**User Story:** Som utvecklare vill jag att systemet automatiskt fixar kända problem, så att mäklare inte behöver göra repetitiva korrigeringar.

#### Acceptance Criteria

1. THE Post_Processor SHALL execute after Smart_Generation completes
2. THE Post_Processor SHALL complete within 1 second
3. THE Post_Processor SHALL replace all placeholder values with actual property data
4. THE Post_Processor SHALL apply formatting rules (spacing, punctuation, capitalization)
5. THE Post_Processor SHALL remove any forbidden phrases using regex-based detection
6. THE Post_Processor SHALL normalize Swedish characters (å, ä, ö) to correct encoding
7. THE Post_Processor SHALL be deterministic (same input produces same output)
8. THE Post_Processor SHALL log all applied transformations for debugging

### Requirement 3: Expert AI Analysis Step

**User Story:** Som mäklare vill jag få konkreta förbättringsförslag från AI-experter, så att jag kan lära mig och snabbt förbättra texten.

#### Acceptance Criteria

1. THE Expert_Analyzer SHALL execute after Post_Processor completes
2. THE Expert_Analyzer SHALL complete within 5-7 seconds
3. THE Expert_Analyzer SHALL analyze text from both AI-mäklare and AI-jurist perspectives
4. THE Expert_Analyzer SHALL return structured JSON output with feedback categories
5. THE Expert_Analyzer SHALL identify specific text spans with issues (start/end positions)
6. THE Expert_Analyzer SHALL provide concrete improvement suggestions for each issue
7. THE Expert_Analyzer SHALL categorize feedback as: "grammar", "style", "legal", "broker_realism", "clarity"
8. THE Expert_Analyzer SHALL include severity levels: "critical", "important", "suggestion"
9. THE Expert_Analyzer SHALL provide actionable fixes that can be applied automatically

### Requirement 4: Pipeline Performance and Reliability

**User Story:** Som mäklare vill jag att systemet är snabbt och pålitligt, så att jag kan arbeta effektivt utan frustrationer.

#### Acceptance Criteria

1. THE Pipeline SHALL complete all three steps in less than 25 seconds total
2. THE Pipeline SHALL achieve 95% or higher success rate
3. WHEN any step fails, THE Pipeline SHALL retry up to 2 times with exponential backoff
4. IF all retries fail, THEN THE Pipeline SHALL return detailed error information to the user
5. THE Pipeline SHALL run in parallel with the existing 7-step pipeline during A/B testing phase
6. THE Pipeline SHALL log performance metrics for each step (duration, success/failure, retry count)
7. THE Pipeline SHALL emit WebSocket events for real-time progress updates to frontend

### Requirement 5: Inline Highlights Display

**User Story:** Som mäklare vill jag se förbättringsförslag direkt i texten, så att jag snabbt förstår vad som kan förbättras.

#### Acceptance Criteria

1. THE Inline_Highlights SHALL display visual markers on text spans with feedback
2. THE Inline_Highlights SHALL use color coding based on severity (red=critical, yellow=important, blue=suggestion)
3. WHEN user hovers over a highlight, THE Inline_Highlights SHALL show a tooltip with feedback details
4. THE Inline_Highlights SHALL display the feedback category icon in the tooltip
5. THE Inline_Highlights SHALL provide a "Fix" button in the tooltip for actionable suggestions
6. THE Inline_Highlights SHALL support multiple overlapping highlights on the same text span
7. THE Inline_Highlights SHALL update in real-time as user edits the text

### Requirement 6: Expert Feedback Panel

**User Story:** Som mäklare vill jag se all feedback strukturerat i en panel, så att jag kan arbeta systematiskt genom förbättringarna.

#### Acceptance Criteria

1. THE Expert_Feedback_Panel SHALL display all feedback items grouped by category
2. THE Expert_Feedback_Panel SHALL show feedback count per category
3. WHEN user clicks a feedback item, THE Expert_Feedback_Panel SHALL scroll to and highlight the relevant text span
4. THE Expert_Feedback_Panel SHALL display severity level for each feedback item
5. THE Expert_Feedback_Panel SHALL show which expert provided the feedback (AI-mäklare or AI-jurist)
6. THE Expert_Feedback_Panel SHALL provide action buttons: "Fix automatically", "Get AI suggestion", "Dismiss"
7. THE Expert_Feedback_Panel SHALL update in real-time as feedback items are resolved

### Requirement 7: One-Click Fix Functionality

**User Story:** Som mäklare vill jag kunna fixa problem med ett klick, så att jag sparar tid på enkla korrigeringar.

#### Acceptance Criteria

1. WHEN user clicks "Fix automatically", THE One_Click_Fix SHALL apply the suggested change to the text
2. THE One_Click_Fix SHALL support undo functionality (Ctrl+Z)
3. THE One_Click_Fix SHALL remove the feedback item after successful application
4. THE One_Click_Fix SHALL update the Inline_Highlights to reflect the change
5. IF the fix cannot be applied automatically, THEN THE One_Click_Fix SHALL show an error message
6. THE One_Click_Fix SHALL log all applied fixes for analytics

### Requirement 8: AI-Assisted Selection Edit

**User Story:** Som mäklare vill jag kunna markera text och få AI-förslag för förbättring, så att jag kan snabbt förbättra specifika delar.

#### Acceptance Criteria

1. WHEN user selects text, THE AI_Assisted_Selection_Edit SHALL show a "Improve with AI" button
2. WHEN user clicks the button, THE AI_Assisted_Selection_Edit SHALL send the selected text to GPT-5.2
3. THE AI_Assisted_Selection_Edit SHALL complete within 3-5 seconds
4. THE AI_Assisted_Selection_Edit SHALL return 2-3 alternative suggestions
5. THE AI_Assisted_Selection_Edit SHALL display suggestions in a popover with preview
6. WHEN user selects a suggestion, THE AI_Assisted_Selection_Edit SHALL replace the selected text
7. THE AI_Assisted_Selection_Edit SHALL support undo functionality
8. THE AI_Assisted_Selection_Edit SHALL maintain context from the full text when generating suggestions

### Requirement 9: A/B Testing Infrastructure

**User Story:** Som produktägare vill jag kunna A/B-testa nya pipelinen mot gamla, så att jag kan validera förbättringar med data.

#### Acceptance Criteria

1. THE Pipeline SHALL support a feature flag to enable/disable the new 3-step pipeline
2. THE Pipeline SHALL randomly assign users to control (old) or treatment (new) group
3. THE Pipeline SHALL log which pipeline version was used for each generation
4. THE Pipeline SHALL track success rate, generation time, and user satisfaction per pipeline version
5. THE Pipeline SHALL allow manual override to force a specific pipeline version for testing
6. THE Pipeline SHALL ensure consistent pipeline assignment per user session
7. THE Pipeline SHALL collect metrics: success_rate, avg_generation_time, regeneration_rate, user_satisfaction_score

### Requirement 10: Success Metrics and Monitoring

**User Story:** Som produktägare vill jag kunna mäta om nya pipelinen når våra mål, så att jag kan fatta datadrivna beslut.

#### Acceptance Criteria

1. THE Pipeline SHALL track success rate and alert if it drops below 95%
2. THE Pipeline SHALL track average generation time and alert if it exceeds 25 seconds
3. THE Pipeline SHALL track user satisfaction score (thumbs up/down after generation)
4. THE Pipeline SHALL track percentage of users who accept text with minor edits (target: 80%+)
5. THE Pipeline SHALL track regeneration rate (target: <15%)
6. THE Pipeline SHALL track average time to final text (target: <3 minutes including editing)
7. THE Pipeline SHALL export metrics to monitoring dashboard (Sentry or similar)
8. THE Pipeline SHALL generate daily summary reports with key metrics

### Requirement 11: Backward Compatibility

**User Story:** Som utvecklare vill jag att nya pipelinen är bakåtkompatibel, så att befintliga funktioner fortsätter fungera.

#### Acceptance Criteria

1. THE Pipeline SHALL maintain the same API interface as the existing pipeline
2. THE Pipeline SHALL return the same response structure (with additional fields for new features)
3. THE Pipeline SHALL support all existing text types (bostadsrätt, villa, fritidshus, etc.)
4. THE Pipeline SHALL respect user's personal style settings
5. THE Pipeline SHALL integrate with existing quota system
6. THE Pipeline SHALL work with existing WebSocket infrastructure
7. THE Pipeline SHALL maintain compatibility with PDF export functionality

### Requirement 12: Error Handling and Fallback

**User Story:** Som mäklare vill jag att systemet hanterar fel gracefully, så att jag alltid får ett användbart resultat.

#### Acceptance Criteria

1. IF Smart_Generation fails after retries, THEN THE Pipeline SHALL fall back to the old 7-step pipeline
2. IF Post_Processor fails, THEN THE Pipeline SHALL continue with unprocessed text and log the error
3. IF Expert_Analyzer fails, THEN THE Pipeline SHALL return the text without analysis feedback
4. THE Pipeline SHALL never return an empty or null result to the user
5. WHEN falling back to old pipeline, THE Pipeline SHALL notify the user via UI message
6. THE Pipeline SHALL log all fallback events for monitoring and debugging
7. THE Pipeline SHALL include error context in logs (user_id, property_id, pipeline_step, error_message)

