// === ARCHITECTURAL DATABASE ===
// Rikstäckande arkitekturdatabas för svenska fastigheter 1880-2026

export interface ArchitecturalEra {
  name: string;
  period: string;
  characteristics: {
    style: string;
    materials: string[];
    colors: string[];
    features: string[];
    layout: string;
  };
  sellingPoints: {
    primary: string[];
    emotional: string[];
    investment: string[];
  };
  commonIn: string[];
  maintenance: {
    typical: string[];
    costs: "low" | "medium" | "high";
    frequency: string[];
  };
  energyEfficiency: "poor" | "fair" | "good" | "excellent";
  modernization: {
    potential: "low" | "medium" | "high";
    commonUpgrades: string[];
    roi: string[];
  };
}

export interface MaterialData {
  name: string;
  type: "flooring" | "wall" | "kitchen" | "bathroom" | "exterior" | "roof";
  characteristics: {
    durability: "low" | "medium" | "high";
    maintenance: "low" | "medium" | "high";
    price: "budget" | "standard" | "premium";
    style: string[];
    era: string[];
  };
  sellingPoints: {
    practical: string[];
    aesthetic: string[];
    status: string[];
  };
  concerns: string[];
  modernAlternatives: string[];
}

export interface StyleProfile {
  name: string;
  description: string;
  targetBuyer: string[];
  keyFeatures: string[];
  colorPalette: string[];
  materials: string[];
  furniture: string[];
  atmosphere: string;
  pricePremium: number; // % över standard
}

