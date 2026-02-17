// === REAL ESTATE MARKET DATABASE ===
// Rikstäckande fastighetsmarknadsdata för svenska städer och trender 2025-2026

export interface MarketData {
  city: string;
  year: number;
  quarter: number;
  avgPricePerKvm: {
    apartment: number;
    villa: number;
    radhus: number;
  };
  priceTrend: {
    apartment: "rising" | "stable" | "declining";
    villa: "rising" | "stable" | "declining";
    radhus: "rising" | "stable" | "declining";
  };
  marketConditions: {
    supply: "low" | "normal" | "high";
    demand: "low" | "normal" | "high";
    pricePressure: "upward" | "neutral" | "downward";
  };
  keyFactors: {
    economic: string[];
    demographic: string[];
    infrastructure: string[];
  };
  predictions: {
    nextQuarter: string[];
    nextYear: string[];
  };
}

export interface PropertyTypeData {
  type: "apartment" | "villa" | "radhus";
  characteristics: {
    avgSize: number;
    avgPrice: number;
    avgDaysOnMarket: number;
    popularFeatures: string[];
    buyerProfile: string[];
  };
  sellingPoints: {
    primary: string[];
    secondary: string[];
    emotional: string[];
  };
  marketTrends2025: {
    priceDevelopment: string;
    demandDrivers: string[];
    riskFactors: string[];
  };
}

export interface CityMarketInsight {
  city: string;
  overview: {
    marketPosition: "premium" | "standard" | "budget";
    growthPotential: "high" | "medium" | "low";
    investmentClimate: "favorable" | "neutral" | "cautious";
  };
  demographics: {
    populationGrowth: number; // %
    ageDistribution: string[];
    incomeLevel: "high" | "medium" | "low";
    employmentRate: number; // %
  };
  infrastructure: {
    transport: string[];
    development: string[];
    connectivity: string[];
  };
  marketSegments: {
    luxury: {
      priceRange: string;
      areas: string[];
      buyerProfile: string[];
    };
    standard: {
      priceRange: string;
      areas: string[];
      buyerProfile: string[];
    };
    budget: {
      priceRange: string;
      areas: string[];
      buyerProfile: string[];
    };
  };
}

// === MARKET DATABASE ===
export const MARKET_DATABASE: Record<string, MarketData> = {
  stockholm: {
    city: "Stockholm",
    year: 2025,
    quarter: 1,
    avgPricePerKvm: {
      apartment: 95000,
      villa: 85000,
      radhus: 75000
    },
    priceTrend: {
      apartment: "stable",
      villa: "stable", 
      radhus: "stable"
    },
    marketConditions: {
      supply: "normal",
      demand: "normal",
      pricePressure: "neutral"
    },
    keyFactors: {
      economic: ["Ränteläge 3.5%", "Hög inflation", "Starkt arbetsmarknad"],
      demographic: ["Inflyttning", "Hög utbildningsnivå", "Internationella köpare"],
      infrastructure: ["Nya tunnelbanelinjer", "Förbättrad pendeltågstrafik", "Cykelinfrastruktur"]
    },
    predictions: {
      nextQuarter: ["Prisstabilitet fortsätter", "Lätt ökad efterfrågan", "Fokus på energieffektivitet"],
      nextYear: ["Måttlig prisuppgång 2-3%", "Ökat intresse för outerområden", "Högre krav på digital tjänster"]
    }
  },
  göteborg: {
    city: "Göteborg",
    year: 2025,
    quarter: 1,
    avgPricePerKvm: {
      apartment: 45000,
      villa: 42000,
      radhus: 38000
    },
    priceTrend: {
      apartment: "rising",
      villa: "rising",
      radhus: "rising"
    },
    marketConditions: {
      supply: "low",
      demand: "high",
      pricePressure: "upward"
    },
    keyFactors: {
      economic: ["Industrins omställning", "Volvo expansion", "Lägre levnadskostnader"],
      demographic: ["Ung befolkning", "Studenter", "Familjeinflyttning"],
      infrastructure: ["Västlänken", "Elbussatsning", "Hamnexpansion"]
    },
    predictions: {
      nextQuarter: ["Fortsatt prisuppgång 3-4%", "Ökad byggaktivitet", "Stark efterfrågan på radhus"],
      nextYear: ["Prisuppgång 5-7%", "Fokus på hållbarhet", "Utveckling av outerområden"]
    }
  },
  malmö: {
    city: "Malmö",
    year: 2025,
    quarter: 1,
    avgPricePerKvm: {
      apartment: 45000,
      villa: 35000,
      radhus: 32000
    },
    priceTrend: {
      apartment: "rising",
      villa: "rising",
      radhus: "stable"
    },
    marketConditions: {
      supply: "normal",
      demand: "high",
      pricePressure: "upward"
    },
    keyFactors: {
      economic: ["Närhet till Köpenhamn", "Internationella företag", "Hållbarhetsfokus"],
      demographic: ["Internationell inflyttning", "Unga yrkesverksamma", "Akademiker"],
      infrastructure: ["Öresundsbron", "Citytunneln", "Expanderande flygplats"]
    },
    predictions: {
      nextQuarter: ["Stabil prisutveckling", "Ökat intresse från utlandet", "Fokus på Västra Hamnen"],
      nextYear: ["Måttlig prisuppgång 2-4%", "Utveckling av Limhamn", "Ökat byggande i söder"]
    }
  }
};

