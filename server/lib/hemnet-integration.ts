/**
 * Hemnet Integration
 *
 * Fetches property data from Hemnet listing URLs.
 * Hemnet does not have a public API, so we parse the structured JSON-LD
 * (schema.org/RealEstateListing) embedded in every listing page, plus
 * the __NEXT_DATA__ / window.__INITIAL_STATE__ blobs that Hemnet injects.
 *
 * This is read-only (import only) — we never write to Hemnet.
 */

import * as Sentry from "@sentry/node";
import { downloadImages, getCacheKey } from "./image-downloader";

export interface HemnetProperty {
  id: string;
  url: string;
  address: string;
  city: string;
  district?: string;
  propertyType: string;
  livingArea?: number;
  biArea?: number;
  lotArea?: number;
  rooms?: number;
  floor?: string;
  totalFloors?: number;
  hasElevator?: boolean;
  yearBuilt?: number;
  condition?: string;
  energyClass?: string;
  monthlyFee?: number;
  askingPrice?: number;
  brfName?: string;
  description?: string;
  kitchenDescription?: string;
  bathroomDescription?: string;
  layoutDescription?: string;
  balconyArea?: number;
  balconyDirection?: string;
  parking?: string;
  storage?: string;
  heating?: string;
  flooring?: string;
  view?: string;
  transport?: string;
  imageUrls?: string[]; // Hemnet image URLs
  brokerName?: string;
  brokerAgency?: string;
  showingDate?: string;
  accessDate?: string;
  rawData?: Record<string, any>;
}

// Validates that a URL is a Hemnet listing URL
export function isHemnetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === "www.hemnet.se" || parsed.hostname === "hemnet.se") &&
      /\/bostader\//.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

// Extracts the Hemnet listing ID from a URL
export function extractHemnetId(url: string): string | null {
  const match = url.match(/\/bostader\/[^/]+-(\d+)(?:\?|$|\/)/);
  return match ? match[1] : null;
}

// Maps Hemnet property type strings to Mäklartexter types
function mapHemnetPropertyType(raw: string): string {
  const t = (raw || "").toLowerCase();
  if (t.includes("lägenhet") || t.includes("bostadsrätt")) return "apartment";
  if (t.includes("villa")) return "villa";
  if (t.includes("radhus") || t.includes("kedjehus") || t.includes("parhus")) return "townhouse";
  if (t.includes("hus") || t.includes("fritidshus")) return "house";
  return "apartment";
}

// Parses JSON-LD schema.org/RealEstateListing from HTML
function extractJsonLd(html: string): Record<string, any> | null {
  const matches = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of matches) {
    try {
      const data = JSON.parse(match[1]);
      if (data["@type"] === "RealEstateListing" || data["@type"] === "Apartment" || data["@type"] === "House") {
        return data;
      }
      // Sometimes it's an array
      if (Array.isArray(data)) {
        const listing = data.find((d: any) =>
          ["RealEstateListing", "Apartment", "House", "SingleFamilyResidence"].includes(d["@type"])
        );
        if (listing) return listing;
      }
    } catch {
      // skip malformed JSON
    }
  }
  return null;
}

// Extracts Hemnet's __NEXT_DATA__ blob which contains full property details
function extractNextData(html: string): Record<string, any> | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// Digs into Hemnet's Next.js page props to find the property object
function findPropertyInNextData(nextData: Record<string, any>): Record<string, any> | null {
  try {
    const props = nextData?.props?.pageProps;
    if (!props) return null;
    // Hemnet uses different keys depending on listing type
    return (
      props.listing ||
      props.property ||
      props.home ||
      props.estate ||
      props.data?.listing ||
      props.data?.property ||
      null
    );
  } catch {
    return null;
  }
}

// Parses energy class from various Hemnet formats
function parseEnergyClass(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/[A-G]/i);
  return match ? match[0].toUpperCase() : undefined;
}

