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
        // Note: temperature not supported with reasoning_effort
        max_completion_tokens: 4000,
        reasoning_effort: 'high',
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        // Log full response for debugging
        console.error('[GENERATOR] Empty OpenAI response:', JSON.stringify({
          choices: completion.choices?.map(c => ({ 
            finish_reason: c.finish_reason, 
            content_length: c.message?.content?.length || 0,
            refusal: c.message?.refusal,
          })),
          usage: completion.usage,
        }));
        throw new Error('No content in OpenAI response');
      }

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
- Rubriken ska FÅNGA UPPMÄRKSAMHET — inte bara lista fakta
- Lyft det mest unika: renovering, speciellt läge, ovanlig detalj, utsikt
- UNDVIK generiska rubriker som "Villa med söderläge" eller "Lägenhet i bra läge"
- BRA: "Helrenoverad trea med köksö och balkong i söder"
- BRA: "Sekelskiftesetta med kakelugn och takhöjd 3,2 meter"
- BRA: "Villa med nylagt tak, bergvärme och Ballingslöv-kök"
- DÅLIGT: "Villa med söderläge och tre badrum" (generiskt, kunde vara vilken villa som helst)
- DÅLIGT: "Fin lägenhet i bra område" (tomt, inga fakta)

### Social Copy
- 1-3 meningar
- Avsluta med punkt
- NÄMN INTE pris, avgift eller energiklass
- INGA EMOJIS — emojis är BARA tillåtna i Instagram Caption
- Säljande men saklig ton
- Kan avsluta med "Läs mer i annonsen."
- ANVÄND ALDRIG "erbjuder" eller liknande förbjudna fraser
- Exempel: "Ballingslöv-kök renoverat 2023 med köksö och kvartskomposit. Södervända uteplatsen och bergvärme gör villan redo för åretruntboende. Läs mer i annonsen."

### Instagram Caption
- INGA emojis
- Max 2200 tecken
- NÄMN INTE pris, avgift eller energiklass
- Varm och mänsklig ton
- Avsluta med korrekt sluttecken (. ! ?)
- Exempel: "Helrenoverat kök med köksö och södervända balkongen. Trea om 76 kvm med ekparkett och lugnt gårdsläge på Södermalm."

### Showing Invitation (visningsinbjudan)
- MÅSTE innehålla ordet "visning"
- 1-2 meningar
- Professionell och trevlig ton
- NÄMN INTE pris, avgift eller energiklass
- Kan innehålla placeholders: [TID], [KONTAKT]
- UNDVIK "kontaktformulär" eller liknande säljfraser
- Exempel: "Visning efter överenskommelse. Kontakta ansvarig mäklare för bokning."

### Short Ad (kort annons)
- Max 2 meningar
- MÅSTE innehålla bostadstyp och boarea
- 2 konkreta styrkor
- NÄMN INTE pris, avgift eller energiklass
- Säljande men faktabaserad
- FÅR INTE vara tom - fyll alltid med relevant information
- Exempel: "Villa om 146 kvm med södervänd uteplats och inbyggd jacuzzi. Platsbyggt kök renoverat 2023 och två badrum renoverade 2021."
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
- INGA emojis
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
- INGA emojis
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

### Vad som VISAS SOM EGNA FÄLT på Hemnet (NÄMN INTE i objektbeskrivningen)
Följande information visas redan i separata fält bredvid objektbeskrivningen på Hemnet. 
UPPREPA DEM INTE i löptexten — köparen ser dem redan:
- Utgångspris
- Avgift/månad (BRF) eller driftkostnad (villa)
- Boarea och biarea (kvm)
- Antal rum
- Våning och antal våningar i huset
- Byggår
- BRF-namn och antal lägenheter i föreningen
- Energiklass/energiprestanda
- Tomtarea (villa/hus)
- Balkong/uteplats (ja/nej)
- Hiss (ja/nej)

