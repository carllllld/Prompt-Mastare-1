import { describe, it, expect } from 'vitest';
import {
  buildGoldenBrokerExamples,
  computeChatCompletionTokenBudget,
  computeInlineEditOutputTokenBudget,
  buildDeterministicFallbackDescription,
  buildDispositionFromStructuredData,
  countGenericBrokerPhrases,
  detectNarrativeIntegrityIssues,
  finalizeMainMarketingText,
  isStrongPublishableCandidate,
  polishAuxFieldText,
  safeJsonParse,
  sanitizeGeneratedMarketingField,
  shouldSkipFinalRescueRewrite,
  validateOptimizationResult,
} from '../routes';

describe('AI Pipeline Tests', () => {
  describe('Prompt Optimization', () => {
    it('should provide platform-specific golden broker examples for prompt guidance', () => {
      const hemnetExamples = buildGoldenBrokerExamples('hemnet');
      const booliExamples = buildGoldenBrokerExamples('booli');

      expect(hemnetExamples).toContain('Referensexempel 1');
      expect(hemnetExamples.toLowerCase()).toContain('villa om');
      expect(booliExamples).toContain('Referensexempel 1');
      expect(booliExamples.toLowerCase()).toContain('vardagsfunktion');
    });

    it('should scale chat completion token budget by mode and plan', () => {
      const proRescue = computeChatCompletionTokenBudget(380, 'rescue', 'pro');
      const premiumRescue = computeChatCompletionTokenBudget(380, 'rescue', 'premium');
      const proExpansion = computeChatCompletionTokenBudget(380, 'expansion', 'pro');

      expect(premiumRescue).toBeGreaterThanOrEqual(proRescue);
      expect(proRescue).toBeGreaterThanOrEqual(proExpansion);
    });

    it('should keep inline edit output budget within bounded range and plan-aware', () => {
      const selected = 'Köket renoverades 2021 med luckor från Ballingslöv och bänkskiva i komposit.';
      const proImprove = computeInlineEditOutputTokenBudget(selected, 'pro', 'improve');
      const premiumImprove = computeInlineEditOutputTokenBudget(selected, 'premium', 'improve');
      const proRewrite = computeInlineEditOutputTokenBudget(selected, 'pro', 'rewrite');

      expect(proImprove).toBeGreaterThanOrEqual(360);
      expect(premiumImprove).toBeGreaterThanOrEqual(proImprove);
      expect(proRewrite).toBeGreaterThanOrEqual(proImprove);
    });

    it('should build structured pipeline input from property data', () => {
      const result = buildDispositionFromStructuredData({
        propertyType: 'apartment',
        address: 'Testgatan 1, Stockholm',
        livingArea: 75,
        rooms: 3,
        bedrooms: 2,
        buildYear: 2010,
        monthlyFee: 2500,
        price: 3500000,
        balconyDirection: 'söder',
        kitchen: 'kök med vita luckor',
        bathroom: 'helkaklat badrum',
        uniqueSellingPoints: 'balkong i söderläge',
        transport: 'T-bana 4 minuter',
      });

      expect(result.disposition.property.address).toBe('Testgatan 1, Stockholm');
      expect(result.disposition.property.size).toBe(75);
      expect(result.disposition.property.rooms).toBe(3);
      expect(result.disposition.property.bedrooms).toBe(2);
      expect(result.tone_analysis.target_audience).toBeTruthy();
      expect(Array.isArray(result.writing_plan.paragraphs)).toBe(true);
    });

    it('should map totalRooms and bathrooms from form payload fields', () => {
      const result = buildDispositionFromStructuredData({
        propertyType: 'villa',
        address: 'Ekorrvägen 10, Värmdö',
        livingArea: 146,
        totalRooms: 5,
        bedrooms: 3,
        bathrooms: 2,
        kitchen: 'renoverat kök',
        bathroom: 'helkaklat badrum',
        transport: 'buss 25 minuter till Slussen',
      });

      expect(result.disposition.property.rooms).toBe(5);
      expect(result.disposition.property.bedrooms).toBe(3);
      expect(result.disposition.property.bathrooms).toBe(2);
    });

    it('should map kitchenDescription and bathroomDescription aliases from form payload', () => {
      const result = buildDispositionFromStructuredData({
        propertyType: 'villa',
        address: 'Ekorrvägen 10, Värmdö',
        livingArea: 146,
        totalRooms: 5,
        bedrooms: 3,
        bathrooms: 2,
        kitchenDescription: 'renoverat kök med köksö',
        bathroomDescription: 'helkaklat badrum med golvvärme',
      });

      expect(result.disposition.property.kitchen).toContain('renoverat kök');
      expect(result.disposition.property.bathroom).toContain('helkaklat badrum');
    });

    it('should deduplicate laddbox across parking and special features in structured disposition', () => {
      const result = buildDispositionFromStructuredData({
        propertyType: 'villa',
        address: 'Ekorrvägen 10, Värmdö',
        livingArea: 146,
        totalRooms: 5,
        bedrooms: 3,
        bathrooms: 2,
        parking: 'Garage med laddbox för elbil',
        specialFeatures: 'Laddbox för elbil, Solceller, Nya fönster',
      });

      const special = result.disposition.property.special_features || [];
      expect(Array.isArray(special)).toBe(true);
      expect(special.map((item: string) => item.toLowerCase())).not.toContain('laddbox för elbil');
      expect((result.disposition.property.parking || '').toLowerCase()).toContain('laddbox');
    });

    it('should produce a publishable deterministic fallback after sanitizing', () => {
      const structured = buildDispositionFromStructuredData({
        propertyType: 'villa',
        address: 'Villagatan 1, Malmö',
        livingArea: 150,
        rooms: 5,
        bedrooms: 3,
        monthlyFee: 0,
        price: 4850000,
        kitchen: 'modernt kök med köksö',
        bathroom: 'två badrum',
        layout: 'öppen planlösning mellan kök och vardagsrum',
        uniqueSellingPoints: 'trädgård, söderläge',
        amenities: ['skola 400 meter', 'matbutik 500 meter'],
      });

      const fallback = buildDeterministicFallbackDescription(structured.disposition, 'balanced');
      const sanitized = sanitizeGeneratedMarketingField(fallback, undefined, 'balanced', { allowParagraphs: true });

      expect(sanitized).toBeTruthy();
      const violations = validateOptimizationResult({ improvedPrompt: sanitized }, 'hemnet', 120, 500, 'balanced');
      expect(violations.filter((v) => !v.startsWith('För få ord') && !v.startsWith('För många ord') && !v.includes('präglas av'))).toHaveLength(0);
    });
  });

  describe('Rule Violations', () => {
    it('should sanitize forbidden phrases from generated text', () => {
      const cleaned = sanitizeGeneratedMarketingField(
        'Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor och här kan du njuta av balkongen.',
        undefined,
        'balanced'
      );

      expect(cleaned).toBeTruthy();
      expect(cleaned?.toLowerCase()).not.toContain('välkommen till');
      expect(cleaned?.toLowerCase()).not.toContain('erbjuder');
    });

    it('should repair embedded "för att" word artifacts before validation', () => {
      const cleaned = sanitizeGeneratedMarketingField(
        'Köket har en sammanhåför attllen utformning med matplats vid fönstret och vardagsrummet får ett naturligt ljusinsläpp.',
        undefined,
        'balanced'
      );

      expect(cleaned).toBeTruthy();
      expect(cleaned).toContain('sammanhållen');
      expect(cleaned).not.toContain('för attllen');

      const violations = validateOptimizationResult({ improvedPrompt: cleaned }, 'hemnet', 1, 500, 'balanced');
      expect(violations.filter((v) => v.includes('för att'))).toHaveLength(0);
    });

    it('should remove lingering forbidden travel phrase and embedded "för att" artifact in the same final text', () => {
      const cleaned = sanitizeGeneratedMarketingField(
        'Läget gör det enkelt att ta sig till och från city och planlösningen är sammanhåför attllen med plats för både matbord och soffgrupp.',
        undefined,
        'balanced'
      );

      expect(cleaned).toBeTruthy();
      expect(cleaned?.toLowerCase()).not.toContain('gör det enkelt att');
      expect(cleaned).not.toContain('för attllen');

      const violations = validateOptimizationResult({ improvedPrompt: cleaned }, 'hemnet', 1, 500, 'balanced');
      expect(violations.filter((v) => v.includes('gör det enkelt att') || v.includes('för att'))).toHaveLength(0);
    });

    it('should preserve energy class letters and repair mechanical artifact sentences', () => {
      const cleaned = sanitizeGeneratedMarketingField(
        'Fönster har bytts och tilläggsisolering har gjorts. Energiklass är B. Fiber är installerat. Parkering har laddplats för elbil. Kikka ligger nära när det passar med en måltid Buss tar cirka 25 minuter till Slussen.',
        undefined,
        'balanced'
      );

      expect(cleaned).toBeTruthy();
      expect(cleaned).toContain('Bostaden har energiklass B och fiber är installerat.');
      expect(cleaned).toContain('Parkering med laddplats för elbil');
      expect(cleaned).toContain('I samma riktning finns Kikka när det passar att äta ute. Med buss tar det cirka 25 minuter till Slussen');

      const violations = validateOptimizationResult({ improvedPrompt: cleaned }, 'hemnet', 1, 500, 'balanced');
      expect(violations.filter((v) => v.includes('energiklass') || v.includes('Parkering har') || v.includes('meningsgräns') || v.includes('servicefras'))).toHaveLength(0);
    });

    it('should normalize duplicate charging terms in auxiliary fields', () => {
      const cleaned = polishAuxFieldText('shortAd', 'Laddplats för elbil med installerad laddbox finns vid huset');

      expect(cleaned).toContain('laddbox för elbil');
      expect(cleaned?.toLowerCase()).not.toContain('laddplats');
      expect(cleaned?.endsWith('.')).toBe(true);
    });

    it('should remove truncated engagement tails in instagram captions', () => {
      const cleaned = polishAuxFieldText('instagramCaption', 'Södersol på uteplatsen och lugnt läge. Skulle du börja');

      expect(cleaned?.toLowerCase()).not.toContain('skulle du börja');
      expect(cleaned?.endsWith('.')).toBe(true);
    });

    it('should remove CTA tails from social copy and collapse repeated phrases', () => {
      const cleaned = polishAuxFieldText(
        'socialCopy',
        'Villa om 146 kvm med uteplats och laddbox för elbil för elbil för elbil. Hör av dig för visning.'
      );

      expect(cleaned?.toLowerCase()).not.toContain('hör av dig');
      expect(cleaned?.toLowerCase()).not.toContain('för elbil för elbil');
      expect(cleaned?.toLowerCase()).toContain('laddbox för elbil');
      expect(cleaned).toContain('Läs mer i annonsen.');
    });

    it('should sanitize forbidden phrase and duplicate punctuation in auxiliary text', () => {
      const cleaned = polishAuxFieldText(
        'socialCopy',
        'Service finns inom räckhåll.. Bussen tar dig till Slussen på cirka 25 minuter..'
      );

      expect(cleaned?.toLowerCase()).not.toContain('inom räckhåll');
      expect(cleaned).not.toContain('..');
      expect(cleaned?.endsWith('.')).toBe(true);
    });

    it('should preserve mild selling wording in selling-style auxiliary copy', () => {
      const cleaned = polishAuxFieldText(
        'socialCopy',
        'Smakfullt renoverat kök med köksö och plats för sex personer.',
        'selling'
      );

      expect(cleaned?.toLowerCase()).toContain('smakfullt');
    });

    it('should trim headline punctuation and keep it concise', () => {
      const cleaned = polishAuxFieldText(
        'headline',
        'Insynsskyddad trea med balkong i söderläge och kvällssol!'
      );

      expect(cleaned?.endsWith('!')).toBe(false);
      expect((cleaned || '').split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(9);
    });


    it('should validate AI output quality against the current helper rules', () => {
      const goodOutput = 'Trea om 76 kvm med balkong i västerläge på Storgatan 12, 3 tr, Linköping. Köket renoverades 2022.';
      const badOutput = 'Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor och en underbar känsla.';

      const goodViolations = validateOptimizationResult({ improvedPrompt: goodOutput }, 'hemnet', 1, 500, 'balanced');
      const badViolations = validateOptimizationResult({ improvedPrompt: badOutput }, 'hemnet', 1, 500, 'balanced');

      expect(goodViolations.filter((v) => !v.startsWith('För få ord') && !v.startsWith('För många ord'))).toHaveLength(0);
      expect(badViolations.length).toBeGreaterThan(0);
    });

    it('should reject a generic Hemnet opening without a strong early detail', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'En trea om 76 kvm. Vardagsrummet har fönster mot gatan. Köket renoverades 2022 med luckor från Ballingslöv. Resecentrum 5 minuter.'
      }, 'hemnet', 1, 500, 'balanced');

      expect(violations.some((v) => v.includes('Generisk öppning'))).toBe(true);
    });

    it('should reject a weak Hemnet location ending that reads like a raw place line', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'Storgatan 12, 3 tr, Linköping. Balkong i västerläge ger ett fint extrarum under den varmare delen av året. Köket renoverades 2022 med luckor från Ballingslöv. ICA.'
      }, 'hemnet', 1, 500, 'balanced');

      expect(violations.some((v) => v.includes('Svagt lägesslut'))).toBe(true);
    });

    it('should allow narrative Hemnet opening even without forced type-and-kvm pattern', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'Ekorrvägen 10 i Mörtnäs med solig uteplats och lugnt läge. Tre sovrum och öppna sociala ytor.'
      }, 'hemnet', 1, 500, 'balanced');

      expect(violations.some((v) => v.includes('Hemnet-öppningen saknar tydlig bostadstyp'))).toBe(false);
      expect(violations.some((v) => v.includes('Hemnet-öppningen saknar boarea'))).toBe(false);
    });

    it('should allow emotional-but-factual closing in Booli main text', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'Ekorrvägen 10, Mörtnäs, Värmdö. Villa om 146 kvm med uteplats i söderläge och inbyggd jacuzzi. När kvällen kommer blir uteplatsen en lugn plats efter middagen.'
      }, 'booli', 1, 600, 'balanced');

      expect(violations.some((v) => v.includes('Emotionellt Hemnet-slut'))).toBe(false);
    });

    it('should enforce platform-specific technical field separation for Hemnet but not Booli', () => {
      const text = 'Villa om 146 kvm på Ekorrvägen 10 med uteplats i söderläge. Bostaden har energiklass B.';
      const hemnetViolations = validateOptimizationResult({ improvedPrompt: text }, 'hemnet', 1, 500, 'balanced');
      const booliViolations = validateOptimizationResult({ improvedPrompt: text }, 'booli', 1, 600, 'balanced');

      expect(hemnetViolations.some((v) => v.toLowerCase().includes('energiklass'))).toBe(true);
      expect(booliViolations.some((v) => v.toLowerCase().includes('energiklass'))).toBe(false);
    });

    it('should apply field-specific validation for auxiliary texts', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'Storgatan 12, 3 tr, Linköping. Trea om 76 kvm med balkong i söderläge och renoverat kök.',
        headline: 'Ljus trea med söderbalkong.',
        instagramCaption: 'Ljus trea med söderbalkong och renoverat kök.',
        showingInvitation: 'Välkommen till lägenheten [TID].',
        shortAd: 'Trea om 76 kvm med söderbalkong och renoverat kök. Nära resecentrum, service och skolor. Planlösningen passar både familj och hemarbete.',
      }, 'hemnet', 1, 500, 'balanced');

      expect(violations.some((v) => v.includes('[headline] Rubrik ska inte avslutas'))).toBe(true);
      expect(violations.some((v) => v.includes('[instagramCaption] instagramCaption bör innehålla minst en relevant emoji'))).toBe(true);
      expect(violations.some((v) => v.includes('[showingInvitation] showingInvitation ska tydligt nämna visning'))).toBe(true);
      expect(violations.some((v) => v.includes('[showingInvitation] showingInvitation innehåller oupplösta platshållare'))).toBe(true);
      expect(violations.some((v) => v.includes('[shortAd] shortAd ska vara max 2 meningar'))).toBe(true);
    });

    it('should flag generic missing cost unit regardless of exact cost label', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'Radhus om 118 kvm med lugnt läge. Driftkostnad om 12000 och smidig pendling till stan.'
      }, 'hemnet', 1, 500, 'balanced');

      expect(violations.some((v) => v.includes('Kostnad saknar enhet') || v.includes('Avgift saknar enhet'))).toBe(true);
    });

    it('should flag probable sentence boundary break after numbers before new clause', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'Bostaden har nyare fönster och låg energiförbrukning. Avgift om 10 000 Mörtnäs ligger nära service och buss.'
      }, 'booli', 1, 600, 'balanced');

      expect(violations.some((v) => v.includes('Sannolik saknad punkt'))).toBe(true);
    });

    it('should flag repeated phrase loops when sanitizer misses them', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'Villa med laddbox för elbil för elbil för elbil och bra planlösning.'
      }, 'hemnet', 1, 500, 'balanced');

      expect(violations.some((v) => v.includes('Upprepad fras'))).toBe(true);
    });

    it('should not flag acronym repetitions as harmful phrase loops', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'BRF BRF BRF med låg belåning och stabil ekonomi.'
      }, 'hemnet', 1, 500, 'balanced');

      expect(violations.some((v) => v.includes('Upprepad fras'))).toBe(false);
    });

    it('should flag selling drift in factual style', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'Lägenheten är charmig och stilfull med planlösning som inbjuder till sociala kvällar.'
      }, 'booli', 1, 600, 'factual');

      expect(violations.some((v) => v.includes('Factual-stil'))).toBe(true);
    });

    it('should keep supported selling wording when style is selling', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'Villa om 146 kvm med smakfullt renoverat kök från 2021, södervänd uteplats och buss 25 minuter till Slussen.'
      }, 'booli', 1, 600, 'selling');

      expect(violations.some((v) => v.includes('Factual-stil'))).toBe(false);
      expect(violations.some((v) => v.includes('Förbjuden fras: "smakfullt"'))).toBe(false);
    });

    it('should reject a generic or too-thin text as a strong publishable candidate offline', () => {
      const genericThinText = 'En trea om 76 kvm. Kök renoverat 2022. ICA nära.';

      expect(isStrongPublishableCandidate(genericThinText, 'hemnet', 195, 450, 'balanced', 'pro')).toBe(false);
    });

    it('should reject text that is long enough but still reads too generically for the local top-broker gate', () => {
      const longButGenericText = 'Storgatan 12, 3 tr, Linköping. En trea om 76 kvm med gott om plats för vardagens behov. Köket renoverades 2022 och badrummet uppdaterades i samband med detta. Planlösningen är praktisk och vardagsrummet har plats för både soffgrupp och matbord. Sovrummen ligger i den inre delen av bostaden och förvaring finns i flera garderober. Läget ger närhet till service och kommunikationer, vilket gör vardagen smidig. ICA, resecentrum och centrum finns i närheten och området passar många olika köpare. Bostaden håller ett gott skick och ger ett välordnat helhetsintryck utan att sticka ut på något särskilt sätt.';

      expect(isStrongPublishableCandidate(longButGenericText, 'hemnet', 195, 450, 'balanced', 'pro')).toBe(false);
    });

    it('should detect broken narrative integrity artifacts from the live failure pattern', () => {
      const issues = detectNarrativeIntegrityIssues(
        'Fönster har bytts och tilläggsisolering har gjorts. Läget gör det lätt att börja Värmepumpen är ny och uteplatsen ger bra förutsättningar för sol.'
      );

      expect(issues.length).toBeGreaterThan(0);
    });

    it('should enforce missing critical disposition facts in finalized main text', async () => {
      const finalized = await finalizeMainMarketingText(
        'Ekorrvägen 10 i Mörtnäs med södervänd uteplats och inbyggd jacuzzi.',
        'hemnet',
        undefined,
        'balanced',
        { allowParagraphs: true },
        {
          property: {
            size: 146,
            rooms: 5,
            kitchen: 'renoverat kök',
            bathroom: 'helkaklat badrum',
          },
          location: {
            transport: 'buss 25 minuter till Slussen',
          },
        }
      );

      const text = finalized || '';
      expect(text).toMatch(/\b146\b.*\bkvm\b/i);
      expect(text).toMatch(/\b5\b.*\brum\b/i);
      expect(text.toLowerCase()).toContain('kök');
      expect(text.toLowerCase()).toContain('badrum');
      expect(text.toLowerCase()).toMatch(/kommunikation|buss|slussen/);
    });

    it('should accept bedrooms mention as room coverage and still enforce bedrooms and bathrooms count', async () => {
      const finalized = await finalizeMainMarketingText(
        'Ekorrvägen 10 i Mörtnäs med genomgående planlösning och tre sovrum nära södervänd uteplats.',
        'hemnet',
        undefined,
        'balanced',
        { allowParagraphs: true },
        {
          property: {
            size: 146,
            rooms: 5,
            bedrooms: 3,
            bathrooms: 2,
            kitchen: 'renoverat kök',
            bathroom: 'helkaklat badrum',
          },
          location: {
            transport: 'buss 25 minuter till Slussen',
          },
        }
      );

      const text = finalized || '';
      expect(text).toMatch(/\b146\b.*\bkvm\b/i);
      expect(text.toLowerCase()).toContain('tre sovrum');
      expect(text).not.toMatch(/\b5\b.*\brum\b/i);
      expect(text.toLowerCase()).toMatch(/\b2\b.*\bbadrum\b/);
      expect(text.toLowerCase()).toContain('kök');
      expect(text.toLowerCase()).toMatch(/kommunikation|buss|slussen/);
    });

    it('should rewrite raw-fact opening and reduce service list feel during finalization', async () => {
      const finalized = await finalizeMainMarketingText(
        'Villa om 146 kvm på Ekorrvägen 10 i Mörtnäs, Värmdö med södervänd uteplats och inbyggd jacuzzi. Planlösningen rymmer fem rum med tre sovrum och två badrum, en kombination som lätt att snabbt justera temperaturen. Handlingen går snabbt när Willys Värmdö ligger nära, och en spontan middag blir enkel med Kikka, COME 2 EAT och ChopChop Asian Express Värmdö.',
        'hemnet',
        undefined,
        'balanced',
        { allowParagraphs: true },
        {
          property: {
            address: 'Ekorrvägen 10, Mörtnäs, Värmdö',
            size: 146,
            rooms: 5,
            bedrooms: 3,
            bathrooms: 2,
            kitchen: 'renoverat kök',
            bathroom: 'helkaklat badrum',
          },
          location: {
            transport: 'buss 25 minuter till Slussen',
          },
        }
      );

      const text = finalized || '';
      const firstSentence = text.split(/(?<=[.!?])\s+/)[0] || '';
      expect(firstSentence.toLowerCase()).not.toMatch(/^villa om\s+146/);
      expect(text.toLowerCase()).toContain('södervänd');
      expect(text.toLowerCase()).toContain('jacuzzi');
      expect(text.toLowerCase()).not.toContain('som lätt att snabbt');
      expect(text.toLowerCase()).not.toContain('kikka, come 2 eat och chopchop asian express värmdö');
      expect(text).not.toContain('..');
    });

    it('should rewrite weak location-list ending into contextual closing during finalization', async () => {
      const finalized = await finalizeMainMarketingText(
        'Storgatan 12, Linköping. En ljus trea med bra planlösning och renoverat kök. ICA Supermarket.',
        'hemnet',
        undefined,
        'balanced',
        { allowParagraphs: true },
        {
          property: {
            size: 76,
            rooms: 3,
            kitchen: 'renoverat kök',
            bathroom: 'helkaklat badrum',
          },
          location: {
            area: 'Centrala Linköping',
            transport: 'Resecentrum fem minuter bort',
            amenities: ['ICA Supermarket'],
          },
        }
      );

      const text = finalized || '';
      const lastSentence = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(-1)[0] || '';
      expect(lastSentence.toLowerCase()).not.toMatch(/^(ica|coop|willys|hemköp|matbutik)\b/);
      expect(lastSentence.toLowerCase()).toMatch(/vardag|kommunikation|resecentrum|smidig/);
    });

    it('should keep factual style free from narrative hook phrasing in finalization', async () => {
      const finalized = await finalizeMainMarketingText(
        'Villa om 146 kvm på Ekorrvägen 10 med södervänd uteplats och inbyggd jacuzzi.',
        'booli',
        undefined,
        'factual',
        { allowParagraphs: true },
        {
          property: {
            address: 'Ekorrvägen 10, Mörtnäs, Värmdö',
            size: 146,
            rooms: 5,
            kitchen: 'renoverat kök',
            bathroom: 'helkaklat badrum',
          },
          location: {
            transport: 'buss 25 minuter till Slussen',
          },
        }
      );

      const text = (finalized || '').toLowerCase();
      expect(text).not.toContain('sätter tonen direkt');
    });

    it('should strengthen weak opening in selling style using disposition anchors', async () => {
      const finalized = await finalizeMainMarketingText(
        'Detta är en välplanerad bostad med bra känsla i rummen.',
        'booli',
        undefined,
        'selling',
        { allowParagraphs: true },
        {
          property: {
            type: 'villa',
            address: 'Ekorrvägen 10, Mörtnäs, Värmdö',
            size: 146,
            layout: 'öppna sociala ytor',
            preferred_outdoor_term: 'södervänd uteplats',
            kitchen: 'renoverat kök',
            bathroom: 'helkaklat badrum',
          },
          location: {
            transport: 'buss 25 minuter till Slussen',
          },
          unique_features: ['inbyggd jacuzzi'],
        }
      );

      const text = finalized || '';
      const firstSentence = text.split(/(?<=[.!?])\s+/).find(Boolean) || '';
      expect(firstSentence.toLowerCase()).toMatch(/ekorrvägen 10|villa om 146|södervänd uteplats/);
    });

    it('should flag generic broker abstractions that lack concrete evidentiary density', () => {
      const genericCount = countGenericBrokerPhrases(
        'Planlösningen skapar naturliga flöden och ger flexibla användningsmöjligheter. Helheten känns lättmöblerad och väl placerad för ett vardagsliv med trevligt umgänge.'
      );

      expect(genericCount).toBeGreaterThan(1);
    });

    it('should reject a borderline long text from strong fast-path when it is generic despite some concrete facts', () => {
      const borderlineText = 'Tallstigen 4, Värmdö. Villa med uteplats i söderläge och trädgård. Köket renoverades 2021 och badrummet uppdaterades 2020. Planlösningen skapar naturliga flöden mellan rummen och ger flexibla användningsmöjligheter för familjen. Vardagsrummet har plats för både soffgrupp och matbord medan sovrummen ligger samlade i den mer privata delen av huset. Uteplatsen blir en självklar del av huset under sommarhalvåret och tomten ger bra förutsättningar för sol. Läget är väl placerat för ett vardagsliv där skola, service och kommunikationer gör det lätt att kombinera pendling, ärenden och fritid. Fiber finns installerat och parkering finns på tomten.';

      expect(isStrongPublishableCandidate(borderlineText, 'hemnet', 195, 450, 'balanced', 'pro')).toBe(false);
    });

    it('should skip final rescue rewrite for advisory-only audit issues when local score is high', () => {
      const decision = shouldSkipFinalRescueRewrite({
        publish_ready: false,
        issues: [
          'Öppningen kunde vara mer direkt.',
          'Lägesstycket känns något uppradande.'
        ]
      }, 0.89);

      expect(decision).toBe(true);
    });

    it('should not skip final rescue rewrite when audit issues suggest factual risk', () => {
      const decision = shouldSkipFinalRescueRewrite({
        publish_ready: false,
        issues: [
          'Fakta om boarea motsäger dispositionen.',
          'Avgift saknar enhet.'
        ]
      }, 0.91);

      expect(decision).toBe(false);
    });
  });

  describe('Structured Data Processing', () => {
    it('should process structured property data correctly', () => {
      const propertyData = {
        propertyType: 'villa',
        address: 'Villagatan 1, Malmö',
        livingArea: 150,
        rooms: 5,
        bedrooms: 3,
        floor: 1,
        buildYear: 1995,
        condition: 'Renoverad',
        energyClass: 'C',
        elevator: false,
        flooring: 'Ekparkett',
        kitchen: 'Modernt kök med ö',
        bathroom: 'Marmorbadrum',
        balconyDirection: 'syd',
        outdoorSize: '20 kvm',
        storage: 'Förråd och garage',
        heating: 'Vattenburen värme',
        parking: 'Dubbelgarage',
        lotArea: 800,
        garden: 'Trädgård med terrass',
        specialFeatures: 'Braskamin',
        uniqueSellingPoints: 'Närhet till skola',
        otherInfo: 'Säljs av mäklare'
      };

      const structured = buildDispositionFromStructuredData(propertyData);

      expect(structured.disposition.property.type).toBe('villa');
      expect(structured.disposition.property.address).toBe('Villagatan 1, Malmö');
      expect(structured.disposition.property.size).toBe(150);
      expect(structured.disposition.property.materials.kitchen).toBe('Modernt kök med ö');
      expect(structured.disposition.location.municipality).toBe('Malmö');
    });

    it('should handle missing optional fields', () => {
      const structured = buildDispositionFromStructuredData({
        propertyType: 'apartment',
        address: 'Lägenhetsvägen 1, Stockholm',
        livingArea: 65,
        rooms: 3,
        floor: 2,
        buildYear: 2018
      });

      expect(structured.disposition.property.type).toBe('lägenhet');
      expect(structured.disposition.property.address).toBe('Lägenhetsvägen 1, Stockholm');
      expect(structured.disposition.property.rooms).toBe(3);
      expect(structured.disposition.property.floor).toBe('2');
    });
  });

  describe('Error Handling', () => {
    it('should recover malformed model JSON that is missing commas between properties', () => {
      const parsed = safeJsonParse(`{
        "fact_check_passed": false
        "corrected_text": "Korrigerad text"
        "issues": [{"quote": "gör det enkelt att", "reason": "förbjuden fras"}]
      }`);

      expect(parsed.fact_check_passed).toBe(false);
      expect(parsed.corrected_text).toBe('Korrigerad text');
      expect(Array.isArray(parsed.issues)).toBe(true);
      expect(parsed.issues[0]?.quote).toBe('gör det enkelt att');
    });

    it('should return null when sanitizing non-string values', () => {
      expect(sanitizeGeneratedMarketingField(null, undefined, 'balanced')).toBeNull();
      expect(sanitizeGeneratedMarketingField(undefined, undefined, 'balanced')).toBeNull();
    });

    it('should add stycken when long broker text is delivered in one block', () => {
      const cleaned = sanitizeGeneratedMarketingField(
        'Storgatan 12, 3 tr, Linköping. En ljus trea om 76 kvm med balkong i söderläge och välplanerade ytor. Köket är renoverat med luckor från Ballingslöv och vitvaror från Siemens samt matplats vid fönstret. Vardagsrummet har stora fönster mot gården och plats för både soffgrupp och matbord. Sovrummen ligger avskilt från de sociala ytorna och badrummet är helkaklat med tvättmaskin. BRF Storgården är en stabil förening med låg belåning och avgiften inkluderar värme, vatten och kabel-tv. Resecentrum ligger fem minuter bort och i kvarteren finns både matbutiker och service.',
        undefined,
        'balanced',
        { allowParagraphs: true }
      );

      expect(cleaned).toBeTruthy();
      expect(cleaned?.includes('\n\n')).toBe(true);
    });

    it('should preserve existing two-paragraph layout during sanitization', () => {
      const cleaned = sanitizeGeneratedMarketingField(
        'Storgatan 12, 3 tr, Linköping. En ljus trea om 76 kvm med balkong i söderläge.\n\nKöket är renoverat med luckor från Ballingslöv och vardagsrummet har fönster mot gården.',
        undefined,
        'balanced',
        { allowParagraphs: true }
      );

      expect(cleaned).toBeTruthy();
      expect(cleaned?.split(/\n\s*\n/).length).toBeGreaterThanOrEqual(2);
    });

    it('should flag disposition-like output as invalid', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'OBJEKTDISPOSITION\nAdress: Testgatan 1\nBoarea: 75 kvm\nRum: 3\nAvgift: 2500 kr/mån\nKommunikationer: T-bana'
      }, 'hemnet', 1, 500, 'balanced');

      expect(violations.length).toBeGreaterThan(0);
    });
  });
});
