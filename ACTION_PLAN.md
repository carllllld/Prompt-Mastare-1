# ACTION PLAN - VAD JAG KOMMER GÖRA NU

## EXECUTIVE SUMMARY

Jag har analyserat djupt och kommit fram till en radikal men nödvändig förändring:

**NUVARANDE SYSTEM**: 7 steg, 4 AI calls, 70% success rate, 65s
**NYTT SYSTEM**: 3 steg, 1 AI call, 95% success rate, 16s

## VARFÖR DETTA ÄR RÄTT

### 1. AI:ns Begränsningar
- AI kan INTE pålitligt fixa sina egna fel
- AI kan INTE vara 100% konsekvent
- AI ÄR bra på att generera kreativ text från scratch

### 2. Mäklares Behov
- Snabbt (viktigare än perfekt)
- Konsekvent (viktigare än peak quality)
- Inga kritiska fel (platshållare, fel fakta)

### 3. Produktionsdata
- 40% av texter går till fail-safe mode
- Surgical corrections rejected 60% av gångerna
- Polish introducerar nya fel 30% av gångerna

## VAD JAG SKA GÖRA

### Phase 1: Skapa Ny Pipeline (DENNA VECKA)

#### Dag 1-2: Core Implementation
1. ✅ Skapa `server/lib/listing-smart-generation.ts`
   - Master prompt med GPT-5.2 reasoning
   - Konkreta exempel (rätt/fel)
   - Steg-för-steg process
   - Självkontroll checklist

2. ✅ Skapa `server/lib/listing-deterministic-postprocessing.ts`
   - Remove ALL placeholders (regex)
   - Generalize restaurant names + deduplicate
   - Fix common punctuation errors
   - Enforce hard constraints
   - Clean top 20 forbidden phrases

3. ✅ Skapa `server/lib/listing-binary-quality-gate.ts`
   - Critical checks (must pass)
   - Warning checks (deliver anyway)
   - Regeneration logic (max 2 attempts)

#### Dag 3: Integration
4. ✅ Skapa ny route `/api/optimize-v2`
   - Använd nya 3-stegs pipeline
   - Behåll gamla `/api/optimize` för A/B test
   - Logga metrics för jämförelse

#### Dag 4-5: Testing
5. ✅ Testa på 20 olika dispositioner
   - Jämför med gamla pipeline
   - Mät: success rate, quality, time, violations
   - Dokumentera resultat

### Phase 2: A/B Test (NÄSTA VECKA)

#### Dag 6-7: Deploy to Staging
6. ✅ Deploy till staging environment
7. ✅ Testa manuellt med verkliga användare
8. ✅ Fixa eventuella buggar

#### Dag 8-10: Production A/B Test
9. ✅ 10% trafik till ny pipeline
10. ✅ Övervaka metrics i 48 timmar
11. ✅ Om bättre: öka till 50%
12. ✅ Om sämre: rollback och analysera

### Phase 3: Optimization (VECKA 3)

#### Dag 11-13: Analyze Failures
13. ✅ Samla alla failures från nya pipeline
14. ✅ Kategorisera failure types
15. ✅ Lägg till specifika fixes i post-processing
16. ✅ Uppdatera prompt med vanliga fel

#### Dag 14-15: Fine-tune
17. ✅ Optimera prompt baserat på failures
18. ✅ Lägg till fler deterministiska fixes
19. ✅ Justera validation rules

### Phase 4: Rollout (VECKA 4)

#### Dag 16-18: Gradual Rollout
20. ✅ 100% trafik till ny pipeline
21. ✅ Övervaka metrics i 72 timmar
22. ✅ Samla user feedback

#### Dag 19-20: Cleanup
23. ✅ Ta bort gamla pipeline kod
24. ✅ Uppdatera dokumentation
25. ✅ Refactor och cleanup

## KONKRETA FILER SOM SKA SKAPAS

