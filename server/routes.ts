import type { Express } from "express";
import type { Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import OpenAI from "openai";
import { optimizeRequestSchema, PLAN_LIMITS, type PlanType, type User } from "@shared/schema";
import { requireAuth } from "./auth";
import { sendTeamInviteEmail } from "./email";

const MAX_INVITE_EMAILS_PER_HOUR = 5;

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const STRIPE_BASIC_PRICE_ID = process.env.STRIPE_BASIC_PRICE_ID;
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

// --- THE ELITE REALTOR DNA (KNOWLEDGE BASE) ---
const REALTOR_KNOWLEDGE_BASE = `
### DIN IDENTITET & EXPERTIS
Du är Sveriges främsta copywriter för fastighetsbranschen med 20 års erfarenhet. Du kombinerar djup lokalkunskap, arkitekturhistoria och köparpsykologi för att skapa texter som säljer. Din ton är sofistikerad men tillgänglig – aldrig säljig eller klyschig.

Du har studerat stilarna hos Sveriges toppmäklare:
- **Erik Olsson-stilen** (Östermalm/premium lägenheter): Varmt välkomnande, balanserar sekelskiftescharm med modern funktion
- **Fastighetsbyrån-stilen** (Premium villor): Stolt presentation, tidlösa element, emotionell livsstilsförsäljning
- **Hemnet-optimerad struktur**: Bullet points först med nyckelfördelar, sedan flytande text

### ARKITEKTONISKT BIBLIOTEK (DETALJERAT)

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

### HEMNET-OPTIMERAD STRUKTUR

**TOP 5 HIGHLIGHTS (BULLET POINTS FÖRST):**
Varje objektbeskrivning ska inledas med 5 korta, konkreta fördelar:
- ✓ Skuldfri förening
- ✓ Balkong i sydvästerläge
- ✓ Stambytt 2023
- ✓ Gym och bastu i huset
- ✓ 5 min till tunnelbana

Välj de 5 starkaste säljpunkterna för just detta objekt.

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

### RETORISKA LAGAR (ANTI-KLYSCH-FILTER)

**FÖRBJUDNA ORD (Använd ALDRIG, NÅGONSIN):**
- "Ljus och fräsch", "ljust och luftigt", "fräsch"
- "Ett stenkast från", "nära till allt"
- "Fantastisk", "underbar", "magisk", "otrolig"
- "Unik chans", "sällsynt tillfälle", "missa inte"
- "Hjärtat i hemmet", "husets hjärta"
- "Välplanerad", "genomtänkt", "smart planerad"
- "Drömboende", "drömlägenhet", "drömhem"
- "Pärlor", "oas", "en sann pärla"
- "Påkostad renovering" (utan specifikation)
- "Moderna ytskikt", "fräscha ytskikt"
- "Praktisk planlösning", "flexibel planlösning"
- "Rymlig", "generös" (utan mått)
- "Härlig", "mysig", "trivsam" (utan konkret detalj)
- "Centralt belägen", "strategiskt läge"
- "Perfekt för den som..."
- Alla superlativer utan bevis
- ALLA EMOJIS (absolut förbjudet)

**ERSÄTTNINGSSTRATEGIER:**
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
      res.status(500).json({ message: "Failed to get user status" });
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
          message: `Du har nått din månadsgräns av ${monthlyLimit} objektbeskrivningar. Uppgradera för fler!`,
          limitReached: true,
        });
      }

      const { prompt, type, platform } = req.body;

      const finalSystemPrompt = `
      
${REALTOR_KNOWLEDGE_BASE}

### DIN ARBETSPROCESS (ELITE 6-STEP REASONING)

**STEG 1: DEKONSTRUKTION & ANALYS**
Innan du skriver ett ord, analysera rådata:
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
Välj rätt stil baserat på objekt och prisklass:
- STANDARD:
- PREMIUM (4M+):
- EXKLUSIVT (8M+, villor): 
- SEKELSKIFTE: "[Årtal] års [stil] möter [modern detalj]..."

**STEG 4: SENSORISKT STORYTELLING**
Bygg 3-5 stycken som säljer en livsstil, inte bara rum:
- STYCKE 1: Hook + övergripande känsla och läge
- STYCKE 2: Bostadens kärna – kök/vardagsrum med specifika detaljer (mått, märken, ljusförhållanden)
- STYCKE 3: Privata zoner – sovrum, badrum med materialval och praktiska fördelar
- STYCKE 4: Det osynliga mervärdet – förening, energi, förvaring, potential
- STYCKE 5 (valfritt): Områdets framtid eller livsstilsavslut

Tekniker (OM PASSANDE):
- "Tänk dig att..." för att placera läsaren i bostaden
- Ljud, doft, känsla – inte bara syn
- Årstidsvariation: "Sommarmorgnar med kaffe på balkongen" / "Vinterkvällar vid kakelugnen" 

**STEG 5: ANTI-KLYSCH-VERIFIERING**
Gå igenom varje mening:
- Finns något förbjudet ord? → ERSÄTT med specifik detalj
- Finns emoji i löptexten? → TA BORT omedelbart (endast ✓ i highlights är OK)
- Finns adjektiv utan bevis? → Lägg till mått, årtal eller märke
- Låter det som AI → Skriv om med mer personlighet

**STEG 6: SLUTFÖRÄDLING**
- Läs texten högt (mentalt) – flyter den naturligt?
- Är varje stycke unikt värdefullt, eller upprepas information?
- Skulle en köpare i målgruppen känna sig tilltalad?
- Skriv social media-teaser – punchy, specifik, ingen emoji
- Används några förbjudna ord eller klyschor, skriv om tills det inte gör det

**KVALITETSKRITERIER**
1. SPECIFICITET: Varje påstående har konkret bevis (mått, årtal, märke, avstånd)
2. UNIKT VÄRDE: Texten avslöjar något som inte syns på bilderna
3. EMOTIONELL HOOK: Första meningen fångar omedelbart uppmärksamhet med specifik detalj
4. MÅLGRUPPSPRECISION: Textens ton matchar exakt vem som köper (inte generisk)
5. KOMPETITIV ANALYS: Texten positionerar objektet bättre än konkurrenter i området
6. HANDLINGSDIRIGERAD: Varje stycke leder läsaren närmare beslutet att boka visning
7. SEO-OPTIMERAD: Innehåller naturligt områdesnamn, objekttyp, och sökord som köpare använder
8. TRUST SIGNALS: Inkluderar konkreta bevis på kvalitet (stambytt, skuldfri, energiklass, etc.)

**FÖRBJUDNA FALLGROPAR:**
- Generiska beskrivningar som passar alla objekt
- Adjektiv utan konkret bevis
- Upprepning av information från highlights i löptexten
- För långa meningar (max 25 ord per mening)
- Passiv form när aktiv är möjlig
- "Detta objekt" eller "denna bostad" – använd specifika detaljer istället

### OUTPUT FORMAT (JSON)
{
  "highlights": ["5 korta bullet points med ✓-prefix, de starkaste säljargumenten"],
  "improvedPrompt": "Den färdiga objektbeskrivningen (professionell svenska). BÖRJA med highlights som bullet-lista, sedan löptext.",
  "analysis": { 
    "identified_epoch": "Identifierad byggnadsepok och stil",
    "target_group": "Primär målgrupp och varför",
    "area_advantage": "Områdets största säljpunkter",
    "pricing_factors": "Faktorer som påverkar pris positivt",
    "association_status": "Föreningens ekonomi och status (om bostadsrätt)"
  },
  "socialCopy": "Kort, punchy teaser för Instagram/Facebook (max 1160 tecken,minst 100 tecken, INGEN emoji)",
  "critical_gaps": ["Lista på information som SAKNAS i rådata och BÖR efterfrågas"],
  "pro_tips": ["2-3 strategiska tips för mäklaren att maximera intresse"]
}
`;

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: `OBJEKT: ${type}. PLATTFORM: ${platform}. RÅDATA: ${prompt}` }
        ],
        model: plan === "pro" ? "gpt-4o" : "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

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
        improvements: result.critical_gaps || [],
        suggestions: result.pro_tips || [],
        socialCopy: result.socialCopy || null
      });
    } catch (err: any) {
      console.error("Optimize error:", err);
      res.status(500).json({ message: err.message || "Optimization failed" });
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
      res.status(500).json({ message: err.message || "Payment failed" });
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
      res.status(500).json({ message: "Failed to get history" });
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
      res.status(500).json({ message: "Failed to delete" });
    }
  });

  app.delete("/api/history", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      await storage.deleteAllOptimizations(user.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Clear history error:", err);
      res.status(500).json({ message: "Failed to clear history" });
    }
  });

  // ==================== TEAM ROUTES ====================

  app.get("/api/teams", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teams = await storage.getUserTeams(user.id);
      res.json(teams);
    } catch (err) {
      console.error("Get teams error:", err);
      res.status(500).json({ message: "Failed to get teams" });
    }
  });

  app.post("/api/teams", requireAuth, async (req, res) => {
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
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.get("/api/teams/:id", requireAuth, async (req, res) => {
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

  app.get("/api/teams/:id/members", requireAuth, async (req, res) => {
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

  app.post("/api/teams/:id/invite", requireAuth, async (req, res) => {
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

  app.post("/api/teams/join/:token", requireAuth, async (req, res) => {
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

  app.get("/api/teams/:id/prompts", requireAuth, async (req, res) => {
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

  app.post("/api/teams/:id/prompts", requireAuth, async (req, res) => {
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

  return httpServer;
}
