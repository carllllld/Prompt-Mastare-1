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
        propertyType: string;
        personalStylePrompt?: string;
    }
): { system: string, user: string } {
    const styleNote = context.styleProfile ? `ANVÄNDARENS PERSONLIGA STIL:\n${context.personalStylePrompt || "Följ användarens etablerade tonalitet."}` : "";
    const writingStyleNote = `VALD TEXTSTIL: ${context.writingStyle === "factual" ? "Strikt faktabaserad" : context.writingStyle === "selling" ? "Säljande men trovärdig" : "Balanserad mäklarprosa"}`;

    const baseSystem = `Du är en expert på att förfina svenska fastighetstexter för ${context.propertyType}. 
${writingStyleNote}
${styleNote}

Din uppgift är att korrigera ett specifikt problem i texten nedan. Ändra bara det som är nödvändigt för att lösa problemet och behåll resten av texten intakt. Det är extremt viktigt att du bibehåller användarens personliga stil även under reparationen.`;

    let system = baseSystem;
    let user = `ORIGINALTEXT:\n${text}\n\nPROBLEM ATT LÖSA:\n${violations.join("\n")}`;

    switch (strategy) {
        case "opening_rewrite":
            system = `Du är en copywriter som specialiserat dig på att skriva oemotståndliga öppningar för bostadsannonser. Skriv om de första 1-2 meningarna i texten nedan för att omedelbart fånga läsarens intresse med en konkret och unik detalj. Undvik generiska fraser. Fokusera på det som gör bostaden speciell.

NEGATIVT EXEMPEL (så här ska du INTE skriva):
"Välkommen till denna fina lägenhet med bra läge."

POSITIVT EXEMPEL (så här VILL du skriva):
"Solen skiner in genom de tre fönstren i fil och landar på den nyslipade fiskbensparketten."`
            user = `SKRIV OM ÖPPNINGEN I DENNA TEXT:\n${text}`;
            break;

        case "location_rewrite":
            system = `Du är en expert på att skriva om läge och omgivning. Ditt jobb är att omvandla tråkiga listor med platser till en levande och naturlig beskrivning. Väv in platserna i en berättelse om vardagslivet. Fokusera på nytta för köparen.

NEGATIVT EXEMPEL:
"Nära till ICA (200m), SATS (500m) och T-bana (300m)."

POSITIVT EXEMPEL:
"Morgonkaffet är bara en kort promenad bort, och med både ICA och SATS runt hörnet blir vardagspusslet enkelt att lägga. När du vill in till stan, når du T-banan på fem minuter."`
            user = `SKRIV OM LÄGESBESKRIVNINGEN I DENNA TEXT:\n${text}`;
            break;

        case "mechanical_cleanup":
            system = `Du är en teknisk skribent som är expert på att göra torra fakta läsvärda. Ditt jobb är att väva in tekniska detaljer (som energiklass, fiber, etc.) i den löpande texten på ett naturligt sätt. Undvik separata, mekaniska meningar.

NEGATIVT EXEMPEL:
"Energiklass är C. Fiber är installerat."

POSITIVT EXEMPEL:
"Bostaden är energieffektiv med energiklass C, och med fiber indraget är du redo för framtidens digitala behov."`
            user = `VÄV IN DE TEKNISKA DETALJERNA I DENNA TEXT:\n${text}`;
            break;

        case "narrative_repair":
            system = `Du är en språkkirurg. Ditt jobb är att laga trasiga meningar och ord. Leta efter avhuggna ord, felaktiga sammansättningar och andra uppenbara språkfel. Korrigera dem så att texten blir grammatiskt korrekt och lättläst. Ändra inget annat.

EXEMPEL PÅ FEL:
- "...ett välsköför att kök..." ska bli "...ett välskött kök..."
- "...med en härlig södterass..." ska bli "...med en härlig söderterrass..."`
            user = `LAGA SPRÅKET I DENNA TEXT:\n${text}`;
            break;

        case "length_expansion":
            system = `Du är en skicklig mäklarskribent som kan utveckla en text utan att lägga till nonsens. Ditt jobb är att expandera texten nedan så att den blir längre och mer detaljerad. Använd information som redan finns i texten och utveckla den. Lägg inte till ny fakta. Fokusera på att beskriva befintliga detaljer mer målande.

INSTRUKTION:
- Hitta ett stycke i texten som är kortfattat.
- Lägg till en eller två meningar som beskriver en detalj i det stycket mer ingående.
- Exempel: Om texten säger "Kök med vita luckor", kan du lägga till "De vita, handtagslösa luckorna ger ett stilrent och modernt intryck."`
            user = `EXPANDERA DENNA TEXT:\n${text}`;
            break;

        case "generic_densification":
            system = `Du är en anti-klyscha-expert. Ditt jobb är att ersätta generiska mäklarfraser med konkreta och värdeskapande detaljer. Leta efter tomma ord och fyll dem med innehåll.

NEGATIVT EXEMPEL:
"Lägenheten har en bra planlösning och fina ytskikt."

POSITIVT EXEMPEL:
"Planlösningen är optimal med sovrummen vända mot den tysta innergården, och i hela lägenheten ligger en nylagd enstavig ekparkett."`
            user = `GÖR DENNA TEXT MER KONKRET:\n${text}`;
            break;

        case "surgical_cleanup":
        default:
            system = `Du är en noggrann korrekturläsare. Gör endast små, exakta korrigeringar av de specifika problemen som listas nedan. Rör ingenting annat i texten.

REGLER:
- Ändra BARA det som står i fellistan.
- Behåll textens ton och stil.
- Om ett fel inte kan fixas utan att skriva om en hel mening, lämna det.`
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
