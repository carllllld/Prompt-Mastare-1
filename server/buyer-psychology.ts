// === BUYER PSYCHOLOGY DATABASE ===
// Rikstäckande köparpsykologi för svenska fastighetsmarknaden 2025-2026

export interface BuyerSegment {
  name: string;
  ageRange: string;
  income: "low" | "medium" | "high" | "very_high";
  familyStatus: "single" | "couple" | "family_with_kids" | "empty_nester" | "retired";
  motivations: {
    primary: string[];
    secondary: string[];
    emotional: string[];
  };
  priorities: {
    top3: string[];
    important: string[];
    nice_to_have: string[];
  };
  concerns: {
    major: string[];
    minor: string[];
    deal_breakers: string[];
  };
  communication: {
    preferred_channels: string[];
    messaging_style: string;
    key_phrases: string[];
    avoid_phrases: string[];
  };
  financial: {
    budget_sensitivity: "high" | "medium" | "low";
    financing_type: string[];
    price_negotiation: "aggressive" | "moderate" | "minimal";
    investment_horizon: string;
  };
  property_preferences: {
    types: string[];
    locations: string[];
    features: string[];
    size_range: string;
    condition: string[];
  };
  market_behavior: {
    search_duration: string;
    viewing_frequency: string;
    decision_speed: "fast" | "moderate" | "slow";
    competition_tolerance: "high" | "medium" | "low";
  };
  trends_2025: {
    emerging_needs: string[];
    changing_priorities: string[];
    technology_adoption: string[];
    sustainability_focus: string[];
  };
}

export interface PsychologicalTrigger {
  category: "emotional" | "rational" | "social" | "scarcity" | "authority";
  trigger: string;
  description: string;
  application: string;
  effectiveness: number; // 1-10
  examples: string[];
}

export interface DecisionFactor {
  factor: string;
  weight: number; // 1-100
  timing: "immediate" | "short_term" | "long_term";
  emotional_vs_rational: "emotional" | "rational" | "balanced";
  influence_tactics: string[];
}

