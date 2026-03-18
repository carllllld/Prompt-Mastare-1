# Requirements Document

## Introduction

OptiPrompt är en AI-driven SaaS-plattform för att generera fastighetsbeskrivningar på svenska. Formuläret PromptFormProfessional är den primära inputytan där mäklare fyller i objektdata. Nuvarande implementation har flera UX-problem som påverkar användbarhet och effektivitet: låg textkontrast mot vit bakgrund, förvirrande dubbletter av fält (t.ex. golvvärme finns både i badrum och uppvärmning), otydlig vägledning om vad som är nödvändigt för bra resultat, och svårigheter att hitta och förstå information i appen.

Denna specifikation definierar krav för att åtgärda dessa problem och skapa en intuitiv, effektiv formulärupplevelse som guidar mäklare att fylla i rätt information i rätt ordning.

## Glossary

- **Form_Component**: PromptFormProfessional React-komponenten som hanterar objektdatainmatning
- **Chip_Selector**: Interaktiva knappar för att välja fördefinierade alternativ (t.ex. "Golvvärme", "Renoverat kök")
- **Priority_Checklist**: Visuell indikator som visar vilka fält som är viktigast för textgenerering
- **Field_Group**: Logisk gruppering av relaterade formulärfält
- **Contrast_Ratio**: WCAG-standard för läsbarhet, minimum 4.5:1 för normal text
- **Design_Token**: CSS-variabel som definierar färger, typsnitt och spacing
- **Duplicate_Field**: Fält eller chip som representerar samma koncept på flera ställen
- **Helper_Text**: Förklarande text under eller bredvid ett fält
- **Visual_Hierarchy**: Tydlig skillnad mellan primära, sekundära och tertiära element

## Requirements

### Requirement 1: Förbättra textkontrast för läsbarhet

**User Story:** Som mäklare vill jag kunna läsa alla etiketter och hjälptexter tydligt mot bakgrunden, så att jag inte behöver anstränga mig för att se vad som står.

#### Acceptance Criteria

