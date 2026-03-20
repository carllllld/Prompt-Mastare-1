# FINAL IMPLEMENTATION PLAN - DEN RÄTTA LÖSNINGEN

## EXECUTIVE SUMMARY

**Backend**: 3 steg, 20-25s, 95%+ kvalitet (inklusive AI-analys)
**Frontend**: Kraftfulla editing-verktyg med AI-assistans
**Fokus**: Perfekt svenska, inga stavfel, expertanalys från AI-mäklare

---

## PIPELINE: 3 STEG

```
┌──────────────────────────────────────────────────────────────┐
│ STEG 1: SMART GENERATION (1 AI call, 15-18s)                │
├──────────────────────────────────────────────────────────────┤
│ Model: GPT-5.2 reasoning: medium                             │
│ Focus: PERFEKT svenska, inga stavfel, naturligt mäklarspråk │
│                                                               │
│ Prompt Strategy:                                             │
│ - "Du är en erfaren svensk mäklare med 15 års erfarenhet"   │
│ - Konkreta exempel på rätt/fel                               │
│ - Steg-för-steg process (analysera → planera → skriv)       │
│ - Självkontroll (stavning, grammatik, upprepningar)         │
│ - KRITISKT: "Dubbelkolla VARJE ord för stavfel"             │
│                                                               │
│ Output: 90-95% perfekt text (bra svenska, inga stavfel)     │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ STEG 2: DETERMINISTIC POST-PROCESSING (<1s)                 │
├──────────────────────────────────────────────────────────────┤
│ 100% pålitliga fixes:                                        │
│                                                               │
│ 1. Remove ALL placeholders                                   │
│    [TID], [KONTAKT], [MÄKLARE] → ta bort helt              │
│                                                               │
│ 2. Generalize + deduplicate                                  │
│    "Restaurang X, Restaurang Y" → "restauranger"            │
│    "restauranger, restauranger" → "restauranger"            │
│                                                               │
│ 3. Fix common punctuation (safe patterns only)              │
│    "beroende Köket" → "beroende. Köket"                     │
│                                                               │
│ 4. Enforce hard constraints                                  │
│    headline ends with "." → remove                           │
│    socialCopy > 3 sentences → truncate                       │
│                                                               │
│ 5. Clean top 20 forbidden phrases                            │
│    "erbjuder" → "har"                                        │
│    "välkommen till" → ""                                     │
│                                                               │
│ Output: 95%+ perfekt text                                    │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ STEG 3: EXPERT AI ANALYSIS (1 AI call, 5-7s)                │
├──────────────────────────────────────────────────────────────┤
│ Model: GPT-5.2 reasoning: low (snabbare, billigare)         │
│ Role: "Senior svensk mäklare + jurist med 20 års erfarenhet"│
│                                                               │
│ Analyserar:                                                   │
│ 1. Mäklarprosa-kvalitet                                      │
│    - Är språket naturligt och professionellt?               │
│    - Finns AI-klyschor eller onaturliga formuleringar?      │
│    - Är tonen rätt för målgruppen?                          │
│                                                               │
│ 2. Juridisk korrekthet                                       │
│    - Finns vilseledande påståenden?                         │
│    - Är fakta presenterade korrekt?                         │
│    - Följer texten mäklarregler?                            │
│                                                               │
│ 3. Konkreta förbättringsförslag                             │
│    - Vad är BRA? (positiv feedback)                         │
│    - Vad kan FÖRBÄTTRAS? (konstruktiv kritik)              │
│    - Hur fixar man det? (konkreta förslag)                 │
│                                                               │
│ Output Format:                                               │
│ {                                                            │
│   "overallQuality": 9.2,                                    │
│   "strengths": [                                            │
│     "Stark öppning med konkret USP",                        │
│     "Naturligt mäklarspråk utan AI-klyschor",              │
│     "Bra balans mellan fakta och säljande ton"             │
│   ],                                                         │
│   "improvements": [                                          │
│     {                                                        │
│       "issue": "Adress upprepas i öppning",                │
│       "location": "Stycke 1, mening 2",                    │
│       "suggestion": "Ta bort 'på Ekorrvägen 10...' från    │
│                      andra meningen",                       │
│       "severity": "minor"                                   │
│     },                                                       │
│     {                                                        │
│       "issue": "'kvällsbad' upprepas två gånger",         │
│       "location": "Stycke 2 och 3",                        │
│       "suggestion": "Variera språket, t.ex. 'bad på        │
│                      kvällen' eller 'avkopplande bad'",    │
│       "severity": "minor"                                   │
│     }                                                        │
│   ],                                                         │
│   "legalCheck": {                                           │
│     "compliant": true,                                      │
│     "notes": "Inga juridiska problem identifierade"        │
│   }                                                          │
│ }                                                            │
│                                                               │
│ Output: Expertanalys + konkreta, klickbara förslag          │
└──────────────────────────────────────────────────────────────┘
```

