---
inclusion: auto
---

# Smart Thinking Methodology

This document defines the thinking approach that must be applied to ALL code analysis, bug fixes, and feature development in OptiPrompt.

## Core Principles

### 1. Question Assumptions
- Never assume code is correct just because it exists
- Ask "WHY does this code exist?" before accepting it
- Verify that the original problem still exists before keeping workarounds

### 2. Find Root Causes, Not Symptoms
- Don't fix symptoms - trace back to root causes
- Example: The fallback template bug (v2.9.5)
  - ❌ Wrong: Fix the repair functions that were trying to clean up broken text
  - ✅ Right: Fix the template that was generating grammatically incorrect Swedish

### 3. Understand Modern AI Capabilities
- GPT-5.2 with reasoning is fundamentally different from older models
- Code written for GPT-3.5 limitations may be unnecessary now
- Repair functions for "AI bugs" should be questioned - modern AI shouldn't produce broken text
- Multi-stage workarounds may be obsolete with better AI

### 4. Think Like a Swedish Realtor
- Understand what makes authentic mäklartexter
- Grammatically correct Swedish is non-negotiable
- Templates must generate natural broker language, not AI-sounding text
- Forbidden phrases exist for good reasons (Hemnet rules, broker standards)

### 5. Complete Analysis, No Shortcuts
- Read every line of code, don't skim
- Don't assume similar code is the same
- Verify edge cases and error paths
- Check if tests actually test what they claim to test

### 6. Trace Dependencies and Impact
- Understand how code flows through the system
- Identify where changes will have ripple effects
- Map relationships between components
- Consider both direct and indirect dependencies

## Specific Patterns to Watch For

### Legacy AI Workarounds
**Pattern:** Code that fixes or compensates for AI output issues
**Questions to ask:**
- Was this written for an older AI model?
- Does GPT-5.2 still produce these issues?
- Can we remove this complexity?

**Examples:**
- `repairEmbeddedForAttArtifacts` - Fixes "köketför att" artifacts from old AI
- `repairMechanicalBrokerArtifacts` - Fixes mechanical-sounding AI output
- Multi-stage validation that compensates for AI weaknesses

### Symptom Fixes vs Root Cause Fixes
**Pattern:** Code that cleans up or repairs output from other code
**Questions to ask:**
- What is generating the broken output?
- Can we fix the generator instead of repairing output?
- Is this a band-aid on a deeper problem?

**Example from v2.9.5:**
- Symptom: Validation detected "välsköför att" (broken word)
- Wrong fix: Improve the repair regex
- Root cause: Fallback template generated grammatically incorrect Swedish
- Right fix: Fix the template to generate correct Swedish

### Over-Engineering for Old Limitations
**Pattern:** Complex multi-stage pipelines or excessive validation
**Questions to ask:**
- Was this complexity necessary for older AI?
- Can modern AI handle this more simply?
- Are we validating things that shouldn't be wrong in the first place?

### Template and Fallback Issues
**Pattern:** Deterministic templates that generate text
**Critical rule:** Templates MUST generate grammatically perfect output
**Why:** Unlike AI, templates are deterministic - if they're wrong, they're always wrong

**Questions to ask:**
- Is this grammatically correct Swedish?
- Does this sound like natural broker language?
- Are we joining strings in a way that could create broken text?

## Application in Different Contexts

### Bug Fixes
1. Reproduce the bug
2. Trace back to root cause (not just where it manifests)
3. Ask: "What assumption was wrong?"
4. Fix the root cause, not the symptom
5. Verify the fix doesn't just hide the problem

### Code Review
1. Question why every line exists
2. Verify comments match implementation
3. Check if modern AI makes code obsolete
4. Look for symptom fixes that should be root cause fixes
5. Verify Swedish language quality

### Feature Development
1. Understand the real requirement (not just stated requirement)
2. Question if complexity is necessary
3. Consider if AI can handle it more simply
4. Ensure Swedish output is grammatically perfect
5. Think about edge cases from the start

### Refactoring
1. Understand why code was written this way originally
2. Verify the original constraints still apply
3. Check if modern tools/AI eliminate the need for complexity
4. Ensure refactoring doesn't just move problems around
5. Maintain or improve Swedish language quality

## Red Flags That Indicate Deeper Issues

- **Repair functions** - Why is output broken in the first place?
- **Excessive validation** - Why are we checking for things that shouldn't happen?
- **Complex workarounds** - What limitation are we working around?
- **Comments like "hack" or "workaround"** - What's the real solution?
- **Dead code or unused imports** - Why wasn't this cleaned up?
- **Inconsistent patterns** - Why do we do it differently in different places?
- **Tests that don't test requirements** - What are we actually verifying?

## Success Criteria

You're thinking smart enough when:
- You can explain WHY code exists, not just WHAT it does
- You find root causes, not just symptoms
- You question whether complexity is still necessary
- You verify assumptions instead of accepting them
- You understand the full impact of changes
- You produce grammatically perfect Swedish
- You leverage modern AI capabilities appropriately

## Example: The Fallback Template Bug (v2.9.5)

**Initial approach (wrong):**
- Saw validation error: "Trasigt ord: välsköför att"
- Tried to fix `repairEmbeddedForAttArtifacts` regex
- Focused on the repair function

**Smart thinking approach (right):**
1. **Question:** Why is there a broken word in the first place?
2. **Trace:** Where does this text come from? → `buildDeterministicFallbackDescription`
3. **Analyze:** This is a TEMPLATE, not AI output
4. **Root cause:** Template generates "Detaljer som välskött, praktiskt bidrar" (grammatically incorrect)
5. **Real fix:** Change template to "Bostaden är välskött och praktiskt" (grammatically correct)
6. **Insight:** Repair functions are for AI bugs, not template bugs. Templates must be perfect.

This is the level of thinking required for all code work.
