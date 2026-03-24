import OpenAI from 'openai';
import { getCachedPromptTemplate, cachePromptTemplate } from './redis-cache';
import { FORBIDDEN_PHRASES, getExemptPhrases, buildBrokerLanguagePolicyPrompt, WritingStyle } from './text-rules';

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

export class GeneratorValidationError extends Error {
  constructor(
    public violations: string[],
    public generatedOutput: Omit<GenerationResult, 'duration' | 'tokensUsed'>
  ) {
    super(`Generator validation failed: ${violations.join(', ')}`);
    this.name = 'GeneratorValidationError';
  }
}

export class SmartGenerationEngine {
  private readonly PROMPT_VERSION = '2.9.0';
  private _openai: OpenAI | null = null;

  private get openai(): OpenAI {
    if (!this._openai) {
      this._openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });
    }
    return this._openai;
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      const systemPrompt = await this.getSystemPrompt(request.style, request.platform);
      const userPrompt = this.buildUserPrompt(request);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        // Note: temperature and top_p are not supported when using reasoning_effort
        // Reasoning models use internal reasoning process for consistency
        max_completion_tokens: 2500,
        response_format: { type: 'json_object' },
        reasoning_effort: 'high', // High reasoning for best quality broker-realistic text
      });

      const result = this.extractResult(completion);
      
      // Validate generated output before returning
      this.validateGeneratedOutput(result, request.platform);
      
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
    const normalizedPlatform = platform?.toLowerCase() || 'hemnet';

    // Auxiliary field rules based on platform
    const auxiliaryFieldRules = normalizedPlatform === 'hemnet' ? `
## AUXILIARY FIELDS - HEMNET RULES

### Headline (rubrik)
- Max 9 ord
- INGEN punkt eller utropstecken i slutet
- INGA emojis
- NÄMN INTE pris, avgift eller energiklass
- Fokusera på bostadens starkaste USP
- Exempel: "Helrenoverad trea med balkong i söderläge"

### Social Copy
- 1-3 meningar
- Avsluta med punkt
- NÄMN INTE pris, avgift eller energiklass
- Säljande men saklig ton
- Kan avsluta med "Läs mer i annonsen."
- Exempel: "Helrenoverat kök 2022 och södervända balkongen ger denna 3:a på Södermalm ett tydligt övertag. Läs mer i annonsen."

### Instagram Caption
- 1-2 relevanta emojis (INTE fler)
- Max 2200 tecken
- NÄMN INTE pris, avgift eller energiklass
- Varm och mänsklig ton
- Avsluta med korrekt sluttecken (. ! ?)
- Exempel: "Helrenoverat kök med köksö och södervända balkongen 🌞 Perfekt för den som söker ljus och trivsel på Södermalm."

### Showing Invitation (visningsinbjudan)
- MÅSTE innehålla ordet "visning"
- 1-2 meningar
- Professionell och trevlig ton
- NÄMN INTE pris, avgift eller energiklass
- Kan innehålla placeholders: [TID], [KONTAKT]
- Exempel: "Välkommen på visning [TID]. Kontakta [KONTAKT] för mer information."

### Short Ad (kort annons)
- Max 2 meningar
- MÅSTE innehålla bostadstyp och boarea
- 2 konkreta styrkor
- NÄMN INTE pris, avgift eller energiklass
- Säljande men faktabaserad
- Exempel: "3:a om 72 kvm med helrenoverat kök 2022 och södervända balkongen. Södermalm med 5 min till tunnelbanan."
` : normalizedPlatform === 'booli' ? `
## AUXILIARY FIELDS - BOOLI RULES

### Headline (rubrik)
- Max 9 ord
- INGEN punkt eller utropstecken i slutet
- INGA emojis
- Pris/avgift KAN nämnas om relevant
- Fokusera på bostadens starkaste USP

### Social Copy
- 1-3 meningar
- Avsluta med punkt
- Pris/avgift KAN nämnas om relevant
- Säljande men saklig ton
- Kan avsluta med "Läs mer i annonsen."

### Instagram Caption
- 1-2 relevanta emojis (INTE fler)
- Max 2200 tecken
- Pris/avgift KAN nämnas om relevant
- Varm och mänsklig ton
- Avsluta med korrekt sluttecken (. ! ?)

### Showing Invitation (visningsinbjudan)
- MÅSTE innehålla ordet "visning"
- 1-2 meningar
- Professionell och trevlig ton
- Kan innehålla placeholders: [TID], [KONTAKT]

### Short Ad (kort annons)
- Max 2 meningar
- MÅSTE innehålla bostadstyp och boarea
- 2 konkreta styrkor
- Pris/avgift KAN nämnas om relevant (format: "Avgift 4 500 kr/mån")
- Säljande men faktabaserad
` : `
## AUXILIARY FIELDS - GENERAL RULES

### Headline (rubrik)
- Max 9 ord
- INGEN punkt eller utropstecken i slutet
- INGA emojis
- Fokusera på bostadens starkaste USP

### Social Copy
- 1-3 meningar
- Avsluta med punkt
- Säljande men saklig ton

### Instagram Caption
- 1-2 relevanta emojis (INTE fler)
- Max 2200 tecken
- Varm och mänsklig ton
- Avsluta med korrekt sluttecken (. ! ?)

### Showing Invitation (visningsinbjudan)
- MÅSTE innehålla ordet "visning"
- 1-2 meningar
- Professionell och trevlig ton

### Short Ad (kort annons)
- Max 2 meningar
- MÅSTE innehålla bostadstyp och boarea
- 2 konkreta styrkor
- Säljande men faktabaserad
`;

    const platformStructureRules = normalizedPlatform === 'hemnet' ? `
## HEMNET: REGLER OCH STYCKESTRUKTUR

### Plattformsregler
- NÄMN INTE energiklass eller energiprestanda — det visas separat i annonsen
- NÄMN ALDRIG pris, utgångspris, avgift eller driftkostnad — det visas i separata fält på Hemnet
- Avsluta ALDRIG med emotionella fraser som "välkommen hem", "skapa minnen", "allt du behöver"
- Texten ska vara faktadriven och köparrelevant — ingen AI-känsla

### Obligatorisk styckestruktur (4–5 stycken, tomrad mellan varje)

STYCKE 1 — USP-ÖPPNING (1–2 meningar)
Börja med bostadens starkaste säljargument: renovering, balkong med väderstreck, utsikt, läge, ovanlig planlösning.
INTE: "Välkommen till denna fina lägenhet om 3 rok och 72 kvm."
RÄTT: "Helrenoverat kök 2022 med köksö och södervända balkongen ger den här 3:an på Södermalm ett tydligt övertag."

STYCKE 2 — PLANLÖSNING, KÖK, VARDAGSRUM (2–4 meningar)
Beskriv hur rummen hänger ihop, flödet i bostaden. Kök: material, vitvaror, bänkyta, förvaring. Vardagsrum: storlek, ljusinsläpp, utgång till balkong/uteplats.

STYCKE 3 — SOVRUM, BADRUM, TEKNIK (2–3 meningar)
Antal sovrum och deras storlek/funktion. Badrum: år för renovering, material, golvvärme, dusch/badkar. Teknik: värmesystem, ventilation, laddplats om relevant.

STYCKE 4 — UTEMILJÖ (1–2 meningar, utelämna om ej relevant)
Balkong/uteplats/tomt: väderstreck, storlek, material, utsikt. Gemensamma ytor: gård, cykelförråd, tvättstuga.

STYCKE 5 — LÄGE OCH KOMMUNIKATIONER (2–3 meningar)
Konkret lägesbeskrivning: gatunamn, stadsdel, avstånd i minuter till tunnelbana/pendeltåg/spårvagn. Nearby: matbutik, skola, park — med namn.
VIKTIGT: NÄMN INTE pris, avgift eller driftkostnad — det visas i separata fält på Hemnet.` :
    normalizedPlatform === 'booli' ? `
## BOOLI: REGLER OCH STYCKESTRUKTUR

### Plattformsregler
- Något mer berättande ton tillåten men fakta måste förbli konkreta och verifierbara
- Energiklass kan nämnas om det är ett säljargument (t.ex. energiklass A eller B)
- Personlig röst tillåten men undvik klichéer

### Obligatorisk styckestruktur (4–5 stycken, tomrad mellan varje)

STYCKE 1 — ÖPPNING MED KARAKTÄR (1–3 meningar)
Fånga det unika med bostaden. Får vara något mer berättande än Hemnet men måste fortfarande vara konkret.
RÄTT: "På fjärde våningen med fri utsikt över Riddarfjärden ligger den här 4:an — renoverad 2021 med bibehållen 1920-talskaraktär."

STYCKE 2 — PLANLÖSNING, KÖK, VARDAGSRUM (2–4 meningar)
Beskriv rummens sammanhang och flöde. Kök: material, vitvaror, köksö om finns. Vardagsrum: storlek, ljus, utgång till balkong.

STYCKE 3 — SOVRUM, BADRUM, TEKNIK (2–3 meningar)
Sovrum: antal, storlek, funktion (garderob, arbetsrum). Badrum: renovering, material, golvvärme. Teknik: värmesystem, FTX-ventilation, laddplats.

STYCKE 4 — UTEMILJÖ (1–2 meningar, utelämna om ej relevant)
Balkong/uteplats/tomt med väderstreck och storlek. Gemensamma ytor och förmåner.

STYCKE 5 — LÄGE OCH EKONOMI (2–3 meningar)
Stadsdel och konkret avstånd till kollektivtrafik. Nearby med namn. Avgift och driftkostnad.` : `
## STYCKESTRUKTUR (4–5 stycken, tomrad mellan varje)

STYCKE 1 — ÖPPNING (1–3 meningar)
Bostadens starkaste argument. Friare ton tillåten.

STYCKE 2 — PLANLÖSNING OCH KÖK (2–4 meningar)
Rummens sammanhang, kök med material och vitvaror.

STYCKE 3 — SOVRUM, BADRUM, TEKNIK (2–3 meningar)
Sovrum, badrum med detaljer, tekniska system.

STYCKE 4 — UTEMILJÖ (1–2 meningar om relevant)
Balkong, uteplats, tomt eller trädgård.

STYCKE 5 — LÄGE OCH EKONOMI (2–3 meningar)
Läge, kommunikationer, avgift/driftkostnad.`;

    return `Du är en erfaren svensk mäklare med 15 års erfarenhet av att skriva bostadsannonser. Du är EXTREMT noggrann med svensk grammatik och stavning.

## KRITISKA GRAMMATIKREGLER

**ALDRIG dubbla punkter**: Skriv "Slussen." INTE "Slussen.."
**ALDRIG mellanslag före punkt/komma/utropstecken**: Skriv "visning." INTE "visning ."
**Varje mening måste ha korrekt interpunktion mellan satser**: Skriv "Nya fönster och tjärpappstak är två tydliga plus som prioriterar långsiktigt underhåll." INTE "Nya fönster och tjärpappstak är två tydliga plus prioriterar långsiktigt underhåll."

## EMOJI-REGLER

**Hemnet-plattformen**:
- INGA emojis i headline, socialCopy, showingInvitation, shortAd
- Emojis är FÖRBJUDNA i alla Hemnet-fält utom instagramCaption

**Instagram caption**:
- MAX 2 emojis i instagramCaption
- Välj relevanta emojis: 🏠🌞🛁🌿✨

## FÖRETAGSNAMN OCH GENERALISERING

**Använd ALDRIG specifika restaurangnamn**:
- INTE: "Kikka", "COME 2 EAT", "ChopChop Asian Express", "Restaurang Gondolen"
- RÄTT: "restauranger", "kaféer", "matställen"

**Generalisera alltid företagsnamn till kategorier**:
- "Restaurang X" → "restauranger"
- "Kafé Y" → "kaféer"
- "Butik Z" → "butiker"

${auxiliaryFieldRules}

${platformStructureRules}

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
   - Punkt ENDAST mellan fullständiga meningar — ALDRIG mitt i en mening
   - ALDRIG punkt före egennamn, ortsnamn, gatunamn eller varumärken: ✗ "på. Ekorrvägen" → ✓ "på Ekorrvägen", ✗ "i. Mörtnäs" → ✓ "i Mörtnäs"
   - ALDRIG punkt före förkortningar eller beteckningar: ✗ "Energiklass. B" → ✓ "Energiklass B", ✗ "Integrerade. Siemens-vitvaror" → ✓ "Integrerade Siemens-vitvaror"
   - Ingen punkt i headline
   - Komma före "och" bara vid uppräkning av 3+

### STEG 3: SJÄLVKONTROLL
Innan du svarar, kontrollera:
1. Har jag använt NÅGON av de förbjudna fraserna? → Ta bort dem
2. Är stavningen korrekt?
3. Finns det punkter mitt i meningar (före ortsnamn, varumärken, beteckningar)? → Ta bort dem
4. Är texten uppdelad i rätt antal stycken med tomrad mellan varje? → Kontrollera styckestrukturen ovan
5. Låter det som en riktig mäklare skrev det?

## EXEMPEL PÅ PERFEKT SVENSKA

✓ RÄTT:
"Köket renoverades 2023 med köksö, kompositbänk och integrerade Siemens-vitvaror. Planlösningen samlar kök och vardagsrum i vinkel, med skjutdörrar ut mot den södervända uteplatsen."

✓ RÄTT adresshantering:
"Villa i ett plan om 146 kvm på Ekorrvägen 10 i Mörtnäs."

✗ FEL (brutna meningar):
"Villa i ett plan om 146 kvm på. Ekorrvägen 10 i. Mörtnäs."
"Integrerade. Siemens-vitvaror och en matplats."

✗ FEL (AI-klyschor):
"Välkommen till detta fantastiska hem som erbjuder en unik möjlighet. Köket bjuder på en känsla av lyx."`;
  }

  /** Public method for testing — returns the combined prompt string */
  async buildPrompt(request: GenerationRequest): Promise<string> {
    const systemPrompt = await this.getSystemPrompt(request.style, request.platform);
    const userPrompt = this.buildUserPrompt(request);
    return `${systemPrompt}\n\n${userPrompt}`;
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
  "improvedPrompt": "Huvudtext (${targetWordMin}-${targetWordMax} ord, inga förbjudna fraser, MÅSTE ha styckebrytningar med \\n\\n mellan varje stycke)",
  "headline": "Rubrik (max 10 ord, ingen punkt, inga förbjudna fraser)",
  "socialCopy": "Social media text (max 3 meningar)",
  "instagramCaption": "Instagram caption (max 2200 tecken)",
  "showingInvitation": "Visningsinbjudan (1-2 meningar)",
  "shortAd": "Kort annons (max 50 ord)"
}

