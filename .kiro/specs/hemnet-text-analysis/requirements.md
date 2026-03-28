# Requirements Document

## Introduction

This feature transforms the existing Hemnet import functionality from a form-filling tool into a comprehensive text analysis and improvement system. Instead of generating new listing text, the system will import existing Hemnet listing text and images, analyze them using AI-powered expert analysis (broker + lawyer agents), and provide actionable improvement suggestions with one-click fixes.

This creates unique value by applying real estate-specific domain expertise (legal compliance, broker realism, Swedish market conventions) to existing listings, differentiating OptiPrompt from generic AI writing assistants.

## Glossary

- **Hemnet_Text_Analyzer**: The system component that analyzes imported Hemnet listing text
- **Expert_Analysis_Pipeline**: The existing AI pipeline using broker and lawyer agents to evaluate text quality
- **Inline_Highlights**: UI component that shows text issues with colored underlines and tooltips
- **One_Click_Fix**: Feature allowing users to apply suggested corrections with a single click
- **Feedback_Item**: A single improvement suggestion with location, severity, and auto-fix data
- **Import_Mode**: The operational mode (either "generate" for new text or "analyze" for existing text)
- **Text_Span**: A character range in the text identifying where an issue occurs

## Requirements

### Requirement 1: Import Existing Hemnet Listing Text

**User Story:** As a broker, I want to import an existing Hemnet listing by URL, so that I can analyze and improve text that's already published.

#### Acceptance Criteria

1. WHEN a user pastes a Hemnet URL in the import section, THE Hemnet_Text_Analyzer SHALL fetch the existing listing text and images
2. THE Hemnet_Text_Analyzer SHALL extract the property description field from the Hemnet listing
3. THE Hemnet_Text_Analyzer SHALL extract all property metadata (address, price, rooms, area, etc.)
4. THE Hemnet_Text_Analyzer SHALL extract all listing images with their URLs
5. WHEN the import completes, THE System SHALL display the original text in an editable text area
6. THE System SHALL preserve all paragraph breaks and formatting from the original Hemnet text
7. IF the Hemnet URL is invalid or the listing is not found, THEN THE System SHALL display a descriptive error message

### Requirement 2: Analyze Imported Text with Expert Pipeline

**User Story:** As a broker, I want AI experts to analyze my existing listing text, so that I can identify issues with grammar, style, legal compliance, and broker realism.

#### Acceptance Criteria

1. WHEN text is imported from Hemnet, THE System SHALL automatically trigger the Expert_Analysis_Pipeline
2. THE Expert_Analysis_Pipeline SHALL analyze the text using both broker and lawyer AI agents
3. THE Expert_Analysis_Pipeline SHALL generate feedback in five categories: grammar, style, legal, broker_realism, and clarity
4. THE Expert_Analysis_Pipeline SHALL assign severity levels (critical, important, suggestion) to each feedback item
5. THE Expert_Analysis_Pipeline SHALL identify text spans (start/end character positions) for each issue
6. THE Expert_Analysis_Pipeline SHALL generate auto-fix suggestions for actionable issues
7. THE System SHALL calculate an overall quality score (0-10) for the imported text
8. THE System SHALL complete analysis within 30 seconds or display a timeout message

### Requirement 3: Display Inline Highlights for Issues

**User Story:** As a broker, I want to see issues highlighted directly in my text, so that I can quickly identify problem areas without reading through a separate list.

#### Acceptance Criteria

1. THE Inline_Highlights SHALL display colored underlines for text spans with issues
2. THE Inline_Highlights SHALL use red for critical issues, yellow for important issues, and blue for suggestions
3. WHEN a user hovers over a highlighted span, THE System SHALL display a tooltip with issue details
4. THE tooltip SHALL show the issue description, expert suggestion, and severity level
5. THE tooltip SHALL indicate which expert (broker or lawyer) identified the issue
6. IF multiple issues overlap the same text span, THE Inline_Highlights SHALL show a count badge
7. WHEN a user clicks a highlighted span, THE System SHALL scroll to that feedback item in the panel

### Requirement 4: Provide One-Click Fixes

**User Story:** As a broker, I want to apply suggested corrections with one click, so that I can quickly improve my text without manual editing.

#### Acceptance Criteria

1. WHEN a feedback item has an auto-fix available, THE System SHALL display a "Fixa" button
2. WHEN a user clicks the "Fixa" button, THE System SHALL replace the problematic text span with the auto-fix text
3. THE System SHALL maintain undo history for all applied fixes
4. THE System SHALL allow users to undo the last fix with Ctrl+Z or an undo button
5. THE System SHALL allow users to redo an undone fix with Ctrl+Shift+Z or a redo button
6. WHEN a fix is applied, THE System SHALL mark that feedback item as resolved
7. THE System SHALL update the text in real-time without requiring a page refresh

### Requirement 5: Show Categorized Feedback Panel

**User Story:** As a broker, I want to see all feedback organized by category, so that I can prioritize which issues to address first.

#### Acceptance Criteria

1. THE Expert_Feedback_Panel SHALL display feedback grouped by category (grammar, style, legal, broker_realism, clarity)
2. THE Expert_Feedback_Panel SHALL show the count of issues in each category
3. THE Expert_Feedback_Panel SHALL sort issues within each category by severity (critical first)
4. THE Expert_Feedback_Panel SHALL display category icons (FileText for grammar, Scale for legal, User for broker_realism, Briefcase for style, Lightbulb for clarity)
5. WHEN a user clicks a feedback item, THE System SHALL highlight the corresponding text span
6. THE Expert_Feedback_Panel SHALL show the overall quality score prominently at the top
7. THE Expert_Feedback_Panel SHALL display legal compliance status (compliant/non-compliant)

