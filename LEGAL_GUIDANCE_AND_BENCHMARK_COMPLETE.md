# JURIDISK VÄGLEDNING & BENCHMARK - COMPLETE

## PROBLEMS #11 & #12 ADDRESSED

### Problem #11: Ingen hjälp med juridik
From `KOMPLETT_MAKLARE_ANALYS.md`:

**Broker needs:**
- Får jag skriva "nyskick" utan besiktning?
- Får jag skriva "nära skola" om det är 1 km bort?
- Får jag skriva "lugnt läge" om det är nära motorväg?
- Får jag skriva "renoverat" om det var 2005?

**Current:** "Juridisk kontroll: ✓ Godkänd" (ingen vägledning)

### Problem #12: Ingen jämförelse med riktiga mäklartexter
**Broker wants:**
- "Hur bra är min text jämfört med andra mäklare?"
- "Vad krävs för att nå toppnivå?"
- "Är 7/10 bra eller dåligt i praktiken?"

**Current:** Ingen benchmark, ingen kontext

## SOLUTION IMPLEMENTED

### 1. Juridisk Vägledning - Dedikerad Sektion

**New amber warning section:**
```
⚖️ Juridisk vägledning (3)
Dessa påståenden kan leda till reklamation eller anses vilseledande

⚠️ Juridisk risk: 'nyskick' utan bevis kan leda till reklamation
   Lösning: Lägg till bevis: 'Besiktigad 2023 utan anmärkningar' 
   eller 'Totalrenoverad 2022' eller ta bort påståendet

⚠️ Juridisk risk: 'nära skola' är subjektivt - kan uppfattas som vilseledande
   Lösning: Ange exakt avstånd: '500 meter till Storgårdsskolan' 
   eller '5 minuters promenad till skolan'

⚠️ Juridisk risk: 'renoverat kök' utan år kan missuppfattas som nyligen
   Lösning: Ange år: 'Köket renoverades 2019' för att undvika missförstånd

⚖️ Juridisk säkerhet: Dessa rekommendationer hjälper dig undvika 
   reklamationer och vilseledande marknadsföring enligt konsumentköplagen.
```

**Detection categories:**
1. **Overifierbara påståenden om skick**
   - "Nyskick", "toppskick", "perfekt skick" utan bevis
   - Risk: Reklamation
   - Lösning: Lägg till besiktning eller renoveringsår

2. **Vaga avståndsanspråk**
   - "Nära skola", "nära centrum" utan exakt avstånd
   - Risk: Vilseledande
   - Lösning: Ange exakt avstånd i meter eller minuter

3. **Subjektiva lägesbeskrivningar**
   - "Lugnt läge" nära motorväg
   - Risk: Kan ifrågasättas
   - Lösning: Var specifik eller undvik subjektiva omdömen

4. **Tidslösa renoveringspåståenden**
   - "Renoverat" utan år
   - Risk: Missuppfattas som nyligen
   - Lösning: Ange exakt år

5. **Garantier utan grund**
   - "Garanterat låg avgift"
   - Risk: Ansvar
   - Lösning: Undvik garantier, skriv fakta

**AI Analyzer Prompt:**
```
## JURIDISK VÄGLEDNING (MÅSTE flaggas med konkreta råd)

Varje juridisk varning MÅSTE inkludera:
- Vad risken är (reklamation, vilseledande, ansvar)
- Konkret lösning (lägg till bevis, ange exakt avstånd, specificera år)
- Alternativ formulering om möjligt
```

### 2. Jämförelse med Toppannonser - Benchmark Sektion

**New blue benchmark section at bottom:**
```
📊 Jämförelse med toppannonser

Din kvalitet:              7/10
Genomsnitt Hemnet:         6/10
Toppannonser (top 10%):    9-10/10

💡 För att nå toppnivå (9/10):
• Fixa 2 kritiska problem
• Ta bort 5 AI-klyschor
• Lägg till 3 saknade detaljer
• Lägg till fler konkreta detaljer (renoveringsår, varumärken, mått)
```

**For top-tier texts (9-10/10):**
```
✓ Grattis! Din text är på toppnivå (top 10% på Hemnet)
```

**Calculation logic:**
```typescript
{analysis.improvements.filter(i => i.severity === 'critical').length > 0 && (
  <li>• Fixa {critical count} kritiska problem</li>
)}
{analysis.improvements.filter(i => i.category === 'style').length > 0 && (
  <li>• Ta bort {style count} AI-klyschor</li>
)}
{missingDetails.length > 0 && (
  <li>• Lägg till {missing count} saknade detaljer</li>
)}
{analysis.strengths.length < 5 && (
  <li>• Lägg till fler konkreta detaljer</li>
)}
```

## VISUAL HIERARCHY (UPDATED)

