import { FORBIDDEN_PHRASES, WritingStyle, getExemptPhrases } from './text-rules';

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
  type: 'placeholder' | 'formatting' | 'forbidden_phrase' | 'normalization' | 'generalization' | 'narrative_integrity' | 'missing_facts' | 'paragraph_enforcement';
  field: string;
  before: string;
  after: string;
  position?: { start: number; end: number };
}

const TEXT_FIELDS = ['improvedPrompt', 'headline', 'socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd'] as const;

// Special regex metacharacters that need escaping — built without string literals
// to avoid tool-level substitution of special characters.
const REGEX_SPECIALS: ReadonlySet<string> = new Set(
  '\\^.|?*+()[]{}' // dollar sign added below
    .split('')
    .concat('\x24') // \x24 = '$'
);

/**
 * Escapes all special regex metacharacters in a literal string.
 * Uses a character-by-character loop so no replacement-string
 * interpolation (e.g. backreferences) can corrupt the output.
 */
function escapeRegex(str: string): string {
  let out = '';
  for (const ch of str) {
    if (REGEX_SPECIALS.has(ch)) out += '\\';
    out += ch;
  }
  return out;
}

export class DeterministicPostProcessor {
  private readonly PLACEHOLDER_PATTERNS = {
    TID: /\[TID\]/gi,
    KONTAKT: /\[KONTAKT\]/gi,
    MÄKLARE: /\[MÄKLARE\]/gi,
    ADRESS: /\[ADRESS\]/gi
  };

  // Compile forbidden phrase patterns once with correct regex escaping
  private readonly forbiddenPhrasePatterns: Array<{ phrase: string; pattern: RegExp }>;

  constructor() {
    this.forbiddenPhrasePatterns = FORBIDDEN_PHRASES.map(phrase => ({
      phrase,
      pattern: new RegExp(escapeRegex(phrase), 'gi')
    }));
  }

