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

  it("maps alias paths for critical signals from nested disposition structures", () => {
    const disposition = {
      property: {
        address: "Ekorrvägen 10, Mörtnäs, Värmdö",
        size: 146,
        rooms: 5,
        materials: {
          kitchen: "renoverat kök",
          bathroom: "helkaklat badrum",
        },
      },
      location: {
        transport: "buss 25 minuter till Slussen",
      },
    };
    const text = "Ekorrvägen 10 i Mörtnäs. Villa om 146 kvm med 5 rum, renoverat kök, helkaklat badrum och buss 25 minuter till Slussen.";
    const summary = evaluateInputSignalCoverage(text, disposition);

    expect(summary.critical.find((c) => c.path === "property.size")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.rooms")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.kitchen")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.bathroom")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.transport")?.used).toBe(true);
  });

  it("marks kitchen as used even when description uses different kitchen phrasing", () => {
    const disposition = {
      property: {
        size: 146,
        rooms: 5,
        kitchen: "renoverat kök med köksö",
        bathroom: "helkaklat badrum",
        transport: "buss 25 minuter till Slussen",
      },
    };
    const text = "Villa om 146 kvm med 5 rum. Från hallen öppnar planlösningen upp mot kök och vardagsrum. Badrummet är uppdaterat och buss till Slussen tar cirka 25 minuter.";
    const summary = evaluateInputSignalCoverage(text, disposition);

    expect(summary.critical.find((c) => c.path === "property.kitchen")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.bathroom")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.transport")?.used).toBe(true);
  });

  it("flags missing bathroom and room mismatch in long broker-like prose", () => {
    const disposition = {
      property: {
        address: "Ekorrvägen 10, Mörtnäs, Värmdö",
        size: 146,
        rooms: 5,
        kitchen: "renoverat kök",
        bathroom: "helkaklat badrum",
      },
      location: {
        transport: "buss 25 minuter till Slussen",
      },
    };

    const text = "Villa om 146 kvm på Ekorrvägen 10 i Mörtnäs, Värmdö med södervänd uteplats och inbyggd jacuzzi. Planlösningen är genomgående och tre sovrum samlar familjens privata delar. Ekparkett och mörkoljad ekparkett ger en tydlig linje mellan rummen och vardagen fungerar smidigt. Bussen tar dig till Slussen på cirka 25 minuter.";
    const summary = evaluateInputSignalCoverage(text, disposition);

    expect(summary.critical.find((c) => c.path === "property.address")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.size")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.rooms")?.used).toBe(false);
    expect(summary.critical.find((c) => c.path === "property.kitchen")?.used).toBe(false);
    expect(summary.critical.find((c) => c.path === "property.bathroom")?.used).toBe(false);
    expect(summary.critical.find((c) => c.path === "property.transport")?.used).toBe(true);
  });

  it("accepts bedrooms as room coverage when bedroom column exists", () => {
    const disposition = {
      property: {
        address: "Ekorrvägen 10, Mörtnäs, Värmdö",
        size: 146,
        rooms: 5,
        bedrooms: 3,
        bathrooms: 2,
        kitchen: "renoverat kök",
        bathroom: "helkaklat badrum",
      },
      location: {
        transport: "buss 25 minuter till Slussen",
      },
    };
    const text = "Villa om 146 kvm på Ekorrvägen 10 i Mörtnäs med tre sovrum, två badrum, renoverat kök och buss till Slussen på cirka 25 minuter.";
    const summary = evaluateInputSignalCoverage(text, disposition);

    expect(summary.critical.find((c) => c.path === "property.rooms")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.bedrooms")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.bathrooms")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.kitchen")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.bathroom")?.used).toBe(true);
    expect(summary.critical.find((c) => c.path === "property.transport")?.used).toBe(true);
  });
});
