/**
 * Vitec Mäklarsystem Integration
 *
 * Supports the Vitec Express API used by Swedish real estate brokers.
 * API docs: https://vitecexpress.bovision.se/
 *
 * Authentication: Bearer token (API key) in Authorization header.
 * Requires both an API key AND a customerId (the broker's Vitec account ID).
 *
 * Key endpoints:
 *   GET /Fetcher/All                                    — all objects for customer
 *   GET /Fetcher/Singelobject/{customerId}/{objectId}   — single object
 *   GET /PublicAdvertising/Estate/{customerId}          — list active estates
 *   GET /PublicAdvertising/Condominium/{customerId}/{id} — bostadsrätt detail
 *   GET /PublicAdvertising/House/{customerId}/{id}       — villa/hus detail
 *   GET /PublicAdvertising/Cottage/{customerId}/{id}     — fritidshus detail
 */

import * as Sentry from "@sentry/node";

export interface VitecConfig {
  apiKey: string;
  customerId: string;   // Broker's Vitec customer account ID — required by Vitec Express API
  baseUrl?: string;     // defaults to https://vitecexpress.bovision.se
}

export interface VitecProperty {
  id: string;
  address: string;
  city: string;
  district?: string;
  propertyType: string;
  livingArea?: number;
  biArea?: number;
  lotArea?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
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
  gardenDescription?: string;
  balconyArea?: number;
  balconyDirection?: string;
  parking?: string;
  storage?: string;
  heating?: string;
  flooring?: string;
  roofType?: string;
  constructionMaterial?: string;
  view?: string;
  specialFeatures?: string[];
  gardenFeatures?: string[];
  transport?: string;
  neighborhood?: string;
  showingDate?: string;
  accessDate?: string;
  brokerName?: string;
  brokerPhone?: string;
  imageUrls?: string[];
  rawData?: Record<string, any>;
}

// Maps Vitec property type codes to OptiPrompt types
function mapPropertyType(vitecType: string): string {
  const t = vitecType?.toLowerCase() || "";
  if (t.includes("lägenhet") || t.includes("bostadsrätt") || t === "apartment") return "apartment";
  if (t.includes("villa") || t === "villa") return "villa";
  if (t.includes("radhus") || t.includes("townhouse")) return "townhouse";
  if (t.includes("hus") || t === "house") return "house";
  return "apartment";
}

// Maps Vitec energy class codes (A-G or numeric) to letter
function mapEnergyClass(raw: string | number | undefined): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim().toUpperCase();
  if (/^[A-G]$/.test(s)) return s;
  // Vitec sometimes returns numeric: 1=A, 2=B, ...
  const num = parseInt(s, 10);
  if (num >= 1 && num <= 7) return String.fromCharCode(64 + num);
  return undefined;
}

