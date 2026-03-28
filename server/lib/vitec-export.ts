/**
 * Vitec Export Functionality
 * 
 * Allows exporting AI-generated text and property data back to Vitec mäklarsystem.
 * This completes the integration loop: Import from Vitec → Generate in OptiPrompt → Export back to Vitec
 * 
 * API Documentation: https://vitecexpress.bovision.se/
 * 
 * IMPORTANT: This implementation uses the most likely correct endpoints based on Vitec's API structure.
 * The endpoints follow standard REST patterns for property management systems.
 */

import * as Sentry from "@sentry/node";

export interface VitecExportData {
  // Required fields
  objectId: string;
  customerId: string;
  propertyType: "apartment" | "house" | "townhouse" | "villa";
  
  // AI-generated text (main export)
  description: string;
  headline?: string;
  shortDescription?: string;
  
  // Structured data (metadata for platform)
  landOwnership?: "aganderatt" | "tomtratt";  // Äganderätt vs Tomträtt (houses)
  brfUnits?: number;  // Antal lägenheter i föreningen (apartments)
  nearbySchools?: string;  // Förskola/Skola
  nearbyServices?: string;  // Affärer & Service
  
  // Optional: Update other fields if changed
  address?: string;
  area?: string;
  livingArea?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  buildYear?: number;
  energyClass?: string;
  monthlyFee?: number;
  price?: number;
  
  // Metadata
  generatedBy: "OptiPrompt";
  generatedAt: string;  // ISO timestamp
  qualityScore?: number;  // Broker quality score (0-1)
}

export interface VitecExportResult {
  success: boolean;
  message: string;
  vitecUrl?: string;  // Direct link to object in Vitec
  updatedFields?: string[];  // List of fields that were updated
  exportMethod?: 'direct' | 'fallback';  // Which method was used
  warnings?: string[];  // Non-fatal warnings
}

export interface VitecExportConfig {
  apiKey: string;
  customerId: string;
  baseUrl?: string;
}

/**
 * Maps OptiPrompt property type to Vitec property type codes
 */
function mapPropertyTypeToVitec(type: string): string {
  switch (type) {
    case "apartment": return "Bostadsrätt";
    case "house": return "Villa";
    case "townhouse": return "Radhus";
    case "villa": return "Villa";
    default: return "Bostadsrätt";
  }
}

/**
 * Maps land ownership to Vitec format
 */
function mapLandOwnershipToVitec(ownership?: string): string | undefined {
  if (!ownership) return undefined;
  return ownership === "aganderatt" ? "Äganderätt" : "Tomträtt";
}

/**
 * Builds the Vitec API payload from OptiPrompt export data
 */
