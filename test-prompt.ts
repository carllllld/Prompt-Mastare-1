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
Du skriver objektbeskrivningar i samma stil som Lagerlings, Erik Olsson och andra toppmäklare i Stockholm.

## SÅ HÄR SKRIVER TOPPMÄKLARE (riktiga exempel)

**Lagerlings, Grevgatan 18A:**
"Strålande ljus etagevåning med tyst läge högst upp i gårdshuset på Grevgatan 18. Våningen har en tilltalande planlösning med stora och öppna sällskapsytor, öppen spis, ett påkostat öppet kök och en stor solig terrass."

**Lagerlings, Erik Dahlbergsallén 11:**
"Med bästa läge vid Karlaplan, högt och ljust i vacker nationalromantisk fastighet finns denna välplanerade våning för familjeliv och representation. Våningen är varsamt omhändertagen med de vackra ursprungsdetaljerna bevarade och fina golv av ekparkett och furuplank."

**Lagerlings, Lovisagatan 4:**
"Med ett av Östermalms allra bästa lägen finner vi denna välplanerade och exklusiva tvåa där samtliga material har valts med omsorg och med en tidlös kvalitet. Takhöjden är ca 3 meter. Massiv fiskbensparkett av ek i hela lägenheten förutom i hallen där det ligger marmor."

## VAD DE GÖR

1. **Öppnar med läge + känsla** – "Med bästa läge vid Karlaplan, högt och ljust..."
2. **Nämner arkitekturstil** – "nationalromantisk", "jugend", "funktionalism", "30-tal"
3. **Beskriver material specifikt** – "massiv fiskbensparkett av ek", "marmor i hallen"
4. **Använder värdeord som stöds av fakta** – "påkostat kök" (om det är renoverat), "vacker fastighet" (om det är sekelskifte)
5. **Beskriver hur man lever där** – "för familjeliv och representation", "sällskapsytor"

## REGLER

1. **Hitta aldrig på.** Om våning/hiss/avstånd inte finns i rådata – nämn det inte. Skriv det i missing_info.
2. **Undvik generiska AI-fraser** – inte "Välkommen till denna fantastiska...", inte "Här erbjuds en unik möjlighet..."
3. **Inga emojis.**

## OUTPUT (JSON)
{
  "highlights": ["5 punkter med ✓"],
  "improvedPrompt": "Objektbeskrivningen (350-500 ord)",
  "analysis": {
    "target_group": "Vem passar bostaden för",
    "area_advantage": "Områdets styrkor",
    "pricing_factors": "Prishöjande faktorer"
  },
  "socialCopy": "Kort text för sociala medier (max 280 tecken)",
  "missing_info": ["Saker som saknas i rådata"],
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
