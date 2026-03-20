/**
 * INTEGRATION EXAMPLE: How to use InlineHighlights in ResultSection
 * 
 * This file demonstrates how to integrate the InlineHighlights component
 * with the existing ResultSection to display expert feedback inline.
 */

import { InlineHighlights } from './InlineHighlights';
import { TextEditor } from './TextEditor';

// Example: Mock expert analysis data structure
const mockExpertAnalysis = {
  overallQuality: 8.5,
  strengths: [
    'Tydlig struktur med logiskt flöde',
    'Konkreta mått och fakta',
  ],
  improvements: [
    {
      id: 'fb-1',
      issue: 'Använder AI-klyschorna "generöst" utan konkret mått',
      location: 'Köksbeskrivning, första meningen',
      textSpan: { start: 45, end: 62, field: 'improvedPrompt' },
      suggestion: 'Ersätt "generöst kök" med faktisk storlek, t.ex. "kök om 15 kvm"',
      category: 'broker_realism' as const,
      severity: 'important' as const,
      expert: 'broker' as const,
      actionable: true,
      autoFix: 'kök om 15 kvm',
    },
    {
      id: 'fb-2',
      issue: 'Saknar punkt mellan meningar',
      location: 'Vardagsrum, andra stycket',
      textSpan: { start: 120, end: 135, field: 'improvedPrompt' },
      suggestion: 'Lägg till punkt efter "beroende"',
      category: 'grammar' as const,
      severity: 'critical' as const,
      expert: 'broker' as const,
      actionable: true,
      autoFix: 'beroende. Köket',
    },
    {
      id: 'fb-3',
      issue: 'Juridiskt tveksam formulering om avgift',
      location: 'Avgiftsinformation',
      textSpan: { start: 200, end: 230, field: 'improvedPrompt' },
      suggestion: 'Specificera vad som ingår i avgiften',
      category: 'legal' as const,
      severity: 'critical' as const,
      expert: 'lawyer' as const,
      actionable: false,
    },
  ],
  legalCheck: {
    compliant: false,
    notes: 'En juridisk anmärkning hittades',
    issues: ['Avgiftsinformation behöver förtydligas'],
  },
  duration: 6500,
};

// Example: Integration with TextEditor
export function ResultSectionWithInlineHighlights() {
  const [editedText, setEditedText] = useState(
    'Välkommen till denna charmiga lägenhet med generöst kök och ljust vardagsrum beroende Köket har moderna vitvaror. Månadsavgiften är 3500 kr och inkluderar det mesta.'
  );

  const handleFixClick = (feedbackId: string) => {
    const feedback = mockExpertAnalysis.improvements.find(f => f.id === feedbackId);
    if (!feedback || !feedback.autoFix || !feedback.textSpan) return;

    // Apply the fix
    const { start, end } = feedback.textSpan;
    const newText = editedText.slice(0, start) + feedback.autoFix + editedText.slice(end);
    setEditedText(newText);

    // Remove the feedback item from the list (in real implementation)
    console.log(`Applied fix for ${feedbackId}`);
  };

  return (
    <div className="space-y-4">
      {/* Display text with inline highlights */}
      <div className="rounded-xl border p-6" style={{ background: '#FFFFFF', borderColor: '#E8E5DE' }}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#1D2939' }}>
            Objektbeskrivning med expertfeedback
          </h3>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            Håll muspekaren över markerad text för att se förbättringsförslag
          </p>
        </div>

        {/* Render text with highlights */}
        <div className="text-base leading-relaxed" style={{ fontFamily: "'Lora', Georgia, serif", color: '#1D2939' }}>
          <InlineHighlights
            text={editedText}
            feedback={mockExpertAnalysis.improvements}
            field="improvedPrompt"
            onFixClick={handleFixClick}
            onTextChange={setEditedText}
          />
        </div>
      </div>

      {/* Alternative: Integration with TextEditor for editable version */}
      <div className="rounded-xl border p-6" style={{ background: '#F8F6F1', borderColor: '#E8E5DE' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#1D2939' }}>
          Redigerbar version med AI-hjälp
        </h3>
        
        {/* Note: TextEditor already has its own editing capabilities */}
        {/* InlineHighlights would be overlaid on top of the editor content */}
        <TextEditor text={editedText} onTextChange={setEditedText} />
      </div>

      {/* Feedback summary */}
      <div className="rounded-xl border p-5" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
        <h4 className="text-xs font-semibold mb-3" style={{ color: '#92400E' }}>
          Expertfeedback ({mockExpertAnalysis.improvements.length} förbättringar)
        </h4>
        <div className="space-y-2">
          {mockExpertAnalysis.improvements.map(fb => (
            <div key={fb.id} className="text-xs flex items-start gap-2" style={{ color: '#78350F' }}>
              <span className="font-semibold">{fb.category}:</span>
              <span>{fb.issue}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * INTEGRATION STEPS:
 * 
 * 1. Add expertAnalysis to OptimizeResponse schema in shared/schema.ts:
 *    ```typescript
 *    expertAnalysis: z.object({
 *      overallQuality: z.number(),
 *      strengths: z.array(z.string()),
 *      improvements: z.array(z.object({
 *        id: z.string(),
 *        issue: z.string(),
 *        location: z.string(),
 *        textSpan: z.object({
 *          start: z.number(),
 *          end: z.number(),
 *          field: z.string(),
 *        }).optional(),
 *        suggestion: z.string(),
 *        category: z.enum(['grammar', 'style', 'legal', 'broker_realism', 'clarity']),
 *        severity: z.enum(['critical', 'important', 'suggestion']),
 *        expert: z.enum(['broker', 'lawyer']),
 *        actionable: z.boolean(),
 *        autoFix: z.string().optional(),
 *      })),
 *      legalCheck: z.object({
 *        compliant: z.boolean(),
 *        notes: z.string(),
 *        issues: z.array(z.string()),
 *      }),
 *      duration: z.number(),
 *    }).optional(),
 *    ```
 * 
 * 2. Update ResultSection.tsx to use InlineHighlights:
 *    - Import InlineHighlights component
 *    - Replace plain text rendering with InlineHighlights
 *    - Pass result.expertAnalysis?.improvements as feedback prop
 *    - Implement handleFixClick to apply automatic fixes
 * 
 * 3. Handle real-time updates:
 *    - When text is edited, recalculate text span positions
 *    - Update feedback list to remove resolved items
 *    - Synchronize with backend if needed
 * 
 * 4. Add to existing TextEditor integration:
 *    - Overlay InlineHighlights on contentEditable div
 *    - Use absolute positioning to align highlights
 *    - Update highlights on input events (debounced)
 */

// Example: Minimal integration in ResultSection
export function MinimalIntegration({ result }: { result: any }) {
  const [editedText, setEditedText] = useState(result.improvedPrompt);

  const handleFixClick = (feedbackId: string) => {
    const feedback = result.expertAnalysis?.improvements.find((f: any) => f.id === feedbackId);
    if (!feedback?.autoFix || !feedback.textSpan) return;

    const { start, end } = feedback.textSpan;
    const newText = editedText.slice(0, start) + feedback.autoFix + editedText.slice(end);
    setEditedText(newText);
  };

  return (
    <div className="text-base leading-relaxed">
      <InlineHighlights
        text={editedText}
        feedback={result.expertAnalysis?.improvements || []}
        field="improvedPrompt"
        onFixClick={handleFixClick}
      />
    </div>
  );
}
