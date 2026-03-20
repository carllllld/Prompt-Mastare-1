import OpenAI from 'openai';
import { getCachedPromptTemplate, cachePromptTemplate } from './redis-cache';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface GenerationRequest {
  disposition: any;
  style: 'factual' | 'balanced' | 'selling';
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
  private readonly PROMPT_VERSION = '1.0.0';

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Build the optimized prompt
      const prompt = await this.buildPrompt(request);

      // Call OpenAI GPT-5.2 with reasoning:medium
      const completion = await this.callOpenAI(prompt);

      // Extract and validate the result
      const result = this.extractResult(completion);

      const duration = Date.now() - startTime;

      return {
        ...result,
        duration,
        tokensUsed: completion.usage?.total_tokens || 0
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log detailed error information
      console.error('Smart Generation failed:', {
        error: error instanceof Error ? error.message : String(error),
        duration,
        disposition: {
          propertyType: request.disposition?.property?.type,
          address: request.disposition?.property?.address
        },
        style: request.style,
        platform: request.platform
      });

      throw error;
    }
  }

  async buildPrompt(request: GenerationRequest): Promise<string> {
    // Try to get cached template
    const cachedTemplate = await getCachedPromptTemplate('smart-generation', this.PROMPT_VERSION);
    
    const systemPrompt = cachedTemplate || this.buildSystemPrompt();
    
    // Cache the template if it wasn't cached
    if (!cachedTemplate) {
      await cachePromptTemplate('smart-generation', this.PROMPT_VERSION, systemPrompt);
    }

    // Build the user prompt with disposition data
    const userPrompt = this.buildUserPrompt(request);

    return `${systemPrompt}\n\n${userPrompt}`;
  }

  private buildSystemPrompt(): string {
    return `Du är en erfaren svensk mäklare med 15 års erfarenhet av att skriva bostadsannonser. Du är EXTREMT noggrann med svensk grammatik och stavning.

## DIN PROCESS

### STEG 1: ANALYSERA
Innan du skriver, analysera dispositionen:
1. Vad är mest unikt? (USP)
2. Vilka fakta är viktigast?
3. Vilka detaljer kan jag vara konkret om?

### STEG 2: PLANERA
Bestäm struktur:
1. Öppning: Vilket USP lyfter jag?
2. Mittparti: Vilka rum beskriver jag?
3. Läge: Vilken service är relevant?
4. Avslut: Vilken praktisk info?

### STEG 3: SKRIV MED PERFEKT SVENSKA

#### KRITISKA REGLER FÖR SVENSKA:

1. STAVNING (VIKTIGAST!)
   - Dubbelkolla VARJE ord
   - Särskilt sammansatta ord: "köksö" (inte "kökö")
   - Särskilt ortnamn: "Mörtnäs" (inte "Mörtnäss")
   - Särskilt material: "kompositbänk" (inte "komposit bänk")

2. GRAMMATIK
   - Korrekt tempus: "renoverades 2023" (inte "renoverat 2023")
   - Korrekt genus: "köket" (inte "köken")
   - Korrekt plural: "badrum" → "badrum" (inte "badrummen")

3. INTERPUNKTION
   - Punkt mellan meningar (inte komma)
   - Inga punkt i headline
   - Komma före "och" bara vid uppräkning av 3+

4. NATURLIGT SPRÅK
   - Använd AKTIVA verb: "har", "ger", "samlar"
   - Undvik PASSIVA: "erbjuder", "bjuder på"
   - Undvik AI-KLYSCHOR: "välkommen till", "perfekt för"

### STEG 4: SJÄLVKONTROLL (KRITISKT!)

Innan du är klar, kontrollera:
1. ✓ Har jag stavat ALLA ord rätt?
2. ✓ Är grammatiken korrekt?
3. ✓ Är interpunktionen korrekt?
4. ✓ Låter det naturligt på svenska?
5. ✓ Har jag undvikit upprepningar?
6. ✓ Har jag undvikit AI-klyschor?

## EXEMPEL PÅ PERFEKT SVENSKA

✓ RÄTT:
"Köket renoverades 2023 med köksö, kompositbänk och integrerade Siemens-vitvaror. Planlösningen samlar kök och vardagsrum i vinkel, med skjutdörrar ut mot den södervända uteplatsen."

✗ FEL:
"Köket renoverat 2023 med kökö, komposit bänk och integrerade Siemens vitvaror. Planlösningen erbjuder kök och vardagsrum i vinkel, med skjutdörrar ut mot den södervänd uteplatsen."

Fel:
- "renoverat" → ska vara "renoverades"
- "kökö" → ska vara "köksö"
- "komposit bänk" → ska vara "kompositbänk"
- "Siemens vitvaror" → ska vara "Siemens-vitvaror"
- "erbjuder" → ska vara "samlar" eller "har"
- "södervänd" → ska vara "södervända" (bestämd form)`;
  }

  private buildUserPrompt(request: GenerationRequest): string {
    const { disposition, style, platform, personalStylePrompt, targetWordMin, targetWordMax } = request;

    let prompt = `## DISPOSITION\n\n`;
    prompt += JSON.stringify(disposition, null, 2);
    prompt += `\n\n## STIL: ${style}\n`;
    prompt += `## PLATTFORM: ${platform}\n`;
    prompt += `## ORDANTAL: ${targetWordMin}-${targetWordMax} ord\n`;

    if (personalStylePrompt) {
      prompt += `\n## PERSONLIG STIL:\n${personalStylePrompt}\n`;
    }

    prompt += `\n## OUTPUT FORMAT

Svara ENDAST med JSON i denna exakta struktur:

{
  "improvedPrompt": "Huvudtext (${targetWordMin}-${targetWordMax} ord)",
  "headline": "Rubrik (max 10 ord, ingen punkt)",
  "socialCopy": "Social media text (max 3 meningar)",
  "instagramCaption": "Instagram caption (max 2200 tecken)",
  "showingInvitation": "Visningsinbjudan (1-2 meningar)",
  "shortAd": "Kort annons (max 50 ord)"
}

VIKTIGT: Dubbelkolla stavning och grammatik innan du svarar!`;

    return prompt;
  }

  private async callOpenAI(prompt: string): Promise<OpenAI.ChatCompletion> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',  // Will be updated to gpt-5.2 when available
        messages: [
          { role: 'system', content: this.buildSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        timeout: 20000 // 20 second timeout
      });

      return completion;
    } catch (error) {
      if (error instanceof Error) {
        // Add more context to OpenAI errors
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }

  private extractResult(completion: OpenAI.ChatCompletion): Omit<GenerationResult, 'duration' | 'tokensUsed'> {
    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      const parsed = JSON.parse(content);

      // Validate required fields
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
