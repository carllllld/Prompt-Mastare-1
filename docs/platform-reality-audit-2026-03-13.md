# Plattform Reality Audit — Hemnet/Booli (2026-03-13)

## Syfte
Säkerställa att verktygets textregler följer verklig mäklarpraxis på plattformarna, inte bara interna antaganden.

## Extern verklighetsbas (källor)
- FMI: objektsbeskrivning och boarea/rum är centrala, och marknadsföring får inte vara vilseledande.
- FMI: marknadsföring ska stämma med verkligheten, och viktig information får inte utelämnas om det vilseleder.
- Booli: Booli är en söktjänst som speglar annonser från mäklarsystem/hemsidor, inte en separat annonsplats med egen textstandard.

## Slutsatser om faktisk praxis
- Hemnet/övriga mäklarsajter: huvudtexten är säljande prosa, medan många hårda fakta även ligger i faktasektioner.
- Boarea och rum är särskilt känsliga och måste vara korrekta i marknadsföring.
- Kök, badrum och kommunikation är i praktiken ofta avgörande i löptext för köpbeslut.
- Avgift/driftskostnad är viktig, men behöver inte alltid ligga i löptext om den redan framgår tydligt i faktadelen.
- Booli kräver inte egen separat copy-standard; kvaliteten styrs primärt av den ursprungliga annonsens kvalitet.

## Audit mot nuvarande kod
### 1) Kritiska signaler och täckning
- Status: förbättrad.
- Nuvarande logik mäter och gate:ar explicit kritiska fält (boarea, rum, kök, badrum, kommunikation) i sluttexten.
- Numeriska signaler och språkvariationer fångas bättre än tidigare.

### 2) Finalisering av huvudtext
- Status: förbättrad.
- Finalisering kompletterar texten om kritiska faktagrupper saknas trots att de finns i dispositionen.
- Detta minskar risken för publicering av text med låg beslutsrelevant information.

### 3) Avgift/driftskostnad i huvudtext
- Status: justerad enligt praxis.
- Promptregeln är ändrad från implicit “ska alltid vävas in” till “väv in när beslutsdrivande; annars faktadel räcker”.
- Enhetskrav kvarstår om kostnad nämns.

### 4) Booli-specifikt
- Status: bedömning uppdaterad.
- Booli hanteras som kanal/spegel av mäklarannons, inte som plattform med hård egen copy-policy.

## Gap som nu bedöms stängda
- Falskt låg input-signal coverage vid numeriska eller semantiska variationer.
- Sluttexter som tappat kök/badrum/kommunikation trots att underlag innehåller detta.
- Överstyrning av avgiftsnämning i huvudtext utan hänsyn till faktisk annonspraxis.

## Rekommenderad driftpolicy framåt
- Behåll hård gate för boarea, rum, kök, badrum, kommunikation när underlag innehåller dem.
- Behåll kostnadsenhetsvalidering när kostnad nämns.
- Behandla avgift/driftskostnad som kontextstyrd i löptext, inte absolut krav i varje text.
- Re-audita kvartalsvis mot FMI och plattformsdokumentation.
