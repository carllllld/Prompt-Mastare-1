/**
 * AI Säljstrateg — Sales Strategy Generator
 * 
 * Generates a complete sales strategy for a property listing,
 * including target audience analysis, ranked selling points,
 * pricing perspective, showing strategy, and ad optimization.
 * 
 * Premium-only feature (599 kr/mån).
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

export interface SalesStrategyInput {
  propertyData: Record<string, any>;
  generatedText?: string;
  platform?: string;
}

export interface TargetAudienceAnalysis {
  primary: string;
  secondary: string;
  reasoning: string;
}

export interface SellingPoint {
  rank: number;
  argument: string;
  whyItMatters: string;
}

export interface PricingPerspective {
  positioning: string;
  textSuggestion: string;
}

export interface ShowingStrategy {
  tips: string[];
  openingMove: string;
}

export interface AdOptimization {
  bestPublishDay: string;
  bestPublishTime: string;
  firstImageSuggestion: string;
  reasoning: string;
}

export interface SalesStrategyResult {
  targetAudience: TargetAudienceAnalysis;
  sellingPoints: SellingPoint[];
  pricingPerspective: PricingPerspective;
  showingStrategy: ShowingStrategy;
  adOptimization: AdOptimization;
  generatedAt: string;
}

/**
 * Derive property category for smarter targeting.
 * Swedish market segments: familj, par, singel, pensionär, investerare.
 */
function derivePropertyProfile(pd: Record<string, any>): {
  sizeCategory: string;
  likelyBuyers: string;
  priceSegment: string;
  areaType: string;
} {
  const rooms = Number(pd.totalRooms || pd.rooms || 0);
  const area = Number(pd.livingArea || 0);
  const price = Number(String(pd.price || "0").replace(/\D/g, ""));
  const type = String(pd.propertyType || "apartment").toLowerCase();
  const hasGarden = Boolean(pd.gardenDescription || pd.lotArea);
  const hasBalcony = Boolean(pd.balconyArea || pd.balconyDirection);

  // Size category
  let sizeCategory = "medium";
  if (rooms <= 2 || area <= 50) sizeCategory = "small";
  else if (rooms >= 5 || area >= 120) sizeCategory = "large";

  // Likely buyers based on Swedish market patterns
  let likelyBuyers = "par";
  if (sizeCategory === "small") likelyBuyers = "singel_eller_par";
  else if (sizeCategory === "large" && (type === "villa" || type === "house")) likelyBuyers = "familj";
  else if (rooms >= 4) likelyBuyers = "familj_eller_par";
  if (type === "villa" || type === "house" || type === "townhouse") {
    if (rooms >= 4) likelyBuyers = "familj";
  }

  // Price segment (Swedish market 2025-2026)
  let priceSegment = "medel";
  if (price > 8000000) priceSegment = "premium";
  else if (price > 4000000) priceSegment = "övre_medel";
  else if (price < 2000000) priceSegment = "budget";

  // Area type guess
  let areaType = "stad";
  if (type === "villa" || type === "house") areaType = "villaområde";
  if (hasGarden && Number(pd.lotArea || 0) > 800) areaType = "lantligt";

  return { sizeCategory, likelyBuyers, priceSegment, areaType };
}

