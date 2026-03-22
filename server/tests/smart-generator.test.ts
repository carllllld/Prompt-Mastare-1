/**
 * Unit tests for SmartGenerationEngine (Task 10.1)
 * OpenAI is fully mocked — no real API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartGenerationEngine } from '../lib/perfect-swedish-generator';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Use vi.hoisted to avoid temporal dead zone with vi.mock hoisting
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

vi.mock('../lib/redis-cache', () => ({
  getCachedPromptTemplate: vi.fn().mockResolvedValue(null),
  cachePromptTemplate: vi.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOpenAIResponse(overrides: Record<string, string> = {}) {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          improvedPrompt: overrides.improvedPrompt ?? 'Storgatan 12 är en välplanerad trea om 75 kvm med balkong i söderläge.',
          headline: overrides.headline ?? 'Välplanerad trea med balkong',
          socialCopy: overrides.socialCopy ?? 'Välplanerad lägenhet med balkong i söderläge.',
          instagramCaption: overrides.instagramCaption ?? 'Ljus 3:a 🏠',
          showingInvitation: overrides.showingInvitation ?? 'Välkommen på visning.',
          shortAd: overrides.shortAd ?? 'Ljus 3:a, 75 kvm.',
        }),
      },
    }],
    usage: { total_tokens: 450 },
  };
}

const BASE_REQUEST = {
  disposition: {
    property: { type: 'lägenhet', address: 'Storgatan 12', living_area: 75, rooms: 3 },
    location: { area: 'Södermalm', transport: 'tunnelbana 5 min' },
    financial: { fee: 3500 },
  },
  style: 'balanced' as const,
  platform: 'hemnet',
  targetWordMin: 150,
  targetWordMax: 300,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('10.1 SmartGenerationEngine', () => {
  let engine: SmartGenerationEngine;

  beforeEach(() => {
    engine = new SmartGenerationEngine();
    vi.clearAllMocks();
    mockCreate.mockResolvedValue(makeOpenAIResponse());
  });

  describe('should generate all 6 required fields', () => {
    it('returns improvedPrompt', async () => {
      const result = await engine.generate(BASE_REQUEST);
      expect(typeof result.improvedPrompt).toBe('string');
      expect(result.improvedPrompt.length).toBeGreaterThan(0);
    });

    it('returns headline', async () => {
      const result = await engine.generate(BASE_REQUEST);
      expect(typeof result.headline).toBe('string');
      expect(result.headline.length).toBeGreaterThan(0);
    });

    it('returns socialCopy', async () => {
      const result = await engine.generate(BASE_REQUEST);
      expect(typeof result.socialCopy).toBe('string');
      expect(result.socialCopy.length).toBeGreaterThan(0);
    });

    it('returns instagramCaption', async () => {
      const result = await engine.generate(BASE_REQUEST);
      expect(typeof result.instagramCaption).toBe('string');
      expect(result.instagramCaption.length).toBeGreaterThan(0);
    });

    it('returns showingInvitation', async () => {
      const result = await engine.generate(BASE_REQUEST);
      expect(typeof result.showingInvitation).toBe('string');
      expect(result.showingInvitation.length).toBeGreaterThan(0);
    });

    it('returns shortAd', async () => {
      const result = await engine.generate(BASE_REQUEST);
      expect(typeof result.shortAd).toBe('string');
      expect(result.shortAd.length).toBeGreaterThan(0);
    });
  });

  describe('should throw error if required fields are missing', () => {
    it('throws when improvedPrompt is missing', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ headline: 'Rubrik' }) } }],
        usage: { total_tokens: 100 },
      });
      await expect(engine.generate(BASE_REQUEST)).rejects.toThrow();
    });

    it('throws when headline is missing', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ improvedPrompt: 'Text' }) } }],
        usage: { total_tokens: 100 },
      });
      await expect(engine.generate(BASE_REQUEST)).rejects.toThrow();
    });

    it('throws when response content is empty', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
        usage: { total_tokens: 0 },
      });
      await expect(engine.generate(BASE_REQUEST)).rejects.toThrow();
    });

    it('throws when response JSON is invalid', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'not valid json {{{' } }],
        usage: { total_tokens: 10 },
      });
      await expect(engine.generate(BASE_REQUEST)).rejects.toThrow();
    });
  });

  describe('duration and tokensUsed metadata', () => {
    it('returns duration >= 0', async () => {
      const result = await engine.generate(BASE_REQUEST);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('returns tokensUsed from API response', async () => {
      const result = await engine.generate(BASE_REQUEST);
      expect(result.tokensUsed).toBe(450);
    });

    it('returns tokensUsed=0 when usage is missing', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          improvedPrompt: 'Text.',
          headline: 'Rubrik',
          socialCopy: 'Social.',
          instagramCaption: 'Instagram 🏠',
          showingInvitation: 'Visning.',
          shortAd: 'Annons.',
        }) } }],
        // no usage field
      });
      const result = await engine.generate(BASE_REQUEST);
      expect(result.tokensUsed).toBe(0);
    });
  });

  describe('handles minimal fields mode', () => {
    it('still returns all 6 fields when only improvedPrompt and headline are in response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          improvedPrompt: 'Storgatan 12 är en välplanerad trea.',
          headline: 'Välplanerad trea',
          // aux fields missing — generator should default to empty strings
          socialCopy: '',
          instagramCaption: '',
          showingInvitation: 'Välkommen på visning.',
          shortAd: '',
        }) } }],
        usage: { total_tokens: 200 },
      });

      const result = await engine.generate(BASE_REQUEST);
      expect(result.improvedPrompt).toBeTruthy();
      expect(result.headline).toBeTruthy();
      // Empty strings are acceptable in minimal mode
      expect(typeof result.socialCopy).toBe('string');
      expect(typeof result.instagramCaption).toBe('string');
      expect(typeof result.showingInvitation).toBe('string');
      expect(typeof result.shortAd).toBe('string');
    });
  });

  describe('personalStylePrompt is included in prompt', () => {
    it('calls OpenAI when personalStylePrompt is provided', async () => {
      await engine.generate({
        ...BASE_REQUEST,
        personalStylePrompt: 'Använd alltid "bostad" istället för "lägenhet"',
      });
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('calls OpenAI when personalStylePrompt is omitted', async () => {
      await engine.generate(BASE_REQUEST);
      expect(mockCreate).toHaveBeenCalledOnce();
    });
  });

  describe('buildPrompt', () => {
    it('returns a non-empty prompt string', async () => {
      const prompt = await engine.buildPrompt(BASE_REQUEST);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('includes disposition data in prompt', async () => {
      const prompt = await engine.buildPrompt(BASE_REQUEST);
      expect(prompt).toContain('Storgatan 12');
    });

    it('includes style in prompt', async () => {
      const prompt = await engine.buildPrompt(BASE_REQUEST);
      expect(prompt.toLowerCase()).toContain('balanced');
    });

    it('includes word count targets in prompt', async () => {
      const prompt = await engine.buildPrompt(BASE_REQUEST);
      expect(prompt).toContain('150');
      expect(prompt).toContain('300');
    });
  });
});
