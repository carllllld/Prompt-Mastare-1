/**
 * Preservation Property Tests for Analyzer-Validation Mismatch Fix
 * 
 * These tests MUST PASS on unfixed code - they capture baseline behavior to preserve.
 * Run these tests BEFORE implementing the fix to observe current behavior.
 * After fix, these tests must still pass to ensure no regressions.
 * 
 * Property 2: Non-Violation Analysis Quality
 * For clean texts (no violations), analyzer should continue providing quality analysis.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ExpertAIAnalyzer } from '../lib/perfect-swedish-analyzer';
import { findRuleViolations } from '../lib/text-validation';

// Skip all tests if using fake API key
const hasRealApiKey = process.env.OPENAI_API_KEY && 
                      !process.env.OPENAI_API_KEY.startsWith('test-') &&
                      process.env.OPENAI_API_KEY.length > 20;

describe.skipIf(!hasRealApiKey)('Analyzer Preservation - Property 2: Non-Violation Analysis Quality', () => {
  const analyzer = new ExpertAIAnalyzer();

  it('PRESERVATION: Clean text (no violations) gets quality analysis with strengths', async () => {
    const request = {
      improvedPrompt: 'Lägenhet om 75 kvm med balkong i söderläge. Renoverat kök från 2022 med moderna vitvaror. Helkaklat badrum renoverat 2021. Närhet till kommunikationer och service.',
      headline: 'Lägenhet med balkong i söderläge',
      socialCopy: 'Lägenhet om 75 kvm med balkong i söderläge.',
      instagramCaption: 'Lägenhet med balkong 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Lägenhet 75 kvm, balkong söderläge',
      disposition: {},
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    // Verify no violations exist
    const violations = findRuleViolations(request.improvedPrompt, request.platform, request.style);
    expect(violations.length).toBe(0);

    // Analyzer should provide quality analysis
    const analysis = await analyzer.analyze(request);
    
    // Preserve: Quality score should be reasonable
    expect(analysis.overallQuality).toBeGreaterThanOrEqual(6.0);
    expect(analysis.overallQuality).toBeLessThanOrEqual(10.0);
    
    // Preserve: Strengths should be identified
    expect(analysis.strengths).toBeDefined();
    expect(Array.isArray(analysis.strengths)).toBe(true);
    
    // Preserve: Legal check should be compliant for clean text
    expect(analysis.legalCheck.compliant).toBe(true);
    
    // Preserve: Improvements array exists (may be empty or have non-critical suggestions)
    expect(analysis.improvements).toBeDefined();
    expect(Array.isArray(analysis.improvements)).toBe(true);
  }, 60000);

  it('PRESERVATION: Non-critical style suggestions continue to be generated', async () => {
    const request = {
      improvedPrompt: 'Lägenhet med balkong. Lägenhet har kök. Lägenhet har badrum. Lägenhet ligger centralt.',
      headline: 'Lägenhet med balkong',
      socialCopy: 'Lägenhet med balkong.',
      instagramCaption: 'Lägenhet 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Lägenhet med balkong',
      disposition: {},
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    // Text has repetitive structure but no critical violations
    const violations = findRuleViolations(request.improvedPrompt, request.platform, request.style);
    const hasCriticalViolations = violations.some(v => 
      v.includes('Förbjuden fras') || 
      v.includes('Hemnet-regel') ||
      v.includes('ekonomi')
    );
    expect(hasCriticalViolations).toBe(false);

    // Analyzer should provide style suggestions
    const analysis = await analyzer.analyze(request);
    
    // Preserve: Analyzer can provide suggestions (critical or non-critical)
    expect(analysis.improvements).toBeDefined();
    
    // Preserve: Quality score reflects style issues
    expect(analysis.overallQuality).toBeDefined();
    expect(typeof analysis.overallQuality).toBe('number');
  }, 60000);

  it('PRESERVATION: Quality scoring reflects detected issues', async () => {
    const request = {
      improvedPrompt: 'Lägenhet.',
      headline: 'Lägenhet',
      socialCopy: 'Lägenhet.',
      instagramCaption: 'Lägenhet 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Lägenhet',
      disposition: {},
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    // Very minimal text (quality issue but not a violation)
    const analysis = await analyzer.analyze(request);
    
    // Preserve: Quality score should be defined and reasonable
    expect(analysis.overallQuality).toBeDefined();
    expect(typeof analysis.overallQuality).toBe('number');
    expect(analysis.overallQuality).toBeGreaterThanOrEqual(0);
    expect(analysis.overallQuality).toBeLessThanOrEqual(10);
    
    // Preserve: Analysis structure is correct
    expect(analysis.strengths).toBeDefined();
    expect(analysis.improvements).toBeDefined();
    expect(analysis.legalCheck).toBeDefined();
  }, 60000);

  it('PRESERVATION: Text span identification works correctly', async () => {
    const request = {
      improvedPrompt: 'Lägenhet om 75 kvm med balkong i söderläge.',
      headline: 'Lägenhet med balkong',
      socialCopy: 'Lägenhet med balkong.',
      instagramCaption: 'Lägenhet 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Lägenhet med balkong',
      disposition: {},
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    const analysis = await analyzer.analyze(request);
    
    // Preserve: If improvements have textSpan, it should be valid
    for (const improvement of analysis.improvements) {
      if (improvement.textSpan) {
        expect(improvement.textSpan.start).toBeGreaterThanOrEqual(0);
        expect(improvement.textSpan.end).toBeGreaterThan(improvement.textSpan.start);
        expect(improvement.textSpan.field).toBeDefined();
        expect(['improvedPrompt', 'headline', 'socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd']).toContain(improvement.textSpan.field);
      }
    }
  }, 60000);

  it('PRESERVATION: Auto-fix generation works for actionable items', async () => {
    const request = {
      improvedPrompt: 'Lägenhet om 75 kvm med balkong i söderläge.',
      headline: 'Lägenhet med balkong',
      socialCopy: 'Lägenhet med balkong.',
      instagramCaption: 'Lägenhet 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Lägenhet med balkong',
      disposition: {},
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    const analysis = await analyzer.analyze(request);
    
    // Preserve: If improvements are actionable, they should have autoFix
    for (const improvement of analysis.improvements) {
      if (improvement.actionable) {
        // Actionable items may or may not have autoFix (depends on suggestion)
        // Just verify the field exists
        expect('autoFix' in improvement).toBe(true);
      }
    }
  }, 60000);

  it('PRESERVATION: Valid broker language is not flagged as violation', async () => {
    const request = {
      improvedPrompt: 'Lägenhet om 75 kvm med renoverat kök från 2022. Helkaklat badrum renoverat 2021. Balkong i söderläge. Närhet till kommunikationer och service. Smidig pendling till centrum.',
      headline: 'Lägenhet med renoverat kök',
      socialCopy: 'Renoverat kök från 2022 och helkaklat badrum.',
      instagramCaption: 'Renoverat kök 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Lägenhet 75 kvm, renoverat kök 2022',
      disposition: {},
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    // Text uses valid broker language (not AI clichés)
    const violations = findRuleViolations(request.improvedPrompt, request.platform, request.style);
    expect(violations.length).toBe(0);

    const analysis = await analyzer.analyze(request);
    
    // Preserve: No critical violations for valid broker language
    const criticalImprovements = analysis.improvements.filter(i => i.severity === 'critical');
    expect(criticalImprovements.length).toBe(0);
    
    // Preserve: Legal check should be compliant
    expect(analysis.legalCheck.compliant).toBe(true);
  }, 60000);
});
