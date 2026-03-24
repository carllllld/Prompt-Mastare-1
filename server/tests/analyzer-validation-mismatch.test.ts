/**
 * Bug Condition Exploration Test for Analyzer-Validation Mismatch
 * 
 * This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * Bug: Expert Analyzer fails to detect violations that validation system finds.
 * Expected: Analyzer returns critical improvements for all validation violations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ExpertAIAnalyzer } from '../lib/perfect-swedish-analyzer';
import { findRuleViolations } from '../lib/text-validation';

// Skip all tests if using fake API key
const hasRealApiKey = process.env.OPENAI_API_KEY && 
                      !process.env.OPENAI_API_KEY.startsWith('test-') &&
                      process.env.OPENAI_API_KEY.length > 20;

describe.skipIf(!hasRealApiKey)('Analyzer-Validation Mismatch - Bug Condition Exploration', () => {
  const analyzer = new ExpertAIAnalyzer();

  it('PROPERTY 1: Analyzer detects forbidden phrase "erbjuds" in improvedPrompt', async () => {
    const request = {
      improvedPrompt: 'Här erbjuds en rymlig lägenhet med balkong i söderläge.',
      headline: 'Rymlig lägenhet med balkong',
      socialCopy: 'Lägenhet med balkong.',
      instagramCaption: 'Lägenhet 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Lägenhet med balkong',
      disposition: {},
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    // Verify validation system detects the violation
    const violations = findRuleViolations(request.improvedPrompt, request.platform, request.style);
    expect(violations).toContain('Förbjuden fras: "erbjuds"');

    // BUG: Analyzer should detect this but doesn't
    const analysis = await analyzer.analyze(request);
    
    // Expected behavior: Analyzer returns critical improvement for forbidden phrase
    const forbiddenPhraseImprovements = analysis.improvements.filter(
      item => item.severity === 'critical' && 
              item.issue.toLowerCase().includes('erbjud')
    );
    
    expect(forbiddenPhraseImprovements.length).toBeGreaterThan(0);
    expect(analysis.legalCheck.compliant).toBe(false);
  }, 60000);

  it('PROPERTY 1: Analyzer detects unverifiable claim "i nyskick" in socialCopy', async () => {
    const request = {
      improvedPrompt: 'Lägenhet med renoverat kök.',
      headline: 'Lägenhet med renoverat kök',
      socialCopy: 'Kök i nyskick med moderna vitvaror.',
      instagramCaption: 'Renoverat kök 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Lägenhet med kök',
      disposition: {},
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    // Note: findRuleViolations doesn't check UNVERIFIABLE_CLAIMS yet
    // But analyzer should detect it based on prompt
    const text = request.socialCopy.toLowerCase();
    expect(text).toContain('i nyskick');

    // BUG: Analyzer should detect unverifiable claim but doesn't
    const analysis = await analyzer.analyze(request);
    
    // Expected behavior: Analyzer returns critical improvement for unverifiable claim
    const unverifiableClaimImprovements = analysis.improvements.filter(
      item => item.severity === 'critical' && 
              (item.issue.toLowerCase().includes('nyskick') ||
               item.issue.toLowerCase().includes('otydligt påstående'))
    );
    
    expect(unverifiableClaimImprovements.length).toBeGreaterThan(0);
    expect(analysis.legalCheck.compliant).toBe(false);
  }, 60000);

  it('PROPERTY 1: Analyzer detects Hemnet economic reference violation', async () => {
    const request = {
      improvedPrompt: 'Lägenhet med balkong. Kontakta mäklaren för fullständig ekonomisk information.',
      headline: 'Lägenhet med balkong',
      socialCopy: 'Lägenhet med balkong.',
      instagramCaption: 'Lägenhet 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Lägenhet med balkong',
      disposition: {},
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    // Verify validation system detects the violation
    const violations = findRuleViolations(request.improvedPrompt, request.platform, request.style);
    const hasEconomicViolation = violations.some(v => 
      v.toLowerCase().includes('ekonomi') || 
      v.toLowerCase().includes('hemnet')
    );
    expect(hasEconomicViolation).toBe(true);

    // BUG: Analyzer should detect this but doesn't
    const analysis = await analyzer.analyze(request);
    
    // Expected behavior: Analyzer returns critical improvement for Hemnet violation
    const hemnetViolationImprovements = analysis.improvements.filter(
      item => item.severity === 'critical' && 
              (item.issue.toLowerCase().includes('ekonomi') ||
               item.issue.toLowerCase().includes('hemnet'))
    );
    
    expect(hemnetViolationImprovements.length).toBeGreaterThan(0);
    expect(analysis.legalCheck.compliant).toBe(false);
  }, 60000);

  it('PROPERTY 1: Analyzer detects grammar error (double period) in headline', async () => {
    const request = {
      improvedPrompt: 'Lägenhet med balkong.',
      headline: 'Rymlig lägenhet.. Söderläge',
      socialCopy: 'Lägenhet med balkong.',
      instagramCaption: 'Lägenhet 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Lägenhet med balkong',
      disposition: {},
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    // Verify double period exists
    expect(request.headline).toContain('..');

    // BUG: Analyzer should detect grammar error but doesn't
    const analysis = await analyzer.analyze(request);
    
    // Expected behavior: Analyzer returns critical improvement for grammar error
    const grammarImprovements = analysis.improvements.filter(
      item => item.category === 'grammar' && 
              item.severity === 'critical'
    );
    
    expect(grammarImprovements.length).toBeGreaterThan(0);
  }, 60000);

  it('PROPERTY 1: Analyzer detects violations across multiple fields', async () => {
    const request = {
      improvedPrompt: 'Här erbjuds en lägenhet.',
      headline: 'Lägenhet.. Söderläge',
      socialCopy: 'Kök i nyskick.',
      instagramCaption: 'Lägenhet 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Lägenhet med balkong',
      disposition: {},
      style: 'balanced' as const,
      platform: 'hemnet'
    };

    // Verify violations exist in multiple fields
    const improvedPromptViolations = findRuleViolations(request.improvedPrompt, request.platform, request.style);
    expect(improvedPromptViolations.length).toBeGreaterThan(0);
    expect(request.headline).toContain('..');
    expect(request.socialCopy.toLowerCase()).toContain('i nyskick');

    // BUG: Analyzer should detect violations in all fields but doesn't
    const analysis = await analyzer.analyze(request);
    
    // Expected behavior: Analyzer returns critical improvements for violations in each field
    const improvedPromptImprovements = analysis.improvements.filter(
      item => item.location === 'improvedPrompt' && item.severity === 'critical'
    );
    const headlineImprovements = analysis.improvements.filter(
      item => item.location === 'headline' && item.severity === 'critical'
    );
    const socialCopyImprovements = analysis.improvements.filter(
      item => item.location === 'socialCopy' && item.severity === 'critical'
    );
    
    expect(improvedPromptImprovements.length).toBeGreaterThan(0);
    expect(headlineImprovements.length).toBeGreaterThan(0);
    expect(socialCopyImprovements.length).toBeGreaterThan(0);
    expect(analysis.legalCheck.compliant).toBe(false);
    expect(analysis.legalCheck.issues.length).toBeGreaterThan(0);
  }, 60000);
});
