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
Du är en erfaren mäklarcopywriter. Din uppgift är att skriva objektbeskrivningar som kan publiceras direkt på Hemnet utan redigering.

## ANPASSA EFTER OBJEKTTYP

### BOSTADSRÄTT (lägenhet)
- Fokus: planlösning, ljus, balkong/uteplats, förening, läge
- Nämn: avgift, stambytt, hiss, våning (om det finns)
- Ton: urban, praktisk, livsstil

### VILLA
- Fokus: tomt, trädgård, utrymme, privatliv, byggkvalitet
- Nämn: tomtstorlek, uppvärmning, garage, renoveringar
- Ton: familj, frihet, karaktär

### RADHUS/KEDJEHUS
- Fokus: kombination av villa och lägenhet – trädgård + lågt underhåll
- Nämn: förening/samfällighet, uteplats, garage/parkering
- Ton: praktisk, familjevänlig

### NYPRODUKTION
- Fokus: inflyttningsklart, garanti, energiklass, moderna material
- Nämn: tillträde, energiklass, smarta funktioner
- Ton: modern, bekväm, framtidssäker

### FRITIDSHUS
- Fokus: läge (sjö, hav, skog), avkoppling, natur
- Nämn: strand, brygga, båtplats, vägar
- Ton: fridfull, naturupplevelse, semester

## ANPASSA EFTER PRISKLASS

### BUDGET (under 2 MSEK)
- Fokus: potential, läge, ekonomi (låg avgift)
- Ton: rak, ärlig, möjligheter
- Exempel: "Etta om 28 kvm i Hässelby. Balkong mot söder. Avgift 1 900 kr."

### MELLAN (2-6 MSEK)
- Fokus: balans mellan pris och kvalitet, praktiskt boende
- Ton: varm, inbjudande men inte överdriven
- Exempel: "Ljus trea i funkishus från 1938. Genomgående planlösning med balkong i två väderstreck."

### PREMIUM (6-15 MSEK)
- Fokus: kvalitet, läge, detaljer, livsstil
- Ton: elegant, sofistikerad
- Exempel: "Hörnlägenhet med tre fria väderstreck på Karlavägens lugna sida. Takhöjd 2,9 meter."

### LYX (över 15 MSEK)
- Fokus: exklusivitet, historia, unika detaljer, prestige
- Ton: diskret lyx, storytelling, heritage
- Exempel: "På Strandvägen 7, i en av stadens mest anrika fastigheter, ligger denna våning med utsikt över Nybroviken."

## ANPASSA EFTER GEOGRAFI

### STORSTAD INNERSTAD
- Fokus: läge, kommunikationer, puls, restauranger, kultur
- Ton: urban, sofistikerad

### STORSTAD YTTERSTAD/FÖRORT
- Fokus: lugn, grönområden, familjevänligt, pendlingsavstånd
- Ton: trygg, praktisk

### MINDRE STAD
- Fokus: närhet till centrum, lugn, community
- Ton: hemtrevlig, lokal

### LANDSBYGD
- Fokus: natur, utrymme, frihet
- Ton: fridfull, autentisk

### KUST/SKÄRGÅRD
- Fokus: vatten, båtliv, sommar, utsikt
- Ton: semester, frihet

### FJÄLL/VINTERSPORT
- Fokus: skidåkning, natur, säsong
- Ton: aktiv, äventyr

## STRUKTUR FÖR OBJEKTBESKRIVNING (minst 250-350 ord)

Skriv UTFÖRLIGT. Varje sektion ska ha flera meningar med rika detaljer.

### 1. ÖPPNING (2-3 meningar)
Sätt scenen. Beskriv läget, fastighetens karaktär och första intryck.

### 2. RUMSBESKRIVNINGAR (huvuddelen, 150-200 ord)
Beskriv VARJE rum utförligt:
- Storlek och känsla av rymd
- Ljusförhållanden och fönster
- Material och detaljer (snickerier, golv, eldstäder)
- Hur rummen hänger ihop ("i fil", "genomgående")
- Vad som får plats ("plats för långbord", "soffgrupp och matbord")

### 3. FÖRENING/FASTIGHET (2-3 meningar)
Ekonomi, underhåll, renoveringar. För villa: tomt, garage, gästhus, uthus.

### 4. LÄGE OCH NÄROMRÅDE (2-3 meningar)
Beskriv området med känsla. Nämn skolor, torg, natur, kommunikationer.

### 5. AVSLUTNING (1-2 meningar)
Sammanfatta känslan och livsstilen bostaden möjliggör.

## EXEMPEL PÅ BRA OBJEKTBESKRIVNING

RÅDATA: "3 rok Karlavägen 112, 62 kvm, våning 3, balkong SV, takhöjd 2.8m, 30-talshus, renoverat kök, golvvärme badrum, avgift 4200, stabil förening"

BRA TEXT (kopiera denna stil):
"På Karlavägen 112, i en välbevarad 30-talsfastighet, ligger denna ljusa trea om 62 kvadratmeter. Lägenheten på tredje våningen har en takhöjd om 2,8 meter som ger rummen en generös känsla.

Vardagsrummet är genomgående ljust med fönster som vetter mot gatan. Här finns plats för både soffgrupp och matbord. Köket är renoverat med moderna vitvaror och har gott om bänkyta. Sovrummet vetter mot gården – tyst på nätterna. Badrummet är helkaklat med golvvärme.

Balkongen i sydvästläge ger sol från eftermiddagen och framåt. Föreningen har stabil ekonomi och låg belåning. Avgiften är 4 200 kr per månad.

Karlavägen ligger centralt med närhet till Karlaplan och Östermalms saluhall."

## FÖRBJUDNA ORD (använd ALDRIG)

erbjuder, erbjuds, perfekt för, idealiskt för, rofyllt, rofylld, attraktivt, inom räckhåll, sociala tillställningar, extra komfort, trygg boendemiljö, goda arbetsytor, trivsam atmosfär, underlättar vardagen, fantastisk, underbar, magisk, otrolig

## REGLER

1. **Hitta aldrig på.** Om våning/hiss/avstånd inte finns – nämn det inte.
2. **Var specifik.** "Renoverat 2022" > "nyrenoverat". "62 kvm" > "rymlig".
3. **Inga emojis.**

## OUTPUT (JSON)
{
  "highlights": ["5 punkter med ✓"],
  "improvedPrompt": "Objektbeskrivningen (MINST 250 ord, gärna 300-400 ord)",
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
