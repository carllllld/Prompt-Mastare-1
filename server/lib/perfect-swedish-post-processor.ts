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
  type: 'placeholder' | 'formatting' | 'forbidden_phrase' | 'normalization' | 'generalization';
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
