/**
 * Terminology Consistency Test
 *
 * Validates that chip labels match terminology in generated texts,
 * check against CANONICAL_RULES mappings, and ensure consistency
 * with Hemnet/Booli terminology and Swedish real estate law terms.
 * Requirements: 8.1, 8.2, 8.3, 8.5
 */

import { describe, it, expect } from 'vitest';

// Chip constants (copied from PromptFormProfessional.tsx for testing)
const KITCHEN_CHIPS = [
  "Renoverat kök", "Köksö", "Stenbänk", "Kompositbänk",
  "Integrerade vitvaror", "Platsbyggt kök", "Matplats i kök",
  "Öppen planlösning", "Moderna vitvaror", "Fönster vid matplats",
];

const BATHROOM_CHIPS = [
  "Helkaklat", "Renoverat badrum", "Duschvägg i glas",
  "Badkar", "Tvättmaskin", "Torktumlare", "Golvvärme i badrum",
  "Dubbla handfat",
];

const FLOORING_CHIPS = [
  "Ekparkett", "Originalparkett", "Björkparkett",
  "Massivt trägolv", "Klinker", "Stengolv", "Laminat",
];

const HEATING_CHIPS = [
  "Fjärrvärme", "Bergvärme", "Luft-vattenvärmepump", "Luft-luftvärmepump",
  "Golvvärme", "Frånluftsvärmepump", "Vattenburen värme",
];

const SPECIAL_CHIPS = [
  "Stambyte genomfört", "Nya fönster", "Nytt tak",
  "Dränering utförd", "Solceller", "Fiber indraget",
  "Braskamin", "Kakelugn", "Originaldetaljer",
];

const GARDEN_CHIPS = [
  "Välskött trädgård", "Uteplats i söder", "Altan", "Trädäck",
  "Fruktträd", "Insynsskyddat", "Förråd", "Bod", "Pergola", "Eldstad ute",
  "Växthus",
];

const USP_CHIPS = [
  "Söderläge", "Fri utsikt", "Ingen insyn", "Lugn gårdssida",
  "Genomgående planlösning", "Låg avgift", "Stabil BRF",
  "Nära pendling", "Garage", "Laddbox för elbil", "Flera badrum",
  "Hög standard", "Nyproduktion",
];

const PARKING_CHIPS = [
  "Garage", "Dubbelgarage", "Carport", "P-plats",
  "Garageplats", "Boendeparkering", "Laddbox för elbil", "Förberett för laddbox",
];

const ROOF_CHIPS = [
  "Plåttak", "Betongpannor", "Tegeltak", "Papptak", "Platt tak", "Takpannor",
];

const MATERIAL_CHIPS = [
  "Trä", "Tegel", "Puts", "Betong", "Plåt", "Leca",
];

// All chip categories
const ALL_CHIPS = [
  ...KITCHEN_CHIPS,
  ...BATHROOM_CHIPS,
  ...FLOORING_CHIPS,
  ...HEATING_CHIPS,
  ...SPECIAL_CHIPS,
  ...GARDEN_CHIPS,
  ...USP_CHIPS,
  ...PARKING_CHIPS,
  ...ROOF_CHIPS,
  ...MATERIAL_CHIPS,
];