// === BUYER SEGMENTS DATABASE ===
export const BUYER_SEGMENTS: Record<string, BuyerSegment> = {
  forstagangskopare: {
    name: "Förstagångsköpare",
    ageRange: "25-35",
    income: "medium",
    familyStatus: "single",
    motivations: {
      primary: ["Komma in på bostadsmarknaden", "Ekonomisk trygghet", "Självständighet"],
      secondary: ["Investering", "Status", "Framtid"],
      emotional: ["Drömmen om eget hem", "Vuxenlivet", "Frihet"]
    },
    priorities: {
      top3: ["Pris", "Läge", "Underhållskostnader"],
      important: ["Storlek", "Kommunikation", "Närhet till service"],
      nice_to_have: ["Balkong", "Garderob", "Modern kök"]
    },
    concerns: {
      major: ["Ekonomi", "Dolda kostnader", "Underhåll", "Bostadsrättsföreningens ekonomi"],
      minor: ["Grannar", "Ljud", "Parkering"],
      deal_breakers: ["För hög avgift", "Dåligt skick", "Omgivning"]
    },
    communication: {
      preferred_channels: ["Digitala plattformar", "Social media", "Mäklare"],
      messaging_style: "Informell, transparent, pedagogisk",
      key_phrases: ["Prisvärt", "Låg avgift", "Bra läge", "Lätt underhåll", "Framtidssäker"],
      avoid_phrases: ["Investering", "Renoveringsbehov", "Komplexa termer"]
    },
    financial: {
      budget_sensitivity: "high",
      financing_type: ["Bolån med kontantinsats", "Kapitaltillskott", "Statligt stöd"],
      price_negotiation: "moderate",
      investment_horizon: "5-10 år"
    },
    property_preferences: {
      types: ["Lägenhet", "Radhus"],
      locations: ["Stadskärna", "Kommunikationsnära", "Unga områden"],
      features: ["Balkong", "Förvaring", "Modern standard"],
      size_range: "1-3 rum, 40-80 kvm",
      condition: ["Nyskick", "Mycket gott skick", "Nyligen renoverat"]
    },
    market_behavior: {
      search_duration: "6-12 månader",
      viewing_frequency: "Många visningar",
      decision_speed: "moderate",
      competition_tolerance: "medium"
    },
    trends_2025: {
      emerging_needs: ["Hemmakontor", "Digital service", "Hållbarhet"],
      changing_priorities: ["Flexibelt boende", "Kollektivtrafik", "Digital uppkoppling"],
      technology_adoption: ["Digital visning", "AI-baserad sökning", "Digital signering"],
      sustainability_focus: ["Energiklass", "Miljövänliga material", "Solceller"]
    }
  },
  
  unga_familjer: {
    name: "Unga familjer",
    ageRange: "30-40",
    income: "medium",
    familyStatus: "family_with_kids",
    motivations: {
      primary: ["Utrymme för familjen", "Bra skolor", "Trygghet", "Framtid"],
      secondary: ["Grannskap", "Utomhusyta", "Investering"],
      emotional: ["Familjeliv", "Trygghet", "Tillhörighet", "Barnens framtid"]
    },
    priorities: {
      top3: ["Läge", "Storlek", "Skolor"],
      important: ["Trygghet", "Närhet till service", "Utomhusyta", "Kommunikation"],
      nice_to_have: ["Garage", "Förråd", "Närmare naturen"]
    },
    concerns: {
      major: ["Skolor", "Trygghet", "Kommunikation", "Pris"],
      minor: ["Grannar", "Underhåll", "Parkeringsplatser"],
      deal_breakers: ["Dåliga skolor", "Otryggt område", "För litet", "Dålig kommunikation"]
    },
    communication: {
      preferred_channels: ["Mäklare", "Digitala plattformar", "Sociala medier", "Rekommendationer"],
      messaging_style: "Familjeorienterad, trygg, informativ",
      key_phrases: ["Familjevänligt", "Bra skolor", "Tryggt område", "Närhet till", "Utrymme"],
      avoid_phrases: ["Investering", "Specifikationer", "Komplexa termer"]
    },
    financial: {
      budget_sensitivity: "medium",
      financing_type: ["Bolån", "Sparade medel", "Familjestöd"],
      price_negotiation: "moderate",
      investment_horizon: "10-15 år"
    },
    property_preferences: {
      types: ["Villa", "Radhus", "Stor lägenhet"],
      locations: ["Familjeområden", "Förorter", "Nära skolor"],
      features: ["Trädgård", "Flera rum", "Förvaring", " garage"],
      size_range: "3-5 rum, 80-150 kvm",
      condition: ["Gott skick", "Nyligen renoverat", "Funktionellt"]
    },
    market_behavior: {
      search_duration: "3-6 månader",
      viewing_frequency: "Fokuserade visningar",
      decision_speed: "moderate",
      competition_tolerance: "high"
    },
    trends_2025: {
      emerging_needs: ["Hemmakontor", "Flexibla ytor", "Digital uppkoppling"],
      changing_priorities: ["Närhet till natur", "Hållbarhet", "Kollektivtrafik"],
      technology_adoption: ["Digital visning", "AI-baserad områdesanalys", "Smart home"],
      sustainability_focus: ["Energiklass", "Solceller", "Elbilsladdning", "Regnvatten"]
    }
  },
  
  etablerade_par: {
    name: "Etablerade par",
    ageRange: "40-55",
    income: "high",
    familyStatus: "couple",
    motivations: {
      primary: ["Kvalitet", "Komfort", "Status", "Investering"],
      secondary: ["Design", "Läge", "Utsikt", "Tjänster"],
      emotional: ["Framgång", "Livskvalitet", "Status", "Belöning"]
    },
    priorities: {
      top3: ["Kvalitet", "Läge", "Design"],
      important: ["Utsikt", "Tjänster", "Parkering", "Säkerhet"],
      nice_to_have: ["Takterrass", "Hiss", "Gym", "Concierge"]
    },
    concerns: {
      major: ["Kvalitet", "Läge", "Underhåll", "Status"],
      minor: ["Avgift", "Grannar", "Ljud"],
      deal_breakers: ["Dålig kvalitet", "Fel läge", "Dålig status", "Hög underhållskostnad"]
    },
    communication: {
      preferred_channels: ["Premium mäklare", "Exklusiva plattformar", "Nätverk"],
      messaging_style: "Exklusiv, kvalitetsfokuserad, statusfokuserad",
      key_phrases: ["Exklusivt", "Premium", "Hög kvalitet", "Unikt läge", "Design"],
      avoid_phrases: ["Billigt", "Budget", "Prisvärt", "Erbjudande"]
    },
    financial: {
      budget_sensitivity: "low",
      financing_type: ["Bolån", "Eget kapital", "Investering"],
      price_negotiation: "minimal",
      investment_horizon: "10+ år"
    },
    property_preferences: {
      types: ["Premium lägenhet", "Villa", "Radhus"],
      locations: ["Exklusiva områden", "Stadskärna", "Vattenläge"],
      features: ["Hög kvalitet", "Design", "Utsikt", "Tjänster"],
      size_range: "3-5 rum, 100-200 kvm",
      condition: ["Nyskick", "Premium", "Design", "Hög standard"]
    },
    market_behavior: {
      search_duration: "3-6 månader",
      viewing_frequency: "Selektiva visningar",
      decision_speed: "fast",
      competition_tolerance: "low"
    },
    trends_2025: {
      emerging_needs: ["Smart home", "Hållbarhet", "Digital tjänster"],
      changing_priorities: ["Work-life balance", "Hälsa", "Upplevelser"],
      technology_adoption: ["AI-assistent", "Digital styrsystem", "Säkerhetssystem"],
      sustainability_focus: ["Energiproduktion", "Hållbara material", "Cirkulär ekonomi"]
    }
  },
  
  downsizers: {
    name: "Downsizers",
    ageRange: "55+",
    income: "medium",
    familyStatus: "empty_nester",
    motivations: {
      primary: ["Enklare boende", "Lägre underhåll", "Trygghet", "Kvalitet"],
      secondary: ["Närhet till service", "Socialt umgänge", "Resor"],
      emotional: ["Frihet", "Trygghet", "Nya kapitel", "Livskvalitet"]
    },
    priorities: {
      top3: ["Lågt underhåll", "Trygghet", "Närhet till service"],
      important: ["Tillgänglighet", "Läge", "Kvalitet", "Socialt"],
      nice_to_have: ["Hiss", "Balkong", "Gemensamheter", "Trädgård"]
    },
    concerns: {
      major: ["Underhåll", "Tillgänglighet", "Trygghet", "Ekonomi"],
      minor: ["Ljud", "Grannar", "Parkering"],
      deal_breakers: ["Högt underhåll", "Trappor", "Otryggt", "Dåligt läge"]
    },
    communication: {
      preferred_channels: ["Mäklare", "Rekommendationer", "Lokala tidningar"],
      messaging_style: "Trygg, informativ, praktisk",
      key_phrases: ["Lågt underhåll", "Tryggt", "Praktiskt", "Närhet till", "Tillgängligt"],
      avoid_phrases: ["Investering", "Renovering", "Komplexa termer"]
    },
    financial: {
      budget_sensitivity: "medium",
      financing_type: ["Kapital från tidigare bostad", "Pension", "Bolån"],
      price_negotiation: "moderate",
      investment_horizon: "Långsiktigt"
    },
    property_preferences: {
      types: ["Lägenhet", "Radhus", "Mindre villa"],
      locations: ["Centrum", "Servicenära", "Trygga områden"],
      features: ["Lågt underhåll", "Tillgänglighet", "Hiss", "Balkong"],
      size_range: "2-4 rum, 60-120 kvm",
      condition: ["Gott skick", "Nyligen renoverat", "Praktiskt"]
    },
    market_behavior: {
      search_duration: "6-12 månader",
      viewing_frequency: "Planerade visningar",
      decision_speed: "slow",
      competition_tolerance: "low"
    },
    trends_2025: {
      emerging_needs: ["Tillgänglighet", "Digital tjänster", "Hälsa"],
      changing_priorities: ["Kollektivt boende", "Service", "Trygghet"],
      technology_adoption: ["Digital assistent", "Hälsomonitorering", "Säkerhet"],
      sustainability_focus: ["Energiprestanda", "Låg driftskostnad", "Hållbara material"]
    }
  },
  
  investerare: {
    name: "Investerare",
    ageRange: "30-60",
    income: "high",
    familyStatus: "single",
    motivations: {
      primary: ["Avkastning", "Värdeökning", "Kassaflöde", "Skattefördelar"],
      secondary: ["Portfölj", "Diversifiering", "Passiv inkomst"],
      emotional: ["Framgång", "Kontroll", "Säkerhet", "Status"]
    },
    priorities: {
      top3: ["Avkastning", "Läge", "Underhållskostnader"],
      important: ["Hyrespotential", "Värdeökning", "Skatter", "Marknadstrend"],
      nice_to_have: ["Hyresgäster", "Förvaltning", "Utbud"]
    },
    concerns: {
      major: ["Avkastning", "Risk", "Marknadstrend", "Skatter"],
      minor: ["Förvaltning", "Hyresgäster", "Underhåll"],
      deal_breakers: ["Låg avkastning", "Hög risk", "Dålig marknad", "Skatteproblem"]
    },
    communication: {
      preferred_channels: ["Investeringsnätverk", "Mäklare", "Analyser", "Marknadsdata"],
      messaging_style: "Data-driven, analytisk, resultatorienterad",
      key_phrases: ["Avkastning", "ROI", "Kassaflöde", "Marknad", "Potential"],
      avoid_phrases: ["Känslor", "Dröm", "Hem", "Familj"]
    },
    financial: {
      budget_sensitivity: "low",
      financing_type: ["Bolån", "Eget kapital", "Investerarpartners"],
      price_negotiation: "aggressive",
      investment_horizon: "5-20 år"
    },
    property_preferences: {
      types: ["Lägenhet", "Småhus", "Kommersiell"],
      locations: ["Hög tillväxt", "Universitetsstäder", "Kommunikationsnav"],
      features: ["Hyrespotential", "Lågt underhåll", "Goda avkastning"],
      size_range: "1-4 rum, 30-120 kvm",
      condition: ["Gott skick", "Lågt underhåll", "Hyresklart"]
    },
    market_behavior: {
      search_duration: "1-3 månader",
      viewing_frequency: "Fokuserade analyser",
      decision_speed: "fast",
      competition_tolerance: "high"
    },
    trends_2025: {
      emerging_needs: ["Hållbara investeringar", "Digital förvaltning", "ESG"],
      changing_priorities: ["Riskhantering", "Diversifiering", "Långsiktighet"],
      technology_adoption: ["AI-analys", "Digital förvaltning", "Automatisering"],
      sustainability_focus: ["Gröna byggnader", "Energiprestanda", "Hållbarhetscertifiering"]
    }
  }
};

