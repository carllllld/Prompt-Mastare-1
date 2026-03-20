# IMPLEMENTATION BLUEPRINT - KONKRET KOD

## OVERVIEW

Detta dokument innehåller EXAKT kod för att implementera den nya 3-stegs pipelinen.

## STEG 1: SMART GENERATION

### File: `server/lib/listing-smart-generation.ts`

```typescript
import OpenAI from "openai";
import type { WritingStyle, PlanType } from "@shared/schema";

interface GenerationInput {
  disposition: any;
  style: WritingStyle;
  platform: string;
  plan: PlanType;
  personalStylePrompt?: string;
  targetWordMin: number;
  targetWordMax: number;
}

interface GenerationOutput {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
}
```


export async function smartGeneration(
  input: GenerationInput,
  openai: OpenAI
): Promise<GenerationOutput> {
  
  const systemPrompt = buildMasterSystemPrompt(input);
  const userPrompt = buildUserPrompt(input);
  
  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    reasoning_effort: "medium", // GPT-5.2 reasoning
    max_completion_tokens: computeTokenBudget(input.targetWordMax)
  });
  
  const result = JSON.parse(completion.choices[0].message.content || "{}");
  
  return {
    improvedPrompt: result.improvedPrompt || "",
    headline: result.headline || "",
    socialCopy: result.socialCopy || "",
    instagramCaption: result.instagramCaption || "",
    showingInvitation: result.showingInvitation || "",
    shortAd: result.shortAd || ""
  };
}
```
