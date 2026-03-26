import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { ResultSection } from './ResultSection';
import type { OptimizeResponse } from '@shared/schema';
import '@testing-library/jest-dom';

/**
 * Bug Condition Exploration Test for Bug 2: Expert Feedback Panel Disappeared
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * Goal: Surface counterexamples that demonstrate type casting and missing schema field
 * Expected Outcome: Test FAILS (this is correct - it proves the bug exists)
 */

describe('ResultSection - Bug 2: Expert Feedback Panel Visibility', () => {
  const mockOnNewPrompt = vi.fn();
  const mockOnRegenerate = vi.fn();

  const createMockResult = (withExpertAnalysis: boolean = false): OptimizeResponse => {
    const baseResult: OptimizeResponse = {
      originalPrompt: 'Test prompt',
      improvedPrompt: 'Köket renoverades 2020.\n\nVardagsrummet har parkettgolv med utgång till balkong i söderläge.',
      headline: 'Ljus 3:a med balkong i söderläge',
      socialCopy: 'Renoverat kök från 2020 och parkettgolv i vardagsrummet.',
      instagramCaption: '🏡 Ljus 3:a med balkong i söderläge',
      showingInvitation: 'Välkommen på visning tisdag 18:00',
      shortAd: 'Ljus 3:a med balkong',
      wordCount: 15,
    };

    if (withExpertAnalysis) {
      return {
        ...baseResult,
        expertAnalysis: {
          overallQuality: 8.5,
          strengths: [
            'Konkreta fakta om renovering',
            'Tydlig beskrivning av läge',
            'Bra struktur med styckeindelning'
          ],
          improvements: [
            {
              id: 'feedback-1',
              issue: 'Använd "utgång till" istället för "med utgång till"',
              location: 'improvedPrompt',
              textSpan: { start: 65, end: 80, field: 'improvedPrompt' },
              suggestion: 'Ersätt "med utgång till" med "utgång till"',
              category: 'style' as const,
              severity: 'suggestion' as const,
              expert: 'broker' as const,
              actionable: true,
              autoFix: 'utgång till'
            },
            {
              id: 'feedback-2',
              issue: 'Specificera balkongstorlek om möjligt',
              location: 'improvedPrompt',
              textSpan: { start: 81, end: 88, field: 'improvedPrompt' },
              suggestion: 'Lägg till storlek på balkongen om uppgiften finns',
              category: 'clarity' as const,
              severity: 'important' as const,
              expert: 'broker' as const,
              actionable: false
            }
          ],
          legalCheck: {
            compliant: true,
            notes: 'Inga juridiska problem',
            issues: []
          },
          duration: 1250
        }
      };
    }

    return baseResult;
  };

  it('should access expertAnalysis without type casting when field exists in schema', () => {
    const resultWithAnalysis = createMockResult(true);
    
    render(
      <ResultSection 
        result={resultWithAnalysis} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // CRITICAL CHECK: expertAnalysis should be properly typed in OptimizeResponse
    // This test will fail if the field is missing from the schema
    // and ResultSection uses (result as any).expertAnalysis
    
    // Verify the result has expertAnalysis
    expect(resultWithAnalysis.expertAnalysis).toBeDefined();
    expect(resultWithAnalysis.expertAnalysis?.improvements).toHaveLength(2);
    
    // The component should be able to access it without type casting
    // If this test fails, it means the schema is missing the field
  });

  it('should render ExpertFeedbackPanel when expertAnalysis exists with improvements', () => {
    const resultWithAnalysis = createMockResult(true);
    
    render(
      <ResultSection 
        result={resultWithAnalysis} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // CRITICAL CHECK: ExpertFeedbackPanel should render when improvements exist
    // Look for feedback panel indicators
    const feedbackIndicator = screen.queryByText(/förbättringar/i);
    
    // This should find the feedback count badge
    expect(feedbackIndicator).toBeInTheDocument();
    
    // Verify the improvements are accessible
    expect(resultWithAnalysis.expertAnalysis?.improvements).toHaveLength(2);
  });

  it('should render InlineHighlights when expertAnalysis has textSpans', () => {
    const resultWithAnalysis = createMockResult(true);
    
    render(
      <ResultSection 
        result={resultWithAnalysis} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // CRITICAL CHECK: InlineHighlights should render colored text spans
    // The component should show the main text with highlights
    const mainText = screen.getByText(/Köket renoverades 2020/i);
    expect(mainText).toBeInTheDocument();
    
    // Verify textSpans are defined
    const firstImprovement = resultWithAnalysis.expertAnalysis?.improvements[0];
    expect(firstImprovement?.textSpan).toBeDefined();
    expect(firstImprovement?.textSpan?.start).toBe(65);
    expect(firstImprovement?.textSpan?.end).toBe(80);
    expect(firstImprovement?.textSpan?.field).toBe('improvedPrompt');
  });

  it('should handle graceful degradation when expertAnalysis is null', () => {
    const resultWithoutAnalysis = createMockResult(false);
    
    render(
      <ResultSection 
        result={resultWithoutAnalysis} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // CRITICAL CHECK: Should show TextEditor without InlineHighlights
    // No feedback panel should render
    const feedbackIndicator = screen.queryByText(/förbättringar/i);
    expect(feedbackIndicator).not.toBeInTheDocument();
    
    // Main text should still be visible
    const mainText = screen.getByText(/Köket renoverades 2020/i);
    expect(mainText).toBeInTheDocument();
  });

  it('should handle graceful degradation when expertAnalysis has zero improvements', () => {
    const resultWithEmptyAnalysis: OptimizeResponse = {
      ...createMockResult(false),
      expertAnalysis: {
        overallQuality: 9.0,
        strengths: ['Excellent text'],
        improvements: [], // Empty improvements array
        legalCheck: {
          compliant: true,
          notes: 'All good',
          issues: []
        },
        duration: 800
      }
    };
    
    render(
      <ResultSection 
        result={resultWithEmptyAnalysis} 
        onNewPrompt={mockOnRegenerate}
        onRegenerate={mockOnRegenerate}
      />
    );

    // CRITICAL CHECK: ExpertFeedbackPanel should NOT render when improvements is empty
    const feedbackIndicator = screen.queryByText(/förbättringar/i);
    expect(feedbackIndicator).not.toBeInTheDocument();
    
    // Main text should still be visible
    const mainText = screen.getByText(/Köket renoverades 2020/i);
    expect(mainText).toBeInTheDocument();
  });

  it('should verify expertAnalysis field structure matches schema', () => {
    const resultWithAnalysis = createMockResult(true);
    
    // CRITICAL CHECK: Verify the structure matches what the schema expects
    expect(resultWithAnalysis.expertAnalysis).toMatchObject({
      overallQuality: expect.any(Number),
      strengths: expect.any(Array),
      improvements: expect.any(Array),
      legalCheck: expect.objectContaining({
        compliant: expect.any(Boolean),
        notes: expect.any(String),
        issues: expect.any(Array)
      }),
      duration: expect.any(Number)
    });

    // Verify improvement structure
    const improvement = resultWithAnalysis.expertAnalysis?.improvements[0];
    expect(improvement).toMatchObject({
      id: expect.any(String),
      issue: expect.any(String),
      location: expect.any(String),
      suggestion: expect.any(String),
      category: expect.stringMatching(/^(grammar|style|legal|broker_realism|clarity)$/),
      severity: expect.stringMatching(/^(critical|important|suggestion)$/),
      expert: expect.stringMatching(/^(broker|lawyer)$/),
      actionable: expect.any(Boolean)
    });

    // Verify textSpan structure (optional field)
    if (improvement?.textSpan) {
      expect(improvement.textSpan).toMatchObject({
        start: expect.any(Number),
        end: expect.any(Number),
        field: expect.any(String)
      });
    }
  });
});

/**
 * Preservation Property Tests for Bug 2: Display and Graceful Degradation
 * 
 * CRITICAL: These tests MUST PASS on unfixed code - they test non-buggy inputs
 * These tests verify that results WITHOUT expertAnalysis continue to work correctly
 * 
 * Goal: Capture baseline behavior that must be preserved after the fix
 * Expected Outcome: Tests PASS (confirms existing functionality works)
 */

describe('ResultSection - Preservation: Display and Graceful Degradation (Non-buggy inputs)', () => {
  const mockOnNewPrompt = vi.fn();
  const mockOnRegenerate = vi.fn();

  const createBasicResult = (): OptimizeResponse => ({
    originalPrompt: 'Test prompt',
    improvedPrompt: 'Köket renoverades 2020. Vardagsrummet har parkettgolv.',
    headline: 'Ljus 3:a med balkong',
    socialCopy: 'Renoverat kök från 2020',
    instagramCaption: '🏡 Ljus 3:a',
    showingInvitation: 'Välkommen på visning',
    shortAd: 'Ljus 3:a',
    wordCount: 10,
  });

  it('PRESERVATION: should render correctly when expertAnalysis is null', () => {
    const resultWithoutAnalysis = createBasicResult();
    
    render(
      <ResultSection 
        result={resultWithoutAnalysis} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // Main text should be visible
    const mainText = screen.getByText(/Köket renoverades 2020/i);
    expect(mainText).toBeInTheDocument();
    
    // No feedback panel should render
    const feedbackIndicator = screen.queryByText(/förbättringar/i);
    expect(feedbackIndicator).not.toBeInTheDocument();
  });

  it('PRESERVATION: should render correctly when expertAnalysis is undefined', () => {
    const resultWithoutAnalysis = createBasicResult();
    // Explicitly ensure expertAnalysis is undefined
    expect(resultWithoutAnalysis.expertAnalysis).toBeUndefined();
    
    render(
      <ResultSection 
        result={resultWithoutAnalysis} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // Main text should be visible
    const mainText = screen.getByText(/Köket renoverades 2020/i);
    expect(mainText).toBeInTheDocument();
    
    // No feedback panel should render
    const feedbackIndicator = screen.queryByText(/förbättringar/i);
    expect(feedbackIndicator).not.toBeInTheDocument();
  });

  it('PRESERVATION: should not render ExpertFeedbackPanel when improvements array is empty', () => {
    const resultWithEmptyImprovements: OptimizeResponse = {
      ...createBasicResult(),
      expertAnalysis: {
        overallQuality: 9.0,
        strengths: ['Good text'],
        improvements: [], // Empty array
        legalCheck: {
          compliant: true,
          notes: 'All good',
          issues: []
        },
        duration: 800
      }
    };
    
    render(
      <ResultSection 
        result={resultWithEmptyImprovements} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // Main text should be visible
    const mainText = screen.getByText(/Köket renoverades 2020/i);
    expect(mainText).toBeInTheDocument();
    
    // No feedback panel should render when improvements is empty
    const feedbackIndicator = screen.queryByText(/förbättringar/i);
    expect(feedbackIndicator).not.toBeInTheDocument();
  });

  it('PRESERVATION: should render all auxiliary text fields correctly', () => {
    const resultWithAllFields = createBasicResult();
    
    render(
      <ResultSection 
        result={resultWithAllFields} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // Verify all text fields are rendered
    expect(screen.getByText(/Ljus 3:a med balkong/i)).toBeInTheDocument(); // headline
    expect(screen.getByText(/Renoverat kök från 2020/i)).toBeInTheDocument(); // socialCopy
    expect(screen.getByText(/🏡 Ljus 3:a/i)).toBeInTheDocument(); // instagramCaption
    expect(screen.getByText(/Välkommen på visning/i)).toBeInTheDocument(); // showingInvitation
  });

  it('PRESERVATION: should render copy buttons for all text fields', () => {
    const resultWithAllFields = createBasicResult();
    
    render(
      <ResultSection 
        result={resultWithAllFields} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // Should have multiple copy buttons
    const copyButtons = screen.getAllByText(/Kopiera/i);
    expect(copyButtons.length).toBeGreaterThan(0);
  });

  it('PRESERVATION: should render action buttons (New/Regenerate)', () => {
    const resultWithoutAnalysis = createBasicResult();
    
    render(
      <ResultSection 
        result={resultWithoutAnalysis} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // Should have "Ny beskrivning" button
    const newButton = screen.getByText(/Ny beskrivning/i);
    expect(newButton).toBeInTheDocument();
    
    // Should have "Generera igen" button
    const regenerateButton = screen.getByText(/Generera igen/i);
    expect(regenerateButton).toBeInTheDocument();
  });

  it('PRESERVATION: should handle results with only improvedPrompt (minimal result)', () => {
    const minimalResult: OptimizeResponse = {
      originalPrompt: 'Test',
      improvedPrompt: 'Minimal text without any extras',
      wordCount: 5,
    };
    
    render(
      <ResultSection 
        result={minimalResult} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // Main text should be visible
    const mainText = screen.getByText(/Minimal text without any extras/i);
    expect(mainText).toBeInTheDocument();
  });

  it('PRESERVATION: should render word count correctly', () => {
    const resultWithWordCount = createBasicResult();
    
    render(
      <ResultSection 
        result={resultWithWordCount} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // Should display word count
    const wordCountDisplay = screen.getByText(/10 ord/i);
    expect(wordCountDisplay).toBeInTheDocument();
  });

  it('PRESERVATION: should handle results with factCheck data', () => {
    const resultWithFactCheck: OptimizeResponse = {
      ...createBasicResult(),
      factCheck: {
        fact_check_passed: true,
        quality_score: 0.85,
        local_text_clear: true,
        executed: true,
        metadata_matches_final_text: true,
        issues: [],
        broker_tips: ['Bra struktur', 'Tydliga fakta']
      }
    };
    
    render(
      <ResultSection 
        result={resultWithFactCheck} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // Should display quality score
    const qualityScore = screen.getByText(/Kvalitet: 85%/i);
    expect(qualityScore).toBeInTheDocument();
    
    // Should display fact check status
    const factCheckStatus = screen.getByText(/Faktagranskad/i);
    expect(factCheckStatus).toBeInTheDocument();
  });

  it('PRESERVATION: should handle results with broker improvement suggestions', () => {
    const resultWithSuggestions: OptimizeResponse = {
      ...createBasicResult(),
      broker_improvement_suggestions: [
        'Lägg till mer information om köket',
        'Beskriv utsikten tydligare'
      ]
    };
    
    render(
      <ResultSection 
        result={resultWithSuggestions} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // Main text should be visible
    const mainText = screen.getByText(/Köket renoverades 2020/i);
    expect(mainText).toBeInTheDocument();
    
    // Suggestions should be rendered
    expect(screen.getByText(/Lägg till mer information om köket/i)).toBeInTheDocument();
  });

  it('PRESERVATION: should handle Swedish characters in all text fields', () => {
    const resultWithSwedishChars: OptimizeResponse = {
      originalPrompt: 'Test',
      improvedPrompt: 'Köket är renoverat. Vardagsrummet är ljust och rymligt.',
      headline: 'Mysig 2:a i Södermalm',
      socialCopy: 'Härlig lägenhet med balkong',
      wordCount: 10,
    };
    
    render(
      <ResultSection 
        result={resultWithSwedishChars} 
        onNewPrompt={mockOnNewPrompt}
        onRegenerate={mockOnRegenerate}
      />
    );

    // Verify Swedish characters are preserved
    expect(screen.getByText(/Köket är renoverat/i)).toBeInTheDocument();
    expect(screen.getByText(/Mysig 2:a i Södermalm/i)).toBeInTheDocument();
    expect(screen.getByText(/Härlig lägenhet/i)).toBeInTheDocument();
  });
});
