import { WritingStyle } from './text-rules';
import * as Sentry from '@sentry/node';

export interface FallbackRequest {
  disposition: any;
  style: WritingStyle;
  platform: string;
  userId: string;
  sessionId: string;
  originalError: Error;
}

export interface FallbackResult {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  isFallback: true;
  fallbackReason: string;
  metrics: {
    totalDuration: number;
    success: boolean;
    timestamp: Date;
  };
}

/**
 * Emergency fallback text generator using deterministic templates.
 * Used when the main AI pipeline fails completely after all retries.
 * 
 * This ensures text generation never completely fails - we always return
 * valid broker text even if it's template-based rather than AI-generated.
 */
export class PerfectSwedishFallback {
  /**
   * Generate emergency fallback text using deterministic templates.
   * 
   * @param request - Fallback generation request with disposition and context
   * @returns Valid broker text generated from templates
   */
  generate(request: FallbackRequest): FallbackResult {
    const startTime = Date.now();

    try {
      // Generate main text using deterministic template
      const improvedPrompt = buildDeterministicFallbackDescription(
        request.disposition,
        request.style
      );

      // Generate auxiliary fields
      const headline = this.generateFallbackHeadline(request.disposition);
      const socialCopy = this.generateFallbackSocialCopy(request.disposition, improvedPrompt);
      const instagramCaption = this.generateFallbackInstagramCaption(request.disposition, improvedPrompt);
      const showingInvitation = this.generateFallbackShowingInvitation();
      const shortAd = this.generateFallbackShortAd(request.disposition);

      const duration = Date.now() - startTime;

      return {
        improvedPrompt,
        headline,
        socialCopy,
        instagramCaption,
        showingInvitation,
        shortAd,
        isFallback: true,
        fallbackReason: request.originalError.message,
        metrics: {
          totalDuration: duration,
          success: true,
          timestamp: new Date()
        }
      };
    } catch (error) {
      // Even fallback failed - this is critical
      const duration = Date.now() - startTime;
      
      Sentry.captureException(error, {
        level: 'fatal',
        tags: {
          component: 'perfect-swedish-fallback',
          fallback_failed: 'true'
        },
        extra: {
          userId: request.userId,
          sessionId: request.sessionId,
          originalError: request.originalError.message,
          fallbackError: error instanceof Error ? error.message : String(error)
        }
      });

      throw new Error(
        'Både huvudgenerering och reservgenerering misslyckades. ' +
        'Kontakta support omedelbart.'
      );
    }
  }

  private generateFallbackHeadline(disposition: any): string {
    const property = disposition?.property || {};
    const propertyType = formatFallbackValue(property.type) || 'bostad';
    const rooms = formatFallbackValue(property.rooms);
    const area = formatFallbackValue(property.living_area || property.area);
    
    const parts: string[] = [];
    
    if (propertyType) {
      parts.push(propertyType.charAt(0).toUpperCase() + propertyType.slice(1));
    }
    
    if (rooms) {
      parts.push(`${rooms} rum`);
    }
    
    if (area) {
      parts.push(`${area} kvm`);
    }
    
    // Max 9 words, no punctuation
    return parts.join(' ').slice(0, 100);
  }

  private generateFallbackSocialCopy(disposition: any, mainText: string): string {
    // Extract first sentence from main text as social copy
    const firstSentence = mainText.split('.')[0] + '.';
    
    // Add "Läs mer i annonsen." if space allows
    if (firstSentence.length < 200) {
      return firstSentence + ' Läs mer i annonsen.';
    }
    
    return firstSentence;
  }

  private generateFallbackInstagramCaption(disposition: any, mainText: string): string {
    // Use first two sentences from main text
    const sentences = mainText.split('.').slice(0, 2);
    const caption = sentences.join('.') + '.';
    
    // Add emoji if property has outdoor space
    const property = disposition?.property || {};
    const hasOutdoor = property.outdoor_space || property.balcony;
    
    if (hasOutdoor) {
      return '🏡 ' + caption;
    }
    
    return caption;
  }

  private generateFallbackShowingInvitation(): string {
    // Simple, professional showing invitation
    return 'Välkommen på visning. Kontakta mäklaren för mer information.';
  }