// === PROPERTY TYPE INSIGHTS ===
export const PROPERTY_TYPE_DATABASE: Record<string, PropertyTypeData> = {
  apartment: {
    type: "apartment",
    characteristics: {
      avgSize: 75,
      avgPrice: 4500000,
      avgDaysOnMarket: 45,
      popularFeatures: ["Balkong", "Golvvärme", "Nyrenoverat kök", "Hiss", "Förråd"],
      buyerProfile: ["Förstagångsköpare", "Unga par", "Investerare", "Pensionärer"]
    },
    sellingPoints: {
      primary: ["Lågt underhåll", "Central läge", "Säkerhet", "Service"],
      secondary: ["Gemensamma utrymmen", "Närhet till kollektivtrafik", "Föreningsstämmor"],
      emotional: ["Bekvämlighet", "Social miljö", "Trygghet", "Status"]
    },
    marketTrends2025: {
      priceDevelopment: "Stabila priser i storstäder, ökning i mellanstäder",
      demandDrivers: ["Ränteläge", "Urbanisering", "Ensamhushåll"],
      riskFactors: ["Föreningskostnader", "Renoveringsbehov", "Energipriser"]
    }
  },
  villa: {
    type: "villa",
    characteristics: {
      avgSize: 150,
      avgPrice: 6500000,
      avgDaysOnMarket: 60,
      popularFeatures: ["Tomt", "Garage", "Egen ingång", "Flera badrum", "Öppen planlösning"],
      buyerProfile: ["Familjer", "Etablerade par", "Höginkomsttagare", "Downsizers"]
    },
    sellingPoints: {
      primary: ["Frihet", "Utrymme", "Privatliv", "Tomt", "Byggnadsförråd"],
      secondary: ["Renoveringspotential", "Trädgård", "Fler generatioener", "Bilparkering"],
      emotional: ["Drömboende", "Framtid", "Trygghet", "Status"]
    },
    marketTrends2025: {
      priceDevelopment: "Ökad efterfrågan i outerområden, stabil i centrala områden",
      demandDrivers: ["Familjebildning", "Hemarbete", "Önskan om utrymme"],
      riskFactors: ["Underhållskostnader", "Energikostnader", "Rörliga räntor"]
    }
  },
  radhus: {
    type: "radhus",
    characteristics: {
      avgSize: 120,
      avgPrice: 4800000,
      avgDaysOnMarket: 50,
      popularFeatures: ["Lägre pris än villa", "Tomt", "Få plan", "Gemensam väg", "Förråd"],
      buyerProfile: ["Unga familjer", "Förstagångsköpare", "Par", "De som vill uppgradera från lägenhet"]
    },
    sellingPoints: {
      primary: ["Kompromiss", "Lägre pris", "Tomt", "Utrymme", "Enklare underhåll"],
      secondary: ["Gemensamhetsfaciliteter", "Nära villa-känsla", "Bättre läge än villa"],
      emotional: ["Steget upp", "Framtid", "Trygghet", "Praktiskt"]
    },
    marketTrends2025: {
      priceDevelopment: "Stark efterfrågan i mellanstäder, stabil i storstäder",
      demandDrivers: ["Prisvärdhet", "Familjebehov", "Villakänsla till lägre pris"],
      riskFactors: ["Föreningsavgifter", "Delat ansvar", "Mindre privatliv"]
    }
  }
};

