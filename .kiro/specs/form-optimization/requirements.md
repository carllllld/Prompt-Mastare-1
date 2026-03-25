# Requirements Document

## Introduction

OptiPrompt's form is the primary data collection interface for generating professional Swedish real estate listing texts. This feature optimizes the form to ensure all fields required by Hemnet and Booli are present, chips cover common use cases intuitively, unnecessary fields are removed, and the overall UX flow guides users toward providing high-quality input that produces excellent AI-generated texts.

The current form (PromptFormProfessional.tsx, 1894 lines) has evolved organically and needs systematic review against actual Hemnet/Booli requirements, broker workflows, and user feedback to become "grymt" (awesome/excellent).

## Glossary

- **Hemnet**: Sweden's largest real estate listing platform, requires specific data fields and has strict content guidelines
- **Booli**: Swedish real estate platform with different content requirements than Hemnet
- **Disposition**: The structured property data collected by the form that feeds into the AI text generation pipeline
- **Chip**: A selectable UI element (button-like) representing a common property feature that can be toggled on/off
- **USP**: Unique Selling Points - distinctive features that make a property attractive to buyers
- **BRF**: Bostadsrättsförening (housing cooperative association) - Swedish apartment ownership structure
- **Boarea**: Living area in square meters (primary size metric for Swedish properties)
- **Biarea**: Auxiliary area (garage, storage, etc.) not counted as living space
- **Mäklare**: Real estate broker/agent
- **Priority_Field**: A form field identified as critical for generating high-quality listing texts

## Requirements

### Requirement 1: Hemnet/Booli Field Compliance Audit

**User Story:** As a real estate broker, I want the form to collect all data required by Hemnet and Booli, so that I can publish listings without manual additions.

#### Acceptance Criteria

1. THE Form_Auditor SHALL identify all mandatory fields required by Hemnet's listing API
2. THE Form_Auditor SHALL identify all mandatory fields required by Booli's listing API
3. THE Form_Auditor SHALL identify all recommended fields that improve listing visibility on Hemnet
4. THE Form_Auditor SHALL identify all recommended fields that improve listing visibility on Booli
5. WHEN comparing current form fields against platform requirements, THE Form_Auditor SHALL produce a gap analysis report
6. THE Gap_Analysis_Report SHALL list missing mandatory fields with priority "critical"
7. THE Gap_Analysis_Report SHALL list missing recommended fields with priority "important"
8. THE Gap_Analysis_Report SHALL list current fields not used by either platform with priority "review"

### Requirement 2: Remove Redundant and Unnecessary Fields

**User Story:** As a real estate broker, I want a streamlined form without redundant fields, so that I can complete it faster without confusion.

#### Acceptance Criteria

1. WHEN a field duplicates information collectible through chips, THE System SHALL mark the field as redundant
2. WHEN a field is never or rarely used in generated texts, THE System SHALL mark the field as low-value
3. WHEN two fields collect overlapping information, THE System SHALL identify the overlap and recommend consolidation
4. THE System SHALL identify fields that are neither Hemnet-required, Booli-required, nor high-impact for text quality
5. FOR ALL identified redundant fields, THE System SHALL provide removal justification
6. THE System SHALL preserve all fields that directly impact text quality metrics

### Requirement 3: Optimize Chip Collections for Common Use Cases

**User Story:** As a real estate broker, I want chip options that cover 80% of common property features, so that I can quickly select features without typing.

#### Acceptance Criteria

1. THE Chip_Analyzer SHALL analyze historical form submissions to identify most frequently entered property features
2. WHEN a property feature appears in >15% of submissions, THE Chip_Analyzer SHALL recommend it as a chip option
3. THE Chip_Analyzer SHALL identify current chips that are rarely selected (<5% usage)
4. THE Chip_Analyzer SHALL identify missing common features that should be chips
5. FOR ALL chip collections (kitchen, bathroom, flooring, heating, special, garden, USP, parking, roof, material), THE System SHALL ensure coverage of top 10 most common features
6. THE System SHALL ensure chip labels are clear, unambiguous, and use standard Swedish real estate terminology
7. WHEN chips overlap with freetext fields, THE System SHALL detect and normalize duplicates