// === PSYCHOLOGICAL TRIGGERS DATABASE ===
export const PSYCHOLOGICAL_TRIGGERS: PsychologicalTrigger[] = [
  {
    category: "emotional",
    trigger: "Förlustaversion",
    description: "Människor föredrar att undvika förluster framför att få vinster",
    application: "Fokusera på vad de missar om de inte agerar",
    effectiveness: 9,
    examples: [
      "Missa inte chansen att bo i detta eftertraktade område",
      "Priset förväntas stiga - agera nu",
      "Få objekt säljs innan de kommer ut på marknaden"
    ]
  },
  {
    category: "scarcity",
    trigger: "Knapphetseffekten",
    description: "Sällsynta objekt upplevs som mer värdefulla",
    application: "Begränsat antal, tidsbegränsning, unikhet",
    effectiveness: 8,
    examples: [
      "Endast 3 lägenheter kvar i detta populära projekt",
      "Sista chansen - säljning avslutar nästa vecka",
      "Unikt läge med utsikt - sällsynt på marknaden"
    ]
  },
  {
    category: "social",
    trigger: "Socialt bevis",
    description: "Människor följer andras beteende och val",
    application: "Visa att andra är intresserade, referenser",
    effectiveness: 7,
    examples: [
      "Flera intressenter har bokat visning",
      "Området är populärt bland unga familjer",
      "Tidigare köpare är mycket nöjda"
    ]
  },
  {
    category: "authority",
    trigger: "Auktoritetsprincipen",
    description: "Människor litar på experter och auktoriteter",
    application: "Expertutlåtanden, certifieringar, premiummärken",
    effectiveness: 8,
    examples: [
      "Certifierad energiklass A",
      "Byggt av ledande arkitekt",
      "Rekommenderat av experter"
    ]
  },
  {
    category: "rational",
    trigger: "Ankareffekten",
    description: "Första informationen påverkar efterföljande bedömningar",
    application: "Starta med starka argument, sätta referenspunkt",
    effectiveness: 7,
    examples: [
      "Värde 5.5M kr - nu 4.8M kr",
      "Marknadens bästa läge för denna prisklass",
      "Jämfört med liknande objekt i området"
    ]
  },
  {
    category: "emotional",
    trigger: "Framtidsvision",
    description: "Människor köper framtiden, inte bara nuet",
    application: "Måla upp bilder av framtida livet",
    effectiveness: 9,
    examples: [
      "Föreställ dig morgonkaffet på balkongen",
      "Perfekt plats för familjen att växa",
      "Ditt nya kapitel börjar här"
    ]
  },
  {
    category: "social",
    trigger: "Tillhörighet",
    description: "Behovet av att passa in och tillhöra en grupp",
    application: "Beskriv grannskapet, gemenskapen, livsstilen",
    effectiveness: 8,
    examples: [
      "Bli en del av detta exklusiva grannskap",
      "Gemensamhetsområden för socialt umgänge",
      "Området där likasinnade bor"
    ]
  },
  {
    category: "rational",
    trigger: "Rekiprocity",
    description: "Människor känner en skyldighet att ge tillbaka",
    application: "Erbjud värdefull information, extra tjänster",
    effectiveness: 6,
    examples: [
      "Gratis värdering av din nuvarande bostad",
      "Hjälp med finansiering och juridik",
      "Exklusiv visning för seriösa intressenter"
    ]
  }
];

