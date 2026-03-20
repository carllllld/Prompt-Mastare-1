import { FORBIDDEN_PHRASES, WritingStyle } from './text-rules';

export interface PostProcessRequest {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  disposition: any;
  style: WritingStyle;
  platform: string;
}

export interface PostProcessResult {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  transformations: Transformation[];
  duration: number;
}

export interface Transformation {
  type: 'placeholder' | 'formatting' | 'forbidden_phrase' | 'normalization' | 'generalization' | 'narrative_integrity' | 'missing_facts';
  field: string;
  before: string;
  after: string;
  position?: { start: number; end: number };
}

export class DeterministicPostProcessor {
  // Pre-compiled regex patterns for performance
  private readonly PLACEHOLDER_PATTERNS = {
    TID: /\[TID\]/gi,
    KONTAKT: /\[KONTAKT\]/gi,
    MÄKLARE: /\[MÄKLARE\]/gi,
    ADRESS: /\[ADRESS\]/gi
  };

  private readonly FORMATTING_PATTERNS = {
    missingPeriod: /([a-zåäö])\s+([A-ZÅÄÖ])/g,
    multipleSpaces: /\s{2,}/g,
    headlinePeriod: /\.$/
  };

  // Compile forbidden phrase patterns once
  private readonly forbiddenPhrasePatterns: Array<{ phrase: string; pattern: RegExp }>;

  constructor() {
    this.forbiddenPhrasePatterns = FORBIDDEN_PHRASES.map(phrase => ({
      phrase,
      pattern: new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    }));
  }

