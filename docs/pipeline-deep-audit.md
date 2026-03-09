# Deep Audit: AI Pipeline som Kollegor runt ett Bord

## Pipeline-översikt (7 huvudsteg)

```
Input → Step 1 → Step 2 → Intelligence → Positioning → Examples → Step 3 
→ Polish → Step 5 (Surgical) → Step 5b (Expansion) → Step 6 (Fact-check) 
→ Final Audit → Output
```

---

## Varje stegs roll och expertis

### **Step 1: Extraction** (Kollega: Dataanalytikern)
**Expertis:** Strukturering av ostrukturerad data
**Roll:** Tar rå input (formulär eller fritext) och skapar en standardiserad disposition

**Gör:**
- Extraherar: bostadstyp, storlek, rum, läge, pris, driftkostnader
- Normaliserar: konverterar olika format till standardstruktur
- Validerar: ser till att kritiska fält finns (area, rum, pris)

**Kommunikation till nästa steg:**
- Skickar: `disposition` (JSON med strukturerad data)
- Mottagare: Step 2
- Format: Standardiserat, validerat

**Potentiella brister:**
- Om input är ofullständig → disposition blir tunn
- Kan missa subtila kvaliteter som Step 2 skulle behöva
- Ingen kontext om "vad som är viktigt" skickas vidare

---

### **Step 2: Writing Plan** (Kollega: Strategen/Planeraren)
**Expertis:** Försäljningsstrategi och struktur
**Roll:** Skapar en evidensbaserad plan för hur texten ska byggas

**Gör:**
- Analyserar vilka säljpunkter som är starkast
- Skapar disposition: vilka stycken ska finnas och i vilken ordning
- Identifierar "claims" - påståenden som behöver faktagranskas
- Bestämmer ton och fokus baserat på bostadstyp

**Kommunikation:**
- Tar emot: disposition från Step 1
- Skickar: `writingPlan` med claims och paragrafförslag
- Mottagare: Step 3

**Potentiella brister:**
- Planen är bara struktur - ingen konkret vägledning för innehåll
- Kan skapa för ambitiös plan som Step 3 inte kan leverera
- Ingen feedback-loop om planen är realistisk

---

### **Intelligence Layer** (Kollega: Marknadsanalytikern)
**Expertis:** Köpare och marknad
**Roll:** Berikar med insikter om målgrupp och positionering

**Gör:**
- Inferred buyer: vem är trolig köpare?
- Value anchors: vad är unikt med denna bostad?
- Market context: vad är viktigt i detta område?

**Kommunikation:**
- Tar emot: disposition
- Skickar: `intelligence` (buyer profile, value anchors)
- Mottagare: Step 3

**Potentiella brister:**
- Intelligence kommer EFTER writing plan - kunde påverkat planen tidigare
- Step 3 får mycket data men begränsad vägledning om hur prioritera

---

### **Step 3: Primary Generation** (Kollega: Copywritern)
**Expertis:** Textproduktion och mäklarspråk
**Roll:** Skriver själva objektbeskrivningen

**Gör:**
- Genererar 2 kandidater (primary + alternative)
- Följer writing plan (teoretiskt)
- Använder exempel för att matcha stil
- Skapar: improvedPrompt (huvudtext), headline, social copy, etc.

**Input mottagen:**
- Disposition (fakta)
- Writing plan (struktur)
- Intelligence (insikter)
- Exempel (stilreferenser)
- Personal style (om användaren har sparat stil)

**Output:**
- 2 textkandidater med metadata (score, violations, word count)

**Potentiella brister:**
- Mängden input kan överväldiga - för mycket data att balansera
- Writing plan följas ofta mekaniskt, inte kreativt
- Personal style kan konflikta med textkvalitet
- Token limit kan trunkera output

---

### **Step 3 Polish** (Kollega: Redaktören)
**Expertis:** Textförbättring och finslipning
**Roll:** Refinerar den bästa kandidaten till publiceringsklar nivå

**Gör:**
- Analyserar texten för svagheter
- Förbättrar rytm, övergångar, öppning
- Fixar violations utan att förlora längd

**Input:**
- Selected candidate (bästa kandidaten från Step 3)
- Violations (vad som behöver fixas)
- Current score (förbättringsmål)

**Output:**
- Polished text (förhoppningsvis bättre)

**KRITISK BRIST:**
- Polish har ofta försämrat istället för förbättrat
- Går från 318 → 293 ord (förlorar innehåll!)
- Score sjunker 0.81 → 0.80
- AI får inte tillräckligt specifika instruktioner om VAD som ska förbättras

---

### **Step 5: Surgical Correction** (Kollega: Kirurgen)
**Expertis:** Precisionsfixar av specifika problem
**Roll:** Fixar violations utan att röra resten av texten

**Gör:**
- Identifierar specifika violations (forbidden phrases, strukturproblem)
- Skriver om ENDAST de problematiska delarna
- Behåller allt annat intakt

