# Natural Text Generation - Root Cause Fixes

## Datum: 2026-03-25

## Sammanfattning

Implementerade root cause-fixes för att förbättra textgenereringen efter att JSON-format togs bort. Fokus på att förhindra fel vid källan istället för att fixa symptom.

## Implementerade Fixes

### 1. Skickbeskrivningar ("nyskick"-problemet)

**Problem**: AI:n använde "i nyskick" från formuläret utan bevis, vilket är juridiskt problematiskt.

**Lösning**: Lagt till explicit regel i system-prompten:
```
## KRITISKT: SKICKBESKRIVNINGAR

**ALDRIG använd vaga skickbeskrivningar utan bevis:**
- INTE: "i nyskick", "som nytt", "fräscht skick", "gott skick"
- RÄTT: Ange konkreta renoveringsår och omfattning

**Om disposition innehåller "nyskick" eller liknande:**
- Ignorera det helt
- Använd istället konkreta renoveringsår från disposition
- Exempel: "Köket renoverades 2023" istället för "kök i nyskick"
```

**Resultat**: AI:n kommer nu ignorera "nyskick" från formuläret och använda konkreta renoveringsår istället.

---

### 2. Företagsnamn (Willys Värmdö → matbutik)

**Problem**: AI:n skrev specifika företagsnamn som "Willys Värmdö" istället för generiska termer.

**Lösning**: Förbättrade generaliseringsmönster i post-processor:
```typescript
// Swedish grocery store chains - replace with "matbutik"
[/\b(Willys|ICA|Coop|Hemköp|City Gross|Lidl)\s+[A-ZÅÄÖ][a-zåäö]+\b/gi, 'matbutik'],
[/\b(Willys|ICA|Coop|Hemköp|City Gross|Lidl)\b/gi, 'matbutik'],
```

**Resultat**: Alla svenska matbutikskedjor ersätts automatiskt med "matbutik" eller "matbutiker".

---

### 3. Visningsinbjudan (ofullständiga meningar)

**Problem**: AI:n skrev "Visning. Anmälan och frågor tas via." utan att avsluta meningen.

**Lösning**: Lagt till konkreta exempel i prompten:
```
EXEMPEL PÅ BRA VISNINGSINBJUDAN:
- "Visning sker efter överenskommelse. Kontakta ansvarig mäklare för bokning."
- "Visning: anmälan krävs via Hemnet eller mäklarens kontaktformulär."
- "Visning efter överenskommelse. Boka tid via annonsen."
```

**Resultat**: AI:n har nu tydliga exempel på hur en komplett visningsinbjudan ska se ut.

---

### 4. Repetitiva Vitvaror-fraser

**Problem**: AI:n skrev "Integrerade Siemens-vitvaror, uppdaterade vitvaror" (repetitivt och motsägelsefullt).

**Lösning A - System-prompt**:
```
## UNDVIK REPETITION OCH MOTSÄGELSER

**Vitvaror:**
- INTE: "Integrerade Siemens-vitvaror, uppdaterade vitvaror" (repetitivt)
- RÄTT: "Integrerade Siemens-vitvaror (ugn, spis, diskmaskin)" (specifikt)
```

**Lösning B - Post-processor**:
```typescript
// Fix repetitive vitvaror phrases
const repetitiveVitvarorPattern = /\b(integrerade|inbyggda)\s+([\w-]+vitvaror)[,\s]+(uppdaterade|nya)\s+vitvaror\b/gi;
text = text.replace(repetitiveVitvarorPattern, '$1 $2');
```

**Resultat**: Både förebyggande (prompt) och korrigerande (post-processor) åtgärder.

---

### 5. Tekniska Detaljer utan Årtal

**Problem**: "Nya fönster" och "tjärpappstak" utan årtal är juridiskt otydligt.

**Lösning**: Lagt till regel i system-prompten:
```
**Tekniska detaljer:**
- Ange alltid årtal för renoveringar: "Köket renoverades 2023"
- Ange alltid årtal för nya fönster/tak: "Fönster bytta 2022"
- Om årtal saknas: Skriv neutralt "Fönster är bytta" eller utelämna helt
```

**Resultat**: AI:n kommer alltid försöka ange årtal eller skriva neutralt.

---

## Tidigare Fixes (från JSON-borttagning)

### ✅ Fixade Grammatikfel
- "nyskick2" (ord med siffror) - FIXAT
- Dubbla punkter (..) - FIXAT
- Saknade kommatecken - FIXAT
- Mellanslag före punkter - FIXAT

### ✅ Parsing-förbättringar
- Marker-baserad parsing istället för JSON
- Stöd för både svenska och engelska markörer
- Automatisk rensning av instruktionstext

---

## Kvarstående Utmaningar

### Kort Annons Saknas
**Status**: Parser hittar inte fältet eller AI:n skriver inte det.
**Nästa steg**: Övervaka om det förekommer efter dessa fixes.

### "Läs mer i annonsen"
**Status**: Inte förbjudet men onödigt i social media-texter.
**Nästa steg**: Kan läggas till i förbjudna fraser om det fortsätter.

---

## Testning

Kör följande för att verifiera:
```bash
npm run build
npm run test
```

Testa i produktion med samma disposition som tidigare för att jämföra resultat.

---

## Förväntade Förbättringar

1. **Inga "nyskick"-påståenden** - Ersatta med konkreta renoveringsår
2. **Inga företagsnamn** - "Willys Värmdö" → "matbutik"
3. **Kompletta visningsinbjudningar** - Inga avbrutna meningar
4. **Inga repetitiva vitvaror-fraser** - Enklare och tydligare
5. **Årtal på tekniska detaljer** - Eller neutrala formuleringar

---

## Filosofi

**Före**: Fixa symptom genom strängare validering
**Efter**: Förhindra fel vid källan genom bättre instruktioner

Reasoning-modellen (GPT-5.2 medium) kan nu planera och skriva naturligt utan JSON-begränsningar, vilket ger bättre kvalitet och färre konstiga fel.
