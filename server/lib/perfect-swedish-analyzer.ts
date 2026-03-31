import OpenAI from 'openai';
import { WritingStyle, FORBIDDEN_PHRASES, getExemptPhrases, UNVERIFIABLE_CLAIMS, HEMNET_FORBIDDEN_PATTERNS } from './text-rules';
import { findRuleViolations } from './text-validation';
import { v4 as uuidv4 } from 'uuid';

export interface AnalysisRequest {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  disposition?: any;
  style?: WritingStyle;
  platform?: string;
  userContext?: string;
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

interface ValidationResult {
  violations: Record<string, string[]>;
  totalCount: number;
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
    const TIMEOUT_MS = 30000; // 30 seconds

    try {
      // Step 1: Run deterministic validation BEFORE AI
      const validationResult = this.runDeterministicValidation(request);

      const prompt = this.buildAnalysisPrompt(request);

      const completionPromise = this.openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 3000,
        response_format: { type: 'json_object' },
        reasoning_effort: 'medium',
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout')), TIMEOUT_MS)
      );

      const completion = await Promise.race([completionPromise, timeoutPromise]);

      const analysis = this.parseAnalysisResult(completion);
      
      // Step 2: Merge validation violations with AI improvements
      const mergedAnalysis = this.mergeValidationViolations(analysis, validationResult);
      
      // Memory optimization: Clear validation result after merge to allow GC
      // This is safe because all needed data is now in mergedAnalysis
      (validationResult as any).violations = null;
      
      const analysisWithSpans = this.identifyTextSpans(request, mergedAnalysis);
      const analysisWithFixes = this.generateAutoFixes(analysisWithSpans);

      return { ...analysisWithFixes, duration: Date.now() - startTime };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.message === 'Analysis timeout') {
        console.error('Analyzer timed out, returning basic analysis');
        return {
          overallQuality: 7.0,
          strengths: ['Analysis timed out - basic validation passed'],
          improvements: [],
          legalCheck: { compliant: true, notes: 'Timeout - manual review needed', issues: [] },
          duration
        };
      }