// === DECISION FACTORS DATABASE ===
export const DECISION_FACTORS: DecisionFactor[] = [
  {
    factor: "Pris",
    weight: 85,
    timing: "immediate",
    emotional_vs_rational: "rational",
    influence_tactics: ["Jämförelse", "Värdeargument", "Tidsbegränsning"]
  },
  {
    factor: "Läge",
    weight: 80,
    timing: "immediate",
    emotional_vs_rational: "balanced",
    influence_tactics: ["Framtidsvision", "Socialt bevis", "Knapphet"]
  },
  {
    factor: "Kvalitet",
    weight: 75,
    timing: "short_term",
    emotional_vs_rational: "rational",
    influence_tactics: ["Auktoritet", "Detaljer", "Garantier"]
  },
  {
    factor: "Känsla",
    weight: 70,
    timing: "immediate",
    emotional_vs_rational: "emotional",
    influence_tactics: ["Framtidsvision", "Storytelling", "Sensorisk beskrivning"]
  },
  {
    factor: "Underhållskostnader",
    weight: 65,
    timing: "long_term",
    emotional_vs_rational: "rational",
    influence_tactics: ["Data", "Jämförelse", "Trygghet"]
  },
  {
    factor: "Status",
    weight: 60,
    timing: "short_term",
    emotional_vs_rational: "emotional",
    influence_tactics: ["Socialt bevis", "Exklusivitet", "Auktoritet"]
  },
  {
    factor: "Investering",
    weight: 55,
    timing: "long_term",
    emotional_vs_rational: "rational",
    influence_tactics: ["Data", "Trender", "Riskhantering"]
  },
  {
    factor: "Praktiska behov",
    weight: 50,
    timing: "immediate",
    emotional_vs_rational: "rational",
    influence_tactics: ["Problemlösning", "Funktion", "Bekvämlighet"]
  }
];