### Vad som SKA vara i objektbeskrivningen (löptexten)
Objektbeskrivningen ska beskriva det som INTE framgår av siffrorna:
- Hur rummen hänger ihop (planlösning, flöde)
- Material och kvalitet (kök: märke, bänkskiva, vitvaror; badrum: kakel, golvvärme)
- Renoveringar med årtal (kök renoverat 2022, badrum 2020)
- Utsikt, ljusförhållanden, väderstreck
- Uppvärmning och tekniska system
- Läge och kommunikationer (avstånd i minuter)
- Utemiljö (balkong/uteplats/trädgård med detaljer)
- Det som gör bostaden unik (USP)

### Plattformsregler
- NÄMN INTE energiklass eller energiprestanda — det visas separat i annonsen
- NÄMN ALDRIG pris, utgångspris, avgift eller driftkostnad — det visas i separata fält på Hemnet
- NÄMN INTE boarea som "XX kvm" i första meningen — det visas redan som eget fält. Nämn det bara om det behövs för kontext (t.ex. "trea om 76 kvm" i öppningen)
- Avsluta ALDRIG med emotionella fraser som "välkommen hem", "skapa minnen", "allt du behöver"
- Texten ska vara faktadriven och köparrelevant — ingen AI-känsla

### Obligatorisk styckestruktur (4–5 stycken, tomrad mellan varje)

STYCKE 1 — USP-ÖPPNING (1–2 meningar)
Börja med bostadens starkaste säljargument: renovering, balkong med väderstreck, utsikt, läge, ovanlig planlösning.
INTE: "Välkommen till denna fina lägenhet om 3 rok och 72 kvm."
RÄTT: "Södervänd uteplats med inbyggd jacuzzi sätter tonen. Villan på Ekorrvägen 10 omfattar 146 kvm med fokus på uteliv."
BRYT ALLTID UPP FÖRSTA MENINGEN: Starta med USP, nämn adress och boarea separat.

STYCKE 2 — PLANLÖSNING, KÖK, VARDAGSRUM (2–4 meningar)
Beskriv hur rummen hänger ihop, flödet i bostaden. Följ en naturlig vandring: hall → kök → vardagsrum.
Kök: material, vitvaror, bänkyta, förvaring. Vardagsrum: storlek, ljusinsläpp, utgång till balkong/uteplats.

STYCKE 3 — SOVRUM, BADRUM, TEKNIK (2–3 meningar)
Antal sovrum och deras storlek/funktion. Badrum: år för renovering, material, golvvärme, dusch/badkar. Teknik: värmesystem, ventilation, laddplats om relevant.

STYCKE 4 — UTEMILJÖ (1–2 meningar, utelämna om ej relevant)
Balkong/uteplats/tomt: väderstreck, storlek, material, utsikt. Gemensamma ytor: gård, cykelförråd, tvättstuga.

STYCKE 5 — LÄGE OCH KOMMUNIKATIONER (2–3 meningar)
Konkret lägesbeskrivning: gatunamn, stadsdel, avstånd i minuter till tunnelbana/pendeltåg/spårvagn. Nearby: matbutik, skola, park — med namn.
KVALIFICERA RESTIDER: Ange "ca 25–35 min (beroende på avgång)" eller "ca 25 min med direktbuss vid gynnsamma tider".
VIKTIGT: NÄMN INTE pris, avgift eller driftkostnad — det visas i separata fält på Hemnet.` :
    normalizedPlatform === 'booli' ? `
## BOOLI: REGLER OCH STYCKESTRUKTUR

### Vad som VISAS SOM EGNA FÄLT på Booli (behöver inte upprepas)
Booli visar liknande strukturerade fält som Hemnet:
- Pris, avgift, boarea, rum, våning, byggår, energiklass
- Dessa behöver inte upprepas i löptexten, men avgift KAN nämnas om det är ett säljargument (t.ex. låg avgift)

### Vad som SKA vara i objektbeskrivningen
Samma som Hemnet: planlösning, material, renoveringar, utsikt, läge, utemiljö, det unika.

### Plattformsregler
- Något mer berättande ton tillåten men fakta måste förbli konkreta och verifierbara
- Energiklass kan nämnas om det är ett säljargument (t.ex. energiklass A eller B)
- Avgift/driftkostnad KAN nämnas i löptext om det är relevant (till skillnad från Hemnet)
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

## EMOJIS

