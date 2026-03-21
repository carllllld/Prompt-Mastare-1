# Requirements: Complete System Verification

**Feature:** Komplett verifiering av alla AI-genererade outputs och plattformsregler  
**Created:** 2026-03-21  
**Status:** Draft  
**Priority:** KRITISK

---

## Executive Summary

OptiPrompt genererar 6 olika textfält för varje objektbeskrivning, men endast huvudtexten (`improvedPrompt`) har analyserats djupt för plattformsregler och kvalitet. Denna spec säkerställer att ALLA outputs följer plattformsregler, är fria från förbjudna fraser, och visas korrekt i UI.

**Vad som är fixat:**
- ✅ Huvudtext (`improvedPrompt`) - Hemnet pris/avgift-problem fixat
- ✅ Huvudtext (`improvedPrompt`) - Styckebrytningar fixade

**Vad som behöver verifieras:**
- ❓ Auxiliary fields (headline, socialCopy, instagramCaption, showingInvitation, shortAd)
- ❓ Expert analysis coverage
- ❓ UI rendering för alla fields
- ❓ PDF export

---

## 1. Business Requirements

### 1.1 Plattformsregler måste följas ÖVERALLT

**User Story 1.1.1: Hemnet-texter får ALDRIG innehålla pris/avgift**
```
Som mäklare
Vill jag att INGA av mina genererade texter (huvudtext, rubrik, social media, etc.) innehåller pris eller avgift när jag väljer Hemnet
Så att mina annonser följer Hemnets regler och inte blir avvisade
```

**Acceptance Criteria:**
- [ ] `improvedPrompt` innehåller ALDRIG pris/avgift för Hemnet ✅ (redan fixat)
- [ ] `headline` innehåller ALDRIG pris/avgift för Hemnet
- [ ] `socialCopy` innehåller ALDRIG pris/avgift för Hemnet
- [ ] `instagramCaption` innehåller ALDRIG pris/avgift för Hemnet
- [ ] `showingInvitation` innehåller ALDRIG pris/avgift för Hemnet
- [ ] `shortAd` innehåller ALDRIG pris/avgift för Hemnet

**Forbidden patterns för Hemnet:**
- `pris`, `utgångspris`, `avgift`, `driftkostnad`, `kr/mån`, `kronor`, `SEK`

---

**User Story 1.1.2: Hemnet-texter får ALDRIG innehålla energiklass**
```
Som mäklare
Vill jag att INGA av mina genererade texter innehåller energiklass när jag väljer Hemnet
Så att informationen inte dupliceras (Hemnet visar energiklass separat)
```

**Acceptance Criteria:**
- [ ] `improvedPrompt` innehåller ALDRIG energiklass för Hemnet ✅ (redan fixat)
- [ ] `headline` innehåller ALDRIG energiklass för Hemnet
- [ ] `socialCopy` innehåller ALDRIG energiklass för Hemnet
- [ ] `instagramCaption` innehåller ALDRIG energiklass för Hemnet
- [ ] `showingInvitation` innehåller ALDRIG energiklass för Hemnet
- [ ] `shortAd` innehåller ALDRIG energiklass för Hemnet

**Forbidden patterns för Hemnet:**
- `energiklass`, `energiprestanda`, `energiklass A`, `energiklass B`, etc.

---

**User Story 1.1.3: Booli-texter KAN innehålla pris/avgift**
```
Som mäklare
Vill jag att mina genererade texter KAN innehålla pris och avgift när jag väljer Booli
Så att jag kan ge köpare fullständig information direkt i texten
```

**Acceptance Criteria:**
- [ ] `improvedPrompt` KAN innehålla pris/avgift för Booli (om relevant)
- [ ] `socialCopy` KAN innehålla pris/avgift för Booli (om relevant)
- [ ] `shortAd` KAN innehålla pris/avgift för Booli (om relevant)
- [ ] Pris/avgift formateras korrekt: "Avgift 4 500 kr/mån"

---

### 1.2 Förbjudna fraser måste filtreras ÖVERALLT

**User Story 1.2.1: Inga AI-klyschor i någon text**
```
Som mäklare
Vill jag att ALLA mina genererade texter är fria från AI-klyschor
Så att mina annonser låter professionella och mänskliga
```

