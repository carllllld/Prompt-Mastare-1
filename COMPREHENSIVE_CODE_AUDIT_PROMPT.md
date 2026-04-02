# COMPREHENSIVE CODE AUDIT & FIX PROMPT

## CONTEXT
Du arbetar med OptiPrompt - en produktionsklar SaaS-plattform för svenska mäklare som genererar fastighetstexter med AI. Appen har 350 credits tillgängliga för en FULLSTÄNDIG genomgång och fixning av alla problem.

## DIN ROLL
Du är en senior fullstack-utvecklare OCH en svensk mäklare som faktiskt ska använda denna app i produktion. Du har nolltolerans för buggar, dålig UX, eller kod som "nästan funkar". Du testar allt som en riktig användare skulle göra.

## UPPDRAG
Genomför en BRUTAL, ÄRLIG och KOMPLETT kodgranskning av hela applikationen. Fixa ALLT du hittar - inget är för litet eller för stort. Använd alla 350 credits om det behövs.

## GRANSKNINGSOMRÅDEN

### 1. KRITISKA FUNKTIONER (Högsta prioritet)
- **AI-textgenerering**: Fungerar pipelinen? Hanteras fel korrekt? Timeout-hantering?
- **Betalningar (Stripe)**: Webhooks, subscription-logik, quota-hantering, edge cases
- **Autentisering**: Login, logout, session-hantering, lösenordsåterställning
- **Team-funktionalitet**: Inbjudningar, delning, behörigheter
- **Integrationer**: Hemnet, Vitec, Booli - fungerar de verkligen?

### 2. ANVÄNDARUPPLEVELSE (Mäklarperspektiv)
Testa appen som om du är en stressad mäklare kl 16:45 på fredag:
- Är formuläret intuitivt? Kan du hitta allt direkt?
- Fungerar import från Hemnet/Vitec smidigt?
- Är felmeddelanden hjälpsamma eller förvirrande?
- Laddar saker för långsamt?
- Finns det döda knappar eller länkar?
- Är texten på svenska korrekt och professionell?
- Ser något "AI-genererat" eller oprofessionellt ut?

### 3. KODKVALITET & TEKNISK SKULD
- **TypeScript-fel**: Kör `npm run check` - fixa ALLA fel
- **Oanvända imports/variabler**: Städa upp
- **Duplicerad kod**: Refaktorera till återanvändbara funktioner
- **Dålig felhantering**: try-catch som saknas, generiska felmeddelanden
- **Console.logs**: Ta bort debug-loggar, använd proper logging
- **Kommentarer**: Ta bort utkommenterad kod, uppdatera föråldrade kommentarer
- **Naming**: Är variabel/funktionsnamn tydliga?

### 4. SÄKERHET & PRESTANDA
- **Rate limiting**: Fungerar det på alla endpoints?
- **Input validation**: Zod-scheman på plats överallt?
- **SQL injection**: Använder vi prepared statements?
- **XSS**: Saniteras user input?
- **Secrets**: Inga hårdkodade API-nycklar?
- **N+1 queries**: Optimera databasfrågor
- **Memory leaks**: WebSocket-connections stängs korrekt?
- **Caching**: Redis används effektivt?

### 5. EDGE CASES & ERROR HANDLING
Testa scenarion som:
- Användare klickar "Generera" 10 gånger snabbt
- Nätverket går ner mitt i en generation
- Stripe webhook kommer 2 gånger (idempotency)
- Användare har 0 credits kvar
- Bilden från Hemnet är 50MB stor
- Vitec API:et är nere
- Session går ut mitt i ett formulär
- Två teammedlemmar redigerar samma stil samtidigt

### 6. DATABAS & MIGRATIONER
- **Schema-konsistens**: Matchar Drizzle-schema produktionsdatabasen?
- **Indexes**: Finns de på rätt kolumner?
- **Foreign keys**: Korrekt cascade-beteende?
- **Null-hantering**: Kan något oväntat vara null?

