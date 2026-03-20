import OpenAI from 'openai';
import { WritingStyle } from './text-rules';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface AnalysisRequest {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  disposition: any;
  style: WritingStyle;
  platform: string;
}

export interface ExpertAnalysis {
  overallQuality: number; // 0-10
  strengths: string[];
  improvements: FeedbackItem[];
  legalCheck: LegalCheck;
  duration: number;
}

export interface FeedbackItem {
  id: string;
  issue: string;
  location: string; // Human-readable location
  textSpan?: { start: number; end: number; field: string };
  suggestion: string;
  category: 'grammar' | 'style' | 'legal' | 'broker_realism' | 'clarity';
  severity: 'critical' | 'important' | 'suggestion';
  expert: 'broker' | 'lawyer';
  actionable: boolean;
  autoFix?: string; // Exact replacement text if actionable
}

export interface LegalCheck {
  compliant: boolean;
  notes: string;
  issues: string[];
}

export class ExpertAIAnalyzer {
  async analyze(request: AnalysisRequest): Promise<ExpertAnalysis> {
    const startTime = Date.now();

    try {
      // Build the analysis prompt
      const prompt = this.buildAnalysisPrompt(request);

      // Call OpenAI GPT-5.2 with reasoning:low for speed
      const completion = await this.callOpenAI(prompt);

      // Parse and validate the analysis result
      const analysis = this.parseAnalysisResult(completion);

      // Identify text spans for feedback items
      const analysisWithSpans = this.identifyTextSpans(request, analysis);

      // Generate auto-fixes for actionable feedback
      const analysisWithFixes = this.generateAutoFixes(analysisWithSpans);

      const duration = Date.now() - startTime;

      return {
        ...analysisWithFixes,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('Expert analysis failed:', {
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      // Return graceful degradation - no analysis
      throw error;
    }
  }

  private buildAnalysisPrompt(request: AnalysisRequest): string {
    const { improvedPrompt, headline, socialCopy, style, platform } = request;

    return `Du är en senior svensk mäklare OCH jurist med 20 års erfarenhet. Din uppgift är att analysera mäklartexter och ge konstruktiv, professionell feedback.

## DIN EXPERTIS

### 1. MÄKLARPROSA (Broker Perspective)
- Du känner igen naturligt vs AI-genererat språk
- Du vet vad som säljer vs vad som är generiskt
- Du förstår målgrupper och tonalitet
- Du identifierar upprepningar och svaga formuleringar

### 2. JURIDIK (Lawyer Perspective)
- Du känner till mäklarregler och konsumentskydd
- Du identifierar vilseledande påståenden
- Du säkerställer faktakorrekthet
- Du kontrollerar att texten följer branschregler

### 3. PEDAGOGIK (Teaching Approach)
- Du ger KONKRETA förslag (inte vaga)
- Du förklarar VARFÖR något är bra/dåligt
- Du är KONSTRUKTIV (inte bara kritisk)
- Du prioriterar de viktigaste förbättringarna

## TEXTEN ATT ANALYSERA

**Rubrik:** ${headline}

**Huvudtext:**
${improvedPrompt}

**Social media:**
${socialCopy}

**Stil:** ${style}
**Plattform:** ${platform}

## DIN ANALYSPROCESS

### STEG 1: LÄS TEXTEN
Läs hela texten noggrant. Notera:
- Vad är BRA? (minst 3 konkreta styrkor)
- Vad kan FÖRBÄTTRAS? (konkreta problem med lösningar)
- Finns JURIDISKA problem? (vilseledande, felaktigt, olämpligt)

### STEG 2: IDENTIFIERA STYRKOR
Lista 3-5 konkreta styrkor. Exempel:
✓ "Stark öppning med konkret USP"
✓ "Naturligt mäklarspråk utan AI-klyschor"
✓ "Bra balans mellan fakta och säljande ton"

### STEG 3: IDENTIFIERA FÖRBÄTTRINGSOMRÅDEN
För varje problem, ge:
- VAD är problemet? (konkret beskrivning)
- VAR finns det? (exakt plats: stycke, mening)
- HUR fixar man det? (konkret förslag)
- Hur ALLVARLIGT är det? (critical/important/suggestion)

### STEG 4: JURIDISK KONTROLL
Kontrollera:
- Finns vilseledande påståenden?
- Är fakta korrekt presenterade?
- Följer texten mäklarregler?

## OUTPUT FORMAT

Svara ENDAST med JSON i denna exakta struktur:

{
  "overallQuality": 8.5,
  "strengths": [
    "Konkret styrka 1",
    "Konkret styrka 2",
    "Konkret styrka 3"
  ],
  "improvements": [
    {
      "issue": "Konkret problem",
      "location": "Exakt var (stycke X, mening Y)",
      "suggestion": "Konkret förslag hur man fixar",
      "category": "grammar|style|legal|broker_realism|clarity",
      "severity": "critical|important|suggestion",
      "expert": "broker|lawyer"
    }
  ],
  "legalCheck": {
    "compliant": true,
    "notes": "Eventuella juridiska noteringar",
    "issues": []
  }
}

## KATEGORIER
- **grammar**: Grammatiska fel, stavfel, interpunktion
- **style**: Språklig stil, tonalitet, ordval
- **legal**: Juridiska problem, vilseledande påståenden
- **broker_realism**: AI-klyschor, onaturligt språk
- **clarity**: Otydlighet, upprepningar, struktur

## SEVERITY LEVELS
- **critical**: Måste fixas (grammatikfel, juridiska problem)
- **important**: Bör fixas (AI-klyschor, upprepningar)
- **suggestion**: Kan förbättras (mindre stilfrågor)`;
  }

  private async callOpenAI(prompt: string): Promise<OpenAI.ChatCompletion> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4', // Will be updated to gpt-5.2 when available
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        top_p: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        timeout: 10000 // 10 second timeout
      });

      return completion;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error in analysis: ${error.message}`);
      }
      throw error;
    }
  }

  private parseAnalysisResult(completion: OpenAI.ChatCompletion): Omit<ExpertAnalysis, 'duration'> {
    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI analysis response');
    }

    try {
      const parsed = JSON.parse(content);

      // Validate structure
      this.validateAnalysisStructure(parsed);

      // Add IDs to feedback items and set actionable flag
      const improvements: FeedbackItem[] = (parsed.improvements || []).map((item: any) => ({
        id: uuidv4(),
        issue: item.issue || '',
        location: item.location || 'General',
        suggestion: item.suggestion || '',
        category: item.category || 'clarity',
        severity: item.severity || 'suggestion',
        expert: item.expert || 'broker',
        actionable: false, // Will be determined later
        textSpan: undefined,
        autoFix: undefined
      }));

      return {
        overallQuality: parsed.overallQuality || 7.0,
        strengths: parsed.strengths || [],
        improvements,
        legalCheck: {
          compliant: parsed.legalCheck?.compliant ?? true,
          notes: parsed.legalCheck?.notes || '',
          issues: parsed.legalCheck?.issues || []
        }
      };
    } catch (error) {
      console.error('Failed to parse analysis response:', content);
      throw new Error('Invalid JSON response from analysis');
    }
  }

  private validateAnalysisStructure(analysis: any): void {
    if (typeof analysis.overallQuality !== 'number') {
      throw new Error('Missing or invalid overallQuality');
    }

    if (!Array.isArray(analysis.strengths)) {
      throw new Error('Missing or invalid strengths array');
    }

    if (!Array.isArray(analysis.improvements)) {
      throw new Error('Missing or invalid improvements array');
    }

    // Validate each improvement
    for (const item of analysis.improvements) {
      const validCategories = ['grammar', 'style', 'legal', 'broker_realism', 'clarity'];
      const validSeverities = ['critical', 'important', 'suggestion'];
      const validExperts = ['broker', 'lawyer'];

      if (!validCategories.includes(item.category)) {
        throw new Error(`Invalid category: ${item.category}`);
      }

      if (!validSeverities.includes(item.severity)) {
        throw new Error(`Invalid severity: ${item.severity}`);
      }

      if (!validExperts.includes(item.expert)) {
        throw new Error(`Invalid expert: ${item.expert}`);
      }
    }
  }

  private identifyTextSpans(
    request: AnalysisRequest,
    analysis: Omit<ExpertAnalysis, 'duration'>
  ): Omit<ExpertAnalysis, 'duration'> {
    const { improvedPrompt, headline, socialCopy } = request;
    const texts = {
      improvedPrompt,
      headline,
      socialCopy
    };

    const improvementsWithSpans = analysis.improvements.map(item => {
      // Try to find the text span for location-specific feedback
      if (item.location !== 'General') {
        // Extract keywords from the issue to search for
        const keywords = this.extractKeywords(item.issue);
        
        for (const [field, text] of Object.entries(texts)) {
          for (const keyword of keywords) {
            const index = text.toLowerCase().indexOf(keyword.toLowerCase());
            if (index !== -1) {
              return {
                ...item,
                textSpan: {
                  start: index,
                  end: index + keyword.length,
                  field: field as 'improvedPrompt' | 'headline' | 'socialCopy'
                }
              };
            }
          }
        }
      }

      return item;
    });

    return {
      ...analysis,
      improvements: improvementsWithSpans
    };
  }

  private extractKeywords(issue: string): string[] {
    // Extract quoted text or key phrases from the issue description
    const quotedMatches = issue.match(/"([^"]+)"/g);
    if (quotedMatches) {
      return quotedMatches.map(m => m.replace(/"/g, ''));
    }

    // Extract words longer than 4 characters as potential keywords
    const words = issue.split(/\s+/).filter(w => w.length > 4);
    return words.slice(0, 3); // Take first 3 significant words
  }

  private generateAutoFixes(
    analysis: Omit<ExpertAnalysis, 'duration'>
  ): Omit<ExpertAnalysis, 'duration'> {
    const improvementsWithFixes = analysis.improvements.map(item => {
      // Only generate auto-fixes for items with text spans and specific categories
      if (item.textSpan && ['grammar', 'style', 'clarity'].includes(item.category)) {
        // Try to extract a concrete replacement from the suggestion
        const autoFix = this.extractAutoFix(item.suggestion);
        
        if (autoFix) {
          return {
            ...item,
            actionable: true,
            autoFix
          };
        }
      }

      return item;
    });

    return {
      ...analysis,
      improvements: improvementsWithFixes
    };
  }

  private extractAutoFix(suggestion: string): string | undefined {
    // Look for patterns like "ersätt X med Y" or "ändra till Y"
    const replacePatterns = [
      /ersätt.*?med\s+"([^"]+)"/i,
      /ändra till\s+"([^"]+)"/i,
      /använd\s+"([^"]+)"/i,
      /skriv\s+"([^"]+)"/i
    ];

    for (const pattern of replacePatterns) {
      const match = suggestion.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }
}