**Acceptance Criteria:**
- [ ] `improvedPrompt` innehåller INGA förbjudna fraser ✅ (redan fixat)
- [ ] `headline` innehåller INGA förbjudna fraser
- [ ] `socialCopy` innehåller INGA förbjudna fraser
- [ ] `instagramCaption` innehåller INGA förbjudna fraser
- [ ] `showingInvitation` innehåller INGA förbjudna fraser
- [ ] `shortAd` innehåller INGA förbjudna fraser

**Top förbjudna fraser:**
- "välkommen till", "erbjuder", "bjuder på", "perfekt för", "fantastisk", "generös"

---

### 1.3 Varje field har specifika kvalitetskrav

**User Story 1.3.1: Headline är kort och slagkraftig**
```
Som mäklare
Vill jag att rubriken är kort (max 9 ord), slagkraftig och utan punkt
Så att den fångar köparens uppmärksamhet direkt
```

**Acceptance Criteria:**
- [ ] Headline är max 9 ord
- [ ] Headline har INGEN punkt eller utropstecken i slutet
- [ ] Headline har INGA emojis
- [ ] Headline innehåller bostadens starkaste USP

**Exempel:**
- ✅ "Helrenoverad trea med balkong i söderläge"
- ❌ "Välkommen till denna fantastiska trea!" (för lång, punkt, förbjuden fras)

---

**User Story 1.3.2: Social Copy är säljande men saklig**
```
Som mäklare
Vill jag att social media-texten är säljande men saklig
Så att den lockar köpare utan att vara aggressiv
```

**Acceptance Criteria:**
- [ ] Social copy är 1-3 meningar
- [ ] Social copy avslutas med punkt
- [ ] Social copy innehåller konkret köparnytta
- [ ] Social copy undviker aggressiva CTA ("Boka visning NU!")
- [ ] Social copy kan avsluta med "Läs mer i annonsen."

**Exempel:**
- ✅ "Helrenoverat kök 2022 och södervända balkongen ger denna 3:a på Södermalm ett tydligt övertag. Läs mer i annonsen."
- ❌ "Fantastisk lägenhet som erbjuder allt du behöver! Boka visning NU!" (AI-klyschor, aggressiv CTA)

---

**User Story 1.3.3: Instagram Caption är varm och mänsklig**
```
Som mäklare
Vill jag att Instagram-texten är varm, mänsklig och har 1-2 relevanta emojis
Så att den känns personlig och engagerande på sociala medier
```

**Acceptance Criteria:**
- [ ] Instagram caption är 1-2 meningar
- [ ] Instagram caption har 1-2 relevanta emojis (INTE fler)
- [ ] Instagram caption avslutas med korrekt sluttecken (. ! ?)
- [ ] Instagram caption är max 2200 tecken
- [ ] Instagram caption undviker trunkerade meningar ("Skulle du börja...")

**Exempel:**
- ✅ "Helrenoverat kök med köksö och södervända balkongen 🌞 Perfekt för den som söker ljus och trivsel på Södermalm."
- ❌ "Fantastisk lägenhet som erbjuder allt 🏠🌟✨💫🎉" (för många emojis, AI-klyschig)

---

**User Story 1.3.4: Showing Invitation är professionell och tydlig**
```
Som mäklare
Vill jag att visningsinbjudan är professionell, trevlig och innehåller ordet "visning"
Så att köpare förstår att de är välkomna att boka
```

**Acceptance Criteria:**
- [ ] Showing invitation innehåller ordet "visning"
- [ ] Showing invitation är 1-2 meningar
- [ ] Showing invitation har trevlig, trygg ton
- [ ] Showing invitation kan innehålla placeholders ([TID], [KONTAKT])

**Exempel:**
- ✅ "Välkommen på visning [TID]. Kontakta [KONTAKT] för mer information."
- ❌ "Boka tid nu!" (saknar "visning", för kort, aggressiv)

---

**User Story 1.3.5: Short Ad är koncis och faktabaserad**
```
Som mäklare
Vill jag att kort annons är max 2 meningar med bostadstyp, boarea och 2 starka styrkor
Så att jag kan använda den i tryckta annonser eller SMS
```

**Acceptance Criteria:**
- [ ] Short ad är max 2 meningar
- [ ] Short ad innehåller bostadstyp och boarea
- [ ] Short ad innehåller 2 konkreta styrkor
- [ ] Short ad är säljande men saklig

**Exempel:**
- ✅ "3:a om 72 kvm med helrenoverat kök 2022 och södervända balkongen. Södermalm med 5 min till tunnelbanan."
- ❌ "Fantastisk lägenhet som erbjuder allt du behöver för ett perfekt boende." (AI-klyschor, inga fakta)

---

