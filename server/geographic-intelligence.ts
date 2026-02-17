// === GEOGRAPHIC INTELLIGENCE DATABASE ===
// Rikstäckande geografisk data för svenska städer och områden

export interface CityData {
  name: string;
  center: { lat: number; lng: number };
  radius: number; // km
  districts: DistrictData[];
  propertyCharacteristics: {
    avgPricePerKvm: number;
    priceTrend2025: "rising" | "stable" | "declining";
    popularPropertyTypes: string[];
    keySellingPoints: string[];
  };
  transport: {
    hub: string;
    lines: string[];
    commuteTimes: Record<string, number>; // minuter till centrum
  };
  amenities: {
    shopping: string[];
    schools: string[];
    healthcare: string[];
    parks: string[];
  };
}

export interface DistrictData {
  name: string;
  coordinates: { lat: number; lng: number };
  characteristics: {
    areaType: "urban_center" | "suburban" | "villa_area" | "waterfront" | "industrial";
    avgPricePerKvm: number;
    demographics: "young_professionals" | "families" | "established" | "students" | "mixed";
    architecture: string[];
    vibe: string;
  };
  landmarks: string[];
  transport: string[];
  schools: string[];
  amenities: string[];
}

export const GEOGRAPHIC_DATABASE: Record<string, CityData> = {
  stockholm: {
    name: "Stockholm",
    center: { lat: 59.3293, lng: 18.0686 },
    radius: 25,
    districts: [
      {
        name: "Östermalm",
        coordinates: { lat: 59.3379, lng: 18.0745 },
        characteristics: {
          areaType: "urban_center",
          avgPricePerKvm: 125000,
          demographics: "established",
          architecture: ["sekelskifte", "funkis", "nyproduktion"],
          vibe: "Eleganta stadskärnan med exklusiva butiker och diplomatbostäder"
        },
        landmarks: ["Djurgården", "Östermalms saluhall", "Karlaplan"],
        transport: ["Karlaplan T-bana", "Östermalmstorg T-bana"],
        schools: ["Östermalms skola", "Höglandsskolan"],
        amenities: ["Stureplan", "NK", "Vasaparken"]
      },
      {
        name: "Södermalm",
        coordinates: { lat: 59.3156, lng: 18.0632 },
        characteristics: {
          areaType: "urban_center",
          avgPricePerKvm: 95000,
          demographics: "young_professionals",
          architecture: ["sekelskifte", "funkis", "industriomvandlade"],
          vibe: "Trendiga och kreativa stadsdelen med gallerier, vintage och utsikt"
        },
        landmarks: ["Katarinahissen", "Medborgarplatsen", "Söder Teater"],
        transport: ["Slussen T-bana", "Medborgarplatsen T-bana", "Skanstull T-bana"],
        schools: ["Södra Latin", "Katarina Södra"],
        amenities: ["Götgatan", "SoFo", "Vitabergsparken"]
      },
      {
        name: "Kungsholmen",
        coordinates: { lat: 59.3345, lng: 18.0283 },
        characteristics: {
          areaType: "urban_center",
          avgPricePerKvm: 85000,
          demographics: "young_professionals",
          architecture: ["funkis", "nyproduktion", "sekelskifte"],
          vibe: "Välskötta stadsdelen med vattenläge och parker nära stadskärnan"
        },
        landmarks: ["Stadshuset", "Rålambshovsparken", "Fridhemsplan"],
        transport: ["Fridhemsplan T-bana", "Rådhuset T-bana", "Thorildsplan T-bana"],
        schools: ["Kungsholmens grundskola", "Högalidsskolan"],
        amenities: ["Västermalmsgallerian", "S:t Eriksplan", "Norra Bantorget"]
      },
      {
        name: "Vasastan",
        coordinates: { lat: 59.3440, lng: 18.0400 },
        characteristics: {
          areaType: "urban_center",
          avgPricePerKvm: 90000,
          demographics: "young_professionals",
          architecture: ["sekelskifte", "funkis"],
          vibe: "Lugna och gröna stadsdelen med charmiga sekelskiftesbyggnader"
        },
        landmarks: ["Odenplan", "Vasaparken", "Observatoriet"],
        transport: ["Odenplan T-bana", "Rådmansgatan T-bana", "Stadshagen T-bana"],
        schools: ["Vasastan skola", "Adolf Fredriks skola"],
        amenities: ["Odengatan", "Vasagatan", "Atlantis"]
      },
      {
        name: "Djurgården",
        coordinates: { lat: 59.3456, lng: 18.1000 },
        characteristics: {
          areaType: "waterfront",
          avgPricePerKvm: 110000,
          demographics: "established",
          architecture: ["sekelskifte", "villa", "nyproduktion"],
          vibe: "Gröna oasen med museer, parker och exklusiva bostäder"
        },
        landmarks: ["Gröna Lund", "Skansen", "Nordiska museet"],
        transport: ["Djurgårdsbron buss", "Lilla Buss"],
        schools: ["Djurgårdsskolan"],
        amenities: ["Djurgårdsvägen", "Galärvarvet", "Beckholmen"]
      }
    ],
    propertyCharacteristics: {
      avgPricePerKvm: 95000,
      priceTrend2025: "stable",
      popularPropertyTypes: ["lägenhet", "radhus", "villa"],
      keySellingPoints: ["Närhet till vatten", "Kommunikation", "Parker och grönområden", "Service och butiker"]
    },
    transport: {
      hub: "Centralstationen",
      lines: ["T-bana (röd, blå, grön)", "Pendeltåg", "Regionbussar"],
      commuteTimes: {
        "solna": 15, "sundbyberg": 20, "nacka": 25, "danderyd": 20, "täby": 30
      }
    },
    amenities: {
      shopping: ["NK", "Gallerian", "Mood Stockholm", "Sturegallerian"],
      schools: ["KTH", "Stockholms universitet", "Karolinska institutet"],
      healthcare: ["Karolinska universitetssjukhuset", "Södersjukhuset", "St Göran"],
      parks: ["Djurgården", "Vasaparken", "Hagaparken", "Rålambshovsparken"]
    }
  },
  
  göteborg: {
    name: "Göteborg",
    center: { lat: 57.7089, lng: 11.9746 },
    radius: 20,
    districts: [
      {
        name: "Linné",
        coordinates: { lat: 57.6989, lng: 11.9546 },
        characteristics: {
          areaType: "urban_center",
          avgPricePerKvm: 45000,
          demographics: "young_professionals",
          architecture: ["landshövdingehus", "sekelskifte", "funkis"],
          vibe: "Bohemiska och livliga stadsdelen med caféer, vintage och Linnégatan"
        },
        landmarks: ["Linnégatan", "Järntorget", "Slottskogen"],
        transport: ["Linnéplatsen spårvagn", "Järntorget spårvagn"],
        schools: ["Linnéskolan", "Slottskogsskolan"],
        amenities: ["Andra Långgatan", "Liseberg", "Slottskogen"]
      },
      {
        name: "Majorna",
        coordinates: { lat: 57.7056, lng: 11.9346 },
        characteristics: {
          areaType: "urban_center",
          avgPricePerKvm: 42000,
          demographics: "young_professionals",
          architecture: ["landshövdingehus", "sekelskifte", "trähus"],
          vibe: "Historiska och charmiga stadsdelen med utsikt över älven"
        },
        landmarks: ["Majornas kyrka", "Slottskogen", "Ramberget"],
        transport: ["Slottskogen spårvagn", "Kungsportsplatsen spårvagn"],
        schools: ["Majornas skola", "Kärralundsskolan"],
        amenities: ["Haga", "Långgatorna", "Älvsborgsbron"]
      },
      {
        name: "Haga",
        coordinates: { lat: 57.7089, lng: 11.9746 },
        characteristics: {
          areaType: "urban_center",
          avgPricePerKvm: 55000,
          demographics: "mixed",
          architecture: ["1700-tals trähus", "gul fasad"],
          vibe: "Historiska turistmålet med caféer och pittoreska gränder"
        },
        landmarks: ["Haga Nygata", "Skansen Kronan", "Järntorget"],
        transport: ["Järntorget spårvagn", "Domkyrkan spårvagn"],
        schools: ["Hagaskolan"],
        amenities: ["Hagabullen", "Café Husaren", "Liseberg"]
      },
      {
        name: "Örgryte",
        coordinates: { lat: 57.7189, lng: 12.0046 },
        characteristics: {
          areaType: "suburban",
          avgPricePerKvm: 48000,
          demographics: "families",
          architecture: ["villa", "sekelskifte", "funkis"],
          vibe: "Familjevänliga och lugna stadsdelen med villor och grönområden"
        },
        landmarks: ["Örgryte kyrka", "Liseberg", "Kungsportavenyn"],
        transport: ["Örgryte spårvagn", "Kungsportavenyn spårvagn"],
        schools: ["Örgryte skola", "Guldhedsskolan"],
        amenities: ["Kungsportavenyn", "Liseberg", "Trädgårdsföreningen"]
      },
      {
        name: "Lundby",
        coordinates: { lat: 57.7289, lng: 11.9646 },
        characteristics: {
          areaType: "suburban",
          avgPricePerKvm: 38000,
          demographics: "families",
          architecture: ["villa", "radhus", "nyproduktion"],
          vibe: "Utvecklande stadsdelen med nyproduktion och närhet till älven"
        },
        landmarks: ["Lundby gamla kyrka", "Ramberget", "Älvsborgsbron"],
        transport: ["Lundby spårvagn", "Klippan spårvagn"],
        schools: ["Lundby skola", "Sannaskolan"],
        amenities: ["Lundby shopping", "Volvo Torslanda", "Älvsborgsbron"]
      }
    ],
    propertyCharacteristics: {
      avgPricePerKvm: 45000,
      priceTrend2025: "rising",
      popularPropertyTypes: ["lägenhet", "villa", "radhus"],
      keySellingPoints: ["Närhet till havet", "Låg levnadskostnad", "Goda kommunikationer", "Parker och natur"]
    },
    transport: {
      hub: "Centralstationen",
      lines: ["Spårvagn (alla linjer)", "Pendeltåg", "Bussar"],
      commuteTimes: {
        "partille": 20, "mölndal": 15, " angered": 25, "frölunda": 20
      }
    },
    amenities: {
      shopping: ["Nordstan", "Frölunda Torg", "Backebol", "Kungsportavenyn"],
      schools: ["Göteborgs universitet", "Chalmers", "Högskolan Väst"],
      healthcare: ["Sahlgrenska universitetssjukhuset", "Mölndals sjukhus", "Östra sjukhuset"],
      parks: ["Slottskogen", "Trädgårdsföreningen", "Hisingsparken", "Delsjön"]
    }
  },
  
  malmö: {
    name: "Malmö",
    center: { lat: 55.6050, lng: 13.0038 },
    radius: 15,
    districts: [
      {
        name: "Västra Hamnen",
        coordinates: { lat: 55.6150, lng: 12.9938 },
        characteristics: {
          areaType: "waterfront",
          avgPricePerKvm: 65000,
          demographics: "young_professionals",
          architecture: ["nyproduktion", "modern", "sustainability"],
          vibe: "Moderna och hållbara stadsdelen med Turning Torso och utsikt över Öresund"
        },
        landmarks: ["Turning Torso", "Öresundsbron", "Malmöhus"],
        transport: ["Västra Hamnen buss", "Malmö Central"],
        schools: ["Malmö International School"],
        amenities: ["Ribersborgsstranden", "Kappmaregatan", "Dockan"]
      },
      {
        name: "Gamla Väster",
        coordinates: { lat: 55.6000, lng: 13.0038 },
        characteristics: {
          areaType: "urban_center",
          avgPricePerKvm: 48000,
          demographics: "young_professionals",
          architecture: ["sekelskifte", "funkis", "gathus"],
          vibe: "Charmiga och livliga stadsdelen med butiker, restauranger och Lilla Torg"
        },
        landmarks: ["Lilla Torg", "Stortorget", "Malmöhus"],
        transport: ["Gustav Adolfs torg buss", "Malmö Central"],
        schools: ["Västerholms skola", "Slottsstaden skola"],
        amenities: ["Lilla Torg", "Storgatan", "Malmöhus"]
      },
      {
        name: "Limhamn",
        coordinates: { lat: 55.5850, lng: 12.9338 },
        characteristics: {
          areaType: "waterfront",
          avgPricePerKvm: 42000,
          demographics: "families",
          architecture: ["villa", "sekelskifte", "funkis"],
          vibe: "Sjönära stadsdelen med badplatser och marina"
        },
        landmarks: ["Limhamns kyrka", "Bunkeflo strand", "Klagshamn"],
        transport: ["Limhamn buss", "Malmö Central"],
        schools: ["Limhamns skola", "Klagshamnsskolan"],
        amenities: ["Limhamns hamn", "Ribersborgsstranden", "Klagshamn"]
      },
      {
        name: "Kirseberg",
        coordinates: { lat: 55.6150, lng: 13.0338 },
        characteristics: {
          areaType: "suburban",
          avgPricePerKvm: 35000,
          demographics: "families",
          architecture: ["villa", "radhus", "funkis"],
          vibe: "Familjevänliga stadsdelen med grönområden och skolor"
        },
        landmarks: ["Kirsebergs kyrka", "Kirsebergs gård", "Pildammsparken"],
        transport: ["Kirseberg buss", "Malmö Central"],
        schools: ["Kirsebergs skola", "Pildammsskolan"],
        amenities: ["Pildammsparken", "Kirsebergs gård", "Malmö Arena"]
      }
    ],
    propertyCharacteristics: {
      avgPricePerKvm: 45000,
      priceTrend2025: "rising",
      popularPropertyTypes: ["lägenhet", "villa", "radhus"],
      keySellingPoints: ["Närhet till Köpenhamn", "Stränder", "Internationell prägel", "Hållbarhet"]
    },
    transport: {
      hub: "Malmö Central",
      lines: ["Pendeltåg", "Regiontåg", "Bussar", "Tåg till Köpenhamn"],
      commuteTimes: {
        "lund": 15, "helsingborg": 35, "copenhagen": 35
      }
    },
    amenities: {
      shopping: ["Triangeln", "Emporia", "Mobilia", "Storgatan"],
      schools: ["Malmö universitet", "Lunds universitet (campus Malmö)"],
      healthcare: ["Skånes universitetssjukhus", "Malmö sjukhus"],
      parks: ["Pildammsparken", "Kungsparken", "Slottsträdgården", "Ribersborgsstranden"]
    }
  }
};

