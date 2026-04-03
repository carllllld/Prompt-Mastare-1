# NÄSTA SESSION: Komplett Blueprint

## KONTEXT
OptiPrompt (Mäklartexter) — SaaS för svenska fastighetsmäklare.
Stack: React 18 + Express + PostgreSQL + OpenAI GPT-5.2 + Stripe.
Deploy: Render med auto-deploy på git push.

## KRITISKT ATT FIXA FÖRST (innan ny feature)

### 1. AI-textkvaliteten är för dålig
Texterna låter som AI-rapporter, inte som en mäklare. Specifika problem:
- Rapportaktigt språk: "Hallen har avhängning och garderober, och leder vidare till..."
- AI-ord smyger igenom trots förbjudna-lista: "sätter fokus", "omfattar", "vilket"
- Socialt inlägg är bara en komprimerad huvudtext — ska vara personligt, engagerande, med CTA
- Texterna är för korta (220 ord för en villa med 7 rum och 3 badrum)
- Saknar känsla och vardagsbild — listar fakta istället för att måla en bild

**Lösning**: Prompten i server/routes.ts (HEMNET_TEXT_PROMPT och BOOLI_TEXT_PROMPT_WRITER) 
behöver omarbetas fundamentalt. Referensexemplen (GOLDEN_BROKER_EXAMPLES) styr GPT:s stil 
mer än instruktionerna. Skriv 4-5 riktigt bra referensexempel per bostadstyp som visar 
exakt den ton och kvalitet vi vill ha.

Filen att ändra: server/routes.ts, sök efter HEMNET_TEXT_PROMPT (rad ~2700)

### 2. ResultSection visar gammal UI
Användaren ser fortfarande gammal ResultSection med emojis, scorecard, konkurrentanalys 
med mock-data etc. Ny ResultSection är skriven men inte deployad.

**Åtgärd**: Kör npm run build och deploya.

### 3. Vitec-integration fixad men ej deployad
- IntegrationsSettings.tsx fixad att använda krypterad endpoint
- VitecExportButton fixad (direkt API-export borttagen, bara kopiering)
- requirePro tillagt på settings-endpoint

**Åtgärd**: Kör npm run build och deploya.

## NY FEATURE: AI Säljstrateg (Premium)

### Vad det är
En AI-driven säljstrateg som hjälper mäklaren genom HELA försäljningsprocessen — 
inte bara objektbeskrivningen. Det här är vad som gör verktyget branschrevolutionerande.

### Varför det är banbrytande
Idag: Mäklare fyller i data → får text → kopierar → klart.
Med AI Säljstrateg: Mäklare fyller i data → får text + komplett marknadsföringsstrategi 
anpassad efter objektet, området och målgruppen.

### Vad den genererar (utöver befintliga 5 texter):

1. **Målgruppsanalys** — Vem köper denna bostad? Familj? Par? Singel? Pensionär?
   Baserat på: boarea, rum, läge, pris, balkong/trädgård, kommunikationer.
   Output: 2-3 meningar om primär och sekundär målgrupp.

2. **Säljargument rangordnade** — De 5 starkaste säljargumenten för just detta objekt,
   rangordnade efter vad som driver köpbeslut för målgruppen.
   Baserat på: alla formulärfält + målgruppsanalys.

3. **Prissättningsperspektiv** — Hur positionera priset i texten?
   "Priset ligger i linje med området" vs "Prisvärde jämfört med nyproduktion"
   Baserat på: pris, boarea, skick, renoveringar, läge.

4. **Visningsstrategi** — Konkreta tips för visningen baserat på objektet.
   "Visa balkongen först — söderläget är starkaste argumentet"
   "Ha kaffe i köket — det är nyrenoverat och säljer sig självt"

5. **Annonsoptimering** — Vilka bilder bör vara först? Vilken tid publicera?
   "Publicera tisdag kväll — högst trafik på Hemnet"
   "Första bilden: balkongen med kvällssol, inte fasaden"

### Teknisk implementation

**Server**: Ny endpoint POST /api/sales-strategy
- Input: samma propertyData som /api/optimize
- Använder GPT-5.2 med reasoning: medium
- Returnerar JSON med alla 5 sektioner
- Kör EFTER textgenereringen (kan använda genererad text som kontext)

**Client**: Ny sektion i ResultSection, under texterna
- Kollapsbar — "AI Säljstrateg" med expand/collapse
- Varje sektion (målgrupp, argument, pris, visning, annons) som egen rad
- Kopierbar — mäklaren kan kopiera hela strategin

**Tier**: Premium only (599 kr/mån)
- Pro-användare ser en låst preview med 1 av 5 sektioner synlig
- Free ser ingenting

### Varför mäklare betalar för detta
- Sparar 30-60 minuter per objekt (strategi + texter)
- Ger konkreta, handlingsbara tips — inte generiska råd
- Ingen annan tjänst erbjuder detta
- Mäklare som använder strategin säljer snabbare (positionering)

## DEPLOY-KOMMANDON
```bash
npm run db:push    # Skapa nya tabeller
npm run build      # Bygga för produktion
```

## FILER ATT LÄSA FÖRST I NY SESSION
1. server/routes.ts (rad 2600-2850) — AI-prompterna
2. client/src/components/ResultSection.tsx — resultatvisning
3. client/src/components/PromptFormProfessional.tsx — formuläret
4. client/src/pages/Home.tsx — huvudsidan
5. shared/schema.ts — datamodeller