**Total tid: 20-25s**
**Kvalitet: 95%+ (perfekt svenska, expertanalys)**

---

## STEG 1: PERFEKT SVENSKA - PROMPT STRATEGY

### System Prompt (Fokus på Perfekt Svenska):

```markdown
Du är en erfaren svensk mäklare med 15 års erfarenhet av att skriva 
bostadsannonser. Du är EXTREMT noggrann med svensk grammatik och stavning.

## DIN PROCESS

### STEG 1: ANALYSERA
Innan du skriver, analysera dispositionen:
1. Vad är mest unikt? (USP)
2. Vilka fakta är viktigast?
3. Vilka detaljer kan jag vara konkret om?

### STEG 2: PLANERA
Bestäm struktur:
1. Öppning: Vilket USP lyfter jag?
2. Mittparti: Vilka rum beskriver jag?
3. Läge: Vilken service är relevant?
4. Avslut: Vilken praktisk info?

### STEG 3: SKRIV MED PERFEKT SVENSKA

#### KRITISKA REGLER FÖR SVENSKA:

1. STAVNING (VIKTIGAST!)
   - Dubbelkolla VARJE ord
   - Särskilt sammansatta ord: "köksö" (inte "kökö")
   - Särskilt ortnamn: "Mörtnäs" (inte "Mörtnäss")
   - Särskilt material: "kompositbänk" (inte "komposit bänk")

2. GRAMMATIK
   - Korrekt tempus: "renoverades 2023" (inte "renoverat 2023")
   - Korrekt genus: "köket" (inte "köken")
   - Korrekt plural: "badrum" → "badrum" (inte "badrummen")

3. INTERPUNKTION
   - Punkt mellan meningar (inte komma)
   - Inga punkt i headline
   - Komma före "och" bara vid uppräkning av 3+

4. NATURLIGT SPRÅK
   - Använd AKTIVA verb: "har", "ger", "samlar"
   - Undvik PASSIVA: "erbjuder", "bjuder på"
   - Undvik AI-KLYSCHOR: "välkommen till", "perfekt för"

### STEG 4: SJÄLVKONTROLL (KRITISKT!)

Innan du är klar, kontrollera:
1. ✓ Har jag stavat ALLA ord rätt?
2. ✓ Är grammatiken korrekt?
3. ✓ Är interpunktionen korrekt?
4. ✓ Låter det naturligt på svenska?
5. ✓ Har jag undvikit upprepningar?
6. ✓ Har jag undvikit AI-klyschor?

## EXEMPEL PÅ PERFEKT SVENSKA

✓ RÄTT:
"Köket renoverades 2023 med köksö, kompositbänk och integrerade 
Siemens-vitvaror. Planlösningen samlar kök och vardagsrum i vinkel, 
med skjutdörrar ut mot den söderv

ända uteplatsen."

✗ FEL:
"Köket renoverat 2023 med kökö, komposit bänk och integrerade 
Siemens vitvaror. Planlösningen erbjuder kök och vardagsrum i vinkel, 
med skjutdörrar ut mot den södervänd uteplatsen."

Fel:
- "renoverat" → ska vara "renoverades"
- "kökö" → ska vara "köksö"
- "komposit bänk" → ska vara "kompositbänk"
- "Siemens vitvaror" → ska vara "Siemens-vitvaror"
- "erbjuder" → ska vara "samlar" eller "har"
- "södervänd" → ska vara "södervända" (bestämd form)
```

---

## STEG 3: EXPERT AI ANALYSIS - PROMPT

### System Prompt (Mäklare + Jurist):

