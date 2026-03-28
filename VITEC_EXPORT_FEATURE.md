# Vitec Export-funktionalitet

## Översikt

Export till Vitec gör att mäklare kan skicka tillbaka den AI-genererade texten och uppdaterad objektdata direkt till sitt Vitec-system med ett klick.

---

## Varför är detta värdefullt?

### Problemet idag (utan export)

**Manuellt arbetsflöde** (10-15 minuter per objekt):
1. Mäklare skapar objekt i Vitec
2. Kopierar objektdata till OptiPrompt manuellt
3. Genererar text i OptiPrompt
4. **Kopierar texten tillbaka till Vitec manuellt** ⏱️
5. **Uppdaterar fält i Vitec manuellt** ⏱️
6. Publicerar från Vitec till Hemnet/Booli

**Problem**:
- Tidskrävande kopiering fram och tillbaka
- Risk för fel vid manuell kopiering
- Mäklare måste ha båda systemen öppna samtidigt
- Svårt att hålla data synkroniserad

### Lösningen (med export)

**Automatiserat arbetsflöde** (30 sekunder per objekt):
1. Mäklare importerar från Vitec till OptiPrompt ✅
2. Genererar text i OptiPrompt ✅
3. **Klickar "Exportera till Vitec"** ⭐ NYT!
4. Publicerar från Vitec till Hemnet/Booli

**Fördelar**:
- ⏱️ **Tidsvinst**: 10-15 minuter → 30 sekunder
- ✅ **Inga fel**: Automatisk synkronisering
- 🔄 **Smidig integration**: Allt i ett flöde
- 📊 **Bättre data**: Alla fält uppdateras automatiskt

---

## Vad exporteras?

### 1. AI-Genererad Text
- **Objektbeskrivning** (huvudtext)
- **Rubrik** (om genererad)
- **Kortbeskrivning** (om genererad)

### 2. Strukturerad Data
- **Upplåtelseform**: Äganderätt/Tomträtt (hus)
- **Antal lägenheter**: I föreningen (lägenheter)
- **Förskola/Skola**: Närliggande skolor
- **Affärer & Service**: Närliggande service
- **Alla andra fält** som fyllts i eller uppdaterats

### 3. Metadata
- **Senast uppdaterad**: Tidsstämpel
- **Genererad av**: OptiPrompt
- **Kvalitetspoäng**: Broker quality score

---

## Hur fungerar det tekniskt?

### Vitec Express API

Vitec erbjuder ett REST API för integration:
- **Bas-URL**: `https://vitecexpress.bovision.se`
- **Autentisering**: Bearer token (API-nyckel)
- **Format**: JSON

### Export-endpoints

```
PUT /Estate/{customerId}/{objectId}
PUT /Condominium/{customerId}/{objectId}
PUT /House/{customerId}/{objectId}
```

### Dataflöde

```
OptiPrompt                    Vitec Express API
┌─────────────┐              ┌──────────────┐
│ Genererad   │              │              │
│ text +      │──────────────>│  Vitec       │
│ objektdata  │   PUT /Estate │  Database    │
│             │<──────────────│              │
└─────────────┘   Bekräftelse └──────────────┘
```

---

## Användargränssnitt

### Export-knapp

Placeras i ResultSection efter att text genererats:

```
┌─────────────────────────────────────────┐
│ Genererad Text                          │
│ ─────────────────────────────────────── │
│                                         │
│ [Den genererade texten visas här...]   │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [Kopiera]  [Exportera till Vitec] ⭐   │
└─────────────────────────────────────────┘
```

### Export-dialog

När användaren klickar "Exportera till Vitec":

```
┌─────────────────────────────────────────┐
│ Exportera till Vitec                    │
│ ─────────────────────────────────────── │
│                                         │
│ Objekt: Karlavägen 12, Stockholm       │
│ Vitec ID: 12345                         │
│                                         │
│ Vad exporteras:                         │
│ ✓ Objektbeskrivning (AI-genererad)     │
│ ✓ Upplåtelseform (Äganderätt)          │
│ ✓ Förskola/Skola (Vasaskolan 500m)     │
│ ✓ Affärer & Service (ICA Maxi 300m)    │
│                                         │
│ [Avbryt]  [Exportera] ⭐                │
└─────────────────────────────────────────┘
```

### Bekräftelse

Efter lyckad export:

```
┌─────────────────────────────────────────┐
│ ✅ Exporterat till Vitec                │
│ ─────────────────────────────────────── │
│                                         │
│ Objektet har uppdaterats i Vitec.      │
│ Du kan nu publicera från Vitec till     │
│ Hemnet, Booli eller andra plattformar.  │
│                                         │
│ [Öppna i Vitec]  [Stäng]               │
└─────────────────────────────────────────┘
```

---

## Säkerhet & Behörigheter

### API-nyckel

- Mäklaren måste konfigurera sin Vitec API-nyckel i OptiPrompt
- Nyckeln lagras krypterad i databasen
- Endast mäklaren själv kan se/använda sin nyckel

### Behörighetskontroll

- Endast objekt som tillhör mäklarens Vitec-konto kan exporteras
- Vitec API validerar att API-nyckeln har rätt behörigheter
- Om behörighet saknas visas tydligt felmeddelande

