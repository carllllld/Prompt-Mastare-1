# CRITICAL: Reasoning Models Response Format Issue

## Problem

Production error when using `reasoning_effort: 'high'`:
```
Smart Generation failed: {error: 'No content in OpenAI response', duration: 36092}
```

## Root Cause

When using `reasoning_effort` parameter with OpenAI models, the response structure is DIFFERENT from standard chat completions:

**Standard models:**
- Content in: `completion.choices[0].message.content`

**Reasoning models (with reasoning_effort):**
- Reasoning process in: `completion.choices[0].message.reasoning_content` (optional)
- Final answer in: `completion.choices[0].message.content`

However, there's a critical issue: **reasoning models may not support `response_format: { type: 'json_object' }`** when using reasoning_effort.

## Investigation Needed

We need to check:
1. Does `reasoning_effort` support `response_format: { type: 'json_object' }`?
2. If not, we need to either:
   - Remove reasoning_effort and use temperature control
   - Parse JSON from markdown code blocks in the response
   - Use a different approach

## Temporary Solution

Revert to `reasoning_effort: 'medium'` (which was working) or remove reasoning entirely and use temperature control.

## Status

**CRITICAL** - Production is broken for text generation
**Action Required** - Immediate rollback or fix needed
