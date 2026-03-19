# PRODUCTION DEEP ANALYSIS - KRITISKA PROBLEM IDENTIFIERADE

## EXECUTIVE SUMMARY

**Status**: ❌ FAIL-SAFE MODE AKTIVERAD  
**Kvalitet**: ⚠️ PROBLEM - Texten har flera fel  
**Pipeline**: ❌ FUNGERADE INTE SOM FÖRVÄNTAT  
**Tid**: ❌ 185 sekunder (6x över threshold)

---

## KRITISKA PROBLEM

### 🔴 PROBLEM 1: FAIL-SAFE MODE AKTIVERAD
**Severity**: CRITICAL

```
![Fail-Safe] Levererade bästa tillgängliga objektbeskrivning från steg: strong-candidate-baseline.
![Fail-Safe] Valde starkaste kandidatbaseline i stället för senare version.
![Fail-Safe] Ursprungligt fel fångades och ersattes av bästa tillgängliga leverans
```

**Vad detta betyder:**
- Pipeline failade på Final Gate
- Systemet använde fail-safe mode (strong-candidate-baseline)
- Användaren fick INTE den bästa versionen
- Detta är exakt det vi skulle fixa med optimeringarna!

**Varför hände detta:**
```
Error: [Final Gate] Kvarvarande kvalitetsfel i extratexter: 
[socialCopy] socialCopy är för lång; håll till max 3 meningar. 
[showingInvitation] showingInvitation innehåller oupplösta platshållare ([TID]/[KONTAKT]).
```

**Root Cause:**
- Aux fields validation failade
- Final Gate blockerade leverans pga aux field violations
- Fail-safe mode aktiverades

---

### 🔴 PROBLEM 2: AUX FIELDS HAR FEL

#### A. ShowingInvitation innehåller platshållare
```
VISNINGSINBJUDAN:
Visning [TID]. Föranmälan och information sker via [KONTAKT]. 
På plats går vi igenom flödet mellan kök och vardagsrum...
```

**Detta är EXAKT det vi skulle fixa!**
- Aux fields generation har explicit instruktion: "INGA PLATSHÅLLARE"
- Validation ska ersätta platshållare med generisk text
- Men det fungerade INTE

**Kod som skulle fixa detta:**
```typescript
if (auxFields.showingInvitation && /\[(?:TID|DATUM|KONTAKT|ADRESS|MÄKLARE)\]/i.test(auxFields.showingInvitation)) {
  console.log("[Step 3:Aux Fields] ShowingInvitation contains placeholders, replacing with generic text");
  auxFields.showingInvitation = "Välkommen på visning. Kontakta ansvarig mäklare för tid och mer information.";
}
```

**Varför fungerade det inte:**
- Aux fields genererades INTE i Step 3 (logs visar "All aux fields already present, skipping generation")
- Platshållare kom från INITIAL generation
- Validation kördes aldrig eftersom aux fields redan fanns

#### B. SocialCopy är för lång
```
SOCIAL MEDIA:
Södersol på uteplatsen och skjutdörrar från köket gör att inne och ute hänger ihop från tidig vår till sena kvällar. Planlösningen samlar 5 rum på 146 kvm med kök och vardagsrum i vinkel, tre sovrum och två helkaklade badrum renoverade 2021. Köket renoverades 2023 med köksö, kompositbänk och integrerade Siemens-vitvaror. Läs mer i annonsen.
```

**Antal meningar:** 4 (max 3 tillåtet)

**Varför hände detta:**
- Aux fields genererades i initial generation
- Polishing kördes men räknade inte meningar korrekt
- Validation flaggade felet men kunde inte fixa det

---

### 🔴 PROBLEM 3: HUVUDTEXTEN HAR FLERA FEL

#### A. Trasig mening
```
"...och de två badrummen gör morgonrutinerna snabbare när alla ska iväg. 
Köket renoverades 2023..."

"...En extra wc i hallen tar hand om gäster och vardag utan I Mörtnäs ligger vardagen nära."
```

**"utan I Mörtnäs"** - Meningen är avhuggen/trasig!

Detta är ett **narrative integrity issue** som validation ska fånga.

#### B. Upprepning av "restauranger"
```
"...en spontan middag får plats mellan restauranger, restauranger och restauranger Asian Express."
```

**Detta är EXAKT det vi skulle fixa med restaurant name generalization!**