function buildStrategyPrompt(input: SalesStrategyInput): string {
  const pd = input.propertyData;
  const profile = derivePropertyProfile(pd);

  // Build a clean data summary — skip empty fields
  const dataLines: string[] = [];
  const addLine = (label: string, value: any) => {
    if (value && String(value).trim() && String(value).trim() !== "0") {
      dataLines.push(`- ${label}: ${String(value).trim()}`);
    }
  };

  addLine("Typ", pd.propertyType);
  addLine("Adress", pd.address);
  addLine("Område", pd.area || pd.neighborhood);
  addLine("Pris", pd.price);
  addLine("Boarea", pd.livingArea ? `${pd.livingArea} kvm` : "");
  addLine("Rum", pd.totalRooms || pd.rooms);
  addLine("Sovrum", pd.bedrooms);
  addLine("Badrum", pd.bathrooms);
  addLine("Balkong/uteplats", [pd.balconyArea ? `${pd.balconyArea} kvm` : "", pd.balconyDirection].filter(Boolean).join(", "));
  addLine("Skick", pd.condition);
  addLine("Byggår", pd.buildYear);
  addLine("Avgift", pd.monthlyFee);
  addLine("Våning", pd.floor);
  addLine("Hiss", pd.elevator ? "Ja" : "");
  addLine("Parkering", pd.parking);
  addLine("Kommunikationer", pd.transport);
  addLine("Kök", pd.kitchenDescription);
  addLine("Badrum (detaljer)", pd.bathroomDescription);
  addLine("USP", pd.uniqueSellingPoints);
  addLine("Trädgård", pd.gardenDescription);
  addLine("Tomtarea", pd.lotArea ? `${pd.lotArea} kvm` : "");
  addLine("Utsikt", pd.view);
  addLine("Speciellt", pd.specialFeatures);
  addLine("Uppvärmning", pd.heating);
  addLine("Golv", pd.flooring);

  const dataBlock = dataLines.join("\n");

  return `Du är en erfaren svensk fastighetsmäklare med 15+ års erfarenhet av att sälja bostäder i hela Sverige. Du har djup kunskap om den svenska bostadsmarknaden, Hemnet-statistik, köparbeteenden och visningsstrategier.

BOSTADSDATA:
${dataBlock}

PROFILANALYS (baserat på data):
- Storlekskategori: ${profile.sizeCategory}
- Trolig köpargrupp: ${profile.likelyBuyers}
- Prissegment: ${profile.priceSegment}
- Områdestyp: ${profile.areaType}

${input.generatedText ? `GENERERAD OBJEKTBESKRIVNING (för kontext):\n${input.generatedText.substring(0, 1200)}\n` : ""}

UPPGIFT: Generera en komplett, HANDLINGSBAR säljstrategi. Varje punkt ska vara så specifik att mäklaren kan agera på den direkt — inga generiska råd.

## 1. MÅLGRUPPSANALYS (targetAudience)

Analysera VEM som köper denna bostad baserat på:
- Bostadstyp + storlek → familj, par utan barn, singel, pensionär, investerare
- Läge → pendlingsavstånd, skolor, nattliv, natur
- Pris → inkomstnivå, förstagångsköpare vs uppgraderare
- Speciella egenskaper → trädgård (familj), balkong söder (par), hiss (äldre)

SVENSKA KÖPARMÖNSTER att beakta:
- Ettor/tvåor i stad: singlar 25-35, par utan barn, investerare
- Treor i stad: par 30-45, småbarnsfamiljer, separerade föräldrar med delad vårdnad
- Fyror+ i stad: etablerade familjer, par som vill ha gästrum/kontor
- Villor: barnfamiljer 35-50, par som vill ha trädgård
- Radhus: förstagångsvillaköpare, familjer som vill ha trädgård utan underhållsbörda

Skriv:
- primary: 2-3 meningar om primär målgrupp med KONKRET motivering
- secondary: 1-2 meningar om sekundär målgrupp
- reasoning: Kort motivering kopplad till specifika egenskaper i bostadsdatan

## 2. SÄLJARGUMENT RANGORDNADE (sellingPoints)

Rangordna de 5 starkaste säljargumenten baserat på vad som DRIVER KÖPBESLUT för målgruppen.

SVENSKA KÖPARES PRIORITERINGAR (i ordning):
1. Läge (pendling, skolor, service) — alltid viktigast
2. Skick/renoveringar (nytt kök, badrum, stammar) — minskar risk
3. Planlösning (genomgående, ljus, fungerande vardagsflöde)
4. Uteplats/balkong (väderstreck, storlek)
5. Ekonomi (avgift, driftkostnad, energiklass)
6. Förvaring (garderober, förråd, källare)

Varje argument ska vara SPECIFIKT för denna bostad:
- BRA: "Ballingslöv-kök renoverat 2022 — köparen slipper köksbyte de närmaste 15 åren"
- DÅLIGT: "Bra kök" (generiskt, säger ingenting)

## 3. PRISSÄTTNINGSPERSPEKTIV (pricingPerspective)

Baserat på bostadstyp, storlek, skick och läge:
- positioning: Hur ska mäklaren PRATA om priset? Konkret strategi.
  - Nyproduktionsjämförelse: "Motsvarande nyproduktion kostar X mer, och här får du [fördel]"
  - Renoveringsvärde: "Kök och badrum renoverade — köparen sparar 200-400 tkr jämfört med orenoverat"
  - Lägesvärde: "Priset per kvm ligger [under/i linje med/över] snittet för [område]"
  - Driftkostnad: "Bergvärme ger ca X kr lägre driftkostnad per år jämfört med direktverkande el"
- textSuggestion: En konkret formulering mäklaren kan använda i samtal med spekulanter

## 4. VISNINGSSTRATEGI (showingStrategy)

Konkreta, handlingsbara tips baserat på DENNA bostad. Tänk som en erfaren mäklare som förbereder visning.

BEPRÖVADE VISNINGSTEKNIKER:
- Visa starkaste rummet FÖRST (kök om nyrenoverat, balkong om söderläge, trädgård om sommar)
- Tända alla lampor + öppna gardiner 30 min före visning
- Kaffe/doft i köket om det är nyrenoverat (förstärker intrycket)
- Blommor på matbordet och i badrummet
- Visa förvaringen — öppna garderober och visa att de rymmer
- Om balkong/uteplats: ha den möblerad och inbjudande
- Om villa: börja UTOMHUS med trädgård/fasad, gå sedan in
- Om lägenhet: börja med det rum som har bäst ljus

tips: Array med 3-5 SPECIFIKA tips för denna bostad (inte generiska)
openingMove: Exakt vad mäklaren ska visa/säga FÖRST — baserat på bostadens starkaste egenskap

## 5. ANNONSOPTIMERING (adOptimization)

HEMNET-STATISTIK (baserat på branschdata):
- Söndag kväll (18-21) har högst trafik — flest scrollar Hemnet efter helgen
- Tisdag-onsdag kväll (18-20) har näst högst trafik — folk planerar visningar
- Undvik fredag eftermiddag och lördag förmiddag — lägst aktivitet
- Publicera 2-3 dagar FÖRE planerad visning för maximal exponering
- Första bilden avgör om köparen klickar — den MÅSTE visa bostadens USP

BILDSTRATEGI baserat på bostadstyp:
- Lägenhet med balkong: balkong med utsikt som första bild (om söder/väster)
- Lägenhet utan balkong: ljusaste rummet eller nyrenoverat kök
- Villa: fasad med trädgård i förgrunden (sommar) eller upplyst fasad (vinter)
- Radhus: trädgårdssidan med uteplats
- Nyrenoverat kök: köket som första bild (starkaste säljargumentet)

Skriv:
- bestPublishDay: Specifik dag med motivering kopplad till visningsdatum
- bestPublishTime: Specifik tid med motivering
- firstImageSuggestion: EXAKT vilken bild som bör vara först, baserat på denna bostads egenskaper
- reasoning: Kort motivering kopplad till Hemnet-beteende

REGLER:
- Var KONKRET. Varje punkt ska vara handlingsbar — mäklaren ska kunna agera direkt.
- Basera ALLT på den faktiska bostadsdatan. Hitta inte på egenskaper.
- Om data saknas för en sektion, skriv det bästa du kan baserat på det som finns.
- Skriv på svenska. Professionell men inte stelt — som en kollega som ger råd.
- Svara BARA med JSON.

JSON-format:
{
  "targetAudience": { "primary": "...", "secondary": "...", "reasoning": "..." },
  "sellingPoints": [{ "rank": 1, "argument": "...", "whyItMatters": "..." }, ...],
  "pricingPerspective": { "positioning": "...", "textSuggestion": "..." },
  "showingStrategy": { "tips": ["...", "...", "..."], "openingMove": "..." },
  "adOptimization": { "bestPublishDay": "...", "bestPublishTime": "...", "firstImageSuggestion": "...", "reasoning": "..." }
}`;
}