  async process(request: PostProcessRequest): Promise<PostProcessResult> {
    const startTime = Date.now();
    const transformations: Transformation[] = [];

    try {
      // Apply all transformations sequentially
      let result = { ...request };

      // 1. Remove placeholders
      result = this.removePlaceholders(result, transformations);

      // 2. Apply formatting fixes
      result = this.applyFormatting(result, transformations);

      // 3. Remove forbidden phrases
      result = this.removeForbiddenPhrases(result, request.style, transformations);

      // 4. Normalize Swedish characters
      result = this.normalizeSwedishCharacters(result, transformations);

      // 5. Generalize and deduplicate
      result = this.generalizeAndDeduplicate(result, transformations);

      // 6. Check narrative integrity
      result = this.checkNarrativeIntegrity(result, transformations);

      // 7. Add missing facts
      result = this.addMissingFacts(result, request.disposition, transformations);

      const duration = Date.now() - startTime;

      // Log transformations for debugging
      this.logTransformations(transformations);

      return {
        improvedPrompt: result.improvedPrompt,
        headline: result.headline,
        socialCopy: result.socialCopy,
        instagramCaption: result.instagramCaption,
        showingInvitation: result.showingInvitation,
        shortAd: result.shortAd,
        transformations,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Post-processing failed:', {
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      // Return original text on error (graceful degradation)
      return {
        improvedPrompt: request.improvedPrompt,
        headline: request.headline,
        socialCopy: request.socialCopy,
        instagramCaption: request.instagramCaption,
        showingInvitation: request.showingInvitation,
        shortAd: request.shortAd,
        transformations,
        duration
      };
    }
  }

  private removePlaceholders(
    request: PostProcessRequest,
    transformations: Transformation[]
  ): PostProcessRequest {
    const result = { ...request };

    // Process each field
    for (const field of ['improvedPrompt', 'headline', 'socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd'] as const) {
      let text = result[field];
      const originalText = text;

      // Remove all placeholder types
      for (const [type, pattern] of Object.entries(this.PLACEHOLDER_PATTERNS)) {
        const matches = text.match(pattern);
        if (matches) {
          text = text.replace(pattern, '');
          
          matches.forEach(match => {
            transformations.push({
              type: 'placeholder',
              field,
              before: match,
              after: ''
            });
          });
        }
      }

      // Clean up extra spaces left by placeholder removal
      text = text.replace(/\s{2,}/g, ' ').trim();

      result[field] = text;
    }

    return result;
  }

  private applyFormatting(
    request: PostProcessRequest,
    transformations: Transformation[]
  ): PostProcessRequest {
    const result = { ...request };

    // Process each field
    for (const field of ['improvedPrompt', 'headline', 'socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd'] as const) {
      let text = result[field];

      // Add missing periods between sentences (lowercase letter followed by uppercase letter)
      const periodMatches = [...text.matchAll(this.FORMATTING_PATTERNS.missingPeriod)];
      if (periodMatches.length > 0) {
        text = text.replace(this.FORMATTING_PATTERNS.missingPeriod, '$1. $2');
        
        periodMatches.forEach(match => {
          transformations.push({
            type: 'formatting',
            field,
            before: match[0],
            after: `${match[1]}. ${match[2]}`
          });
        });
      }

      // Remove period from headline
      if (field === 'headline' && this.FORMATTING_PATTERNS.headlinePeriod.test(text)) {
        const before = text;
        text = text.replace(this.FORMATTING_PATTERNS.headlinePeriod, '');
        
        transformations.push({
          type: 'formatting',
          field,
          before,
          after: text
        });
      }

      // Normalize multiple spaces
      const spaceMatches = text.match(this.FORMATTING_PATTERNS.multipleSpaces);
      if (spaceMatches) {
        text = text.replace(this.FORMATTING_PATTERNS.multipleSpaces, ' ');
        
        spaceMatches.forEach(match => {
          transformations.push({
            type: 'formatting',
            field,
            before: match,
            after: ' '
          });
        });
      }

      result[field] = text;
    }

    return result;
  }

  private removeForbiddenPhrases(
    request: PostProcessRequest,
    style: WritingStyle,
    transformations: Transformation[]
  ): PostProcessRequest {
    const result = { ...request };

    // Style exemptions: balanced and selling can use some phrases
    const styleExemptions = style === 'selling' ? ['fantastisk', 'underbar', 'magisk'] : [];

    // Process each field
    for (const field of ['improvedPrompt', 'headline', 'socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd'] as const) {
      let text = result[field];

      // Check each forbidden phrase
      for (const { phrase, pattern } of this.forbiddenPhrasePatterns) {
        // Skip if phrase is exempted for this style
        if (styleExemptions.includes(phrase)) {
          continue;
        }

        const matches = text.match(pattern);
        if (matches) {
          const before = text;
          text = text.replace(pattern, '');
          
          matches.forEach(match => {
            transformations.push({
              type: 'forbidden_phrase',
              field,
              before: match,
              after: ''
            });
          });
        }
      }

      // Clean up extra spaces left by phrase removal
      text = text.replace(/\s{2,}/g, ' ').trim();

      result[field] = text;
    }

    return result;
  }

  private normalizeSwedishCharacters(
    request: PostProcessRequest,
    transformations: Transformation[]
  ): PostProcessRequest {
    const result = { ...request };

    // Common encoding issues to fix
    const encodingFixes: Array<[RegExp, string]> = [
      [/Ã¥/g, 'å'],
      [/Ã¤/g, 'ä'],
      [/Ã¶/g, 'ö'],
      [/Ã…/g, 'Å'],
      [/Ã„/g, 'Ä'],
      [/Ã–/g, 'Ö']
    ];

    // Process each field
    for (const field of ['improvedPrompt', 'headline', 'socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd'] as const) {
      let text = result[field];
      const originalText = text;

      for (const [pattern, replacement] of encodingFixes) {
        const matches = text.match(pattern);
        if (matches) {
          text = text.replace(pattern, replacement);
          
          matches.forEach(match => {
            transformations.push({
              type: 'normalization',
              field,
              before: match,
              after: replacement
            });
          });
        }
      }

      result[field] = text;
    }

    return result;
  }

  private generalizeAndDeduplicate(
    request: PostProcessRequest,
    transformations: Transformation[]
  ): PostProcessRequest {
    const result = { ...request };

    // Generalization patterns: specific names → generic terms
    const generalizationPatterns: Array<[RegExp, string]> = [
      // Restaurant names → "restauranger"
      [/Restaurang\s+[A-ZÅÄÖ][a-zåäö]+(?:,\s*Restaurang\s+[A-ZÅÄÖ][a-zåäö]+)*/gi, 'restauranger'],
      // Café names → "kaféer"
      [/Kafé\s+[A-ZÅÄÖ][a-zåäö]+(?:,\s*Kafé\s+[A-ZÅÄÖ][a-zåäö]+)*/gi, 'kaféer'],
      // Store names → "butiker"
      [/Butik\s+[A-ZÅÄÖ][a-zåäö]+(?:,\s*Butik\s+[A-ZÅÄÖ][a-zåäö]+)*/gi, 'butiker']
    ];

    // Process each field
    for (const field of ['improvedPrompt', 'socialCopy', 'instagramCaption'] as const) {
      let text = result[field];

      for (const [pattern, replacement] of generalizationPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          const before = text;
          text = text.replace(pattern, replacement);
          
          matches.forEach(match => {
            transformations.push({
              type: 'generalization',
              field,
              before: match,
              after: replacement
            });
          });
        }
      }

      // Deduplicate repeated words (e.g., "restauranger, restauranger" → "restauranger")
      const deduplicationPattern = /\b(\w+)\b(?:,\s*\1\b)+/gi;
      const dedupeMatches = text.match(deduplicationPattern);
      if (dedupeMatches) {
        text = text.replace(deduplicationPattern, '$1');
        
        dedupeMatches.forEach(match => {
          const word = match.split(',')[0].trim();
          transformations.push({
            type: 'generalization',
            field,
            before: match,
            after: word
          });
        });
      }

      result[field] = text;
    }

    return result;
  }