// Parses a number from Swedish-formatted strings like "3 500 000 kr" or "3 500 kr/mån"
function parseSwedishNumber(raw: string | number | undefined): number | undefined {
  if (typeof raw === "number") return raw;
  if (!raw) return undefined;
  const cleaned = String(raw).replace(/[^\d]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? undefined : n;
}

// Combines all extracted data into a HemnetProperty
function buildHemnetProperty(
  url: string,
  jsonLd: Record<string, any> | null,
  nextProp: Record<string, any> | null
): HemnetProperty {
  const raw = { ...(jsonLd || {}), ...(nextProp || {}) };

  const address =
    nextProp?.streetAddress ||
    nextProp?.address?.streetAddress ||
    jsonLd?.address?.streetAddress ||
    jsonLd?.name ||
    "";

  const city =
    nextProp?.city ||
    nextProp?.address?.addressLocality ||
    jsonLd?.address?.addressLocality ||
    "";

  const district =
    nextProp?.district ||
    nextProp?.area?.name ||
    nextProp?.location?.district ||
    jsonLd?.address?.addressRegion ||
    undefined;

  const imageUrls: string[] = [];
  if (Array.isArray(nextProp?.images)) {
    for (const img of nextProp.images) {
      const src = typeof img === "string" ? img : img?.url || img?.src || img?.large || img?.original;
      if (src) imageUrls.push(src);
    }
  }
  if (Array.isArray(jsonLd?.image)) {
    for (const img of jsonLd.image) {
      const src = typeof img === "string" ? img : img?.url;
      if (src && !imageUrls.includes(src)) imageUrls.push(src);
    }
  }

  const id = extractHemnetId(url) || nextProp?.id || nextProp?.listingId || "";

  return {
    id: String(id),
    url,
    address,
    city,
    district,
    propertyType: mapHemnetPropertyType(
      nextProp?.propertyType ||
      nextProp?.housingForm?.name ||
      jsonLd?.["@type"] ||
      ""
    ),
    livingArea: parseSwedishNumber(nextProp?.livingArea || nextProp?.area || jsonLd?.floorSize?.value),
    biArea: parseSwedishNumber(nextProp?.biArea || nextProp?.supplementaryArea),
    lotArea: parseSwedishNumber(nextProp?.lotArea || nextProp?.plotArea || jsonLd?.lotSize?.value),
    rooms: parseSwedishNumber(nextProp?.rooms || nextProp?.numberOfRooms || jsonLd?.numberOfRooms),
    floor: nextProp?.floor != null ? String(nextProp.floor) : undefined,
    totalFloors: parseSwedishNumber(nextProp?.totalFloors || nextProp?.numberOfFloors),
    hasElevator: nextProp?.elevator === true || nextProp?.hasElevator === true,
    yearBuilt: parseSwedishNumber(nextProp?.constructionYear || nextProp?.yearBuilt || jsonLd?.yearBuilt),
    condition: nextProp?.condition || nextProp?.propertyCondition || undefined,
    energyClass: parseEnergyClass(nextProp?.energyClass || nextProp?.energyRating),
    monthlyFee: parseSwedishNumber(nextProp?.fee || nextProp?.monthlyFee || nextProp?.avgift),
    askingPrice: parseSwedishNumber(nextProp?.askingPrice || nextProp?.price || jsonLd?.price),
    brfName: nextProp?.housingCooperative?.name || nextProp?.brfName || nextProp?.associationName || undefined,
    description: nextProp?.description || nextProp?.objectDescription || jsonLd?.description || undefined,
    kitchenDescription: nextProp?.kitchen || nextProp?.kitchenDescription || undefined,
    bathroomDescription: nextProp?.bathroom || nextProp?.bathroomDescription || undefined,
    layoutDescription: nextProp?.layout || nextProp?.floorPlan || nextProp?.layoutDescription || undefined,
    balconyArea: parseSwedishNumber(nextProp?.balconyArea || nextProp?.balconySize),
    balconyDirection: nextProp?.balconyDirection || nextProp?.patioOrientation || undefined,
    parking: nextProp?.parking || nextProp?.parkingDescription || undefined,
    storage: nextProp?.storage || nextProp?.storageDescription || undefined,
    heating: nextProp?.heating || nextProp?.heatingSystem || undefined,
    flooring: nextProp?.flooring || nextProp?.floorMaterial || undefined,
    view: nextProp?.view || nextProp?.utsikt || undefined,
    transport: nextProp?.transport || nextProp?.communications || undefined,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    brokerName: nextProp?.broker?.name || nextProp?.agent?.name || undefined,
    brokerAgency: nextProp?.broker?.agency || nextProp?.agency?.name || undefined,
    showingDate: nextProp?.showingDate || nextProp?.viewingDate || undefined,
    accessDate: nextProp?.accessDate || nextProp?.tilltradesdag || nextProp?.possessionDate || undefined,
    rawData: raw,
  };
}

// Converts a HemnetProperty to Mäklartexter's propertyData format
export function mapHemnetPropertyToMaklartexter(prop: HemnetProperty): Record<string, any> {
  // Convert image URLs to cache URLs
  const imageUrls = prop.imageUrls?.map((url) => {
    const cacheKey = getCacheKey(url);
    return `/api/integrations/hemnet/image/${cacheKey}`;
  });

  return {
    propertyType: prop.propertyType,
    address: [prop.address, prop.city].filter(Boolean).join(", "),
    area: prop.district || prop.city || "",
    livingArea: prop.livingArea,
    biarea: prop.biArea,
    lotArea: prop.lotArea,
    totalRooms: prop.rooms,
    floors: prop.totalFloors,
    floor: prop.floor,
    elevator: prop.hasElevator,
    buildYear: prop.yearBuilt,
    condition: prop.condition,
    energyClass: prop.energyClass,
    monthlyFee: prop.monthlyFee,
    price: prop.askingPrice,
    brfName: prop.brfName,
    description: prop.description,
    kitchenDescription: prop.kitchenDescription,
    bathroomDescription: prop.bathroomDescription,
    layoutDescription: prop.layoutDescription,
    balconyArea: prop.balconyArea,
    balconyDirection: prop.balconyDirection,
    parking: prop.parking,
    storage: prop.storage,
    heating: prop.heating,
    flooring: prop.flooring,
    view: prop.view,
    transport: prop.transport,
    neighborhood: prop.district,
    maklarnamn: prop.brokerName,
    visningstid: prop.showingDate,
    tilltradesdag: prop.accessDate,
    imageUrls,
    // Source metadata
    _source: "hemnet",
    _sourceId: prop.id,
    _sourceUrl: prop.url,
  };
}

export async function fetchHemnetProperty(
  url: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<HemnetProperty> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchHemnetPropertyInternal(url);
    } catch (err) {
      lastError = err;

      // Check if it's a rate limit error
      if (err instanceof HemnetRateLimitError && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(
          `[Hemnet] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Don't retry on other errors
      throw err;
    }
  }

  throw lastError || new HemnetError("Failed to fetch Hemnet property");
}

async function fetchHemnetPropertyInternal(url: string): Promise<HemnetProperty> {
  if (!isHemnetUrl(url)) {
    throw new HemnetError("Ogiltig Hemnet-URL. URL:en måste vara en hemnet.se/bostader/-länk.");
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (res.status === 404) {
      throw new HemnetNotFoundError("Hemnet-annonsen hittades inte. Den kan ha tagits bort.");
    }
    if (res.status === 403 || res.status === 429) {
      throw new HemnetRateLimitError("Hemnet blockerade förfrågan. Försök igen om en stund.");
    }
    if (!res.ok) {
      throw new HemnetError(`Hemnet svarade med statuskod ${res.status}`);
    }

    html = await res.text();
  } catch (err) {
    if (err instanceof HemnetError) throw err;
    Sentry.captureException(err, { tags: { integration: "hemnet", action: "fetch" } });
    throw new HemnetError(`Kunde inte hämta Hemnet-sidan: ${(err as Error).message}`);
  }

  const jsonLd = extractJsonLd(html);
  const nextData = extractNextData(html);
  const nextProp = nextData ? findPropertyInNextData(nextData) : null;

  if (!jsonLd && !nextProp) {
    throw new HemnetParseError(
      "Kunde inte läsa objektdata från Hemnet-sidan. Hemnet kan ha ändrat sin struktur."
    );
  }

  const property = buildHemnetProperty(url, jsonLd, nextProp);

  // Download images in parallel with caching (non-blocking)
  if (property.imageUrls && property.imageUrls.length > 0) {
    downloadImages(property.imageUrls).catch((err) => {
      Sentry.captureException(err, { tags: { integration: "hemnet", action: "downloadImages" } });
    });
  }

  return property;
}

export class HemnetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HemnetError";
  }
}
export class HemnetNotFoundError extends HemnetError {
  constructor(message: string) {
    super(message);
    this.name = "HemnetNotFoundError";
  }
}
export class HemnetRateLimitError extends HemnetError {
  constructor(message: string) {
    super(message);
    this.name = "HemnetRateLimitError";
  }
}
export class HemnetParseError extends HemnetError {
  constructor(message: string) {
    super(message);
    this.name = "HemnetParseError";
  }
}