// === ARCHITECTURAL ERAS DATABASE ===
export const ARCHITECTURAL_ERAS: Record<string, ArchitecturalEra> = {
  sekelskifte: {
    name: "Sekelskifte/Jugend",
    period: "1880-1920",
    characteristics: {
      style: "Nationalromantik, Jugend, Art Nouveau",
      materials: ["Trä", "Målat tegel", "Snedtak", "Spröjsade fönster", "Möjligen marmor"],
      colors: ["Mörkgröna", "Burgundy", "Mörkblå", "Beige", "Guldaccents"],
      features: ["Takhöjd 3.2m+", "Stuckatur", "Golvlister", "Spegeldörrar", "Kakelugnar", "Balkonger"],
      layout: "Rum i fil, separata matsalar, höga fönster"
    },
    sellingPoints: {
      primary: ["Sekelskiftescharm", "Originaldetaljer", "Högt i tak", "Golvlister", "Kakelugn"],
      emotional: ["Historia", "Karaktär", "Tidlös elegans", "Status"],
      investment: ["Eftertraktad stil", "Värdebeständig", "Renoveringspotential"]
    },
    commonIn: ["Stockholm innerstad", "Göteborg Majorna", "Malmö Väster", "Landsortsstäder"],
    maintenance: {
      typical: ["Fönstermålning", "Träunderhåll", "Kakelugnservice"],
      costs: "high",
      frequency: ["Vart 5:e år", "Löpande"]
    },
    energyEfficiency: "poor",
    modernization: {
      potential: "medium",
      commonUpgrades: ["Fönsterbyten", "Isolering", "VVS-uppdatering", "Köksmodernisering"],
      roi: ["Energibesparing", "Ökat värde", "Bättre komfort"]
    }
  },
  
  klassicism: {
    name: "Klassicism",
    period: "1920-1940",
    characteristics: {
      style: "Nordisk klassicism, Funktionalismens föregångare",
      materials: ["Målat tegel", "Kalksten", "Trä", "Golv av ek eller furu"],
      colors: ["Vita", "Ljusgrå", "Beige", "Mörkgröna dörrar", "Svarta detaljer"],
      features: ["Symmetri", "Kolonader", "Pilaster", "Raka linjer", "Höga fönster"],
      layout: "Strukturerad, balanserad rumsfördelning"
    },
    sellingPoints: {
      primary: ["Tidlös elegans", "Symmetrisk", "Ljusa ytor", "Hög takhöjd"],
      emotional: ["Ordning", "Harmoni", "Kulturell förankring", "Exklusivitet"],
      investment: ["Sällsynt stil", "Hög status", "Värdebeständig"]
    },
    commonIn: ["Stockholm Östermalm", "Göteborg Haga", "Malmö Limhamn", "Diplomatstadsdelar"],
    maintenance: {
      typical: ["Fasadmålning", "Stenunderhåll", "Fönsterunderhåll"],
      costs: "medium",
      frequency: ["Vart 10:e år", "Löpande"]
    },
    energyEfficiency: "fair",
    modernization: {
      potential: "medium",
      commonUpgrades: ["Energifönster", "VVS", "Köksrenovering"],
      roi: ["Energibesparing", "Modern komfort"]
    }
  },
  
  funkis: {
    name: "Funktionalism",
    period: "1930-1950",
    characteristics: {
      style: "Stram, funktionell, rationell",
      materials: ["Betong", "Stål", "Glas", "Putsfasad", "Linoleum", "Kakel"],
      colors: ["Vita", "Grå", "Svarta", "Primärfärger som accent"],
      features: ["Fönsterband", "Flata tak", "Rörledningar synliga", "Balkonger", "Öppen planlösning"],
      layout: "Öppen, flexibel, sociala ytor"
    },
    sellingPoints: {
      primary: ["Funktionell layout", "Ljusa ytor", "Balkong", "Öppen planlösning"],
      emotional: ["Moderna ideal", "Svensk design", "Rationell livsstil", "Arkitektoniskt intresse"],
      investment: ["Tidlös design", "Lågt underhåll", "Populär stil"]
    },
    commonIn: ["Stockholm Södermalm", "Göteborg Majorna", "Malmö Västra Hamnen", "Universitetsstäder"],
    maintenance: {
      typical: ["Fasadvård", "Balkongunderhåll", "Fönsterputs"],
      costs: "low",
      frequency: ["Vart 15:e år", "Årlig putsning"]
    },
    energyEfficiency: "fair",
    modernization: {
      potential: "high",
      commonUpgrades: ["Energifönster", "Balkonginglasning", "Köksmodernisering"],
      roi: ["Ökat bovärde", "Bättre energiprestanda"]
    }
  },
  
  folkhemmet: {
    name: "Folkhemmet",
    period: "1950-1960",
    characteristics: {
      style: "Funktionell med socialt fokus, folklig modernism",
      materials: ["Gult tegel", "Trä", "Linoleum", "Plåt", "Betong"],
      colors: ["Gula", "Röda", "Gröna", "Bruna", "Beige"],
      features: ["Balkonger", "Fönsterbänkar", "Förvaring", "Praktiska kök", "Badrum med dusch"],
      layout: "Familjeanpassad, praktisk, social"
    },
    sellingPoints: {
      primary: ["Praktisk layout", "Balkong", "God förvaring", "Familjevänlig"],
      emotional: ["Svensk folkhem", "Trygghet", "Gemenskap", "Praktisk livsstil"],
      investment: ["Eftertraktad stil", "Lågt underhåll", "Familjevänlig"]
    },
    commonIn: ["Stockholm Västerort", "Göteborg outerområden", "Malmö förorter", "Miljonprogramsområden"],
    maintenance: {
      typical: ["Fasadmålning", "Balkongunderhåll", "Fönsterunderhåll"],
      costs: "medium",
      frequency: ["Vart 20:e år", "Löpande"]
    },
    energyEfficiency: "fair",
    modernization: {
      potential: "high",
      commonUpgrades: ["Energifönster", "Köksrenovering", "Badrumsmodernisering"],
      roi: ["Energibesparing", "Ökat bovärde"]
    }
  },
  
  miljonprogrammet: {
    name: "Miljonprogrammet",
    period: "1960-1970",
    characteristics: {
      style: "Industrialiserad, prefabricerad, betongdominans",
      materials: ["Prefabricerad betong", "Aluminium", "Plast", "Linoleum", "Standardiserade element"],
      colors: ["Grå", "Beige", "Bruna", "Gröna", "Blå"],
      features: ["Standardiserade planlösningar", "Balkonger", "Förråd", "Gemensamma utrymmen"],
      layout: "Effektiv, standardiserad, social"
    },
    sellingPoints: {
      primary: ["Stora ytor", "Balkong", "Lågt pris", "Goda kommunikationer"],
      emotional: ["Social miljö", "Funktionell", "Praktisk", "Tillgänglig"],
      investment: ["Renoveringspotential", "Lågt inträde", "Uppgraderingsmöjligheter"]
    },
    commonIn: ["Stockholm outerområden", "Göteborg förorter", "Malmö Rosengård", "Sveriges alla städer"],
    maintenance: {
      typical: ["Fasadrenovering", "VVS", "Fönsterbyten"],
      costs: "high",
      frequency: ["Vart 30-40:e år", "Löpande"]
    },
    energyEfficiency: "poor",
    modernization: {
      potential: "high",
      commonUpgrades: ["Totalrenovering", "Energifönster", "Nya kök/badrum"],
      roi: ["Högt värdeökning", "Betydande energibesparing"]
    }
  },
  
  postmodernism: {
    name: "Postmodernism",
    period: "1970-1990",
    characteristics: {
      style: "Eklektisk, lekfull, dekonstruktiv",
      materials: ["Många material", "Färg", "Differentierade former", "Blandade texturer"],
      colors: ["Många färger", "Pasteller", "Starka kontraster", "Jordnära toner"],
      features: ["Asymmetri", "Bågar", "Valv", "Differentierade fönster", "Kombinationer av stilar"],
      layout: "Experimentell, individuell, ofta komplex"
    },
    sellingPoints: {
      primary: ["Unik design", "Individuell", "Spännande detaljer", "Arkitektoniskt intresse"],
      emotional: ["Personlighet", "Kreativitet", "Unikhet", "Moderna ideal"],
      investment: ["Nischad stil", "Potentiellt värde", "Arkitektonisk betydelse"]
    },
    commonIn: ["Stockholm innerstad", "Göteborg centrum", "Malmö Västra Hamnen", "Specialprojekt"],
    maintenance: {
      typical: ["Komplext underhåll", "Specialiserade material"],
      costs: "high",
      frequency: ["Variabelt", "Specialiserat"]
    },
    energyEfficiency: "fair",
    modernization: {
      potential: "medium",
      commonUpgrades: ["Energiförbättringar", "Anpassning"],
      roi: ["Varierande"]
    }
  },
  
  millenieskiftet: {
    name: "Millennieskiftet",
    period: "2000-2010",
    characteristics: {
      style: "Modern minimalistisk, teknologisk, öppen",
      materials: ["Glas", "Stål", "Betong", "Trä", "Modern plast", "Kakel", "Kvarts"],
      colors: ["Vita", "Svarta", "Grå", "Trätoner", "Metalliska accenter"],
      features: ["Stora fönsterpartier", "Öppen planlösning", "Tekniska system", "Balkonger", "Garderob"],
      layout: "Öppen, social, teknologisk"
    },
    sellingPoints: {
      primary: ["Öppen planlösning", "Stora fönster", "Modern teknik", "Balkong", "Garderob"],
      emotional: ["Modern livsstil", "Socialt", "Ljust och luftigt", "Teknisk"],
      investment: ["Eftertraktad period", "Modern standard", "Lågt underhåll"]
    },
    commonIn: ["Nya bostadsområden", "Stadsutveckling", "Premiumlägen", "Urban infill"],
    maintenance: {
      typical: ["Teknisk service", "Fönsterputs", "Lågt underhåll"],
      costs: "low",
      frequency: ["Minimalt", "Teknisk service"]
    },
    energyEfficiency: "good",
    modernization: {
      potential: "low",
      commonUpgrades: ["Teknikuppdatering", "Små justeringar"],
      roi: ["Minimal"]
    }
  },
  
  nyproduktion: {
    name: "Nyproduktion",
    period: "2015-2026",
    characteristics: {
      style: "Hållbar, teknologisk, flexibel, minimalistisk",
      materials: ["Hållbara material", "Trä", "Betong", "Glas", "Recirkulerat", "Lokala material"],
      colors: ["Neutrala paletter", "Naturliga toner", "Gröna accenter", "Jordnära färger"],
      features: ["Hållbarhet", "Smart home", "Laddstationer", "Solceller", "Flexibla ytor", "Gemensamhetsutrymmen"],
      layout: "Flexibel, hållbar, teknologisk, social"
    },
    sellingPoints: {
      primary: ["Nytt", "Hållbart", "Smart home", "Låg energikostnad", "Modern standard"],
      emotional: ["Framtid", "Hållbarhet", "Teknologi", "Trygghet", "Status"],
      investment: ["Garanti", "Låg driftskostnad", "Framtidssäker", "Hållbarhetsvärde"]
    },
    commonIn: ["Alla nya projekt", "Stadsutveckling", "Hållbara områden", "Premiumprojekt"],
    maintenance: {
      typical: ["Minimalt", "Garantier", "Serviceavtal"],
      costs: "low",
      frequency: ["Minimalt", "Garantiperiod"]
    },
    energyEfficiency: "excellent",
    modernization: {
      potential: "low",
      commonUpgrades: [],
      roi: ["Inget behov"]
    }
  }
};