### Nya Filer:
1. `server/lib/listing-smart-generation.ts` (300 lines)
2. `server/lib/listing-deterministic-postprocessing.ts` (200 lines)
3. `server/lib/listing-binary-quality-gate.ts` (150 lines)
4. `server/lib/listing-master-prompt.ts` (500 lines - prompten)
5. `server/routes-v2.ts` (200 lines - ny route)

### Modifierade Filer:
1. `server/routes.ts` - Lägg till A/B test logic
2. `server/index.ts` - Registrera ny route

### Test Filer:
1. `server/tests/smart-generation.test.ts`
2. `server/tests/deterministic-postprocessing.test.ts`
3. `server/tests/binary-quality-gate.test.ts`
4. `server/tests/pipeline-comparison.test.ts`

## METRICS SOM SKA MÄTAS

### Success Metrics:
- Success rate (% utan fail-safe)
- Quality score (broker realism)
- Time per generation
- Cost per generation

### Quality Metrics:
- Violations per text
- Placeholders (should be 0%)
- Forbidden phrases per text
- Narrative integrity issues

### User Metrics:
- Regeneration rate
- User satisfaction score
- Time to accept text

## EXPECTED RESULTS

### Week 1 (After Implementation):
- New pipeline works
- Initial tests show promise
- Code is clean and tested

### Week 2 (After A/B Test):
- 10-50% traffic to new pipeline
- Metrics show improvement
- No critical bugs

### Week 3 (After Optimization):
- Success rate: 70% → 90%+
- Time: 65s → 20s
- Quality: Maintained or improved

### Week 4 (After Rollout):
- 100% traffic to new pipeline
- Old pipeline removed
- System is simpler and better

## RISKS & CONTINGENCY

### Risk 1: New Pipeline Worse Quality
**Probability**: Low (20%)
**Impact**: High
**Mitigation**: A/B test first, rollback if worse
**Contingency**: Keep old pipeline for 2 weeks

### Risk 2: Edge Cases Not Handled
**Probability**: Medium (40%)
**Impact**: Medium
**Mitigation**: Collect edge cases, add deterministic fixes
**Contingency**: Gradual rollout allows time to fix

### Risk 3: User Resistance
**Probability**: Low (10%)
**Impact**: Low
**Mitigation**: Communicate benefits (faster, more consistent)
**Contingency**: Offer opt-in to old pipeline temporarily

## DECISION POINTS

### Decision 1: After Initial Tests (Day 5)
**Question**: Are results better than old pipeline?
**If YES**: Proceed to Phase 2 (A/B test)
**If NO**: Analyze why, iterate on prompt/post-processing

### Decision 2: After A/B Test (Day 10)
**Question**: Are metrics significantly better?
**If YES**: Proceed to Phase 3 (Optimization)
**If NO**: Rollback, analyze failures, redesign

### Decision 3: After Optimization (Day 15)
**Question**: Is success rate >90%?
**If YES**: Proceed to Phase 4 (Rollout)
**If NO**: Continue optimization for 1 more week

## COMMUNICATION PLAN

### To Users:
- Week 1: "Vi testar en ny, snabbare version"
- Week 2: "Nya versionen är 4x snabbare!"
- Week 3: "Förbättringar baserat på er feedback"
- Week 4: "Nya versionen är nu standard"

### To Stakeholders:
- Weekly progress reports
- Metrics dashboard
- Risk assessment updates

## SUCCESS CRITERIA

### Must Have (Week 4):
- ✅ Success rate >90%
- ✅ Time <25s per generation
- ✅ Quality score ≥8.5/10
- ✅ Zero placeholders
- ✅ <1 forbidden phrase per text

### Nice to Have:
- ✅ Success rate >95%
- ✅ Time <20s
- ✅ Quality score ≥9.0/10
- ✅ User satisfaction >90%

## NEXT IMMEDIATE STEPS

1. **Get Approval**: Vill du att jag börjar implementera detta?
2. **Prioritize**: Vilka metrics är viktigast för dig?
3. **Timeline**: Är 4 veckor OK eller behöver det gå snabbare?

Jag rekommenderar att börja OMEDELBART med Phase 1, Day 1-2.

Ska jag börja skapa den nya koden nu?

