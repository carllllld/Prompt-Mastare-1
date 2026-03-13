# Launch Gate — Fullständig appgranskning

## Syfte
Detta dokument är en full launch-gate för hela appen före publik marknadsföring och betalande användare.

## Omfattning
- Frontend: onboarding, appflöde, historik, team, prompt-editor, settings.
- Backend: auth, session, API, AI-pipeline, betalning, email, usage limits.
- Data: schema, kvotlogik, driftkrav.
- Säkerhet: signaturer, origin-skydd, middleware, hemligheter.
- Drift: build, start, health, loggning, monitorering, deployment-entrypoint.
- Kommersiellt: abonnemang, kvoter, planvisning och webhook-synk.

## Automatiska kontroller
Kör:

```bash
npm run launch:gate
npm run test
npm run check
npm run build
```

## Gate-regler
Alla punkter med ❌ måste vara lösta för GO.

### 1) Kod- och releasekvalitet
- ✅ test/check/build ska passera i huvudgrenen.
- ✅ kritiska moduler för klient/server/schema måste finnas.
- ✅ startscript och buildscript måste vara konsistenta.

### 2) Affärskritiska flöden
- ✅ auth + session + användarstatus måste fungera.
- ✅ Stripe checkout + webhook + planuppdatering måste fungera.
- ✅ usage limits och reset måste visas korrekt i UI och följas i backend.
- ✅ AI-generering och eftervalidering måste stoppa underkänd text.

### 3) Plattformskrav och textkvalitet
- ✅ plattformsspecifika regler (Hemnet/Booli) ska följas.
- ✅ saknade enheter, trasiga meningar, frasloopar och CTA-fel i extratexter ska blockeras eller saneras.
- ✅ låg faktatäckning eller låg signalanvändning ska kunna blockera leverans.

### 4) Säkerhet
- ✅ Stripe-webhook signatur måste verifieras.
- ✅ Email-webhook signatur måste verifieras innan produktion.
- ✅ central säkerhetsmiddleware ska vara tydligt inkopplad eller tas bort om ersatt av annan strategi.
- ✅ sessionsäkerhet och production env-kontroller ska vara aktiva.

### 5) Drift och observability
- ✅ /health ska returnera korrekt databasstatus.
- ✅ monitorering får inte rapportera simulerade produktionstal.
- ✅ deployment-entrypoint måste matcha producerad artefakt.
- ✅ request-id och serverloggar ska finnas i API-flöden.

### 6) Operativ beredskap
- ⚠️ incidentrutin (vem gör vad vid betal-/API-fel) ska finnas dokumenterad.
- ⚠️ backup/restore-verifiering ska vara testad i praktiken.
- ⚠️ supportflöde för abonnemang/återbetalning ska vara fastställt.

## Kända blockerare och varningar (från kodbasen)
- Inga öppna kodblockerare från launch-gate.

## Go/No-Go policy
- GO: 0 blockerare och endast accepterade varningar med tydlig ägare.
- NO-GO: minst 1 blockerare kvar.

## Rekommenderad ordning för sista milen
1. Kör launch-gate + full test/check/build inför varje release.
2. Verifiera webhook-hemligheter i produktionsmiljön.
3. Dokumentera incident-, backup- och supportrutiner operativt.