```
┌─────────────────────────────────────────────────────┐
│ Header: Kvalitet 7/10 (Bra - över genomsnitt)      │
├─────────────────────────────────────────────────────┤
│ 🔴 KRITISKT! Hemnet-regelbrott (2)                 │
├─────────────────────────────────────────────────────┤
│ ⚖️ Juridisk vägledning (3) ← NYT! AMBER            │
│   ⚠️ 'nyskick' utan bevis → reklamation            │
│   ⚠️ 'nära skola' subjektivt → vilseledande        │
│   ⚠️ 'renoverat' utan år → missförstånd            │
│   ⚖️ Konsumentköplagen - undvik reklamationer      │
├─────────────────────────────────────────────────────┤
│ ⚠️ Saknade kritiska detaljer (3)                   │
├─────────────────────────────────────────────────────┤
│ ✅ STYRKOR (Behåll dessa!)                         │
├─────────────────────────────────────────────────────┤
│ 📂 Kategorier (accordion)                           │
├─────────────────────────────────────────────────────┤
│ Footer:                                             │
│ ⚖️ Juridisk kontroll: ✓ Godkänd                   │
│ ─────────────────────────────────────────────────  │
│ 📊 Jämförelse med toppannonser ← NYT! BLUE         │
│   Din kvalitet: 7/10                                │
│   Genomsnitt: 6/10                                  │
│   Toppannonser: 9-10/10                             │
│                                                     │
│   💡 För att nå toppnivå (9/10):                   │
│   • Fixa 2 kritiska problem                        │
│   • Ta bort 5 AI-klyschor                          │
│   • Lägg till 3 saknade detaljer                   │
└─────────────────────────────────────────────────────┘
```

## COLOR SCHEME

**Juridisk vägledning (Amber):**
```css
Background: #FFFBEB (amber-50)
Border: #FCD34D (amber-300)
Text: #78350F (amber-900)
Icon: Scale (amber-700)
```

**Benchmark (Blue):**
```css
Background: #EFF6FF (blue-50)
Border: #BFDBFE (blue-200)
Text: #1E3A8A (blue-900)
Icon: Sparkles (blue-600)
```

## USER EXPERIENCE

### Before:
```
Broker: "Får jag skriva 'nyskick'?"
AI: "Juridisk kontroll: ✓ Godkänd"
Broker: "Men är det verkligen okej? Jag har ingen besiktning..."

Broker: "Är 7/10 bra?"
AI: (ingen kontext)
Broker: "Jag vet inte om jag ska vara nöjd eller inte..."
```

### After:
```
⚖️ Juridisk vägledning:
⚠️ Juridisk risk: 'nyskick' utan bevis kan leda till reklamation
   Lösning: Lägg till bevis: 'Besiktigad 2023 utan anmärkningar'

Broker: "Aha! Jag måste lägga till besiktning eller ta bort 'nyskick'. Tack!"

📊 Jämförelse med toppannonser:
Din kvalitet: 7/10
Genomsnitt: 6/10 ← Du är över genomsnitt!
Toppannonser: 9-10/10

💡 För att nå toppnivå:
• Fixa 2 kritiska problem
• Ta bort 5 AI-klyschor

Broker: "Okej, 7/10 är bra! Jag är över genomsnitt. Om jag fixar dessa 2 saker når jag toppnivå!"
```

## TECHNICAL IMPLEMENTATION

### Legal Guidance Detection:
```typescript
const legalGuidance = useMemo(() => {
  return analysis.improvements.filter(item => 
    item.category === 'legal' &&
    (item.issue.toLowerCase().includes('juridisk risk') ||
     item.issue.toLowerCase().includes('overifierbar') ||
     item.issue.toLowerCase().includes('vilseledande'))
  );
}, [analysis.improvements]);
```

### Benchmark Calculation:
```typescript
// Quality comparison
<div className="flex items-center justify-between">
  <span>Din kvalitet:</span>
  <span>{analysis.overallQuality}/10</span>
</div>
<div className="flex items-center justify-between">
  <span>Genomsnitt Hemnet:</span>
  <span>6/10</span>
</div>
<div className="flex items-center justify-between">
  <span>Toppannonser (top 10%):</span>
  <span>9-10/10</span>
</div>

// Progress to top
{analysis.overallQuality < 9 && (
  <ul>
    {criticalCount > 0 && <li>• Fixa {criticalCount} kritiska problem</li>}
    {styleCount > 0 && <li>• Ta bort {styleCount} AI-klyschor</li>}
    {missingCount > 0 && <li>• Lägg till {missingCount} saknade detaljer</li>}
  </ul>
)}

// Top tier message
{analysis.overallQuality >= 9 && (
  <p>✓ Grattis! Din text är på toppnivå (top 10% på Hemnet)</p>
)}
```

## FILES MODIFIED

1. `server/lib/perfect-swedish-analyzer.ts` - Added legal guidance prompts
2. `client/src/components/ExpertFeedbackPanel.tsx` - Added legal guidance section and benchmark section

## IMPACT

### Problem #11 - Legal Guidance:
**Before:** No guidance, broker unsure what's allowed  
**After:** Concrete advice with risks and solutions

### Problem #12 - Benchmark:
**Before:** No context for quality score  
**After:** Clear comparison with average and top listings

### Broker Satisfaction:
**From:** "Jag vet inte om jag får skriva detta..."  
**To:** "Nu vet jag exakt vad som är juridiskt säkert!"

**From:** "Är 7/10 bra eller dåligt?"  
**To:** "7/10 är över genomsnitt! För toppnivå behöver jag fixa 2 saker!"

---

**Status:** ✅ COMPLETE  
**Date:** 2026-04-02  
**Impact:** Critical - Provides legal safety and motivating context