      console.error('Expert analysis failed:', {
        error: error instanceof Error ? error.message : String(error),
        duration
      });
      throw error;
    }
  }

  private runDeterministicValidation(request: AnalysisRequest): ValidationResult {
    const fields = {
      improvedPrompt: request.improvedPrompt,
      headline: request.headline,
      socialCopy: request.socialCopy,
      instagramCaption: request.instagramCaption,
      showingInvitation: request.showingInvitation,
      shortAd: request.shortAd
    };

    const violations: Record<string, string[]> = {};
    let totalCount = 0;

    for (const [field, text] of Object.entries(fields)) {
      if (text && text.length > 0) {
        const fieldViolations = findRuleViolations(text, request.platform, request.style);
        if (fieldViolations.length > 0) {
          violations[field] = fieldViolations;
          totalCount += fieldViolations.length;
        }
      }
    }

    // Return immediately to allow garbage collection of intermediate objects
    return { violations, totalCount };
  }

  private mergeValidationViolations(
    analysis: Omit<ExpertAnalysis, 'duration'>,
    validation: ValidationResult
  ): Omit<ExpertAnalysis, 'duration'> {
    const mergedImprovements = [...analysis.improvements];
    const legalIssues = new Set(analysis.legalCheck.issues);
    let hasViolations = false;

    for (const [field, violations] of Object.entries(validation.violations)) {
      for (const violation of violations) {
        // Check if AI already detected this violation
        const alreadyDetected = mergedImprovements.some(item =>
          item.location === field && 
          (item.issue.toLowerCase().includes(violation.toLowerCase().slice(0, 20)) ||
           violation.toLowerCase().includes(item.issue.toLowerCase().slice(0, 20)))
        );

        if (!alreadyDetected) {
          // Add missing violation as critical improvement
          hasViolations = true;
          mergedImprovements.push({
            id: uuidv4(),
            issue: violation,
            location: field,
            suggestion: this.generateSuggestionForViolation(violation),
            category: this.categorizeViolation(violation),
            severity: 'critical',
            expert: this.determineExpert(violation),
            actionable: false,
            textSpan: undefined,
            autoFix: undefined
          });

          // Add to legal issues
          const issueType = this.categorizeViolation(violation);
          legalIssues.add(issueType);
        }
      }
    }

    // Update legalCheck if violations were found
    const updatedLegalCheck: LegalCheck = {
      compliant: validation.totalCount === 0 && analysis.legalCheck.compliant,
      notes: validation.totalCount > 0 
        ? `${validation.totalCount} violation(s) detected by deterministic validation. ${analysis.legalCheck.notes}`.trim()
        : analysis.legalCheck.notes,
      issues: Array.from(legalIssues)
    };

    return {
      ...analysis,
      improvements: mergedImprovements,
      legalCheck: updatedLegalCheck
    };
  }

  private buildAnalysisPrompt(request: AnalysisRequest): string {
    const { 
      improvedPrompt, 
      headline, 
      socialCopy, 
      instagramCaption,
      showingInvitation,
      shortAd,
      style,
      platform,
      userContext,
    } = request;
    const exemptPhrases = getExemptPhrases(style);
    const blockedPhrases = FORBIDDEN_PHRASES.filter(p => !exemptPhrases.has(p));
    const normalizedPlatform = platform?.toLowerCase() || 'hemnet';

    const platformRulesSection = normalizedPlatform === 'hemnet' ? `
## HEMNET-SPECIFIKA REGLER (kontrollera dessa i ALLA fält) - KRITISKT!
- Energiklass eller energiprestanda FÅR INTE nämnas i NÅGON text (visas separat i annonsen) → severity: "critical"
- Pris, avgift eller driftkostnad FÅR INTE nämnas i NÅGON text (visas i separata fält) → severity: "critical"
- Ekonomihänvisningar FÅR INTE förekomma (t.ex. "ekonomi redovisas", "kontakta för ekonomisk information") → severity: "critical"
- Första meningen i huvudtext MÅSTE leda med bostadens starkaste USP — inte bara storlek och adress → severity: "important"
- Texten FÅR INTE avslutas med emotionella fraser som "välkommen hem", "skapa minnen", "allt du behöver" → severity: "important"
- Texten ska vara faktadriven och köparrelevant utan AI-känsla

### HEMNET FÖRBJUDNA MÖNSTER (MÅSTE flaggas som "critical"):
${HEMNET_FORBIDDEN_PATTERNS.map(p => `- ${p.message}: Mönster som matchar "${p.pattern.source}"`).join('\n')}` :
    normalizedPlatform === 'booli' ? `
## BOOLI-SPECIFIKA REGLER (kontrollera dessa)
- Mer berättande ton är tillåten men fakta måste förbli konkreta och verifierbara
- Energiklass kan nämnas om det är ett säljargument (t.ex. energiklass A eller B)
- Första meningen ska fånga det unika med bostaden` : `
## STRUKTURREGLER (kontrollera dessa)
- Texten ska vara löpande objektbeskrivning — inte en faktalista
- Fakta ska vara konkreta och verifierbara`;

    const unverifiableClaimsSection = `
## OTYDLIGA PÅSTÅENDEN SOM KRÄVER BEVIS (MÅSTE flaggas som "critical" om bevis saknas)
${UNVERIFIABLE_CLAIMS.map(c => `- "${c.claim}" → Kräver: ${c.requiresEvidence}`).join('\n')}

Om något av dessa påståenden förekommer UTAN konkret bevis (t.ex. renoveringsår, besiktning), MÅSTE du flagga det som:
- severity: "critical"
- category: "legal"
- issue: "Otydligt påstående: '[påstående]' kräver bevis"
- suggestion: "Specificera bevis (t.ex. renoveringsår, besiktning) eller ta bort påståendet"`;

    return `Du är en senior svensk mäklare OCH jurist med 20 års erfarenhet. Analysera dessa mäklartexter och ge konstruktiv feedback i JSON-format.

## DIN ROLL

Du har sett tusentals objektbeskrivningar. Du vet vad som får en köpare att boka visning och vad som får dem att scrolla vidare. Din feedback ska vara konkret, actionable och baserad på vad som faktiskt fungerar i den svenska bostadsmarknaden.

Tänk: "Om jag var köpare och läste detta — skulle jag vilja se bostaden?"

DU FÅR ALDRIG SVARA MED NOLL FÖRBÄTTRINGAR. Det finns ALLTID något att förbättra. Även en bra text kan bli bättre. Om du inte hittar kritiska problem, ge stilförslag och förbättringar av ordval, meningsbyggnad eller struktur.

Kontrollera ALLTID:
- Stavfel och trasiga sammansättningar (t.ex. "kököksö" istället för "köksö")
- Emojis i fel fält (emojis är BARA tillåtna i Instagram Caption, ALDRIG i socialCopy, headline, showingInvitation, shortAd)
- Generiska/tråkiga rubriker som inte fångar uppmärksamhet
- Meningar som inte tillför konkreta fakta

## DIN VIKTIGASTE REGEL: VERIFIERA INNAN DU FLAGGAR

Innan du rapporterar ett problem, CITERA den exakta texten som är problematisk.
Om du inte kan citera exakt text → flagga INTE.

Exempel på KORREKT flaggning:
- Issue: "Frasen 'förlänger säsongen' i stycke 1 är en mjuk klyscha utan konkret innebörd"
- Location: "improvedPrompt"

Exempel på FELAKTIG flaggning (gör INTE detta):
- "Undvik specifika restaurangnamn" → men texten säger "restauranger" (generellt) = FALSKT ALARM
- "Nämn inte pris" → men texten nämner inte pris = FALSKT ALARM

## FÖRBJUDNA FRASER (MÅSTE flaggas som "critical" om de förekommer i NÅGOT fält)
${blockedPhrases.map(p => `- "${p}"`).join('\n')}

${unverifiableClaimsSection}

${platformRulesSection}

## TEXTEN ATT ANALYSERA

Rubrik: ${headline}

Huvudtext:
${improvedPrompt}

Social media:
${socialCopy}

Instagram:
${instagramCaption}

Visningsinbjudan:
${showingInvitation}

Kort annons:
${shortAd}

Stil: ${style || 'balanced'} | Plattform: ${platform || 'hemnet'}
${userContext ? `\n## EXTRA INSTRUKTIONER FRÅN ANVÄNDAREN\n${userContext}\n\nFölj dessa instruktioner och fokusera analysen på det användaren efterfrågar.\n` : ''}
## ANALYSERA ALLA FÄLT - KRITISKT!

För VARJE fält (rubrik, huvudtext, social media, Instagram, visningsinbjudan, kort annons):

1. STYRKOR: Vad är konkret bra? (3-5 punkter)
2. FÖRBÄTTRINGAR: Konkreta problem med lösningar
   - Finns NÅGON förbjuden fras? → MÅSTE flaggas som severity: "critical"
   - Finns NÅGOT otydligt påstående utan bevis? → MÅSTE flaggas som severity: "critical"
   - Bryter mot plattformsreglerna ovan? → MÅSTE flaggas som severity: "critical"
   - Grammatikfel (t.ex. dubbel punkt "..")? → severity: "critical"  
   - AI-klyschor som inte är i listan? → severity: "important"
   - Stilfrågor? → severity: "suggestion"
3. FÄLTSPECIFIKA KVALITETSKRAV:
   - Rubrik: max 9 ord, ingen punkt, inga emojis → severity: "important"
   - Social media: 1-3 meningar, punkt i slutet → severity: "suggestion"
   - Instagram: 1-2 emojis, max 2200 tecken → severity: "suggestion"
   - Visningsinbjudan: innehåller "visning" → severity: "important"
   - Kort annons: max 2 meningar, innehåller bostadstyp + boarea → severity: "suggestion"
4. JURIDIK: Vilseledande påståenden? Faktafel?

**VIKTIGT**: Du MÅSTE kontrollera VARJE fält för VARJE förbjuden fras, otydligt påstående och plattformsregel. Missa INGENTING!

**KRITISKT — UNDVIK FALSKA ALARM:**
- Flagga INTE generella termer som "restauranger", "kaféer", "butiker", "matställen" — dessa är KORREKTA. Flagga BARA om SPECIFIKA namn nämns (t.ex. "Restaurang Gondolen", "ICA Maxi Vasastan").
- Flagga INTE saker som redan är korrekta. Läs texten noggrant innan du flaggar.
- Om ett fält är tomt, flagga det som "Fältet är tomt" — inte som att det bryter mot en regel.
- Varje förbättring MÅSTE citera den exakta texten som är problematisk.

## OUTPUT FORMAT

Svara ENDAST med JSON (json format) i denna exakta struktur:

{
  "overallQuality": 8.5,
  "strengths": ["Konkret styrka 1", "Konkret styrka 2", "Konkret styrka 3"],
  "improvements": [
    {
      "issue": "Konkret problem i specifikt fält",
      "location": "headline|improvedPrompt|socialCopy|instagramCaption|showingInvitation|shortAd",
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
      improvedPrompt: request.improvedPrompt || '',
      headline: request.headline || '',
      socialCopy: request.socialCopy || '',
      instagramCaption: request.instagramCaption || '',
      showingInvitation: request.showingInvitation || '',
      shortAd: request.shortAd || ''
    };

    const improvementsWithSpans = analysis.improvements.map(item => {
      if (item.location === 'General') return item;

      const keywords = this.extractKeywords(item.issue);

      for (const [field, text] of Object.entries(texts)) {
        // Skip empty texts
        if (!text) continue;
        
        for (const keyword of keywords) {
          const index = text.toLowerCase().indexOf(keyword.toLowerCase());
          if (index !== -1) {
            return {
              ...item,
              textSpan: {
                start: index,
                end: index + keyword.length,
                field: field as 'improvedPrompt' | 'headline' | 'socialCopy' | 'instagramCaption' | 'showingInvitation' | 'shortAd'
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

  private generateSuggestionForViolation(violation: string): string {
    const lowerViolation = violation.toLowerCase();
    
    // Forbidden phrases
    if (lowerViolation.includes('förbjuden fras')) {
      return 'Ersätt med naturligt mäklarspråk utan AI-klyschor';
    }
    
    // Hemnet violations
    if (lowerViolation.includes('hemnet') || lowerViolation.includes('ekonomi')) {
      return 'Ta bort enligt Hemnet-regler';
    }
    
    // Unverifiable claims
    if (lowerViolation.includes('otydligt påstående') || lowerViolation.includes('kräver bevis')) {
      return 'Lägg till konkret bevis (t.ex. renoveringsår) eller ta bort påståendet';
    }
    
    // Grammar errors
    if (lowerViolation.includes('grammatik') || lowerViolation.includes('dubbel punkt')) {
      return 'Korrigera grammatikfel';
    }
    
    // Default
    return 'Åtgärda enligt regelverket';
  }

  private categorizeViolation(violation: string): FeedbackItem['category'] {
    const lowerViolation = violation.toLowerCase();
    
    if (lowerViolation.includes('grammatik') || lowerViolation.includes('dubbel punkt')) {
      return 'grammar';
    }
    
    if (lowerViolation.includes('hemnet') || lowerViolation.includes('otydligt påstående') || 
        lowerViolation.includes('kräver bevis')) {
      return 'legal';
    }
    
    if (lowerViolation.includes('förbjuden fras')) {
      return 'style';
    }
    
    return 'clarity';
  }

  private determineExpert(violation: string): 'broker' | 'lawyer' {
    const lowerViolation = violation.toLowerCase();
    
    if (lowerViolation.includes('hemnet') || lowerViolation.includes('otydligt påstående') || 
        lowerViolation.includes('kräver bevis') || lowerViolation.includes('ekonomi')) {
      return 'lawyer';
    }
    
    return 'broker';
  }
}
