/**
 * Vitec Mäklarsystem Integration — Vitec Express API
 *
 * API: https://vitecexpress.bovision.se
 * OpenAPI schema: https://vitecexpress.bovision.se/swagger/v1/swagger.json
 *
 * IMPORTANT FACTS (verified from OpenAPI schema):
 *
 * 1. This is a READ-ONLY API. There are no PUT/PATCH endpoints for updating
 *    property descriptions. Export back to Vitec is NOT possible via API.
 *    Mäklare must copy text manually into Vitec.
 *
 * 2. Authentication: Bearer token in Authorization header.
 *    The API key is the mäklare's Vitec Express API key.
 *    customerId is the mäklare's Vitec customer account ID (e.g. "M12345").
 *
 * 3. Object types and their detail endpoints (all under /Internal/PublicAdvertising/):
 *    - HousingCooperative = Bostadsrätt (kooperativ hyresrätt / andelslägenhet)
 *    - Condominium        = Bostadsrätt (äganderätt)
 *    - House              = Villa / Hus / Radhus
 *    - Cottage            = Fritidshus
 *    - Farm               = Lantbruk
 *    - Plot               = Tomt
 *
 * 4. Estate list: GET /PublicAdvertising/Estate/{customerId}
 *    Returns a list of active estates. Structure not fully defined in schema.
 *
 * 5. Verified field paths (from OpenAPI schema components):
 *
 *    COMMON (all types):
 *      id                              — objekt-ID
 *      address.streetAddress           — gatuadress
 *      address.city                    — stad
 *      address.areaName                — stadsdel/område
 *      address.zipCode                 — postnummer
 *      price.swedishCurrency           — utgångspris (SEK)
 *      energyDeclaration.energyClass   — energiklass (A-G string)
 *      energyDeclaration.energyPerformance — kWh/m²/år
 *      texts.saleDescription           — objektbeskrivning (löptext)
 *      texts.saleHeading               — rubrik
 *      texts.shortSaleDescription      — kortannons
 *      texts.salePhrase                — säljfras
 *      surroundings.communication      — kommunikationer (fritext)
 *      surroundings.service            — service/butiker (fritext)
 *      surroundings.generalAboutArea   — allmänt om området (fritext)
 *      surroundings.parking            — parkering (fritext)
 *      images[].cdnReferences[].url    — bild-URL:er
 *      viewings[].startsAt             — visningstid start (ISO datetime)
 *      viewings[].endsAt               — visningstid slut (ISO datetime)
 *      primaryAgentId                  — mäklarens ID
 *      admissionAt                     — tillträdesdag (ISO datetime)
 *
 *    APARTMENT (Condominium + HousingCooperative):
 *      building.livingSpace            — boarea (kvm, double)
 *      building.grossFloorArea         — biarea (kvm, double)
 *      building.numberOfRooms          — antal rum (double)
 *      building.yearBuilt              — byggår (int)
 *      building.floor                  — våning (double)
 *      building.numberOfFloors         — antal våningar i huset (double)
 *      building.elevator               — hiss (ElevatorEnum: 1=Ja, 2=Nej, 3=Okänt)
 *      building.roomDescription        — rumsbeskrivning (fritext)
 *      exterior.balcony                — balkong (boolean)
 *      exterior.patio                  — uteplats (boolean)
 *      expenses.monthlyFee             — månadsavgift (HousingCooperative only, double)
 *      expenses.yearlyCommunityFee     — årsavgift (Condominium only, double) → divide by 12
 *      associationId                   — BRF-ID (HousingCooperative only)
 *
 *    HOUSE (House + Cottage):
 *      building.livingSpace            — boarea (kvm, double)
 *      building.grossFloorArea         — biarea (kvm, double)
 *      building.numberOfRooms          — antal rum (double)
 *      building.yearBuilt              — byggår (int)
 *      building.roomDescription        — rumsbeskrivning (fritext)
 *      plotInfo.plotSize               — tomtarea (kvm, double)
 *      expenses.operatingCost          — driftkostnad (double)
 *      expenses.isLeasehold            — tomträtt (boolean)
 *
 *    AGENT (fetched separately via /PublicAdvertising/Agent/{customerId}/{id}):
 *      name                            — mäklarens namn
 *      telephone.cell                  — mobilnummer
 *      telephone.work                  — arbetstelefon
 *      emailAddress                    — e-post
 */

import * as Sentry from "@sentry/node";

export interface VitecConfig {
  apiKey: string;
  customerId: string;
  baseUrl?: string;
}