// === MATERIALS DATABASE ===
export const MATERIALS_DATABASE: Record<string, MaterialData> = {
  // Golv
  ekparkett: {
    name: "Ekparkett",
    type: "flooring",
    characteristics: {
      durability: "high",
      maintenance: "medium",
      price: "premium",
      style: ["Klassisk", "Modern", "Sekelskifte"],
      era: ["sekelskifte", "klassicism", "funkis", "millenieskiftet"]
    },
    sellingPoints: {
      practical: ["Hållbart", "Tåligt", "Återanvändningsbart", "Ökar i värde"],
      aesthetic: ["Vackert", "Tidlöst", "Varm färg", "Struktur"],
      status: ["Premium", "Kvalitet", "Eftertraktat"]
    },
    concerns: ["Kan repas", "Kan missfärgas", "Pris"],
    modernAlternatives: ["Laminat", "Kork", "Bamboo", "Vinyl"]
  },
  
  klinker: {
    name: "Klinker",
    type: "flooring",
    characteristics: {
      durability: "high",
      maintenance: "low",
      price: "standard",
      style: ["Praktisk", "Modern", "Funktionell"],
      era: ["funkis", "folkhemmet", "nyproduktion"]
    },
    sellingPoints: {
      practical: ["Lättställt", "Tåligt", "Hållbart", "Allergivänligt"],
      aesthetic: ["Rent", "Ljust", "Enkelt", "Praktiskt"],
      status: ["Funktionellt", "Praktiskt", "Lågt underhåll"]
    },
    concerns: ["Kallt", "Hårt", "Kan spricka"],
    modernAlternatives: ["Sten", "Betong", "Vinyl", "Kork"]
  },
  
  laminat: {
    name: "Laminat",
    type: "flooring",
    characteristics: {
      durability: "medium",
      maintenance: "low",
      price: "budget",
      style: ["Modern", "Praktisk", "Budget"],
      era: ["postmodernism", "nyproduktion"]
    },
    sellingPoints: {
      practical: ["Billigt", "Lättställt", "Lätt att lägga", "Många utseenden"],
      aesthetic: ["Ser ut som trä", "Många stilar", "Enkelt"],
      status: ["Budgetvänligt", "Praktiskt"]
    },
    concerns: ["Kan skadas", "Inte återanvändningsbart", "Ljud"],
    modernAlternatives: ["Vinyl", "Kork", "Bamboo", "Billig parkett"]
  },
  
  // Kök
  ballingslov: {
    name: "Ballingslöv",
    type: "kitchen",
    characteristics: {
      durability: "high",
      maintenance: "low",
      price: "premium",
      style: ["Svensk design", "Modern", "Klassisk"],
      era: ["millenieskiftet", "nyproduktion"]
    },
    sellingPoints: {
      practical: ["Hög kvalitet", "Lång livslängd", "Svenskt", "Garanti"],
      aesthetic: ["Vackert", "Tidlöst", "Svensk design", "Kvalitetskänsla"],
      status: ["Premium", "Svensk kvalitet", "Eftertraktat"]
    },
    concerns: ["Pris", "Leveranstid"],
    modernAlternatives: ["Marbodal", "IKEA", "HTH", "Noblessa"]
  },
  
  marbodal: {
    name: "Marbodal",
    type: "kitchen",
    characteristics: {
      durability: "high",
      maintenance: "low",
      price: "standard",
      style: ["Svensk design", "Familjevänlig", "Modern"],
      era: ["millenieskiftet", "nyproduktion"]
    },
    sellingPoints: {
      practical: ["Hög kvalitet", "Svenskt", "Familjeanpassat", "Bra garanti"],
      aesthetic: ["Vackert", "Tidlöst", "Svensk design", "Varmt"],
      status: ["Kvalitet", "Svenskt", "Pålitligt"]
    },
    concerns: ["Pris", "Design kan upplevas som traditionell"],
    modernAlternatives: ["Ballingslöv", "IKEA", "HTH", "Noblessa"]
  },
  
  ikea: {
    name: "IKEA",
    type: "kitchen",
    characteristics: {
      durability: "medium",
      maintenance: "medium",
      price: "budget",
      style: ["Svensk design", "Praktisk", "Modern"],
      era: ["folkhemmet", "postmodernism", "nyproduktion"]
    },
    sellingPoints: {
      practical: ["Billigt", "Lätt att byta", "Svenskt", "Många stilar"],
      aesthetic: ["Modern design", "Svensk stil", "Funktionellt", "Enkelt"],
      status: ["Budgetvänligt", "Svenskt", "Praktiskt"]
    },
    concerns: ["Kvalitet", "Hållbarhet", "Montering"],
    modernAlternatives: ["Marbodal", "Ballingslöv", "HTH", "Noblessa"]
  },
  
  // Badrum
  kakel: {
    name: "Kakel",
    type: "bathroom",
    characteristics: {
      durability: "high",
      maintenance: "low",
      price: "standard",
      style: ["Klassisk", "Modern", "Praktisk"],
      era: ["sekelskifte", "funkis", "nyproduktion"]
    },
    sellingPoints: {
      practical: ["Hållbart", "Lättställt", "Vattentätt", "Tåligt"],
      aesthetic: ["Vackert", "Många stilar", "Tidlöst", "Rent"],
      status: ["Klassiskt", "Praktiskt", "Hållbart"]
    },
    concerns: ["Kan spricka", "Svårt att byta", "Kallt"],
    modernAlternatives: ["Sten", "Betong", "Komposit", "Vinyl"]
  },
  
  komposit: {
    name: "Komposit",
    type: "kitchen",
    characteristics: {
      durability: "high",
      maintenance: "low",
      price: "standard",
      style: ["Modern", "Praktisk", "Hållbar"],
      era: ["millenieskiftet", "nyproduktion"]
    },
    sellingPoints: {
      practical: ["Hållbart", "Lättställt", "Stöttålighet", "Praktiskt"],
      aesthetic: ["Modernt", "Rent", "Enhetligt", "Professionellt"],
      status: ["Modern", "Hållbart", "Praktiskt"]
    },
    concerns: ["Kan repas", "Vikt", "Pris"],
    modernAlternatives: ["Sten", "Kvarts", "Laminat", "Betong"]
  }
};

