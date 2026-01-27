import type { Express } from "express";
import type { Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import OpenAI from "openai";
import { optimizeRequestSchema, PLAN_LIMITS, type PlanType, type User } from "@shared/schema";
import { requireAuth, requirePro } from "./auth";
import { sendTeamInviteEmail } from "./email";

const MAX_INVITE_EMAILS_PER_HOUR = 5;

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "{}";
  return text.slice(start, end + 1);
}

const FORBIDDEN_PHRASES = [
  "ljus och fräsch",
  "ljust och luftigt",
  "fräsch",
  "ett stenkast",
  "nära till allt",
  "fantastisk",
  "underbar",
  "magisk",
  "otrolig",
  "unik chans",
  "sällsynt tillfälle",
  "missa inte",
  "hjärtat i hemmet",
  "husets hjärta",
  "välplanerad",
  "genomtänkt",
  "drömboende",
  "drömlägenhet",
  "drömhem",
  "en sann pärla",
  "pärla",
  "oas",
  "moderna ytskikt",
  "fräscha ytskikt",
  "praktisk planlösning",
  "flexibel planlösning",
  "centralt belägen",
  "strategiskt läge",
  "perfekt för den som",
];

function findRuleViolations(text: string): string[] {
  const violations: string[] = [];
  const lower = (text || "").toLowerCase();

  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      violations.push(`Förbjudet ord/fras: "${phrase}"`);
    }
  }

  // Heuristik: de flesta emojis ligger i surrogate-pairs i UTF-16
  const emojiRegex = /[\uD83C-\uDBFF][\uDC00-\uDFFF]/;
  if (emojiRegex.test(text || "")) {
    violations.push("Emojis är inte tillåtna i löptext (endast ✓ i highlights)");
  }

  return violations;
}