export interface VitecProperty {
  id: string;
  address: string;
  city: string;
  district?: string;
  zipCode?: string;
  propertyType: string;
  livingArea?: number;
  biArea?: number;
  lotArea?: number;
  rooms?: number;
  floor?: number;
  totalFloors?: number;
  hasElevator?: boolean;
  yearBuilt?: number;
  energyClass?: string;
  monthlyFee?: number;
  askingPrice?: number;
  isLeasehold?: boolean;
  // Texts from Vitec (mäklaren may have already written these)
  description?: string;       // texts.saleDescription
  headline?: string;          // texts.saleHeading
  shortAd?: string;           // texts.shortSaleDescription
  salePhrase?: string;        // texts.salePhrase
  layoutDescription?: string; // building.roomDescription
  // Location
  transport?: string;         // surroundings.communication
  neighborhood?: string;      // surroundings.generalAboutArea + surroundings.service
  parking?: string;           // surroundings.parking
  // Features
  hasBalcony?: boolean;
  hasPatio?: boolean;
  // Showing
  showingDate?: string;
  accessDate?: string;
  // Broker (fetched separately)
  brokerName?: string;
  brokerPhone?: string;
  brokerEmail?: string;
  // Images
  imageUrls?: string[];
  // Raw data for debugging
  rawData?: Record<string, any>;
}

// ElevatorEnum: 1=Ja, 2=Nej, 3=Okänt
function mapElevator(val: number | undefined): boolean | undefined {
  if (val === 1) return true;
  if (val === 2) return false;
  return undefined;
}

// Determine property type from Vitec type + marketing flags
function mapPropertyType(vitecType: string, marketing: Record<string, any>): string {
  if (vitecType === "Condominium" || vitecType === "HousingCooperative") {
    if (marketing?.isTerraceHouse || marketing?.isDuplexHouse || marketing?.isLinkedHouse) {
      return "townhouse";
    }
    return "apartment";
  }
  if (vitecType === "House") {
    if (marketing?.isTerraceHouse || marketing?.isDuplexHouse || marketing?.isLinkedHouse) {
      return "townhouse";
    }
    return "house";
  }
  if (vitecType === "Cottage") return "house";
  if (vitecType === "Farm") return "house";
  return "apartment";
}

// Extract image URLs from Vitec images array (prefer CDN references)
function extractImageUrls(images: any[]): string[] {
  if (!Array.isArray(images)) return [];
  const urls: string[] = [];
  for (const img of images) {
    if (Array.isArray(img.cdnReferences)) {
      // Prefer the largest/original format
      const ref = img.cdnReferences.find((r: any) => r.name === "original" || r.name === "large") 
        || img.cdnReferences[0];
      if (ref?.url) urls.push(ref.url);
    }
  }
  return urls;
}

// Format viewing time from Vitec viewings array
function formatViewingTime(viewings: any[]): string | undefined {
  if (!Array.isArray(viewings) || viewings.length === 0) return undefined;
  const upcoming = viewings
    .filter((v: any) => v.startsAt)
    .sort((a: any, b: any) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .find((v: any) => new Date(v.startsAt) >= new Date());
  
  const viewing = upcoming || viewings[0];
  if (!viewing?.startsAt) return undefined;
  
  try {
    const start = new Date(viewing.startsAt);
    const end = viewing.endsAt ? new Date(viewing.endsAt) : null;
    const dateStr = start.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });
    const timeStr = start.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
    const endStr = end ? `–${end.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}` : "";
    return `${dateStr} kl. ${timeStr}${endStr}`;
  } catch {
    return undefined;
  }
}

/**
 * Maps a Vitec API property object to our VitecProperty shape.
 * The raw object must have _vitecType set to the endpoint type.
 */