## 2. Technical Requirements

### 2.1 Generator måste följa plattformsregler

**Requirement 2.1.1: Generator-prompten är plattformsspecifik**
- Generator-prompten i `SmartGenerationEngine` måste innehålla tydliga instruktioner för varje plattform
- Hemnet: "NÄMN ALDRIG pris, avgift, driftkostnad eller energiklass"
- Booli: "Pris/avgift KAN nämnas om relevant"

**Requirement 2.1.2: Generator validerar output**
- Generator måste validera att output följer plattformsregler INNAN den returneras
- Om validation misslyckas: kasta error eller försök igen

---

### 2.2 Post-processor måste rensa alla fields

**Requirement 2.2.1: Post-processor bearbetar alla fields**
- `DeterministicPostProcessor` måste bearbeta alla 6 fields:
  - `improvedPrompt` ✅ (redan implementerat)
  - `headline`
  - `socialCopy`
  - `instagramCaption`
  - `showingInvitation`
  - `shortAd`

**Requirement 2.2.2: Post-processor tar bort förbjudna fraser**
- Post-processor måste ta bort förbjudna fraser från ALLA fields
- Post-processor måste respektera style-specifika undantag

**Requirement 2.2.3: Post-processor tar bort plattforms-förbjudna patterns**
- För Hemnet: ta bort pris/avgift/energiklass från ALLA fields
- För Booli: tillåt pris/avgift men validera format

---

### 2.3 Analyzer måste analysera alla fields

**Requirement 2.3.1: Analyzer får alla fields som input**
- `ExpertAIAnalyzer` måste ta emot alla 6 fields som input
- Nuvarande: tar bara `improvedPrompt`, `headline`, `socialCopy`
- Behöver: lägga till `instagramCaption`, `showingInvitation`, `shortAd`

**Requirement 2.3.2: Analyzer validerar plattformsregler**
- Analyzer måste flagga Hemnet-violations i ALLA fields
- Analyzer måste flagga förbjudna fraser i ALLA fields
- Analyzer måste flagga field-specifika kvalitetsproblem

---

### 2.4 UI måste visa alla fields korrekt

**Requirement 2.4.1: ResultSection visar alla fields**
- UI måste visa alla 6 fields tydligt
- Varje field måste ha egen sektion med label
- Styckebrytningar måste bevaras i `improvedPrompt`

**Requirement 2.4.2: TextEditor fungerar för alla fields**
- TextEditor måste kunna redigera alla fields (inte bara `improvedPrompt`)
- Inline editing måste fungera för alla fields

**Requirement 2.4.3: PDF export inkluderar alla fields**
- PDF export måste inkludera alla 6 fields
- Formatering måste vara korrekt för varje field

---

## 3. Quality Requirements

### 3.1 Testning

**Requirement 3.1.1: Plattformsregel-tester för alla fields**
- Tester måste verifiera att Hemnet-texter ALDRIG innehåller pris/avgift/energiklass
- Tester måste verifiera att Booli-texter KAN innehålla pris/avgift
- Tester måste köras för ALLA 6 fields

**Requirement 3.1.2: Förbjudna fraser-tester för alla fields**
- Tester måste verifiera att INGA fields innehåller förbjudna fraser
- Tester måste köras för alla styles (factual, balanced, selling)

**Requirement 3.1.3: Field-specifika kvalitetstester**
- Headline: max 9 ord, ingen punkt, inga emojis
- Social copy: 1-3 meningar, punkt i slutet
- Instagram caption: 1-2 emojis, max 2200 tecken
- Showing invitation: innehåller "visning"
- Short ad: max 2 meningar, innehåller bostadstyp + boarea

---

### 3.2 Monitoring

**Requirement 3.2.1: Logga plattformsregel-violations**
- Systemet måste logga när Hemnet-texter innehåller pris/avgift/energiklass
- Loggar måste inkludera vilket field som bröt mot regeln

**Requirement 3.2.2: Alerting för kritiska violations**
- Systemet måste skicka alert om Hemnet-violations överstiger threshold
- Alert måste inkludera exempel på violations

---

## 4. Success Criteria

### 4.1 Functional Success

- [ ] Alla 6 fields genereras korrekt för alla plattformar
- [ ] Hemnet-texter innehåller ALDRIG pris/avgift/energiklass i NÅGOT field
- [ ] Booli-texter KAN innehålla pris/avgift där relevant
- [ ] Alla fields är fria från förbjudna fraser
- [ ] Alla fields följer field-specifika kvalitetskrav

