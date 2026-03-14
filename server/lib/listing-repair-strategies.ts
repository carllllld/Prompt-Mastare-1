import { buildBrokerLanguagePolicyPrompt, type WritingStyle } from "./text-rules";

export type ListingRepairStrategy =
  | "opening_rewrite"
  | "location_rewrite"
  | "mechanical_cleanup"
  | "narrative_repair"
  | "length_expansion"
  | "generic_densification"
  | "surgical_cleanup";

export interface RepairStrategySelection {
  primary: ListingRepairStrategy;
  secondary: ListingRepairStrategy[];
  reasons: string[];
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function selectRepairStrategy(params: {
  violations: string[];
  text: string;
  shortfallWords?: number;
}): RepairStrategySelection {
  const violations = params.violations || [];
  const joinedText = params.text || "";
  const joinedViolations = violations.join("\n");
  const shortfallWords = params.shortfallWords || 0;

  const reasons: string[] = [];
  const secondary: ListingRepairStrategy[] = [];

  const openingIssue = hasAny(joinedViolations, [
    /generisk öppning/i,
    /öppningen får inte kännas administrativ/i,
    /första meningen/i,
  ]);
  const locationIssue = hasAny(joinedViolations, [
    /svagt lägesslut/i,
    /lägesprosa/i,
    /rå lista/i,
    /servicefras/i,
    /när det passar med en måltid/i,
  ]);
  const mechanicalIssue = hasAny(joinedViolations, [
    /mekanisk/i,
    /energiklass/i,
    /fiber är installerat/i,
    /parkering har/i,
    /teknikrad/i,
  ]);
  const narrativeIssue = hasAny(joinedViolations, [
    /berättelseintegritet/i,
    /avhuggen/i,
    /felaktigt sammanfogad mening/i,
    /för att-artefakt/i,
    /trasigt ord/i,
    /korrupted/i,
  ]);
  const genericIssue = hasAny(joinedViolations, [
    /generiska mäklarabstraktioner/i,
    /saknar konkret/i,
    /rådata-känsla/i,
    /upprepning/i,
  ]);

  if (shortfallWords > 0) {
    reasons.push(`texten saknar ${shortfallWords} ord till publicerbar miniminivå`);
    secondary.push("length_expansion");
  }
  if (openingIssue) {
    reasons.push("öppningen är för svag eller administrativ");
    secondary.push("opening_rewrite");
  }
  if (locationIssue) {
    reasons.push("lägespartiet behöver skrivas om till naturlig prosa");
    secondary.push("location_rewrite");
  }
  if (mechanicalIssue) {
    reasons.push("texten innehåller mekaniska eller tekniska faktarader");
    secondary.push("mechanical_cleanup");
  }
  if (narrativeIssue) {
    reasons.push("texten har trasig narrativ integritet eller ordartefakter");
    secondary.push("narrative_repair");
  }
  if (genericIssue) {
    reasons.push("texten behöver mer konkret evidenstäthet och mindre abstraktion");
    secondary.push("generic_densification");
  }

  const primary = narrativeIssue
    ? "narrative_repair"
    : openingIssue
      ? "opening_rewrite"
      : locationIssue
        ? "location_rewrite"
        : mechanicalIssue
          ? "mechanical_cleanup"
          : shortfallWords > 0
            ? "length_expansion"
            : genericIssue
              ? "generic_densification"
              : "surgical_cleanup";

  const dedupedSecondary = secondary.filter((strategy, index) => secondary.indexOf(strategy) === index && strategy !== primary);

  return {
    primary,
    secondary: dedupedSecondary,
    reasons: reasons.length > 0 ? reasons : ["inga tydliga specialproblem identifierades; använd kirurgisk cleanup"],
  };
}

export function buildSpecializedRepairPrompt(
    strategy: ListingRepairStrategy, 
    text: string, 
    violations: string[],
    context: {
        styleProfile?: any;
        writingStyle: string;
        platform?: string;
        propertyType: string;
        personalStylePrompt?: string;
        targetAudience?: string | null;
        requiredFacts?: string[];
    }
): { system: string, user: string } {
    const styleNote = context.styleProfile ? `ANVÄNDARENS PERSONLIGA STIL:\n${context.personalStylePrompt || "Följ användarens etablerade tonalitet."}` : "";
    const writingStyleNote = `VALD TEXTSTIL: ${context.writingStyle === "factual" ? "Strikt faktabaserad" : context.writingStyle === "selling" ? "Säljande men trovärdig" : "Balanserad mäklarprosa"}`;
    const audienceNote = context.targetAudience ? `TROLIG KÖPARE: ${context.targetAudience}` : "";
    const requiredFactsNote = Array.isArray(context.requiredFacts) && context.requiredFacts.length > 0
        ? `FAKTA SOM MÅSTE BEVARAS:\n- ${context.requiredFacts.join("\n- ")}`
        : "";
    const style: WritingStyle = context.writingStyle === "factual" || context.writingStyle === "selling" ? context.writingStyle : "balanced";
    const languagePolicyNote = buildBrokerLanguagePolicyPrompt(style, context.platform);

    const baseSystem = `Du är en expert på att förfina svenska fastighetstexter för ${context.propertyType}. 
${writingStyleNote}
${styleNote}
${audienceNote}
${requiredFactsNote}
${languagePolicyNote}

Din uppgift är att korrigera ett specifikt problem i texten nedan. Ändra bara det som är nödvändigt för att lösa problemet och behåll resten av texten intakt. Det är extremt viktigt att du bibehåller användarens personliga stil även under reparationen.`;

    let system = baseSystem;
    let user = `ORIGINALTEXT:\n${text}\n\nPROBLEM ATT LÖSA:\n${violations.join("\n")}\n\nSVARSFORMAT: Svara endast med giltig json: {"corrected_text":"..."} `;

    switch (strategy) {
        case "opening_rewrite":
            system = `${baseSystem}

Du är en copywriter som specialiserat dig på att skriva oemotståndliga öppningar för bostadsannonser. Skriv om de första 1-2 meningarna i texten nedan för att omedelbart fånga läsarens intresse med en konkret och unik detalj.

REGLER FÖR ÖPPNINGEN:
- Börja ALDRIG med "Välkommen", "Här", "Denna", "Letar du efter" eller liknande AI-fraser.
- Börja direkt med gatuadressen eller en unik, konkret egenskap hos bostaden.
- Skapa en visuell bild av boendet direkt.

NEGATIVT EXEMPEL (SÅ HÄR SKA DU INTE SKRIVA):
"Välkommen till denna fina lägenhet med bra läge."

POSITIVT EXEMPEL (SÅ HÄR VILL DU SKRIVA):
"Solen skiner in genom de tre fönstren i fil och landar på den nyslipade fiskbensparketten."`;
            user = `SKRIV OM ÖPPNINGEN I DENNA TEXT:\n${text}\n\nSVARSFORMAT: Svara endast med giltig json: {"corrected_text":"..."} `;
            break;

        case "location_rewrite":
            system = `${baseSystem}

Du är en expert på att skriva om läge och omgivning. Ditt jobb är att omvandla tråkiga listor med platser till en levande och naturlig beskrivning. 

REGLER FÖR LÄGESBESKRIVNINGEN:
- Undvik att lista avstånd i meter eller kilometer (t.ex. "200m bort").
- Använd istället tidsmått eller beskrivningar som "runt hörnet", "en kort promenad" eller "fem minuter på cykel".
- Väv in platserna i en berättelse om vardagslivet.

NEGATIVT EXEMPEL:
"Nära till ICA (200m), SATS (500m) och T-bana (300m)."

POSITIVT EXEMPEL:
"Morgonkaffet är bara en kort promenad bort, och med både ICA och SATS runt hörnet blir vardagspusslet enkelt att lägga. När du vill in till stan, når du T-banan på fem minuter."`;
            user = `SKRIV OM LÄGESBESKRIVNINGEN I DENNA TEXT:\n${text}\n\nSVARSFORMAT: Svara endast med giltig json: {"corrected_text":"..."} `;
            break;

        case "mechanical_cleanup":
            system = `${baseSystem}

Du är en teknisk skribent som är expert på att göra torra fakta läsvärda. Ditt jobb är att väva in tekniska detaljer (som energiklass, fiber, etc.) i den löpande texten på ett naturligt sätt. 

REGLER FÖR TEKNISK STÄDNING:
- Ta bort separata meningar som bara listar fakta (t.ex. "Parkering har laddplats").
- Om en teknisk detalj inte passar in i flödet, ta bort den helt istället för att låta den stå kvar som en mekanisk rad.
- Energiklass ska nämnas i förbigående, inte som en egen rubrik eller rad.

NEGATIVT EXEMPEL:
"Energiklass är C. Fiber är installerat."

POSITIVT EXEMPEL:
"Bostaden är energieffektiv med energiklass C, och med fiber indraget är du redo för framtidens digitala behov."`;
            user = `VÄV IN DE TEKNISKA DETALJERNA I DENNA TEXT ELLER TA BORT DEM OM DE STÖR FLÖDET:\n${text}\n\nSVARSFORMAT: Svara endast med giltig json: {"corrected_text":"..."} `;
            break;

        case "narrative_repair":
            system = `${baseSystem}

Du är en språkkirurg specialiserad på att laga trasiga meningar och AI-genererade ordartefakter.

SPECIFIKA FEL ATT LAGA:
- Fuserade ord som "köketför att", "vardagsrummetför att", "sovrumetför att".
- Trasiga ord som "välsköför att", "användningssäför att".
- Felstavningar som "södterass" (ska vara söderterrass).
- Avhuggna meningar som slutar tvärt eller saknar verb.

Gör endast de nödvändiga korrigeringarna för att återställa språkets integritet. Ändra inget annat.`;
            user = `LAGA SPRÅKET I DENNA TEXT:\n${text}\n\nSVARSFORMAT: Svara endast med giltig json: {"corrected_text":"..."} `;
            break;

        case "length_expansion":
            system = `${baseSystem}

Du är en skicklig mäklarskribent som kan utveckla en text utan att lägga till nonsens. Ditt jobb är att expandera texten nedan genom att fördjupa beskrivningen av bostadens existerande egenskaper.

REGLER FÖR EXPANSION:
- Lägg INTE till nya fakta som inte finns i texten.
- Beskriv befintliga detaljer mer målande och målgruppsanpassat för en ${context.propertyType}.
- Utöka texten med 20-50 ord per stycke där det känns naturligt.
- Behåll den personliga stilen och tonaliteten.

POSITIVT EXEMPEL:
Original: "Köket har vita luckor och bra arbetsytor."
Expanderad: "Det välplanerade köket har vita, handtagslösa luckor som ger ett stilrent intryck, och de generösa arbetsytorna bjuder in till både vardagsmatlagning och större middagsbjudningar."`;
            user = `EXPANDERA DENNA TEXT:\n${text}\n\nSVARSFORMAT: Svara endast med giltig json: {"expanded_text":"..."} `;
            break;

        case "generic_densification":
            system = `${baseSystem}

Du är en anti-klyscha-expert. Ditt jobb är att ersätta generiska mäklarfraser med konkreta och värdeskapande detaljer.

REGLER FÖR KONKRETISERING:
- Ersätt ord som "fina", "bra", "trevlig", "perfekt" med beskrivningar av material, ljusinsläpp eller funktion.
- Undvik AI-markörer som "vilket ger en känsla av", "inbjuder till", "andas...".
- Fokusera på bevis (evidens) istället för påståenden.

NEGATIVT EXEMPEL:
"Lägenheten har en bra planlösning och fina ytskikt."

POSITIVT EXEMPEL:
"Planlösningen binder samman sociala ytor med tydlig möblerbarhet, sovrummen ligger mot den tysta innergården och i lägenheten ligger nylagd enstavsparkett i ek."`;
            user = `GÖR DENNA TEXT MER KONKRET OCH TA BORT KLYSCHOR:\n${text}\n\nSVARSFORMAT: Svara endast med giltig json: {"corrected_text":"..."} `;
            break;

        case "surgical_cleanup":
        default:
            system = `${baseSystem}

Du är en noggrann korrekturläsare. Gör endast små, exakta korrigeringar av de specifika problemen som listas nedan. Rör ingenting annat i texten.

REGLER:
- Ändra BARA det som står i fellistan.
- Behåll textens ton och stil.
- Om ett fel inte kan fixas utan att skriva om en hel mening, lämna det.

SVARSFORMAT:
Svara endast med giltig json: {"corrected_text":"..."}`
            break;
    }

    return { system, user };
}

export function buildRepairPromptAddendum(selection: RepairStrategySelection): string {
  const strategyInstructions: Record<ListingRepairStrategy, string> = {
    opening_rewrite: "Prioritera att skriva om öppningen så att första meningen bär annonsen med en konkret styrka tidigt.",
    location_rewrite: "Skriv om lägesdelen till selektiv, naturlig mäklarprosa utan uppräkning av namn eller servicepunkter.",
    mechanical_cleanup: "Väv in eller ta bort mekaniska teknik- och faktarader som stör rytmen.",
    narrative_repair: "Återställ trasiga ord, felaktiga satsövergångar och avhuggna meningar till korrekt svensk prosa.",
    length_expansion: "Bygg ut texten med nya verifierbara fakta på rätt plats tills den når publicerbar längd utan utfyllnad.",
    generic_densification: "Öka konkretionsgrad och evidenstäthet; ersätt abstrakta mäklarfraser med verifierbara detaljer.",
    surgical_cleanup: "Gör endast små exakta korrigeringar där problemen faktiskt finns.",
  };

  const orderedStrategies = [selection.primary, ...selection.secondary];
  const lines = [
    "REPARATIONSSTRATEGI:",
    `- Primär strategi: ${selection.primary}`,
    ...selection.reasons.map((reason) => `- Problem som måste lösas: ${reason}`),
    ...orderedStrategies.map((strategy) => `- ${strategyInstructions[strategy]}`),
  ];

  return lines.join("\n");
}