export function mapVitecPropertyToMaklartexter(raw: Record<string, any>): VitecProperty {
  const address = raw.address || {};
  const building = raw.building || {};
  const plotInfo = raw.plotInfo || {};
  const price = raw.price || {};
  const expenses = raw.expenses || {};
  const energyDeclaration = raw.energyDeclaration || {};
  const texts = raw.texts || {};
  const surroundings = raw.surroundings || {};
  const exterior = raw.exterior || {};
  const vitecType = raw._vitecType || "";

  // Monthly fee calculation
  let monthlyFee: number | undefined;
  if (expenses.monthlyFee != null && Number(expenses.monthlyFee) > 0) {
    monthlyFee = Math.round(Number(expenses.monthlyFee));
  } else if (expenses.yearlyCommunityFee != null && Number(expenses.yearlyCommunityFee) > 0) {
    monthlyFee = Math.round(Number(expenses.yearlyCommunityFee) / 12);
  }

  // Combine surroundings into readable strings
  const transportParts = [surroundings.communication].filter(Boolean);
  const neighborhoodParts = [surroundings.generalAboutArea, surroundings.service].filter(Boolean);

  // Image URLs
  const imageUrls = extractImageUrls(raw.images || []);

  // Viewing time (next upcoming or first)
  const showingDate = formatViewingTime(raw.viewings || []);

  // Access date
  let accessDate: string | undefined;
  if (raw.admissionAt) {
    try {
      accessDate = new Date(raw.admissionAt).toLocaleDateString("sv-SE");
    } catch { /* ignore */ }
  }

  return {
    id: String(raw.id || ""),
    address: address.streetAddress || "",
    city: address.city || "",
    district: address.areaName || undefined,
    zipCode: address.zipCode || undefined,
    propertyType: mapPropertyType(vitecType, raw.marketing || {}),
    livingArea: Number(building.livingSpace) || undefined,
    biArea: Number(building.grossFloorArea) || undefined,
    lotArea: Number(plotInfo.plotSize) || undefined,
    rooms: Number(building.numberOfRooms) || undefined,
    floor: Number(building.floor) || undefined,
    totalFloors: Number(building.numberOfFloors) || undefined,
    hasElevator: mapElevator(building.elevator),
    yearBuilt: Number(building.yearBuilt) || undefined,
    energyClass: energyDeclaration.energyClass || undefined,
    monthlyFee,
    askingPrice: Number(price.swedishCurrency) || undefined,
    isLeasehold: expenses.isLeasehold === true,
    // Texts
    description: texts.saleDescription || undefined,
    headline: texts.saleHeading || undefined,
    shortAd: texts.shortSaleDescription || undefined,
    salePhrase: texts.salePhrase || undefined,
    layoutDescription: building.roomDescription || undefined,
    // Location
    transport: transportParts.join(" ").trim() || undefined,
    neighborhood: neighborhoodParts.join(" ").trim() || undefined,
    parking: surroundings.parking || undefined,
    // Features
    hasBalcony: exterior.balcony === true,
    hasPatio: exterior.patio === true,
    // Showing
    showingDate,
    accessDate,
    // Images
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    rawData: raw,
  };
}

export class VitecClient {
  private apiKey: string;
  private customerId: string;
  private baseUrl: string;