### 4.2 Technical Success

- [ ] Generator-prompten är plattformsspecifik för alla fields
- [ ] Post-processor bearbetar alla 6 fields
- [ ] Analyzer analyserar alla 6 fields
- [ ] UI visar alla 6 fields korrekt
- [ ] PDF export inkluderar alla 6 fields

### 4.3 Quality Success

- [ ] 100% av Hemnet-texter följer plattformsregler (0 violations)
- [ ] 100% av texter är fria från förbjudna fraser
- [ ] 95%+ av texter följer field-specifika kvalitetskrav
- [ ] Alla tester passerar för alla fields

---

## 5. Out of Scope

Följande är INTE en del av denna spec:

- Nya features för text generation
- Nya plattformar utöver Hemnet/Booli
- Nya auxiliary fields utöver de 6 befintliga
- Performance-optimering (täcks av annan spec)
- UI/UX redesign (täcks av annan spec)

---

## 6. Dependencies

- ✅ `PRODUCTION_FIX_v2.8.0` - Hemnet huvudtext-fix måste vara deployed
- ✅ `SmartGenerationEngine` - Generator måste vara implementerad
- ✅ `DeterministicPostProcessor` - Post-processor måste vara implementerad
- ✅ `ExpertAIAnalyzer` - Analyzer måste vara implementerad

---

## 7. Risks and Mitigations

### Risk 7.1: Generator-prompten är för komplex
**Impact:** Hög - GPT kan bli förvirrad och generera fel output  
**Probability:** Medel  
**Mitigation:** Testa prompten noggrant, använd tydliga exempel

### Risk 7.2: Post-processor missar vissa patterns
**Impact:** Hög - Hemnet-violations kan slinka igenom  
**Probability:** Medel  
**Mitigation:** Använd regex-tester, lägg till comprehensive test suite

### Risk 7.3: Analyzer blir för långsam
**Impact:** Medel - Användarupplevelsen försämras  
**Probability:** Låg  
**Mitigation:** Använd caching, optimera prompt

---

## 8. Timeline

**Fas 1: Analys och dokumentation** (1 dag)
- Läs generator-prompten för alla fields
- Dokumentera nuvarande beteende
- Identifiera gaps

**Fas 2: Generator-fixes** (1 dag)
- Uppdatera generator-prompten för alla fields
- Lägg till plattformsspecifika instruktioner
- Bumpa PROMPT_VERSION

**Fas 3: Post-processor-fixes** (1 dag)
- Uppdatera post-processor att bearbeta alla fields
- Lägg till plattformsspecifik validation
- Lägg till field-specifik validation

**Fas 4: Analyzer-fixes** (1 dag)
- Uppdatera analyzer att ta emot alla fields
- Lägg till plattformsspecifik validation
- Lägg till field-specifik validation

**Fas 5: Testing** (2 dagar)
- Skriv comprehensive test suite
- Testa alla plattformar
- Testa alla fields
- Testa alla styles

**Fas 6: UI verification** (1 dag)
- Verifiera att alla fields visas korrekt
- Verifiera PDF export
- Verifiera TextEditor

**Total: 7 dagar**

---

## 9. Appendix

### 9.1 Current System Behavior (Verified)

**improvedPrompt (huvudtext):**
- ✅ Följer Hemnet-regler (ingen pris/avgift/energiklass)
- ✅ Bevarar styckebrytningar (`\n\n`)
- ✅ Fri från förbjudna fraser
- ✅ Analyseras av analyzer

**headline, socialCopy, instagramCaption, showingInvitation, shortAd:**
- ❓ Okänt om de följer Hemnet-regler
- ❓ Okänt om de är fria från förbjudna fraser
- ❓ Okänt om de följer field-specifika kvalitetskrav
- ❓ Okänt om analyzer analyserar dem

### 9.2 Platform Rules Reference

**Hemnet:**
- Huvudtext: INGEN pris/avgift/energiklass
- Auxiliary fields: INGEN pris/avgift/energiklass (antagande - behöver verifieras)
- Ton: Faktadriven, köparrelevant

**Booli:**
- Huvudtext: Pris/avgift KAN nämnas
- Auxiliary fields: Pris/avgift KAN nämnas (antagande - behöver verifieras)
- Ton: Mer berättande, personlig

**Egen sida:**
- Huvudtext: Allt kan nämnas
- Auxiliary fields: Allt kan nämnas
- Ton: Friare, flexibel

---

**End of Requirements Document**