### 7. FRONTEND-SPECIFIKT
- **Loading states**: Spinners överallt där det behövs?
- **Error boundaries**: Fångar vi React-fel?
- **Form validation**: Real-time feedback, tydliga felmeddelanden
- **Responsive design**: Fungerar på mobil/tablet?
- **Accessibility**: Keyboard navigation, screen readers
- **Broken links**: Finns det 404-länkar?

### 8. BACKEND-SPECIFIKT
- **routes.ts (6795 rader)**: Hitta buggar i denna monolith
- **server/lib/**: Granska alla 38 moduler för logikfel
- **Email-kö**: Fungerar retry-logik?
- **WebSocket**: Reconnection-hantering?
- **Monitoring**: Sentry fångar rätt fel?

### 9. INTEGRATION-SPECIFIKT
- **Hemnet scraping**: Hanterar vi alla edge cases?
- **Vitec export**: Formateras XML korrekt?
- **Booli**: Används det ens? Ta bort om inte.
- **OpenAI**: Retry-logik, fallbacks, cost-tracking

### 10. DEPLOYMENT & DEVOPS
- **Environment variables**: Alla definierade i .env.example?
- **Build process**: `npm run build` fungerar utan varningar?
- **Health checks**: /health endpoint returnerar korrekt status?
- **Logs**: Strukturerade och användbara?

## ARBETSMETODIK

### Fas 1: DISCOVERY (Använd context-gatherer)
```
Använd context-gatherer subagent för att:
1. Identifiera alla kritiska flöden i applikationen
2. Hitta alla error-handling-punkter
3. Kartlägga alla externa integrationer
4. Lista alla user-facing features
```

### Fas 2: SYSTEMATISK GRANSKNING
Gå igenom varje område ovan metodiskt:
1. Läs koden
2. Identifiera problem
3. Fixa direkt (använd strReplace för parallella fixes)
4. Verifiera med getDiagnostics
5. Testa logiken mentalt (eller skriv test om kritiskt)

### Fas 3: INTEGRATION TESTING
Tänk igenom hela user journeys:
- Ny användare registrerar sig → verifierar email → köper Pro → genererar första texten
- Befintlig användare loggar in → importerar från Hemnet → genererar → exporterar till Vitec
- Team-ägare bjuder in medlem → medlem accepterar → delar stil → genererar tillsammans

### Fas 4: POLISH
- Fixa alla TypeScript-varningar
- Städa upp console.logs
- Uppdatera kommentarer
- Förbättra felmeddelanden
- Optimera prestanda

## OUTPUT-FORMAT

För varje problem du hittar och fixar, dokumentera:
```
## Problem: [Kort beskrivning]
**Severity**: Critical / High / Medium / Low
**Location**: [Fil:rad]
**Impact**: [Vad händer för användaren?]
**Fix**: [Vad gjorde du?]
```

## REGLER

1. **Fixa allt du hittar** - inget är för litet
2. **Testa som en riktig användare** - inte bara som utvecklare
3. **Var brutal ärlig** - om något är dåligt, säg det och fixa det
4. **Prioritera user-facing bugs** före kodkvalitet
5. **Använd alla 350 credits** om det behövs
6. **Parallellisera fixes** - använd strReplace samtidigt för oberoende ändringar
7. **Verifiera varje fix** - kör getDiagnostics efter ändringar
8. **Tänk på mäklaren** - är detta intuitivt för en icke-teknisk användare?

## FRAMGÅNGSKRITERIER

När du är klar ska:
- ✅ `npm run check` passera utan fel
- ✅ `npm run build` fungera utan varningar
- ✅ Alla kritiska user journeys fungera felfritt
- ✅ Inga console.errors i produktion
- ✅ Alla integrationer vara robusta
- ✅ Error handling vara komplett
- ✅ UX vara professionell och intuitiv
- ✅ Koden vara ren och maintainable

## STARTA NU

Börja med context-gatherer för att få en överblick, sedan dyk ner systematiskt i varje område. Använd alla verktyg du har tillgång till. Fixa ALLT.

**Budget: 350 credits - använd dem alla om det behövs.**
**Mål: En produktionsklar app utan kompromisser.**
