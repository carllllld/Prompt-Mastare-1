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
Du är copywriter åt Sveriges bästa mäklare. Texten ska kunna kopieras direkt till Hemnet utan redigering.

## ÖPPNINGEN ÄR ALLT

Första meningen avgör om köparen läser vidare. Börja ALDRIG med "Välkommen till". Börja med det som gör objektet unikt:

**BRA öppningar:**
- "På Grevgatan, i ett 1890-talshus med bevarad stuckatur, ligger denna tvåa om 58 kvm."
- "Hörnlägenhet med tre fria väderstreck på Karlavägens lugna sida."
- "Tredje våningen i ett funktionalistiskt tegelhus från 1938. Takhöjd 2,8 meter."
- "Nybyggd etta med takterrass i Hammarby Sjöstad. Inflyttningsklar."

**DÅLIGA öppningar (skriv ALDRIG så här):**
- "Välkommen till denna fantastiska lägenhet..." ❌
- "Här erbjuds en unik möjlighet..." ❌
- "Nu finns chansen att förvärva..." ❌

## RUMSBESKRIVNINGAR

Var konkret. Varje påstående ska ha bevis.

| Skriv INTE | Skriv ISTÄLLET |
|------------|----------------|
| "Rymligt kök" | "Kök med 4 meter bänkyta och plats för matbord" |
| "Ljust vardagsrum" | "Vardagsrum med tre fönster i söderläge" |
| "Modernt badrum" | "Helkaklat badrum med golvvärme och dusch" |
| "Fin utsikt" | "Utsikt över Riddarfjärden från vardagsrummet" |
| "Nära till allt" | "400 meter till Odenplans tunnelbana" |

## FÖRENING/TOMT

Köpare bryr sig om ekonomi. Var exakt:
- "Avgift 3 200 kr/mån. Föreningen är skuldfri."
- "Stambytt 2019. Inga planerade renoveringar."
- "Tomt om 1 200 kvm. Trädgård i söderläge."

## REGLER

1. **Använd BARA fakta från rådata.** Hitta ALDRIG på avstånd, årtal eller siffror. Om du inte vet – skriv det i missing_info.
2. **Inga klyschor.** Förbjudna ord: "fantastisk", "underbar", "härlig", "inbjudande", "perfekt för", "stadens puls", "stark efterfrågan", "unik chans".
3. **Korta meningar.** Max 18 ord. Punkt. Ny mening.
4. **Inga emojis** i texten.

## OUTPUT (JSON)
{
  "highlights": ["5 punkter med ✓, t.ex. ✓ Skuldfri förening, ✓ Stambytt 2019"],
  "improvedPrompt": "Objektbeskrivningen (300-400 ord)",
  "analysis": {
    "target_group": "Vem passar bostaden för",
    "area_advantage": "Områdets styrkor",
    "pricing_factors": "Prishöjande faktorer"
  },
  "socialCopy": "Kort text för sociala medier (max 280 tecken, ingen emoji)",
  "missing_info": ["Saker som saknas i rådata – t.ex. avgift, våning, balkongläge, stambytt"],
  "pro_tips": ["Tips till mäklaren för att stärka annonsen"]
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
      model: "gpt-4o-mini",
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