  async process(request: PostProcessRequest): Promise<PostProcessResult> {
    const startTime = Date.now();
    const transformations: Transformation[] = [];

    try {
      let result = { ...request };

      result = this.removePlaceholders(result, transformations);
      result = this.enforceParagraphBreaks(result, transformations);
      result = this.applyFormatting(result, transformations);
      result = this.removeForbiddenPhrases(result, request.style, transformations);
      result = this.normalizeSwedishCharacters(result, transformations);
      result = this.generalizeAndDeduplicate(result, transformations);
      result = this.checkNarrativeIntegrity(result, transformations);
      result = this.addMissingFacts(result, request.disposition, transformations);

      const duration = Date.now() - startTime;
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

  private removePlaceholders(request: PostProcessRequest, transformations: Transformation[]): PostProcessRequest {
    const result = { ...request };

    for (const field of TEXT_FIELDS) {
      let text = result[field];

      for (const [, pattern] of Object.entries(this.PLACEHOLDER_PATTERNS)) {
        const matches = text.match(pattern);
        if (matches) {
          text = text.replace(pattern, '');
          matches.forEach(match => transformations.push({ type: 'placeholder', field, before: match, after: '' }));
        }
      }

      result[field] = text.replace(/\s{2,}/g, ' ').trim();
    }

    return result;
  }

  private enforceParagraphBreaks(request: PostProcessRequest, transformations: Transformation[]): PostProcessRequest {
    const result = { ...request };
    let text = result.improvedPrompt;

    // Count existing paragraph breaks
    const existingBreaks = (text.match(/\n\n/g) || []).length;

    // If text has fewer than 3 paragraph breaks, force them in at logical points
    if (existingBreaks < 3) {
      const sentences = text.split(/\.\s+/).filter(s => s.trim().length > 0);
      
      // Need at least 3 sentences to create meaningful paragraph breaks
      if (sentences.length >= 3) {
        // Rebuild with forced paragraph breaks
        const paragraphs: string[] = [];
        
        if (sentences.length <= 4) {
          // Short text: split into 2-3 paragraphs
          const mid = Math.floor(sentences.length / 2);
          paragraphs.push(sentences.slice(0, mid).join('. ') + '.');
          paragraphs.push(sentences.slice(mid).join('. ') + '.');
        } else {
          // Longer text: split into 3-5 paragraphs
          // Paragraph 1: First 1-2 sentences (USP opening)
          const p1End = Math.min(2, Math.floor(sentences.length * 0.25));
          paragraphs.push(sentences.slice(0, p1End).join('. ') + '.');
          
          // Paragraph 2-3: Middle content (layout/rooms/features)
          const midStart = p1End;
          const midEnd = sentences.length - Math.max(2, Math.floor(sentences.length * 0.25));
          
          if (midEnd > midStart) {
            const midSentences = sentences.slice(midStart, midEnd);
            if (midSentences.length > 3) {
              // Split middle into 2 paragraphs
              const midSplit = Math.floor(midSentences.length / 2);
              paragraphs.push(midSentences.slice(0, midSplit).join('. ') + '.');
              paragraphs.push(midSentences.slice(midSplit).join('. ') + '.');
            } else {
              paragraphs.push(midSentences.join('. ') + '.');
            }
          }
          
          // Paragraph 4-5: Final content (location/economy)
          if (midEnd < sentences.length) {
            paragraphs.push(sentences.slice(midEnd).join('. ') + '.');
          }
        }
        
        const newText = paragraphs.join('\n\n');
        
        if (newText !== text) {
          transformations.push({
            type: 'paragraph_enforcement',
            field: 'improvedPrompt',
            before: `${existingBreaks} paragraph breaks`,
            after: `${paragraphs.length - 1} paragraph breaks enforced`
          });
          text = newText;
        }
      }
    }

    result.improvedPrompt = text;
    return result;
  }

  private applyFormatting(request: PostProcessRequest, transformations: Transformation[]): PostProcessRequest {
    const result = { ...request };

    for (const field of TEXT_FIELDS) {
      let text = result[field];

      // Remove trailing period from headline FIRST (before any period-adding logic)
      if (field === 'headline' && /\.$/.test(text)) {
        const before = text;
        text = text.replace(/\.$/, '');
        transformations.push({ type: 'formatting', field, before, after: text });
      }

      // Normalize multiple spaces
      const spaceMatches = text.match(/\s{2,}/g);
      if (spaceMatches) {
        text = text.replace(/\s{2,}/g, ' ');
        spaceMatches.forEach(match => transformations.push({ type: 'formatting', field, before: match, after: ' ' }));
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
    const exemptPhrases = getExemptPhrases(style);

    for (const field of TEXT_FIELDS) {
      let text = result[field];

      for (const { phrase, pattern } of this.forbiddenPhrasePatterns) {
        if (exemptPhrases.has(phrase)) continue;

        const matches = text.match(pattern);
        if (matches) {
          text = text.replace(pattern, '');
          matches.forEach(match => transformations.push({ type: 'forbidden_phrase', field, before: match, after: '' }));
        }
      }

      result[field] = text.replace(/\s{2,}/g, ' ').trim();
    }

    return result;
  }

  private normalizeSwedishCharacters(request: PostProcessRequest, transformations: Transformation[]): PostProcessRequest {
    const result = { ...request };

    const encodingFixes: Array<[RegExp, string]> = [
      [/Ã¥/g, 'å'], [/Ã¤/g, 'ä'], [/Ã¶/g, 'ö'],
      [/Ã…/g, 'Å'], [/Ã„/g, 'Ä'], [/Ã–/g, 'Ö']
    ];

    for (const field of TEXT_FIELDS) {
      let text = result[field];

      for (const [pattern, replacement] of encodingFixes) {
        const matches = text.match(pattern);
        if (matches) {
          text = text.replace(pattern, replacement);
          matches.forEach(match => transformations.push({ type: 'normalization', field, before: match, after: replacement }));
        }
      }

      result[field] = text;
    }

    return result;
  }

  private generalizeAndDeduplicate(request: PostProcessRequest, transformations: Transformation[]): PostProcessRequest {
    const result = { ...request };

    const generalizationPatterns: Array<[RegExp, string]> = [
      [/Restaurang\s+[A-ZÅÄÖ][a-zåäö]+(?:(?:\s*(?:,|och)\s*)Restaurang\s+[A-ZÅÄÖ][a-zåäö]+)*/gi, 'restauranger'],
      [/Kafé\s+[A-ZÅÄÖ][a-zåäö]+(?:(?:\s*(?:,|och)\s*)Kafé\s+[A-ZÅÄÖ][a-zåäö]+)*/gi, 'kaféer'],
      [/Butik\s+[A-ZÅÄÖ][a-zåäö]+(?:(?:\s*(?:,|och)\s*)Butik\s+[A-ZÅÄÖ][a-zåäö]+)*/gi, 'butiker']
    ];

    for (const field of ['improvedPrompt', 'socialCopy', 'instagramCaption'] as const) {
      let text = result[field];

      for (const [pattern, replacement] of generalizationPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          text = text.replace(pattern, replacement);
          matches.forEach(match => transformations.push({ type: 'generalization', field, before: match, after: replacement }));
        }
      }

      // Deduplicate repeated comma-separated words: "ord, ord, ord" -> "ord"
      const dedupeMatches = text.match(/\b(\w+)\b(?:,\s*\1\b)+/gi);
      if (dedupeMatches) {
        text = text.replace(/\b(\w+)\b(?:,\s*\1\b)+/gi, (_, word) => word);
        dedupeMatches.forEach(match => {
          const word = match.split(',')[0].trim();
          transformations.push({ type: 'generalization', field, before: match, after: word });
        });
      }

      result[field] = text;
    }

    return result;
  }

  private checkNarrativeIntegrity(request: PostProcessRequest, transformations: Transformation[]): PostProcessRequest {
    const result = { ...request };

    for (const field of TEXT_FIELDS) {
      const originalText = result[field];

      try {
        let text = this.fixMissingBulletPoints(originalText, field, transformations);
        text = this.fixIncompleteSentences(text, field, transformations);
        // Headlines should not have periods added — applyFormatting already removes them
        if (field !== 'headline') {
          text = this.fixAbruptEndings(text, field, transformations);
        }
        result[field] = text;
      } catch (error) {
        console.warn(`Narrative integrity check failed for ${field}:`, {
          error: error instanceof Error ? error.message : String(error)
        });
        result[field] = originalText;
      }
    }

    return result;
  }

  private fixIncompleteSentences(text: string, field: string, transformations: Transformation[]): string {
    let result = text;

    // Only fix lines that end with a comma or dash (clearly incomplete)
    const before1 = result;
    result = result.replace(/([a-zåäö]+)[,\-]\s*$/gm, (_, w) => `${w}.`);
    if (result !== before1) {
      transformations.push({ type: 'narrative_integrity', field, before: 'Incomplete sentence ending', after: 'Added proper punctuation' });
    }

    // NOTE: The broad ([a-zåäö])\s+([A-ZÅÄÖ]) pattern has been intentionally removed.
    // It was creating broken sentences by inserting periods before proper nouns,
    // brand names (Siemens), place names (Mörtnäs), and mid-sentence capitalized words.
    // Period placement is the generator's responsibility — the post-processor must not guess.

    // Detect sentence fragments: very short sentences (1-2 words) after a period
    const sentences = result.split(/(?<=[.!?])\s+/);
    const hasFragment = sentences.some(s => {
      const words = s.trim().split(/\s+/).filter(Boolean);
      return words.length >= 1 && words.length <= 2 && /^[A-ZÅÄÖ]/.test(s.trim());
    });
    if (hasFragment) {
      transformations.push({ type: 'narrative_integrity', field, before: 'Detected sentence fragments', after: 'Fragment detected, manual review needed' });
    }

    return result;
  }

  private fixMissingBulletPoints(text: string, field: string, transformations: Transformation[]): string {
    let result = text;

    // Match "X: item, item," pattern (list ending with comma, possibly at end of string or line)
    const before1 = result;
    result = result.replace(/:\s*([a-zåäöA-ZÅÄÖ][^.!?]*[,])\s*$/gm, (_, list) => `: ${list.replace(/,\s*$/, '')} och mer.`);
    if (result !== before1) {
      transformations.push({ type: 'narrative_integrity', field, before: 'Incomplete list', after: 'Completed list with proper ending' });
    }

    const before2 = result;
    result = result.replace(/^[-\u2022]\s*([a-zåäö])/gm, (match, firstChar) => match.replace(firstChar, firstChar.toUpperCase()));
    if (result !== before2) {
      transformations.push({ type: 'narrative_integrity', field, before: 'Bullet points with lowercase start', after: 'Capitalized bullet points' });
    }

    return result;
  }

  private fixAbruptEndings(text: string, field: string, transformations: Transformation[]): string {
    let result = text.trim();

    if (result.length > 0 && !/[.!?]$/.test(result)) {
      result = result + '.';
      transformations.push({ type: 'narrative_integrity', field, before: 'Text ending without punctuation', after: 'Added period at end' });
    }

    const lastSentence = result.split(/[.!?]/).filter(s => s.trim().length > 0).pop()?.trim() || '';
    const words = lastSentence.split(/\s+/).filter(Boolean);
    const suspiciousEndings = new Set(['ett', 'en', 'och', 'med', 'i', 'på', 'till', 'från', 'av', 'för', 'har', 'är']);
    const lastWord = words[words.length - 1]?.toLowerCase().replace(/[.!?]$/, '');
    if (words.length > 0 && words.length < 5 && suspiciousEndings.has(lastWord)) {
      transformations.push({ type: 'narrative_integrity', field, before: `Abrupt ending detected: "${lastSentence}"`, after: 'Detected, manual review needed' });
    }

    const before = result;
    result = result.replace(/\s+(och|eller|men|samt)\s*\.?$/i, '.');
    if (result !== before) {
      transformations.push({ type: 'narrative_integrity', field, before: 'Text ending with conjunction', after: 'Removed trailing conjunction' });
    }

    return result;
  }

  private addMissingFacts(
    request: PostProcessRequest,
    disposition: any,
    transformations: Transformation[]
  ): PostProcessRequest {
    const result = { ...request };
    let text = result.improvedPrompt;
    const platform = request.platform?.toLowerCase() || 'hemnet';

    try {
      const energiklassValue = disposition?.energiklass || disposition?.property?.energiklass;
      // Hemnet forbids energiklass in main text — it's shown separately in the listing
      if (energiklassValue && !/energiklass/i.test(text) && platform !== 'hemnet') {
        text = this.insertBeforeLastSentence(text, `Bostaden har energiklass ${energiklassValue}.`);
        transformations.push({ type: 'missing_facts', field: 'improvedPrompt', before: 'Missing energiklass', after: `Added energiklass ${energiklassValue}` });
      }

      const värmesystemValue: string | undefined = disposition?.värmesystem || disposition?.property?.värmesystem || disposition?.heating;
      if (värmesystemValue && !/värme|uppvärmning/i.test(text)) {
        text = this.insertBeforeLastSentence(text, `Uppvärmning sker med ${värmesystemValue.toLowerCase()}.`);
        transformations.push({ type: 'missing_facts', field: 'improvedPrompt', before: 'Missing värmesystem', after: `Added värmesystem ${värmesystemValue}` });
      }

      result.improvedPrompt = text;
    } catch (error) {
      console.warn('Failed to add missing facts:', { error: error instanceof Error ? error.message : String(error) });
      result.improvedPrompt = request.improvedPrompt;
    }

    return result;
  }

  private insertBeforeLastSentence(text: string, sentence: string): string {
    const trimmed = text.trim();
    const lastPeriod = trimmed.lastIndexOf('.');
    if (lastPeriod <= 0) return `${trimmed} ${sentence}`;
    const beforeLast = trimmed.slice(0, lastPeriod + 1);
    const lastPart = trimmed.slice(lastPeriod + 1).trim();
    return lastPart ? `${beforeLast} ${sentence} ${lastPart}` : `${beforeLast} ${sentence}`;
  }

  private logTransformations(transformations: Transformation[]): void {
    if (transformations.length === 0) return;

    console.log('Post-processing transformations:', {
      count: transformations.length,
      byType: transformations.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
  }
}