  constructor(config: VitecConfig) {
    this.apiKey = config.apiKey;
    this.customerId = config.customerId;
    this.baseUrl = (config.baseUrl || "https://vitecexpress.bovision.se").replace(/\/$/, "");
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 401 || res.status === 403) {
      throw new VitecAuthError(
        "Ogiltig Vitec API-nyckel eller saknad behörighet. Kontrollera:\n" +
        "1. API-nyckeln är korrekt kopierad från Vitec\n" +
        "2. Kund-ID (customerId) stämmer med ditt Vitec-konto\n" +
        "3. API-nyckeln har behörighet för PublicAdvertising"
      );
    }
    if (res.status === 404) {
      throw new VitecNotFoundError(`Resursen hittades inte i Vitec (${path})`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new VitecApiError(`Vitec API-fel ${res.status}: ${body.slice(0, 200)}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    // Some endpoints return plain text or empty body
    const text = await res.text();
    if (!text.trim()) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /**
   * Fetch a single property by ID.
   * Tries each typed endpoint in order of likelihood.
   * Most Swedish brokers deal primarily with HousingCooperative (bostadsrätt) and House.
   */
  async getProperty(objectId: string): Promise<VitecProperty> {
    const cId = encodeURIComponent(this.customerId);
    const oId = encodeURIComponent(objectId);

    // Try typed endpoints in order of frequency in Swedish market:
    // 1. HousingCooperative (bostadsrätt kooperativ) — most common
    // 2. Condominium (bostadsrätt äganderätt) — common
    // 3. House (villa/hus) — common
    // 4. Cottage (fritidshus) — less common
    const attempts: Array<{ path: string; type: string }> = [
      { path: `/Internal/PublicAdvertising/HousingCooperative/${cId}/${oId}`, type: "HousingCooperative" },
      { path: `/Internal/PublicAdvertising/Condominium/${cId}/${oId}`, type: "Condominium" },
      { path: `/Internal/PublicAdvertising/House/${cId}/${oId}`, type: "House" },
      { path: `/Internal/PublicAdvertising/Cottage/${cId}/${oId}`, type: "Cottage" },
    ];

    const errors: string[] = [];

    for (const { path, type } of attempts) {
      try {
        const raw = await this.request<Record<string, any>>(path);
        // Verify we got a real property (not empty object)
        if (raw && raw.id) {
          raw._vitecType = type;
          const property = mapVitecPropertyToMaklartexter(raw);
          // Fetch broker info if available (non-blocking)
          if (raw.primaryAgentId) {
            try {
              const agent = await this.request<any>(
                `/PublicAdvertising/Agent/${cId}/${encodeURIComponent(raw.primaryAgentId)}`
              );
              if (agent?.name) {
                property.brokerName = agent.name;
                property.brokerPhone = agent.telephone?.cell || agent.telephone?.work || undefined;
                property.brokerEmail = agent.emailAddress || undefined;
              }
            } catch {
              // Agent fetch is optional — don't fail the import
            }
          }
          return property;
        }
      } catch (err) {
        if (err instanceof VitecAuthError) throw err; // Auth errors are fatal
        if (err instanceof VitecNotFoundError) {
          errors.push(`${type}: not found`);
          continue; // Try next type
        }
        // Other errors: log and try next
        errors.push(`${type}: ${(err as Error).message}`);
      }
    }

    // All attempts failed
    throw new VitecNotFoundError(
      `Objektet "${objectId}" hittades inte i Vitec. ` +
      `Kontrollera att objekt-ID:t är korrekt och att objektet är aktivt.`
    );
  }

  /**
   * List active estates for this customer.
   * Uses the Estate list endpoint, then fetches details for each.
   * 
   * NOTE: The estate list endpoint returns a list of estate IDs/summaries.
   * We then fetch full details for each using getProperty().
   */
  async listActiveProperties(limit = 20): Promise<VitecProperty[]> {
    const cId = encodeURIComponent(this.customerId);

    try {
      const estateList = await this.request<any>(
        `/PublicAdvertising/Estate/${cId}`
      );

      // Extract estate items from various possible response shapes
      let items: any[] = [];
      if (Array.isArray(estateList)) {
        items = estateList;
      } else if (estateList && typeof estateList === "object") {
        // Try common wrapper patterns
        items = estateList.estates
          || estateList.items
          || estateList.results
          || estateList.data
          || estateList.properties
          || [];
        // If the response itself looks like a single estate
        if (items.length === 0 && estateList.id) {
          items = [estateList];
        }
      }

      if (items.length === 0) {
        console.warn("[Vitec] Estate list returned empty or unrecognized format:", typeof estateList);
        return [];
      }

      // Fetch details for each estate (up to limit), in parallel with concurrency limit
      const toFetch = items.slice(0, limit);
      const CONCURRENCY = 5;
      const results: VitecProperty[] = [];

      for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
        const batch = toFetch.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.allSettled(
          batch.map(async (item: any) => {
            const id = item.id || item.estateId || item.objectId;
            if (!id) return null;
            try {
              return await this.getProperty(String(id));
            } catch {
              return null;
            }
          })
        );
        for (const r of batchResults) {
          if (r.status === "fulfilled" && r.value) {
            results.push(r.value);
          }
        }
      }

      return results;
    } catch (err) {
      if (err instanceof VitecAuthError) throw err;
      Sentry.captureException(err, { tags: { integration: "vitec", action: "listActiveProperties" } });
      throw new VitecApiError(`Kunde inte lista objekt från Vitec: ${(err as Error).message}`);
    }
  }

  /**
   * Search properties by address or ID.
   * Lists all and filters client-side.
   * Brokers typically have 5-30 active listings so this is fine.
   */
  async searchProperties(query: string): Promise<VitecProperty[]> {
    try {
      const all = await this.listActiveProperties(100);
      const q = query.toLowerCase().trim();
      if (!q) return all.slice(0, 10);
      return all.filter((p) =>
        p.address?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.district?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q) ||
        p.zipCode?.includes(q)
      ).slice(0, 10);
    } catch (err) {
      if (err instanceof VitecAuthError) throw err;
      Sentry.captureException(err, { tags: { integration: "vitec", action: "searchProperties" } });
      throw new VitecApiError(`Sökning i Vitec misslyckades: ${(err as Error).message}`);
    }
  }

  /**
   * Validate that the API key and customerId work.
   * Uses the secure-resource endpoint first, falls back to estate list.
   */
  async validateApiKey(): Promise<boolean> {
    // Try the auth validation endpoint
    try {
      await this.request("/api/Login/secure-resource");
      return true;
    } catch (err) {
      if (err instanceof VitecAuthError) return false;
      // 404 means the endpoint doesn't exist but auth might still work
    }

    // Fallback: try to list estates (this will fail with 401 if key is invalid)
    try {
      await this.request(`/PublicAdvertising/Estate/${encodeURIComponent(this.customerId)}`);
      return true;
    } catch (err) {
      if (err instanceof VitecAuthError) return false;
      // Other errors (404, 500) might mean the key is valid but no estates exist
      // We consider this a valid key
      return !(err instanceof VitecAuthError);
    }
  }
}

export class VitecApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VitecApiError";
  }
}
export class VitecAuthError extends VitecApiError {
  constructor(message: string) {
    super(message);
    this.name = "VitecAuthError";
  }
}
export class VitecNotFoundError extends VitecApiError {
  constructor(message: string) {
    super(message);
    this.name = "VitecNotFoundError";
  }
}