### Requirement 6: Support Accept/Reject Workflow

**User Story:** As a broker, I want to accept or reject individual suggestions, so that I can maintain control over which changes are applied to my text.

#### Acceptance Criteria

1. WHEN a user applies a fix, THE System SHALL mark that suggestion as accepted
2. THE System SHALL provide a dismiss button (X icon) for each feedback item
3. WHEN a user dismisses a feedback item, THE System SHALL remove it from the visible list
4. THE System SHALL maintain a list of dismissed feedback items for the current session
5. THE System SHALL not re-apply dismissed suggestions during the current session
6. WHEN a user refreshes the page, THE System SHALL reset dismissed items (no persistence)
7. THE System SHALL show a count of accepted vs. total suggestions

### Requirement 7: Generate Improved Version

**User Story:** As a broker, I want to generate an improved version of my text based on accepted suggestions, so that I can see the final result before publishing.

#### Acceptance Criteria

1. THE System SHALL provide a "Generera förbättrad version" button
2. WHEN a user clicks the button, THE System SHALL apply all accepted fixes to create an improved version
3. THE System SHALL display the improved version in a separate text area
4. THE System SHALL preserve the original text unchanged in its text area
5. THE System SHALL allow users to copy the improved version to clipboard
6. THE System SHALL allow users to export the improved version as PDF
7. THE System SHALL show a side-by-side comparison view (original vs. improved)

### Requirement 8: Handle Images Alongside Text

**User Story:** As a broker, I want to see the listing images when analyzing text, so that I can ensure the text accurately describes what's shown in the photos.

#### Acceptance Criteria

1. WHEN text is imported from Hemnet, THE System SHALL download and cache all listing images
2. THE System SHALL display images in a gallery view below or beside the text
3. THE System SHALL show image count (e.g., "5 bilder importerade")
4. THE System SHALL allow users to click images to view them full-screen
5. THE System SHALL maintain image order from the original Hemnet listing
6. IF image download fails, THE System SHALL display a placeholder with an error message
7. THE System SHALL limit image downloads to 10 images maximum to prevent abuse

### Requirement 9: Distinguish Between Import Modes

**User Story:** As a broker, I want to choose between generating new text or analyzing existing text, so that I can use the tool for different workflows.

#### Acceptance Criteria

1. THE System SHALL provide two distinct import modes: "Generera ny text" and "Analysera befintlig text"
2. WHEN a user selects "Generera ny text", THE System SHALL use the existing form-fill workflow
3. WHEN a user selects "Analysera befintlig text", THE System SHALL use the new text analysis workflow
4. THE System SHALL display mode selection as radio buttons or tabs in the import section
5. THE System SHALL remember the last selected mode for the current session
6. THE System SHALL show different UI layouts based on the selected mode
7. THE System SHALL validate that the Hemnet URL contains a published listing for analysis mode

### Requirement 10: Enforce Tier Access Controls

**User Story:** As a product owner, I want to control which subscription tiers can access text analysis, so that we can monetize this premium feature appropriately.

#### Acceptance Criteria

1. THE System SHALL allow Free tier users to analyze 1 text per month
2. THE System SHALL allow Pro tier users to analyze 5 texts per month
3. THE System SHALL allow Premium tier users to analyze 15 texts per month
4. WHEN a user exceeds their analysis quota, THE System SHALL display an upgrade prompt
5. THE System SHALL track text analysis usage separately from text generation usage
6. THE System SHALL display remaining analysis quota in the user status panel
7. THE System SHALL reset analysis quotas on the first day of each month

### Requirement 11: Preserve Existing Hemnet Import Functionality

**User Story:** As a developer, I want to preserve the existing Hemnet import functionality, so that users can still generate new text from Hemnet data.

#### Acceptance Criteria

1. THE System SHALL maintain the existing `fetchHemnetProperty` function unchanged
2. THE System SHALL maintain the existing `mapHemnetPropertyToOptiPrompt` function unchanged
3. THE System SHALL maintain the existing `/api/integrations/hemnet/import` endpoint for form-fill mode
4. THE System SHALL create a new `/api/integrations/hemnet/analyze` endpoint for analysis mode
5. THE System SHALL reuse the existing Hemnet scraping logic for both modes
6. THE System SHALL reuse the existing image download and caching logic for both modes
7. THE System SHALL not break any existing user workflows or saved data

### Requirement 12: Handle Edge Cases and Errors

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and how to fix it.

#### Acceptance Criteria

1. IF the Hemnet listing has no description text, THEN THE System SHALL display "Ingen beskrivning hittades i annonsen"
2. IF the Expert_Analysis_Pipeline times out, THEN THE System SHALL display partial results with a warning
3. IF the Hemnet URL is rate-limited, THEN THE System SHALL retry with exponential backoff up to 3 times
4. IF all retries fail, THEN THE System SHALL display "Hemnet blockerade förfrågan. Försök igen om en stund."
5. IF the user's quota is exceeded, THEN THE System SHALL display current plan and upgrade options
6. IF the imported text is too short (< 50 words), THEN THE System SHALL display a warning but still analyze
7. IF the imported text is too long (> 1200 words), THEN THE System SHALL truncate and display a warning

