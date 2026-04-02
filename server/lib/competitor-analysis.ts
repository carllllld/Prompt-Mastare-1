import { fetchHemnetProperty } from "./hemnet-integration";

/**
 * Competitor Analysis Library
 * 
 * Analyzes similar properties in the area to provide market insights
 * and suggestions for differentiation.
 */

interface PropertyData {
  address: string;
  price: number;
  livingArea: number;
  rooms: number;
  propertyType: string;
  location?: {
    lat?: number;
    lon?: number;
    city?: string;
    area?: string;
  };
}

interface CompetitorProperty {
  address: string;
  price: number;
  livingArea: number;
  rooms: number;
  pricePerSqm: number;
  textLength: number;
  usps: string[];
  url: string;
}

interface CompetitorAnalysis {
  count: number;
  avgPrice: number;
  avgPricePerSqm: number;
  avgTextLength: number;
  priceComparison: "högre" | "lägre" | "genomsnitt";
  pricePercentDiff: number;
  commonUSPs: string[];
  suggestions: string[];
  competitors: CompetitorProperty[];
}

/**
 * Extract USPs from property text
 */
function extractUSPs(text: string): string[] {
  const usps: string[] = [];
  
  // Common USP patterns
  const patterns = [
    /balkong/i,
    /utsikt/i,
    /renoverat/i,
    /nyproduktion/i,
    /hög standard/i,
    /nära (pendel|tunnelbana|kommunikation)/i,
    /söderläge/i,
    /lugnt läge/i,
    /centralt/i,
    /parkering/i,
    /garage/i,
    /hiss/i,
    /inglasad balkong/i,
    /öppen planlösning/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        usps.push(match[0].toLowerCase());
      }
    }
  }

  return [...new Set(usps)]; // Remove duplicates
}

/**
 * Generate differentiation suggestions based on competitor analysis
 */
function generateSuggestions(
  property: PropertyData,
  competitors: CompetitorProperty[]
): string[] {
  const suggestions: string[] = [];

  // Price positioning
  const avgPrice = competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;
  const priceDiff = ((property.price - avgPrice) / avgPrice) * 100;

  if (priceDiff > 10) {
    suggestions.push(
      `Ditt pris är ${Math.round(priceDiff)}% högre än genomsnittet. Motivera priset med unika egenskaper eller hög standard.`
    );
  } else if (priceDiff < -10) {
    suggestions.push(
      `Ditt pris är ${Math.abs(Math.round(priceDiff))}% lägre än genomsnittet. Lyft fram prisvärdet som en fördel.`
    );
  }

  // Text length
  const avgTextLength = competitors.reduce((sum, c) => sum + c.textLength, 0) / competitors.length;
  if (avgTextLength < 300) {
    suggestions.push(
      `Konkurrenterna har korta texter (${Math.round(avgTextLength)} ord). Skriv en längre, mer detaljerad text för att sticka ut.`
    );
  }

  // Common USPs
  const allUSPs = competitors.flatMap(c => c.usps);
  const uspCounts = allUSPs.reduce((acc, usp) => {
    acc[usp] = (acc[usp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const commonUSPs = Object.entries(uspCounts)
    .filter(([_, count]) => count >= competitors.length * 0.5)
    .map(([usp]) => usp);

  if (commonUSPs.length > 0) {
    suggestions.push(
      `Vanliga försäljningsargument i området: ${commonUSPs.join(", ")}. Hitta unika vinklar som skiljer sig.`
    );
  }

  // Location-specific suggestions
  if (property.location?.city) {
    suggestions.push(
      `Betona läget i ${property.location.city} och närhet till lokala attraktioner.`
    );
  }

  // Property type specific
  if (property.propertyType === "apartment") {
    suggestions.push(
      "För lägenheter: Lyft fram BRF-ekonomi, avgift, och gemensamma utrymmen."
    );
  } else if (property.propertyType === "house") {
    suggestions.push(
      "För hus: Fokusera på tomt, trädgård, och möjligheter till utbyggnad."
    );
  }

  return suggestions;
}

/**
 * Analyze competitors in the area
 * 
 * Note: This is a simplified implementation. In production, you would:
 * 1. Use Hemnet API to search for similar properties
 * 2. Filter by location radius (e.g., 500m)
 * 3. Filter by property type and size
 * 4. Scrape or fetch property details
 */
export async function analyzeCompetitors(
  property: PropertyData
): Promise<CompetitorAnalysis> {
  // Mock competitor data for demonstration
  // In production, this would fetch real data from Hemnet API
  const mockCompetitors: CompetitorProperty[] = [
    {
      address: "Parkgatan 5, Stockholm",
      price: 2800000,
      livingArea: 75,
      rooms: 3,
      pricePerSqm: 37333,
      textLength: 280,
      usps: ["balkong", "renoverat", "centralt"],
      url: "https://hemnet.se/...",
    },
    {
      address: "Strandvägen 12, Stockholm",
      price: 3200000,
      livingArea: 82,
      rooms: 3,
      pricePerSqm: 39024,
      textLength: 320,
      usps: ["utsikt", "hög standard", "parkering"],
      url: "https://hemnet.se/...",
    },
    {
      address: "Kungsgatan 8, Stockholm",
      price: 2600000,
      livingArea: 70,
      rooms: 2,
      pricePerSqm: 37143,
      textLength: 250,
      usps: ["centralt", "nära tunnelbana", "renoverat"],
      url: "https://hemnet.se/...",
    },
  ];

  const competitors = mockCompetitors;
  const count = competitors.length;

  // Calculate averages
  const avgPrice = competitors.reduce((sum, c) => sum + c.price, 0) / count;
  const avgPricePerSqm = competitors.reduce((sum, c) => sum + c.pricePerSqm, 0) / count;
  const avgTextLength = competitors.reduce((sum, c) => sum + c.textLength, 0) / count;

  // Price comparison
  const pricePercentDiff = ((property.price - avgPrice) / avgPrice) * 100;
  let priceComparison: "högre" | "lägre" | "genomsnitt";
  if (pricePercentDiff > 5) {
    priceComparison = "högre";
  } else if (pricePercentDiff < -5) {
    priceComparison = "lägre";
  } else {
    priceComparison = "genomsnitt";
  }

  // Common USPs
  const allUSPs = competitors.flatMap(c => c.usps);
  const uspCounts = allUSPs.reduce((acc, usp) => {
    acc[usp] = (acc[usp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const commonUSPs = Object.entries(uspCounts)
    .filter(([_, count]) => count >= count * 0.5)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([usp]) => usp);

  // Generate suggestions
  const suggestions = generateSuggestions(property, competitors);

  return {
    count,
    avgPrice,
    avgPricePerSqm,
    avgTextLength,
    priceComparison,
    pricePercentDiff,
    commonUSPs,
    suggestions,
    competitors,
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("sv-SE").format(price) + " kr";
}

/**
 * Format price per sqm for display
 */
export function formatPricePerSqm(pricePerSqm: number): string {
  return new Intl.NumberFormat("sv-SE").format(Math.round(pricePerSqm)) + " kr/kvm";
}