  private generateFallbackShortAd(disposition: any): string {
    const property = disposition?.property || {};
    const propertyType = formatFallbackValue(property.type) || 'bostad';
    const rooms = formatFallbackValue(property.rooms);
    const area = formatFallbackValue(property.living_area || property.area);
    
    let ad = `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}`;
    
    if (rooms && area) {
      ad += ` om ${rooms} rum och ${area} kvm`;
    } else if (area) {
      ad += ` om ${area} kvm`;
    }
    
    ad += '.';
    
    return ad;
  }
}

// ============================================================================
// Helper Functions (Migrated from routes.ts)
// ============================================================================

/**
 * Format a value for use in fallback text.
 * Returns null for invalid/empty values, string representation otherwise.
 */
function formatFallbackValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
}

/**
 * Convert string to sentence case (first letter uppercase).
 */
function toSentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Normalize location item by removing parentheses and extra spaces.
 */
function normalizeFallbackLocationItem(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Build a grammatically correct location sentence from location data.
 */
function buildFallbackLocationSentence(
  area: string | null,
  municipality: string | null,
  transport: string | null,
  amenities: string[],
  services: string[]
): string {
  const cleanedAmenities = amenities
    .map(normalizeFallbackLocationItem)
    .filter(Boolean)
    .slice(0, 2);
  const cleanedServices = services
    .map(normalizeFallbackLocationItem)
    .filter(Boolean)
    .slice(0, 2);

  const areaLabel = area || municipality;
  const locationSentences: string[] = [];

  if (areaLabel && transport) {
    locationSentences.push(`${toSentenceCase(areaLabel)} har ${transport.charAt(0).toLowerCase() + transport.slice(1)}.`);
  } else if (transport) {
    locationSentences.push(`Kommunikationerna nås med ${transport.charAt(0).toLowerCase() + transport.slice(1)}.`);
  } else if (areaLabel) {
    locationSentences.push(`${toSentenceCase(areaLabel)} ger ett vardagsnära läge med service inom bekvämt räckhåll.`);
  }

  const nearby = [...cleanedAmenities, ...cleanedServices].filter(Boolean).slice(0, 3);
  if (nearby.length === 1) {
    locationSentences.push(`I närområdet finns bland annat ${nearby[0]}.`);
  } else if (nearby.length === 2) {
    locationSentences.push(`I närområdet finns bland annat ${nearby[0]} och ${nearby[1]}.`);
  } else if (nearby.length >= 3) {
    locationSentences.push(`I närområdet finns bland annat ${nearby.slice(0, -1).join(', ')} och ${nearby[nearby.length - 1]}.`);
  }

  if (municipality && municipality !== areaLabel) {
    locationSentences.push(`${municipality} bidrar med ytterligare service och utbud i vardagen.`);
  }

  return locationSentences.join(' ').trim();
}

/**
 * Build deterministic fallback description from property disposition.
 * This is the core fallback template that generates grammatically correct Swedish
 * broker text when the AI pipeline fails.
 * 
 * Migrated from routes.ts - preserves exact logic to ensure consistent output.
 */
function buildDeterministicFallbackDescription(disposition: any, style: WritingStyle): string {
  const property = disposition?.property || {};
  const location = disposition?.location || {};
  const financial = disposition?.financial || {};
  const propertyType = formatFallbackValue(property.type) || 'bostad';
  const address = formatFallbackValue(property.address) || formatFallbackValue(location.address) || 'Bostaden';
  const rooms = formatFallbackValue(property.rooms);
  const livingArea = formatFallbackValue(property.living_area || property.area || property.size);
  const outdoorType = formatFallbackValue(property.outdoor_space?.type) || formatFallbackValue(property.balcony?.type) || (property.balcony?.exists ? 'balkong' : null);
  const outdoorDirection = formatFallbackValue(property.outdoor_space?.direction) || formatFallbackValue(property.balcony?.direction);
  const outdoorSize = formatFallbackValue(property.outdoor_space?.size) || formatFallbackValue(property.balcony?.size);
  const kitchen = formatFallbackValue(property.materials?.kitchen);
  const bathroom = formatFallbackValue(property.materials?.bathroom);
  const layout = formatFallbackValue(property.layout);
  const renovations = Array.isArray(property.renovations) ? property.renovations.filter((item: unknown) => typeof item === 'string' && item.trim()).slice(0, 2) : [];
  const features = Array.isArray(disposition?.unique_features) ? disposition.unique_features.filter((item: unknown) => typeof item === 'string' && item.trim()).slice(0, 3) : [];
  const amenities = Array.isArray(location.amenities) ? location.amenities.filter((item: unknown) => typeof item === 'string' && item.trim()).slice(0, 2) : [];
  const services = Array.isArray(location.services) ? location.services.filter((item: unknown) => typeof item === 'string' && item.trim()).slice(0, 2) : [];
  const transport = formatFallbackValue(location.transport);
  const municipality = formatFallbackValue(location.municipality);
  const area = formatFallbackValue(location.area);
  const fee = typeof financial.fee === 'number' && Number.isFinite(financial.fee) ? `${Math.round(financial.fee).toLocaleString('sv-SE')} kr/mån` : formatFallbackValue(financial.fee);

  const propertyTypeLabel = `${propertyType.charAt(0).toUpperCase()}${propertyType.slice(1)}`;
  let opening = `${propertyTypeLabel}${livingArea ? ` om ${livingArea} kvm` : ''}${rooms ? ` med ${rooms} rum` : ''}${address ? ` på ${address}` : ''}`;

  if (style === 'selling') {
    if (outdoorType && outdoorDirection) {
      opening += `. Här bor du med ${outdoorType} i ${outdoorDirection.toLowerCase()} och en planlösning som tar vara på bostadens bästa kvaliteter.`;
    } else {
      opening += `. Här möts funktion och trivsel i en välplanerad bostad med starka kvaliteter redan från första steget in.`;
    }
  } else if (style === 'factual') {
    opening += `. ${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} med genomgående disponerade ytor.`;
  } else {
    if (outdoorType && outdoorDirection) {
      opening += `. Bostaden kombinerar välplanerade ytor med ${outdoorType} i ${outdoorDirection.toLowerCase()}.`;
    } else {
      opening += `. Bostaden har en planlösning som ger ett naturligt flöde mellan rummen.`;
    }
  }

  const middleSentences: string[] = [];
  if (layout) middleSentences.push(`Planlösningen samlar ${layout.charAt(0).toLowerCase() + layout.slice(1)} i ett genomtänkt flöde mellan rummen.`);
  if (kitchen) middleSentences.push(`Köket är utfört med ${kitchen.charAt(0).toLowerCase() + kitchen.slice(1)}.`);
  if (bathroom) middleSentences.push(`Badrummet är inrett med ${bathroom.charAt(0).toLowerCase() + bathroom.slice(1)}.`);
  if (renovations.length > 0) middleSentences.push(`Under senare år har bostaden uppdaterats med ${renovations.join(' och ')}.`);
  if (features.length > 0) {
    // Build grammatically correct sentence for features (which are typically adjectives)
    const featureList = features.join(' och ');
    middleSentences.push(`Bostaden är ${featureList}.`);
  }

  const outdoorParts: string[] = [];
  if (outdoorType) outdoorParts.push(outdoorType);
  if (outdoorSize) outdoorParts.push(`${outdoorSize}`);
  if (outdoorDirection) outdoorParts.push(`i ${outdoorDirection.toLowerCase()}`);
  if (outdoorParts.length > 0) {
    middleSentences.push(`Utomhus finns ${outdoorParts.join(' ')} som förlänger bostaden under den varmare delen av året.`);
  }

  const locationProse = buildFallbackLocationSentence(area, municipality, transport, amenities, services);

  let closing = '';
  if (locationProse && fee) {
    closing = `${locationProse} Avgiften uppgår till ${fee}.`;
  } else if (locationProse) {
    closing = locationProse;
  } else if (fee) {
    closing = `Avgiften uppgår till ${fee}.`;
  } else {
    closing = 'Bostaden presenteras med fokus på planlösning, funktion och de kvaliteter som märks i vardagen.';
  }

  const paragraphs = [
    opening,
    middleSentences.join(' ').trim(),
    closing,
  ].filter((paragraph) => paragraph && paragraph.trim());

  return paragraphs.join('\n\n').trim();
}

// Export for use in routes.ts and tests
export { buildDeterministicFallbackDescription };