### Dataskydd

- All kommunikation sker över HTTPS
- API-nycklar lagras aldrig i klartext
- Ingen data sparas mellan sessioner

---

## Felhantering

### Vanliga fel och lösningar

**1. Ogiltig API-nyckel**
```
❌ Fel: Ogiltig Vitec API-nyckel

Lösning:
1. Gå till Inställningar → Integrationer
2. Kontrollera att API-nyckeln är korrekt
3. Kontakta Vitec support om problemet kvarstår
```

**2. Objekt hittades inte**
```
❌ Fel: Objektet hittades inte i Vitec

Möjliga orsaker:
- Objektet har raderats från Vitec
- Objekt-ID:t är felaktigt
- Du har inte behörighet till objektet

Lösning: Importera objektet på nytt från Vitec
```

**3. Nätverksfel**
```
❌ Fel: Kunde inte ansluta till Vitec

Lösning:
- Kontrollera din internetanslutning
- Försök igen om en stund
- Kontakta support om problemet kvarstår
```

---

## Teknisk Implementation

### Backend (server/lib/vitec-export.ts)

```typescript
export interface VitecExportData {
  objectId: string;
  customerId: string;
  propertyType: "apartment" | "house" | "townhouse" | "villa";
  
  // AI-genererad text
  description: string;
  headline?: string;
  shortDescription?: string;
  
  // Strukturerad data
  landOwnership?: "aganderatt" | "tomtratt";
  brfUnits?: number;
  nearbySchools?: string;
  nearbyServices?: string;
  
  // Metadata
  generatedBy: "OptiPrompt";
  generatedAt: string;
  qualityScore?: number;
}

export async function exportToVitec(
  apiKey: string,
  customerId: string,
  data: VitecExportData
): Promise<{ success: boolean; message: string }> {
  // Implementation...
}
```

### Frontend (client/src/components/VitecExportButton.tsx)

```typescript
export function VitecExportButton({ 
  propertyData, 
  generatedText 
}: VitecExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportToVitec({
        objectId: propertyData.vitecId,
        description: generatedText,
        // ... other data
      });
      
      if (result.success) {
        toast.success("Exporterat till Vitec!");
      }
    } catch (error) {
      toast.error("Export misslyckades");
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Button onClick={() => setShowDialog(true)}>
      Exportera till Vitec
    </Button>
  );
}
```

---

## Användningsexempel

### Scenario 1: Ny lägenhet

1. Mäklare skapar objekt i Vitec
2. Importerar till OptiPrompt via Vitec-knappen
3. Genererar text med AI
4. Klickar "Exportera till Vitec"
5. Texten och all data uppdateras automatiskt i Vitec
6. Mäklaren publicerar från Vitec till Hemnet

**Tidsvinst**: 12 minuter → 1 minut

### Scenario 2: Uppdatera befintlig annons

1. Mäklare vill förbättra en befintlig annons
2. Importerar från Vitec till OptiPrompt
3. Justerar några fält och regenererar text
4. Exporterar tillbaka till Vitec
5. Uppdaterad annons publiceras automatiskt

**Tidsvinst**: 8 minuter → 30 sekunder

### Scenario 3: Bulk-uppdatering

1. Mäklare har 10 objekt som behöver bättre texter
2. Importerar alla från Vitec (batch)
3. Genererar texter för alla
4. Exporterar alla tillbaka till Vitec (batch)
5. Publicerar från Vitec

**Tidsvinst**: 2 timmar → 15 minuter

---

## Framtida Förbättringar

### Fas 2: Automatisk publicering
- Exportera direkt till Hemnet/Booli från OptiPrompt
- Hoppa över Vitec-steget helt
- Kräver Hemnet/Booli API-integration

### Fas 3: Realtidssynkronisering
- Webhook från Vitec när objekt uppdateras
- Automatisk import till OptiPrompt
- Förslag på textförbättringar

### Fas 4: Batch-export
- Exportera flera objekt samtidigt
- Schemalagd export (nattlig batch)
- Automatisk kvalitetskontroll

---

## Support & Dokumentation

### För Mäklare

**Kom igång**:
1. Skaffa Vitec API-nyckel (kontakta Vitec support)
2. Lägg till nyckeln i OptiPrompt → Inställningar → Integrationer
3. Importera ett testobjekt från Vitec
4. Generera text och exportera tillbaka

**Vanliga frågor**:
- Hur får jag en API-nyckel? → Kontakta Vitec support
- Kostar det extra? → Nej, ingår i Vitec-abonnemanget
- Kan jag exportera till andra system? → Ja, Hemnet/Booli kommer snart

### För Utvecklare

**API-dokumentation**: Se `server/lib/vitec-export.ts`
**Testning**: Se `server/tests/vitec-export.test.ts`
**Felsökning**: Kontrollera Sentry för API-fel

---

## Sammanfattning

Vitec-export är en **game-changer** för svenska mäklare:

- ⏱️ **90% tidsvinst** (15 min → 1 min)
- ✅ **Inga manuella fel**
- 🔄 **Smidig integration**
- 📊 **Bättre datakvalitet**

Detta gör OptiPrompt till en **central del av mäklarens arbetsflöde** istället för ett separat verktyg.