// === STYLE PROFILES ===
export const STYLE_PROFILES: Record<string, StyleProfile> = {
  sekelskifteselegans: {
    name: "Sekelskifteselegans",
    description: "Tidlös och sofistikerad stil med historisk karaktär",
    targetBuyer: ["Etablerade par", "Kultursäljare", "Designintresserade"],
    keyFeatures: ["Originaldetaljer", "Högt i tak", "Kakelugn", "Golvlister", "Spegeldörrar"],
    colorPalette: ["Mörkgrönt", "Burgundy", "Beige", "Guld", "Mörkbrunt"],
    materials: ["Ekparkett", "Målad vägg", "Kakelugn", "Mässing", "Sammet"],
    furniture: ["Antika möbler", "Sekelskiftesmöbler", "Designklassiker"],
    atmosphere: "Historisk charm med modern komfort",
    pricePremium: 25
  },
  
  modernminimalistisk: {
    name: "Modern Minimalistisk",
    description: "Stram och ren design med fokus på funktion och ljus",
    targetBuyer: ["Unga par", "Yrkesverksamma", "Designintresserade"],
    keyFeatures: ["Öppen planlösning", "Stora fönster", "Minimalistisk inredning", "Neutrala färger"],
    colorPalette: ["Vit", "Grå", "Svart", "Trätoner", "Metall"],
    materials: ["Betong", "Stål", "Glas", "Ljust trä", "Marmor"],
    furniture: ["Scandinavian design", "IKEA", "Form", "String"],
    atmosphere: "Ljust, luftigt och funktionellt",
    pricePremium: 15
  },
  
  funkisinspirerad: {
    name: "Funkisinspirerad",
    description: "Funktionell och praktisk design med sociala ytor",
    targetBuyer: ["Familjer", "Sociala personer", "Praktiska"],
    keyFeatures: ["Öppen planlösning", "Balkong", "Sociala ytor", "Funktionell"],
    colorPalette: ["Vit", "Grå", "Primärfärger", "Svart"],
    materials: ["Betong", "Stål", "Glas", "Linoleum", "Kakel"],
    furniture: ["Funktionell design", "IKEA", "String", "HAY"],
    atmosphere: "Socialt och funktionellt",
    pricePremium: 10
  },
  
  lantligcharm: {
    name: "Lantlig Charm",
    description: "Mysig och inbjudande stil med landlig karaktär",
    targetBuyer: ["Familjer", "Naturälskare", "Traditionella"],
    keyFeatures: ["Trä", "Mysiga ytor", "Traditionell", "Varmt"],
    colorPalette: ["Vitt", "Trätoner", "Rött", "Grönt", "Beige"],
    materials: ["Trä", "Sten", "Läder", "Ull", "Koppar"],
    furniture: ["Lantlig stil", "Antika", "Handgjord", "Traditionell"],
    atmosphere: "Mysigt och inbjudande",
    pricePremium: 5
  },
  
  lyxmodern: {
    name: "Lyxmodern",
    description: "Exklusiv och sofistikerad design med premiummaterial",
    targetBuyer: ["Höginkomsttagare", "Statussökande", "Designintresserade"],
    keyFeatures: ["Premiummaterial", "Smart home", "Exklusiva detaljer", "Hög standard"],
    colorPalette: ["Svart", "Vit", "Guld", "Mörkblått", "Marmor"],
    materials: ["Marmor", "Mässing", "Premiumträ", "Stål", "Glas"],
    furniture: ["Designermöbler", "Exklusiva märken", "Custom", "Limited edition"],
    atmosphere: "Exklusivt och sofistikerat",
    pricePremium: 40
  }
};