### Requirement 4: Identify Chip-Only Fields

**User Story:** As a real estate broker, I want fields that don't need text descriptions to be chip-only, so that I can complete the form faster.

#### Acceptance Criteria

1. WHEN a field has a finite set of common values (<20 options), THE System SHALL evaluate it for chip-only conversion
2. THE System SHALL identify fields where freetext adds no value beyond chip selection
3. FOR ALL chip-only candidates, THE System SHALL verify that chips cover >90% of real-world use cases
4. THE System SHALL preserve freetext option for fields where custom descriptions add value
5. WHEN converting to chip-only, THE System SHALL maintain an "Övrigt" (Other) option with optional text field

### Requirement 5: Add Missing Critical Fields

**User Story:** As a real estate broker, I want all important property attributes to have dedicated fields, so that the AI can generate complete and accurate listings.

#### Acceptance Criteria

1. THE System SHALL identify property attributes commonly mentioned in high-quality listings but missing from the form
2. WHEN a Hemnet-required field is missing, THE System SHALL add it with priority "critical"
3. WHEN a Booli-required field is missing, THE System SHALL add it with priority "critical"
4. THE System SHALL add fields for property features that significantly impact buyer decisions
5. FOR ALL new fields, THE System SHALL determine optimal placement in the form flow
6. THE System SHALL ensure new fields integrate with existing validation and disposition building logic

### Requirement 6: Optimize Form Flow and UX

**User Story:** As a real estate broker, I want the form to guide me through data entry in a logical order, so that I can complete it efficiently without missing important information.

#### Acceptance Criteria

1. THE Form_Flow SHALL prioritize fields that have highest impact on text quality
2. THE Form_Flow SHALL group related fields together (e.g., all kitchen-related fields in one section)
3. THE Form_Flow SHALL show critical fields first and optional details later
4. WHEN a user skips priority fields, THE System SHALL display a warning before generation
5. THE Priority_Checklist SHALL accurately reflect which fields are most important for quality output
6. THE System SHALL provide contextual help text explaining why each field matters
7. THE System SHALL minimize cognitive load by hiding advanced fields behind expandable sections

### Requirement 7: Validate Field Impact on Generated Texts

**User Story:** As a product owner, I want to know which form fields actually improve generated text quality, so that I can prioritize the most valuable fields.

#### Acceptance Criteria

1. THE Field_Impact_Analyzer SHALL measure correlation between field completion and text quality scores
2. THE Field_Impact_Analyzer SHALL identify fields that are frequently filled but rarely appear in generated texts
3. THE Field_Impact_Analyzer SHALL identify fields that significantly improve text quality when filled
4. WHEN a field has low impact on text quality, THE System SHALL recommend demotion or removal
5. THE System SHALL produce a field priority ranking based on impact analysis
6. THE System SHALL validate that all "critical" priority fields actually have high impact

### Requirement 8: Ensure Consistent Terminology

**User Story:** As a real estate broker, I want form labels and placeholders to use standard Swedish real estate terminology, so that I understand exactly what to enter.

#### Acceptance Criteria

1. THE System SHALL use terminology consistent with Hemnet and Booli platforms
2. THE System SHALL use terminology consistent with Swedish real estate law and practice
3. WHEN multiple terms exist for the same concept, THE System SHALL use the most common term
4. THE System SHALL provide tooltips for technical or legal terms
5. THE System SHALL ensure chip labels match terminology used in generated texts
6. THE System SHALL avoid ambiguous or confusing labels

### Requirement 9: Improve Mobile Form Experience

**User Story:** As a real estate broker using a mobile device, I want the form to be easy to complete on small screens, so that I can work from property viewings.

#### Acceptance Criteria

1. THE Form SHALL render all fields accessibly on screens ≥375px wide
2. THE Form SHALL use appropriate input types for mobile keyboards (number, tel, email)
3. THE Form SHALL minimize scrolling required to complete priority fields
4. THE Form SHALL use touch-friendly chip sizes (minimum 44x44px touch targets)
5. THE Form SHALL persist draft data to prevent loss on mobile browser interruptions
6. THE Form SHALL load and render within 2 seconds on 4G mobile connections

### Requirement 10: Validate Against Real Broker Workflows

