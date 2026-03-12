import { describe, expect, it } from "vitest";
import { evaluateBlueprintCoverage } from "../lib/listing-blueprint-coverage";

describe("listing blueprint coverage", () => {
  it("detects high coverage when prioritized facts are present", () => {
    const result = evaluateBlueprintCoverage(
      "Storgatan 12 med 76 kvm, kök renoverat 2022 och balkong i söderläge nära Resecentrum.",
      [
        "Boyta om 76 kvm",
        "Kök renoverat 2022",
        "Balkong i söderläge",
      ]
    );

    expect(result.required).toBe(3);
    expect(result.matched).toBeGreaterThanOrEqual(2);
    expect(result.ratio).toBeGreaterThan(0.6);
  });

  it("detects missing coverage when facts are absent", () => {
    const result = evaluateBlueprintCoverage(
      "Fin bostad i bra läge.",
      [
        "Boyta om 76 kvm",
        "Kök renoverat 2022",
        "Balkong i söderläge",
      ]
    );

    expect(result.required).toBe(3);
    expect(result.matched).toBeLessThanOrEqual(1);
    expect(result.missing.length).toBeGreaterThan(1);
  });
});
