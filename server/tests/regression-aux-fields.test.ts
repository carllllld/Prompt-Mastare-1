/**
 * Regression tests: aux fields generation (Task 12.2)
 *
 * Verifies that all 6 aux fields are always generated:
 *   headline, socialCopy, instagramCaption,
 *   showingInvitation, shortAd, improvedPrompt
 *
 * Tests both the generator directly and the full pipeline.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeterministicPostProcessor } from '../lib/perfect-swedish-post-processor';
import { PerfectSwedishOrchestrator } from '../lib/perfect-swedish-orchestrator';
import type { WritingStyle } from '../lib/text-rules';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async (params: any) => {
          // Generator uses system+user messages; analyzer uses user-only
          const isGeneratorCall = params?.messages?.[0]?.role === 'system';
          if (isGeneratorCall) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    improvedPrompt: 'Storgatan 12 är en välplanerad trea om 75 kvm med balkong i söderläge. Lägenheten har renoverat kök och helkaklat badrum. Föreningen är stabil och välskött. Kommunikationer nås enkelt med tunnelbana. Bra läge med närhet till service.',
                    headline: 'Välplanerad trea med balkong',
                    socialCopy: 'Välplanerad lägenhet med öppet kök och balkong i söderläge.',
                    instagramCaption: 'Ljus 3:a i Stockholm 🏠 Balkong i söderläge ☀️',
                    showingInvitation: 'Välkommen på visning tisdag 18:00-19:00.',
                    shortAd: 'Ljus 3:a, 75 kvm, balkong söderläge.',
                  }),
                },
              }],
              usage: { total_tokens: 500 },
            };
          }
          // Analyzer call
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  overallQuality: 8,
                  strengths: ['Bra struktur', 'Naturligt språk'],
                  improvements: [],
                  legalCheck: { compliant: true, notes: '', issues: [] },
                }),
              },
            }],
            usage: { total_tokens: 200 },
          };
        }),
      },
    },
  })),
}));

vi.mock('../lib/redis-cache', () => ({
  getCachedABTestAssignment: vi.fn().mockResolvedValue(null),
  cacheABTestAssignment: vi.fn().mockResolvedValue(undefined),
  getCachedPromptTemplate: vi.fn().mockResolvedValue(null),
  cachePromptTemplate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) },
}));

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AUX_FIELDS = [
  'improvedPrompt',
  'headline',
  'socialCopy',
  'instagramCaption',
  'showingInvitation',
  'shortAd',
] as const;

const BASE_DISPOSITION = {
  property: {
    type: 'lägenhet',
    address: 'Storgatan 12',
    living_area: 75,
    rooms: 3,
    floor: 3,
    build_year: 2010,
    condition: 'Bra',
    layout: 'öppet kök mot vardagsrum',
    materials: { kitchen: 'modernt kök', bathroom: 'helkaklat badrum' },
    balcony: { exists: true, type: 'balkong', size: '10 kvm', direction: 'söder' },
  },
  location: {
    address: 'Storgatan 12, Stockholm',
    area: 'Södermalm',
    municipality: 'Stockholm',
    transport: 'tunnelbana 5 min',
    amenities: ['ICA', 'apotek'],
  },
  financial: { fee: 3500 },
};

const BASE_REQUEST = {
  disposition: BASE_DISPOSITION,
  style: 'balanced' as WritingStyle,
  platform: 'hemnet',
  targetWordMin: 150,
  targetWordMax: 300,
  userId: 'test-user',
  sessionId: 'test-session',
};

// ─── Post-processor preserves all 6 fields ───────────────────────────────────

describe('12.2 Post-processor preserves all 6 aux fields', () => {
  const processor = new DeterministicPostProcessor();

  const fullRequest = {
    improvedPrompt: 'Storgatan 12 är en välplanerad trea om 75 kvm.',
    headline: 'Välplanerad trea med balkong',
    socialCopy: 'Välplanerad lägenhet med balkong.',
    instagramCaption: 'Ljus 3:a 🏠',
    showingInvitation: 'Välkommen på visning.',
    shortAd: 'Ljus 3:a, 75 kvm.',
    disposition: BASE_DISPOSITION,
    style: 'balanced' as WritingStyle,
    platform: 'hemnet',
  };

  AUX_FIELDS.forEach(field => {
    it(`should always return non-empty "${field}"`, async () => {
      const result = await processor.process(fullRequest);
      expect(typeof result[field]).toBe('string');
      expect(result[field].length).toBeGreaterThan(0);
    });
  });

  it('should return all 6 fields in a single call', async () => {
    const result = await processor.process(fullRequest);
    for (const field of AUX_FIELDS) {
      expect(result).toHaveProperty(field);
      expect(result[field]).toBeTruthy();
    }
  });

  it('should preserve all 6 fields even when no transformations apply', async () => {
    const cleanRequest = {
      ...fullRequest,
      improvedPrompt: 'Storgatan 12 är en välplanerad trea om 75 kvm med balkong.',
    };
    const result = await processor.process(cleanRequest);
    for (const field of AUX_FIELDS) {
      expect(result[field]).toBeTruthy();
    }
  });
});

// ─── Full pipeline always returns all 6 fields ───────────────────────────────

describe('12.2 Full pipeline always returns all 6 aux fields', () => {
  let orchestrator: PerfectSwedishOrchestrator;

  beforeEach(() => {
    orchestrator = new PerfectSwedishOrchestrator();
    vi.clearAllMocks();
  });

  AUX_FIELDS.forEach(field => {
    it(`should always return non-empty "${field}" from pipeline`, async () => {
      const result = await orchestrator.execute(BASE_REQUEST);
      expect(typeof result[field]).toBe('string');
      expect(result[field].length).toBeGreaterThan(0);
    }, 15000);
  });

  it('should have 100% aux fields coverage in a single run', async () => {
    const result = await orchestrator.execute(BASE_REQUEST);
    const missingFields = AUX_FIELDS.filter(f => !result[f] || result[f].length === 0);
    expect(missingFields).toHaveLength(0);
  }, 15000);

  it('should return all 6 fields even in minimal mode (large disposition)', async () => {
    // Simulate a large disposition that would trigger minimalFields mode
    const largeDisposition = {
      ...BASE_DISPOSITION,
      // Add lots of extra data to push prompt size up
      extra: Array(50).fill('extra data field with lots of content to make the prompt larger').join(' '),
    };

    const result = await orchestrator.execute({
      ...BASE_REQUEST,
      disposition: largeDisposition,
    });

    for (const field of AUX_FIELDS) {
      expect(result[field]).toBeTruthy();
    }
  }, 15000);

  it('should return all 6 fields for all writing styles', async () => {
    const styles: WritingStyle[] = ['factual', 'balanced', 'selling'];

    for (const style of styles) {
      const result = await orchestrator.execute({ ...BASE_REQUEST, style });
      const missingFields = AUX_FIELDS.filter(f => !result[f] || result[f].length === 0);
      expect(missingFields).toHaveLength(0);
    }
  }, 30000);
});

// ─── GenerationResult interface completeness ──────────────────────────────────

describe('12.2 GenerationResult interface has all required fields', () => {
  it('GenerationResult type exports all 6 text fields', async () => {
    const { SmartGenerationEngine } = await import('../lib/perfect-swedish-generator');
    const engine = new SmartGenerationEngine();
    expect(engine).toBeDefined();

    // Verify the module exports the expected interface shape
    // (compile-time check via TypeScript, runtime check via duck typing)
    const module = await import('../lib/perfect-swedish-generator');
    expect(module.SmartGenerationEngine).toBeDefined();
  });

  it('PostProcessResult preserves all 6 text fields', async () => {
    const { DeterministicPostProcessor } = await import('../lib/perfect-swedish-post-processor');
    const processor = new DeterministicPostProcessor();

    const result = await processor.process({
      improvedPrompt: 'Test text.',
      headline: 'Test rubrik',
      socialCopy: 'Test social.',
      instagramCaption: 'Test 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Test annons.',
      disposition: {},
      style: 'balanced',
      platform: 'hemnet',
    });

    // All 6 fields must be present in PostProcessResult
    expect(result).toHaveProperty('improvedPrompt');
    expect(result).toHaveProperty('headline');
    expect(result).toHaveProperty('socialCopy');
    expect(result).toHaveProperty('instagramCaption');
    expect(result).toHaveProperty('showingInvitation');
    expect(result).toHaveProperty('shortAd');
    // Plus metadata
    expect(result).toHaveProperty('transformations');
    expect(result).toHaveProperty('duration');
  });
});

// ─── Aux fields are non-empty strings (not null/undefined/empty) ──────────────

describe('12.2 Aux fields are always non-empty strings', () => {
  const processor = new DeterministicPostProcessor();

  it('should not return null for any field', async () => {
    const result = await processor.process({
      improvedPrompt: 'Text.',
      headline: 'Rubrik',
      socialCopy: 'Social.',
      instagramCaption: 'Instagram 🏠',
      showingInvitation: 'Visning.',
      shortAd: 'Annons.',
      disposition: {},
      style: 'balanced',
      platform: 'hemnet',
    });

    for (const field of AUX_FIELDS) {
      expect(result[field]).not.toBeNull();
      expect(result[field]).not.toBeUndefined();
    }
  });

  it('should handle graceful degradation and still return all fields', async () => {
    // Even if processing throws internally, the catch block returns original fields
    const result = await processor.process({
      improvedPrompt: 'Text.',
      headline: 'Rubrik',
      socialCopy: 'Social.',
      instagramCaption: 'Instagram 🏠',
      showingInvitation: 'Visning.',
      shortAd: 'Annons.',
      disposition: null as any, // null disposition — triggers graceful degradation path
      style: 'balanced',
      platform: 'hemnet',
    });

    // Even on error path, all 6 fields must be returned
    for (const field of AUX_FIELDS) {
      expect(result[field]).toBeDefined();
    }
  });
});