```markdown
Du är en senior svensk mäklare OCH jurist med 20 års erfarenhet. 
Din uppgift är att analysera mäklartexter och ge konstruktiv, 
professionell feedback.

## DIN EXPERTIS

1. MÄKLARPROSA
   - Du känner igen naturligt vs AI-genererat språk
   - Du vet vad som säljer vs vad som är generiskt
   - Du förstår målgrupper och tonalitet

2. JURIDIK
   - Du känner till mäklarregler och konsumentskydd
   - Du identifierar vilseledande påståenden
   - Du säkerställer faktakorrekthet

3. PEDAGOGIK
   - Du ger KONKRETA förslag (inte vaga)
   - Du förklarar VARFÖR något är bra/dåligt
   - Du är KONSTRUKTIV (inte bara kritisk)

## DIN ANALYSPROCESS

### STEG 1: LÄS TEXTEN
Läs hela texten noggrant. Notera:
- Vad är BRA?
- Vad kan FÖRBÄTTRAS?
- Finns JURIDISKA problem?

### STEG 2: IDENTIFIERA STYRKOR
Lista 3-5 konkreta styrkor:
✓ "Stark öppning med konkret USP (jacuzzi)"
✓ "Naturligt mäklarspråk utan AI-klyschor"
✓ "Bra balans mellan fakta och säljande ton"

### STEG 3: IDENTIFIERA FÖRBÄTTRINGSOMRÅDEN
För varje problem, ge:
- VAD är problemet?
- VAR finns det? (exakt plats)
- HUR fixar man det? (konkret förslag)
- Hur ALLVARLIGT är det? (critical/major/minor)

### STEG 4: JURIDISK KONTROLL
Kontrollera:
- Finns vilseledande påståenden?
- Är fakta korrekt presenterade?
- Följer texten mäklarregler?

## OUTPUT FORMAT

Svara ENDAST med JSON:
{
  "overallQuality": 9.2,
  "strengths": [
    "Konkret styrka 1",
    "Konkret styrka 2",
    "Konkret styrka 3"
  ],
  "improvements": [
    {
      "issue": "Konkret problem",
      "location": "Exakt var (stycke, mening)",
      "suggestion": "Konkret förslag hur man fixar",
      "severity": "minor|major|critical"
    }
  ],
  "legalCheck": {
    "compliant": true,
    "notes": "Eventuella juridiska noteringar"
  }
}

## EXEMPEL

Input text:
"Välkommen till denna fantastiska villa som erbjuder generösa ytor..."

Output:
{
  "overallQuality": 6.5,
  "strengths": [
    "Tydlig struktur med logiskt flöde"
  ],
  "improvements": [
    {
      "issue": "AI-klyschor i öppning",
      "location": "Första meningen",
      "suggestion": "Ta bort 'Välkommen till' och 'fantastiska'. 
                     Börja direkt med konkret USP, t.ex. 
                     'En södervänd uteplats med inbyggd jacuzzi...'",
      "severity": "major"
    },
    {
      "issue": "Vagt språk",
      "location": "Första meningen",
      "suggestion": "Ersätt 'erbjuder generösa ytor' med konkreta 
                     mått, t.ex. 'Villa om 146 kvm'",
      "severity": "major"
    }
  ],
  "legalCheck": {
    "compliant": true,
    "notes": "Inga juridiska problem, men undvik överdrifter"
  }
}
```

---

## FRONTEND: KRAFTFULLA EDITING-VERKTYG

### 1. Inline Highlights med Expert Tooltips

```tsx
// Text visas med highlights baserat på AI-analys

"...en spontan middag får plats mellan [restauranger]..."
                                        ↑ gul highlight

Hover → Tooltip:
┌─────────────────────────────────────────────┐
│ 💡 FÖRBÄTTRING (Minor)                      │
├─────────────────────────────────────────────┤
│ Generaliserat från specifika restaurangnamn │
│                                              │
│ Förslag: Detta är bra! Generalisering       │
│ undviker att texten blir daterad.           │
│                                              │
│ [Se original] [Acceptera]                   │
└─────────────────────────────────────────────┘
```

### 2. Expert Feedback Panel

```tsx
┌──────────────────────────────────────────────────┐
│ 🎯 EXPERTANALYS (9.2/10)                         │
├──────────────────────────────────────────────────┤
│ ✅ STYRKOR                                       │
│ • Stark öppning med konkret USP                  │
│ • Naturligt mäklarspråk utan AI-klyschor        │
│ • Bra balans mellan fakta och säljande ton      │
│                                                   │
│ 💡 FÖRBÄTTRINGSFÖRSLAG                           │
│                                                   │
│ ⚠️ Minor: Adress upprepas i öppning             │
│    Plats: Stycke 1, mening 2                    │
│    Förslag: Ta bort "på Ekorrvägen 10..." från  │
│             andra meningen                       │
│    [Visa i text] [Fixa automatiskt] [Ignorera] │
│                                                   │
│ ⚠️ Minor: "kvällsbad" upprepas två gånger      │
│    Plats: Stycke 2 och 3                        │
│    Förslag: Variera språket, t.ex. "bad på      │
│             kvällen" eller "avkopplande bad"    │
│    [Visa i text] [Ge AI-förslag] [Ignorera]    │
│                                                   │
│ ✅ JURIDISK KONTROLL                             │
│ Inga juridiska problem identifierade             │
└──────────────────────────────────────────────────┘
```

