import OpenAI from 'openai';
import { WritingStyle, FORBIDDEN_PHRASES, getExemptPhrases } from './text-rules';
import { v4 as uuidv4 } from 'uuid';

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
  location: string;
  textSpan?: { start: number; end: number; field: string };
  suggestion: string;
  category: 'grammar' | 'style' | 'legal' | 'broker_realism' | 'clarity';
  severity: 'critical' | 'important' | 'suggestion';
  expert: 'broker' | 'lawyer';
  actionable: boolean;
  autoFix?: string;
}

export interface LegalCheck {
  compliant: boolean;
  notes: string;
  issues: string[];
}

export class ExpertAIAnalyzer {
  private _openai: OpenAI | null = null;

  private get openai(): OpenAI {
    if (!this._openai) {
      this._openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });
    }
    return this._openai;
  }

  async analyze(request: AnalysisRequest): Promise<ExpertAnalysis> {
    const startTime = Date.now();

    try {
      const prompt = this.buildAnalysisPrompt(request);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        top_p: 0.8,
        max_completion_tokens: 2500,
        response_format: { type: 'json_object' },
      });

      const analysis = this.parseAnalysisResult(completion);
      const analysisWithSpans = this.identifyTextSpans(request, analysis);
      const analysisWithFixes = this.generateAutoFixes(analysisWithSpans);

      return { ...analysisWithFixes, duration: Date.now() - startTime };
    } catch (error) {
      console.error('Expert analysis failed:', {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  private buildAnalysisPrompt(request: AnalysisRequest): string {
    const { improvedPrompt, headline, socialCopy, style, platform } = request;
    const exemptPhrases = getExemptPhrases(style);
    const blockedPhrases = FORBIDDEN_PHRASES.filter(p => !exemptPhrases.has(p));
    const normalizedPlatform = platform?.toLowerCase() || 'hemnet';

    const platformRulesSection = normalizedPlatform === 'hemnet' ? `
## HEMNET-SPECIFIKA REGLER (kontrollera dessa)
- Energiklass eller energiprestanda FÅR INTE nämnas i huvudtexten (visas separat i annonsen) → severity: "critical"
- Första meningen MÅSTE leda med bostadens starkaste USP — inte bara storlek och adress → severity: "important"
- Texten FÅR INTE avslutas med emotionella fraser som "välkommen hem", "skapa minnen", "allt du behöver" → severity: "important"
- Texten ska vara faktadriven och köparrelevant utan AI-känsla` :
    normalizedPlatform === 'booli' ? `
## BOOLI-SPECIFIKA REGLER (kontrollera dessa)
- Mer berättande ton är tillåten men fakta måste förbli konkreta och verifierbara
- Energiklass kan nämnas om det är ett säljargument (t.ex. energiklass A eller B)
- Första meningen ska fånga det unika med bostaden` : `
## STRUKTURREGLER (kontrollera dessa)
- Texten ska vara löpande objektbeskrivning — inte en faktalista
- Fakta ska vara konkreta och verifierbara`;

    return `Du är en senior svensk mäklare OCH jurist med 20 års erfarenhet. Analysera dessa mäklartexter och ge konstruktiv feedback i JSON-format.

## FÖRBJUDNA FRASER (markera som "critical" om de förekommer)
${blockedPhrases.map(p => `- "${p}"`).join('\n')}
${platformRulesSection}

## TEXTEN ATT ANALYSERA

Rubrik: ${headline}

Huvudtext:
${improvedPrompt}

Social media:
${socialCopy}

Stil: ${style} | Plattform: ${platform}

## ANALYSERA

1. STYRKOR: Vad är konkret bra? (3-5 punkter)
2. FÖRBÄTTRINGAR: Konkreta problem med lösningar
   - Finns NÅGON förbjuden fras? → severity: "critical"
   - Bryter mot plattformsreglerna ovan? → severity: "critical"
   - Grammatikfel? → severity: "critical"  
   - AI-klyschor som inte är i listan? → severity: "important"
   - Stilfrågor? → severity: "suggestion"
3. JURIDIK: Vilseledande påståenden? Faktafel?

## OUTPUT FORMAT

Svara ENDAST med JSON (json format) i denna exakta struktur:

{
  "overallQuality": 8.5,
  "strengths": ["Konkret styrka 1", "Konkret styrka 2", "Konkret styrka 3"],
  "improvements": [
    {
      "issue": "Konkret problem",
      "location": "Exakt var (stycke X, mening Y)",
      "suggestion": "Konkret förslag",
      "category": "grammar|style|legal|broker_realism|clarity",
      "severity": "critical|important|suggestion",
      "expert": "broker|lawyer"
    }
  ],
  "legalCheck": {
    "compliant": true,
    "notes": "Eventuella noteringar",
    "issues": []
  }
}`;
  }

  private parseAnalysisResult(completion: OpenAI.ChatCompletion): Omit<ExpertAnalysis, 'duration'> {
    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error('OpenAI analysis response:', JSON.stringify(completion, null, 2));
      throw new Error('No content in OpenAI analysis response');
    }

    try {
      const parsed = JSON.parse(content);
      this.validateAnalysisStructure(parsed);

      const improvements: FeedbackItem[] = (parsed.improvements || []).map((item: any) => ({
        id: uuidv4(),
        issue: item.issue || '',
        location: item.location || 'General',
        suggestion: item.suggestion || '',
        category: item.category || 'clarity',
        severity: item.severity || 'suggestion',
        expert: item.expert || 'broker',
        actionable: false,
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
      console.error('Failed to parse analysis response. Content:', content);
      console.error('Parse error:', error);
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

    const validCategories = ['grammar', 'style', 'legal', 'broker_realism', 'clarity'];
    const validSeverities = ['critical', 'important', 'suggestion'];
    const validExperts = ['broker', 'lawyer'];

    for (const item of analysis.improvements) {
      if (!validCategories.includes(item.category)) {
        item.category = 'clarity'; // Graceful fallback instead of throwing
      }
      if (!validSeverities.includes(item.severity)) {
        item.severity = 'suggestion';
      }
      if (!validExperts.includes(item.expert)) {
        item.expert = 'broker';
      }
    }
  }

  private identifyTextSpans(
    request: AnalysisRequest,
    analysis: Omit<ExpertAnalysis, 'duration'>
  ): Omit<ExpertAnalysis, 'duration'> {
    const texts: Record<string, string> = {
      improvedPrompt: request.improvedPrompt,
      headline: request.headline,
      socialCopy: request.socialCopy
    };

    const improvementsWithSpans = analysis.improvements.map(item => {
      if (item.location === 'General') return item;

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

      return item;
    });

    return { ...analysis, improvements: improvementsWithSpans };
  }

  private extractKeywords(issue: string): string[] {
    const quotedMatches = issue.match(/"([^"]+)"/g);
    if (quotedMatches) {
      return quotedMatches.map(m => m.replace(/"/g, ''));
    }
    return issue.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
  }

  private generateAutoFixes(
    analysis: Omit<ExpertAnalysis, 'duration'>
  ): Omit<ExpertAnalysis, 'duration'> {
    const improvementsWithFixes = analysis.improvements.map(item => {
      if (item.textSpan && ['grammar', 'style', 'clarity'].includes(item.category)) {
        const autoFix = this.extractAutoFix(item.suggestion);
        if (autoFix) {
          return { ...item, actionable: true, autoFix };
        }
      }
      return item;
    });

    return { ...analysis, improvements: improvementsWithFixes };
  }

  private extractAutoFix(suggestion: string): string | undefined {
    const replacePatterns = [
      /ersätt.*?med\s+"([^"]+)"/i,
      /ändra till\s+"([^"]+)"/i,
      /använd\s+"([^"]+)"/i,
      /skriv\s+"([^"]+)"/i
    ];

    for (const pattern of replacePatterns) {
      const match = suggestion.match(pattern);
      if (match?.[1]) return match[1];
    }

    return undefined;
  }
}
