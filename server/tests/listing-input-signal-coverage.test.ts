import { describe, expect, it } from "vitest";
import { evaluateInputSignalCoverage } from "../lib/listing-input-signal-coverage";

describe("listing input signal coverage", () => {
  it("reports strong signal usage when core facts are present", () => {
    const disposition = {
      property: {
        address: "Storgatan 12, Uppsala",
        size: 76,
        rooms: 3,
        year_built: 1998,
        kitchen: "Kök renoverat 2022",
        bathroom: "Badrum uppdaterat 2020",
        transport: "Resecentrum 5 minuter",
      },
    };
    const text = "Storgatan 12 i Uppsala. Trea om 76 kvm med kök renoverat 2022 och badrum uppdaterat 2020. Resecentrum nås på fem minuter.";
    const summary = evaluateInputSignalCoverage(text, disposition);

    expect(summary.totalSignals).toBeGreaterThanOrEqual(6);
    expect(summary.ratio).toBeGreaterThanOrEqual(0.4);
  });

  it("reports weak usage when text is generic", () => {
    const disposition = {
      property: {
        address: "Storgatan 12, Uppsala",
        size: 76,
        rooms: 3,
        kitchen: "Kök renoverat 2022",
      },
    };
    const summary = evaluateInputSignalCoverage("Fin bostad med bra känsla i attraktivt läge.", disposition);

    expect(summary.totalSignals).toBeGreaterThanOrEqual(3);
    expect(summary.ratio).toBeLessThan(0.5);
    expect(summary.topMissing.length).toBeGreaterThan(0);
  });
});
