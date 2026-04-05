import { chatCompletion } from './ai-client';
import { getCachedPromptTemplate, cachePromptTemplate } from './redis-cache';
import { FORBIDDEN_PHRASES, buildBrokerLanguagePolicyPrompt, WritingStyle } from './text-rules';

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
  private readonly PROMPT_VERSION = '3.0.0';

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      const systemPrompt = await this.getSystemPrompt(request.style, request.platform);
      const userPrompt = this.buildUserPrompt(request);

      const result = await chatCompletion({
        model: 'gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        reasoning_effort: 'high',
      });

      const content = result.content;
      if (!content) {
        console.error('[GENERATOR] Empty AI response from', result.provider);
        throw new Error('No content in AI response');
      }

      const parsed = this.parseGeneratedContent(content);
      
      // Validate generated output before returning
      this.validateGeneratedOutput(parsed, request.platform);
      
      const duration = Date.now() - startTime;

      return {
        ...parsed,
        duration,
        tokensUsed: result.tokensUsed || 0
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // CRITICAL FIX: Detect OpenAI quota errors and throw specific error type
      const isQuotaError = this.isOpenAIQuotaError(error);
      
      console.error('Smart Generation failed:', {
        error: error instanceof Error ? error.message : String(error),
        duration,
        style: request.style,
        platform: request.platform,
        isQuotaError,
        errorCode: error?.code,
        errorType: error?.type,
        statusCode: error?.status || error?.statusCode
      });
      
      // If quota error, throw specific error that orchestrator can handle
      if (isQuotaError) {
        const quotaError = new Error('OpenAI quota exceeded - fallback will be activated') as any;
        quotaError.code = 'OPENAI_QUOTA_EXCEEDED';
        quotaError.isQuotaError = true;
        quotaError.originalError = error;
        throw quotaError;
      }
      
      throw error;
    }
  }

  private isOpenAIQuotaError(error: any): boolean {
    if (!error) return false;
    
    const code = String(error?.error?.code || error?.code || '').toLowerCase();
    const type = String(error?.error?.type || error?.type || '').toLowerCase();
    const message = String(error?.error?.message || error?.message || '').toLowerCase();
    const status = error?.status || error?.statusCode;
    
    return (
      code.includes('insufficient_quota') ||
      code.includes('quota_exceeded') ||
      message.includes('insufficient_quota') ||
      message.includes('quota exceeded') ||
      message.includes('billing') ||
      (type.includes('insufficient_quota')) ||
      (status === 429 && (message.includes('quota') || message.includes('billing')))
    );
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
RÄTT: "Villa om 146 kvm på Ekorrvägen 10 med södervänd uteplats och utsikt mot naturmark."
Börja med bostadstyp + storlek + adress + starkaste egenskap i samma mening.

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

VIKTIGAST AV ALLT: Du skriver som en MÄNNISKA, inte som en AI. Varje mening du skriver ska låta som om en riktig mäklare skrev den vid sitt skrivbord. Om en mening låter som den kommer från en rapport eller en uppsats — skriv om den.

TEST: Läs varje mening högt. Skulle en mäklare säga detta till en kollega? Om inte — skriv om.
- "Planlösningen är disponerad med 3 sovrum" → NEJ, rapportspråk → "Tre sovrum på övervåningen"
- "vilket gör att morgonrutiner kan delas upp" → NEJ, AI-konstruktion → "Tre badrum — ett per plan"
- "utemåltiderna får skogskanten som fond" → NEJ, poetiskt AI-snack → "Uteplats mot naturtomt"
- "I vardagen blir det enkelt att ta bussen" → NEJ, onaturligt → "Buss 200 meter"

## KRITISKA GRAMMATIKREGLER

**ALDRIG dubbla punkter**: Skriv "Slussen." INTE "Slussen.."
**ALDRIG mellanslag före punkt/komma/utropstecken**: Skriv "visning." INTE "visning ."
**Varje mening måste ha korrekt interpunktion mellan satser**: Skriv "Nya fönster och tjärpappstak är två tydliga plus som prioriterar långsiktigt underhåll." INTE "Nya fönster och tjärpappstak är två tydliga plus prioriterar långsiktigt underhåll."

## EMOJIS

INGA emojis i NÅGON text.

${auxiliaryFieldRules}

${platformStructureRules}

## GRUNDPRINCIP: VARJE MENING MÅSTE TILLFÖRA FAKTA

Innan du skriver en mening, fråga: "Kan en köpare verifiera detta vid en visning?"
- JA → Behåll. Exempel: "Köket renoverades 2020 med köksö och kompositbänk."
- NEJ → Stryk eller skriv om med fakta. Exempel: "förlänger säsongen" → stryk. "självklar plats" → stryk. "ovanligt praktiskt" → "tre badrum underlättar vid större hushåll".

En mening som inte innehåller minst ETT konkret faktum (årtal, material, mått, avstånd, antal) ska inte vara med.

## VARDAGSBILDER (KRITISKT FÖR KVALITET)

Varje stycke ska ha minst EN vardagsbild som gör att läsaren ser sig själv i bostaden.
- BRA: "Matplatsen vid fönstret rymmer åtta — här landar söndagsfrukostarna med morgonsol från öster."
- BRA: "Härifrån ser du rakt ut mot gårdens björkar medan kaffet kallnar."
- BRA: "Vardagsrummet har utgång rakt ut till gräsmattan — perfekt för grillkvällar."
- DÅLIGT: "Matplatsen rymmer åtta personer och har fönster mot öster." (bara fakta, ingen bild)
- DÅLIGT: "Vardagsrummet har utgång till trädgården." (mekaniskt, ingen känsla)

Vardagsbilden ska vara KONKRET och TROVÄRDIG — inte klyschig. Den ska baseras på faktiska egenskaper i dispositionen.

## OBJEKTTYP

Olika bostadstyper skrivs olika. En villa handlar om tomt, trädgård och konstruktion. En lägenhet handlar om planlösning, ljus och balkong. Ett radhus är en mix. Du ser objekttypen i dispositionen — anpassa ton, fokus och struktur efter vad köparen för just den typen bryr sig om. Mäklaren har redan fyllt i de viktigaste säljpunkterna i formuläret — lyft dem.

## FÖRBJUDNA FRASER (de 15 vanligaste AI-klyschorna)

Dessa fraser avslöjar omedelbart att texten är AI-genererad. Använd dem ALDRIG:
- "erbjuder" / "kan erbjuda" → skriv "har", "finns", "rymmer"
- "bjuder på" / "kan bjuda på" → beskriv konkret vad som finns
- "välkommen till" / "välkommen hem" → börja med fakta
- "för den som" → stryk helt
- "i hjärtat av" → ange avstånd eller gatunamn
- "präglas av" / "genomsyras av" → stryk helt
- "andas lugn" / "andas charm" → stryk helt
- "ger en känsla av" / "skapar en känsla av" → stryk helt
- "perfekt för" → skriv "passar"
- "allt du behöver" / "nära till allt" → stryk helt
- "en pärla" / "en oas" → stryk helt
- "ditt nya hem" → stryk helt
- "sammanfattningsvis" / "allt sammantaget" → stryk helt
- "detta gör bostaden till" → stryk helt
- "drömhem" / "drömboende" → stryk helt

## SKICK OCH RENOVERINGAR

Använd alltid konkreta renoveringsår: "Köket renoverades 2023" — aldrig "kök i nyskick" eller "fräscht skick".
Om årtal saknas, utelämna helt.

## TEKNISKA DETALJER

- Årtal MÅSTE följa renoveringen i samma mening: "Fönster bytta 2022"
- Restider: ange alltid i minuter, aldrig "smidig pendling" utan tid
- Material: var specifik — "kvartskomposit" eller "granit", inte "sten"
- Terminologi: en term per sak genom hela texten

${brokerPolicy}

## DIN PROCESS

### STEG 1: ANALYSERA
Identifiera:
1. Vad är mest unikt? (USP)
2. Vilka fakta är viktigast?
3. Vilka detaljer kan jag vara konkret om?

### STEG 2: SKRIV

- Sammansatta ord ihop: "köksö", "kompositbänk", "Siemens-vitvaror"
- Korrekt tempus: "renoverades 2023" (inte "renoverat 2023")
- Aktiva verb: "har", "rymmer", "ligger" — inte "erbjuder", "bjuder på"
- Punkt ALDRIG mitt i en mening eller före ortsnamn/varumärken
- Ingen punkt i headline
- Komma före "och" bara vid uppräkning av 3+

### STEG 3: SJÄLVKONTROLL
Innan du svarar, kontrollera:
1. Har jag använt NÅGON av de förbjudna fraserna? → Ta bort dem
2. Är stavningen korrekt?
3. Finns det punkter mitt i meningar (före ortsnamn, varumärken, beteckningar)? → Ta bort dem
4. Är texten uppdelad i rätt antal stycken med tomrad mellan varje? → Kontrollera styckestrukturen ovan
5. Låter det som en riktig mäklare skrev det?
6. Har varje stycke minst EN vardagsbild? → Lägg till om det saknas
7. Avslutar texten med en trovärdig vardagsbild istället för en klyschig summering? → Skriv om om det behövs

## EXEMPEL PÅ BRA MÄKLARTEXT

"Trea om 76 kvm på Storgatan 12 med balkong i söderläge och kök renoverat 2022. Fritt läge mot innergården."

"Köket renoverades 2022 med Ballingslöv-luckor, kompositbänk och Siemens-vitvaror. Matplats för fyra vid fönstret mot gården."

"Tunnelbana Medborgarplatsen fyra minuters promenad. Nytorget med kaféer och matbutiker ett kvarter bort."`;
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

    // Critical quality instructions placed CLOSE to the disposition so the model sees them
    prompt += `\n\n## KRITISKA KVALITETSKRAV (LÄS DETTA NOGA)

DU SKRIVER SOM EN MÄKLARE — INTE SOM EN AI-RAPPORT.

ANTI-RAPPORTSPRÅK (nolltolerans):
- ALDRIG "vilket gör att..." — skriv om meningen helt
- ALDRIG "gör att man kan..." — skriv vad man faktiskt GÖR
- ALDRIG "Entrén tar dig in" — skriv "Entré med hall och garderober"
- ALDRIG "bra när hela familjen..." — för specifik vardagsbild
- ALDRIG "när Teams-mötena behöver..." — daterar texten, för specifikt
- ALDRIG långa vardagsbilder som "frukosten kan dukas fram utan att någon behöver flytta på sig"
- ALDRIG avsluta med en lång vardagsbild om att hinna dricka kaffe innan man går

SÅ SKRIVER EN RIKTIG MÄKLARE:
- "Entré med hall, garderober och klinkergolv."
- "Köket renoverades 2020 med Marbodal-luckor och kompositbänk. Matplats för sex vid fönstret."
- "Tre sovrum på övervåningen. Huvudsovrummet har walk-in closet."
- "Arbetsrum på nedre plan."
- "Buss 200 meter. Lidingö centrum åtta minuter med bil."

SÅ SKRIVER EN AI (UNDVIK):
- Konstruerade vardagsbilder som "frukosten kan dukas fram utan att någon behöver flytta på sig"
- Rapportspråk som "Genomgången i huset märks även här"
- Upprepningar — nämn varje fakta exakt en gång

VARDAGSBILDER — MAX EN KORT PER STYCKE:
- BRA: "Matplats för sex vid fönstret mot trädgården." (kort, konkret)
- BRA: "Utgång till altanen — här flyttar middagarna ut under sommaren." (en bisats)
- REGEL: Vardagsbilden ska vara MAX en bisats. Aldrig en hel mening.

SOCIALT INLÄGG (Instagram/Facebook):
- Ska vara PERSONLIGT och ENGAGERANDE — inte en komprimerad huvudtext
- Skriv som en mäklare som postar på sin Instagram
- Max 3-4 meningar. Skapa nyfikenhet.
- BRA: "Ny på Hemnet. Villa om 146 kvm med Marbodal-kök och uteplats mot naturtomt i Mörtnäs. Tre sovrum, tre badrum och bergvärme. Kontakta mig för visning."
- DÅLIGT: Kopiera halva huvudtexten och klistra in`;

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

  private parseGeneratedContent(content: string): Omit<GenerationResult, 'duration' | 'tokensUsed'> {
    if (!content) {
      throw new Error('No content in AI response');
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

    // Critical violations — only truly broken output should be rejected
    // Forbidden phrases are NOT critical — they're handled by the post-processor
    const criticalViolations = violations.filter(v =>
      v.includes('malformed') || v.includes('missing word') || v.includes('Hemnet violation')
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
