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

// --- 2-STEGS GENERATION ---

// Steg 1: Extrahera fakta och skapa disposition
const DISPOSITION_PROMPT = `
# UPPGIFT

Extrahera ALLA relevanta fakta från rådata och skapa en strukturerad disposition. Skriv INGEN text, bara fakta.

# REGLER

1. Hitta ALDRIG på – extrahera bara vad som faktiskt finns i rådata
2. Använd exakta värden från rådata (kvm, pris, år, etc)
3. Strukturera i JSON enligt formatet nedan
4. Om info saknas, lämna fältet tomt eller null

# OUTPUT FORMAT (JSON)

{
  "property": {
    "type": "lägenhet/villa/radhus/nyproduktion/fritidshus",
    "address": "exakt adress från rådata",
    "size": 62,
    "rooms": 3,
    "floor": "3 av 5",
    "year_built": "1930-tal",
    "renovations": ["kök 2022", "badrum 2020"],
    "materials": ["parkett", "kakel", "marmor"],
    "balcony": {
      "exists": true,
      "direction": "sydväst"
    }
  },
  "economics": {
    "price": 4500000,
    "fee": 4200,
    "association": {
      "name": "BRF Solhemmet",
      "status": "stabil ekonomi, låg belåning",
      "renovations": "stambytt 2019"
    }
  },
  "location": {
    "area": "Östermalm",
    "transport": ["tunnelbana 5 min", "buss"],
    "amenities": ["Karlaplan", "Östermalms saluhall"],
    "schools": ["Högstadiet", "Gymnasium"]
  },
  "unique_features": ["takhöjd 2.8m", "eldstad", "originaldetaljer"],
  "platform": "hemnet/booli"
}
`;

// Steg 2: Skriv final text baserat på disposition
const TEXT_PROMPT = `
# KRITISKA REGLER (BRYT ALDRIG DESSA)

1. BÖRJA ALDRIG MED "Välkommen" – börja med adressen eller området
2. SKRIV ALDRIG dessa ord: erbjuder, erbjuds, perfekt, idealisk, rofylld, attraktivt, fantastisk, underbar, luftig, trivsam, inom räckhåll
3. DELA UPP I 4-5 STYCKEN med \\n\\n mellan varje stycke
4. MINST 250 ORD – skriv utförligt om varje rum
5. HITTA ALDRIG PÅ – använd bara fakta från dispositionen

# DIN UPPGIFT

Skriv en objektbeskrivning för Hemnet baserat på den strukturerade dispositionen nedan. Texten ska kunna publiceras direkt utan redigering.

# STRUKTUR (följ exakt)

STYCKE 1 - ÖPPNING: Adress + fastighetens karaktär + första intryck (2-3 meningar)
STYCKE 2 - RUM: Beskriv vardagsrum, kök, sovrum med konkreta detaljer (4-5 meningar)
STYCKE 3 - BADRUM/DETALJER: Badrum, balkong, förvaring, material (2-3 meningar)
STYCKE 4 - FÖRENING/FASTIGHET: Avgift, ekonomi, renoveringar (2-3 meningar)
STYCKE 5 - LÄGE: Närområde, kommunikationer, skolor (2-3 meningar)

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
  console.log(`RÅDATA: ${testCase.rawData}`);
  console.log(`PLATTFORM: ${testCase.platform}`);
  console.log("=".repeat(60));

  try {
    // === STEG 1: Extrahera fakta och skapa disposition ===
    console.log("\n[STEG 1] Extraherar fakta...");
    
    const dispositionCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: DISPOSITION_PROMPT + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user",
          content: `RÅDATA: ${testCase.rawData}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const dispositionText = dispositionCompletion.choices[0]?.message?.content || "{}";
    const disposition = JSON.parse(dispositionText);
    
    console.log("DISPOSITION (JSON):");
    console.log(JSON.stringify(disposition, null, 2));

    // === STEG 2: Skriv final text baserat på disposition ===
    console.log("\n[STEG 2] Skriver final text...");
    
    const textCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: TEXT_PROMPT + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user",
          content: `DISPOSITION: ${JSON.stringify(disposition, null, 2)}\n\nPLATTFORM: ${testCase.platform === "hemnet" ? "HEMNET (minst 250-350 ord)" : "BOOLI/EGEN SIDA (minst 400-500 ord)"}`,
        },
      ],
      max_tokens: 4000,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const text = textCompletion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(text);

    console.log("\nOBJEKTBESKRIVNING:");
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