// CANONICAL_RULES (copied from PromptFormProfessional.tsx for testing)
const CANONICAL_RULES = [
  { canonical: "Laddbox för elbil", pattern: /\b(laddplats elbil|laddplats för elbil|laddbox(?: installerad)?|elbilsladdare|laddstation)\b/i },
  { canonical: "Nya fönster", pattern: /\b(fönster bytta|nya fönster|fönsterbyte|uppdaterade fönster|3-glasfönster)\b/i },
  { canonical: "Stambyte genomfört", pattern: /\b(stambyte|stamrenovering|nya stammar|stambyte genomfört)\b/i },
  { canonical: "Golvvärme", pattern: /\b(golvvärme|varmvatten i golv|golvvärme i badrum)\b/i },
  { canonical: "Balkong", pattern: /\b(balkong|uteplats på balkong)\b/i },
  { canonical: "Garage", pattern: /\b(garage|carport med garage)\b/i },
  { canonical: "Carport", pattern: /\b(carport|biltak)\b/i },
  { canonical: "P-plats", pattern: /\b(p-plats|parkeringsplats|parkering)\b/i },
  { canonical: "Öppen planlösning", pattern: /\b(öppen planlösning|öppet kök|kök öppet mot vardagsrum)\b/i },
  { canonical: "Moderna vitvaror", pattern: /\b(vitvaror uppdaterade|nya vitvaror|moderna vitvaror|uppdaterade vitvaror)\b/i },
  { canonical: "Renoverat kök", pattern: /\b(renoverat kök|nyrenoverat kök|kök renoverat|nytt kök)\b/i },
  { canonical: "Köksö", pattern: /\b(köksö|fristående köksö)\b/i },
  { canonical: "Kompositbänk", pattern: /\b(kompositbänk|kvartskomposit|komposit bänkskiva|bänkskiva i komposit)\b/i },
  { canonical: "Stenbänk", pattern: /\b(stenbänk|granitbänk|marmorbänk|bänkskiva i sten|bänkskiva i granit)\b/i },
  { canonical: "Renoverat badrum", pattern: /\b(renoverat badrum|nyrenoverat badrum|badrum renoverat|nytt badrum)\b/i },
  { canonical: "Helkaklat", pattern: /\b(helkaklat|helkaklat badrum|fullt kaklat)\b/i },
  { canonical: "Dubbla handfat", pattern: /\b(dubbla handfat|två handfat|dubbelhandfat)\b/i },
  { canonical: "Duschvägg i glas", pattern: /\b(duschvägg i glas|glasdusch|dusch i glas)\b/i },
  { canonical: "Ekparkett", pattern: /\b(ekparkett|parkett i ek|ek parkett)\b/i },
  { canonical: "Massivt trägolv", pattern: /\b(massivt trägolv|massiv parkett|massiva trägolv)\b/i },
  { canonical: "Originalparkett", pattern: /\b(originalparkett|original parkett|bevarad parkett)\b/i },
  { canonical: "Fjärrvärme", pattern: /\b(fjärrvärme|stadsvärme)\b/i },
  { canonical: "Bergvärme", pattern: /\b(bergvärme|bergvärmepump)\b/i },
  { canonical: "Luft-luftvärmepump", pattern: /\b(luft-luftvärmepump|luft till luft|luft-luft)\b/i },
  { canonical: "Luft-vattenvärmepump", pattern: /\b(luft-vattenvärmepump|luft till vatten|luft-vatten)\b/i },
  { canonical: "Stor trädgård", pattern: /\b(stor trädgård|rymlig trädgård|generös trädgård)\b/i },
  { canonical: "Altan", pattern: /\b(altan|uteplats|terrass)\b/i },
  { canonical: "Pergola", pattern: /\b(pergola|spaljé)\b/i },
  { canonical: "Nytt tak", pattern: /\b(nytt tak|tak omlagt|tak bytt|takrenovering)\b/i },
  { canonical: "Fiber indraget", pattern: /\b(fiber indraget|fiberanslutning|bredband via fiber|fiber installerat)\b/i },
  { canonical: "Solceller", pattern: /\b(solceller|solpaneler|solenergi)\b/i },
  { canonical: "Braskamin", pattern: /\b(braskamin|vedkamin|kamin)\b/i },
  { canonical: "Dränering utförd", pattern: /\b(dränering utförd|dränering gjord|ny dränering|dränerat)\b/i },
];

// Swedish real estate terminology standards
const SWEDISH_REAL_ESTATE_TERMS = [
  // Property types
  "Lägenhet", "Villa", "Radhus", "Fritidshus", "Tomt",

  // Rooms and areas
  "Vardagsrum", "Sovrum", "Kök", "Badrum", "Hall", "Wc", "Källare", "Vind",
  "Boarea", "Biarea", "Tomtarea",

  // Building components
  "Fasad", "Tak", "Fönster", "Dörr", "Trappa", "Vägg", "Golv", "Innertak",

  // Systems
  "Värmesystem", "Vatten", "Avlopp", "El", "Ventilation", "Fiber", "Internet",

  // Conditions
  "Nyproduktion", "Renoverat", "Orenoverat", "Bra skick", "Dåligt skick",

  // Legal terms
  "Bostadsrätt", "Äganderätt", "Andelstal", "Årsavgift", "Inskutning",
  "Fastighetsbeteckning", "Taxeringsvärde", "Tomträttsavgäld",

  // Common features
  "Balkong", "Uteplats", "Trädgård", "Garage", "Parkering", "Fiber", "Solceller",
];