// === CITY MARKET INSIGHTS ===
export const CITY_INSIGHTS: Record<string, CityMarketInsight> = {
  stockholm: {
    city: "Stockholm",
    overview: {
      marketPosition: "premium",
      growthPotential: "medium",
      investmentClimate: "neutral"
    },
    demographics: {
      populationGrowth: 1.2,
      ageDistribution: ["25-39 (30%)", "40-54 (25%)", "55-69 (20%)"],
      incomeLevel: "high",
      employmentRate: 85
    },
    infrastructure: {
      transport: ["T-bana", "Pendeltåg", "Regionbussar", "Cykelbanor"],
      development: ["Nya bostadsområden", "Kontorsutveckling", "Hamnexpansion"],
      connectivity: ["Arlanda", "Bromma", "Internationella tågförbindelser"]
    },
    marketSegments: {
      luxury: {
        priceRange: "10M+ kr",
        areas: ["Östermalm", "Djurgården", "Vasastan", "Danderyd"],
        buyerProfile: ["Höginkomsttagare", "Internationella köpare", "Investerare"]
      },
      standard: {
        priceRange: "5-10M kr",
        areas: ["Södermalm", "Kungsholmen", "Vasastan", "Solna"],
        buyerProfile: ["Etablerade par", "Familjer", "Yrkesverksamma"]
      },
      budget: {
        priceRange: "<5M kr",
        areas: ["Outerområden", "Nacka", "Södertälje", "Sundbyberg"],
        buyerProfile: ["Förstagångsköpare", "Unga par", "Studenter"]
      }
    }
  },
  göteborg: {
    city: "Göteborg",
    overview: {
      marketPosition: "standard",
      growthPotential: "high",
      investmentClimate: "favorable"
    },
    demographics: {
      populationGrowth: 1.5,
      ageDistribution: ["25-39 (35%)", "40-54 (25%)", "18-24 (15%)"],
      incomeLevel: "medium",
      employmentRate: 82
    },
    infrastructure: {
      transport: ["Spårvagn", "Buss", "Pendeltåg", "Färjor"],
      development: ["Västlänken", "Älvstaden", "Järnbrott"],
      connectivity: ["Landvetter", "Tåg till Stockholm/Köpenhamn"]
    },
    marketSegments: {
      luxury: {
        priceRange: "8M+ kr",
        areas: ["Örgryte", "Haga", "Linné", "Majorna"],
        buyerProfile: ["Företagsledare", "Internationella köpare", "Investerare"]
      },
      standard: {
        priceRange: "4-8M kr",
        areas: ["Majorna", "Linné", "Haga", "Frölunda"],
        buyerProfile: ["Familjer", "Etablerade par", "Yrkesverksamma"]
      },
      budget: {
        priceRange: "<4M kr",
        areas: ["Angered", "Bergsjön", "Torslanda", "Partille"],
        buyerProfile: ["Förstagångsköpare", "Unga familjer", "Studenter"]
      }
    }
  },
  malmö: {
    city: "Malmö",
    overview: {
      marketPosition: "standard",
      growthPotential: "high",
      investmentClimate: "favorable"
    },
    demographics: {
      populationGrowth: 1.8,
      ageDistribution: ["25-39 (40%)", "18-24 (20%)", "40-54 (20%)"],
      incomeLevel: "medium",
      employmentRate: 80
    },
    infrastructure: {
      transport: ["Tåg", "Buss", "Tunnelbana (planerad)", "Cykel"],
      development: ["Västra Hamnen", "Hyllie", "Malmö Live"],
      connectivity: ["Kastrup", "Öresundsbron", "Tåg till Stockholm"]
    },
    marketSegments: {
      luxury: {
        priceRange: "7M+ kr",
        areas: ["Västra Hamnen", "Ribersborg", "Gamla Väster"],
        buyerProfile: ["Internationella köpare", "Företagsledare", "Investerare"]
      },
      standard: {
        priceRange: "3.5-7M kr",
        areas: ["Gamla Väster", "Limhamn", "Kirseberg", "Hyllie"],
        buyerProfile: ["Unga yrkesverksamma", "Familjer", "Par"]
      },
      budget: {
        priceRange: "<3.5M kr",
        areas: ["Rosengård", "Husie", "Fosie", "Outerområden"],
        buyerProfile: ["Förstagångsköpare", "Studenter", "Nyanlända"]
      }
    }
  }
};

