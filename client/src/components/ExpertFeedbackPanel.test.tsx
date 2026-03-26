import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { ExpertFeedbackPanel } from './ExpertFeedbackPanel';

// Mock data
const mockAnalysis = {
  overallQuality: 8,
  strengths: ['Tydlig beskrivning', 'Bra struktur'],
  improvements: [
    {
      id: 'fb-1',
      issue: 'Stavfel i texten',
      location: 'Huvudtext, rad 3',
      textSpan: { start: 10, end: 20, field: 'improvedPrompt' },
      suggestion: 'Rätta stavfelet',
      category: 'grammar' as const,
      severity: 'critical' as const,
      expert: 'broker' as const,
      actionable: true,
      autoFix: 'korrekt stavning',
    },
    {
      id: 'fb-2',
      issue: 'Juridisk varning',
      location: 'Huvudtext, rad 5',
      textSpan: { start: 30, end: 40, field: 'improvedPrompt' },
      suggestion: 'Undvik absoluta påståenden',
      category: 'legal' as const,
      severity: 'critical' as const,
      expert: 'lawyer' as const,
      actionable: true,
      autoFix: 'kan potentiellt',
    },
    {
      id: 'fb-3',
      issue: 'AI-klyschigt språk',
      location: 'Rubrik',
      textSpan: { start: 0, end: 10, field: 'headline' },
      suggestion: 'Använd mer specifika beskrivningar',
      category: 'broker_realism' as const,
      severity: 'important' as const,
      expert: 'broker' as const,
      actionable: false,
    },
    {
      id: 'fb-4',
      issue: 'Stilistisk förbättring',
      location: 'Huvudtext',
      textSpan: undefined,
      suggestion: 'Variera meningsstruktur',
      category: 'style' as const,
      severity: 'suggestion' as const,
      expert: 'broker' as const,
      actionable: false,
    },
    {
      id: 'fb-5',
      issue: 'Otydlig formulering',
      location: 'Huvudtext, rad 8',
      textSpan: { start: 50, end: 60, field: 'improvedPrompt' },
      suggestion: 'Förtydliga meningen',
      category: 'clarity' as const,
      severity: 'important' as const,
      expert: 'broker' as const,
      actionable: false,
    },
  ],
  legalCheck: {
    compliant: true,
    notes: 'Texten följer riktlinjer',
    issues: [],
  },
  duration: 5000,
};

const emptyAnalysis = {
  overallQuality: 10,
  strengths: ['Perfekt text'],
  improvements: [],
  legalCheck: {
    compliant: true,
    notes: 'Inga problem',
    issues: [],
  },
  duration: 3000,
};