// === DISTANCE CALCULATION UTILITIES ===
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestDistrict(lat: number, lng: number, city: CityData): DistrictData | null {
  let nearest: DistrictData | null = null;
  let minDistance = Infinity;
  
  for (const district of city.districts) {
    const distance = haversineDistance(lat, lng, district.coordinates.lat, district.coordinates.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = district;
    }
  }
  
  return nearest;
}

export function getCityFromAddress(address: string): CityData | null {
  const addressLower = address.toLowerCase();
  
  // Simple city detection based on address
  if (addressLower.includes("stockholm") || addressLower.includes("solna") || 
      addressLower.includes("sundbyberg") || addressLower.includes("nacka")) {
    return GEOGRAPHIC_DATABASE.stockholm;
  }
  if (addressLower.includes("göteborg") || addressLower.includes("gothenburg") || 
      addressLower.includes("partille") || addressLower.includes("mölndal")) {
    return GEOGRAPHIC_DATABASE.göteborg;
  }
  if (addressLower.includes("malmö") || addressLower.includes("lund") || 
      addressLower.includes("helsingborg")) {
    return GEOGRAPHIC_DATABASE.malmö;
  }
  
  return null;
}

export function getGeographicContext(address: string): {
  city: CityData | null;
  district: DistrictData | null;
  nearbyAmenities: string[];
  transportOptions: string[];
  areaCharacteristics: string[];
} {
  const city = getCityFromAddress(address);
  if (!city) {
    return {
      city: null,
      district: null,
      nearbyAmenities: [],
      transportOptions: [],
      areaCharacteristics: []
    };
  }
  
  // For now, use city center as fallback - in real implementation, would geocode address
  const district = findNearestDistrict(city.center.lat, city.center.lng, city);
  
  return {
    city,
    district,
    nearbyAmenities: district?.amenities || city.amenities.shopping.slice(0, 3),
    transportOptions: district?.transport || city.transport.lines.slice(0, 2),
    areaCharacteristics: district ? [
      district.characteristics.vibe,
      `Prisnivå: ${district.characteristics.avgPricePerKvm} kr/kvm`,
      `Områdestyp: ${district.characteristics.areaType}`,
      `Målgrupp: ${district.characteristics.demographics}`
    ] : [
      city.propertyCharacteristics.keySellingPoints[0],
      `Prisnivå: ${city.propertyCharacteristics.avgPricePerKvm} kr/kvm`,
      `Trend 2025: ${city.propertyCharacteristics.priceTrend2025}`
    ]
  };
}