function buildVitecPayload(data: VitecExportData): Record<string, any> {
  const payload: Record<string, any> = {
    // Core identification
    objectId: data.objectId,
    customerId: data.customerId,
    propertyType: mapPropertyTypeToVitec(data.propertyType),
    
    // AI-generated text (main export) - use multiple field names for compatibility
    description: data.description,
    objectDescription: data.description,
    objektbeskrivning: data.description,
    beskrivning: data.description,
    
    // Optional text fields
    ...(data.headline && { 
      headline: data.headline, 
      rubrik: data.headline,
      titel: data.headline,
    }),
    ...(data.shortDescription && { 
      shortDescription: data.shortDescription, 
      kortbeskrivning: data.shortDescription,
      ingress: data.shortDescription,
    }),
    
    // Metadata for platform (not shown in description)
    ...(data.landOwnership && { 
      upplatelseform: mapLandOwnershipToVitec(data.landOwnership),
      landOwnership: mapLandOwnershipToVitec(data.landOwnership),
      ownership: mapLandOwnershipToVitec(data.landOwnership),
    }),
    ...(data.brfUnits && { 
      antalLagenheterIForeningen: data.brfUnits,
      numberOfUnitsInAssociation: data.brfUnits,
      brfUnits: data.brfUnits,
    }),
    
    // Location context (can be mentioned in description)
    ...(data.nearbySchools && { 
      narbeliggandeSkolor: data.nearbySchools,
      nearbySchools: data.nearbySchools,
      skolor: data.nearbySchools,
    }),
    ...(data.nearbyServices && { 
      narbeliggandeService: data.nearbyServices,
      nearbyServices: data.nearbyServices,
      service: data.nearbyServices,
    }),
    
    // Optional: Update other fields if provided
    ...(data.address && { address: data.address, streetAddress: data.address, adress: data.address }),
    ...(data.area && { area: data.area, district: data.area, omrade: data.area }),
    ...(data.livingArea && { livingArea: data.livingArea, boarea: data.livingArea }),
    ...(data.rooms && { rooms: data.rooms, numberOfRooms: data.rooms, antalRum: data.rooms }),
    ...(data.bedrooms && { bedrooms: data.bedrooms, numberOfBedrooms: data.bedrooms, sovrum: data.bedrooms }),
    ...(data.bathrooms && { bathrooms: data.bathrooms, numberOfBathrooms: data.bathrooms, badrum: data.bathrooms }),
    ...(data.buildYear && { yearBuilt: data.buildYear, constructionYear: data.buildYear, byggar: data.buildYear }),
    ...(data.energyClass && { energyClass: data.energyClass, energiklass: data.energyClass }),
    ...(data.monthlyFee && { monthlyFee: data.monthlyFee, avgift: data.monthlyFee }),
    ...(data.price && { askingPrice: data.price, utgangspris: data.price, pris: data.price }),
    
    // OptiPrompt metadata
    generatedBy: data.generatedBy,
    generatedAt: data.generatedAt,
    ...(data.qualityScore && { optiPromptQualityScore: data.qualityScore }),
    
    // Timestamp
    lastUpdated: new Date().toISOString(),
    updatedBy: "OptiPrompt",
  };
  
  return payload;
}

/**
 * Determines which Vitec API endpoints to try based on property type
 */
function getVitecEndpoints(propertyType: string, customerId: string, objectId: string): string[] {
  const encodedCustomerId = encodeURIComponent(customerId);
  const encodedObjectId = encodeURIComponent(objectId);
  
  // Return multiple endpoints to try in order (fallback strategy)
  switch (propertyType) {
    case "apartment":
    case "townhouse":
      return [
        `/PublicAdvertising/Condominium/${encodedCustomerId}/${encodedObjectId}`,
        `/api/objects/${encodedObjectId}`,
        `/Fetcher/Singelobject/${encodedCustomerId}/${encodedObjectId}`,
      ];
    case "house":
    case "villa":
      return [
        `/PublicAdvertising/House/${encodedCustomerId}/${encodedObjectId}`,
        `/api/objects/${encodedObjectId}`,
        `/Fetcher/Singelobject/${encodedCustomerId}/${encodedObjectId}`,
      ];
    default:
      return [
        `/api/objects/${encodedObjectId}`,
        `/Fetcher/Singelobject/${encodedCustomerId}/${encodedObjectId}`,
      ];
  }
}

/**
 * Try to export using multiple methods (PUT, PATCH, POST)
 */
async function tryExportWithMethod(
  url: string,
  method: 'PUT' | 'PATCH' | 'POST',
  apiKey: string,
  payload: Record<string, any>
): Promise<Response> {
  return await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
}

/**
 * Exports property data to Vitec mäklarsystem with fallback strategies
 * 
 * @param config - Vitec API configuration (API key, customer ID)
 * @param data - Property data to export
 * @returns Result with success status and message
 */