// === ANALYSIS FUNCTIONS ===
export function identifyBuyerSegment(
  age: number,
  income: string,
  familyStatus: string,
  propertyType: string,
  location: string,
  budget: number
): BuyerSegment | null {
  // Simple segment identification logic
  if (age >= 25 && age <= 35 && (income === "medium" || income === "low")) {
    return BUYER_SEGMENTS.forstagangskopare;
  }
  
  if (age >= 30 && age <= 40 && (familyStatus === "family_with_kids" || familyStatus === "couple")) {
    return BUYER_SEGMENTS.unga_familjer;
  }
  
  if (age >= 40 && age <= 55 && (income === "high" || income === "very_high")) {
    return BUYER_SEGMENTS.etablerade_par;
  }
  
  if (age >= 55 && (familyStatus === "empty_nester" || familyStatus === "retired")) {
    return BUYER_SEGMENTS.downsizers;
  }
  
  // If budget is high and focus is on investment
  if (budget > 5000000 && (income === "high" || income === "very_high")) {
    return BUYER_SEGMENTS.investerare;
  }
  
  return null;
}

export function getPsychologicalTriggers(segment: BuyerSegment): PsychologicalTrigger[] {
  // Return relevant triggers based on segment
  const relevantTriggers: PsychologicalTrigger[] = [];
  
  if (segment.name === "Förstagångsköpare") {
    relevantTriggers.push(
      PSYCHOLOGICAL_TRIGGERS.find(t => t.trigger === "Förlustaversion")!,
      PSYCHOLOGICAL_TRIGGERS.find(t => t.trigger === "Ankareffekten")!
    );
  }
  
  if (segment.name === "Unga familjer") {
    relevantTriggers.push(
      PSYCHOLOGICAL_TRIGGERS.find(t => t.trigger === "Socialt bevis")!,
      PSYCHOLOGICAL_TRIGGERS.find(t => t.trigger === "Framtidsvision")!
    );
  }
  
  if (segment.name === "Etablerade par") {
    relevantTriggers.push(
      PSYCHOLOGICAL_TRIGGERS.find(t => t.trigger === "Auktoritetsprincipen")!,
      PSYCHOLOGICAL_TRIGGERS.find(t => t.trigger === "Knapphetseffekten")!
    );
  }
  
  if (segment.name === "Downsizers") {
    relevantTriggers.push(
      PSYCHOLOGICAL_TRIGGERS.find(t => t.trigger === "Framtidsvision")!,
      PSYCHOLOGICAL_TRIGGERS.find(t => t.trigger === "Tillhörighet")!
    );
  }
  
  if (segment.name === "Investerare") {
    relevantTriggers.push(
      PSYCHOLOGICAL_TRIGGERS.find(t => t.trigger === "Ankareffekten")!,
      PSYCHOLOGICAL_TRIGGERS.find(t => t.trigger === "Rekiprocity")!
    );
  }
  
  return relevantTriggers;
}