**Kod som skulle fixa detta:**
```typescript
// Automatic restaurant name generalization
text = text.replace(/\b(restaurang|café|pizzeria|sushi bar)\s+[A-ZÅÄÖ][a-zåäö]+/gi, 'restauranger');
```

**Varför fungerade det inte:**
- Generalization kördes troligen
- Men "restauranger, restauranger och restauranger" är resultatet av DÅLIG generalization
- Systemet ersatte "Restaurang X, Restaurang Y och Restaurang Z" med "restauranger, restauranger och restauranger"
- Borde ha ersatt med "restauranger och matställen" eller bara "restauranger"

#### C. Privat/iscensatt språk
```
"...så någon kan laga mat vid köksön samtidigt som läxläsning pågår vid matplatsen..."
"...lagom för att hinna svara på dagens sista mejl innan du kliver av..."
```

**Mäklarens feedback:**
> "Minska det privata/iscensatta ("läxläsning", "svara på dagens sista mejl") och håll det till konkreta möjligheter och funktion."

**Detta är legitimt mäklarspråk men för privat/specifikt.**

#### D. Upprepning av "kvällsbadet"
```
"...som tar kvällsbadet från "en gång ibland" till en del av vardagen."
"...och ett badkar som tar hand om kvällsbadet för de minsta."
```

**Mäklarens feedback:**
> "Säkerställ faktakonsistens och strama upp vissa formuleringar (t.ex. undvik att återanvända "kvällsbadet" flera gånger)"

#### E. Adressupprepning i öppning
```
"På Ekorrvägen 10, Mörtnäs, Värmdö sätter en södervänd uteplats med inbyggd jacuzzi tonen direkt. Villa om 146 kvm på Ekorrvägen 10, Mörtnäs, Värmdö med södervänd uteplats..."
```

**Mäklarens feedback:**
> "Rensa öppningen: ta bort upprepningen av adress/area och formulera en enda, stark förstameningen."

---

### 🔴 PROBLEM 4: PIPELINE FUNGERADE INTE SOM FÖRVÄNTAT

#### Logs Analysis:

```
[Step 3:primary] Candidate ready. Score 0.96, violations 2, words 309
[Step 3:alternative] Candidate ready. Score 0.99, violations 2, words 278
[Agent Decision:candidate-selection] selected alternative
```

**Bra:** Alternative vald (högre score 0.99)

```
[Step 3 Polish] Kept selected candidate. Reason: polish rejected due to quality regression. 
Score 0.99 vs 0.94, violations 4 vs 6
```

**Problem:** Polish REJECTED (score sjönk 0.99 → 0.94, violations ökade 2 → 6)

**Detta är BRA att polish rejected** - quality budgets fungerade!

```
[Step 5] Found 4 violations, attempting surgical correction...
[Step 5] Correction changed too much (33%), keeping original
```

**Problem:** Surgical correction REJECTED (ändrade 33%, för mycket)

**Detta är DÅLIGT** - surgical borde kunna ändra 33% om violations minskar!

**Vår optimization sa:**
> "Allow improvements that reduce violations OR add max 2 violations"

**Men surgical rejected ändå!** Detta betyder att vår optimization INTE tillämpades korrekt.

```
[Step 6] Fact-check corrections applied
```

**Bra:** Fact-check kördes och applicerades

```
[Agent Checkpoint] {stage: 'pre-audit', issueCount: 2, nextAction: 'surgical_repair'}
[Agent Checkpoint] {stage: 'broker-audit-gate', issueCount: 2, nextAction: 'surgical_repair'}
[Agent Checkpoint] {stage: 'final-audit-rescue-gate', issueCount: 5, nextAction: 'rescue_rewrite'}
```

**Problem:** Issue count ökade från 2 → 5 efter fact-check!

```
[Final Broker Audit Rescue] Rescue rewrite rejected: rescue rewrite produced a publishable text
```

**Förvirrande:** Rescue rewrite rejected trots att den producerade publishable text?

```
[Broker Realism Gate:Pre] { overall: 91, grade: 'A' }
```

**Bra:** Grade A quality (91/100)

```
[Final Gate Repair] Found 2 aux field violations, attempting repair...
[Final Gate Repair] Re-polished headline
[Final Gate Repair] Re-polished socialCopy
[Final Gate Repair] Re-polished instagramCaption
[Final Gate Repair] Re-polished showingInvitation
[Final Gate Repair] Re-polished shortAd
```