// === MARKET ANALYSIS FUNCTIONS ===
export function getMarketData(city: string): MarketData | null {
  return MARKET_DATABASE[city.toLowerCase()] || null;
}

export function getPropertyTypeData(type: string): PropertyTypeData | null {
  return PROPERTY_TYPE_DATABASE[type] || null;
}

export function getCityInsights(city: string): CityMarketInsight | null {
  return CITY_INSIGHTS[city.toLowerCase()] || null;
}

export function analyzeMarketPosition(price: number, size: number, city: string): {
  segment: "luxury" | "standard" | "budget";
  pricePerKvm: number;
  marketComparison: "above" | "at" | "below";
  recommendation: string;
} {
  const marketData = getMarketData(city);
  const cityInsights = getCityInsights(city);
  
  if (!marketData || !cityInsights) {
    return {
      segment: "standard",
      pricePerKvm: price / size,
      marketComparison: "at",
      recommendation: "Standard marknadsposition"
    };
  }
  
  const pricePerKvm = price / size;
  const avgPrice = marketData.avgPricePerKvm.apartment; // Default to apartment
  
  let segment: "luxury" | "standard" | "budget";
  let marketComparison: "above" | "at" | "below";
  
  if (pricePerKvm > avgPrice * 1.3) {
    segment = "luxury";
    marketComparison = "above";
  } else if (pricePerKvm < avgPrice * 0.7) {
    segment = "budget";
    marketComparison = "below";
  } else {
    segment = "standard";
    marketComparison = "at";
  }
  
  const recommendations = {
    luxury: "Fokusera på exklusiva detaljer, läge och status. Målgrupp: etablerade och internationella köpare.",
    standard: "Betona praktiska fördelar, läge och värde. Målgrupp: etablerade par och familjer.",
    budget: "Framhäv potential, prisvärdhet och läge. Målgrupp: förstagångsköpare och unga par."
  };
  
  return {
    segment,
    pricePerKvm,
    marketComparison,
    recommendation: recommendations[segment]
  };
}

export function getMarketTrends2025(city: string): {
  priceDevelopment: string;
  keyDrivers: string[];
  risks: string[];
  opportunities: string[];
} {
  const marketData = getMarketData(city);
  const cityInsights = getCityInsights(city);
  
  if (!marketData || !cityInsights) {
    return {
      priceDevelopment: "Stabil marknad",
      keyDrivers: [],
      risks: [],
      opportunities: []
    };
  }
  
  return {
    priceDevelopment: `Prisutveckling: ${marketData.priceTrend.apartment === 'rising' ? 'Ökande' : marketData.priceTrend.apartment === 'declining' ? 'Minskande' : 'Stabil'}`,
    keyDrivers: marketData.keyFactors.economic.concat(marketData.keyFactors.demographic),
    risks: ["Rörliga räntor", "Energikostnader", "Regulatoriska förändringar"],
    opportunities: marketData.predictions.nextYear
  };
}
