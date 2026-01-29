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
    "renovations": ["kök 2022", "badrum 2020", "fönster 2021"],
    "materials": {
      "floors": "parkettgolv i ek",
      "walls": "målade väggar, originalsnickerier",
      "kitchen": "marmor bänkskiva",
      "bathroom": "kakel och klinker",
      "windows": "träfönster med 3-glas",
      "doors": "originaldörrar med höga socklar"
    },
    "balcony": {
      "exists": true,
      "direction": "sydväst",
      "size": "8 kvm",
      "type": "inglasad balkong"
    },
    "windows": {
      "description": "stora fönsterpartier med djupa nischer",
      "directions": ["mot gata", "mot gård"],
      "special": "överljus i vardagsrum"
    },
    "ceiling_height": "2.8 meter",
    "layout": "genomgående planlösning, sovrum i fil",
    "storage": ["garderob i sovrum", "förråd i källare 4 kvm"],
    "heating": "fjärrvärme, golvvärme badrum",
    "ventilation": "FTX-ventilation"
  },
  "economics": {
    "price": 4500000,
    "fee": 4200,
    "association": {
      "name": "BRF Solhemmet",
      "status": "stabil ekonomi, låg belåning 15%",
      "renovations": "stambytt 2019, fönsterbytte 2021",
      "fund": "underhållsfond 2.3 MSEK",
      "insurance": "försäkring ingår i avgiften"
    },
    "running_costs": {
      "heating": "1200 kr/år",
      "water": "300 kr/mån",
      "garbage": "150 kr/mån"
    }
  },
  "location": {
    "area": "Östermalm",
    "subarea": "stadskärnan",
    "transport": ["tunnelbana 5 min till Karlaplan", "buss 2 min", "cykel 10 min till city"],
    "amenities": ["Karlaplan", "Östermalms saluhall", "Djurgården", "Vasaparken"],
    "schools": ["Högstadiet 300m", "Gymnasium 500m"],
    "services": ["ICA 200m", "Apotek 150m", "Systembolaget 300m"],
    "character": "lugn gata med villaområden, nära citypuls"
  },
  "unique_features": ["takhöjd 2.8m med originalstuckatur", "eldstad i vardagsrum", "bevarade originaldetaljer", "inglasad balkong", "genomgående planlösning"],
  "legal_info": {
    "leasehold": null,
    "planning_area": "bostadsområde",
    "building_permit": "bygglov 1930"
  },
  "platform": "hemnet/booli"
}
`;

// --- HEMNET FORMAT (snabb scanning, USP-fokuserat) ---
const HEMNET_TEXT_PROMPT = `
# KRITISKA REGLER (BRYT ALDRIG DESSA)

1. BÖRJA ALDRIG MED "Välkommen" – börja med adressen eller området
2. SKRIV ALDRIG dessa ord: erbjuder, erbjuds, perfekt, idealisk, rofylld, attraktivt, fantastisk, underbar, luftig, trivsam, inom räckhåll
3. DELA UPP I 4-5 KORTA STYCKEN med \\n\\n mellan varje stycke
4. 300-400 ORD – tätstyckad och lätt att skanna
5. HITTA ALDRIG PÅ – använd bara fakta från dispositionen

# DIN UPPGIFT

Skriv en objektbeskrivning för HEMNET. Fokus på USP (Unique Selling Points) och snabb scanning.

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

// --- BOOLI/EGEN SIDA FORMAT (berättande, livsstil) ---
const BOOLI_TEXT_PROMPT = `
# KRITISKA REGLER (BRYT ALDRIG DESSA)

1. BÖRJA ALDRIG MED "Välkommen" – börja med adressen eller området
2. SKRIV ALDRIG dessa ord: erbjuder, erbjuds, perfekt, idealisk, rofylld, attraktivt, fantastisk, underbar, luftig, trivsam, inom räckhåll
3. DELA UPP I 6-8 STYCKEN med \\n\\n mellan varje stycke
4. 450-600+ ORD – berättande och utförlig
5. HITTA ALDRIG PÅ – använd bara fakta från dispositionen

# DIN UPPGIFT

Skriv en objektbeskrivning för BOOLI/egen sida. Fokus på livsstil, känsla och berättelse.

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
    
    // Välj rätt prompt baserat på plattform
    const selectedPrompt = testCase.platform === "hemnet" ? HEMNET_TEXT_PROMPT : BOOLI_TEXT_PROMPT;
    console.log(`[STEG 2] Using ${testCase.platform.toUpperCase()} prompt...`);
    
    const textCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: selectedPrompt + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user",
          content: `DISPOSITION: ${JSON.stringify(disposition, null, 2)}\n\nPLATTFORM: ${testCase.platform === "hemnet" ? "HEMNET" : "BOOLI/EGEN SIDA"}`,
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