**Problem:** Final Gate försökte repaira aux fields men FAILADE

```
Error: [Final Gate] Kvarvarande kvalitetsfel i extratexter: 
[socialCopy] socialCopy är för lång; håll till max 3 meningar. 
[showingInvitation] showingInvitation innehåller oupplösta platshållare ([TID]/[KONTAKT]).
```

**CRITICAL:** Final Gate blockerade leverans pga aux field violations

**Detta är MOTSATSEN till vad vi ville!**

Vår optimization sa:
> "≤2 violations = WARN och leverera"

Men Final Gate blockerade ändå och aktiverade fail-safe mode!

---

### 🔴 PROBLEM 5: PERFORMANCE

```
{"timestamp":"2026-03-19T17:58:23.942Z","level":"warn","message":"Run exceeded duration threshold","service":"listing-pipeline","runId":"f6075880-07c4-4e04-a558-9b48aec53009","durationMs":185669,"threshold":30000}
```

**Tid:** 185 sekunder (3 minuter 5 sekunder)  
**Threshold:** 30 sekunder  
**Överskridning:** 6.2x över threshold

**Detta är MYCKET LÅNGSAMMARE än förväntat!**

Vår optimization sa:
> "After: 60-80 seconds"

Men vi fick 185 sekunder!

---

## ROOT CAUSE ANALYSIS

### Varför fungerade inte optimeringarna?

#### 1. Final Gate Logic Fel
**Problem:** Final Gate blockerar på aux field violations trots att vi sa "≤2 violations = deliver"

**Root Cause:** Final Gate har SEPARAT validation för aux fields som inte följer samma logic som main text

**Kod att undersöka:**
```typescript
// finalizeFinalMainValidation() i listing-final-audit-subflow.ts
// Troligen har den separat logic för aux fields som inte uppdaterades
```

#### 2. Surgical Correction Logic Fel
**Problem:** Surgical rejected trots 33% change när violations skulle minska

**Root Cause:** `applyStageQualityBudget()` har fortfarande för strikt logic för surgical

**Vår optimization:**
```typescript
// === BLOCKING REASON 3: Introduced >2 new violations (CRITICAL) ===
if (violationDelta > 2) {
  blockingReasons.push(`förslag introducerade ${violationDelta} nya kvalitetsfel (max 2 tillåtet)`);
}
```

**Men logs visar:**
```
[Step 5] Correction changed too much (33%), keeping original
```

**Detta betyder att det finns ANNAN logic som blockerar surgical baserat på changeRatio!**

**Kod att undersöka:**
```typescript
// Troligen finns det logic i coordinateSurgicalAcceptance() eller liknande
// som blockerar baserat på changeRatio oavsett violations
```

#### 3. Aux Fields Validation Fel
**Problem:** Platshållare i showingInvitation ersattes inte

**Root Cause:** Aux fields genererades i INITIAL generation, inte i Step 3

**Logs visar:**
```
[Step 3:Aux Fields] All aux fields already present, skipping generation.
```

**Detta betyder:**
- Aux fields kom från initial generation (Step 3:primary eller Step 3:alternative)
- Validation för platshållare kördes INTE eftersom aux fields redan fanns
- Polishing kördes men fixade inte platshållare

**Kod att undersöka:**
```typescript
// Initial generation inkluderar aux fields i JSON response
// Men validation för platshållare körs bara om aux fields genereras i Step 3
// Detta är en LOGIC BUG
```

#### 4. Restaurant Generalization Fel
**Problem:** "restauranger, restauranger och restauranger" istället för "restauranger"

**Root Cause:** Generalization ersätter varje restaurangnamn individuellt

**Exempel:**
```
Input: "Restaurang A, Restaurang B och Restaurang C"
After generalization: "restauranger, restauranger och restauranger"
Should be: "restauranger"
```

**Kod att fixa:**
```typescript
// Efter generalization, deduplicate:
text = text.replace(/\b(restauranger|caféer|matställen)(?:\s*,\s*\1)+(?:\s+och\s+\1)?/gi, '$1');
```

#### 5. Narrative Integrity Validation Fel
**Problem:** "utan I Mörtnäs" inte fångad av validation