export function generatePsychologicalProfile(
  propertyData: any,
  targetSegment: BuyerSegment
): {
  segment: BuyerSegment;
  triggers: PsychologicalTrigger[];
  decision_factors: DecisionFactor[];
  messaging_strategy: {
    key_messages: string[];
    emotional_appeals: string[];
    rational_arguments: string[];
    call_to_action: string;
  };
  risk_mitigation: {
    concerns: string[];
    reassurances: string[];
    proof_points: string[];
  };
} {
  const triggers = getPsychologicalTriggers(targetSegment);
  
  // Get relevant decision factors
  const decision_factors = DECISION_FACTORS.filter(factor => 
    factor.weight >= 60 || 
    (targetSegment.priorities.top3.includes(factor.factor.toLowerCase()))
  );
  
  // Generate messaging strategy
  const messaging_strategy = {
    key_messages: targetSegment.motivations.primary,
    emotional_appeals: targetSegment.motivations.emotional,
    rational_arguments: targetSegment.priorities.top3,
    call_to_action: `Kontakta oss för en skräddarsydd visning för ${targetSegment.name.toLowerCase()}`
  };
  
  // Risk mitigation
  const risk_mitigation = {
    concerns: targetSegment.concerns.major,
    reassurances: targetSegment.priorities.top3.map(p => `Vi erbjuder ${p.toLowerCase()} av högsta kvalitet`),
    proof_points: [
      "Referenser från nöjda köpare",
      "Data från marknadsanalys",
      "Expertutlåtanden"
    ]
  };
  
  return {
    segment: targetSegment,
    triggers,
    decision_factors,
    messaging_strategy,
    risk_mitigation
  };
}

export function getTrendingBuyerBehaviors2025(): {
  emerging_segments: string[];
  changing_priorities: string[];
  new_technology_adoption: string[];
  sustainability_focus: string[];
  market_implications: string[];
} {
  return {
    emerging_segments: ["Digital nomads", "Hållbara köpare", "Flexibla boende"],
    changing_priorities: ["Hemmakontor", "Digital uppkoppling", "Hållbarhet", "Work-life balance"],
    new_technology_adoption: ["AI-assisterad sökning", "Digital visning", "Blockchain", "Smart home"],
    sustainability_focus: ["Energiprestanda", "Hållbara material", "Cirkulär ekonomi", "Koldioxidavtryck"],
    market_implications: ["Högre krav på digital standard", "Prispremie för hållbarhet", "Ökat fokus på läge", "Längre beslutsprocesser"]
  };
}