**Input:**
- Text med violations
- Repair strategy (vilken typ av fix som behövs)

**Output:**
- Korrigerad text (förhoppningsvis med färre violations)

**Potentiella brister:**
- "Surgical" är ofta mer som "rewriting everything"
- Kan inte hantera komplexa rytmproblem
- Förstör ibland mer än det fixar

---

### **Step 5b: Expansion** (Kollega: Utvecklaren)
**Expertis:** Längdutökning utan kvalitetsförlust
**Roll:** Förlänger text som är för kort

**Gör:**
- Lägger till substantiellt innehåll (inte fluff)
- Utvecklar befintliga stycken djupare
- Behåller stil och rytm

**Input:**
- För kort text
- Target word count

**Output:**
- Längre text (förhoppningsvis)

**Potentiella brister:**
- Expansion kan lägga till generiskt innehåll
- Svårt att behålla rytm när man expanderar mekaniskt
- Kan trigga nya violations

---

### **Step 6: Fact-Check** (Kollega: Faktagranskaren)
**Expertis:** Verifikation och korrekthet
**Roll:** Säkerställer att allt i texten stämmer med källan

**Gör:**
- Jämför text mot disposition
- Flaggar felaktiga eller överdrivna påståenden
- Föreslår korrektioner

**Input:**
- Genererad text
- Original disposition (källan)

**Output:**
- Godkänd eller korrigerad text

**Potentiella brister:**
- Fact-check kan vara för strikt (flaggar kreativa formuleringar)
- Kan föreslå ändringar som försämrar stil
- Separat från writing plan → kan missa intentionen

---

### **Final Audit** (Kollega: Kvalitetschefen)
**Expertis:** Slutgiltig kvalitetsbedömning
**Roll:** Bestämmer om texten är redo för leverans

**Gör:**
- Utvärderar alla kvalitetsmått (score, violations, length)
- Kan trigga "rescue rewrite" om allt annat misslyckats
- Fattar slutligt beslut: godkänn eller avvisa

**Input:**
- All metadata från alla tidigare steg
- Färdig text

**Output:**
- Godkänd text → leverans
- Avvisad text → felmeddelande

**Potentiella brister:**
- För strikt - kan avvisa godtagbara texter
- Rescue rewrite är sista utväg men ofta inte tillräckligt bra
- Ingen återkoppling till tidigare steg om vad som gick fel

---

## Kommunikationsflöde mellan steg

### **Problem 1: Envägskommunikation**
All kommunikation är "push" - steg skickar data framåt men får inte feedback tillbaka.

**Exempel:**
- Step 2 skapar plan → skickar till Step 3
- Step 3 misslyckas följa planen → ingen återkoppling till Step 2
- Step 2 förblir omedveten om att planen var orealistisk

### **Problem 2: Kontextförlust**
Varje steg får bara en del av all tillgänglig information.

**Exempel:**
- Step 3 får disposition + writing plan + intelligence
- Men Polish får bara text + violations
- Polish vet inte VAD som var viktigt i originalplanen

### **Problem 3: Ingen koordinering**
Stegen är som kollegor som jobbar i silos utan att prata med varandra.

**Exempel:**
- Surgical (Step 5) fixar violations
- Men Expansion (Step 5b) kan introducera nya violations
- De jobbar inte koordinerat

---

## Föreslagna förbättringar för sömlöst samarbete

### 1. **Tillbaka-feedback-loopar**
Låt senare steg ge feedback till tidigare:
- Om Step 3 ofta misslyckas följa writing plan → justera Step 2
- Om Polish ofta försämrar → skicka feedback till Step 3 om att generera bättre

### 2. **Kontinuerlig kontext**
Alla steg borde ha tillgång till:
- Originaldisposition (källan)
- Writing plan (intentionen)
- Intelligence (målgruppen)
- Accumulated changes (vad som ändrats så långt)

### 3. **Koordinerade reparationssteg**
Surgical, Expansion, Fact-check borde samarbeta:
- Surgical fixar violations
- Expansion fyller på med kvalitativt innehåll
- Fact-check validerar resultatet
- Alla tre jobbar mot samma mål

### 4. **Smart gate-keeping**
Just nu är gates för binära (kör/stopp). Bättre:
- "Kör Polish, men ge den specifika instruktioner"
- "Kör Surgical ENDAST om det finns specifika fixbara problem"
- "Kör Expansion OM ordantalet är under 80% av target"

---

## Kärninsikt

Pipeline:n är som ett team där varje kollega är expert på sin sak, men de:
1. Pratar inte med varandra
2. Får inte veta vad som hänt tidigare
3. Jobbar mot olika mål utan koordinering

**Lösning:** Pipeline:n behöver en "projektledare" som koordinerar alla steg, ser till att de har rätt kontext, och fattar smarta beslut om vilka steg som ska köras.