1. THE Form_Component SHALL uppdatera alla text-gray-400 (#9CA3AF) färger till minst text-gray-600 (#4B5563) för att uppnå WCAG AA-kontrast (4.5:1) mot vit bakgrund
2. THE Form_Component SHALL uppdatera alla text-gray-500 (#6B7280) färger till minst text-gray-700 (#374151) för primära etiketter
3. THE Design_Token `--muted-foreground` SHALL ändras från HSL 216 12% 42% till HSL 216 12% 32% för bättre kontrast
4. WHEN Helper_Text visas med text-[10px], THEN THE Form_Component SHALL använda minst text-gray-600 (#4B5563) färg
5. THE Form_Component SHALL säkerställa att alla interaktiva element (knappar, länkar) har minst 3:1 kontrast mot bakgrund enligt WCAG AA för stora element

### Requirement 2: Eliminera förvirrande fältdubbletter

**User Story:** Som mäklare vill jag inte se samma alternativ på flera ställen i formuläret, så att jag slipper förvirring om var jag ska fylla i information.

#### Acceptance Criteria

1. WHEN "Golvvärme" finns i både BATHROOM_CHIPS och HEATING_CHIPS, THEN THE Form_Component SHALL ta bort "Golvvärme" från BATHROOM_CHIPS och behålla den endast i HEATING_CHIPS
2. WHEN användaren väljer "Laddbox för elbil" i PARKING_CHIPS, THEN THE Form_Component SHALL automatiskt exkludera motsvarande alternativ från specialFeatures-fältet
3. THE Form_Component SHALL konsolidera renoveringsinformation genom att skapa en dedikerad "Renoveringar"-sektion istället för att sprida den över kitchenDescription, bathroomDescription och renoveringsar
4. WHEN Chip_Selector innehåller överlappande alternativ, THEN THE Form_Component SHALL normalisera dessa till en kanonisk representation enligt aliasRules
5. THE Form_Component SHALL visa en varning IF användaren försöker ange samma information i både chips och fritext-fält

### Requirement 3: Förtydliga fältprioritet och vägledning

**User Story:** Som mäklare vill jag tydligt se vilka fält som är viktigast att fylla i, så att jag kan fokusera på det som ger bäst resultat.

#### Acceptance Criteria

1. THE Priority_Checklist SHALL visas prominent högst upp i formuläret med större typsnitt (text-sm istället för text-xs)
2. WHEN ett prioriterat fält är tomt, THEN THE Form_Component SHALL visa en visuell indikator (t.ex. pulsande punkt eller subtil highlight) vid fältet
3. THE Form_Component SHALL gruppera fält i tre visuella nivåer: "Kritiskt" (röd/orange accent), "Viktigt" (grön accent), "Valfritt" (grå accent)
4. WHEN användaren hovrar över Priority_Checklist-objekt, THEN THE Form_Component SHALL scrolla till och highlighta motsvarande fält
5. THE Form_Component SHALL visa en progress-indikator som visar "Grundläggande (0-40%)", "Bra (40-70%)", "Utmärkt (70-100%)" baserat på ifyllda prioriterade fält
6. WHEN användaren försöker skicka formuläret med färre än 4 av 7 prioriterade fält ifyllda, THEN THE Form_Component SHALL visa en bekräftelsedialog som förklarar att resultatet kan bli sämre

### Requirement 4: Förbättra formulärstruktur och informationsarkitektur

**User Story:** Som mäklare vill jag enkelt hitta och förstå var jag ska fylla i olika typer av information, så att jag kan arbeta effektivt utan att leta.

#### Acceptance Criteria

1. THE Form_Component SHALL organisera fält i tydliga Field_Groups med visuella separatorer och ikoner: "Grundfakta", "Utrymmen", "Material & Teknik", "Läge & Omgivning", "Försäljningsargument"
2. WHEN "Mer detaljer"-sektionen innehåller viktiga fält (fastighetsbeteckning, taxeringsvärde), THEN THE Form_Component SHALL flytta dessa till huvudvyn eller markera expandern tydligare
3. THE Form_Component SHALL visa Field_Groups i en logisk ordning som matchar Priority_Checklist: Grundfakta → Försäljningsargument → Utrymmen → Material → Övrigt
4. WHEN användaren expanderar en Field_Group, THEN THE Form_Component SHALL spara detta tillstånd i localStorage så att det bevaras mellan sessioner
5. THE Form_Component SHALL visa en "Fältguide"-knapp som öppnar en sidebar med förklaringar av varje fält och exempel på bra input

### Requirement 5: Förtydliga fältpåverkan på output

**User Story:** Som mäklare vill jag förstå hur varje fält påverkar den genererade texten, så att jag kan prioritera rätt information.

#### Acceptance Criteria

1. THE Form_Component SHALL visa en ikon eller badge vid varje fält som indikerar om det påverkar "Huvudtext", "Rubrik", "Socialt inlägg", "Alla texter" eller "Metadata"
2. WHEN användaren hovrar över fältets påverkan-ikon, THEN THE Form_Component SHALL visa en tooltip med exempel: "Detta fält används i: Objektbeskrivning (huvudstycke), Visningsinbjudan"
3. THE Form_Component SHALL gruppera fält visuellt baserat på deras primära påverkan med färgkodning
4. WHEN ett fält påverkar juridiska aspekter (fastighetsbeteckning, taxeringsvärde), THEN THE Form_Component SHALL markera detta med en särskild "Juridiskt"-badge
5. THE Form_Component SHALL visa en "Förhandsgranska påverkan"-knapp som visar en mock-up av hur ifyllda fält mappar till olika textdelar

### Requirement 6: Förbättra visuell hierarki och spacing

**User Story:** Som mäklare vill jag att formuläret ska kännas luftigt och organiserat, så att jag inte blir överväldigad av information.

#### Acceptance Criteria

1. THE Form_Component SHALL öka spacing mellan Field_Groups från gap-4 till gap-6 (1.5rem)
2. THE Form_Component SHALL använda konsekvent padding: Field_Groups (p-5), Chips (gap-2), Input-fält (py-3)
3. WHEN Chip_Selector innehåller fler än 8 chips, THEN THE Form_Component SHALL visa dem i en scrollbar container med max-höjd istället för att wrappa
4. THE Form_Component SHALL använda olika border-radius för olika element-typer: Inputs (rounded-lg), Chips (rounded-full), Cards (rounded-xl)
5. THE Form_Component SHALL minska visuellt brus genom att ta bort onödiga borders och istället använda subtila bakgrundsfärger för att separera sektioner

### Requirement 7: Implementera smart fältvalidering och feedback

**User Story:** Som mäklare vill jag få omedelbar feedback när jag fyller i fält felaktigt eller saknar viktig information, så att jag kan korrigera innan jag genererar text.

#### Acceptance Criteria

1. WHEN användaren lämnar ett numeriskt fält (livingArea, price) tomt eller med ogiltigt format, THEN THE Form_Component SHALL visa inline-validering med förslag på korrekt format
2. WHEN användaren fyller i adress-fältet, THEN THE Form_Component SHALL automatiskt föreslå att köra adressuppslag (om Pro/Premium) med en prominent knapp
3. THE Form_Component SHALL visa en "Kvalitetsindikator" som beräknas baserat på: antal ifyllda prioriterade fält, textlängd i fritext-fält, antal valda chips
4. WHEN användaren väljer chips som motsäger varandra (t.ex. "Nyskick" + "Behöver renoveras"), THEN THE Form_Component SHALL visa en varning
5. THE Form_Component SHALL spara formulärdata automatiskt var 10:e sekund och visa en "Senast sparad"-timestamp

### Requirement 8: Optimera Chip Selector-komponenten

**User Story:** Som mäklare vill jag snabbt kunna välja och avvälja alternativ med tydlig visuell feedback, så att jag effektivt kan beskriva objektet.

#### Acceptance Criteria

1. THE Chip_Selector SHALL öka font-size från text-[11px] till text-xs (12px) för bättre läsbarhet
2. WHEN en chip är vald, THEN THE Chip_Selector SHALL visa en checkmark-ikon inuti chipen för tydligare bekräftelse
3. THE Chip_Selector SHALL använda mer distinkta färger för olika kategorier: Kök (amber), Badrum (blue), Material (slate), Uppvärmning (red)
4. WHEN användaren hovrar över en chip, THEN THE Chip_Selector SHALL visa en tooltip med mer information om vad alternativet innebär
5. THE Chip_Selector SHALL stödja keyboard-navigation: Tab för att navigera, Space för att välja/avvälja
6. WHEN en chip-kategori har fler än 12 alternativ, THEN THE Chip_Selector SHALL visa en "Visa fler"-knapp istället för att visa alla direkt

### Requirement 9: Förbättra responsiv design för mobila enheter

**User Story:** Som mäklare vill jag kunna använda formuläret på min telefon eller surfplatta, så att jag kan fylla i data på visningar.

#### Acceptance Criteria

1. WHEN skärmbredden är mindre än 640px, THEN THE Form_Component SHALL stapla Priority_Checklist vertikalt med större touch-targets (min 44px höjd)
2. THE Form_Component SHALL använda sticky positioning för "Generera"-knappen på mobil så att den alltid är tillgänglig
3. WHEN användaren är på mobil, THEN THE Chip_Selector SHALL öka padding till py-2 px-3 för bättre touch-targets
4. THE Form_Component SHALL dölja mindre viktiga Field_Groups som collapsed by default på skärmar under 768px
5. WHEN användaren scrollar på mobil, THEN THE Form_Component SHALL visa en floating progress-indikator som visar hur många prioriterade fält som är ifyllda

### Requirement 10: Implementera kontextuell hjälp och onboarding

**User Story:** Som ny användare vill jag få vägledning första gången jag använder formuläret, så att jag förstår hur jag får bäst resultat.

#### Acceptance Criteria

1. WHEN användaren öppnar formuläret för första gången, THEN THE Form_Component SHALL visa en interaktiv tour som highlightar Priority_Checklist, viktiga fält och "Generera"-knappen
2. THE Form_Component SHALL visa kontextuella tips vid specifika fält baserat på användarens beteende (t.ex. "Tips: Lägg till renoveringsår för bättre resultat" när användaren fyller i kitchenDescription)
3. WHEN användaren har genererat färre än 3 texter, THEN THE Form_Component SHALL visa en "Nybörjarläge"-toggle som ger extra vägledning
4. THE Form_Component SHALL ha en "?"-ikon vid varje Field_Group som öppnar en popover med best practices och exempel
5. WHEN användaren lämnar ett viktigt fält tomt i 30 sekunder, THEN THE Form_Component SHALL visa en subtil animation som drar uppmärksamhet till fältet

### Requirement 11: Förbättra felhantering och återhämtning

**User Story:** Som mäklare vill jag inte förlora mitt arbete om något går fel, så att jag slipper fylla i allt igen.

#### Acceptance Criteria

1. THE Form_Component SHALL spara formulärtillstånd (inklusive chips) till localStorage var 10:e sekund
2. WHEN användaren återvänder till formuläret efter att ha stängt fliken, THEN THE Form_Component SHALL visa en "Återställ senaste utkast"-banner om sparad data finns
3. WHEN ett API-anrop misslyckas, THEN THE Form_Component SHALL behålla all formulärdata och visa en "Försök igen"-knapp
4. THE Form_Component SHALL exportera formulärdata som JSON via en "Exportera data"-knapp för backup
5. WHEN användaren klickar "Rensa formulär", THEN THE Form_Component SHALL visa en bekräftelsedialog och erbjuda att spara nuvarande data först

### Requirement 12: Optimera prestanda och laddningstider

**User Story:** Som mäklare vill jag att formuläret ska kännas snabbt och responsivt, så att jag inte behöver vänta på UI-uppdateringar.

#### Acceptance Criteria

1. THE Form_Component SHALL använda React.memo för Chip_Selector och NumberStepper för att undvika onödiga re-renders
2. WHEN användaren skriver i ett fritext-fält, THEN THE Form_Component SHALL debounce localStorage-sparning med 500ms
3. THE Form_Component SHALL lazy-loada "Mer detaljer"-sektionen så att den inte renderas förrän användaren expanderar den
4. WHEN formuläret innehåller fler än 50 interaktiva element, THEN THE Form_Component SHALL använda virtualisering för långa chip-listor
5. THE Form_Component SHALL preloada kritiska assets (ikoner, typsnitt) för att minimera layout shift vid första rendering
