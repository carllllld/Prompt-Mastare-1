import OpenAI from 'openai';

interface OptimalGenerationConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

interface PropertyData {
  address: string;
  propertyType: string;
  livingArea: number;
  totalRooms: number;
  price?: number;
  buildYear?: string;
  kitchenDescription?: string;
  bathroomDescription?: string;
  balconyArea?: number;
  flooring?: string;
  // ... andra fält
}

interface GenerationResult {
  text: string;
  headline: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  socialCopy: string;
  quality: {
    score: number;
    violations: string[];
    compliance: boolean;
  };
}

export class OptimalAIPipeline {
  private openai: OpenAI;
  private config: OptimalGenerationConfig;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    
    // OPTIMAL INSTÄLLNINGAR FÖR 100% SUCCESS
    this.config = {
      model: "gpt-4-turbo-0125-preview", // BÄSTA MODELL
      temperature: 0.05, // NOLL VARIATION - MAX CONSISTENCY
      maxTokens: 2000, // LIMIT FÖR KONTROLL
      topP: 0.95, // FOKUS PÅ BÄSTA RESPONSES
      frequencyPenalty: 0.1, // MINSKA UPPREPNING
      presencePenalty: 0.05 // LITE NOVELTY
    };
  }

  /**
   * DEN OPTIMALA GENERERINGEN - 1 API CALL, 100% SUCCESS
   */
  async generateOptimalText(
    propertyData: PropertyData,
    platform: 'hemnet' | 'booli',
    targetWords: { min: number; max: number }
  ): Promise<GenerationResult> {
    
    // 1. INTELLIGENT DATA COMPRESSION
    const compressedData = this.compressPropertyData(propertyData);
    
    // 2. CONTEXT-AWARE PROMPT BUILDING
    const prompt = this.buildOptimalPrompt(compressedData, platform, targetWords);
    
    // 3. ENHETLIG AI-ANROP
    const response = await this.openai.chat.completions.create({
      ...this.config,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    // 4. INTELLIGENT RESULT PROCESSING
    const result = this.processResponse(response.choices[0]?.message?.content || '{}');
    
    // 5. QUALITY VALIDATION
    const quality = this.validateQuality(result, compressedData);
    
    return {
      ...result,
      quality
    };
  }

  /**
   * INTELLIGENT DATA COMPRESSION - MAX 7 VIKTIGA DATAPUNKTER
   */
  private compressPropertyData(data: PropertyData): any {
    return {
      // TIER 1: CRITICAL (ALLTID MED)
      core: {
        location: `${data.address}`,
        property: `${this.normalizeType(data.propertyType)} om ${data.livingArea}kvm med ${data.totalRooms} rum`,
        price: data.price ? `${data.price} kr` : null
      },
      
      // TIER 2: IMPORTANT (MAX 3 STYCK)
      features: this.getTopFeatures(data),
      
      // TIER 3: CONTEXT (FÖR TON)
      context: {
        priceCategory: this.getPriceCategory(data.price, data.livingArea),
        buildingAge: this.getAgeCategory(data.buildYear),
        areaType: this.getAreaType(data.address)
      }
    };
  }

  /**
   * DEN OPTIMALA PROMPTEN - SANDWICH + NEGATIVE EXAMPLES
   */
  private buildOptimalPrompt(
    data: any, 
    platform: 'hemnet' | 'booli',
    targetWords: { min: number; max: number }
  ): string {
    
    const isHemnet = platform === 'hemnet';
    
    return `
# ROLE: Du är en svensk fastighetsmäklare med 15 års erfarenhet

# KRITISKA REGLER (FÖLJ EXAKT)
1. Börja EXACT: "Gata, våning, stad."
2. Använd ALDRIG: Välkommen, erbjuder, fantastisk, generös, bjuder på, präglas av, genomsyras av, vilket, som ger en, för den som, i hjärtat av, faciliteter, njut av, livsstil, smakfullt, stilfullt, elegant, imponerande, harmonisk, inbjudande, tidlös, ljus och luftig, stilrent och modernt, mysigt och ombonat, inte bara, utan också, bidrar till, förstärker, skapar en känsla, -möjligheter, Det finns även, Det finns också
3. Max ${targetWords.max} ord totalt
4. Varje mening = NYTT faktum. Noll utfyllnad.
5. Max 1x "Det finns" i HELA texten
6. Variera avstånd: meter, minuter, "nära X"
7. Sista stycket = LÄGE ${isHemnet ? '' : '+ PRIS'}

# DATA (ANVÄND ALLT)
${JSON.stringify(data, null, 2)}

# EXEMPEL (FÖLJ EXAKT STIL)
${this.getRelevantExample(data.core.property, platform)}

# NEGATIVE EXAMPLES (UNDVIK DETTA)
DÅLIG: "Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor i hjärtat av staden. Köket präglas av moderna material och bjuder på generös arbetsyta, vilket skapar en härlig plats."
BRA: "Storgatan 12, 3 tr, Linköping. Trea om 76 kvm med balkong i söderläge. Köket renoverat 2021 med Ballingslöv-luckor och Siemens-vitvaror. Balkongen vetter mot söder. ${isHemnet ? '' : 'Pris: 3.950.000 kr.'}"

# OUTPUT FORMAT (JSON)
{
  "text": "Hela objektbeskrivningen med stycken separerade av \\n\\n",
  "headline": "Max 70 tecken: Gatuadress — Typ + unik egenskap",
  "instagramCaption": "2-3 meningar. Gatunamn först. 5 hashtags på egen rad. Inga emoji.",
  "showingInvitation": "Visning — [gatuadress]. Typ + kvm + 2 höjdpunkter. Tid/Plats/Anmälan.",
  "shortAd": "Kompakt: Gatuadress + typ + kvm + 1-2 unika säljpunkter.",
  "socialCopy": "Max 280 tecken: gatunamn + 2 fakta"
}

# KONTROLLLISTA INNAN GENERERING:
✓ Börjar med gatuadress
✓ Inga förbjudna ord
✓ Varje mening = nytt faktum
✓ Max ${targetWords.max} ord
✓ Avslutar med läge ${isHemnet ? '' : '+ pris'}

GENERERA NU.
`;
  }

  /**
   * HÄMTA RELEVANT EXEMPEL Baserat på typ och plattform
   */
  private getRelevantExample(propertyType: string, platform: 'hemnet' | 'booli'): string {
    const examples: Record<string, Record<string, string>> = {
      hemnet: {
        villa: '"Björkvägen 14, 1 tr, Sollentuna. Villa om 120 kvm på tomt om 450 kvm. Byggår 1985 med renoverat kök 2019. Hall med gästwc. Vardagsrum med braskamin och utgång till altan. Köket från IKEA med vitvaror från Bosch. Matplats för sex personer. Tre sovrum och badrum med dusch. Tvättstuga i källare med garage. Upptagningsplats för två bilar. Nära skola och ICA."',
        lägenhet: '"Drottninggatan 42, 4 tr, Uppsala. Trea om 74 kvm med balkong i söderläge. Hall med garderob. Vardagsrum med tre fönster och ekparkett. Köket renoverat 2021 med Ballingslöv-luckor och Siemens-vitvaror. Två sovrum och badrum med dusch. Balkongen på 5 kvm vetter mot söder. BRF Solgården, stambyte 2018. Nära Centralstationen och ICA Nära."',
        radhus: '"Liljevägen 8, Partille. Radhus om 110 kvm med trädgård. Hall med garderob. Öppen planlösning mellan kök och vardagsrum. Köket från HTH 2017 med induktionshäll. Tre sovrum och badrum med badkar och tvättmaskin. Trädgård med uteplats i västerläge. Carport och förråd. Nära skola och kommunikationer."'
      },
      booli: {
        villa: '"Tallvägen 8, Djursholm. Villa om 180 kvm på tomt om 920 kvm. Byggår 1962, tillbyggd 2015. Entréplan med hall, vardagsrum med eldstad, kök och ett sovrum. Köket från HTH 2015 med granitbänk och induktionshäll. Övervåning med tre sovrum och badrum med badkar. Källare med tvättstuga och förråd. Altan 25 kvm i västerläge. Dubbelgarage. Utgångspris 12.500.000 kr."',
        lägenhet: '"Kungsgärdsgatan 7, 2 tr, Uppsala. Fyra om 105 kvm med balkong i västerläge. Hall med platsbyggd garderob. Vardagsrum med tre fönster och takhöjd 2,70 meter. Köket från Marbodal 2020 med stenbänkskiva. Huvudsovrum med garderob. Två mindre sovrum. Badrum helkaklat med badkar. Balkong 8 kvm i västerläge. BRF Kungsparken, stambyte 2020. Utgångspris 4.200.000 kr."',
        radhus: '"Ekvägen 12, Lerum. Radhus om 125 kvm med carport. Hall med garderob. Öppen planlösning mellan kök och vardagsrum. Köket från IKEA 2018 med vitvaror från Siemens. Fyra sovrum och badrum med dusch. Tvättstuga med groventilation. Trädgård med uteplats i söderläge. Carport med förråd. Nära skola och pendeltåg. Utgångspris 3.800.000 kr."'
      }
    };

    const type = this.normalizeType(propertyType);
    return examples[platform][type] || examples[platform].lägenhet;
  }

  /**
   * PROCESSERA RESPONSE MED FELHANTERING
   */
  private processResponse(rawResponse: string): GenerationResult {
    try {
      const parsed = JSON.parse(rawResponse);
      
      return {
        text: parsed.text || '',
        headline: parsed.headline || '',
        instagramCaption: parsed.instagramCaption || '',
        showingInvitation: parsed.showingInvitation || '',
        shortAd: parsed.shortAd || '',
        socialCopy: parsed.socialCopy || '',
        quality: {
          score: 100,
          violations: [],
          compliance: true
        }
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        text: 'Text kunde inte genereras. Försök igen.',
        headline: 'Fel vid generering',
        instagramCaption: 'Fel vid generering',
        showingInvitation: 'Fel vid generering',
        shortAd: 'Fel vid generering',
        socialCopy: 'Fel vid generering',
        quality: {
          score: 0,
          violations: ['Parse error'],
          compliance: false
        }
      };
    }
  }

  /**
   * VALIDERA KVALITET
   */
  private validateQuality(result: GenerationResult, data: any): GenerationResult['quality'] {
    const violations: string[] = [];
    let score = 100;

    // Kontrollera förbjudna ord
    const forbiddenWords = [
      'Välkommen', 'erbjuder', 'fantastisk', 'generös', 'bjuder på', 
      'präglas av', 'genomsyras av', 'vilket', 'som ger en', 'för den som',
      'i hjärtat av', 'faciliteter', 'njut av', 'livsstil', 'smakfullt',
      'stilfullt', 'elegant', 'imponerande', 'harmonisk', 'inbjudande',
      'tidlös', 'ljus och luftig', 'stilrent och modernt', 'mysigt och ombonat'
    ];

    const text = result.text || '';
    
    for (const word of forbiddenWords) {
      if (text.toLowerCase().includes(word.toLowerCase())) {
        violations.push(`Förbjudet ord: ${word}`);
        score -= 10;
      }
    }

    // Kontrollera struktur
    if (!text.match(/^\w+gata\s+\d+/)) {
      violations.push('Börjar inte med gatuadress');
      score -= 20;
    }

    // Kontrollera att det finns fakta
    if (!text.includes('kvm')) {
      violations.push('Saknar storleksinformation');
      score -= 15;
    }

    if (!text.includes(data.core.property.split(' ')[0])) {
      violations.push('Saknar bostadstyp');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      violations,
      compliance: violations.length === 0
    };
  }

  /**
   * HJÄLPFUNKTIONER
   */
  private normalizeType(type: string): string {
    const typeMap: Record<string, string> = {
      'apartment': 'lägenhet',
      'villa': 'villa',
      'radhus': 'radhus',
      'townhouse': 'radhus'
    };
    return typeMap[type] || 'lägenhet';
  }

  private getTopFeatures(data: PropertyData): string[] {
    const features = [];
    
    if (data.kitchenDescription) features.push(`Kök: ${data.kitchenDescription}`);
    if (data.bathroomDescription) features.push(`Badrum: ${data.bathroomDescription}`);
    if (data.balconyArea) features.push(`Balkong: ${data.balconyArea}kvm`);
    if (data.flooring) features.push(`Golv: ${data.flooring}`);
    
    return features.slice(0, 3);
  }

  private getPriceCategory(price?: number, area?: number): string {
    if (!price || !area) return 'standard';
    
    const pricePerKvm = price / area;
    if (pricePerKvm > 120000) return 'luxury';
    if (pricePerKvm > 80000) return 'premium';
    if (pricePerKvm < 30000) return 'budget';
    return 'standard';
  }

  private getAgeCategory(year?: string): string {
    if (!year) return 'okänd';
    const yearNum = parseInt(year);
    if (yearNum > 2018) return 'nybyggd';
    if (yearNum > 2000) return 'modern';
    if (yearNum > 1980) return 'äldre';
    return 'klassisk';
  }

  private getAreaType(address: string): string {
    // Enkel heuristik för områdestyp
    if (address.includes('gatan') || address.includes('vägen')) return 'stadsdel';
    if (address.includes('torget') || address.includes('platsen')) return 'centrum';
    return 'standard';
  }
}

// Global instans
export const optimalAIPipeline = new OptimalAIPipeline(
  (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY) || ''
);
