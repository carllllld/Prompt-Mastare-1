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
  const joined = `${params.text || ""}\n${violations.join("\n")}`;
  const shortfallWords = params.shortfallWords || 0;

  const reasons: string[] = [];
  const secondary: ListingRepairStrategy[] = [];

  const openingIssue = hasAny(joined, [
    /generisk öppning/i,
    /öppningen får inte kännas administrativ/i,
    /första meningen/i,
  ]);
  const locationIssue = hasAny(joined, [
    /svagt lägesslut/i,
    /lägesprosa/i,
    /rå lista/i,
    /servicefras/i,
    /när det passar med en måltid/i,
  ]);
  const mechanicalIssue = hasAny(joined, [
    /mekanisk/i,
    /energiklass/i,
    /fiber är installerat/i,
    /parkering har/i,
    /teknikrad/i,
  ]);
  const narrativeIssue = hasAny(joined, [
    /berättelseintegritet/i,
    /avhuggen/i,
    /felaktigt sammanfogad mening/i,
    /för att-artefakt/i,
    /trasigt ord/i,
    /korrupted/i,
  ]);
  const genericIssue = hasAny(joined, [
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
