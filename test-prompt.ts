/**
 * Testskript för att testa objektbeskrivnings-prompten lokalt
 * 
 * Kör: npx tsx test-prompt.ts
 * 
 * Kräver: OPENAI_API_KEY i miljövariabler eller .env-fil
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// --- SAMMA PROMPT SOM I routes.ts ---
const BASIC_REALTOR_PROMPT = `
# KRITISKA REGLER (BRYT ALDRIG DESSA)

1. BÖRJA ALDRIG MED "Välkommen" – börja med adressen eller området
2. SKRIV ALDRIG dessa ord: erbjuder, erbjuds, perfekt, idealisk, rofylld, attraktivt, fantastisk, underbar, luftig, trivsam, inom räckhåll
3. DELA UPP I 4-5 STYCKEN med \\n\\n mellan varje stycke
4. MINST 250 ORD – skriv utförligt om varje rum
5. HITTA ALDRIG PÅ – om info saknas, nämn det inte

# DIN UPPGIFT

Skriv en objektbeskrivning för Hemnet. Texten ska kunna publiceras direkt utan redigering.

# STRUKTUR (följ exakt)

STYCKE 1 - ÖPPNING: Adress + fastighetens karaktär + första intryck (2-3 meningar)
STYCKE 2 - RUM: Beskriv vardagsrum, kök, sovrum med konkreta detaljer (4-5 meningar)
STYCKE 3 - BADRUM/DETALJER: Badrum, balkong, förvaring, material (2-3 meningar)
STYCKE 4 - FÖRENING/FASTIGHET: Avgift, ekonomi, renoveringar (2-3 meningar)
STYCKE 5 - LÄGE: Närområde, kommunikationer, skolor (2-3 meningar)

# EXEMPEL PÅ KORREKT TEXT

INPUT: "3 rok Karlavägen 112, 62 kvm, våning 3, balkong SV, takhöjd 2.8m, 30-talshus, renoverat kök, golvvärme badrum, avgift 4200"

OUTPUT:
"På Karlavägen 112, i en välbevarad 30-talsfastighet, ligger denna ljusa trea om 62 kvadratmeter. Lägenheten på tredje våningen har en takhöjd om 2,8 meter som ger rummen en generös känsla.

Vardagsrummet har fönster mot gatan och rymmer både soffgrupp och matbord. Köket är renoverat med moderna vitvaror och generös bänkyta. Sovrummet vetter mot gården och har plats för dubbelsäng och garderob.

Badrummet är helkaklat med golvvärme. Balkongen i sydvästläge ger sol från eftermiddagen.

Föreningen har stabil ekonomi. Avgiften är 4 200 kr per månad.

Karlavägen ligger centralt med närhet till Karlaplan och tunnelbana."

# OUTPUT FORMAT (JSON)

{
  "highlights": ["✓ Punkt 1", "✓ Punkt 2", "✓ Punkt 3", "✓ Punkt 4", "✓ Punkt 5"],
  "improvedPrompt": "Objektbeskrivningen med stycken separerade av \\n\\n",
  "analysis": {
    "target_group": "Vem passar bostaden för",
    "area_advantage": "Områdets styrkor",
    "pricing_factors": "Prishöjande faktorer"
  },
  "socialCopy": "Kort text för sociala medier (max 280 tecken, ingen emoji)",
  "missing_info": ["Info som saknas i rådata"],
  "pro_tips": ["Tips till mäklaren"]
}
`;

// --- TESTDATA ---
const testCases = [
  {
    name: "Östermalm 2 rok",
    rawData: "2 rok Karlavägen 62 Stockholm Östermalm 62 kvm balkong sydväst renoverat 2022 avgift 4200 kr takhöjd 2,8m 1930-talshus stambytt 2019 skuldfri förening hiss 5 min till Karlaplan",
    platform: "hemnet",
  },
  {
    name: "Södermalm etta",
    rawData: "1 rok Hornsgatan 45 Södermalm 32 kvm nyproduktion 2024 avgift 2100 kr balkong öster hiss tvättmaskin i lgh",
    platform: "hemnet",
  },
  {
    name: "Djursholm villa",
    rawData: "Villa 6 rum Djursholm 180 kvm tomt 1200 kvm byggår 1925 renoverat 2020 garage trädgård söderläge 3 badrum öppen spis",
    platform: "booli",
  },
];

async function testPrompt(testCase: typeof testCases[0]) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TEST: ${testCase.name}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`\nRÅDATA:\n${testCase.rawData}\n`);

  const systemPrompt = `
${BASIC_REALTOR_PROMPT}

## PLATTFORM: ${testCase.platform === "hemnet" ? "HEMNET" : "BOOLI/EGEN SIDA"}

${testCase.platform === "hemnet" ? `
**Hemnet-format:**
- Längd: 300-400 ord
- 5-6 korta stycken
- Rakt på sak, lätt att skanna
` : `
**Booli/egen sida-format:**
- Längd: 450-600 ord
- 6-8 stycken, mer detaljerat
- Lite mer berättande ton
`}

## PÅMINNELSE

- Skriv BARA det som finns i rådata
- Om något saknas (avgift, avstånd, årtal) – hitta INTE på, skriv det i missing_info
- Undvik klyschor och AI-språk
- Korta meningar, naturlig svenska
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user",
          content: `RÅDATA: ${testCase.rawData}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(text);

    console.log("OBJEKTBESKRIVNING:");
    console.log("-".repeat(40));
    console.log(result.improvedPrompt);
    console.log("\nHIGHLIGHTS:");
    result.highlights?.forEach((h: string) => console.log(`  ${h}`));
    console.log("\nMISSING INFO:");
    result.missing_info?.forEach((m: string) => console.log(`  - ${m}`));
    console.log("\nSOCIAL COPY:");
    console.log(`  ${result.socialCopy}`);
    console.log("\nPRO TIPS:");
    result.pro_tips?.forEach((t: string) => console.log(`  - ${t}`));

    // Kolla efter förbjudna ord
    const forbiddenWords = [
      "fantastisk", "underbar", "härlig", "inbjudande", "perfekt för",
      "stadens puls", "stark efterfrågan", "välkommen till", "unik chans"
    ];
    const foundForbidden = forbiddenWords.filter(w => 
      result.improvedPrompt?.toLowerCase().includes(w)
    );
    if (foundForbidden.length > 0) {
      console.log("\n⚠️  VARNING: Förbjudna ord hittades:");
      foundForbidden.forEach(w => console.log(`  - "${w}"`));
    } else {
      console.log("\n✅ Inga förbjudna ord hittades");
    }

  } catch (error: any) {
    console.error("FEL:", error.message);
  }
}

async function main() {
  console.log("🏠 TESTAR OBJEKTBESKRIVNINGS-PROMPTEN");
  console.log("=====================================\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY saknas!");
    console.log("\nSätt miljövariabeln:");
    console.log("  Windows: set OPENAI_API_KEY=sk-...");
    console.log("  Mac/Linux: export OPENAI_API_KEY=sk-...");
    process.exit(1);
  }

  for (const testCase of testCases) {
    await testPrompt(testCase);
  }

  console.log("\n" + "=".repeat(60));
  console.log("KLART!");
  console.log("=".repeat(60));
}

main();
