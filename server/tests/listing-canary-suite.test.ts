import { describe, expect, it } from "vitest";
import {
  buildDeterministicFallbackDescription,
  buildDispositionFromStructuredData,
  sanitizeGeneratedMarketingField,
  validateOptimizationResult,
} from "../routes";

describe("listing canary suite", () => {
  const cases = [
    {
      name: "lägenhet balanced",
      style: "balanced" as const,
      input: {
        propertyType: "apartment",
        address: "Storgatan 12, 3 tr, Linköping",
        livingArea: 76,
        rooms: 3,
        monthlyFee: 3900,
        balconyDirection: "söder",
        kitchen: "renoverat 2022 med luckor från Ballingslöv",
        bathroom: "helkaklat badrum från 2019",
        transport: "Resecentrum fem minuter bort",
      },
    },
    {
      name: "villa selling",
      style: "selling" as const,
      input: {
        propertyType: "villa",
        address: "Björkvägen 8, Malmö",
        livingArea: 145,
        rooms: 6,
        bedrooms: 4,
        lotSize: 750,
        kitchen: "kök med köksö och vitvaror från Siemens",
        bathroom: "två badrum",
        uniqueSellingPoints: "uteplats i västerläge, trädgård",
        amenities: ["skola fem minuter", "matbutik i närheten"],
      },
    },
    {
      name: "radhus factual",
      style: "factual" as const,
      input: {
        propertyType: "townhouse",
        address: "Parkallén 5, Solna",
        livingArea: 118,
        rooms: 5,
        monthlyFee: 4200,
        kitchen: "kök uppdaterat 2021",
        bathroom: "helkaklat badrum med dusch",
        transport: "tunnelbana tio minuter",
      },
    },
  ];

  it("keeps canary scenarios publishable without severe non-word violations", () => {
    for (const scenario of cases) {
      const structured = buildDispositionFromStructuredData(scenario.input);
      const fallback = buildDeterministicFallbackDescription(structured.disposition, scenario.style);
      const cleaned = sanitizeGeneratedMarketingField(fallback, undefined, scenario.style, { allowParagraphs: true });

      expect(cleaned, `cleaned missing for ${scenario.name}`).toBeTruthy();
      const text = cleaned || "";
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const violations = validateOptimizationResult({ improvedPrompt: text }, "hemnet", 120, 700, scenario.style);
      const nonWordViolations = violations.filter((v) => !v.startsWith("För få ord") && !v.startsWith("För många ord"));
      const severeViolations = nonWordViolations.filter((v) =>
        /dispositionslik|Trasigt|artefakt|berättelseintegritet|Saknar tydlig styckeindelning/i.test(v)
      );

      expect(severeViolations, `severe violations in ${scenario.name}: ${severeViolations.join(" | ")}`).toHaveLength(0);
      expect(nonWordViolations.length, `too many non-word violations in ${scenario.name}: ${nonWordViolations.join(" | ")}`).toBeLessThanOrEqual(1);
      if (wordCount >= 120) {
        expect(text.includes("\n\n"), `paragraphs missing in ${scenario.name}`).toBe(true);
      }
    }
  });
});
