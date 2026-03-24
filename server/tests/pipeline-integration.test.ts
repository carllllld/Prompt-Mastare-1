/**
 * Integration tests for the 3-step Perfect Swedish Pipeline.
 * All OpenAI calls are mocked — no real API calls are made.
 *
 * Covers:
 *  - Task 11.1: Complete pipeline execution
 *  - Task 11.2: Retry logic
 *  - Task 11.3: Graceful degradation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
                    improvedPrompt: 'Storgatan 12 är en välplanerad trea om 75 kvm med balkong i söderläge. Lägenheten har renoverat kök och helkaklat badrum. Föreningen är stabil och välskött. Kommunikationer nås enkelt med tunnelbana. Bra läge med närhet till service och grönområden. Sovrummen är placerade mot lugn innergård.',
                    headline: 'Välplanerad trea med balkong i söderläge',
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

// ─── Shared mock helper ───────────────────────────────────────────────────────

function makeDefaultOpenAIMock() {
  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async (params: any) => {
          const isGeneratorCall = params?.messages?.[0]?.role === 'system';
          if (isGeneratorCall) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    improvedPrompt: 'Storgatan 12 är en välplanerad trea om 75 kvm med balkong i söderläge. Lägenheten har renoverat kök och helkaklat badrum. Föreningen är stabil och välskött. Kommunikationer nås enkelt med tunnelbana. Bra läge med närhet till service och grönområden. Sovrummen är placerade mot lugn innergård.',
                    headline: 'Välplanerad trea med balkong i söderläge',
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
  };
}

async function resetOpenAIMock() {
  const OpenAI = (await import('openai')).default as any;
  OpenAI.mockImplementation(() => makeDefaultOpenAIMock());
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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

// ─── Task 11.1: Complete pipeline ────────────────────────────────────────────

describe('11.1 Complete pipeline execution', () => {
  let orchestrator: PerfectSwedishOrchestrator;

  beforeEach(async () => {
    vi.clearAllMocks();
    await resetOpenAIMock();
    orchestrator = new PerfectSwedishOrchestrator();
  });

  it('should return all 6 required text fields', async () => {
    const result = await orchestrator.execute(BASE_REQUEST);

    expect(typeof result.improvedPrompt).toBe('string');
    expect(typeof result.headline).toBe('string');
    expect(typeof result.socialCopy).toBe('string');
    expect(typeof result.instagramCaption).toBe('string');
    expect(typeof result.showingInvitation).toBe('string');
    expect(typeof result.shortAd).toBe('string');

    // All fields must be non-empty
    expect(result.improvedPrompt.length).toBeGreaterThan(0);
    expect(result.headline.length).toBeGreaterThan(0);
    expect(result.socialCopy.length).toBeGreaterThan(0);
    expect(result.instagramCaption.length).toBeGreaterThan(0);
    expect(result.showingInvitation.length).toBeGreaterThan(0);
    expect(result.shortAd.length).toBeGreaterThan(0);
  }, 15000);

  it('should save metrics with success=true', async () => {
    const result = await orchestrator.execute(BASE_REQUEST);

    expect(result.metrics.success).toBe(true);
    expect(result.metrics.totalDuration).toBeGreaterThanOrEqual(0);
    expect(result.metrics.retryCount).toBe(0);
    expect(result.metrics.timestamp).toBeInstanceOf(Date);
  }, 15000);

  it('should not reference old pipeline components in result', async () => {
    const result = await orchestrator.execute(BASE_REQUEST);

    // Old pipeline fields that must NOT exist
    expect((result as any).variant).toBeUndefined();
    expect((result as any).fallbackUsed).toBeUndefined();
    expect((result as any).pipelineVersion).toBeUndefined();
  }, 15000);

  it('should emit progress events via progressEmitter', async () => {
    const events: string[] = [];
    const emitter = (_sessionId: string, event: { type: string; step?: string }) => {
      events.push(event.step ?? event.type);
    };

    const orch = new PerfectSwedishOrchestrator(emitter);
    await orch.execute(BASE_REQUEST);

    expect(events).toContain('smart_generation');
    expect(events).toContain('post_processing');
    expect(events).toContain('expert_analysis');
    expect(events).toContain('completion');
  }, 15000);

  it('should handle all three writing styles', async () => {
    const styles: WritingStyle[] = ['factual', 'balanced', 'selling'];

    for (const style of styles) {
      const result = await orchestrator.execute({ ...BASE_REQUEST, style });
      expect(result.metrics.success).toBe(true);
      expect(result.improvedPrompt.length).toBeGreaterThan(0);
    }
  }, 30000);
});

// ─── Task 11.2: Retry logic ───────────────────────────────────────────────────

describe('11.2 Retry logic', () => {
  let orchestrator: PerfectSwedishOrchestrator;

  beforeEach(async () => {
    vi.clearAllMocks();
    await resetOpenAIMock();
    orchestrator = new PerfectSwedishOrchestrator();
  });

  it('should retry on ECONNREFUSED and succeed on second attempt', async () => {
    const OpenAI = (await import('openai')).default as any;
    let generatorCallCount = 0;

    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async (params: any) => {
            const isGeneratorCall = params?.messages?.[0]?.role === 'system';
            if (isGeneratorCall) {
              generatorCallCount++;
              if (generatorCallCount === 1) throw Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
              return {
                choices: [{
                  message: {
                    content: JSON.stringify({
                      improvedPrompt: 'Text efter retry.',
                      headline: 'Rubrik',
                      socialCopy: 'Social.',
                      instagramCaption: 'Instagram 🏠',
                      showingInvitation: 'Välkommen på visning.',
                      shortAd: 'Kort annons.',
                    }),
                  },
                }],
                usage: { total_tokens: 100 },
              };
            }
            return { choices: [{ message: { content: JSON.stringify({ overallQuality: 7, strengths: [], improvements: [], legalCheck: { compliant: true, notes: '', issues: [] } }) } }], usage: { total_tokens: 50 } };
          }),
        },
      },
    }));

    const result = await orchestrator.execute(BASE_REQUEST);

    expect(result.metrics.success).toBe(true);
    expect(result.metrics.retryCount).toBeGreaterThan(0);
  }, 30000);

  it('should retry on 429 rate limit and succeed', async () => {
    const OpenAI = (await import('openai')).default as any;
    let callCount = 0;

    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) throw new Error('rate_limit_exceeded 429');
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    improvedPrompt: 'Text efter rate limit retry.',
                    headline: 'Rubrik',
                    socialCopy: 'Social.',
                    instagramCaption: 'Instagram 🏠',
                    showingInvitation: 'Välkommen på visning.',
                    shortAd: 'Kort annons.',
                  }),
                },
              }],
              usage: { total_tokens: 100 },
            };
          }),
        },
      },
    }));

    const result = await orchestrator.execute(BASE_REQUEST);
    expect(result.metrics.success).toBe(true);
    expect(result.metrics.retryCount).toBeGreaterThan(0);
  }, 30000);

  it('should fail after exhausting all retries', async () => {
    const OpenAI = (await import('openai')).default as any;

    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('ETIMEDOUT')),
        },
      },
    }));

    // After exhausting retries, fallback system activates
    const result = await orchestrator.execute(BASE_REQUEST);
    
    // Fallback provides basic result
    expect(result.metrics.success).toBe(true);
    expect(result.metrics.errorType).toBe('pipeline_failure_fallback_activated');
    expect(result.metrics.retryCount).toBeGreaterThan(0);
    
    // Fallback text should be present
    expect(result.improvedPrompt).toBeTruthy();
    expect(result.headline).toBeTruthy();
  }, 30000);
});

// ─── Task 11.3: Graceful degradation ─────────────────────────────────────────

describe('11.3 Graceful degradation', () => {
  let orchestrator: PerfectSwedishOrchestrator;

  beforeEach(async () => {
    vi.clearAllMocks();
    await resetOpenAIMock();
    orchestrator = new PerfectSwedishOrchestrator();
  });

  it('should continue with unprocessed text if Post_Processor throws', async () => {
    // Spy on the post-processor inside the orchestrator instance
    const { DeterministicPostProcessor } = await import('../lib/perfect-swedish-post-processor');
    const spy = vi.spyOn(DeterministicPostProcessor.prototype, 'process')
      .mockRejectedValueOnce(new Error('Post-processor crashed'));

    const result = await orchestrator.execute(BASE_REQUEST);

    // Should still return a result
    expect(result.improvedPrompt).toBeDefined();
    expect(result.improvedPrompt.length).toBeGreaterThan(0);
    expect(result.metrics.success).toBe(true);

    spy.mockRestore();
  }, 15000);

  it('should continue without expertAnalysis if Expert_Analyzer throws', async () => {
    const { ExpertAIAnalyzer } = await import('../lib/perfect-swedish-analyzer');
    const spy = vi.spyOn(ExpertAIAnalyzer.prototype, 'analyze')
      .mockRejectedValueOnce(new Error('Analyzer crashed'));

    const result = await orchestrator.execute(BASE_REQUEST);

    // Text fields must still be present
    expect(result.improvedPrompt).toBeDefined();
    expect(result.headline).toBeDefined();
    // expertAnalysis should be undefined (graceful degradation)
    expect(result.expertAnalysis).toBeUndefined();
    expect(result.metrics.success).toBe(true);

    spy.mockRestore();
  }, 15000);

  it('should log a Sentry warning when Post_Processor degrades', async () => {
    const Sentry = await import('@sentry/node');
    const { DeterministicPostProcessor } = await import('../lib/perfect-swedish-post-processor');

    vi.spyOn(DeterministicPostProcessor.prototype, 'process')
      .mockRejectedValueOnce(new Error('Post-processor crashed'));

    await orchestrator.execute(BASE_REQUEST);

    expect(Sentry.captureException).toHaveBeenCalled();
  }, 15000);

  it('should log a Sentry warning when Expert_Analyzer degrades', async () => {
    const Sentry = await import('@sentry/node');
    const { ExpertAIAnalyzer } = await import('../lib/perfect-swedish-analyzer');

    vi.spyOn(ExpertAIAnalyzer.prototype, 'analyze')
      .mockRejectedValueOnce(new Error('Analyzer crashed'));

    await orchestrator.execute(BASE_REQUEST);

    expect(Sentry.captureException).toHaveBeenCalled();
  }, 15000);

  it('should handle null disposition without crashing', async () => {
    const result = await orchestrator.execute({ ...BASE_REQUEST, disposition: {} });
    expect(result.improvedPrompt).toBeDefined();
  }, 15000);
});