KRITISKT FÖR improvedPrompt:
- MÅSTE innehålla minst 3 styckebrytningar (\\n\\n) som separerar stycken
- Varje stycke ska vara 2-4 meningar
- Första stycket = USP-öppning
- Sista stycket = läge och ekonomi
- ALDRIG en enda lång textmassa utan radbrytningar

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

  /**
   * Validates generated output against platform rules and field-specific quality requirements.
   * Throws GeneratorValidationError if violations are found.
   */
  private validateGeneratedOutput(
    result: Omit<GenerationResult, 'duration' | 'tokensUsed'>,
    platform: string
  ): void {
    const violations: string[] = [];
    const normalizedPlatform = platform?.toLowerCase() || 'hemnet';

    // Grammar error detection (pre-flight validation)
    const fields: Array<keyof typeof result> = [
      'improvedPrompt',
      'headline',
      'socialCopy',
      'instagramCaption',
      'showingInvitation',
      'shortAd'
    ];

    for (const field of fields) {
      const text = result[field];
      if (typeof text !== 'string') continue;

      // Check for double punctuation
      if (/\.{2,}/.test(text)) {
        violations.push(`${field} contains double punctuation (..)`);
      }

      // Check for space before punctuation
      if (/\s+[.!?,;:]/.test(text)) {
        violations.push(`${field} contains space before punctuation`);
      }
    }

    // Specific business name detection
    const businessNamePattern = /\b(kikka|come 2 eat|chopchop asian express)\b/i;
    const restaurantPattern = /Restaurang\s+[A-ZÅÄÖ][a-zåäö]+/;
    const cafePattern = /Kafé\s+[A-ZÅÄÖ][a-zåäö]+/;

    for (const field of fields) {
      const text = result[field];
      if (typeof text !== 'string') continue;

      if (businessNamePattern.test(text)) {
        violations.push(`${field} contains specific business name (should use generic terms)`);
      }

      if (restaurantPattern.test(text)) {
        violations.push(`${field} contains specific restaurant name (should use "restauranger")`);
      }

      if (cafePattern.test(text)) {
        violations.push(`${field} contains specific café name (should use "kaféer")`);
      }
    }

    // Platform-specific validation (Hemnet)
    if (normalizedPlatform === 'hemnet') {
      const pricePattern = /\b(pris|avgift|driftkostnad|kr\/mån|utgångspris|kronor|SEK)\b/gi;
      const energyPattern = /\b(energiklass|energiprestanda)\b/gi;

      for (const field of fields) {
        const text = result[field];
        if (typeof text !== 'string') continue;

        const priceMatches = text.match(pricePattern);
        if (priceMatches) {
          violations.push(`${field} contains price/fee: "${priceMatches[0]}" (Hemnet violation)`);
        }

        const energyMatches = text.match(energyPattern);
        if (energyMatches) {
          violations.push(`${field} contains energiklass: "${energyMatches[0]}" (Hemnet violation)`);
        }
      }
    }

    // Emoji validation
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu;

    // Hemnet: NO emojis in headline, socialCopy, showingInvitation, shortAd
    if (normalizedPlatform === 'hemnet') {
      const hemnetNoEmojiFields: Array<keyof typeof result> = [
        'headline',
        'socialCopy',
        'showingInvitation',
        'shortAd'
      ];

      for (const field of hemnetNoEmojiFields) {
        const text = result[field];
        if (typeof text !== 'string') continue;

        if (emojiPattern.test(text)) {
          violations.push(`${field} contains emojis (forbidden for Hemnet)`);
        }
      }
    }

    // Field-specific validation
    
    // Headline: max 9 words, no trailing punctuation, no emojis
    const headlineWords = result.headline.split(/\s+/).filter(w => w.length > 0).length;
    if (headlineWords > 9) {
      violations.push(`headline has ${headlineWords} words (max 9)`);
    }

    if (/[.!?]$/.test(result.headline)) {
      violations.push(`headline has trailing punctuation`);
    }

    if (emojiPattern.test(result.headline)) {
      violations.push(`headline contains emojis`);
    }

    // Showing invitation: must contain "visning"
    if (!/visning/i.test(result.showingInvitation)) {
      violations.push(`showingInvitation missing word "visning"`);
    }

    // Instagram caption: max 2 emojis
    const instagramEmojis = result.instagramCaption.match(emojiPattern) || [];
    if (instagramEmojis.length > 2) {
      violations.push(`instagramCaption has ${instagramEmojis.length} emojis (max 2)`);
    }

    // Instagram caption: max 2200 characters
    if (result.instagramCaption.length > 2200) {
      violations.push(`instagramCaption has ${result.instagramCaption.length} characters (max 2200)`);
    }

    // If violations found, log and throw
    if (violations.length > 0) {
      console.error('[GENERATOR_VALIDATION_FAILED]', {
        platform: normalizedPlatform,
        violations,
        timestamp: new Date().toISOString(),
        fields: Object.keys(result)
      });

      throw new GeneratorValidationError(violations, result);
    }
  }
}