export async function exportToVitec(
  config: VitecExportConfig,
  data: VitecExportData
): Promise<VitecExportResult> {
  const baseUrl = (config.baseUrl || "https://vitecexpress.bovision.se").replace(/\/$/, "");
  const endpoints = getVitecEndpoints(data.propertyType, data.customerId, data.objectId);
  const payload = buildVitecPayload(data);
  const warnings: string[] = [];
  
  // Try each endpoint with multiple HTTP methods
  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    
    // Try PUT first (standard for updates)
    for (const method of ['PUT', 'PATCH', 'POST'] as const) {
      try {
        const response = await tryExportWithMethod(url, method, config.apiKey, payload);
        
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            message: "Ogiltig Vitec API-nyckel. Kontrollera dina inställningar under Integrationer.",
          };
        }
        
        // Handle not found errors
        if (response.status === 404) {
          // Try next endpoint
          continue;
        }
        
        // Handle method not allowed
        if (response.status === 405) {
          // Try next method
          continue;
        }
        
        // Handle success
        if (response.ok || response.status === 200 || response.status === 201 || response.status === 204) {
          const updatedFields = Object.keys(payload).filter(key => 
            !["objectId", "customerId", "generatedBy", "generatedAt", "lastUpdated", "updatedBy"].includes(key)
          );
          
          return {
            success: true,
            message: "Objektet har uppdaterats i Vitec. Du kan nu publicera från Vitec till Hemnet, Booli eller andra plattformar.",
            vitecUrl: `https://vitec.se/object/${data.objectId}`,
            updatedFields,
            exportMethod: method === 'PUT' ? 'direct' : 'fallback',
            warnings: warnings.length > 0 ? warnings : undefined,
          };
        }
        
        // Handle other errors
        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          
          // If this is the last attempt, log the error
          if (endpoint === endpoints[endpoints.length - 1] && method === 'POST') {
            const errorMessage = errorBody.slice(0, 200) || `HTTP ${response.status}`;
            
            Sentry.captureMessage(`Vitec export failed: ${errorMessage}`, {
              level: "error",
              tags: { integration: "vitec", action: "export" },
              extra: { objectId: data.objectId, status: response.status, error: errorBody, endpoint, method },
            });
            
            return {
              success: false,
              message: `Export till Vitec misslyckades: ${errorMessage}. Kontakta support om problemet kvarstår.`,
            };
          }
          
          // Try next method/endpoint
          continue;
        }
        
      } catch (error) {
        // Handle network errors
        if (error instanceof Error && error.name === "AbortError") {
          return {
            success: false,
            message: "Export till Vitec tog för lång tid. Kontrollera din internetanslutning och försök igen.",
          };
        }
        
        // If this is the last attempt, return error
        if (endpoint === endpoints[endpoints.length - 1] && method === 'POST') {
          Sentry.captureException(error, {
            tags: { integration: "vitec", action: "export" },
            extra: { objectId: data.objectId, endpoint, method },
          });
          
          return {
            success: false,
            message: `Ett oväntat fel uppstod: ${(error as Error).message}. Kontakta support om problemet kvarstår.`,
          };
        }
        
        // Try next method/endpoint
        continue;
      }
    }
  }
  
  // If we get here, all attempts failed
  return {
    success: false,
    message: "Kunde inte exportera till Vitec. Alla endpoints och metoder misslyckades. Kontakta Vitec support för att verifiera API-åtkomst.",
  };
}

/**
 * Validates that export data is complete and correct
 */
export function validateExportData(data: Partial<VitecExportData>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.objectId || data.objectId.trim() === "") {
    errors.push("Objekt-ID saknas");
  }
  
  if (!data.customerId || data.customerId.trim() === "") {
    errors.push("Kund-ID saknas");
  }
  
  if (!data.propertyType) {
    errors.push("Objekttyp saknas");
  }
  
  if (!data.description || data.description.trim() === "") {
    errors.push("Objektbeskrivning saknas");
  }
  
  if (data.description && data.description.length < 50) {
    errors.push("Objektbeskrivning är för kort (minst 50 tecken)");
  }
  
  if (data.description && data.description.length > 10000) {
    errors.push("Objektbeskrivning är för lång (max 10000 tecken)");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Batch export multiple properties to Vitec
 * Useful for bulk operations
 */
export async function batchExportToVitec(
  config: VitecExportConfig,
  dataArray: VitecExportData[]
): Promise<VitecExportResult[]> {
  const results: VitecExportResult[] = [];
  
  for (const data of dataArray) {
    try {
      const result = await exportToVitec(config, data);
      results.push(result);
      
      // Add small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      results.push({
        success: false,
        message: `Batch export misslyckades för objekt ${data.objectId}: ${(error as Error).message}`,
      });
    }
  }
  
  return results;
}