  private checkNarrativeIntegrity(
    request: PostProcessRequest,
    transformations: Transformation[]
  ): PostProcessRequest {
    const result = { ...request };

    // Process each field
    for (const field of ['improvedPrompt', 'headline', 'socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd'] as const) {
      let text = result[field];
      const originalText = text;

      try {
        // 1. Detect and fix incomplete sentences
        text = this.fixIncompleteSentences(text, field, transformations);

        // 2. Detect and fix missing bullet points
        text = this.fixMissingBulletPoints(text, field, transformations);

        // 3. Detect and fix abrupt endings
        text = this.fixAbruptEndings(text, field, transformations);

        result[field] = text;
      } catch (error) {
        // Graceful degradation: log warning but continue with original text
        console.warn(`Narrative integrity check failed for ${field}:`, {
          error: error instanceof Error ? error.message : String(error),
          field
        });
        result[field] = originalText;
      }
    }

    return result;
  }

  private fixIncompleteSentences(
    text: string,
    field: string,
    transformations: Transformation[]
  ): string {
    let result = text;

    // Pattern 1: Sentence ending with comma or dash instead of period
    const incompleteEndingPattern = /([a-zåäö]+)[,\-]\s*$/gm;
    const incompleteMatches = result.match(incompleteEndingPattern);
    if (incompleteMatches) {
      const before = result;
      result = result.replace(incompleteEndingPattern, '$1.');
      
      if (result !== before) {
        transformations.push({
          type: 'narrative_integrity',
          field,
          before: 'Incomplete sentence ending',
          after: 'Added proper punctuation'
        });
      }
    }

    // Pattern 2: Missing period between sentences (lowercase followed by uppercase without punctuation)
    const missingPeriodPattern = /([a-zåäö])\s+([A-ZÅÄÖ])/g;
    const periodMatches = [...result.matchAll(missingPeriodPattern)];
    if (periodMatches.length > 0) {
      const before = result;
      result = result.replace(missingPeriodPattern, '$1. $2');
      
      if (result !== before) {
        transformations.push({
          type: 'narrative_integrity',
          field,
          before: 'Missing period between sentences',
          after: 'Added missing periods'
        });
      }
    }

    // Pattern 3: Sentence fragments (very short sentences without proper structure)
    const sentences = result.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const hasFragments = sentences.some(s => {
      const words = s.trim().split(/\s+/);
      return words.length > 0 && words.length < 3 && !s.match(/^\d+/); // Ignore numbers
    });

    if (hasFragments) {
      transformations.push({
        type: 'narrative_integrity',
        field,
        before: 'Detected sentence fragments',
        after: 'Fragments detected but not auto-fixed (manual review needed)'
      });
    }

    return result;
  }

  private fixMissingBulletPoints(
    text: string,
    field: string,
    transformations: Transformation[]
  ): string {
    let result = text;

    // Pattern 1: Incomplete list (e.g., "Bostaden har: kök, badrum" without proper ending)
    const incompleteListPattern = /:\s*([a-zåäö][^.!?]*[,])\s*$/gm;
    const listMatches = result.match(incompleteListPattern);
    if (listMatches) {
      const before = result;
      // Add "och mer" to complete the list
      result = result.replace(incompleteListPattern, ': $1 och mer.');
      
      if (result !== before) {
        transformations.push({
          type: 'narrative_integrity',
          field,
          before: 'Incomplete list',
          after: 'Completed list with proper ending'
        });
      }
    }

    // Pattern 2: Bullet points without proper formatting
    const bulletPattern = /^[-•]\s*([a-zåäö])/gm;
    const bulletMatches = [...result.matchAll(bulletPattern)];
    if (bulletMatches.length > 0) {
      const before = result;
      // Capitalize first letter after bullet
      result = result.replace(bulletPattern, (match, firstChar) => {
        return match.replace(firstChar, firstChar.toUpperCase());
      });
      
      if (result !== before) {
        transformations.push({
          type: 'narrative_integrity',
          field,
          before: 'Bullet points with lowercase start',
          after: 'Capitalized bullet points'
        });
      }
    }

    return result;
  }