// === ANALYSIS FUNCTIONS ===
export function getArchitecturalEra(year: string, features: string[]): ArchitecturalEra | null {
  // Simple era detection based on year and features
  const yearNum = parseInt(year);
  
  if (yearNum >= 1880 && yearNum <= 1920) return ARCHITECTURAL_ERAS.sekelskifte;
  if (yearNum >= 1920 && yearNum <= 1940) return ARCHITECTURAL_ERAS.klassicism;
  if (yearNum >= 1930 && yearNum <= 1950) return ARCHITECTURAL_ERAS.funkis;
  if (yearNum >= 1950 && yearNum <= 1960) return ARCHITECTURAL_ERAS.folkhemmet;
  if (yearNum >= 1960 && yearNum <= 1970) return ARCHITECTURAL_ERAS.miljonprogrammet;
  if (yearNum >= 1970 && yearNum <= 1990) return ARCHITECTURAL_ERAS.postmodernism;
  if (yearNum >= 2000 && yearNum <= 2010) return ARCHITECTURAL_ERAS.millenieskiftet;
  if (yearNum >= 2015) return ARCHITECTURAL_ERAS.nyproduktion;
  
  // Feature-based detection
  if (features.includes("stuckatur") || features.includes("kakelugn")) return ARCHITECTURAL_ERAS.sekelskifte;
  if (features.includes("fönsterband") || features.includes("platt tak")) return ARCHITECTURAL_ERAS.funkis;
  if (features.includes("öppen planlösning") || features.includes("smart home")) return ARCHITECTURAL_ERAS.nyproduktion;
  
  return null;
}