**Root Cause:** Validation pattern matchar inte detta specifika fall

**Nuvarande pattern:**
```typescript
[/\b(börja|fortsätta|avsluta|skapa|leva|njuta|använda|samla)\s+[A-ZÅÄÖ][a-zåäö]+(?:en|et|ar|or)?\s+(?:är|har|ger|blir|finns)\b/g, 'Avhuggen eller felaktigt sammanfogad mening']
```

**Borde också matcha:**
```typescript
[/\b(utan|med|för|till)\s+[A-ZÅÄÖ][a-zåäö]+\s+[a-zåäö]+\b/g, 'Saknad punkt eller felaktig meningsövergång']
```

---

## KVALITETSANALYS AV TEXTEN

### Huvudtext: 6/10 (Underkänd för publicering)

**Positiva aspekter:**
- ✅ Konkret öppning med jacuzzi som USP
- ✅ Bra flödesbeskrivning av planlösning
- ✅ Konkreta renoveringsår (2023, 2021)
- ✅ Specifika material (ekparkett, komposit, Siemens)
- ✅ Naturligt mäklarspråk (mestadels)

**Negativa aspekter:**
- ❌ Trasig mening ("utan I Mörtnäs")
- ❌ Upprepning av "restauranger, restauranger och restauranger"
- ❌ För privat språk ("läxläsning", "dagens sista mejl")
- ❌ Upprepning av "kvällsbadet"
- ❌ Adressupprepning i öppning
- ❌ Ofärdigt lägesstycke

**Mäklarens bedömning: KORREKT**
Alla punkter i "Mäklarens förbättringsfokus" är legitima och viktiga.

### Aux Fields: 4/10 (Underkända)

**Headline:** 8/10
```
Södervänd uteplats med inbyggd jacuzzi
```
- ✅ Stark, konkret
- ✅ Ingen punkt
- ✅ Max 9 ord (6 ord)
- ⚠️ Kunde nämna storlek eller rum

**SocialCopy:** 3/10
```
Skjutdörrarna står öppna mot en södervänd uteplats, och jacuzzin är redan uppvärmd för kvällens sista timme ☀️🛁. Villa om 146 kvm i Mörtnäs med kök renoverat 2023 och två helkaklade badrum renoverade 2021.
```
- ❌ För iscensatt ("jacuzzin är redan uppvärmd för kvällens sista timme")
- ✅ Konkreta fakta
- ✅ Emojis
- ⚠️ 2 meningar (OK)

**VisningsInbjudan:** 2/10
```
Visning [TID]. Föranmälan och information sker via [KONTAKT]. På plats går vi igenom flödet mellan kök och vardagsrum, hur de tre sovrummen ligger i planlösningen och hur söderläget märks på uteplatsen från eftermiddag till kväll.
```
- ❌ PLATSHÅLLARE [TID] och [KONTAKT] - OACCEPTABELT
- ✅ Nämner "visning"
- ✅ Konkret beskrivning av vad som visas

**KortAnnons:** 7/10
```
Villa om 146 kvm på Ekorrvägen 10 med södervänd uteplats och inbyggd jacuzzi. Öppen planlösning mellan kök renoverat 2023 och vardagsrum samt två helkaklade badrum renoverade 2021.
```
- ✅ Konkret
- ✅ Max 32 ord (31 ord)
- ✅ 2 meningar
- ⚠️ Kunde vara mer säljande

**Social Media:** 5/10
```
Södersol på uteplatsen och skjutdörrar från köket gör att inne och ute hänger ihop från tidig vår till sena kvällar. Planlösningen samlar 5 rum på 146 kvm med kök och vardagsrum i vinkel, tre sovrum och två helkaklade badrum renoverade 2021. Köket renoverades 2023 med köksö, kompositbänk och integrerade Siemens-vitvaror. Läs mer i annonsen.
```
- ❌ För lång (4 meningar, max 3)
- ✅ Konkreta fakta
- ✅ Avslutning med "Läs mer i annonsen"
- ⚠️ Ingen emoji

---

## JÄMFÖRELSE MED FÖRVÄNTNINGAR

### Förväntningar från optimizations:
- ✅ Quality maintained or improved
- ❌ Performance improved 40% (FAIL: 185s vs 60-80s förväntat)
- ❌ Success rate improved 35% (FAIL: fail-safe mode aktiverad)
- ⚠️ Legitimate broker language allowed (PARTIAL: fungerade men andra problem uppstod)

