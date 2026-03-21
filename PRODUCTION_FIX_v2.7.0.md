# Production Fix v2.7.0 - Hemnet-regler + Styckebrytningar

**Date:** 2026-03-21  
**Status:** KRITISK FIX - Hemnet-texter är felaktiga

## Problem Summary

Användaren rapporterade två kritiska problem:

1. **Pris/avgift nämns i Hemnet-texter** - Trots att Hemnet visar detta i separata fält
2. **Inga styckebrytningar** - Texten visas som en enda lång textmassa

## Root Cause Analysis

### Problem 1: Hemnet-ekonomi (KRITISKT)
**Root cause:** Generator-prompten instruerade GPT att lägga till avgift/driftkostnad i STYCKE 5:
```
"Avsluta med avgift och ev. driftkostnad."
```

Detta är HELT FEL för Hemnet där pris/avgift visas i separata fält.

### Problem 2: Styckebrytningar
**Status:** Delvis löst i v2.6.1 (TextEditor fix), men InlineHighlights kan fortfarande ha problem.

## Changes Made

### 1. Generator - Hemnet STYCKE 5 (KRITISK FIX)
**File:** `server/lib/perfect-swedish-generator.ts`

**Före:**
```
STYCKE 5 — LÄGE, KOMMUNIKATIONER, EKONOMI (2–3 meningar)
...Avsluta med avgift och ev. driftkostnad.
```

**Efter:**
```
STYCKE 5 — LÄGE OCH KOMMUNIKATIONER (2–3 meningar)
...VIKTIGT: NÄMN INTE pris, avgift eller driftkostnad — det visas i separata fält på Hemnet.
```

**Ändring i Plattformsregler:**
```diff
+ - NÄMN ALDRIG pris, utgångspris, avgift eller driftkostnad — det visas i separata fält på Hemnet
```

### 2. Generator - PROMPT_VERSION bump
**File:** `server/lib/perfect-swedish-generator.ts`
- Bumped from `2.6.0` → `2.7.0` för att busta Redis cache

### 3. Analyzer - Hemnet-validering
**File:** `server/lib/perfect-swedish-analyzer.ts`

Lade till i Hemnet-specifika regler:
```diff
+ - Pris, avgift eller driftkostnad FÅR INTE nämnas i huvudtexten (visas i separata fält) → severity: "critical"
```

## Platform-Specific Rules (Clarification)

### Hemnet
- **Ekonomi:** NÄMN INTE (visas i separata fält)
- **Energiklass:** NÄMN INTE (visas separat)
- **Struktur:** 4-5 stycken, faktadriven
- **Stycke 5:** Läge + kommunikationer (INGEN ekonomi)

### Booli
- **Ekonomi:** KAN nämnas ("Avgift och driftkostnad")
- **Energiklass:** KAN nämnas om säljargument
- **Struktur:** 4-5 stycken, mer berättande ton
- **Stycke 5:** Läge + ekonomi

### Egen sida
- **Ekonomi:** KAN nämnas ("Utgångspris X kr")
- **Energiklass:** KAN nämnas
- **Struktur:** Friare, 4-5 stycken
- **Stycke 5:** Läge + ekonomi

## Testing Checklist

- [ ] Build passes (`npm run build`)
- [ ] TypeScript check passes (`npm run check`)
- [ ] Test Hemnet generation - verify NO price/fee in text
- [ ] Test Booli generation - verify price/fee CAN be in text
- [ ] Test paragraph breaks are visible in UI
- [ ] Test expert feedback appears
- [ ] Check production logs for violations

## Expected Behavior After Fix

### Hemnet Text Example (CORRECT)
```
Helrenoverat kök 2022 med köksö och södervända balkongen ger den här 3:an på Södermalm ett tydligt övertag.

Planlösningen samlar kök och vardagsrum i vinkel, med skjutdörrar ut mot den södervända uteplatsen. Köket har kompositbänk, gott om förvaring och integrerade Siemens-vitvaror.

Tre sovrum fungerar väl som barnrum, gästrum eller hemmakontor. Två helkaklade badrum renoverades 2021 med duschvägg i glas och badkar.

Södermalm med närhet till Medborgarplatsen och Skanstull. Tunnelbanan nås på 5 minuter och Coop finns runt hörnet.
```

**Note:** INGEN mention av avgift, pris eller driftkostnad!

### Booli Text Example (CORRECT)
```
[Same structure but can end with:]

Södermalm med närhet till Medborgarplatsen. Tunnelbanan nås på 5 minuter. Avgift 4 500 kr/mån, driftkostnad 800 kr/mån.
```

## Deployment

1. Commit changes
2. Push to main
3. Render auto-deploys
4. Monitor logs for Hemnet violations
5. Test with real Hemnet property data

## Rollback Plan

If issues persist:
1. Revert PROMPT_VERSION to 2.6.0
2. Revert generator changes
3. Investigate why GPT ignores instructions

## Notes

- This fix addresses a FUNDAMENTAL misunderstanding of Hemnet platform rules
- The previous prompt was actively instructing GPT to do the WRONG thing
- Analyzer now validates and flags price/fee mentions as "critical" for Hemnet
- Paragraph breaks issue from v2.6.1 should also be resolved with TextEditor fix