export function getMaterialData(material: string): MaterialData | null {
  return MATERIALS_DATABASE[material.toLowerCase()] || null;
}

export function getStyleProfile(style: string): StyleProfile | null {
  return STYLE_PROFILES[style.toLowerCase()] || null;
}

export function analyzeArchitecturalValue(year: string, materials: string[], features: string[]): {
  era: ArchitecturalEra | null;
  materials: MaterialData[];
  style: StyleProfile | null;
  valueFactors: string[];
  maintenanceProfile: string;
  energyProfile: string;
  modernizationPotential: string;
} {
  const era = getArchitecturalEra(year, features);
  const materialData = materials.map(m => getMaterialData(m)).filter(Boolean) as MaterialData[];
  const style = getStyleProfile(materials.join(" "));
  
  const valueFactors = [];
  if (era) {
    valueFactors.push(...era.sellingPoints.primary);
    valueFactors.push(...era.sellingPoints.investment);
  }
  materialData.forEach(m => valueFactors.push(...m.sellingPoints.practical));
  
  const maintenanceProfile = era ? `${era.maintenance.costs} underhållskostnad` : "Okänd underhållsprofil";
  const energyProfile = era ? `Energiprestanda: ${era.energyEfficiency}` : "Okänd energiprestanda";
  const modernizationPotential = era ? `Moderniseringspotential: ${era.modernization.potential}` : "Okänd potential";
  
  return {
    era,
    materials: materialData,
    style,
    valueFactors,
    maintenanceProfile,
    energyProfile,
    modernizationPotential
  };
}
