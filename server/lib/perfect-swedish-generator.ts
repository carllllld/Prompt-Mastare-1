import OpenAI from 'openai';
import { getCachedPromptTemplate, cachePromptTemplate } from './redis-cache';
import { FORBIDDEN_PHRASES, getExemptPhrases, buildBrokerLanguagePolicyPrompt, WritingStyle } from './text-rules';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface GenerationRequest {
  disposition: any;
  style: WritingStyle;
  platform: string;
  personalStylePrompt?: string;
  targetWordMin: number;
  targetWordMax: number;
}

export interface GenerationResult {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  duration: number;
  tokensUsed: number;
}

export class SmartGenerationEngine {
  private readonly PROMPT_VERSION = '2.0.0';

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      const systemPrompt = await this.getSystemPrompt(request.style, request.platform);
      const userPrompt = this.buildUserPrompt(request);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      });

      const result = this.extractResult(completion);
      const duration = Date.now() - startTime;

      return {
        ...result,
        duration,
        tokensUsed: completion.usage?.total_tokens || 0
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Smart Generation failed:', {
        error: error instanceof Error ? error.message : String(error),
        duration,
        style: request.style,
        platform: request.platform
      });
      throw error;
    }
  }

  private async getSystemPrompt(style: WritingStyle, platform: string): Promise<string> {
    const cacheKey = `smart-generation-${style}-${platform}`;
    const cached = await getCachedPromptTemplate(cacheKey, this.PROMPT_VERSION);
    if (cached) return cached;

    const prompt = this.buildSystemPrompt(style, platform);
    await cachePromptTemplate(cacheKey, this.PROMPT_VERSION, prompt);
    return prompt;
  }

  private buildSystemPrompt(style: WritingStyle, platform: string): string {
    const exemptPhrases = getExemptPhrases(style);
    const blockedPhrases = FORBIDDEN_PHRASES.filter(p => !exemptPhrases.has(p));
    const brokerPolicy = buildBrokerLanguagePolicyPrompt(style, platform);

    return `Du är en erfaren svensk mäklare med 15 års erfarenhet av att skriva bostadsannonser. Du är EXTREMT noggrann med svensk grammatik och stavning.

## FÖRBJUDNA FRASER (använd ALDRIG dessa)

Följande fraser är AI-klyschor som aldrig förekommer i riktig mäklartext. Använd dem INTE:
${blockedPhrases.map(p => `- "${p}"`).join('\n')}

Istället för "erbjuder" → använd "har", "finns", "rymmer"
Istället för "välkommen till" → börja direkt med fakta om bostaden
Istället för "bjuder på" → beskriv konkret vad som finns
Istället för "i hjärtat av" → ange faktiskt avstånd eller gatunamn

${brokerPolicy}

## DIN PROCESS

### STEG 1: ANALYSERA
Identifiera:
1. Vad är mest unikt? (USP)
2. Vilka fakta är viktigast?
3. Vilka detaljer kan jag vara konkret om?

### STEG 2: SKRIV MED PERFEKT SVENSKA

KRITISKA REGLER:

1. STAVNING
   - Sammansatta ord skrivs ihop: "köksö", "kompositbänk", "Siemens-vitvaror"
   - Korrekt tempus: "renoverades 2023" (inte "renoverat 2023")
   - Korrekt genus och bestämd form: "södervända uteplatsen" (inte "södervänd")

2. NATURLIGT SPRÅK
   - Aktiva verb: "har", "ger", "samlar", "rymmer"
   - Konkreta fakta: mått, år, material, avstånd
   - Inga abstrakta känslor utan konkret grund

3. INTERPUNKTION
   - Punkt mellan meningar
   - Ingen punkt i headline
   - Komma före "och" bara vid uppräkning av 3+

### STEG 3: SJÄLVKONTROLL
Innan du svarar, kontrollera:
1. Har jag använt NÅGON av de förbjudna fraserna? → Ta bort dem
2. Är stavningen korrekt?
3. Låter det som en riktig mäklare skrev det?

## EXEMPEL PÅ PERFEKT SVENSKA

✓ RÄTT:
"Köket renoverades 2023 med köksö, kompositbänk och integrerade Siemens-vitvaror. Planlösningen samlar kök och vardagsrum i vinkel, med skjutdörrar ut mot den södervända uteplatsen."

✗ FEL (AI-klyschor):
"Välkommen till detta fantastiska hem som erbjuder en unik möjlighet. Köket bjuder på en känsla av lyx."`;
  }

  private buildUserPrompt(request: GenerationRequest): string {
    const { disposition, style, platform, personalStylePrompt, targetWordMin, targetWordMax } = request;

    let prompt = `## DISPOSITION\n\n`;
    prompt += JSON.stringify(disposition, null, 2);
    prompt += `\n\n## STIL: ${style}`;
    prompt += `\n## PLATTFORM: ${platform}`;
    prompt += `\n## ORDANTAL HUVUDTEXT: ${targetWordMin}-${targetWordMax} ord`;

    if (personalStylePrompt) {
      prompt += `\n\n## PERSONLIG STIL:\n${personalStylePrompt}`;
    }

    prompt += `\n\n## OUTPUT FORMAT

Svara ENDAST med JSON i denna exakta struktur:

{
  "improvedPrompt": "Huvudtext (${targetWordMin}-${targetWordMax} ord, inga förbjudna fraser)",
  "headline": "Rubrik (max 10 ord, ingen punkt, inga förbjudna fraser)",
  "socialCopy": "Social media text (max 3 meningar)",
  "instagramCaption": "Instagram caption (max 2200 tecken)",
  "showingInvitation": "Visningsinbjudan (1-2 meningar)",
  "shortAd": "Kort annons (max 50 ord)"
}

VIKTIGT: Kontrollera att INGEN av de förbjudna fraserna finns i din output!`;

    return prompt;
  }

  private extractResult(completion: OpenAI.ChatCompletion): Omit<GenerationResult, 'duration' | 'tokensUsed'> {
    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      const parsed = JSON.parse(content);

      if (!parsed.improvedPrompt || !parsed.headline) {
        throw new Error('Missing required fields in generated content');
      }

      return {
        improvedPrompt: parsed.improvedPrompt || '',
        headline: parsed.headline || '',
        socialCopy: parsed.socialCopy || '',
        instagramCaption: parsed.instagramCaption || '',
        showingInvitation: parsed.showingInvitation || '',
        shortAd: parsed.shortAd || ''
      };
    } catch (error) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }
  }
}
