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

function buildStrategyPrompt(input: SalesStrategyInput): string {
  const pd = input.propertyData;
  const propertyType = pd.propertyType || "lägenhet";
  const address = pd.address || "Okänd adress";
  const area = pd.area || pd.neighborhood || "";
  const price = pd.price || "";
  const livingArea = pd.livingArea || "";
  const rooms = pd.totalRooms || pd.rooms || "";
  const bedrooms = pd.bedrooms || "";
  const bathrooms = pd.bathrooms || "";
  const balconyDirection = pd.balconyDirection || "";
  const balconyArea = pd.balconyArea || "";
  const condition = pd.condition || "";
  const buildYear = pd.buildYear || "";
  const monthlyFee = pd.monthlyFee || "";
  const floor = pd.floor || "";
  const elevator = pd.elevator ? "Ja" : "";
  const parking = pd.parking || "";
  const transport = pd.transport || "";
  const neighborhood = pd.neighborhood || "";
  const kitchenDescription = pd.kitchenDescription || "";
  const bathroomDescription = pd.bathroomDescription || "";
  const uniqueSellingPoints = pd.uniqueSellingPoints || "";
  const gardenDescription = pd.gardenDescription || "";
  const lotArea = pd.lotArea || "";
  const view = pd.view || "";
  const specialFeatures = pd.specialFeatures || "";

  return `Du är en erfaren svensk fastighetsmäklare och säljstrateg. Analysera denna bostad och ge en komplett säljstrategi.

BOSTADSDATA:
- Typ: ${propertyType}
- Adress: ${address}
- Område: ${area}
- Pris: ${price}
- Boarea: ${livingArea} kvm
- Rum: ${rooms} (${bedrooms} sovrum, ${bathrooms} badrum)
- Balkong/uteplats: ${balconyArea} kvm, ${balconyDirection}
- Skick: ${condition}
- Byggår: ${buildYear}
- Avgift: ${monthlyFee}
- Våning: ${floor}
- Hiss: ${elevator}
- Parkering: ${parking}
- Kommunikationer: ${transport}
- Område: ${neighborhood}
- Kök: ${kitchenDescription}
- Badrum: ${bathroomDescription}
- USP: ${uniqueSellingPoints}
- Trädgård: ${gardenDescription}
- Tomtarea: ${lotArea}
- Utsikt: ${view}
- Speciellt: ${specialFeatures}

${input.generatedText ? `GENERERAD OBJEKTBESKRIVNING:\n${input.generatedText.substring(0, 1500)}` : ""}

UPPGIFT: Generera en komplett säljstrategi i JSON-format med följande sektioner:

1. MÅLGRUPPSANALYS (targetAudience):
   - primary: 2-3 meningar om primär målgrupp (vem köper denna bostad?)
   - secondary: 1-2 meningar om sekundär målgrupp
   - reasoning: Kort motivering baserat på bostadsdata

2. SÄLJARGUMENT RANGORDNADE (sellingPoints):
   - Array med exakt 5 objekt, rangordnade efter vad som driver köpbeslut för målgruppen
   - Varje objekt: { rank: 1-5, argument: "kort rubrik", whyItMatters: "varför detta driver köpbeslut" }
   - Basera på ALLA formulärfält + målgruppsanalys

3. PRISSÄTTNINGSPERSPEKTIV (pricingPerspective):
   - positioning: Hur positionera priset? "Prisvärde jämfört med nyproduktion" eller "I linje med området"
   - textSuggestion: Konkret formulering mäklaren kan använda

4. VISNINGSSTRATEGI (showingStrategy):
   - tips: Array med 3-4 konkreta tips baserat på objektet. Ex: "Visa balkongen först — söderläget är starkaste argumentet"
   - openingMove: Vad ska mäklaren säga/visa FÖRST vid visningen?

5. ANNONSOPTIMERING (adOptimization):
   - bestPublishDay: Bästa dag att publicera (tisdag-torsdag har högst trafik på Hemnet)
   - bestPublishTime: Bästa tid (kväll 18-21 har högst aktivitet)
   - firstImageSuggestion: Vilken bild bör vara först i annonsen?
   - reasoning: Kort motivering

REGLER:
- Var KONKRET och HANDLINGSBAR. Inga generiska råd.
- Basera allt på den faktiska bostadsdatan.
- Skriv på svenska.
- Svara BARA med JSON, inget annat.

JSON-format:
{
  "targetAudience": { "primary": "...", "secondary": "...", "reasoning": "..." },
  "sellingPoints": [{ "rank": 1, "argument": "...", "whyItMatters": "..." }, ...],
  "pricingPerspective": { "positioning": "...", "textSuggestion": "..." },
  "showingStrategy": { "tips": ["...", "..."], "openingMove": "..." },
  "adOptimization": { "bestPublishDay": "...", "bestPublishTime": "...", "firstImageSuggestion": "...", "reasoning": "..." }
}`;
}


export async function generateSalesStrategy(input: SalesStrategyInput): Promise<SalesStrategyResult> {
  const prompt = buildStrategyPrompt(input);

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: "Du är en erfaren svensk fastighetsmäklare och säljstrateg. Svara alltid med giltig JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2000,
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
      primary: parsed.targetAudience?.primary || "Kunde inte analysera målgrupp",
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
      tips: Array.isArray(parsed.showingStrategy?.tips) ? parsed.showingStrategy.tips.slice(0, 4) : [],
      openingMove: parsed.showingStrategy?.openingMove || "",
    },
    adOptimization: {
      bestPublishDay: parsed.adOptimization?.bestPublishDay || "Tisdag",
      bestPublishTime: parsed.adOptimization?.bestPublishTime || "18:00-20:00",
      firstImageSuggestion: parsed.adOptimization?.firstImageSuggestion || "",
      reasoning: parsed.adOptimization?.reasoning || "",
    },
    generatedAt: new Date().toISOString(),
  };

  return result;
}
