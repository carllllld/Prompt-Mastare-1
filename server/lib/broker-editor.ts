/**
 * Broker Editor — AI-driven quality pass that reads the generated text
 * as an experienced Swedish broker and rewrites sentences that sound like AI.
 * 
 * Runs AFTER generation, BEFORE post-processing.
 */

import { chatCompletion } from "./ai-client";

export interface BrokerEditRequest {
  improvedPrompt: string;
  platform: string;
  style: string;
}

export interface BrokerEditResult {
  improvedPrompt: string;
  editsApplied: number;
  duration: number;
}

function buildEditorPrompt(platform: string): string {
  const isHemnet = platform?.toLowerCase() === "hemnet";

  return `Du är redaktör på en av Sveriges största mäklarfirmor. Du har granskat tusentals objektbeskrivningar och vet exakt hur en publiceringsredo text ska se ut.

DIN UPPGIFT: Läs texten nedan och skriv om den så att den håller publiceringsstandard. Behåll alla fakta. Ändra bara hur de uttrycks.

## VAD DU LETAR EFTER

1. KONSTRUERADE VARDAGSBILDER
En bra objektbeskrivning har korta, trovärdiga vardagsbilder — inte långa konstruktioner.
- FEL: "Frukosten kan dukas fram utan att någon behöver flytta på sig"
- FEL: "Bra när hela familjen kliver in samtidigt med blöta skor"
- FEL: "Här är det lätt att ta en snabb tur till hållplatsen och ändå hinna dricka upp kaffet"
- RÄTT: "Matplats för sex vid fönstret mot trädgården"
- RÄTT: "Utgång till altanen — här flyttar middagarna ut under sommaren"
Om du hittar en konstruerad vardagsbild: korta ner den till max en bisats, eller ta bort den helt.

2. UPPREPNINGAR
Objektbeskrivningar ska aldrig upprepa samma fakta. Om "uteplats mot naturtomt" nämns i öppningen, ska det inte nämnas igen. Om "fritt läge" nämns en gång, räcker det. Ta bort alla upprepningar.

3. RAPPORTSPRÅK
Mäklare skriver korta, konkreta meningar. Inte rapporter.
- FEL: "Den genomgående planlösningen tillsammans med det fria läget mot naturtomt märks särskilt på eftermiddagen"
- FEL: "Genomgången i huset märks även här, där det är enkelt att röra sig mellan inne och ute"
- RÄTT: "Genomgående planlösning med ljus från flera håll"
Om du hittar rapportspråk: skriv om till kort, konkret mäklarsvenska.

4. ONÖDIGA TILLÄGG
Meningar som inte tillför verifierbar fakta ska bort.
- FEL: "lätt att stänga om man vill sitta ostört" (efter "arbetsrum med dörr")
- FEL: "ger en bra bild av vardagsekonomin" (efter driftkostnad)
- FEL: "Här går det snabbt att få ihop morgonen"
Om du hittar onödiga tillägg: ta bort dem.

5. TERMINOLOGI
${isHemnet ? `HEMNET-REGLER: Pris, avgift, driftkostnad, boarea, rum, våning, byggår, energiklass och BRF-namn visas i separata fält på Hemnet. NÄMN DEM INTE i texten. Om texten innehåller "Avgift X kr/mån" eller "Driftkostnad X kr" — ta bort hela meningen.` : `BOOLI-REGLER: Avgift/driftkostnad KAN nämnas men bara som kort fakta: "Driftkostnad 4 200 kr/år." Aldrig med tillägg som "ger en bra bild av vardagsekonomin".`}
- Villa har DRIFTKOSTNAD, inte avgift. BRF/lägenhet har AVGIFT.
- Skriv "Bergvärme" — inte "Huset värms med bergvärme" (onödigt långt).
- Skriv "Laddbox för elbil" — inte "på uppfarten finns laddbox för elbil" (onödigt långt).

6. JURIDISK KORREKTHET
- Skriv aldrig "nyskick" eller "perfekt skick" utan renoveringsår som bevis
- Skriv aldrig "nära skola" utan avstånd i meter eller minuter
- Skriv aldrig "lugnt läge" om det finns motorväg eller järnväg i närheten
- Alla påståenden om skick måste kunna verifieras vid visning

7. STYCKESTRUKTUR
Texten ska ha 4-5 stycken med tomrad mellan. Varje stycke ska ha ett tydligt fokus:
- Stycke 1: Öppning (bostadstyp + storlek + adress + starkaste egenskap)
- Stycke 2: Planlösning, kök, vardagsrum
- Stycke 3: Sovrum, badrum, teknik
- Stycke 4: Uteplats/utemiljö (om relevant)
- Stycke 5: Läge och kommunikationer

## REGLER
- Behåll ALLA fakta (adress, kvm, rum, renoveringsår, material, avstånd)
- Hitta ALDRIG PÅ nya fakta
- Om en mening redan är bra — rör den inte
- Returnera BARA den omskrivna texten, ingen kommentar`;
}


export async function brokerEdit(request: BrokerEditRequest): Promise<BrokerEditResult> {
  const startTime = Date.now();

  try {
    const systemPrompt = buildEditorPrompt(request.platform);

    const result = await chatCompletion({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `PLATTFORM: ${request.platform}
STIL: ${request.style}

OBJEKTBESKRIVNING ATT GRANSKA OCH FÖRBÄTTRA:
${request.improvedPrompt}`
        },
      ],
      max_tokens: 3000,
      reasoning_effort: "medium",
    });

    const edited = result.content?.trim();
    if (!edited || edited.length < 50) {
      return {
        improvedPrompt: request.improvedPrompt,
        editsApplied: 0,
        duration: Date.now() - startTime,
      };
    }

    // Count changed sentences
    const originalSentences = request.improvedPrompt.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const editedSentences = edited.split(/[.!?]+/).filter(s => s.trim().length > 10);
    let editsApplied = 0;
    for (let i = 0; i < Math.min(originalSentences.length, editedSentences.length); i++) {
      if (originalSentences[i]?.trim() !== editedSentences[i]?.trim()) {
        editsApplied++;
      }
    }
    editsApplied += Math.abs(originalSentences.length - editedSentences.length);

    return {
      improvedPrompt: edited,
      editsApplied,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[BrokerEditor] Failed:", error);
    return {
      improvedPrompt: request.improvedPrompt,
      editsApplied: 0,
      duration: Date.now() - startTime,
    };
  }
}
