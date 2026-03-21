import { describe, it, expect, beforeAll } from 'vitest';
import { SmartGenerationEngine } from '../lib/perfect-swedish-generator';
import { DeterministicPostProcessor } from '../lib/perfect-swedish-post-processor';
import { ExpertAIAnalyzer } from '../lib/perfect-swedish-analyzer';

/**
 * Integration Tests for Complete System Verification
 * 
 * These tests verify the full pipeline: generate → post-process → analyze
 * ensuring all 6 fields are compliant with platform rules and quality requirements.
 */

describe('Complete System Verification - Integration Tests', () => {
  let generator: SmartGenerationEngine;
  let postProcessor: DeterministicPostProcessor;
  let analyzer: ExpertAIAnalyzer;

  beforeAll(() => {
    generator = new SmartGenerationEngine();
    postProcessor = new DeterministicPostProcessor();
    analyzer = new ExpertAIAnalyzer();
  });

  const mockPropertyData = {
    propertyType: 'lägenhet',
    rooms: 3,
    area: 72,
    price: 2500000,
    fee: 4500,
    energiklass: 'B',
    address: {
      street: 'Testgatan 10',
      city: 'Stockholm'
    },
    features: ['balkong', 'renoverat kök', 'helkaklat badrum']
  };

  /**
   * Integration Test 1: Complete Hemnet Pipeline
   * 
   * Verifies that the full pipeline produces compliant output for Hemnet:
   * - All 6 fields present
   * - No Hemnet violations (price/fee/energiklass)
   * - Field-specific quality requirements met
   */
  it.skip('should produce compliant output for Hemnet through full pipeline', async () => {
    // Generate
    const generated = await generator.generate({
      disposition: mockPropertyData,
      style: 'balanced',
      platform: 'hemnet',
      targetWordMin: 150,
      targetWordMax: 300
    });

    // Post-process
    const processed = await postProcessor.process({
      ...generated,
      disposition: mockPropertyData,
      style: 'balanced',
      platform: 'hemnet'
    });

    // Analyze
    const analysis = await analyzer.analyze({
      ...processed,
      disposition: mockPropertyData,
      style: 'balanced',
      platform: 'hemnet'
    });

    // Verify all fields present
    expect(processed.improvedPrompt).toBeTruthy();
    expect(processed.headline).toBeTruthy();
    expect(processed.socialCopy).toBeTruthy();
    expect(processed.instagramCaption).toBeTruthy();
    expect(processed.showingInvitation).toBeTruthy();
    expect(processed.shortAd).toBeTruthy();

    // Verify no Hemnet violations
    const forbiddenPatterns = [
      /\b(pris|avgift|energiklass|driftkostnad)\b/gi
    ];

    const allFields = [
      processed.improvedPrompt,
      processed.headline,
      processed.socialCopy,
      processed.instagramCaption,
      processed.showingInvitation,
      processed.shortAd
    ];

    allFields.forEach(field => {
      forbiddenPatterns.forEach(pattern => {
        expect(field).not.toMatch(pattern);
      });
    });

    // Verify field-specific quality
    const headlineWords = processed.headline.split(/\s+/).filter(w => w.length > 0).length;
    expect(headlineWords).toBeLessThanOrEqual(9);
    expect(processed.headline).not.toMatch(/[.!?]$/);
    expect(processed.showingInvitation).toMatch(/visning/i);

    // Verify analysis covers all fields
    expect(analysis.overallQuality).toBeGreaterThan(0);
    expect(analysis.strengths.length).toBeGreaterThan(0);
  }, 60000);

  /**
   * Integration Test 2: Booli Pipeline
   * 
   * Verifies that Booli allows price/fee in appropriate fields.
   */
  it.skip('should allow price/fee for Booli platform', async () => {
    const generated = await generator.generate({
      disposition: mockPropertyData,
      style: 'balanced',
      platform: 'booli',
      targetWordMin: 150,
      targetWordMax: 300
    });

    const processed = await postProcessor.process({
      ...generated,
      disposition: mockPropertyData,
      style: 'balanced',
      platform: 'booli'
    });

    // Booli should NOT remove price/fee patterns
    // (they may or may not be present, but if present, they should remain)
    expect(processed.improvedPrompt).toBeTruthy();
    expect(processed.headline).toBeTruthy();
  }, 60000);

  /**
   * Integration Test 3: Post-Processor Removes Injected Violations
   * 
   * Verifies that post-processor successfully removes Hemnet violations
   * even when they're injected into the text.
   */
  it('should remove Hemnet violations from all fields', async () => {
    const inputWithViolations = {
      improvedPrompt: 'Test text with pris 2 500 000 kr. More text here.',
      headline: 'Trea med avgift 4500',
      socialCopy: 'Driftkostnad 800 kr/mån',
      instagramCaption: 'Utgångspris 2,5 miljoner',
      showingInvitation: 'Visning, avgift 4500',
      shortAd: 'Pris 2,5 mkr',
      disposition: mockPropertyData,
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    const processed = await postProcessor.process(inputWithViolations);

    const allFields = [
      processed.improvedPrompt,
      processed.headline,
      processed.socialCopy,
      processed.instagramCaption,
      processed.showingInvitation,
      processed.shortAd
    ];

    const pricePattern = /\b(pris|avgift|driftkostnad|utgångspris)\b/gi;
    allFields.forEach(field => {
      expect(field).not.toMatch(pricePattern);
    });

    // Verify transformations were logged
    const platformViolations = processed.transformations.filter(
      t => t.type === 'forbidden_phrase' && /\b(pris|avgift)/i.test(t.before)
    );
    expect(platformViolations.length).toBeGreaterThan(0);
  });

  /**
   * Integration Test 4: Field Quality Rules Enforcement
   * 
   * Verifies that post-processor enforces field-specific quality rules.
   */
  it('should enforce field quality rules', async () => {
    const input = {
      improvedPrompt: 'Valid text',
      headline: 'This is a very long headline with more than nine words.',
      socialCopy: 'Valid social copy without period',
      instagramCaption: 'Valid Instagram 🏠🌟✨💫🎉', // Too many emojis
      showingInvitation: 'Valid showing invitation with visning',
      shortAd: 'Valid short ad',
      disposition: mockPropertyData,
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    const processed = await postProcessor.process(input);

    // Headline: should remove trailing period (if any)
    expect(processed.headline).not.toMatch(/\.$/);

    // Social copy: should add period
    expect(processed.socialCopy).toMatch(/\.$/);

    // Instagram: should limit to 2 emojis
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu;
    const emojis = processed.instagramCaption.match(emojiPattern) || [];
    expect(emojis.length).toBeLessThanOrEqual(2);
  });

  /**
   * Integration Test 5: Analyzer Receives All Fields
   * 
   * Verifies that analyzer can analyze all 6 fields.
   */
  it.skip('should analyze all 6 fields', async () => {
    const analysis = await analyzer.analyze({
      improvedPrompt: 'Main text with proper structure. Second sentence here.',
      headline: 'Test headline',
      socialCopy: 'Social copy text.',
      instagramCaption: 'Instagram caption 🏠',
      showingInvitation: 'Välkommen på visning',
      shortAd: 'Short ad text',
      disposition: mockPropertyData,
      style: 'balanced',
      platform: 'hemnet'
    });

    expect(analysis.improvements).toBeDefined();
    expect(Array.isArray(analysis.improvements)).toBe(true);
    expect(analysis.overallQuality).toBeGreaterThan(0);
  }, 60000);

  /**
   * Integration Test 6: Analyzer Flags Hemnet Violations
   * 
   * Verifies that analyzer flags Hemnet violations in auxiliary fields as critical.
   */
  it.skip('should flag Hemnet violations in auxiliary fields as critical', async () => {
    const analysis = await analyzer.analyze({
      improvedPrompt: 'Valid main text',
      headline: 'Valid headline',
      socialCopy: 'Valid social',
      instagramCaption: 'Avgift 4500 kr/mån 🏠', // Hemnet violation
      showingInvitation: 'Välkommen på visning',
      shortAd: 'Valid short ad',
      disposition: mockPropertyData,
      style: 'balanced',
      platform: 'hemnet'
    });

    const criticalViolations = analysis.improvements.filter(
      item => item.severity === 'critical' &&
              (item.issue.toLowerCase().includes('avgift') ||
               item.issue.toLowerCase().includes('pris'))
    );

    expect(criticalViolations.length).toBeGreaterThan(0);
  }, 60000);
});