  private fixAbruptEndings(
    text: string,
    field: string,
    transformations: Transformation[]
  ): string {
    let result = text.trim();

    // Pattern 1: Text ending without proper punctuation
    const endsWithPunctuation = /[.!?]$/.test(result);
    if (!endsWithPunctuation && result.length > 0) {
      const before = result;
      result = result + '.';
      
      transformations.push({
        type: 'narrative_integrity',
        field,
        before: 'Text ending without punctuation',
        after: 'Added period at end'
      });
    }

    // Pattern 2: Text ending mid-sentence (e.g., "Bostaden har ett")
    const lastSentence = result.split(/[.!?]/).pop()?.trim() || '';
    const words = lastSentence.split(/\s+/);
    
    // Check if last sentence is suspiciously short and ends with preposition/article
    const suspiciousEndings = ['ett', 'en', 'och', 'med', 'i', 'på', 'till', 'från', 'av', 'för'];
    const lastWord = words[words.length - 1]?.toLowerCase();
    
    if (words.length > 0 && words.length < 4 && suspiciousEndings.includes(lastWord)) {
      transformations.push({
        type: 'narrative_integrity',
        field,
        before: `Abrupt ending detected: "${lastSentence}"`,
        after: 'Abrupt ending detected but not auto-fixed (manual review needed)'
      });
    }

    // Pattern 3: Text ending with conjunction or incomplete phrase
    const incompleteConjunctionPattern = /\s+(och|eller|men|samt)\s*\.?$/i;
    if (incompleteConjunctionPattern.test(result)) {
      const before = result;
      result = result.replace(incompleteConjunctionPattern, '.');
      
      transformations.push({
        type: 'narrative_integrity',
        field,
        before: 'Text ending with conjunction',
        after: 'Removed trailing conjunction'
      });
    }

    return result;
  }

  private addMissingFacts(
    request: PostProcessRequest,
    disposition: any,
    transformations: Transformation[]
  ): PostProcessRequest {
    const result = { ...request };

    // Only process the main improvedPrompt field
    let text = result.improvedPrompt;

    try {
      const missingFacts: string[] = [];

      // 1. Check for missing energiklass
      const hasEnergiklass = /energiklass/i.test(text);
      const energiklassValue = disposition?.energiklass || disposition?.property?.energiklass;
      
      if (!hasEnergiklass && energiklassValue) {
        missingFacts.push(`Bostaden har energiklass ${energiklassValue}.`);
        transformations.push({
          type: 'missing_facts',
          field: 'improvedPrompt',
          before: 'Missing energiklass',
          after: `Added energiklass ${energiklassValue}`
        });
      }

      // 2. Check for missing värmesystem
      const hasVärmesystem = /värme|uppvärmning/i.test(text);
      const värmesystemValue = disposition?.värmesystem || disposition?.property?.värmesystem || disposition?.heating;
      
      if (!hasVärmesystem && värmesystemValue) {
        missingFacts.push(`Uppvärmning sker med ${värmesystemValue.toLowerCase()}.`);
        transformations.push({
          type: 'missing_facts',
          field: 'improvedPrompt',
          before: 'Missing värmesystem',
          after: `Added värmesystem ${värmesystemValue}`
        });
      }

      // 3. Add missing facts to text in natural language
      if (missingFacts.length > 0) {
        // Find a good place to insert facts - preferably after property description but before location
        // For now, add at the end of the text
        const factsText = ' ' + missingFacts.join(' ');
        text = text.trim() + factsText;
        
        console.log('Added missing facts:', {
          count: missingFacts.length,
          facts: missingFacts
        });
      }

      result.improvedPrompt = text;
    } catch (error) {
      // Graceful degradation: log warning but continue with original text
      console.warn('Failed to add missing facts:', {
        error: error instanceof Error ? error.message : String(error)
      });
      result.improvedPrompt = request.improvedPrompt;
    }

    return result;
  }

  private logTransformations(transformations: Transformation[]): void {
    if (transformations.length === 0) {
      return;
    }

    console.log('Post-processing transformations:', {
      count: transformations.length,
      byType: transformations.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
  }
}
