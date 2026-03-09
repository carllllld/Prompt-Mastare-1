import { describe, expect, it } from "vitest";
import {
  buildBlueprintDeveloperAddendum,
  buildBlueprintUserAddendum,
  buildListingGenerationBlueprint,
} from "../lib/listing-orchestrator";

describe("listing orchestrator", () => {
  it("builds a Hemnet apartment blueprint with strong opening priorities and publishable thresholds", () => {
    const blueprint = buildListingGenerationBlueprint({
      plan: "pro",
      platform: "hemnet",
      style: "balanced",
      targetWordMin: 300,
      targetWordMax: 450,
      disposition: {
        property: {
          type: "lägenhet",
          address: "Storgatan 12, 3 tr, Linköping",
          size: 76,
          rooms: 3,
          layout: "öppen planlösning mellan kök och vardagsrum",
          materials: {
            kitchen: "kök renoverat 2022 med luckor från Ballingslöv",
          },
        },
        location: {
          area: "Vasastaden",
          transport: "Resecentrum 5 minuter bort",
        },
        unique_features: ["balkong i söderläge", "takhöjd om 2,70 meter"],
      },
      toneAnalysis: {
        inferred_buyer: "par eller liten familj",
      },
      writingPlan: {
        emphasis_notes: ["lyft balkongen tidigt", "håll lägesstycket selektivt"],
      },
    });

    expect(blueprint.propertyType).toBe("lägenhet");
    expect(blueprint.qualityThresholds.minimumPublishableWordMin).toBe(195);
    expect(blueprint.qualityThresholds.strongPublishableWordFloor).toBeGreaterThan(195);
    expect(blueprint.platformDirective.openingPriority[0]).toContain("balkong");
    expect(blueprint.audience).toBe("par eller liten familj");
    expect(blueprint.mustIncludeFacts.some((item) => item.includes("76 kvm"))).toBe(true);
    expect(blueprint.emphasisPoints).toContain("balkong i söderläge");
    expect(blueprint.collaborationModel.roles).toHaveLength(3);
    expect(blueprint.collaborationModel.roles[0].role).toBe("Objektstrateg");
    expect(blueprint.collaborationModel.workflow[0]).toContain("1-3 styrkor");
  });

  it("builds a Booli house blueprint with calmer location strategy and allows full rewrite above free", () => {
    const blueprint = buildListingGenerationBlueprint({
      plan: "premium",
      platform: "booli",
      style: "selling",
      targetWordMin: 420,
      targetWordMax: 620,
      disposition: {
        property: {
          type: "villa",
          address: "Tallstigen 4, Värmdö",
          size: 145,
          rooms: 6,
          materials: {
            kitchen: "kök med köksö och vitvaror från Siemens",
            bathroom: "två badrum",
          },
        },
        location: {
          area: "Mörtnäs",
          transport: "buss mot Slussen",
        },
        unique_features: ["trädgård", "uteplats i västerläge"],
      },
    });

    expect(blueprint.propertyType).toBe("villa");
    expect(blueprint.platformDirective.locationStrategy).toContain("naturlig prosa");
    expect(blueprint.repairPolicy.allowFullRewrite).toBe(true);
    expect(blueprint.qualityThresholds.minimumEvidenceSignals).toBe(5);
    expect(blueprint.platformDirective.openingPriority[0]).toContain("uteplats");
  });

  it("renders blueprint prompt addenda with concrete Swedish guidance", () => {
    const blueprint = buildListingGenerationBlueprint({
      plan: "free",
      platform: "hemnet",
      style: "factual",
      targetWordMin: 200,
      targetWordMax: 300,
      disposition: {
        property: {
          type: "apartment",
          address: "Kungsgatan 8, Uppsala",
          size: 54,
          rooms: 2,
        },
        location: {
          transport: "tågstation 7 minuter",
        },
      },
    });

    const developerAddendum = buildBlueprintDeveloperAddendum(blueprint);
    const userAddendum = buildBlueprintUserAddendum(blueprint);

    expect(developerAddendum).toContain("ORKESTRERINGSBLUEPRINT");
    expect(developerAddendum).toContain("Publicerbar miniminivå");
    expect(developerAddendum).toContain("Samarbetsmodell");
    expect(developerAddendum).toContain("Objektstrateg");
    expect(userAddendum).toContain("MÅLPROFIL");
    expect(userAddendum).toContain("EXPERTBORD");
    expect(userAddendum).toContain("SAMARBETSSÄTT");
    expect(userAddendum).toContain("Kungsgatan 8, Uppsala");
    expect(userAddendum).toContain("Publicerbar miniminivå");
  });
});