// Normalizes a Vitec API property object into OptiPrompt's propertyData shape
export function mapVitecPropertyToOptiPrompt(raw: Record<string, any>): VitecProperty {
  const address = [raw.streetAddress || raw.address, raw.streetNumber]
    .filter(Boolean)
    .join(" ")
    .trim();

  const specialFeatures: string[] = [];
  if (raw.newlyRenovated || raw.renovated) specialFeatures.push("Renoverat");
  if (raw.newProduction || raw.newConstruction) specialFeatures.push("Nyproduktion");
  if (raw.fireplace) specialFeatures.push("Braskamin");
  if (raw.solarPanels) specialFeatures.push("Solceller");
  if (raw.fiberInternet) specialFeatures.push("Fiber indraget");
  if (raw.securityDoor) specialFeatures.push("Säkerhetsdörr");
  if (raw.newWindows) specialFeatures.push("Nya fönster");
  if (raw.newRoof) specialFeatures.push("Nytt tak");
  if (raw.drainageWork) specialFeatures.push("Dränering utförd");
  if (raw.pipeReplacement || raw.stambyteCompleted) specialFeatures.push("Stambyte genomfört");
  if (raw.chargingStation || raw.evCharger) specialFeatures.push("Laddbox för elbil");
  if (raw.fiberBroadband) specialFeatures.push("Fiber indraget");

  const gardenFeatures: string[] = [];
  if (raw.patio || raw.terrace) gardenFeatures.push("Altan");
  if (raw.deck || raw.woodDeck) gardenFeatures.push("Trädäck");
  if (raw.pergola) gardenFeatures.push("Pergola");
  if (raw.fruitTrees) gardenFeatures.push("Fruktträd");
  if (raw.shed || raw.outbuilding) gardenFeatures.push("Förråd");
  if (raw.greenhouse) gardenFeatures.push("Växthus");

  return {
    id: String(raw.id || raw.objectId || raw.estateId || ""),
    address: address || raw.fullAddress || "",
    city: raw.city || raw.municipality || "",
    district: raw.district || raw.cityDistrict || raw.area || undefined,
    propertyType: mapPropertyType(raw.propertyType || raw.type || raw.objectType || ""),
    livingArea: Number(raw.livingArea || raw.area || raw.boarea) || undefined,
    biArea: Number(raw.biArea || raw.supplementaryArea) || undefined,
    lotArea: Number(raw.lotArea || raw.plotArea || raw.landArea) || undefined,
    rooms: Number(raw.rooms || raw.numberOfRooms) || undefined,
    bedrooms: Number(raw.bedrooms || raw.numberOfBedrooms) || undefined,
    bathrooms: Number(raw.bathrooms || raw.numberOfBathrooms) || undefined,
    floor: Number(raw.floor || raw.floorNumber) || undefined,
    totalFloors: Number(raw.totalFloors || raw.numberOfFloors || raw.floors) || undefined,
    hasElevator: raw.elevator === true || raw.hasElevator === true || raw.elevator === "Ja",
    yearBuilt: Number(raw.yearBuilt || raw.constructionYear || raw.buildYear) || undefined,
    condition: raw.condition || raw.propertyCondition || raw.skick || undefined,
    energyClass: mapEnergyClass(raw.energyClass || raw.energyRating || raw.energiklass),
    monthlyFee: Number(raw.monthlyFee || raw.fee || raw.avgift) || undefined,
    askingPrice: Number(raw.askingPrice || raw.price || raw.startingPrice || raw.utgangspris) || undefined,
    brfName: raw.brfName || raw.associationName || raw.housingAssociation || raw.brf || undefined,
    description: raw.description || raw.objectDescription || raw.objektbeskrivning || undefined,
    kitchenDescription: raw.kitchen || raw.kitchenDescription || raw.kok || undefined,
    bathroomDescription: raw.bathroom || raw.bathroomDescription || raw.badrum || undefined,
    layoutDescription: raw.layout || raw.floorPlan || raw.layoutDescription || raw.planlösning || undefined,
    gardenDescription: raw.garden || raw.gardenDescription || raw.tradgard || undefined,
    balconyArea: Number(raw.balconyArea || raw.balconySize || raw.balkongArea) || undefined,
    balconyDirection: raw.balconyDirection || raw.balconyOrientation || raw.balkongVaderstreck || undefined,
    parking: raw.parking || raw.parkingDescription || raw.parkering || undefined,
    storage: raw.storage || raw.storageDescription || raw.forrad || undefined,
    heating: raw.heating || raw.heatingSystem || raw.uppvarmning || undefined,
    flooring: raw.flooring || raw.floorMaterial || raw.golv || undefined,
    roofType: raw.roofType || raw.roof || raw.tak || undefined,
    constructionMaterial: raw.constructionMaterial || raw.material || raw.byggnadsmaterial || undefined,
    view: raw.view || raw.utsikt || undefined,
    specialFeatures: specialFeatures.length > 0 ? specialFeatures : undefined,
    gardenFeatures: gardenFeatures.length > 0 ? gardenFeatures : undefined,
    transport: raw.transport || raw.publicTransport || raw.communications || raw.kommunikationer || undefined,
    neighborhood: raw.neighborhood || raw.area || raw.district || raw.omrade || undefined,
    showingDate: raw.showingDate || raw.viewingDate || raw.visningstid || undefined,
    accessDate: raw.accessDate || raw.tilltradesdag || raw.possessionDate || undefined,
    brokerName: raw.brokerName || raw.agentName || raw.maklarnamn || undefined,
    brokerPhone: raw.brokerPhone || raw.agentPhone || raw.maklartelefon || undefined,
    imageUrls: Array.isArray(raw.images)
      ? raw.images.map((img: any) => (typeof img === "string" ? img : img?.url || img?.src)).filter(Boolean)
      : undefined,
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
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 401 || res.status === 403) {
      throw new VitecAuthError("Ogiltig Vitec API-nyckel. Kontrollera dina inställningar.");
    }
    if (res.status === 404) {
      throw new VitecNotFoundError(`Objektet hittades inte i Vitec (${path})`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new VitecApiError(`Vitec API-fel ${res.status}: ${body.slice(0, 200)}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Fetch a single property using the generic Fetcher endpoint.
   * Returns the raw object which we then map based on its type.
   */
  async getProperty(objectId: string): Promise<VitecProperty> {
    try {
      const raw = await this.request<Record<string, any>>(
        `/Fetcher/Singelobject/${encodeURIComponent(this.customerId)}/${encodeURIComponent(objectId)}`
      );
      return mapVitecPropertyToOptiPrompt(raw);
    } catch (err) {
      if (err instanceof VitecAuthError || err instanceof VitecNotFoundError) throw err;
      Sentry.captureException(err, { tags: { integration: "vitec", action: "getProperty" } });
      throw new VitecApiError(`Kunde inte hämta objekt från Vitec: ${(err as Error).message}`);
    }
  }

  /**
   * List all active estates for this customer using the Estate list endpoint.
   * Falls back to Fetcher/All if Estate endpoint fails.
   */
  async listActiveProperties(limit = 20): Promise<VitecProperty[]> {
    try {
      // Try the PublicAdvertising/Estate list first (returns structured estate list)
      const raw = await this.request<any>(
        `/PublicAdvertising/Estate/${encodeURIComponent(this.customerId)}`
      );
      // Vitec Express returns { estates: [...] } or an array directly
      const items: any[] = Array.isArray(raw)
        ? raw
        : raw?.estates || raw?.items || raw?.results || raw?.data || [];
      return items.slice(0, limit).map(mapVitecPropertyToOptiPrompt);
    } catch (estateErr) {
      if (estateErr instanceof VitecAuthError) throw estateErr;
      // Fallback: use Fetcher/All which returns all objects
      try {
        const raw = await this.request<any>("/Fetcher/All");
        const items: any[] = Array.isArray(raw)
          ? raw
          : raw?.items || raw?.results || raw?.data || [];
        return items.slice(0, limit).map(mapVitecPropertyToOptiPrompt);
      } catch (err) {
        if (err instanceof VitecAuthError) throw err;
        Sentry.captureException(err, { tags: { integration: "vitec", action: "listActiveProperties" } });
        throw new VitecApiError(`Kunde inte lista objekt från Vitec: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Search properties by address or reference number.
   * Vitec Express doesn't have a dedicated search endpoint, so we list all
   * and filter client-side. For large portfolios this is acceptable since
   * brokers typically have 10-30 active listings.
   */
  async searchProperties(query: string): Promise<VitecProperty[]> {
    try {
      const all = await this.listActiveProperties(100);
      const q = query.toLowerCase();
      return all.filter((p) =>
        p.address?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.district?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q)
      ).slice(0, 10);
    } catch (err) {
      if (err instanceof VitecAuthError) throw err;
      Sentry.captureException(err, { tags: { integration: "vitec", action: "searchProperties" } });
      throw new VitecApiError(`Sökning i Vitec misslyckades: ${(err as Error).message}`);
    }
  }

  /** Validate that the API key and customerId work */
  async validateApiKey(): Promise<boolean> {
    try {
      // Use the secure-resource login check endpoint
      await this.request("/api/Login/secure-resource");
      return true;
    } catch (err) {
      if (err instanceof VitecAuthError) return false;
      // If it's a 404 or other error, the key might still be valid — try listing
      try {
        await this.request(`/PublicAdvertising/Estate/${encodeURIComponent(this.customerId)}`);
        return true;
      } catch (err2) {
        if (err2 instanceof VitecAuthError) return false;
        throw err2;
      }
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