describe('ExpertFeedbackPanel', () => {
  it('renders feedback grouped by category', () => {
    render(<ExpertFeedbackPanel analysis={mockAnalysis} />);

    // Check that category labels are present
    expect(screen.getByText('Grammatik')).toBeInTheDocument();
    expect(screen.getByText('Juridik')).toBeInTheDocument();
    expect(screen.getByText('Mäklarrealism')).toBeInTheDocument();
    expect(screen.getByText('Stil')).toBeInTheDocument();
    expect(screen.getByText('Tydlighet')).toBeInTheDocument();
  });

  it('displays correct count per category', () => {
    render(<ExpertFeedbackPanel analysis={mockAnalysis} />);

    // Grammar: 1 item
    const grammarSection = screen.getByText('Grammatik').closest('button');
    expect(grammarSection).toHaveTextContent('1');

    // Legal: 1 item
    const legalSection = screen.getByText('Juridik').closest('button');
    expect(legalSection).toHaveTextContent('1');

    // Broker realism: 1 item
    const brokerSection = screen.getByText('Mäklarrealism').closest('button');
    expect(brokerSection).toHaveTextContent('1');

    // Style: 1 item
    const styleSection = screen.getByText('Stil').closest('button');
    expect(styleSection).toHaveTextContent('1');

    // Clarity: 1 item
    const claritySection = screen.getByText('Tydlighet').closest('button');
    expect(claritySection).toHaveTextContent('1');
  });

  it('displays total feedback count in header', () => {
    render(<ExpertFeedbackPanel analysis={mockAnalysis} />);

    expect(screen.getByText('5 förbättringar hittade')).toBeInTheDocument();
  });

  it('displays overall quality score', () => {
    render(<ExpertFeedbackPanel analysis={mockAnalysis} />);

    expect(screen.getByText('Kvalitet: 8/10')).toBeInTheDocument();
  });

  it('calls onFeedbackClick when feedback item is clicked', () => {
    const onFeedbackClick = vi.fn();
    render(
      <ExpertFeedbackPanel
        analysis={mockAnalysis}
        onFeedbackClick={onFeedbackClick}
      />
    );

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Click on feedback item
    const feedbackItem = screen.getByText('Stavfel i texten').closest('div');
    fireEvent.click(feedbackItem!);

    expect(onFeedbackClick).toHaveBeenCalledWith('fb-1');
  });

  it('shows "Fixa" button for actionable feedback', () => {
    render(
      <ExpertFeedbackPanel
        analysis={mockAnalysis}
        onFixClick={vi.fn()}
      />
    );

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Check for "Fixa" button
    const fixButtons = screen.getAllByText('Fixa');
    expect(fixButtons.length).toBeGreaterThan(0);
  });

  it('calls onFixClick when "Fixa" button is clicked', () => {
    const onFixClick = vi.fn();
    render(
      <ExpertFeedbackPanel
        analysis={mockAnalysis}
        onFixClick={onFixClick}
      />
    );

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Click "Fixa" button
    const fixButton = screen.getAllByText('Fixa')[0];
    fireEvent.click(fixButton);

    expect(onFixClick).toHaveBeenCalledWith('fb-1');
  });

  it('shows "AI-förslag" button when onAISuggestClick is provided', () => {
    render(
      <ExpertFeedbackPanel
        analysis={mockAnalysis}
        onAISuggestClick={vi.fn()}
      />
    );

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Check for "AI-förslag" button
    expect(screen.getAllByText('AI-förslag').length).toBeGreaterThan(0);
  });

  it('calls onAISuggestClick when "AI-förslag" button is clicked', () => {
    const onAISuggestClick = vi.fn();
    render(
      <ExpertFeedbackPanel
        analysis={mockAnalysis}
        onAISuggestClick={onAISuggestClick}
      />
    );

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Click "AI-förslag" button
    const aiButton = screen.getAllByText('AI-förslag')[0];
    fireEvent.click(aiButton);

    expect(onAISuggestClick).toHaveBeenCalledWith('fb-1');
  });

  it('shows dismiss button when onDismissClick is provided', () => {
    render(
      <ExpertFeedbackPanel
        analysis={mockAnalysis}
        onDismissClick={vi.fn()}
      />
    );

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Check for dismiss buttons (X icons)
    const dismissButtons = screen.getAllByRole('button').filter(
      button => button.querySelector('svg')?.classList.contains('lucide-x')
    );
    expect(dismissButtons.length).toBeGreaterThan(0);
  });

  it('calls onDismissClick when dismiss button is clicked', () => {
    const onDismissClick = vi.fn();
    render(
      <ExpertFeedbackPanel
        analysis={mockAnalysis}
        onDismissClick={onDismissClick}
      />
    );

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Find and click dismiss button
    const dismissButtons = screen.getAllByRole('button').filter(
      button => button.querySelector('svg')?.classList.contains('lucide-x')
    );
    fireEvent.click(dismissButtons[0]);

    expect(onDismissClick).toHaveBeenCalledWith('fb-1');
  });

  it('displays severity level for each feedback item', () => {
    render(<ExpertFeedbackPanel analysis={mockAnalysis} />);

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Check for severity label
    expect(screen.getByText('KRITISK')).toBeInTheDocument();
  });

  it('displays expert attribution for each feedback item', () => {
    render(<ExpertFeedbackPanel analysis={mockAnalysis} />);

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Check for expert label
    expect(screen.getByText('Mäklare')).toBeInTheDocument();

    // Expand legal category
    const legalTrigger = screen.getByText('Juridik').closest('button');
    fireEvent.click(legalTrigger!);

    // Check for lawyer label
    expect(screen.getByText('Jurist')).toBeInTheDocument();
  });

  it('displays auto-fix preview when available', () => {
    render(<ExpertFeedbackPanel analysis={mockAnalysis} />);

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Check for auto-fix section
    expect(screen.getByText('Automatisk fix')).toBeInTheDocument();
    expect(screen.getByText('"korrekt stavning"')).toBeInTheDocument();
  });

  it('displays legal check status in footer', () => {
    render(<ExpertFeedbackPanel analysis={mockAnalysis} />);

    expect(screen.getByText(/Juridisk kontroll:/)).toBeInTheDocument();
    expect(screen.getByText(/✓ Godkänd/)).toBeInTheDocument();
  });

  it('shows empty state when no feedback items', () => {
    render(<ExpertFeedbackPanel analysis={emptyAnalysis} />);

    expect(screen.getByText('Inga förbättringsförslag')).toBeInTheDocument();
    expect(screen.getByText(/Texten ser bra ut!/)).toBeInTheDocument();
  });

  it('does not render categories with zero items', () => {
    const singleCategoryAnalysis = {
      ...mockAnalysis,
      improvements: [mockAnalysis.improvements[0]], // Only grammar item
    };

    render(<ExpertFeedbackPanel analysis={singleCategoryAnalysis} />);

    // Grammar should be present
    expect(screen.getByText('Grammatik')).toBeInTheDocument();

    // Other categories should not be rendered (no accordion items for them)
    const accordionItems = screen.getAllByRole('button').filter(
      button => button.getAttribute('data-state') !== null
    );
    expect(accordionItems.length).toBe(1); // Only grammar category
  });

  it('sorts feedback by severity within each category', () => {
    const multiSeverityAnalysis = {
      ...mockAnalysis,
      improvements: [
        {
          id: 'fb-1',
          issue: 'Suggestion issue',
          location: 'Text',
          suggestion: 'Fix it',
          category: 'grammar' as const,
          severity: 'suggestion' as const,
          expert: 'broker' as const,
          actionable: false,
        },
        {
          id: 'fb-2',
          issue: 'Critical issue',
          location: 'Text',
          suggestion: 'Fix it now',
          category: 'grammar' as const,
          severity: 'critical' as const,
          expert: 'broker' as const,
          actionable: true,
        },
        {
          id: 'fb-3',
          issue: 'Important issue',
          location: 'Text',
          suggestion: 'Fix it soon',
          category: 'grammar' as const,
          severity: 'important' as const,
          expert: 'broker' as const,
          actionable: false,
        },
      ],
    };

    render(<ExpertFeedbackPanel analysis={multiSeverityAnalysis} />);

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Get all feedback items
    const issues = screen.getAllByText(/issue/);

    // Critical should come first, then important, then suggestion
    expect(issues[0]).toHaveTextContent('Critical issue');
    expect(issues[1]).toHaveTextContent('Important issue');
    expect(issues[2]).toHaveTextContent('Suggestion issue');
  });

  it('prevents event propagation when clicking action buttons', () => {
    const onFeedbackClick = vi.fn();
    const onFixClick = vi.fn();

    render(
      <ExpertFeedbackPanel
        analysis={mockAnalysis}
        onFeedbackClick={onFeedbackClick}
        onFixClick={onFixClick}
      />
    );

    // Expand grammar category
    const grammarTrigger = screen.getByText('Grammatik').closest('button');
    fireEvent.click(grammarTrigger!);

    // Click "Fixa" button
    const fixButton = screen.getAllByText('Fixa')[0];
    fireEvent.click(fixButton);

    // onFixClick should be called
    expect(onFixClick).toHaveBeenCalledWith('fb-1');

    // onFeedbackClick should NOT be called (event propagation stopped)
    expect(onFeedbackClick).not.toHaveBeenCalled();
  });
});
