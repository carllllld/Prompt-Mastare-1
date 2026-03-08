import { describe, it, expect } from 'vitest';
import {
  buildDeterministicFallbackDescription,
  buildDispositionFromStructuredData,
  sanitizeGeneratedMarketingField,
  validateOptimizationResult,
} from '../routes';

const CASES = [
  {
    name: 'small apartment Stockholm',
    propertyData: {
      propertyType: 'apartment',
      address: 'Vasagatan 15, Stockholm',
      livingArea: 45,
      rooms: 2,
      bedrooms: 1,
      buildYear: 1985,
      kitchen: 'modernt kök med vita skåp',
      bathroom: 'badrum med dusch',
      monthlyFee: 3800,
      price: 3200000,
      transport: 'T-bana Odenplan 5 min',
      uniqueSellingPoints: 'högt i tak, originaldetaljer',
    },
  },
  {
    name: 'medium apartment Göteborg',
    propertyData: {
      propertyType: 'apartment',
      address: 'Avenyn 25, Göteborg',
      livingArea: 68,
      rooms: 3,
      bedrooms: 2,
      buildYear: 2010,
      kitchen: 'köksö med integrerade vitvaror',
      bathroom: 'spa-badrum med badkar',
      monthlyFee: 4200,
      price: 4850000,
      transport: 'Spårvagn 3 min',
      uniqueSellingPoints: 'stora fönsterpartier',
    },
  },
  {
    name: 'historic apartment Malmö',
    propertyData: {
      propertyType: 'apartment',
      address: 'Lilla Torg 8, Malmö',
      livingArea: 92,
      rooms: 4,
      bedrooms: 2,
      buildYear: 1898,
      kitchen: 'snickeribyggt kök',
      bathroom: 'badrum med marmordetaljer',
      monthlyFee: 5100,
      price: 6250000,
      transport: 'Centralstation 8 min',
      uniqueSellingPoints: 'stukatur, kakelugn',
    },
  },
  {
    name: 'villa Lund',
    propertyData: {
      propertyType: 'villa',
      address: 'Björkvägen 14, Lund',
      livingArea: 145,
      rooms: 6,
      bedrooms: 4,
      buildYear: 1978,
      kitchen: 'IKEA-kök med Bosch',
      bathroom: 'två helkaklade badrum',
      price: 5950000,
      lotArea: 750,
      transport: 'buss 6 min',
      uniqueSellingPoints: 'söderläge, renoverat kök',
    },
  },
  {
    name: 'townhouse Uppsala',
    propertyData: {
      propertyType: 'townhouse',
      address: 'Kvarngatan 7, Uppsala',
      livingArea: 118,
      rooms: 5,
      bedrooms: 3,
      buildYear: 2008,
      kitchen: 'Marbodal-kök',
      bathroom: 'två badrum',
      monthlyFee: 2900,
      price: 4750000,
      transport: 'buss 4 min',
      uniqueSellingPoints: 'solceller, förråd',
    },
  },
  {
    name: 'large apartment Stockholm',
    propertyData: {
      propertyType: 'apartment',
      address: 'Storgatan 12, Stockholm',
      livingArea: 75,
      rooms: 3,
      bedrooms: 2,
      buildYear: 1985,
      kitchen: 'modernt kök med vita skåp',
      bathroom: 'badrum med dusch',
      monthlyFee: 4200,
      price: 4250000,
      transport: 'T-bana Odenplan 5 min',
      uniqueSellingPoints: 'högt i tak, originaldetaljer',
    },
  },
  {
    name: 'medium apartment Malmö',
    propertyData: {
      propertyType: 'apartment',
      address: 'Lilla Torg 12, Malmö',
      livingArea: 125,
      rooms: 5,
      bedrooms: 3,
      buildYear: 1890,
      kitchen: 'stort lantkök med plats för matbord',
      bathroom: 'två badrum, ett med badkar',
      monthlyFee: 5800,
      price: 7200000,
      transport: 'Centralen 8 min gång',
      uniqueSellingPoints: 'höga tak, stuckaturer, historisk charm',
    },
  },
  {
    name: 'villa Stockholm suburbs',
    propertyData: {
      propertyType: 'house',
      address: 'Björkvägen 8, Bromma',
      livingArea: 180,
      rooms: 6,
      bedrooms: 4,
      buildYear: 1975,
      kitchen: 'välplanerat kök med bardisk',
      bathroom: 'tre badrum varav två med badkar',
      price: 8500000,
      lotArea: 1200,
      transport: 'T-bana 15 min bil',
      uniqueSellingPoints: 'stor tomt, lugnt läge',
    },
  },
  {
    name: 'townhouse Uppsala',
    propertyData: {
      propertyType: 'townhouse',
      address: 'Kvarngatan 14, Uppsala',
      livingArea: 140,
      rooms: 5,
      bedrooms: 3,
      buildYear: 2015,
      kitchen: 'modern köksö med gasspis',
      bathroom: 'badrum med regndusch',
      monthlyFee: 2800,
      price: 6500000,
      transport: 'buss 3 min',
      uniqueSellingPoints: 'energisnålt, smarta lösningar',
    },
  },
  {
    name: 'small apartment Umeå',
    propertyData: {
      propertyType: 'apartment',
      address: 'Vasaplan 3, Umeå',
      livingArea: 38,
      rooms: 1,
      bedrooms: 0,
      buildYear: 1995,
      kitchen: 'kompakt kök med kyl och frys',
      bathroom: 'badrum med dusch',
      monthlyFee: 2200,
      price: 1450000,
      transport: 'stadskärna 2 min gång',
      uniqueSellingPoints: 'låg avgift, praktiskt',
    },
  },
  {
    name: 'medium apartment Helsingborg',
    propertyData: {
      propertyType: 'apartment',
      address: 'Stortorget 8, Helsingborg',
      livingArea: 78,
      rooms: 3,
      bedrooms: 2,
      buildYear: 2005,
      kitchen: 'öppet kök med ö',
      bathroom: 'badrum med tvättmaskin',
      monthlyFee: 3600,
      price: 3950000,
      transport: 'tågstation 5 min',
      uniqueSellingPoints: 'vattenläge, moderna material',
    },
  },
  {
    name: 'large apartment Linköping',
    propertyData: {
      propertyType: 'apartment',
      address: 'Ågatan 22, Linköping',
      livingArea: 110,
      rooms: 4,
      bedrooms: 3,
      buildYear: 2018,
      kitchen: 'stort kök med köksö',
      bathroom: 'master badrum med bubbelbad',
      monthlyFee: 5200,
      price: 5800000,
      transport: 'universitet 10 min',
      uniqueSellingPoints: 'takterrass, exklusivt läge',
    },
  },
  {
    name: 'villa Örebro',
    propertyData: {
      propertyType: 'house',
      address: 'Ekbacken 5, Örebro',
      livingArea: 160,
      rooms: 6,
      bedrooms: 4,
      buildYear: 1980,
      kitchen: 'stort lantkök',
      bathroom: 'två badrum',
      price: 4200000,
      lotArea: 800,
      transport: 'stadscentrum 15 min',
      uniqueSellingPoints: 'stor tomt, lugnt läge',
    },
  },
  {
    name: 'townhouse Västerås',
    propertyData: {
      propertyType: 'townhouse',
      address: 'Malmaberg 12, Västerås',
      livingArea: 120,
      rooms: 4,
      bedrooms: 3,
      buildYear: 2000,
      kitchen: 'modernt kök',
      bathroom: 'badrum med dusch',
      monthlyFee: 2400,
      price: 3200000,
      transport: 'buss 2 min',
      uniqueSellingPoints: 'praktiskt, nära service',
    },
  },
  {
    name: 'small apartment Lund',
    propertyData: {
      propertyType: 'apartment',
      address: 'Bantorget 4, Lund',
      livingArea: 52,
      totalRooms: 2,
      bedrooms: 1,
      floor: '1 av 4',
      buildYear: 1960,
      condition: 'renoverat',
      energyClass: 'C',
      elevator: false,
      flooring: 'parkett',
      kitchenDescription: 'nyrenoverat kök',
      bathroomDescription: 'badrum med dusch',
      balconyArea: 0,
      storage: 'källare',
      heating: 'fjärrvärme',
      parking: 'gata',
      price: 2850000,
      monthlyFee: 3200,
      brfName: 'BRF Bantorget',
      area: 'Centrum',
      transport: 'tågstation 3 min',
      neighborhood: 'universitetsstad',
      view: 'innergård',
      uniqueSellingPoints: 'historisk byggnad, centralt',
      otherInfo: 'skyddat byggnadsvärde'
    },
  },
];