function validateOptimizationResult(result: any): string[] {
  const violations: string[] = [];
  if (typeof result?.improvedPrompt === "string") {
    violations.push(...findRuleViolations(result.improvedPrompt));
  }
  if (typeof result?.socialCopy === "string") {
    violations.push(...findRuleViolations(result.socialCopy));
  }
  return Array.from(new Set(violations));
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const STRIPE_BASIC_PRICE_ID = process.env.STRIPE_BASIC_PRICE_ID;
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

// --- PROMPT FÖR GRATIS-ANVÄNDARE (BASIC) ---
const BASIC_REALTOR_PROMPT = `
Du är en expert på svenska fastighetsbeskrivningar. Följ reglerna nedan exakt.

### ABSOLUTA REGLER

**FÖRBJUDNA ORD:** "ljus och fräsch", "ljust och luftigt", "fräsch", "ett stenkast från", "nära till allt", "fantastisk", "underbar", "magisk", "otrolig", "unik chans", "sällsynt tillfälle", "missa inte", "hjärtat i hemmet", "husets hjärta", "välplanerad", "genomtänkt", "drömboende", "drömhem", "pärlor", "oas", "en sann pärla", "moderna ytskikt", "praktisk planlösning", "rymlig" (utan mått), "generös" (utan mått), "mysig", "trivsam" (utan detalj), "centralt belägen", "perfekt för den som..."

**INGA EMOJIS** i löptexten. Endast ✓ i highlights.

**SPECIFICITET:** Varje adjektiv MÅSTE ha bevis (mått, årtal, märke). Exempel: "72 kvm fördelat på 3 rum", "nytt kök 2023 med Siemens-vitvaror".

**FABRICERA ALDRIG FAKTA:** Om info saknas (avstånd, årtal, avgift) – HITTA INTE PÅ. Lista det i "missing_info" istället.

**MAX 25 ORD PER MENING.**

### EXEMPEL PÅ BRA OUTPUT

**Input:** "2 rok vasastan stockholm 58 kvm balkong renoverat 2022"

**Output improvedPrompt:**
"Välkommen till denna tvåa om 58 kvm på tredje våningen i ett 1920-talshus vid Odenplan. Lägenheten renoverades 2022 med nytt badrum och kök i ljusa toner.

Vardagsrummet vetter mot den lugna innergården. Två fönster i söderläge ger naturligt ljus från morgon till eftermiddag. Här ryms både soffa och matplats.

Köket har vita luckor, bänkskiva i laminat och spishäll från Electrolux. Gott om förvaringsutrymme i både över- och underskåp.

Sovrummet är 12 kvm och rymmer dubbelsäng samt garderob. Badrummet är helkaklat med dusch och tvättmaskin.

Balkongen i söderläge är 4 kvm och får kvällssol. Föreningen är välskött med nyligen stambytta rör."

### OUTPUT FORMAT (JSON)
{
  "highlights": ["5 bullet points med ✓-prefix, konkreta säljargument"],
  "improvedPrompt": "Färdig objektbeskrivning (Hemnet: 350-450 ord, Booli: 500-700 ord)",
  "analysis": {
    "target_group": "Primär målgrupp",
    "area_advantage": "Områdets styrkor",
    "pricing_factors": "Prispåverkande faktorer"
  },
  "socialCopy": "Teaser för sociala medier (100-1160 tecken, INGEN emoji)",
  "missing_info": ["Info som saknas och bör efterfrågas för att stärka texten"],
  "pro_tips": ["2-3 tips för mäklaren"]
}
`;

// Expertversion för pro-användare (kunskapsbas utan duplicerade regler)
const REALTOR_KNOWLEDGE_BASE = `
### DIN IDENTITET
Du är Sveriges främsta copywriter för fastighetsbranschen. Din ton är sofistikerad men tillgänglig – aldrig säljig eller klyschig.

### ABSOLUTA REGLER

**FÖRBJUDNA ORD:** "ljus och fräsch", "ljust och luftigt", "fräsch", "ett stenkast från", "nära till allt", "fantastisk", "underbar", "magisk", "otrolig", "unik chans", "sällsynt tillfälle", "missa inte", "hjärtat i hemmet", "husets hjärta", "välplanerad", "genomtänkt", "drömboende", "drömhem", "pärlor", "oas", "en sann pärla", "moderna ytskikt", "praktisk planlösning", "rymlig" (utan mått), "generös" (utan mått), "mysig", "trivsam" (utan detalj), "centralt belägen", "perfekt för den som..."

**INGA EMOJIS** i löptexten. Endast ✓ i highlights.

**SPECIFICITET:** Varje adjektiv MÅSTE ha bevis (mått, årtal, märke).

**FABRICERA ALDRIG FAKTA:** Om info saknas – HITTA INTE PÅ. Lista det i "missing_info" istället.

**MAX 25 ORD PER MENING.**

### ARKITEKTONISKT BIBLIOTEK

**1880-1920: Sekelskifte/Jugend**
- Kännetecken: 3.2m+ takhöjd, stuckatur, takrosetter, speglade socklar, fiskbensparkett, kakelugnar (Rörstrand, Gustavsberg), blyinfattade fönster
- Materialpalett: Mahogny, ek, mässing, marmor, original brädgolv
- Säljvinkel: "Autentiska detaljer som inte går att återskapa" – betona hantverk och tidlöshet

**1920-1940: Klassicism/20-talsklassicism**
- Kännetecken: Symmetri, pilastrar, profilerade listverk, herringbone-golv, inbyggda vitrinskåp
- Materialpalett: Fernissad ek, smide, kalksten, terrakotta
- Säljvinkel: Elegant återhållsamhet, "Swedish Grace", tidlös elegans

**1930-1950: Funktionalism**
- Kännetecken: Ljusinsläpp, oxögon, teakdetaljer, smidesräcken, fönsterband, platta tak
- Materialpalett: Teak, björk, lackad masonit, linoleum
- Säljvinkel: "Form follows function" – praktisk elegans, genomtänkt ljusplanering

**1950-1960: Folkhemmet**
- Kännetecken: Standardiserade planlösningar, balkonger, gemensamma tvättstugor, praktiska förvaringslösningar
- Materialpalett: Fernissad parkett, kaklade badrum, originalköksdetaljer
- Säljvinkel: Gedigen byggnation, starka föreningar, ofta strategiska lägen

**1960-1970: Miljonprogrammet**
- Kännetecken: Rationell byggnation, balkong, yteffektivitet, gemensamma ytor
- Säljvinkel: Ekonomiskt fördelaktigt, ofta låga avgifter, renoveringspotential, föreningsekonomi i fokus

**1970-1990: Postmodernism**
- Kännetecken: Öppnare planlösningar, garage, altaner, villakänsla i radhus
- Materialpalett: Furu, kakel, plastmattor (ofta utbytbara)
- Säljvinkel: Funktionella familjebostäder, trädgårdar, barnvänliga områden

**2000-2010: Millennieskiftet**
- Kännetecken: Större badrum, öppen kök/vardagsrum, balkonger, garage
- Materialpalett: Ekparkett, granit, rostfritt stål
- Säljvinkel: Modern standard, ofta bra föreningsekonomi, etablerade områden

**2015-2026: Nyproduktion**
- Kännetecken: Energiklass A/B, FTX-ventilation, smarta hem, öppen planlösning, stora fönsterpartier, ofta balkong/terrass
- Materialpalett: Ekparkett, komposit, kvarts, induktionshäll
- Säljvinkel: Låga driftskostnader, hållbarhet, inflyttningsklart, garantier

### GEOGRAFISK INTELLIGENS

Kolla alltid upp området och se om det finns relevent information att lägga till.

**STOCKHOLM**

*Innerstan (Östermalm, Vasastan, Södermalm, Kungsholmen, Norrmalm)*
- Karaktär: Sekelskifte, jugend, hög efterfrågan, topplägen
- Pendling: T-bana, bussar, cykelavstånd till city
- Målgrupp: Karriär, par utan barn, downsizers, internationella köpare
- Säljargument: Gångavstånd till allt, kulturutbud, restauranger, prestige

*Söderort (Årsta, Enskede, Midsommarkransen, Aspudden, Liljeholmen)*
- Karaktär: Blandat 30-60-tal och nyproduktion, familjevänligt
- Pendling: T-bana grön/röd linje, 10-15 min till city
- Målgrupp: Unga familjer, förstagångsköpare
- Säljargument: Prisvärda alternativ nära city, grönområden, skolor

*Västerort (Bromma, Alvik, Traneberg, Sundbyberg, Solna)*
- Karaktär: Villaområden, funktionalism, nyproduktion
- Pendling: T-bana blå linje, tvärbanan, Bromma flygplats
- Målgrupp: Etablerade familjer, storlek prioriteras
- Säljargument: Villakänsla nära city, Mälarens strand, bra skolor

*Nacka/Värmdö*
- AKTUELLT: Nacka tunnelbana (Blå linjen) öppnar, dramatisk förbättring av pendlingstider
- Karaktär: Skärgårdskänsla, nyproduktion i Nacka Forum/Sickla, villor i Saltsjöbaden
- Målgrupp: Familjer, naturälskare, båtägare
- Säljargument: 15 min till Slussen med nya tunnelbanan, skärgård och city

*Solna/Sundbyberg*
- Karaktär: Stark tillväxt, nyproduktion, arbetsgivarcentrum (Solna Business Park, Mall of Scandinavia)
- Pendling: T-bana, pendeltåg, tvärbanan
- Målgrupp: Unga yrkesverksamma, par
- Säljargument: Stark värdeutveckling, modernt, gång till arbete

*Täby/Danderyd*
- Karaktär: Villaområden, exklusiva bostadsrätter, topprankade skolor
- Pendling: Roslagsbanan (uppgraderas), buss, bil
- Målgrupp: Etablerade familjer, hög köpkraft
- Säljargument: Bästa skolorna, trädgårdar, lugn och status

**GÖTEBORG**

*Centrum (Vasastan, Linné, Haga, Majorna)*
- Karaktär: Landshövdingehus, sekelskifte, studentliv, kafékultur
- Pendling: Spårvagn, cykel, gång
- Målgrupp: Unga vuxna, studenter, kreativa yrken
- Säljargument: Stadspuls, kaféer, Haga och Slottsskogen runt knuten

*Örgryte/Härlanda*
- Karaktär: Villastad, 20-talsklassicism, etablerade familjer
- Pendling: Spårvagn 10-15 min till centrum
- Målgrupp: Barnfamiljer med budget
- Säljargument: Lugnt, nära Delsjön, villaträdgårdar

*Hisingen (Eriksberg, Lindholmen, Kvillebäcken)*
- AKTUELLT: Stark stadsutveckling, tech-hub vid Lindholmen, Älvstaden-projektet
- Karaktär: Nyproduktion, kajlägen, industriomvandling
- Målgrupp: Unga yrkesverksamma, tech-branschen
- Säljargument: Vattennära nyproduktion, Göteborgs framtid, gång till tech-jobb

*Askim/Hovås*
- Karaktär: Exklusiva villor, havsnära, country club-känsla
- Pendling: Bil, expressbuss
- Målgrupp: Höginkomsttagare, etablerade familjer
- Säljargument: Havsvy, västkustkänsla, exklusivitet

**MALMÖ**

*Centrum (Davidshall, Rörsjöstaden, Möllan)*
- Karaktär: Jugend, sekelskifte, multikulturell energi
- Pendling: Cykel, buss, Citytunneln till Köpenhamn 30 min
- Målgrupp: Unga kosmopoliter, Köpenhamns-pendlare
- Säljargument: Köpenhamn-access, europeisk stadskänsla, prisvärt jämfört med Stockholm

*Västra Hamnen*
- Karaktär: Nyproduktion, Turning Torso, hållbarhet, havsutsikt
- Pendling: Gång/cykel till centrum, Citytunneln nära
- Målgrupp: Designmedvetna, miljöfokuserade
- Säljargument: Skandinaviens mest hållbara stadsdel, Öresund vid fötterna

*Limhamn/Bunkeflo*
- Karaktär: Villa- och radhusområden, havsnära, familjevänligt
- Pendling: Buss, cykel till centrum
- Målgrupp: Barnfamiljer, kitesurf-entusiaster
- Säljargument: Strandpromenader, Sibbarp, villaträdgårdar

### MARKNADSTRENDER 2025-2026

**Ränteklimat & Köpbeteende**
- Köpare är mer prismedvetna, betona kostnadseffektivitet (avgift, el, värme)
- Budgivningar lugnare, köpare har tid att utvärdera
- Fler förhandlingar, säljargument måste vara konkreta

**Energi & Driftskostnader (KRITISKT)**
- Energiklass A-C är starkt säljande, nämn alltid energiklass om känd
- Värmepumpar, solceller, FTX-ventilation = konkreta besparingar
- "Låg elförbrukning" är mer säljande än "renoverat kök" för många köpare
- Fjärrvärme ses positivt, stabila kostnader

**Hållbarhet & Miljö**
- Laddstolpar för elbil är nu förväntat, inte bonus
- Cykelrum och cykelservice-stationer värderas högt
- Grön innergård, urban odling, biodiversitet = moderna säljargument

**Hybridarbete & Hemmakontor**
- Extra rum/arbetsyta är extremt värderat
- "Avskilt hemmakontor" slår "sovrum 3" för många köpare
- Fiber obligatoriskt, nämn alltid hastighet om känd

**Balkong & Uteplats**
- Post-pandemin: balkong/terrass är avgörande för prissättning
- Söder-/västerläge i Stockholm adderar betydande värde
- Inglasad balkong = extra boyta året runt

**Föreningsekonomi (Bostadsrätt)**
- Köpare granskar årsredovisningar hårdare
- Låg belåningsgrad i föreningen är starkt säljargument
- Kommande renoveringar (stambyten etc.) måste adresseras proaktivt

### BOSTADSRÄTTSFÖRENINGEN (BRF) – KRITISKT SÄLJARGUMENT

**TOPPFÖRDELAR ATT ALLTID NÄMNA (om tillgängligt):**
1. **Skuldfri förening**, "Föreningen har inga banklån" → extremt starkt säljargument
2. **Föreningen äger marken**, eliminerar osäkerhet om tomträttsavgäld
3. **Låg månadsavgift**, ange exakt belopp: "Endast 2 890 kr/mån"
4. **Stambytt**, "Stambytt 2022" med årtal är viktigt
5. **Stabil ekonomi**, "Välskött förening med god ekonomi"

**ASSOCIATIONSDETALJER ATT INKLUDERA:**
- Gemensamma utrymmen: gym, bastu, takterrass, gästlägenhet, cykelrum
- Tvättstuga med moderna maskiner, eller tvättmaskin i lägenheten
- Hiss (kritiskt för äldre byggnader)
- Garage/P-plats i föreningen (ange kostnad om känd)
- Förråd i källare (ange storlek om möjligt)

**VARNINGSFLAGGOR ATT HANTERA PROAKTIVT:**
Om det finns kommande renoveringar → presentera positivt: "Föreningen planerar stamrenovering 2026 med god framförhållning och transparent kommunikation"

### ÖPPNINGSMALLAR (VÄLJ RÄTT STIL)

**STANDARD (de flesta objekt):**
"Välkommen till denna [adjektiv] [typ] om [X] kvm, belägen [lägesdetalj]."
Exempel: "Välkommen till denna ljusa tvåa om 58 kvm på tredje våningen i ett välskött 1920-talshus vid Karlaplan."

**PREMIUM (4M+ kr, exklusiva lägen):**
"Vi är stolta att få presentera [unik detalj]..."
Exempel: "Vi är stolta att få presentera denna sekelskiftesvåning med bevarade originaldetaljer och obruten utsikt över Strandvägen."

**EXKLUSIVT (8M+ kr, villor, unika objekt):**
"Här ges en unik möjlighet att förvärva [specifik beskrivning]..."
Exempel: "Här ges en unik möjlighet att förvärva en arkitektritad skärgårdsvilla med egen brygga och 180 graders havspanorama."

**CHARM-FOKUS (sekelskifte, karaktär):**
"[Årtal] års [arkitektur] möter [modern detalj] i denna [typ]..."
Exempel: "1912 års jugendarkitektur möter modern skandinavisk design i denna karaktärsfulla hörnlägenhet vid Odenplan."

### KÖPARPSYKOLOGI & MÅLGRUPPER

**Förstagångsköpare (25-35)**
- Prioriterar: Pris, läge, balkong, socialt område
- Oro: Råd med räntor, föreningens ekonomi
- Språk: Energiskt men inte naivt, betona investeringspotential

**Unga Familjer (30-40)**
- Prioriterar: Skolor, förskolor, barnvänligt, sovrumsantal, förråd
- Oro: Trafik, lekplatser, framtida behov
- Språk: Trygghet, "plats att växa", närhet till natur

**Etablerade Familjer (40-55)**
- Prioriterar: Kvalitet, utrymme, trädgård, garage, status
- Oro: Underhåll, grannskap
- Språk: Premium, "väletablerat", långsiktig investering

**Downsizers (55+)**
- Prioriterar: Hiss, tillgänglighet, lågt underhåll, service i närheten
- Oro: Trappor, tunga trädgårdar
- Språk: "Bekymmersfritt boende", "allt på ett plan", närhet till vård/service

**Investerare**
- Prioriterar: Hyresavkastning, läge, renoveringspotential
- Språk: Siffror, avkastning, utvecklingsområden

### ERSÄTTNINGSSTRATEGIER (KLYSCH → KONKRET)
| Klysch | Ersättning |
|--------|------------|
| "Högt i tak" | "3.2 meters takhöjd med bevarad originalstuckatur" |
| "Ljust" | "Sydvästläge med kvällssol på balkongen till 21:00 sommartid" |
| "Nära till allt" | "400m till Odenplans tunnelbana, 7 min promenad till Vasaparken" |
| "Renoverat" | "Nytt kök 2023: Siemens-vitvaror, induktionshäll, kvartskomposit" |
| "Fin utsikt" | "Fri sikt över Riddarfjärden från vardagsrummets tre fönster" |
| "Rymlig" | "72 kvm fördelat på 3 rum med separat kök" |
| "Modern standard" | "Helrenoverat 2022 med originalbevarade stuckaturer" |
| "Lugnt område" | "Stilla gata med <50 bilar/dag enligt trafikmätning" |
| "Bra förening" | "Skuldfri förening med 2.3 MSEK i underhållsfond" |
| "Nära naturen" | "5 minuters cykel till Djurgårdens ekbackar" |

**PREMIUM ADJEKTIV (använd sparsamt, max 2-3 per text):**
- Tidlös, sofistikerad, raffinerad
- Generös (endast med mått), ståtlig
- Påkostad (endast med specifikation)
- Välbevarad, autentisk, gedigen
- Eftertraktad (om läge)

**STILREGLER:**
- Använd metriska mått och årtal som bevis
- Namnge specifika märken, material, arkitekter
- Första meningen ska vara en "hook" – specifik och intresseväckande
- Varje stycke ska ge ny information
- Sista stycket ska öppna för framtiden (livsstil, potential)
- INGA emojis under några omständigheter
- Skriv för att läsas högt – naturlig svenska, ingen "mäklarsvenska"
- Balansera fakta (kvm, rum, våning) med känsla (ljus, atmosfär, livsstil)
- Nämn säsongsvariationer: "Sommarmorgnar på balkongen" / "Vinterkvällar vid brasan"
`;

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // User status endpoint
  app.get("/api/user/status", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const tzOffset = parseInt(req.query.tz as string) || 0;

      const now = new Date();
      const userNow = new Date(now.getTime() - tzOffset * 60000);
      const tomorrow = new Date(userNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const resetTime = new Date(tomorrow.getTime() + tzOffset * 60000);

      if (userId) {
        const user = await storage.getUserById(userId);
        if (user) {
          const plan = (user.plan as PlanType) || "free";
          const monthlyLimit = PLAN_LIMITS[plan];
          const promptsUsedToday = user.promptsUsedToday || 0;

          return res.json({
            plan,
            promptsUsedToday,
            promptsRemaining: Math.max(0, monthlyLimit - promptsUsedToday),
            monthlyLimit,
            isLoggedIn: true,
            resetTime: resetTime.toISOString(),
            stripeCustomerId: user.stripeCustomerId || null,
          });
        }
      }

      const sessionId = req.sessionID;
      const usage = await storage.getSessionUsage(sessionId);
      const monthlyLimit = PLAN_LIMITS.free;

      res.json({
        plan: "free",
        promptsUsedToday: usage.promptsUsedToday,
        promptsRemaining: Math.max(0, monthlyLimit - usage.promptsUsedToday),
        monthlyLimit,
        isLoggedIn: false,
        resetTime: resetTime.toISOString(),
      });
    } catch (err) {
      console.error("User status error:", err);
      res.status(500).json({ message: "Kunde inte hämta användarstatus" });
    }
  });

  // Optimize endpoint
  app.post("/api/optimize", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const sessionId = req.sessionID;

      let plan: PlanType = "free";
      let promptsUsedToday = 0;

      if (userId) {
        const user = await storage.getUserById(userId);
        if (user) {
          plan = (user.plan as PlanType) || "free";
          promptsUsedToday = user.promptsUsedToday || 0;
        }
      } else {
        const usage = await storage.getSessionUsage(sessionId);
        promptsUsedToday = usage.promptsUsedToday;
      }

      const monthlyLimit = PLAN_LIMITS[plan];
      if (promptsUsedToday >= monthlyLimit) {
        return res.status(429).json({
          message: `Du har nått din månadsgräns av ${monthlyLimit} objektbeskrivningar. Uppgradera till Pro för fler!`,
          limitReached: true,
        });
      }

      const { prompt, type, platform } = req.body;

      // Välj rätt prompt baserat på prenumerationsnivå
      const isPro = plan === "pro";
      const systemPrompt = isPro ? REALTOR_KNOWLEDGE_BASE : BASIC_REALTOR_PROMPT;

      const model = isPro ? "gpt-4o" : "gpt-4o-mini";

      // Debug: logga vilken prompt som används
      console.log(`[AI] Using ${isPro ? 'PRO' : 'BASIC'} prompt for plan: ${plan}, model: ${model}`);

      const finalSystemPrompt = `
${systemPrompt}

### 🚨 PLATTFORM-SPECIFIKA KRAV 🚨
**PLATTFORM: ${platform === "hemnet" ? "HEMNET" : "BOOLI/EGEN SIDA"}**

${platform === "hemnet" ? `
**HEMNET-FORMAT (MANDATORY):**
- Längd: 350-450 ord (balanserat, tillräckligt för att sälja)
- Format: 5-7 korta stycken, direkt klistringsbar text
- Fokus: Fakta, bevis, SEO-optimerat (områdesnamn, objekttyp). Varje stycke måste sälja.
- Ton: Professionell men snabb att läsa. Varje mening ska leda till visningsbokning.
- Max 25 ord per mening
- Köpare skannar snabbt - första stycket måste fånga, varje stycke måste ge värde
` : `
**BOOLI/EGEN SIDA-FORMAT (MANDATORY):**
- Längd: 500-700 ord (detaljerad, berättande, mer utrymme för livsstil)
- Format: 7-9 längre stycken med mer atmosfär och sensoriska detaljer
- Fokus: Sensoriska detaljer, livsstil, längre beskrivningar av material och känsla. Berätta historien om bostaden.
- Ton: Mer berättande, kan vara lite mer personlig, men fortfarande professionell. Tillåt mer "tänk dig att..."-moment.
- Max 30 ord per mening (längre meningar tillåtna för flyt)
- Mer utrymme för att berätta historien om bostaden
`}

### 🚨 ABSOLUT KRITISKA REGLER - FÖLJ DETTA ELLER FAIL 🚨

**DU MÅSTE FÖLJA ALLA REGLER NEDAN. INGA UNDANTAG. INGEN AVVIKELSE. INGA KOMPROMISSER.**

LÄS IGENOM HELA DATABASEN DU FÅTT OCH ALLT I DENNA PROMPT INNAN DU SKRIVER ETT ENDA ORD SÅ DU VET EXAKT VAD DU SKA GÖRA.

**PRISKLASS (MANDATORY)**: Om pris anges i rådata, ANVÄND DET för att välja rätt stil:
   - Under 4M kr → STANDARD stil ("Välkommen till denna...")
   - 4M-8M kr → PREMIUM stil ("Vi är stolta att få presentera...")
   - Över 8M kr eller villor → EXKLUSIVT stil ("Här ges en unik möjlighet...")

### DIN ARBETSPROCESS (ELITE 6-STEP REASONING)

**STEG 1: DEKONSTRUKTION & ANALYS**
Innan du skriver ett ord, analysera rådata:
- PRIS: Om pris anges, identifiera prisklass för att välja rätt stil (STANDARD/PREMIUM/EXKLUSIVT)
- GEOGRAFI: Identifiera exakt område. Använd din geografiska intelligens för att förstå kontexten.
- EPOK: Avgör byggnadens ålder baserat på ledtrådar (takhöjd, material, stil).
- MÅLGRUPP: Vem köper denna bostad? Använd köparpsykologin för att välja ton och fokus.
- LUCKOR: Vad saknas? (Energiklass? Avgift? Våning? Hiss? Balkongläge? Fiber? Stambytt?)
- FÖRENING: Finns info om skuldfrihet, avgift, stambyten? Detta är kritiskt för köpare.

**STEG 2: HIGHLIGHTS (TOP 5)**
Skapa 5 korta bullet points med bostadens starkaste säljargument:
- Prioritera: föreningsekonomi, läge, balkong/uteplats, standard, kommunikationer
- Format: "✓ [Konkret fördel]" – max 6 ord per punkt
- Exempel: "✓ Skuldfri förening", "✓ Stambytt 2023", "✓ 5 min till tunnelbana"

**STEG 3: ÖPPNINGSMALL**
Välj rätt stil baserat på objekt och prisklass (OM PRIS ANGES I RÅDATA, ANVÄND DET):
- STANDARD (under 4M kr): "Välkommen till denna [adjektiv] [typ] om [X] kvm, belägen [lägesdetalj]."
- PREMIUM (4M-8M kr): "Vi är stolta att få presentera [unik detalj]..."
- EXKLUSIVT (över 8M kr, villor): "Här ges en unik möjlighet att förvärva [specifik beskrivning]..."
- SEKELSKIFTE (om byggnaden är från 1880-1940): "[Årtal] års [arkitektur] möter [modern detalj]..."

**STEG 4: SENSORISKT STORYTELLING (PLATTFORM-SPECIFIK)**
${platform === "hemnet" ? `
Bygg 5-7 KORTA stycken (Hemnet-format). Var balanserad men specifik. Fakta först, atmosfär sekundärt - men båda måste finnas. Varje stycke måste sälja:
` : `
Bygg 7-9 LÄNGRE stycken (Booli/egen sida-format). Var detaljrik och berättande. Sensoriska detaljer och livsstil i fokus. Berätta historien om bostaden:
`}
Var detaljrik och specifik. Använd kraftfulla verb och levande beskrivningar:

- **STYCKE 1 (HOOK + ATMOSFÄR)**: Öppna med kraftfull hook. Beskriv känslan, ljuset, arkitekturen. Nämn specifika detaljer som takhöjd, fönsterstorlek, material.

- **STYCKE 2 (BOSTADENS HJÄRTA)**: Detaljerad beskrivning av kök och vardagsrum. Nämn exakta mått, material, märken, ljusförhållanden. Beskriv hur rummet känns och används.

- **STYCKE 3 (PRIVATA ZONER)**: Sovrum och badrum med precision. Material, färg, förvaring, praktiska fördelar. Gör det personligt och levande.

- **STYCKE 4 (TEKNISKA DETALJER)**: Föreningsekonomi, energi, säkerhet, kommunikationer. Var konkret med siffror och bevis.

- **STYCKE 5 (OMRÅDE & LIVSSTIL)**: Områdets unika fördelar. Nämn specifika restauranger, parker, skolor med avstånd och namn.

- **STYCKE 6 (FRAMTID & POTENTIAL)**: Vad bostaden erbjuder långsiktigt. Uppgraderingsmöjligheter, värdeutveckling.

**Tekniker (ANVÄND FLERA AV DESSA)**:
- "Tänk dig att..." för att placera läsaren i bostaden
- Sensoriska detaljer: Ljud (tyst gata), doft (bakade bullar från kvartersbageriet), känsla (solvärme genom stora fönster)
- Årstidsvariation: "Sommarmorgnar med kaffe på balkongen" / "Vinterkvällar vid kakelugnen"
- Personliga anekdoter: "Familjer som bott här i generationer" / "Första gången du öppnar dörren efter jobbet" 

### KVALITETSKRAV
- **LÄNGD**: ${platform === "hemnet" ? "350-450 ord" : "500-700 ord"}
- Varje adjektiv har bevis (mått, årtal, märke)
- Första meningen är en specifik hook
- Varje stycke ger ny information
- SEO: områdesnamn och objekttyp naturligt infogat
- Skriv social media-teaser (100-1160 tecken, INGEN emoji)

### OUTPUT FORMAT (JSON)
{
  "highlights": ["5 bullet points med ✓-prefix"],
  "improvedPrompt": "Färdig objektbeskrivning (${platform === "hemnet" ? "350-450 ord" : "500-700 ord"})",
  "analysis": {
    "identified_epoch": "Byggnadsepok",
    "target_group": "Målgrupp",
    "area_advantage": "Områdets styrkor",
    "pricing_factors": "Prisfaktorer",
    "association_status": "Föreningsstatus"
  },
  "socialCopy": "Teaser för sociala medier (100-1160 tecken, INGEN emoji)",
  "missing_info": ["Info som saknas och bör efterfrågas för att stärka texten ytterligare"],
  "pro_tips": ["2-3 tips för mäklaren"]
}
`;

      const baseMessages = [
        {
          role: "system" as const,
          content:
            finalSystemPrompt +
            "\n\nDu kommer få rådata inuti <db_context>...</db_context>. Följ reglerna i systemprompten. Svara ENDAST med ett giltigt JSON-objekt enligt OUTPUT FORMAT.",
        },
        {
          role: "user" as const,
          content: `<db_context>OBJEKT: ${type}. PLATTFORM: ${platform === "hemnet" ? "HEMNET (balanserat format, 350-450 ord, varje stycke måste sälja)" : "BOOLI/EGEN SIDA (detaljerat format, 500-700 ord, berätta historien)"}. RÅDATA: ${prompt}</db_context>`,
        },
      ];

      const completion1 = await openai.chat.completions.create({
        model,
        messages: baseMessages,
        max_tokens: plan === "pro" ? 4000 : 2000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const text1 = completion1.choices[0]?.message?.content || "{}";
      let result: any = JSON.parse(extractFirstJsonObject(text1));

      const violations = validateOptimizationResult(result);
      if (violations.length > 0) {
        const completion2 = await openai.chat.completions.create({
          model,
          messages: [
            ...baseMessages,
            {
              role: "user" as const,
              content:
                `<rule_violations>${violations.join("; ")}</rule_violations>` +
                "\n\nDu bröt minst en regel. Skriv om improvedPrompt och socialCopy så att ALLA regler följs. " +
                "Returnera ENDAST ett giltigt JSON-objekt enligt OUTPUT FORMAT.",
            },
          ],
          max_tokens: plan === "pro" ? 4000 : 2000,
          temperature: 0.2,
          response_format: { type: "json_object" },
        });

        const text2 = completion2.choices[0]?.message?.content || "{}";
        result = JSON.parse(extractFirstJsonObject(text2));
      }

      // Increment usage
      if (userId) {
        await storage.incrementUserPrompts(userId);
        await storage.createOptimization({
          userId,
          originalPrompt: prompt,
          improvedPrompt: result.improvedPrompt || prompt,
          category: type,
          improvements: [
            result.analysis?.identified_epoch ? `Epok: ${result.analysis.identified_epoch}` : null,
            result.analysis?.target_group ? `Målgrupp: ${result.analysis.target_group}` : null,
            result.analysis?.area_advantage ? `Område: ${result.analysis.area_advantage}` : null,
            result.analysis?.pricing_factors ? `Prisfaktorer: ${result.analysis.pricing_factors}` : null,
            result.analysis?.association_status ? `Förening: ${result.analysis.association_status}` : null,
          ].filter(Boolean) as string[],
          suggestions: result.pro_tips || [],
          socialCopy: result.socialCopy || null,
        });
      } else {
        await storage.incrementSessionPrompts(sessionId);
      }

      res.json({
        originalPrompt: prompt,
        improvedPrompt: result.improvedPrompt || prompt,
        highlights: result.highlights || [],
        analysis: result.analysis || {},
        improvements: result.missing_info || [],
        suggestions: result.pro_tips || [],
        socialCopy: result.socialCopy || null
      });
    } catch (err: any) {
      console.error("Optimize error:", err);
      res.status(500).json({ message: err.message || "Optimering misslyckades" });
    }
  });


  // Stripe checkout
  app.post("/api/stripe/create-checkout", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { tier } = req.body;

      console.log("[Stripe Checkout] User authenticated:", user.id, user.email);

      const priceId = tier === "basic" ? STRIPE_BASIC_PRICE_ID : STRIPE_PRO_PRICE_ID;
      if (!priceId) {
        console.error("[Stripe Checkout] Price ID not configured for tier:", tier);
        return res.status(500).json({ message: "Stripe price not configured" });
      }

      let customerId = user.stripeCustomerId;

      if (!customerId) {
        console.log("[Stripe Checkout] Creating new Stripe customer");
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        console.log("[Stripe Checkout] Stripe customer created:", customerId);

        await storage.updateUserStripeCustomer(user.id, customerId);
        console.log("[Stripe Checkout] Customer ID saved to database");
      } else {
        console.log("[Stripe Checkout] Using existing Stripe customer:", customerId);
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;

      console.log("[Stripe Checkout] Creating checkout session with base URL:", baseUrl);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}?success=true`,
        cancel_url: `${baseUrl}?canceled=true`,
        metadata: { userId: user.id, targetPlan: tier },
      });

      console.log("[Stripe Checkout] Session created successfully:", session.id);
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe Checkout] Error:", err);
      res.status(500).json({ message: err.message || "Betalning misslyckades" });
    }
  });

  // Stripe customer portal
  app.post("/api/stripe/create-portal", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;

      if (!user.stripeCustomerId) {
        return res.status(400).json({ message: "No subscription found" });
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: baseUrl,
      });

      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error("Portal error:", err);
      res.status(500).json({ message: err.message || "Could not open portal" });
    }
  });

  // Stripe webhook
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Stripe webhook secret not configured");
      return res.status(500).json({ message: "Webhook not configured" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const targetPlan = session.metadata?.targetPlan as "basic" | "pro";

          if (userId && targetPlan && session.subscription && session.customer) {
            await storage.upgradeUser(
              userId,
              targetPlan,
              session.customer as string,
              session.subscription as string
            );
            console.log(`User ${userId} upgraded to ${targetPlan}`);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await storage.downgradeUserToFree(subscription.id);
          console.log(`Subscription ${subscription.id} cancelled`);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as any).subscription;
          if (subscriptionId) {
            await storage.downgradeUserToFree(subscriptionId as string);
            console.log(`Payment failed for subscription ${subscriptionId}`);
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // History endpoints
  app.get("/api/history", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const history = await storage.getOptimizationHistory(user.id);
      res.json(history);
    } catch (err) {
      console.error("History error:", err);
      res.status(500).json({ message: "Kunde inte hämta historik" });
    }
  });

  app.delete("/api/history/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const id = parseInt(req.params.id);
      await storage.deleteOptimization(user.id, id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete history error:", err);
      res.status(500).json({ message: "Kunde inte radera" });
    }
  });

  app.delete("/api/history", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      await storage.deleteAllOptimizations(user.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Clear history error:", err);
      res.status(500).json({ message: "Kunde inte rensa historik" });
    }
  });

  // ==================== TEAM ROUTES (PRO ONLY) ====================

  app.get("/api/teams", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teams = await storage.getUserTeams(user.id);
      res.json(teams);
    } catch (err) {
      console.error("Get teams error:", err);
      res.status(500).json({ message: "Kunde inte hämta team" });
    }
  });

  app.post("/api/teams", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { name } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Team name is required" });
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const team = await storage.createTeam({
        name: name.trim(),
        slug: `${slug}-${Date.now()}`,
        ownerId: user.id,
      });

      await storage.addTeamMember({
        teamId: team.id,
        userId: user.id,
        role: "owner",
      });

      res.json(team);
    } catch (err) {
      console.error("Create team error:", err);
      res.status(500).json({ message: "Kunde inte skapa team" });
    }
  });

  app.get("/api/teams/:id", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const team = await storage.getTeamById(teamId);
      res.json(team);
    } catch (err) {
      console.error("Get team error:", err);
      res.status(500).json({ message: "Failed to get team" });
    }
  });

  app.get("/api/teams/:id/members", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const members = await storage.getTeamMembers(teamId);
      res.json(members);
    } catch (err) {
      console.error("Get team members error:", err);
      res.status(500).json({ message: "Failed to get team members" });
    }
  });

  app.post("/api/teams/:id/invite", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return res.status(403).json({ message: "Only owners and admins can invite members" });
      }

      // Check rate limit for invites
      const canSend = await storage.canSendEmail(user.email, 'team_invite', MAX_INVITE_EMAILS_PER_HOUR);
      if (!canSend) {
        return res.status(429).json({ 
          message: "Du har skickat för många inbjudningar. Vänligen vänta en timme." 
        });
      }

      const invite = await storage.createTeamInvite(teamId, email.trim().toLowerCase(), user.id);
      
      // Get team name for the email
      const team = await storage.getTeamById(teamId);
      if (team) {
        await storage.recordEmailSent(user.email, 'team_invite');
        await sendTeamInviteEmail(invite.email, invite.token, team.name, user.email);
        console.log("[Invite] Team invite email sent to:", invite.email);
      }
      
      res.json({ token: invite.token, email: invite.email, emailSent: true });
    } catch (err) {
      console.error("Create invite error:", err);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.post("/api/teams/join/:token", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { token } = req.params;

      const invite = await storage.getInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ message: "Invalid or expired invite" });
      }

      if (new Date(invite.expiresAt) < new Date()) {
        await storage.deleteInvite(invite.id);
        return res.status(410).json({ message: "This invite has expired" });
      }

      if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(403).json({ message: "This invite is for a different email address" });
      }

      const existingMembership = await storage.getUserTeamMembership(user.id, invite.teamId);
      if (existingMembership) {
        await storage.deleteInvite(invite.id);
        const team = await storage.getTeamById(invite.teamId);
        return res.json(team);
      }

      await storage.addTeamMember({
        teamId: invite.teamId,
        userId: user.id,
        role: "member",
      });

      await storage.deleteInvite(invite.id);
      const team = await storage.getTeamById(invite.teamId);
      res.json(team);
    } catch (err) {
      console.error("Join team error:", err);
      res.status(500).json({ message: "Failed to join team" });
    }
  });

  app.get("/api/teams/:id/prompts", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const prompts = await storage.getTeamSharedPrompts(teamId);
      res.json(prompts);
    } catch (err) {
      console.error("Get team prompts error:", err);
      res.status(500).json({ message: "Failed to get prompts" });
    }
  });

  app.post("/api/teams/:id/prompts", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);
      const { title, content, category } = req.body;

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const prompt = await storage.createSharedPrompt({
        teamId,
        creatorId: user.id,
        title: title || "Untitled",
        content: content || "",
        category: category || "General",
        status: "draft",
      });

      res.json(prompt);
    } catch (err) {
      console.error("Create prompt error:", err);
      res.status(500).json({ message: "Failed to create prompt" });
    }
  });

  app.patch("/api/prompts/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);

      const existingPrompt = await storage.getSharedPromptById(promptId);
      if (!existingPrompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, existingPrompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const prompt = await storage.updateSharedPrompt(promptId, req.body);
      res.json(prompt);
    } catch (err) {
      console.error("Update prompt error:", err);
      res.status(500).json({ message: "Failed to update prompt" });
    }
  });

  app.delete("/api/prompts/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);

      const existingPrompt = await storage.getSharedPromptById(promptId);
      if (!existingPrompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, existingPrompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      if (!["owner", "admin"].includes(membership.role) && existingPrompt.creatorId !== user.id) {
        return res.status(403).json({ message: "Only team owners, admins, or the creator can delete prompts" });
      }

      await storage.deleteSharedPrompt(promptId);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete prompt error:", err);
      res.status(500).json({ message: "Failed to delete prompt" });
    }
  });

  app.get("/api/prompts/:id/comments", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const comments = await storage.getPromptComments(promptId);
      res.json(comments);
    } catch (err) {
      console.error("Get comments error:", err);
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  app.post("/api/prompts/:id/comments", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);
      const { content } = req.body;

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const comment = await storage.createComment({
        promptId,
        userId: user.id,
        content: content || "",
      });

      res.json(comment);
    } catch (err) {
      console.error("Create comment error:", err);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // ==================== ADMIN ROUTES ====================
  
  // Admin endpoint to set user plan manually (no Stripe required)
  // Usage: POST /api/admin/set-plan
  // Body: { userId: "user-id", plan: "pro" } OR { email: "user@example.com", plan: "pro" }
  // Query param: ?adminKey=YOUR_SECRET_KEY (set ADMIN_KEY env variable)
  app.post("/api/admin/set-plan", async (req, res) => {
    try {
      const adminKey = req.query.adminKey as string;
      const expectedKey = process.env.ADMIN_KEY || "change-this-secret-key";

      if (adminKey !== expectedKey) {
        return res.status(403).json({ message: "Invalid admin key" });
      }

      const { userId, email, plan } = req.body;

      if (!plan || !["free", "basic", "pro"].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan. Must be 'free', 'basic', or 'pro'" });
      }

      let targetUser: User | null = null;

      if (userId) {
        targetUser = await storage.getUserById(userId);
      } else if (email) {
        targetUser = await storage.getUserByEmail(email);
      } else {
        return res.status(400).json({ message: "Either userId or email must be provided" });
      }

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.setUserPlan(targetUser.id, plan);
      
      console.log(`[Admin] User ${targetUser.email} (${targetUser.id}) plan set to ${plan}`);
      
      res.json({ 
        success: true, 
        message: `User ${targetUser.email} plan set to ${plan}`,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          plan: plan
        }
      });
    } catch (err: any) {
      console.error("Admin set-plan error:", err);
      res.status(500).json({ message: err.message || "Failed to set user plan" });
    }
  });

  return httpServer;
}
