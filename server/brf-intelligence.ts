// === BRF ECONOMY ANALYSIS ===
// Rikstäckande BRF-ekonomi analys och varningsflaggor för svenska bostadsrättsföreningar

export interface BRFEconomy {
  name: string;
  organizationNumber: string;
  financialHealth: "excellent" | "good" | "fair" | "poor" | "critical";
  keyMetrics: {
    equityRatio: number; // %
    operatingResult: number; // kr
    cashFlow: number; // kr
    debtPerSqm: number; // kr
    reserveFund: number; // kr
    monthlyFee: number; // kr
  };
  propertyData: {
    totalApartments: number;
    totalSqm: number;
    yearBuilt: string;
    lastMajorRenovation: string;
    upcomingRenovations: string[];
    energyClass: string;
  };
  riskFactors: {
    high: string[];
    medium: string[];
    low: string[];
  };
  strengths: {
    high: string[];
    medium: string[];
    low: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  marketPosition: {
    competitiveness: "high" | "medium" | "low";
    feeLevel: "low" | "average" | "high";
    valueForMoney: "excellent" | "good" | "fair" | "poor";
  };
}

export interface BRFRiskProfile {
  category: "financial" | "legal" | "maintenance" | "market" | "governance";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  impact: string;
  mitigation: string;
  warningSigns: string[];
}

export interface BRFBenchmark {
  city: string;
  areaType: "urban_center" | "suburban" | "villa_area";
  yearBuilt: string;
  averages: {
    equityRatio: number;
    monthlyFee: number;
    debtPerSqm: number;
    operatingResult: number;
  };
  ranges: {
    equityRatio: { min: number; max: number };
    monthlyFee: { min: number; max: number };
    debtPerSqm: { min: number; max: number };
  };
}

// === BRF RISK DATABASE ===
export const BRF_RISK_FACTORS: BRFRiskProfile[] = [
  {
    category: "financial",
    severity: "critical",
    description: "Låg soliditet under 30%",
    impact: "Högre risk för avgiftshöjningar och lån",
    mitigation: "Öka kapitaltillskott, minska lån",
    warningSigns: ["Negativt operativt resultat", "Ökande lån", "Låg kassa"]
  },
  {
    category: "financial",
    severity: "high",
    description: "Hög skuldsättning per kvm > 15,000 kr",
    impact: "Svårt att finansiera framtida renoveringar",
    mitigation: "Amortera lån, öka avgifter gradvis",
    warningSigns: ["Stora lån", "Höga räntekostnader", "Låg kassa"]
  },
  {
    category: "financial",
    severity: "medium",
    description: "Negativt operativt resultat 2+ år",
    impact: "Minskande finansiell stabilitet",
    mitigation: "Granska kostnader, öka avgifter",
    warningSigns: ["Förlust i bokslut", "Ökande kostnader", "Låg beläggning"]
  },
  {
    category: "maintenance",
    severity: "critical",
    description: "Akut renoveringsbehov > 5M kr",
    impact: "Stora avgiftshöjningar ofrånkomliga",
    mitigation: "Omedelbar renoveringsplan, finansiering",
    warningSigns: ["Vattenskador", "Fasadproblem", "Stambyte förfallet"]
  },
  {
    category: "maintenance",
    severity: "high",
    description: "Stambyte inte genomfört på 40+ år",
    impact: "Omedelbart stambehov inom 5-10 år",
    mitigation: "Planera stambyte, börja spara",
    warningSigns: ["Gamla rör", "Vattenläckor", "Dåligt tryck"]
  },
  {
    category: "maintenance",
    severity: "medium",
    description: "Fasadrenovering behövs inom 10 år",
    impact: "Medelstora avgiftshöjningar",
    mitigation: "Planera fasadrenovering, budgetera",
    warningSigns: ["Sprickor i fasad", "Färg flagnar", "Fuktproblem"]
  },
  {
    category: "legal",
    severity: "high",
    description: "Pågående tvister > 100,000 kr",
    impact: "Oväntade kostnader och förseningar",
    mitigation: "Lös tvister, juridisk rådgivning",
    warningSigns: ["Stämningar", "Tvister med grannar", "Bygglovsproblem"]
  },
  {
    category: "legal",
    severity: "medium",
    description: "Oklara servitut eller avtal",
    impact: "Begränsningar för framtida utveckling",
    mitigation: "Granska avtal, klargör rättigheter",
    warningSigns: ["Oklara gränser", "Gamla avtal", "Servitut"]
  },
  {
    category: "market",
    severity: "medium",
    description: "Hög avgift jämfört med liknande områden",
    impact: "Sämre säljbarhet, längre säljtider",
    mitigation: "Effektivisera driften, motivera avgift",
    warningSigns: ["Hög avgift", "Tomma lägenheter", "Lågt intresse"]
  },
  {
    category: "governance",
    severity: "high",
    description: "Oregelbundna styrelsemöten eller protokoll",
    impact: "Dålig styrning och transparens",
    mitigation: "Formalisera styrelsearbete, dokumentation",
    warningSigns: ["Inga protokoll", "Oregelbundna möten", "Engagemangsbrist"]
  }
];

// === BRF BENCHMARK DATABASE ===
export const BRF_BENCHMARKS: Record<string, BRFBenchmark> = {
  stockholm_urban_center: {
    city: "Stockholm",
    areaType: "urban_center",
    yearBuilt: "1900-1940",
    averages: {
      equityRatio: 45,
      monthlyFee: 4500,
      debtPerSqm: 8000,
      operatingResult: 500000
    },
    ranges: {
      equityRatio: { min: 30, max: 60 },
      monthlyFee: { min: 3000, max: 6000 },
      debtPerSqm: { min: 5000, max: 12000 }
    }
  },
  stockholm_suburban: {
    city: "Stockholm",
    areaType: "suburban",
    yearBuilt: "1950-1970",
    averages: {
      equityRatio: 35,
      monthlyFee: 3500,
      debtPerSqm: 12000,
      operatingResult: 300000
    },
    ranges: {
      equityRatio: { min: 20, max: 50 },
      monthlyFee: { min: 2500, max: 4500 },
      debtPerSqm: { min: 8000, max: 15000 }
    }
  },
  göteborg_urban_center: {
    city: "Göteborg",
    areaType: "urban_center",
    yearBuilt: "1900-1940",
    averages: {
      equityRatio: 40,
      monthlyFee: 3200,
      debtPerSqm: 7000,
      operatingResult: 400000
    },
    ranges: {
      equityRatio: { min: 25, max: 55 },
      monthlyFee: { min: 2000, max: 4500 },
      debtPerSqm: { min: 4000, max: 10000 }
    }
  },
  göteborg_suburban: {
    city: "Göteborg",
    areaType: "suburban",
    yearBuilt: "1950-1970",
    averages: {
      equityRatio: 32,
      monthlyFee: 2800,
      debtPerSqm: 10000,
      operatingResult: 250000
    },
    ranges: {
      equityRatio: { min: 18, max: 45 },
      monthlyFee: { min: 1800, max: 3800 },
      debtPerSqm: { min: 6000, max: 14000 }
    }
  },
  malmö_urban_center: {
    city: "Malmö",
    areaType: "urban_center",
    yearBuilt: "1900-1940",
    averages: {
      equityRatio: 38,
      monthlyFee: 3000,
      debtPerSqm: 7500,
      operatingResult: 350000
    },
    ranges: {
      equityRatio: { min: 23, max: 53 },
      monthlyFee: { min: 2000, max: 4000 },
      debtPerSqm: { min: 5000, max: 10000 }
    }
  },
  malmö_suburban: {
    city: "Malmö",
    areaType: "suburban",
    yearBuilt: "1950-1970",
    averages: {
      equityRatio: 30,
      monthlyFee: 2500,
      debtPerSqm: 11000,
      operatingResult: 200000
    },
    ranges: {
      equityRatio: { min: 15, max: 42 },
      monthlyFee: { min: 1500, max: 3500 },
      debtPerSqm: { min: 7000, max: 15000 }
    }
  }
};

// === BRF ANALYSIS FUNCTIONS ===
export function analyzeBRFEconomy(
  brfName: string,
  metrics: {
    equityRatio: number;
    monthlyFee: number;
    debtPerSqm: number;
    operatingResult: number;
    reserveFund: number;
    totalApartments: number;
    yearBuilt: string;
    lastMajorRenovation: string;
    upcomingRenovations: string[];
  },
  city: string,
  areaType: "urban_center" | "suburban" | "villa_area"
): BRFEconomy {
  // Get benchmark data
  const benchmarkKey = `${city}_${areaType}`;
  const benchmark = BRF_BENCHMARKS[benchmarkKey];
  
  // Determine financial health
  let financialHealth: "excellent" | "good" | "fair" | "poor" | "critical" = "good";
  
  if (metrics.equityRatio < 20) financialHealth = "critical";
  else if (metrics.equityRatio < 30) financialHealth = "poor";
  else if (metrics.equityRatio < 40) financialHealth = "fair";
  else if (metrics.equityRatio > 50) financialHealth = "excellent";
  
  if (metrics.debtPerSqm > 15000 && financialHealth !== "critical") {
    financialHealth = financialHealth === "excellent" ? "good" : "fair";
  }
  
  if (metrics.operatingResult < -100000) {
    financialHealth = "critical";
  } else if (metrics.operatingResult < 0 && financialHealth !== "critical") {
    financialHealth = financialHealth === "excellent" ? "fair" : "poor";
  }
  
  // Analyze risk factors
  const riskFactors = {
    high: [] as string[],
    medium: [] as string[],
    low: [] as string[]
  };
  
  const strengths = {
    high: [] as string[],
    medium: [] as string[],
    low: [] as string[]
  };
  
  // Check against risk factors
  BRF_RISK_FACTORS.forEach(risk => {
    let triggered = false;
    
    switch (risk.category) {
      case "financial":
        if (risk.severity === "critical" && metrics.equityRatio < 30) {
          riskFactors.high.push(risk.description);
          triggered = true;
        } else if (risk.severity === "high" && metrics.debtPerSqm > 15000) {
          riskFactors.high.push(risk.description);
          triggered = true;
        } else if (risk.severity === "medium" && metrics.operatingResult < 0) {
          riskFactors.medium.push(risk.description);
          triggered = true;
        }
        break;
      case "maintenance":
        if (risk.severity === "critical" && metrics.upcomingRenovations.some(r => r.includes("stambyte") || r.includes("akut"))) {
          riskFactors.high.push(risk.description);
          triggered = true;
        } else if (risk.severity === "high" && !metrics.lastMajorRenovation || parseInt(metrics.lastMajorRenovation) < 1980) {
          riskFactors.high.push(risk.description);
          triggered = true;
        }
        break;
    }
    
    // Check strengths
    if (!triggered) {
      if (risk.category === "financial" && metrics.equityRatio > 50) {
        strengths.high.push("Hög soliditet ger finansiell stabilitet");
      } else if (risk.category === "financial" && metrics.debtPerSqm < 5000) {
        strengths.medium.push("Låg skuldsättning per kvm");
      } else if (risk.category === "maintenance" && metrics.lastMajorRenovation && parseInt(metrics.lastMajorRenovation) > 2010) {
        strengths.medium.push("Nyligen genomförda renoveringar");
      }
    }
  });
  
  // Generate recommendations
  const recommendations = {
    immediate: [] as string[],
    shortTerm: [] as string[],
    longTerm: [] as string[]
  };
  
  if (financialHealth === "critical") {
    recommendations.immediate.push("Omedelbar finansiell analys och åtgärdsplan");
    recommendations.immediate.push("Kontakta ekonomisk rådgivare");
  }
  
  if (metrics.equityRatio < 30) {
    recommendations.shortTerm.push("Öka kapitaltillskott genom avgiftshöjning");
    recommendations.shortTerm.push("Utvärdera lånstruktur och refinansiering");
  }
  
  if (metrics.debtPerSqm > 12000) {
    recommendations.shortTerm.push("Planera amortering av lån");
    recommendations.longTerm.push("Minska skuldsättning gradvis");
  }
  
  if (!metrics.lastMajorRenovation || parseInt(metrics.lastMajorRenovation) < 1980) {
    recommendations.shortTerm.push("Inventera renoveringsbehov");
    recommendations.longTerm.push("Planera stambyte och fasadrenovering");
  }
  
  // Market position
  const marketPosition = {
    competitiveness: "medium" as "high" | "medium" | "low",
    feeLevel: "average" as "low" | "average" | "high",
    valueForMoney: "good" as "excellent" | "good" | "fair" | "poor"
  };
  
  if (benchmark) {
    if (metrics.monthlyFee < benchmark.averages.monthlyFee * 0.8) {
      marketPosition.feeLevel = "low";
      marketPosition.competitiveness = "high";
    } else if (metrics.monthlyFee > benchmark.averages.monthlyFee * 1.2) {
      marketPosition.feeLevel = "high";
      marketPosition.competitiveness = "low";
    }
    
    if (financialHealth === "excellent" && marketPosition.feeLevel === "low") {
      marketPosition.valueForMoney = "excellent";
    } else if (financialHealth === "good" && marketPosition.feeLevel === "average") {
      marketPosition.valueForMoney = "good";
    } else if (financialHealth === "fair" || marketPosition.feeLevel === "high") {
      marketPosition.valueForMoney = "fair";
    } else {
      marketPosition.valueForMoney = "poor";
    }
  }
  
  return {
    name: brfName,
    organizationNumber: "", // Would be filled in real implementation
    financialHealth,
    keyMetrics: {
      equityRatio: metrics.equityRatio,
      operatingResult: metrics.operatingResult,
      cashFlow: metrics.operatingResult + (metrics.monthlyFee * metrics.totalApartments * 12), // Simplified
      debtPerSqm: metrics.debtPerSqm,
      reserveFund: metrics.reserveFund,
      monthlyFee: metrics.monthlyFee
    },
    propertyData: {
      totalApartments: metrics.totalApartments,
      totalSqm: 0, // Would be calculated
      yearBuilt: metrics.yearBuilt,
      lastMajorRenovation: metrics.lastMajorRenovation,
      upcomingRenovations: metrics.upcomingRenovations,
      energyClass: "D" // Default
    },
    riskFactors,
    strengths,
    recommendations,
    marketPosition
  };
}

export function generateBRFWarningSigns(economy: BRFEconomy): {
  critical: string[];
  high: string[];
  medium: string[];
  monitoring: string[];
} {
  const critical: string[] = [];
  const high: string[] = [];
  const medium: string[] = [];
  const monitoring: string[] = [];
  
  // Critical warnings
  if (economy.financialHealth === "critical") {
    critical.push("🚨 Kritisk finansiell situation - omedelbar åtgärd krävs");
  }
  
  if (economy.keyMetrics.equityRatio < 20) {
    critical.push("🚨 Extremt låg soliditet - risk för konkurs");
  }
  
  if (economy.keyMetrics.debtPerSqm > 20000) {
    critical.push("🚨 Extremt hög skuldsättning - ohållbar situation");
  }
  
  // High warnings
  if (economy.keyMetrics.equityRatio < 30) {
    high.push("⚠️ Låg soliditet - risk för avgiftshöjningar");
  }
  
  if (economy.keyMetrics.debtPerSqm > 15000) {
    high.push("⚠️ Hög skuldsättning - begränsad finansieringsförmåga");
  }
  
  if (economy.keyMetrics.operatingResult < -50000) {
    high.push("⚠️ Negativt operativt resultat - kostnadsökningar väntas");
  }
  
  // Medium warnings
  if (economy.keyMetrics.equityRatio < 40) {
    medium.push("ℹ️ Måttlig soliditet - bör förbättras");
  }
  
  if (economy.keyMetrics.monthlyFee > 5000) {
    medium.push("ℹ️ Hög månadsavgift - kan påverka säljbarhet");
  }
  
  // Monitoring
  if (economy.financialHealth === "good") {
    monitoring.push("📊 God finansiell hälsa - fortsätt övervaka");
  }
  
  if (economy.marketPosition.competitiveness === "medium") {
    monitoring.push("📊 Medel konkurrenskraft - jämför med liknande föreningar");
  }
  
  return { critical, high, medium, monitoring };
}

export function compareBRFToMarket(economy: BRFEconomy, city: string, areaType: "urban_center" | "suburban" | "villa_area"): {
  aboveAverage: string[];
  belowAverage: string[];
  marketPosition: string;
  recommendations: string[];
} {
  const benchmarkKey = `${city}_${areaType}`;
  const benchmark = BRF_BENCHMARKS[benchmarkKey];
  
  if (!benchmark) {
    return {
      aboveAverage: [],
      belowAverage: [],
      marketPosition: "Kan inte jämföra - ingen benchmarkdata",
      recommendations: ["Skaffa mer data för jämförelse"]
    };
  }
  
  const aboveAverage: string[] = [];
  const belowAverage: string[] = [];
  
  // Compare key metrics
  if (economy.keyMetrics.equityRatio > benchmark.averages.equityRatio) {
    aboveAverage.push(`Soliditet ${economy.keyMetrics.equityRatio}% (medel ${benchmark.averages.equityRatio}%)`);
  } else {
    belowAverage.push(`Soliditet ${economy.keyMetrics.equityRatio}% (medel ${benchmark.averages.equityRatio}%)`);
  }
  
  if (economy.keyMetrics.monthlyFee < benchmark.averages.monthlyFee) {
    aboveAverage.push(`Låg avgift ${economy.keyMetrics.monthlyFee} kr (medel ${benchmark.averages.monthlyFee} kr)`);
  } else {
    belowAverage.push(`Hög avgift ${economy.keyMetrics.monthlyFee} kr (medel ${benchmark.averages.monthlyFee} kr)`);
  }
  
  if (economy.keyMetrics.debtPerSqm < benchmark.averages.debtPerSqm) {
    aboveAverage.push(`Låg skuldsättning ${economy.keyMetrics.debtPerSqm} kr/kvm (medel ${benchmark.averages.debtPerSqm} kr/kvm)`);
  } else {
    belowAverage.push(`Hög skuldsättning ${economy.keyMetrics.debtPerSqm} kr/kvm (medel ${benchmark.averages.debtPerSqm} kr/kvm)`);
  }
  
  // Market position summary
  let marketPosition = "Medelposition";
  if (aboveAverage.length > belowAverage.length) {
    marketPosition = "Över genomsnittet";
  } else if (belowAverage.length > aboveAverage.length) {
    marketPosition = "Under genomsnittet";
  }
  
  // Recommendations
  const recommendations: string[] = [];
  if (belowAverage.includes(`Soliditet ${economy.keyMetrics.equityRatio}%`)) {
    recommendations.push("Öka soliditet genom kapitaltillskott");
  }
  if (belowAverage.includes(`Hög avgift ${economy.keyMetrics.monthlyFee} kr`)) {
    recommendations.push("Granska kostnader för att sänka avgiften");
  }
  if (belowAverage.includes(`Hög skuldsättning ${economy.keyMetrics.debtPerSqm} kr/kvm`)) {
    recommendations.push("Planera amortering av lån");
  }
  
  return {
    aboveAverage,
    belowAverage,
    marketPosition,
    recommendations
  };
}