INGA emojis i NÅGON text. Aldrig. Inte i rubrik, inte i social media, inte i Instagram, inte i visningsinbjudan, inte i kortannons, inte i huvudtext. Emojis hör inte hemma i professionell mäklartext.

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

## GRUNDPRINCIP: VARJE MENING MÅSTE TILLFÖRA FAKTA

Innan du skriver en mening, fråga: "Kan en köpare verifiera detta vid en visning?"
- JA → Behåll. Exempel: "Köket renoverades 2020 med köksö och kompositbänk."
- NEJ → Stryk eller skriv om med fakta. Exempel: "förlänger säsongen" → stryk. "självklar plats" → stryk. "ovanligt praktiskt" → "tre badrum underlättar vid större hushåll".

En mening som inte innehåller minst ETT konkret faktum (årtal, material, mått, avstånd, antal) ska inte vara med.

## OBJEKTTYP

Olika bostadstyper skrivs olika. En villa handlar om tomt, trädgård och konstruktion. En lägenhet handlar om planlösning, ljus och balkong. Ett radhus är en mix. Du ser objekttypen i dispositionen — anpassa ton, fokus och struktur efter vad köparen för just den typen bryr sig om. Mäklaren har redan fyllt i de viktigaste säljpunkterna i formuläret — lyft dem.

## FÖRBJUDNA FRASER (använd ALDRIG dessa)

Följande fraser är AI-klyschor som aldrig förekommer i riktig mäklartext. Använd dem INTE:
${blockedPhrases.map(p => `- "${p}"`).join('\n')}

Istället för "erbjuder" → använd "har", "finns", "rymmer"
Istället för "välkommen till" → börja direkt med fakta om bostaden
Istället för "bjuder på" → beskriv konkret vad som finns
Istället för "i hjärtat av" → ange faktiskt avstånd eller gatunamn

## KRITISKT: SKICKBESKRIVNINGAR

**ALDRIG använd vaga skickbeskrivningar utan bevis:**
- INTE: "i nyskick", "som nytt", "fräscht skick", "gott skick"
- RÄTT: Ange konkreta renoveringsår och omfattning

**Om disposition innehåller "nyskick" eller liknande:**
- Ignorera det helt
- Använd istället konkreta renoveringsår från disposition (kök, badrum, fönster, tak)
- Exempel: "Köket renoverades 2023" istället för "kök i nyskick"
- Exempel: "Helrenoverat badrum 2021" istället för "badrum i nyskick"

## UNDVIK REPETITION OCH MOTSÄGELSER

**Material och detaljer:**
- Förtydliga motsägelsefulla beskrivningar: "Bänkskivor i sten (del) och komposit (del)" istället för "sten och komposit"
- Ange specifika material: "kvartskomposit" eller "granit" om känt
- Var konsekvent i terminologi: "kylskåp och frys" eller "kyl/frys" men håll samma genom texten

**Tekniska detaljer & Årtal:**
- ALDRIG värderande ord som "smidig pendling" utan att lägga till faktisk tid (ca X minuter)
- ALDRIG "är bytta" eller "är lagt" utan årtalet DIREKT: "Fönster bytta 2022" / "Tak omlagt 2021 med takpapp"
- Årtal MÅSTE följa renoveringen samma mening: "Köket renoverades 2023", inte bara "2023"
- Om årtal saknas: Utelämna helt istället för vaga formuleringar

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
   - ALDRIG dubbla sammansättningar: "kök" + "köksö" = "köksö" (INTE "kököksö"). Om ett ord redan är sammansatt, lägg INTE till prefix.
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

✓ RÄTT (öppning):
"Balkong i söder och kök renoverat 2022 med köksö i kvartskomposit. Lägenheten ligger på fjärde våningen med fritt läge mot innergården."

✓ RÄTT (kök):
"Köket renoverades 2022 med luckor från Ballingslöv, bänkskiva i kvartskomposit och integrerade vitvaror från Siemens. Matplats vid fönster mot gården."

✓ RÄTT (badrum):
"Badrummet är helkaklat och renoverat 2020 med golvvärme, duschvägg i glas och kombimaskin bakom skjutdörr."

✓ RÄTT (läge):
"Tunnelbana Medborgarplatsen nås på fyra minuters promenad. Nytorget med kaféer och matbutiker ligger ett kvarter bort."