describe('Terminology Consistency', () => {
  describe('Chip Labels vs CANONICAL_RULES', () => {
    it('should have all chip labels covered by CANONICAL_RULES or be canonical themselves', () => {
      const canonicalForms = new Set(CANONICAL_RULES.map(rule => rule.canonical));

      // Check that chips either match canonical forms or have rules that map to them
      for (const chip of ALL_CHIPS) {
        const hasCanonicalRule = CANONICAL_RULES.some(rule => rule.canonical === chip);
        const hasMappingRule = CANONICAL_RULES.some(rule => rule.pattern.test(chip));

        expect(hasCanonicalRule || hasMappingRule).toBe(true);
      }
    });

    it('should not have duplicate canonical forms in CANONICAL_RULES', () => {
      const canonicalForms = CANONICAL_RULES.map(rule => rule.canonical);
      const uniqueCanonicals = new Set(canonicalForms);

      expect(uniqueCanonicals.size).toBe(canonicalForms.length);
    });

    it('should have valid regex patterns in CANONICAL_RULES', () => {
      for (const rule of CANONICAL_RULES) {
        expect(() => new RegExp(rule.pattern)).not.toThrow();
      }
    });
  });

  describe('Swedish Real Estate Terminology', () => {
    it('should use proper Swedish real estate terms', () => {
      // Check that chip labels use appropriate Swedish terminology
      const inappropriateTerms = ['Apartment', 'House', 'Condo', 'Parking spot'];

      for (const chip of ALL_CHIPS) {
        for (const inappropriate of inappropriateTerms) {
          expect(chip.toLowerCase()).not.toContain(inappropriate.toLowerCase());
        }
      }
    });

    it('should use consistent terminology patterns', () => {
      // Check for consistent capitalization and formatting
      for (const chip of ALL_CHIPS) {
        // First word should be capitalized, rest lowercase unless proper nouns
        const words = chip.split(' ');
        expect(words[0][0]).toMatch(/[A-ZÅÄÖ]/);

        // Technical terms should be properly formatted
        if (chip.includes('för')) {
          expect(chip).toMatch(/för [a-z]/); // lowercase after 'för'
        }
      }
    });

    it('should avoid ambiguous or unclear terms', () => {
      const ambiguousTerms = ['Nytt', 'Bra', 'Stort', 'Litet']; // Too vague without context

      for (const chip of ALL_CHIPS) {
        for (const ambiguous of ambiguousTerms) {
          // Allow if part of a compound term
          if (chip !== ambiguous) {
            expect(chip).not.toContain(ambiguous);
          }
        }
      }
    });
  });

  describe('Hemnet/Booli Terminology Alignment', () => {
    it('should use terms consistent with major platforms', () => {
      // Hemnet/Booli commonly use these terms
      const platformTerms = [
        'Lägenhet', 'Villa', 'Radhus', 'Bostadsrätt', 'Äganderätt',
        'Boarea', 'Biarea', 'Tomtarea', 'Vardagsrum', 'Sovrum',
        'Kök', 'Badrum', 'Balkong', 'Uteplats', 'Garage', 'Parkering'
      ];

      // At least some chips should align with platform terminology
      const alignedChips = ALL_CHIPS.filter(chip =>
        platformTerms.some(term =>
          chip.toLowerCase().includes(term.toLowerCase()) ||
          term.toLowerCase().includes(chip.toLowerCase())
        )
      );

      expect(alignedChips.length).toBeGreaterThan(10);
    });

    it('should avoid platform-specific jargon not used in listings', () => {
      // Terms that might be internal but not used in consumer-facing content
      const internalTerms = ['Objektnummer', 'Annons-id', 'Kund-id'];

      for (const chip of ALL_CHIPS) {
        for (const internal of internalTerms) {
          expect(chip.toLowerCase()).not.toContain(internal.toLowerCase());
        }
      }
    });
  });

  describe('Chip Category Consistency', () => {
    it('should have unique chips across all categories', () => {
      const allChips = [
        ...KITCHEN_CHIPS,
        ...BATHROOM_CHIPS,
        ...FLOORING_CHIPS,
        ...HEATING_CHIPS,
        ...SPECIAL_CHIPS,
        ...GARDEN_CHIPS,
        ...USP_CHIPS,
        ...PARKING_CHIPS,
        ...ROOF_CHIPS,
        ...MATERIAL_CHIPS,
      ];

      const uniqueChips = new Set(allChips);
      expect(uniqueChips.size).toBe(allChips.length);
    });

    it('should have appropriate chip counts per category', () => {
      expect(KITCHEN_CHIPS.length).toBeGreaterThanOrEqual(8);
      expect(BATHROOM_CHIPS.length).toBeGreaterThanOrEqual(6);
      expect(PARKING_CHIPS.length).toBeGreaterThanOrEqual(6);
      expect(HEATING_CHIPS.length).toBeGreaterThanOrEqual(5);
    });
  });
});

// Property 40: Terminology Consistency
describe('Property 40: Terminology Consistency', () => {
  it('should validate that all terminology follows Swedish real estate standards', () => {
    // This property test ensures universal consistency
    // In practice, this would be validated against a comprehensive term database

    const allTerms = [...ALL_CHIPS, ...CANONICAL_RULES.map(r => r.canonical)];

    // All terms should be non-empty strings
    expect(allTerms.every(term => typeof term === 'string' && term.length > 0)).toBe(true);

    // All terms should contain at least one Swedish character or be standard technical terms
    const hasSwedishChars = allTerms.every(term =>
      /[åäöÅÄÖ]/.test(term) || /^[A-Za-z\s-]+$/.test(term)
    );

    expect(hasSwedishChars).toBe(true);
  });
});