import { describe, expect, it } from "vitest";
import {
  buildRepairPromptAddendum,
  buildSpecializedRepairPrompt,
  selectRepairStrategy,
} from "../lib/listing-repair-strategies";

describe("listing repair strategies", () => {
  it("classifies weak opening issues as opening rewrite", () => {
    const selection = selectRepairStrategy({
      violations: ["Generisk öppning utan tydlig stark detalj — första meningen måste kännas som publicerad mäklartext."],
      text: "En trea om 76 kvm med kök och vardagsrum.",
    });

    expect(selection.primary).toBe("opening_rewrite");
    expect(selection.reasons.some((reason) => reason.includes("öppningen"))).toBe(true);
  });

  it("prioritizes narrative repair when corrupted artifacts are present", () => {
    const selection = selectRepairStrategy({
      violations: ['Trasigt ord med inbakad "för att"-artefakt'],
      text: "Planlösningen är sammanhåför attllen och läget gör det lätt att börja Värmepumpen är ny.",
    });

    expect(selection.primary).toBe("narrative_repair");
    expect(selection.reasons.some((reason) => reason.includes("narrativ") || reason.includes("ordartefakter"))).toBe(true);
    expect(buildRepairPromptAddendum(selection)).toContain("Återställ trasiga ord");
  });

  it("adds length expansion when shortfall exists", () => {
    const selection = selectRepairStrategy({
      violations: ["Svagt lägesslut — sista meningen känns som uppräkning i stället för selektiv lägesprosa."],
      text: "Kort text med svagt slut.",
      shortfallWords: 28,
    });

    expect(selection.primary).toBe("location_rewrite");
    expect(selection.secondary).toContain("length_expansion");
  });

  it("builds prompt addendum with ordered strategy instructions", () => {
    const selection = selectRepairStrategy({
      violations: ["Mekanisk teknikrad efter energiklass"],
      text: "Energiklass är B. Fiber är installerat.",
    });

    const addendum = buildRepairPromptAddendum(selection);
    expect(addendum).toContain("REPARATIONSSTRATEGI");
    expect(addendum).toContain("mechanical_cleanup");
    expect(addendum).toContain("Väv in eller ta bort mekaniska teknik- och faktarader");
  });

  it("injects target audience context into specialized repair prompts", () => {
    const prompt = buildSpecializedRepairPrompt(
      "surgical_cleanup",
      "Storgatan 12, Linköping. Kort text.",
      ["Generisk öppning utan tydlig stark detalj"],
      {
        writingStyle: "balanced",
        propertyType: "lägenhet",
        targetAudience: "par eller liten familj",
        requiredFacts: ["76 kvm", "3 rum"],
      }
    );

    expect(prompt.system).toContain("TROLIG KÖPARE: par eller liten familj");
    expect(prompt.system).toContain("FAKTA SOM MÅSTE BEVARAS");
    expect(prompt.system).toContain("76 kvm");
  });
});
