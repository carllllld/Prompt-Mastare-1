/**
 * Test script to verify buildDispositionFromStructuredData is working correctly
 */

// Mock the function (copy from routes.ts for testing)
function sanitizeStructuredText(value: any): string | null {
  if (!value) return null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeOutdoorTerm(text: string, propertyType: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("balkong")) return "balkong";
  if (lower.includes("uteplats")) return "uteplats";
  if (lower.includes("terrass")) return "terrass";
  if (lower.includes("altan")) return "altan";
  if (propertyType === "villa" && (lower.includes("trädgård") || lower.includes("tomt"))) return "trädgård";
  return null;
}

function resolveLocationAreaName(propertyData: Record<string, any>): string | null {
  return sanitizeStructuredText(
    propertyData.areaName ?? 
    propertyData.area_name ?? 
    propertyData.neighborhood ?? 
    propertyData.district ?? 
    null
  );
}

function buildDispositionFromStructuredData(propertyData: Record<string, any>) {
  const propertyTypeRaw = sanitizeStructuredText(propertyData.propertyType || propertyData.type || "lägenhet")?.toLowerCase() || "lägenhet";
  const propertyType = propertyTypeRaw === "apartment" ? "lägenhet" : propertyTypeRaw;
  const livingArea = Number(propertyData.livingArea ?? propertyData.area ?? propertyData.size) || null;
  const rooms = Number(propertyData.rooms ?? propertyData.totalRooms) || null;
  const bedrooms = Number(propertyData.bedrooms) || null;
  const bathrooms = Number(propertyData.bathrooms) || null;
  const price = Number(propertyData.price) || null;
  const fee = Number(propertyData.monthlyFee ?? propertyData.fee) || null;
  const pricePerKvm = price && livingArea ? Math.round(price / livingArea) : null;
  const yearBuilt = sanitizeStructuredText(propertyData.yearBuilt ?? propertyData.year_built ?? null);
  const areaName = resolveLocationAreaName(propertyData);
  const address = sanitizeStructuredText(propertyData.address) || "";
  const addressCity = address.split(",").pop()?.trim() || null;
  const balconyDirection = sanitizeStructuredText(propertyData.balconyDirection ?? propertyData.direction ?? null);
  const outdoorSize = sanitizeStructuredText(propertyData.balconySize ?? propertyData.outdoorSize ?? propertyData.patioSize ?? propertyData.terraceSize ?? null);
  const rawDescription = sanitizeStructuredText([propertyData.description, propertyData.otherInfo, propertyData.layout].filter(Boolean).join(" ")) || "";

  const outdoorSignals = [
    propertyData.preferredOutdoorTerm,
    propertyData.outdoorType,
    propertyData.balconyType,
    propertyData.patioType,
    propertyData.terraceType,
    propertyData.description,
    propertyData.otherInfo,
    propertyData.layout,
  ].map((value) => sanitizeStructuredText(value)).filter(Boolean) as string[];
  const preferredOutdoorTerm = normalizeOutdoorTerm(outdoorSignals.join(" "), propertyType);

  return {
    disposition: {
      property: {
        type: propertyType,
        address,
        areaName,
        livingArea,
        rooms,
        bedrooms,
        bathrooms,
      },
      pricing: {
        price,
        fee,
        pricePerKvm,
      },
      outdoor: {
        preferredTerm: preferredOutdoorTerm,
        direction: balconyDirection,
        size: outdoorSize,
      },
      rawDescription,
    }
  };
}

// Test with sample data similar to what user submitted
const testPropertyData = {
  address: "Testgatan 123, Stockholm",
  propertyType: "lägenhet",
  livingArea: 75,
  rooms: 3,
  bedrooms: 2,
  bathrooms: 1,
  price: 3500000,
  monthlyFee: 4500,
  kitchen: ["modernt", "helrenoverat"],
  bathroom: ["kakel", "dusch"],
  uniqueSellingPoints: "Fantastiskt läge nära kommunikationer",
  layout: "Rymlig hall som leder till vardagsrum med öppen planlösning mot köket"
};

console.log("Testing buildDispositionFromStructuredData...\n");
console.log("Input propertyData:", JSON.stringify(testPropertyData, null, 2));
console.log("\n" + "=".repeat(80) + "\n");

const result = buildDispositionFromStructuredData(testPropertyData);
console.log("Output disposition:", JSON.stringify(result, null, 2));
console.log("\n" + "=".repeat(80) + "\n");

// Verify key fields are populated
const checks = [
  { name: "Property type", value: result.disposition.property.type, expected: "lägenhet" },
  { name: "Address", value: result.disposition.property.address, expected: "Testgatan 123, Stockholm" },
  { name: "Living area", value: result.disposition.property.livingArea, expected: 75 },
  { name: "Rooms", value: result.disposition.property.rooms, expected: 3 },
  { name: "Price", value: result.disposition.pricing.price, expected: 3500000 },
  { name: "Fee", value: result.disposition.pricing.fee, expected: 4500 },
];

console.log("Verification checks:");
let allPassed = true;
for (const check of checks) {
  const passed = check.value === check.expected;
  allPassed = allPassed && passed;
  console.log(`  ${passed ? "✓" : "✗"} ${check.name}: ${check.value} ${passed ? "" : `(expected ${check.expected})`}`);
}

console.log("\n" + "=".repeat(80));
console.log(allPassed ? "✓ All checks passed!" : "✗ Some checks failed");
console.log("=".repeat(80));
