# PIPELINE OPTIMIZATION PLAN - DE BÄSTA LÖSNINGARNA

## ANALYS: VARFÖR SYSTEMET FAILAR

### Problem 1: För Många Förbjudna Fraser (195 st)
**Rotorsak**: Systemet blockerar LEGITIMT mäklarspråk som "inom räckhåll", "kommunikationer", "närhet till service"
**Effekt**: Surgical corrections kan inte fixa texter eftersom "fixes" också blockeras
**Bevis**: Din text failade på "inom räckhåll" som är NORMALT mäklarspråk

### Problem 2: För Många Valideringslager
**Rotorsak**: 7 steg med quality budgets som blockerar varandra
**Effekt**: Polish rejected → Surgical rejected → Fact-check krasch → Final gate fail
**Bevis**: Alla 4 repair attempts rejected trots förbättringar

### Problem 3: För Långsamt (169s vs 30s threshold)
**Rotorsak**: Sekventiella AI-calls, för mycket validering mellan steg
**Effekt**: Mäklare tappar tålamod
**Bevis**: 5.6x över threshold

## DE BÄSTA LÖSNINGARNA

### FIX 1: RENSA FÖRBJUDNA FRASER (195 → 75) ⭐⭐⭐⭐⭐
**Vad**: Ta bort 120 fraser som är legitimt mäklarspråk
**Varför**: Systemet blockerar bra texter
**Hur**: Behåll bara RIKTIGA AI-clichés som "välkommen till", "erbjuder", "drömboende"

**FRASER ATT TA BORT (120 st):**
- Alla "-möjligheter" suffix (12 st) - legitimt mäklarspråk
- "inom räckhåll" - normalt avståndsspråk
- "kommunikationer" - standard mäklarterm
- "närhet till service" - standard mäklarterm
- "smidig pendling" - standard mäklarterm
- "vardagslogistik" - kreativt men legitimt
- "genomtänkt planlösning" - legitimt
- "ljus och luftig" - legitimt
- "hög standard" - legitimt
- "attraktivt läge" - legitimt
- Alla compound adjektiv-par som är legitima (8 st)
- Alla "gör det enkelt/möjligt" - legitima konstruktioner
- Alla passiva konstruktioner som är legitima
- Alla plats-beskrivningar som är legitima

**FRASER ATT BEHÅLLA (75 st):**
- "välkommen till" - RIKTIG AI-cliché
- "erbjuder/erbjuds" - AI-favorit (mäklare säger "har")
- "drömboende/drömhem" - RIKTIG AI-cliché
- "i hjärtat av" - poetisk AI
- "för den som" - AI-signatur
- "missa inte" - RIKTIG AI-cliché
- "unik chans" - RIKTIG AI-cliché
- Alla emotionella AI-verb
- Alla abstrakt AI-känslosspråk
- Alla hjärta-klyschor
- Alla överdrivna adjektiv

### FIX 2: FÖRENKLA QUALITY BUDGETS ⭐⭐⭐⭐⭐
**Vad**: Minska blocking reasons från 8 → 3
**Varför**: För många checks blockerar förbättringar
**Hur**: Behåll bara kritiska checks

**NUVARANDE (8 blocking reasons):**
1. Korrupta artefakter
2. Tappade styckesindelning
3. Kortade för mycket nära minimum
4. Surgical skrev om för stor del
5. Surgical introducerade nya fel
6. Polish försämrade kvalitet
7. Polish skrev om för mycket
8. Expansion ökade inte längd

**OPTIMAL (3 blocking reasons):**
1. Korrupta artefakter (kritiskt)
2. Tappade styckesindelning (kritiskt)
3. Introducerade >2 nya violations (kritiskt)

**TA BORT:**
- "Kortade för mycket" - TILLÅT om violations minskar
- "Skrev om för stor del" - TILLÅT om kvalitet förbättras
- "Försämrade kvalitet" - TILLÅT om violations minskar
- "Expansion ökade inte längd" - irrelevant för kvalitet

