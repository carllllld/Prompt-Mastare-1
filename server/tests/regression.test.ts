import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optimizePrompt, validateOptimizationResult } from '../routes.js';

// Mock dependencies
vi.mock('../storage.js', () => ({
  default: {
    getUser: vi.fn(),
    incrementUsage: vi.fn(),
    getUserPersonalStyle: vi.fn(),
  }
}));

vi.mock('openai', () => ({
  default: class {
    constructor() {
      this.chat = {
        completions: {
          create: vi.fn()
        }
      };
    }
  }
}));

// Mock openai response for all tests
const mockOpenAI = vi.mocked(new (await import('openai')).default());
const mockCreate = mockOpenAI.chat.completions.create;

describe('AI Regression Test Suite - 30 Swedish Property Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            headline: 'Storgatan 12, 3 tr, Stockholm',
            instagramCaption: 'Modern lägenhet i cityläge',
            showingInvitation: 'Boka visning idag',
            shortAd: 'Trevlig trea nära centrum',
            socialCopy: 'Perfekt för singel eller par',
            improvedPrompt: 'Storgatan 12, 3 tr, Stockholm. Trea om 75 kvm med balkong i västerläge. Lägenheten har parkettgolv och moderna vitvaror i köket. Balkongen vetter mot innergården. Avgift 4200 kr/mån. Pris 4 250 000 kr.',
            analysis: {
              target_group: 'unga par och singlar',
              area_advantage: 'centralt läge nära kommunikationer',
              pricing_factors: 'högt efterfrågan i området'
            }
          })
        }
      }]
    });
  });

  // Test Case 1: Small apartment Stockholm
  it('should handle small apartment in Stockholm', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Vasagatan 15, Stockholm',
      livingArea: 45,
      totalRooms: 2,
      bedrooms: 1,
      floor: '2 av 4',
      buildYear: 1985,
      condition: 'bra skick',
      energyClass: 'C',
      elevator: true,
      flooring: 'parkett',
      kitchenDescription: 'modernt kök med vita skåp',
      bathroomDescription: 'badrum med dusch',
      balconyArea: 4,
      balconyDirection: 'öster',
      storage: 'källare',
      heating: 'fjärrvärme',
      parking: 'garage',
      price: 3200000,
      monthlyFee: 3800,
      brfName: 'BRF Vasan',
      area: 'Vasastan',
      transport: 'T-bana Odenplan 5 min',
      neighborhood: 'lugn gata nära shopping',
      view: 'stadsvy',
      uniqueSellingPoints: 'högt i tak, originaldetaljer',
      otherInfo: 'renoverat 2018'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Vasagatan/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 2: Medium apartment Göteborg
  it('should handle medium apartment in Göteborg', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Avenyn 25, Göteborg',
      livingArea: 68,
      totalRooms: 3,
      bedrooms: 2,
      floor: '3 av 6',
      buildYear: 2010,
      condition: 'mycket bra skick',
      energyClass: 'B',
      elevator: true,
      flooring: 'kakel och parkett',
      kitchenDescription: 'köksö med integrerade vitvaror',
      bathroomDescription: 'spa-badrum med badkar',
      balconyArea: 8,
      balconyDirection: 'väster',
      storage: 'förråd i källare',
      heating: 'bergvärme',
      parking: 'bilplats',
      price: 4850000,
      monthlyFee: 4200,
      brfName: 'BRF Avenyn',
      area: 'Lorensberg',
      transport: 'Spårvagn 3 min',
      neighborhood: 'puls i centrum',
      view: 'parkyta',
      uniqueSellingPoints: 'energisnålt, moderna material',
      otherInfo: 'smart house-system'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Avenyn/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 3: Large apartment Malmö
  it('should handle large apartment in Malmö', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Lilla Torg 12, Malmö',
      livingArea: 125,
      totalRooms: 5,
      bedrooms: 3,
      floor: 'våning 1',
      buildYear: 1890,
      condition: 'renoverat skick',
      energyClass: 'D',
      elevator: false,
      flooring: 'trägolv genomgående',
      kitchenDescription: 'stort lantkök med plats för matbord',
      bathroomDescription: 'två badrum, ett med badkar',
      balconyArea: 15,
      balconyDirection: 'söder',
      storage: 'vindsförråd',
      heating: 'golvvärme',
      parking: 'gata',
      price: 7200000,
      monthlyFee: 5800,
      brfName: 'BRF Gamla Stan',
      area: 'Gamla Malmö',
      transport: 'Centralen 8 min gång',
      neighborhood: 'kulturhistoriskt värdefull miljö',
      view: 'torg och kanaler',
      uniqueSellingPoints: 'höga tak, stuckaturer, historisk charm',
      otherInfo: 'skyddat byggnadsvärde'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Lilla Torg/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 4: Villa Stockholm suburbs
  it('should handle villa in Stockholm suburbs', async () => {
    const propertyData = {
      propertyType: 'house',
      address: 'Björkvägen 8, Bromma',
      livingArea: 180,
      totalRooms: 6,
      bedrooms: 4,
      floor: 'enplans',
      buildYear: 1975,
      condition: 'bra skick',
      energyClass: 'E',
      elevator: false,
      flooring: 'parkett och klinker',
      kitchenDescription: 'välplanerat kök med bardisk',
      bathroomDescription: 'tre badrum varav två med badkar',
      balconyArea: 0,
      storage: 'garage och förråd',
      heating: 'olja',
      parking: 'dubbelgarage',
      lotArea: 1200,
      garden: 'stor trädgård med uteplats',
      price: 8500000,
      monthlyFee: 0,
      area: 'Bromma',
      transport: 'T-bana 15 min bil',
      neighborhood: 'barnvänligt område',
      view: 'skog och vatten',
      uniqueSellingPoints: 'stor tomt, lugnt läge',
      otherInfo: 'möjlighet att bygga ut'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Björkvägen/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 5: Townhouse Uppsala
  it('should handle townhouse in Uppsala', async () => {
    const propertyData = {
      propertyType: 'townhouse',
      address: 'Kvarngatan 14, Uppsala',
      livingArea: 140,
      totalRooms: 5,
      bedrooms: 3,
      floor: '2 plan',
      buildYear: 2015,
      condition: 'nybyggt skick',
      energyClass: 'A',
      elevator: false,
      flooring: 'ekparkett',
      kitchenDescription: 'modern köksö med gasspis',
      bathroomDescription: 'badrum med regndusch',
      balconyArea: 12,
      balconyDirection: 'väster',
      storage: 'källare och vindsförråd',
      heating: 'värmepump',
      parking: 'carport',
      lotArea: 250,
      garden: 'egen trädgård med altan',
      price: 6500000,
      monthlyFee: 2800,
      brfName: 'BRF Kvarnen',
      area: 'Kvarngärdet',
      transport: 'buss 3 min',
      neighborhood: 'nya området nära stadskärna',
      view: 'grönområde',
      uniqueSellingPoints: 'energisnålt, smarta lösningar',
      otherInfo: 'solceller på taket'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Kvarngatan/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 6: Small apartment Umeå
  it('should handle small apartment in Umeå', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Vasaplan 3, Umeå',
      livingArea: 38,
      totalRooms: 1,
      bedrooms: 0,
      floor: '4 av 6',
      buildYear: 1995,
      condition: 'god skick',
      energyClass: 'D',
      elevator: true,
      flooring: 'laminat',
      kitchenDescription: 'kompakt kök med kyl och frys',
      bathroomDescription: 'badrum med dusch',
      balconyArea: 3,
      balconyDirection: 'norr',
      storage: 'förråd',
      heating: 'fjärrvärme',
      parking: 'gata',
      price: 1450000,
      monthlyFee: 2200,
      brfName: 'BRF Vasan',
      area: 'Vasastan',
      transport: 'stadskärna 2 min gång',
      neighborhood: 'centralt men lugnt',
      view: 'innergård',
      uniqueSellingPoints: 'låg avgift, praktiskt',
      otherInfo: 'perfekt för student eller singel'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Vasaplan/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 7: Medium apartment Helsingborg
  it('should handle medium apartment in Helsingborg', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Stortorget 8, Helsingborg',
      livingArea: 78,
      totalRooms: 3,
      bedrooms: 2,
      floor: '2 av 5',
      buildYear: 2005,
      condition: 'mycket bra skick',
      energyClass: 'C',
      elevator: true,
      flooring: 'parkett och sten',
      kitchenDescription: 'öppet kök med ö',
      bathroomDescription: 'badrum med tvättmaskin',
      balconyArea: 6,
      balconyDirection: 'söder',
      storage: 'källare',
      heating: 'fjärrvärme',
      parking: 'garage',
      price: 3950000,
      monthlyFee: 3600,
      brfName: 'BRF Stortorget',
      area: 'Inre hamnen',
      transport: 'tågstation 5 min',
      neighborhood: 'maritim miljö',
      view: 'hamn och båtar',
      uniqueSellingPoints: 'vattenläge, moderna material',
      otherInfo: 'renoverat badrum 2020'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Stortorget/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 8: Large apartment Linköping
  it('should handle large apartment in Linköping', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Ågatan 22, Linköping',
      livingArea: 110,
      totalRooms: 4,
      bedrooms: 3,
      floor: '5 av 8',
      buildYear: 2018,
      condition: 'nybyggt skick',
      energyClass: 'A',
      elevator: true,
      flooring: 'kakel och parkett',
      kitchenDescription: 'stort kök med köksö',
      bathroomDescription: 'master badrum med bubbelbad',
      balconyArea: 20,
      balconyDirection: 'väster',
      storage: 'två förråd',
      heating: 'fjärrvärme',
      parking: 'parkeringsplats',
      price: 5800000,
      monthlyFee: 5200,
      brfName: 'BRF Ån',
      area: 'Innerstaden',
      transport: 'universitet 10 min',
      neighborhood: 'nära stadens puls',
      view: 'ån och stad',
      uniqueSellingPoints: 'takterrass, exklusivt läge',
      otherInfo: 'gemensam takterrass'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Ågatan/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 9: Villa Örebro
  it('should handle villa in Örebro', async () => {
    const propertyData = {
      propertyType: 'house',
      address: 'Ekbacken 5, Örebro',
      livingArea: 160,
      totalRooms: 6,
      bedrooms: 4,
      floor: '1,5 plan',
      buildYear: 1980,
      condition: 'välhållen',
      energyClass: 'E',
      elevator: false,
      flooring: 'parkett',
      kitchenDescription: 'stort lantkök',
      bathroomDescription: 'två badrum',
      balconyArea: 0,
      storage: 'garage och förråd',
      heating: 'olja och el',
      parking: 'garage',
      lotArea: 800,
      garden: 'stor trädgård',
      price: 4200000,
      monthlyFee: 0,
      area: 'Ekbacken',
      transport: 'stadscentrum 15 min',
      neighborhood: 'familjevänligt',
      view: 'trädgård',
      uniqueSellingPoints: 'stor tomt, lugnt läge',
      otherInfo: 'möjlighet till uthus'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Ekbacken/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 10: Townhouse Västerås
  it('should handle townhouse in Västerås', async () => {
    const propertyData = {
      propertyType: 'townhouse',
      address: 'Malmaberg 12, Västerås',
      livingArea: 120,
      totalRooms: 4,
      bedrooms: 3,
      floor: '2 plan',
      buildYear: 2000,
      condition: 'bra skick',
      energyClass: 'D',
      elevator: false,
      flooring: 'parkett och klinker',
      kitchenDescription: 'modernt kök',
      bathroomDescription: 'badrum med dusch',
      balconyArea: 8,
      balconyDirection: 'söder',
      storage: 'källare',
      heating: 'fjärrvärme',
      parking: 'carport',
      lotArea: 180,
      garden: 'liten trädgård',
      price: 3200000,
      monthlyFee: 2400,
      brfName: 'BRF Malmaberg',
      area: 'Malmaberg',
      transport: 'buss 2 min',
      neighborhood: 'nära skola och affärer',
      view: 'grönområde',
      uniqueSellingPoints: 'praktiskt, nära service',
      otherInfo: 'låg driftskostnad'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Malmaberg/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 11: Small apartment Lund
  it('should handle small apartment in Lund', async () => {
    const propertyData = {
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
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Bantorget/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 12: Medium apartment Borås
  it('should handle medium apartment in Borås', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Allégatan 18, Borås',
      livingArea: 85,
      totalRooms: 4,
      bedrooms: 3,
      floor: '3 av 5',
      buildYear: 1990,
      condition: 'god skick',
      energyClass: 'D',
      elevator: true,
      flooring: 'laminat',
      kitchenDescription: 'stort kök med matplats',
      bathroomDescription: 'badrum med badkar',
      balconyArea: 10,
      balconyDirection: 'öster',
      storage: 'förråd',
      heating: 'fjärrvärme',
      parking: 'garage',
      price: 2250000,
      monthlyFee: 4100,
      brfName: 'BRF Allégatan',
      area: 'Centrum',
      transport: 'buss 1 min',
      neighborhood: 'nära shopping',
      view: 'stad',
      uniqueSellingPoints: 'stor balkong, ljus',
      otherInfo: 'renoverat kök 2019'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Allégatan/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 13: Large apartment Karlstad
  it('should handle large apartment in Karlstad', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Karlstad CCC, Karlstad',
      livingArea: 95,
      totalRooms: 4,
      bedrooms: 3,
      floor: '8 av 10',
      buildYear: 2022,
      condition: 'nybyggt',
      energyClass: 'A',
      elevator: true,
      flooring: 'parkett och sten',
      kitchenDescription: 'köksö med integrerade vitvaror',
      bathroomDescription: 'spa-badrum',
      balconyArea: 18,
      balconyDirection: 'väster',
      storage: 'förråd',
      heating: 'värmepump',
      parking: 'parkeringsplats',
      price: 4850000,
      monthlyFee: 4500,
      brfName: 'BRF CCC',
      area: 'Centrum',
      transport: 'allt inom gångavstånd',
      neighborhood: 'nya stadskvarter',
      view: 'klarälven',
      uniqueSellingPoints: 'takvåning, exklusiv vy',
      otherInfo: 'gemensam takterrass'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Karlstad CCC/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 14: Villa Sundsvall
  it('should handle villa in Sundsvall', async () => {
    const propertyData = {
      propertyType: 'house',
      address: 'Södra Kajen 25, Sundsvall',
      livingArea: 195,
      totalRooms: 7,
      bedrooms: 5,
      floor: '2 plan',
      buildYear: 1995,
      condition: 'mycket bra skick',
      energyClass: 'C',
      elevator: false,
      flooring: 'parkett',
      kitchenDescription: 'stort kök med öppen planlösning',
      bathroomDescription: 'tre badrum',
      balconyArea: 0,
      storage: 'garage och flera förråd',
      heating: 'pellets',
      parking: 'dubbelgarage',
      lotArea: 1500,
      garden: 'stor trädgård med pool',
      price: 6800000,
      monthlyFee: 0,
      area: 'Södra kajen',
      transport: 'stadscentrum 10 min bil',
      neighborhood: 'exklusivt villaområde',
      view: 'sundet',
      uniqueSellingPoints: 'vattenläge, stor tomt',
      otherInfo: 'egen brygga'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toMatch(/^Södra Kajen/);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 15: Townhouse Jönköping
  it('should handle townhouse in Jönköping', async () => {
    const propertyData = {
      propertyType: 'townhouse',
      address: 'Månsarpsvägen 7, Jönköping',
      livingArea: 135,
      totalRooms: 5,
      bedrooms: 4,
      floor: '2 plan',
      buildYear: 2012,
      condition: 'nybyggt skick',
      energyClass: 'B',
      elevator: false,
      flooring: 'kakel och parkett',
      kitchenDescription: 'modernt kök med ö',
      bathroomDescription: 'två badrum',
      balconyArea: 14,
      balconyDirection: 'söder',
      storage: 'källare',
      heating: 'bergvärme',
      parking: 'garage',
      lotArea: 220,
      garden: 'egen trädgård',
      price: 4750000,
      monthlyFee: 3200,
      brfName: 'BRF Månsarp',
      area: 'Månsarp',
      transport: 'buss 5 min',
      neighborhood: 'familjevänligt',
      view: 'grönområde',
      uniqueSellingPoints: 'energisnålt, barnvänligt',
      otherInfo: 'solceller'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
  });

  // Test Case 16: Small apartment Norrköping
  it('should handle small apartment in Norrköping', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Drottninggatan 9, Norrköping',
      livingArea: 42,
      totalRooms: 2,
      bedrooms: 1,
      floor: '1 av 3',
      buildYear: 1970,
      condition: 'bra skick',
      energyClass: 'D',
      elevator: false,
      flooring: 'parkett',
      kitchenDescription: 'enkelt kök',
      bathroomDescription: 'badrum',
      balconyArea: 0,
      storage: 'källare',
      heating: 'fjärrvärme',
      parking: 'gata',
      price: 1650000,
      monthlyFee: 2500,
      brfName: 'BRF Drottningen',
      area: 'Inre staden',
      transport: 'centralstation 5 min',
      neighborhood: 'stadskärna',
      view: 'gata',
      uniqueSellingPoints: 'centralt läge',
      otherInfo: 'låg avgift'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 17: Medium apartment Eskilstuna
  it('should handle medium apartment in Eskilstuna', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Rademachergatan 12, Eskilstuna',
      livingArea: 72,
      totalRooms: 3,
      bedrooms: 2,
      floor: '2 av 4',
      buildYear: 2000,
      condition: 'god skick',
      energyClass: 'C',
      elevator: true,
      flooring: 'laminat',
      kitchenDescription: 'modernt kök',
      bathroomDescription: 'badrum med dusch',
      balconyArea: 7,
      balconyDirection: 'norr',
      storage: 'förråd',
      heating: 'fjärrvärme',
      parking: 'garage',
      price: 2350000,
      monthlyFee: 3400,
      brfName: 'BRF Rademacher',
      area: 'Centrum',
      transport: 'tågstation 2 min',
      neighborhood: 'nära centrum',
      view: 'innergård',
      uniqueSellingPoints: 'praktiskt läge',
      otherInfo: 'renoverat 2021'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 18: Large apartment Södertälje
  it('should handle large apartment in Södertälje', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Storgatan 45, Södertälje',
      livingArea: 98,
      totalRooms: 4,
      bedrooms: 3,
      floor: '4 av 6',
      buildYear: 2015,
      condition: 'mycket bra skick',
      energyClass: 'B',
      elevator: true,
      flooring: 'parkett',
      kitchenDescription: 'stort kök med öppen planlösning',
      bathroomDescription: 'två badrum',
      balconyArea: 12,
      balconyDirection: 'söder',
      storage: 'källare',
      heating: 'värmepump',
      parking: 'parkeringsplats',
      price: 4250000,
      monthlyFee: 4800,
      brfName: 'BRF Storgatan',
      area: 'Geneta',
      transport: 'tåg till Stockholm 20 min',
      neighborhood: 'familjevänligt',
      view: 'grönområde',
      uniqueSellingPoints: 'stor balkong, ljus',
      otherInfo: 'energisnålt'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 19: Villa Halmstad
  it('should handle villa in Halmstad', async () => {
    const propertyData = {
      propertyType: 'house',
      address: 'Villagatan 20, Halmstad',
      livingArea: 175,
      totalRooms: 6,
      bedrooms: 4,
      floor: 'enplans',
      buildYear: 1985,
      condition: 'välhållen',
      energyClass: 'D',
      elevator: false,
      flooring: 'parkett och klinker',
      kitchenDescription: 'lantkök',
      bathroomDescription: 'tre badrum',
      balconyArea: 0,
      storage: 'garage och förråd',
      heating: 'olja',
      parking: 'garage',
      lotArea: 950,
      garden: 'stor trädgård',
      price: 5750000,
      monthlyFee: 0,
      area: 'Villan',
      transport: 'stadscentrum 10 min',
      neighborhood: 'lugn villagata',
      view: 'trädgård',
      uniqueSellingPoints: 'stor tomt, lugnt',
      otherInfo: 'möjlighet att bygga pool'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 20: Townhouse Kalmar
  it('should handle townhouse in Kalmar', async () => {
    const propertyData = {
      propertyType: 'townhouse',
      address: 'Slottsvägen 8, Kalmar',
      livingArea: 128,
      totalRooms: 4,
      bedrooms: 3,
      floor: '2 plan',
      buildYear: 2008,
      condition: 'bra skick',
      energyClass: 'C',
      elevator: false,
      flooring: 'parkett',
      kitchenDescription: 'modernt kök',
      bathroomDescription: 'badrum med badkar',
      balconyArea: 9,
      balconyDirection: 'öster',
      storage: 'källare',
      heating: 'fjärrvärme',
      parking: 'carport',
      lotArea: 190,
      garden: 'egen trädgård',
      price: 3850000,
      monthlyFee: 2800,
      brfName: 'BRF Slottet',
      area: 'Centrum',
      transport: 'buss 3 min',
      neighborhood: 'nära slottet',
      view: 'slott och vatten',
      uniqueSellingPoints: 'historiskt läge',
      otherInfo: 'kulturhistoriskt värde'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 21: Small apartment Östersund
  it('should handle small apartment in Östersund', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Storgatan 28, Östersund',
      livingArea: 48,
      totalRooms: 2,
      bedrooms: 1,
      floor: '2 av 4',
      buildYear: 1980,
      condition: 'god skick',
      energyClass: 'E',
      elevator: false,
      flooring: 'laminat',
      kitchenDescription: 'enkelt kök',
      bathroomDescription: 'badrum',
      balconyArea: 0,
      storage: 'förråd',
      heating: 'fjärrvärme',
      parking: 'gata',
      price: 1850000,
      monthlyFee: 2600,
      brfName: 'BRF Storgatan',
      area: 'Centrum',
      transport: 'allt nära',
      neighborhood: 'stadskärna',
      view: 'gata',
      uniqueSellingPoints: 'centralt',
      otherInfo: 'låg avgift'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 22: Medium apartment Kristianstad
  it('should handle medium apartment in Kristianstad', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Västra Storgatan 15, Kristianstad',
      livingArea: 76,
      totalRooms: 3,
      bedrooms: 2,
      floor: '3 av 5',
      buildYear: 1995,
      condition: 'renoverat',
      energyClass: 'C',
      elevator: true,
      flooring: 'parkett',
      kitchenDescription: 'nyrenoverat kök',
      bathroomDescription: 'badrum med tvättmaskin',
      balconyArea: 8,
      balconyDirection: 'väster',
      storage: 'källare',
      heating: 'fjärrvärme',
      parking: 'garage',
      price: 3150000,
      monthlyFee: 3800,
      brfName: 'BRF Västra',
      area: 'Centrum',
      transport: 'tågstation 4 min',
      neighborhood: 'nära vatten',
      view: 'helge å',
      uniqueSellingPoints: 'vattenläge, charm',
      otherInfo: 'historisk byggnad'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 23: Large apartment Falun
  it('should handle large apartment in Falun', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Åsgatan 22, Falun',
      livingArea: 105,
      totalRooms: 4,
      bedrooms: 3,
      floor: '5 av 7',
      buildYear: 2010,
      condition: 'nybyggt skick',
      energyClass: 'B',
      elevator: true,
      flooring: 'parkett och sten',
      kitchenDescription: 'köksö med bardisk',
      bathroomDescription: 'master badrum',
      balconyArea: 16,
      balconyDirection: 'söder',
      storage: 'två förråd',
      heating: 'fjärrvärme',
      parking: 'parkeringsplats',
      price: 4650000,
      monthlyFee: 5100,
      brfName: 'BRF Åsen',
      area: 'Centrum',
      transport: 'allt inom gångavstånd',
      neighborhood: 'nya kvarter',
      view: 'stad och berg',
      uniqueSellingPoints: 'stor balkong, vy',
      otherInfo: 'gemensam takterrass'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 24: Villa Skövde
  it('should handle villa in Skövde', async () => {
    const propertyData = {
      propertyType: 'house',
      address: 'Villagatan 35, Skövde',
      livingArea: 165,
      totalRooms: 6,
      bedrooms: 4,
      floor: '1,5 plan',
      buildYear: 1990,
      condition: 'välhållen',
      energyClass: 'D',
      elevator: false,
      flooring: 'parkett',
      kitchenDescription: 'stort lantkök',
      bathroomDescription: 'två badrum',
      balconyArea: 0,
      storage: 'garage och förråd',
      heating: 'olja',
      parking: 'dubbelgarage',
      lotArea: 1100,
      garden: 'stor trädgård',
      price: 4250000,
      monthlyFee: 0,
      area: 'Villastaden',
      transport: 'stadscentrum 8 min bil',
      neighborhood: 'familjevänligt område',
      view: 'trädgård',
      uniqueSellingPoints: 'stor tomt, lugnt',
      otherInfo: 'uthus'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 25: Townhouse Karlskrona
  it('should handle townhouse in Karlskrona', async () => {
    const propertyData = {
      propertyType: 'townhouse',
      address: 'Amiralitetsgatan 12, Karlskrona',
      livingArea: 142,
      totalRooms: 5,
      bedrooms: 4,
      floor: '2 plan',
      buildYear: 2005,
      condition: 'mycket bra skick',
      energyClass: 'C',
      elevator: false,
      flooring: 'parkett och klinker',
      kitchenDescription: 'modernt kök med öppen planlösning',
      bathroomDescription: 'två badrum',
      balconyArea: 11,
      balconyDirection: 'norr',
      storage: 'källare',
      heating: 'bergvärme',
      parking: 'garage',
      lotArea: 240,
      garden: 'egen trädgård med uteplats',
      price: 5250000,
      monthlyFee: 3500,
      brfName: 'BRF Amiralen',
      area: 'Centrum',
      transport: 'buss 4 min',
      neighborhood: 'maritim miljö',
      view: 'hamn',
      uniqueSellingPoints: 'vattenläge, charm',
      otherInfo: 'världsarvsmiljö'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 26: Small apartment Luleå
  it('should handle small apartment in Luleå', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Storgatan 55, Luleå',
      livingArea: 50,
      totalRooms: 2,
      bedrooms: 1,
      floor: '3 av 5',
      buildYear: 1975,
      condition: 'renoverat',
      energyClass: 'D',
      elevator: true,
      flooring: 'laminat',
      kitchenDescription: 'nyrenoverat kök',
      bathroomDescription: 'badrum',
      balconyArea: 5,
      balconyDirection: 'söder',
      storage: 'förråd',
      heating: 'fjärrvärme',
      parking: 'gata',
      price: 2100000,
      monthlyFee: 2900,
      brfName: 'BRF Storgatan',
      area: 'Centrum',
      transport: 'allt nära',
      neighborhood: 'stadskärna',
      view: 'gata',
      uniqueSellingPoints: 'centralt, ljus',
      otherInfo: 'renoverat 2022'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 27: Medium apartment Gävle
  it('should handle medium apartment in Gävle', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Drottninggatan 18, Gävle',
      livingArea: 80,
      totalRooms: 3,
      bedrooms: 2,
      floor: '4 av 6',
      buildYear: 2002,
      condition: 'god skick',
      energyClass: 'C',
      elevator: true,
      flooring: 'parkett',
      kitchenDescription: 'modernt kök',
      bathroomDescription: 'badrum med dusch',
      balconyArea: 9,
      balconyDirection: 'öster',
      storage: 'källare',
      heating: 'fjärrvärme',
      parking: 'garage',
      price: 3250000,
      monthlyFee: 4200,
      brfName: 'BRF Drottningen',
      area: 'Centrum',
      transport: 'tågstation 3 min',
      neighborhood: 'nära vatten',
      view: 'gävlebukten',
      uniqueSellingPoints: 'vattenläge, vy',
      otherInfo: 'renoverat badrum 2018'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 28: Large apartment Trollhättan
  it('should handle large apartment in Trollhättan', async () => {
    const propertyData = {
      propertyType: 'apartment',
      address: 'Storgatan 88, Trollhättan',
      livingArea: 115,
      totalRooms: 5,
      bedrooms: 4,
      floor: '6 av 8',
      buildYear: 2019,
      condition: 'nybyggt',
      energyClass: 'A',
      elevator: true,
      flooring: 'parkett och sten',
      kitchenDescription: 'stort kök med köksö',
      bathroomDescription: 'tre badrum',
      balconyArea: 22,
      balconyDirection: 'väster',
      storage: 'förråd',
      heating: 'värmepump',
      parking: 'parkeringsplats',
      price: 4950000,
      monthlyFee: 5500,
      brfName: 'BRF Storgatan',
      area: 'Centrum',
      transport: 'allt nära',
      neighborhood: 'nya kvarter',
      view: 'göta älv',
      uniqueSellingPoints: 'stor balkong, vattenläge',
      otherInfo: 'gemensam takterrass'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 29: Villa Borlänge
  it('should handle villa in Borlänge', async () => {
    const propertyData = {
      propertyType: 'house',
      address: 'Villagatan 45, Borlänge',
      livingArea: 185,
      totalRooms: 7,
      bedrooms: 5,
      floor: '2 plan',
      buildYear: 1982,
      condition: 'välhållen',
      energyClass: 'E',
      elevator: false,
      flooring: 'parkett',
      kitchenDescription: 'stort lantkök',
      bathroomDescription: 'tre badrum',
      balconyArea: 0,
      storage: 'garage och flera förråd',
      heating: 'olja och el',
      parking: 'garage',
      lotArea: 1250,
      garden: 'stor trädgård',
      price: 4850000,
      monthlyFee: 0,
      area: 'Villastaden',
      transport: 'stadscentrum 12 min',
      neighborhood: 'barnvänligt',
      view: 'skog',
      uniqueSellingPoints: 'stor tomt, familjevänligt',
      otherInfo: 'möjlighet till hobbyrum'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });

  // Test Case 30: Townhouse Uddevalla
  it('should handle townhouse in Uddevalla', async () => {
    const propertyData = {
      propertyType: 'townhouse',
      address: 'Slottsvägen 22, Uddevalla',
      livingArea: 150,
      totalRooms: 5,
      bedrooms: 4,
      floor: '2 plan',
      buildYear: 2014,
      condition: 'nybyggt skick',
      energyClass: 'B',
      elevator: false,
      flooring: 'ekparkett',
      kitchenDescription: 'modernt kök med öppen planlösning',
      bathroomDescription: 'två badrum',
      balconyArea: 13,
      balconyDirection: 'söder',
      storage: 'källare',
      heating: 'bergvärme',
      parking: 'carport',
      lotArea: 260,
      garden: 'egen trädgård med altan',
      price: 4650000,
      monthlyFee: 3200,
      brfName: 'BRF Slottet',
      area: 'Centrum',
      transport: 'buss 5 min',
      neighborhood: 'nära vatten',
      view: 'byfjorden',
      uniqueSellingPoints: 'vattenläge, energisnålt',
      otherInfo: 'solceller på tak'
    };

    const result = await optimizePrompt({ propertyData }, 'hemnet', 'free');
    const violations = validateOptimizationResult(result, 'hemnet');

    expect(violations).toHaveLength(0);
    expect(result.improvedPrompt).toBeTypeOf('string');
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).not.toMatch(/fantastisk|erbjuder|välkommen/i);
  });
});