describe('AI Regression Test Suite - current helper architecture', () => {
  it.each(CASES)('should build valid structured data for $name', ({ propertyData }) => {
    const structured = buildDispositionFromStructuredData(propertyData);

    expect(structured.disposition.property.address).toBe(propertyData.address);
    expect(typeof structured.disposition.property.type).toBe('string');
    expect(structured.writing_plan.must_include.length).toBeGreaterThan(0);
    expect(Array.isArray(structured.disposition.property.data_quality_notes ?? [])).toBe(true);
  });

  it.each(CASES)('should produce non-broken fallback copy for $name', ({ propertyData }) => {
    const structured = buildDispositionFromStructuredData(propertyData);
    const fallback = buildDeterministicFallbackDescription(structured.disposition, 'balanced');
    const sanitized = sanitizeGeneratedMarketingField(fallback, undefined, 'balanced', { allowParagraphs: true });

    expect(sanitized).toBeTruthy();
    expect(sanitized?.length ?? 0).toBeGreaterThan(80);
    expect(sanitized?.toLowerCase()).not.toContain('välkommen till');
    expect(sanitized?.toLowerCase()).not.toContain('erbjuder');

    const violations = validateOptimizationResult({ improvedPrompt: sanitized }, 'hemnet', 1, 800, 'balanced');
    expect(violations.filter((v) => !v.startsWith('För få ord') && !v.startsWith('För många ord'))).toHaveLength(0);
  });

  it('should keep factual style deterministic fallback free from obvious sales language', () => {
    const structured = buildDispositionFromStructuredData({
      propertyType: 'apartment',
      address: 'Bantorget 4, Helsingborg',
      livingArea: 59,
      rooms: 2,
      buildYear: 2004,
      kitchen: 'kök med matplats',
      bathroom: 'badrum med dusch',
      monthlyFee: 3200,
      transport: 'knutpunkt 6 min',
    });

    const fallback = buildDeterministicFallbackDescription(structured.disposition, 'factual');
    expect(fallback.toLowerCase()).not.toContain('drömboende');
    expect(fallback.toLowerCase()).not.toContain('fantastisk');
  });
});