### Vad fungerade:
- ✅ Forbidden phrases (inga "inom räckhåll" etc. i texten)
- ✅ Polish rejection (quality budgets fungerade för polish)
- ⚠️ Fact-check (kördes men introducerade fler violations)

### Vad fungerade INTE:
- ❌ Final Gate (blockerade på aux field violations)
- ❌ Surgical correction (rejected trots att den borde accepteras)
- ❌ Aux fields validation (platshållare inte ersatta)
- ❌ Restaurant generalization (dålig implementation)
- ❌ Narrative integrity validation (trasig mening inte fångad)
- ❌ Performance (185s vs 60-80s förväntat)

---

## KRITISKA BUGGAR ATT FIXA

### 🔴 BUG 1: Final Gate blockerar på aux field violations
**Severity:** CRITICAL  
**Impact:** Fail-safe mode aktiveras trots Grade A text

**Fix:**
```typescript
// I finalizeFinalMainValidation():
// Tillåt ≤2 aux field violations med varning
if (auxFieldViolations.length <= 2 && mainTextViolations.length <= 2) {
  return { pass: true, warnings: [...auxFieldViolations, ...mainTextViolations] };
}
```

### 🔴 BUG 2: Aux fields validation körs inte för initial generation
**Severity:** CRITICAL  
**Impact:** Platshållare når användaren

**Fix:**
```typescript
// Efter initial generation, ALLTID validera och fixa aux fields:
if (result.showingInvitation && /\[(?:TID|DATUM|KONTAKT|ADRESS|MÄKLARE)\]/i.test(result.showingInvitation)) {
  result.showingInvitation = "Välkommen på visning. Kontakta ansvarig mäklare för tid och mer information.";
}
```

### 🔴 BUG 3: Surgical correction har dold changeRatio check
**Severity:** HIGH  
**Impact:** Surgical kan inte fixa texter

**Fix:**
```typescript
// I coordinateSurgicalAcceptance() eller liknande:
// Ta bort eller höj changeRatio threshold från 0.33 till 0.65
// Eller: tillåt hög changeRatio om violations minskar
if (changeRatio > 0.65 && violationDelta >= 0) {
  reject();
}
```

### 🔴 BUG 4: Restaurant generalization skapar upprepningar
**Severity:** MEDIUM  
**Impact:** Dålig text kvalitet

**Fix:**
```typescript
// Efter generalization, deduplicate:
text = text.replace(/\b(restauranger|caféer|matställen)(?:\s*,\s*\1)+(?:\s+och\s+\1)?/gi, '$1');
```

### 🔴 BUG 5: Narrative integrity validation missar vissa patterns
**Severity:** MEDIUM  
**Impact:** Trasiga meningar når användaren

**Fix:**
```typescript
// Lägg till pattern för "utan/med/för/till + Stor bokstav":
[/\b(utan|med|för|till)\s+[A-ZÅÄÖ][a-zåäö]+\s+[a-zåäö]+\b/g, 'Saknad punkt eller felaktig meningsövergång']
```

---

## SLUTSATS

### OPTIMERINGARNA FUNGERADE INTE SOM FÖRVÄNTAT

**Vad som fungerade:**
- ✅ Forbidden phrases reduction (74 phrases)
- ✅ Quality budgets för polish (rejected correctly)

**Vad som INTE fungerade:**
- ❌ Final Gate (blockerade på aux fields)
- ❌ Surgical correction (rejected felaktigt)
- ❌ Aux fields validation (platshållare inte fixade)
- ❌ Restaurant generalization (dålig implementation)
- ❌ Performance (185s vs 60-80s)

**Kvalitet:**
- ❌ Huvudtext: 6/10 (flera fel)
- ❌ Aux fields: 4/10 (platshållare, för lång)
- ❌ Fail-safe mode aktiverad

**Rekommendation:**
1. 🔴 FIXA BUG 1-5 OMEDELBART
2. 🔴 TESTA IGEN med samma input
3. 🔴 VERIFIERA att fail-safe mode INTE aktiveras
4. 🔴 VERIFIERA att texten är 8+/10 kvalitet
5. 🔴 VERIFIERA att tid är <90 sekunder

**Status: INTE PRODUCTION READY**