export async function generateSalesStrategy(input: SalesStrategyInput): Promise<SalesStrategyResult> {
  const prompt = buildStrategyPrompt(input);

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "system",
        content: `Du är en erfaren svensk fastighetsmäklare och säljstrateg med 15+ års erfarenhet. Du har sålt hundratals bostäder i hela Sverige och vet exakt vad som fungerar.

DIN EXPERTIS:
- Du vet vilka köpargrupper som attraheras av olika bostadstyper i Sverige
- Du vet hur Hemnet fungerar — trafikmönster, klickbeteende, annonsoptimering
- Du vet hur man förbereder en visning som säljer — från doft till belysning till rumsordning
- Du vet hur man pratar om pris med spekulanter — positionering, jämförelser, värdeargument
- Du vet vilka säljargument som driver köpbeslut för svenska bostadsköpare

VIKTIGT:
- Ge KONKRETA, HANDLINGSBARA råd — inte generiska tips
- Basera allt på den faktiska bostadsdatan
- Skriv som en kollega som ger råd, inte som en lärobok
- Svara alltid med giltig JSON`
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Inget svar från AI");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Kunde inte tolka AI-svaret som JSON");
  }

  // Validate and normalize the response
  const result: SalesStrategyResult = {
    targetAudience: {
      primary: parsed.targetAudience?.primary || "Kunde inte analysera målgrupp baserat på tillgänglig data.",
      secondary: parsed.targetAudience?.secondary || "",
      reasoning: parsed.targetAudience?.reasoning || "",
    },
    sellingPoints: Array.isArray(parsed.sellingPoints)
      ? parsed.sellingPoints.slice(0, 5).map((sp: any, i: number) => ({
          rank: sp.rank || i + 1,
          argument: sp.argument || "",
          whyItMatters: sp.whyItMatters || "",
        }))
      : [],
    pricingPerspective: {
      positioning: parsed.pricingPerspective?.positioning || "",
      textSuggestion: parsed.pricingPerspective?.textSuggestion || "",
    },
    showingStrategy: {
      tips: Array.isArray(parsed.showingStrategy?.tips)
        ? parsed.showingStrategy.tips.slice(0, 5)
        : [],
      openingMove: parsed.showingStrategy?.openingMove || "",
    },
    adOptimization: {
      bestPublishDay: parsed.adOptimization?.bestPublishDay || "Söndag",
      bestPublishTime: parsed.adOptimization?.bestPublishTime || "18:00-20:00",
      firstImageSuggestion: parsed.adOptimization?.firstImageSuggestion || "",
      reasoning: parsed.adOptimization?.reasoning || "",
    },
    generatedAt: new Date().toISOString(),
  };

  // Quality check: ensure selling points aren't empty
  if (result.sellingPoints.length === 0) {
    result.sellingPoints = [{
      rank: 1,
      argument: "Otillräcklig data",
      whyItMatters: "Fyll i fler fält i formuläret för att få bättre säljargument.",
    }];
  }

  return result;
}