**User Story:** As a product owner, I want the form to match how brokers actually work, so that adoption is high and completion rates improve.

#### Acceptance Criteria

1. THE System SHALL identify the typical order brokers collect property information
2. THE System SHALL identify information brokers have readily available vs. information requiring research
3. THE System SHALL identify common pain points in current form completion
4. WHEN broker workflow differs from current form flow, THE System SHALL recommend reordering
5. THE System SHALL ensure the form supports both "quick entry" and "detailed entry" workflows
6. THE System SHALL validate that address lookup feature covers >90% of Swedish addresses

### Requirement 11: Optimize Chip Normalization Logic

**User Story:** As a system, I want to detect and normalize duplicate information between chips and freetext, so that generated texts don't repeat the same facts.

#### Acceptance Criteria

1. WHEN a chip is selected AND the same information appears in freetext, THE System SHALL detect the duplication
2. THE Normalization_Engine SHALL use canonical rules to map aliases to standard terms
3. THE Normalization_Engine SHALL merge chip selections and freetext into a single normalized field value
4. WHEN duplicates are detected, THE System SHALL show a toast notification to the user
5. THE System SHALL maintain a canonical mapping for common property feature aliases
6. THE System SHALL ensure normalized output contains each fact exactly once

### Requirement 12: Implement Field Dependency Logic

**User Story:** As a real estate broker, I want the form to show/hide fields based on property type, so that I only see relevant fields.

#### Acceptance Criteria

1. WHEN property type is "apartment" or "townhouse", THE Form SHALL show apartment-specific fields
2. WHEN property type is "house" or "villa", THE Form SHALL show house-specific fields
3. WHEN property type is "apartment" or "townhouse", THE Form SHALL hide house-specific fields
4. WHEN property type is "house" or "villa", THE Form SHALL hide apartment-specific fields
5. WHEN balcony toggle is enabled, THE Form SHALL show balcony area and direction fields
6. WHEN balcony toggle is disabled, THE Form SHALL hide balcony detail fields and clear their values
7. THE Form SHALL update field visibility immediately when dependencies change

### Requirement 13: Validate Form Data Completeness

**User Story:** As a real estate broker, I want clear feedback on what information is missing, so that I can provide complete data for best results.

#### Acceptance Criteria

1. THE Validation_Engine SHALL identify all required fields based on property type
2. WHEN required fields are empty, THE Validation_Engine SHALL prevent form submission
3. WHEN priority fields are empty, THE Validation_Engine SHALL show a warning dialog
4. THE Priority_Checklist SHALL update in real-time as fields are completed
5. THE Priority_Checklist SHALL show completion percentage
6. WHEN clicking a priority checklist item, THE Form SHALL scroll to and highlight the corresponding field
7. THE Form SHALL show field-level validation errors inline

### Requirement 14: Optimize Field Grouping and Labeling

**User Story:** As a real estate broker, I want clear section headers and field labels, so that I know where to find and enter each piece of information.

#### Acceptance Criteria

1. THE Form SHALL group fields into logical sections with clear headers
2. THE Form SHALL use consistent labeling patterns across all fields
3. THE Form SHALL indicate required fields with asterisk (*)
4. THE Form SHALL indicate optional fields with "(valfritt)" label
5. THE Form SHALL indicate Pro-only fields with "Pro" badge
6. THE Form SHALL provide help text for fields that commonly cause confusion
7. THE Form SHALL use FieldGroup component consistently for collapsible sections

### Requirement 15: Ensure Accessibility Compliance

**User Story:** As a real estate broker with accessibility needs, I want the form to be fully keyboard-navigable and screen-reader friendly, so that I can use it effectively.

#### Acceptance Criteria

1. THE Form SHALL support full keyboard navigation (Tab, Shift+Tab, Enter, Space)
2. THE Form SHALL provide proper ARIA labels for all interactive elements
3. THE Form SHALL announce validation errors to screen readers
4. THE Form SHALL maintain logical tab order through all fields
5. THE Form SHALL provide visible focus indicators for all interactive elements
6. THE Chip_Selector SHALL support keyboard selection (Space/Enter to toggle)
7. THE Form SHALL meet WCAG 2.1 Level AA contrast requirements

