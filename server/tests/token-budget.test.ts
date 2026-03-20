import { describe, it, expect } from 'vitest';

// Mirror of computeOutputTokenBudget from routes.ts
// Kept in sync — if the formula changes, update this test too.
function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeOutputTokenBudget(targetWordMax: number, includeAuxFields: boolean): number {
  const safeWordMax = Number.isFinite(targetWordMax) && targetWordMax > 0 ? targetWordMax : 500;
  const mainTextTokenBudget = Math.round(safeWordMax * 2.4);
  const auxTokenBudget = includeAuxFields ? 1200 : 240;
  return clampNumber(
    mainTextTokenBudget + auxTokenBudget,
    includeAuxFields ? 5500 : 900,
    includeAuxFields ? 8000 : 2600
  );
}

describe('Token budget calculation (computeOutputTokenBudget)', () => {
  describe('With aux fields (includeAuxFields = true)', () => {
    it('should return minimum 5500 tokens for very short targetWordMax', () => {
      expect(computeOutputTokenBudget(10, true)).toBe(5500);
      expect(computeOutputTokenBudget(1, true)).toBe(5500);
      expect(computeOutputTokenBudget(100, true)).toBe(5500);
    });

    it('should return maximum 8000 tokens for very large targetWordMax', () => {
      expect(computeOutputTokenBudget(9999, true)).toBe(8000);
      expect(computeOutputTokenBudget(5000, true)).toBe(8000);
    });

    it('should calculate correctly for typical targetWordMax values', () => {
      // targetWordMax=300: 300*2.4 + 1200 = 720 + 1200 = 1920 → clamped to 5500
      expect(computeOutputTokenBudget(300, true)).toBe(5500);

      // targetWordMax=500: 500*2.4 + 1200 = 1200 + 1200 = 2400 → clamped to 5500
      expect(computeOutputTokenBudget(500, true)).toBe(5500);

      // targetWordMax=1800: 1800*2.4 + 1200 = 4320 + 1200 = 5520 → within range
      expect(computeOutputTokenBudget(1800, true)).toBe(5520);

      // targetWordMax=2000: 2000*2.4 + 1200 = 4800 + 1200 = 6000 → within range
      expect(computeOutputTokenBudget(2000, true)).toBe(6000);

      // targetWordMax=2800: 2800*2.4 + 1200 = 6720 + 1200 = 7920 → within range
      expect(computeOutputTokenBudget(2800, true)).toBe(7920);
    });

    it('should clamp correctly at both ends', () => {
      const min = computeOutputTokenBudget(0, true);
      const max = computeOutputTokenBudget(100000, true);
      expect(min).toBe(5500);
      expect(max).toBe(8000);
    });

    it('should handle invalid targetWordMax gracefully (defaults to 500)', () => {
      // NaN → safeWordMax = 500 → 500*2.4 + 1200 = 2400 → clamped to 5500
      expect(computeOutputTokenBudget(NaN, true)).toBe(5500);
      // Negative → safeWordMax = 500 → clamped to 5500
      expect(computeOutputTokenBudget(-100, true)).toBe(5500);
      // Zero → safeWordMax = 500 → clamped to 5500
      expect(computeOutputTokenBudget(0, true)).toBe(5500);
    });
  });

  describe('Without aux fields (includeAuxFields = false)', () => {
    it('should return minimum 900 tokens', () => {
      expect(computeOutputTokenBudget(1, false)).toBe(900);
      expect(computeOutputTokenBudget(100, false)).toBe(900);
    });

    it('should return maximum 2600 tokens', () => {
      expect(computeOutputTokenBudget(9999, false)).toBe(2600);
    });

    it('should calculate correctly for typical values', () => {
      // targetWordMax=500: 500*2.4 + 240 = 1200 + 240 = 1440 → within range
      expect(computeOutputTokenBudget(500, false)).toBe(1440);

      // targetWordMax=1000: 1000*2.4 + 240 = 2400 + 240 = 2640 → clamped to 2600
      expect(computeOutputTokenBudget(1000, false)).toBe(2600);
    });
  });

  describe('Formula properties', () => {
    it('should be monotonically non-decreasing within valid range', () => {
      const values = [200, 300, 400, 500, 600, 800, 1000, 1500, 2000, 2500, 3000];
      for (let i = 1; i < values.length; i++) {
        const prev = computeOutputTokenBudget(values[i - 1], true);
        const curr = computeOutputTokenBudget(values[i], true);
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it('aux fields mode always returns higher budget than non-aux for same input', () => {
      const testValues = [100, 300, 500, 800, 1000, 2000];
      for (const v of testValues) {
        expect(computeOutputTokenBudget(v, true)).toBeGreaterThan(computeOutputTokenBudget(v, false));
      }
    });
  });
});