### FIX 3: ACCEPTERA "GOOD ENOUGH" ⭐⭐⭐⭐⭐
**Vad**: Grade A med ≤2 violations = leverera
**Varför**: Perfekt är fiendens bästa
**Hur**: Final Gate accepterar texter med minor violations

**NUVARANDE:**
- ANY serious violation = FAIL
- Fail-safe mode används

**OPTIMAL:**
- ≤2 violations = WARN och leverera
- >2 violations = försök repair
- Repair misslyckas = leverera med varning ändå om Grade A

### FIX 4: PARALLELLISERA AUX FIELDS ⭐⭐⭐⭐
**Vad**: Generera alla aux fields samtidigt
**Varför**: Sparar 20-30 sekunder
**Hur**: Promise.all() istället för sekventiella calls

**NUVARANDE:**
```typescript
headline = await generate()
social = await generate()
instagram = await generate()
// 3 sekventiella calls = 15-30s
```

**OPTIMAL:**
```typescript
[headline, social, instagram] = await Promise.all([
  generate(),
  generate(),
  generate()
])
// 1 parallell batch = 5-10s
```

### FIX 5: FÖRENKLA PIPELINE (7 → 5 STEG) ⭐⭐⭐⭐
**Vad**: Ta bort redundanta steg
**Varför**: Snabbare och färre failure points
**Hur**: Merge polish + surgical, skip fact-check om Grade A

**NUVARANDE (7 steg):**
1. Generation (primary + alternative)
2. Candidate selection
3. Polish
4. Surgical correction
5. Fact-check
6. Broker audit
7. Final gate

**OPTIMAL (5 steg):**
1. Generation (primary + alternative)
2. Candidate selection
3. **Unified repair** (polish + surgical i ett steg)
4. Broker audit (skip fact-check om Grade A)
5. Final gate (acceptera ≤2 violations)

## FÖRVÄNTAD EFFEKT

### Hastighet
- **Före**: 169 sekunder
- **Efter**: 40-50 sekunder
- **Förbättring**: 70% snabbare

### Success Rate
- **Före**: ~60% (många fail-safe)
- **Efter**: ~95% (sällan fail-safe)
- **Förbättring**: 35% fler lyckade leveranser

### Kvalitet
- **Före**: 9/10 när det fungerar
- **Efter**: 8.5/10 konsekvent
- **Förbättring**: Mer konsekvent, lite lägre peak

### Underhåll
- **Före**: 195 regler, 8 quality checks, 7 steg
- **Efter**: 75 regler, 3 quality checks, 5 steg
- **Förbättring**: 60% enklare att underhålla

## IMPLEMENTATION ORDER

1. ✅ FIX 1: Rensa förbjudna fraser (DONE: tog bort "inom räckhåll")
2. ✅ FIX 2: Förenkla quality budgets (DONE: tillåt kortning om violations minskar)
3. ✅ FIX 3: Acceptera "good enough" (DONE: ≤2 violations = warn)
4. ✅ FIX 1 COMPLETE: Ta bort alla 120 legitimt mäklarspråk-fraser (DONE: 195 → 74 phrases)
5. ✅ FIX 2 COMPLETE: Minska till 3 blocking reasons (DONE: 8 → 3 critical checks)
6. ✅ FIX 4: Parallellisera aux fields (DONE: Already optimal - single API call!)
7. ⏳ FIX 5: Förenkla pipeline till 5 steg (DEFERRED: High risk, needs separate PR)

## DETTA ÄR DE BÄSTA LÖSNINGARNA EFTERSOM:

1. **Adresserar rotorsaker** - Inte symptom
2. **Evidensbaserade** - Baserat på verklig failure data
3. **Balanserade** - Behåller kvalitet men ökar success rate
4. **Underhållbara** - Enklare system = färre buggar
5. **Mätbara** - Tydliga metrics för förbättring
