# Bugfix Requirements Document

## Introduction

The AI text generator (perfect-swedish-generator.ts) is producing unacceptable output with critical quality errors that should never occur in production. These include grammatical errors (double punctuation, space before punctuation, broken sentences), emoji violations in Hemnet text fields, specific restaurant names in generated text, mechanical bullet-point style listings, and unverifiable claims without evidence.

The root cause is a combination of:
1. Generator using gpt-5.2 with temperature 0.7 but no reasoning effort parameter (not using o1/o3 reasoning mode)
2. Post-processor cleanup rules that are not aggressive enough
3. Validation that detects issues after generation rather than preventing them

This bugfix addresses the complete quality pipeline to ensure production-grade Swedish real estate text generation.

## Bug Analysis

### Current Behavior (Defect)

**1. Grammar Errors**

1.1 WHEN the generator produces text THEN the system outputs double punctuation like "Slussen.." instead of "Slussen."

1.2 WHEN the generator produces text THEN the system outputs space before punctuation like "visning ." instead of "visning."

1.3 WHEN the generator produces text THEN the system outputs broken sentences like "Nya fönster och tjärpappstak är två tydliga plus prioriterar långsiktigt underhåll." with missing punctuation between clauses

**2. Emoji Violations**

1.4 WHEN generating text for Hemnet platform THEN the system includes emojis (🌞🛁) in socialCopy field which is forbidden for Hemnet

1.5 WHEN generating Instagram captions THEN the system includes more than 2 emojis which violates the max 2 emoji rule

**3. Specific Business Names**

1.6 WHEN describing location/area THEN the system includes specific restaurant names like "Kikka", "COME 2 EAT", "ChopChop Asian Express" in the main text

1.7 WHEN describing nearby amenities THEN the system uses specific business names instead of generic terms like "restauranger" or "matställen"

**4. Mechanical Text Style**

1.8 WHEN generating location descriptions THEN the system produces mechanical bullet-point style text like "Willys Värmdö (matbutik). Kikka (restaurang)." instead of natural prose

1.9 WHEN listing features THEN the system produces list-like structures instead of flowing narrative text

**5. Unverifiable Claims**

1.10 WHEN describing property condition THEN the system uses claims like "genomgående nyskick" without concrete evidence from the disposition data

### Expected Behavior (Correct)

**1. Grammar Correctness**

2.1 WHEN the generator produces text THEN the system SHALL ensure no double punctuation exists (e.g., ".." → ".")

2.2 WHEN the generator produces text THEN the system SHALL ensure no space exists before punctuation (e.g., " ." → ".")

2.3 WHEN the generator produces text THEN the system SHALL ensure all sentences are grammatically complete with proper punctuation between clauses

**2. Emoji Compliance**

2.4 WHEN generating text for Hemnet platform THEN the system SHALL remove all emojis from headline, socialCopy, showingInvitation, and shortAd fields

2.5 WHEN generating Instagram captions THEN the system SHALL limit emojis to maximum 2 and remove any excess

**3. Generic Business References**

2.6 WHEN describing location/area THEN the system SHALL use generic terms like "restauranger", "kaféer", "matställen" instead of specific business names

2.7 WHEN describing nearby amenities THEN the system SHALL generalize business names to category terms (e.g., "Restaurang X" → "restauranger")

**4. Natural Prose Style**

2.8 WHEN generating location descriptions THEN the system SHALL produce natural flowing prose instead of mechanical bullet-point listings

2.9 WHEN listing features THEN the system SHALL integrate information into narrative sentences rather than list-like structures

**5. Evidence-Based Claims**

2.10 WHEN describing property condition THEN the system SHALL only use condition claims like "nyskick" when concrete evidence exists in the disposition (renovation years, inspection reports)

### Unchanged Behavior (Regression Prevention)

**1. Core Generation Quality**

3.1 WHEN generating text with valid input THEN the system SHALL CONTINUE TO produce broker-realistic Swedish text without AI clichés

3.2 WHEN applying forbidden phrase rules THEN the system SHALL CONTINUE TO block AI-specific phrases like "välkommen till", "erbjuder", "bjuder på"

**2. Platform-Specific Rules**

3.3 WHEN generating for Hemnet platform THEN the system SHALL CONTINUE TO exclude price, avgift, and energiklass from main text

3.4 WHEN generating for Booli platform THEN the system SHALL CONTINUE TO allow price and avgift mentions in text

**3. Field-Specific Validation**

3.5 WHEN generating headline THEN the system SHALL CONTINUE TO enforce max 9 words and no trailing punctuation

3.6 WHEN generating showingInvitation THEN the system SHALL CONTINUE TO require the word "visning" to be present

**4. Post-Processing Transformations**

3.7 WHEN post-processing text THEN the system SHALL CONTINUE TO apply placeholder removal, Swedish character normalization, and narrative integrity checks

3.8 WHEN post-processing text THEN the system SHALL CONTINUE TO enforce paragraph breaks in main text (minimum 3 breaks)

**5. Validation Detection**

3.9 WHEN validating generated output THEN the system SHALL CONTINUE TO detect forbidden phrases, platform violations, and field-specific rule violations

3.10 WHEN validation detects issues THEN the system SHALL CONTINUE TO log violations and provide detailed error messages