✗ FEL (AI-klyschor):
"Välkommen till detta fantastiska hem som erbjuder en unik möjlighet. Köket bjuder på en känsla av lyx."

✗ FEL (trasig sammansättning):
"Marbodal-kököksö" — ska vara "köksö från Marbodal" eller "Marbodal-kök med köksö"

✗ FEL (generisk rubrik):
"Villa med söderläge och tre badrum" — säger inget unikt`;
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

Du MÅSTE skriva ALLA 6 fält nedan. Skriv texten direkt efter varje markör.

HUVUDTEXT:
(${targetWordMin}-${targetWordMax} ord, minst 3 styckebrytningar)

RUBRIK:
(Max 9 ord, ingen punkt)

SOCIAL MEDIA:
(Max 3 meningar, avsluta med punkt, INGA emojis)

INSTAGRAM:
(Max 2200 tecken, INGA emojis, avsluta med punkt)

VISNINGSINBJUDAN:
(1-2 meningar, måste innehålla ordet "visning", måste vara FULLSTÄNDIG mening utan avbrytningar)

EXEMPEL PÅ RÄTT VISNINGSINBJUDAN:
- "Visning efter överenskommelse. Kontakta mäklaren för bokning."
- "Visning sker på tisdagar kl 17:00. Anmälan krävs via Hemnet."
- "Visning arrangeras efter överenskommelse."

EXEMPEL PÅ FEL VISNINGSINBJUDAN (UNDVIK):
- "Visning:. Anmälan sker via." ✗ (avbruten, dubbeltecken)
- "Visning" ✗ (ej fullständig)
- "Visning möjlig" ✗ (för kort, ej instruktiv)

KORT ANNONS:
(Max 2 meningar, MÅSTE innehålla bostadstyp + boarea, alltid fylld - ALDRIG tom)

EXEMPEL PÅ BRA KORT ANNONS:
- "Villa om 146 kvm med Ballingslöv-kök renoverat 2023 och bergvärme. Tre sovrum, två badrum och uteplats i söder."
- "Trea om 72 kvm med helrenoverat kök 2022 och balkong mot lugn innergård. Tunnelbana fyra minuter till fots."
- "Radhus om 105 kvm med nylagt tak 2021 och golvvärme i badrum. Nära skola och pendeltåg."

KRITISKT:
- ALLA 6 fält är obligatoriska
- Skriv ENDAST texten, INTE instruktionerna i parenteser
- INGA förbjudna fraser (särskilt INTE "välkommen" i visningsinbjudan)
- HUVUDTEXT måste ha tomma rader mellan stycken`;

    return prompt;
  }

  private extractResult(completion: OpenAI.ChatCompletion): Omit<GenerationResult, 'duration' | 'tokensUsed'> {
    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      // Robust field extraction using simple indexOf (no regex escaping needed)
      const extractField = (primaryMarker: string, altMarkers: string[] = []): string => {
        const allMarkers = [primaryMarker, ...altMarkers];
        const upperContent = content.toUpperCase();
        
        for (const marker of allMarkers) {
          const idx = upperContent.indexOf(marker.toUpperCase());
          if (idx === -1) continue;
          
          // Get text after the marker
          const afterMarker = content.substring(idx + marker.length).replace(/^\s*\n?\s*/, '');
          
          // Find the next ALL-CAPS marker (3+ uppercase letters followed by colon at start of line)
          const nextMarkerMatch = afterMarker.match(/\n\s*([A-ZÅÄÖ][A-ZÅÄÖ \-]{2,}:)/);
          const fieldText = nextMarkerMatch 
            ? afterMarker.substring(0, nextMarkerMatch.index).trim()
            : afterMarker.trim();
          
          if (fieldText) {
            // Remove parenthetical/bracketed instructions at start
            let cleaned = fieldText.replace(/^\([^)]*\)\s*/, '').replace(/^\[[^\]]*\]\s*/, '');
            return cleaned.trim();
          }
        }
        return '';
      };

      const improvedPrompt = extractField('HUVUDTEXT:', ['IMPROVED PROMPT:', 'MAIN TEXT:']);
      const headline = extractField('RUBRIK:', ['HEADLINE:', 'TITLE:']);
      const socialCopy = extractField('SOCIAL MEDIA:', ['SOCIAL COPY:']);
      const instagramCaption = extractField('INSTAGRAM:', ['INSTAGRAM CAPTION:']);
      const showingInvitation = extractField('VISNINGSINBJUDAN:', ['SHOWING INVITATION:', 'VIEWING INVITATION:']);
      const shortAd = extractField('KORT ANNONS:', ['SHORT AD:', 'KORTANNONS:', 'SHORT ADVERTISEMENT:']);

      if (!improvedPrompt || !headline) {
        // Fallback: try JSON parsing if markers didn't work
        try {
          const parsed = JSON.parse(content);
          if (parsed.improvedPrompt && parsed.headline) {
            return {
              improvedPrompt: parsed.improvedPrompt || '',
              headline: parsed.headline || '',
              socialCopy: parsed.socialCopy || '',
              instagramCaption: parsed.instagramCaption || '',
              showingInvitation: parsed.showingInvitation || '',
              shortAd: parsed.shortAd || ''
            };
          }
        } catch {
          // JSON parsing failed, continue with error
        }
        
        throw new Error('Missing required fields in generated content (no HUVUDTEXT or RUBRIK found)');
      }

      return {
        improvedPrompt,
        headline,
        socialCopy,
        instagramCaption,
        showingInvitation,
        shortAd
      };
    } catch (error) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from OpenAI: ' + (error instanceof Error ? error.message : String(error)));
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
        violations.push('double punctuation found in ' + field);
      }

      // Check for space before punctuation
      if (/\s+[.!?,;:]/.test(text)) {
        violations.push(field + ' contains space before punctuation');
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
        violations.push(field + ' contains specific business name');
      }
      if (restaurantPattern.test(text)) {
        violations.push(field + ' contains specific restaurant name');
      }
      if (cafePattern.test(text)) {
        violations.push(field + ' contains specific cafe name');
      }
    }

    // Forbidden phrases validation
    const forbiddenPhrases = FORBIDDEN_PHRASES;
    for (const field of fields) {
      const text = result[field];
      if (typeof text !== 'string') continue;
      for (const phrase of forbiddenPhrases) {
        if (text.toLowerCase().includes(phrase.toLowerCase())) {
          violations.push(field + ' contains forbidden phrase: "' + phrase + '"');
        }
      }
    }

    // Platform-specific validation (Hemnet)
    if (normalizedPlatform === 'hemnet') {
      const pricePattern = /\b(pris|avgift|driftkostnad|utgångspris|kronor|SEK)\b/gi;
      const energyPattern = /\b(energiklass|energiprestanda)\b/gi;
      for (const field of fields) {
        const text = result[field];
        if (typeof text !== 'string') continue;
        const priceMatches = text.match(pricePattern);
        if (priceMatches) violations.push(field + ' contains price/fee (Hemnet violation)');
        const energyMatches = text.match(energyPattern);
        if (energyMatches) violations.push(field + ' contains energiklass (Hemnet violation)');
      }
    }

    // Headline validation
    const headlineWords = result.headline.split(/\s+/).filter(w => w.length > 0).length;
    if (headlineWords > 9) violations.push('headline has ' + headlineWords + ' words (max 9)');
    if (/[.!?]/.test(result.headline.slice(-1))) violations.push('headline has trailing punctuation');

    // Showing invitation validation
    if (!/visning/i.test(result.showingInvitation)) violations.push('showingInvitation missing word visning');

    // Short ad validation
    if (!result.shortAd || result.shortAd.trim().length < 10) violations.push('shortAd is empty or too short');

    // Critical violations
    const criticalViolations = violations.filter(v =>
      v.includes('malformed') || v.includes('missing word') || v.includes('forbidden phrase')
    );
    if (criticalViolations.length > 0) {
      console.error('[GENERATOR_VALIDATION_FAILED]', { platform: normalizedPlatform, criticalViolations });
      throw new GeneratorValidationError(criticalViolations, result);
    }
    if (violations.length > 0) {
      console.warn('[GENERATOR_VALIDATION_WARNINGS]', { platform: normalizedPlatform, warnings: violations });
    }
  }
}