### 3. One-Click AI Fixes

```tsx
// För varje förbättringsförslag:

[Fixa automatiskt] → 
  - Skickar text + förslag till AI
  - AI gör minimal ändring
  - Visar diff för godkännande

[Ge AI-förslag] →
  - AI genererar 2-3 alternativ
  - Mäklaren väljer eller skriver egen

[Visa i text] →
  - Scrollar till och highlightar problemet
  - Mäklaren kan redigera manuellt
```

### 4. AI-Assisted Selection Edit (Förbättrad)

```tsx
// Mäklaren markerar text:
"...beroende Köket renoverades..."

Högerklick → Meny:
┌────────────────────────────┐
│ ✨ Förbättra med AI        │
│ 🔧 Fixa grammatik          │
│ 📝 Omformulera             │
│ ✂️  Förkorta               │
│ ➕ Utöka                   │
└────────────────────────────┘

Välj "Fixa grammatik" →
AI föreslår: "...beroende. Köket renoverades..."

[Acceptera] [Visa alternativ] [Avbryt]
```

---

## IMPLEMENTATION TIMELINE

### Week 1: Backend Core
**Dag 1-2**: Förbättra Steg 1 prompt
- Fokus på perfekt svenska
- Konkreta exempel
- Självkontroll för stavning

**Dag 3**: Implementera Steg 3 (Expert AI Analysis)
- Ny prompt för mäklare+jurist-analys
- JSON output med strukturerad feedback

**Dag 4-5**: Integration + Testing
- Integrera nya steg i pipeline
- Testa på 20 olika dispositioner
- Verifiera: inga stavfel, bra analys

### Week 2: Frontend Enhancement
**Dag 6-7**: Inline Highlights
- Visa förbättringsförslag i texten
- Tooltips med expert-feedback

**Dag 8-9**: Expert Feedback Panel
- Visa styrkor + förbättringar
- Klickbara förslag med actions

**Dag 10**: One-Click Fixes
- Implementera "Fixa automatiskt"
- Implementera "Ge AI-förslag"

### Week 3: Polish + Test
**Dag 11-13**: User Testing
- Testa med riktiga mäklare
- Samla feedback
- Iterera på UX

**Dag 14-15**: Optimization
- Förbättra prompts baserat på feedback
- Optimera performance
- Fixa buggar

### Week 4: Deploy
**Dag 16-18**: Staging Deploy
- Deploy till staging
- Final testing
- Performance monitoring

**Dag 19-20**: Production Deploy
- Gradual rollout (10% → 50% → 100%)
- Monitor metrics
- Samla user feedback

---

## SUCCESS METRICS

### Quality (Viktigast):
- ✅ ZERO stavfel (100% korrekt svenska)
- ✅ 95%+ grammatiskt korrekt
- ✅ 90%+ naturligt mäklarspråk
- ✅ Expert-analys quality score >9.0

### Performance:
- ✅ Total tid <25s (generation + analys)
- ✅ Mäklare kan göra perfekt på <3 min

### User Satisfaction:
- ✅ 90%+ nöjda med initial kvalitet
- ✅ 85%+ använder expert-feedback
- ✅ 80%+ accepterar med minor edits
- ✅ <15% regenererar

---

## SLUTSATS

**Detta är den rätta lösningen eftersom:**

1. ✅ **Perfekt svenska** - Fokus på stavning och grammatik från start
2. ✅ **Expert-analys** - AI-mäklare+jurist ger professionell feedback
3. ✅ **Snabbt** - 20-25s total tid
4. ✅ **Bra kvalitet** - 95%+ från start
5. ✅ **Lätt att förbättra** - Konkreta, klickbara förslag
6. ✅ **Mäklaren lär sig** - Ser vad som är bra/dåligt
7. ✅ **Pålitligt** - 95%+ success rate

Ska jag börja implementera detta nu? Jag börjar med att förbättra Steg 1-prompten med fokus på perfekt svenska.

