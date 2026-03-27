# Djupanalys: Form Layout & Struktur

**Datum:** 27 mars 2026  
**Fokus:** Helhetsbild av formulärets layout, struktur och användarflöde

---

## 1. NUVARANDE STRUKTUR - PROBLEM

### 1.1 Scrollning Problem
- Formuläret är långt och kräver mycket scrollning
- Användare måste scrolla upp och ner för att fylla i alla fält
- Svårt att få överblick över vad som är gjort och vad som återstår
- Mäklare behöver ofta gå tillbaka för att ändra tidigare fält

### 1.2 Visuell Hierarki Problem
- Ingen tydlig separation mellan stora sektioner
- Svårt att se vilka fält som är kritiska vs valfria
- Ingen visuell "container" runt relaterade fält
- Allt ser ut som en lång lista

### 1.3 Fält-organisering Problem
- Många fält är spridda utan logisk gruppering
- Relaterade fält ligger långt ifrån varandra
- Ingen tydlig "flöde" genom formuläret
- Användare vet inte var de ska börja

### 1.4 Mobil/Responsiv Problem
- Formuläret är inte optimerat för mindre skärmar
- Scrollning blir ännu värre på mobil
- Fält blir väldigt små på mobil
- Inte användarvänligt för mäklare på fältet

---

## 2. MÄKLARE PERSPEKTIV - VAD BEHÖVS

### 2.1 Typisk Mäklare Workflow
1. **Snabbt:** Importera från Hemnet/Vitec (auto-fill)
2. **Essentiell:** Fylla i kritiska fält (adress, boarea, rum)
3. **Bilder:** Ladda upp objektbilder
4. **Detaljer:** Fylla i beskrivningar (kök, badrum, läge)
5. **Specialfunktioner:** Lägga till unika egenskaper
6. **Generera:** Skapa text och exportera

### 2.2 Mäklare Behov
- Snabb överblick över vad som är gjort
- Tydlig indikation på vad som är obligatoriskt
- Möjlighet att se allt på en gång (eller nästan)
- Snabb navigation mellan sektioner
- Möjlighet att gå tillbaka och ändra utan att scrolla mycket

### 2.3 Mäklare Frustration
- För mycket scrollning
- Svårt att se helbilden
- Inte klart vad som är viktigt
- Tar för lång tid att fylla i
- Måste scrolla upp och ner flera gånger

---

## 3. LAYOUT ALTERNATIV

### Alternativ A: Nuvarande (Scrollbar)
```
┌─────────────────────────────────┐
│ Progress Indicator              │
├─────────────────────────────────┤
│ Essential Fields                │
├─────────────────────────────────┤
│ Images                          │
├─────────────────────────────────┤
│ Kitchen Details                 │
├─────────────────────────────────┤
│ Bathroom Details                │
├─────────────────────────────────┤
│ ... många fler sektioner ...    │
├─────────────────────────────────┤
│ Submit Button                   │
└─────────────────────────────────┘
↓ SCROLLBAR - Mycket scrollning
```

**Problem:** Långt, kräver scrollning, svårt att få överblick

---

### Alternativ B: Multi-Column Layout (Rekommenderat)
```
┌──────────────────────────────────────────────────────────────┐
│ Progress & Status (Top)                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ ESSENTIELL          │  │ BILDER              │           │
│  │ - Adress            │  │ - Upload area       │           │
│  │ - Boarea            │  │ - Galleriet         │           │
│  │ - Rum/Badrum        │  │ - Från Hemnet       │           │
│  │ - Byggår            │  │                     │           │
│  │ - Energiklass       │  │                     │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ KÖK & BADRUM        │  │ LÄGE & TRANSPORT    │           │
│  │ - Kök chips         │  │ - Område            │           │
│  │ - Badrum chips      │  │ - Transport         │           │
│  │ - Fritext           │  │ - Parkering         │           │
│  │                     │  │ - Utsikt            │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ MATERIAL & TEKNIK   │  │ FÖRSÄLJNINGSARGUMENT│           │
│  │ - Golv              │  │ - USP chips         │           │
│  │ - Uppvärmning       │  │ - Fritext           │           │
│  │ - Konstruktion      │  │                     │           │
│  │ - Taktyp            │  │                     │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │ SUBMIT BUTTON                                │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Fördelar:**
- Ingen scrollning (eller minimal)
- Alla sektioner synliga på en gång
- Tydlig visuell separation
- Logisk gruppering
- Mäklare kan se helbilden

---

### Alternativ C: Tabbed Interface
```
┌──────────────────────────────────────────────────────────────┐
│ [ESSENTIELL] [BILDER] [DETALJER] [MATERIAL] [FÖRSÄLJNING]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────┐            │
│  │ ESSENTIELL INFORMATION                      │            │
│  │ - Adress                                    │            │
│  │ - Boarea                                    │            │
│  │ - Rum/Badrum                                │            │
│  │ - Byggår                                    │            │
│  │ - Energiklass                               │            │
│  │ - Pris                                      │            │
│  │ - Avgift                                    │            │
│  │ - Skick                                     │            │
│  │ - Våning/Hiss                               │            │
│  │                                             │            │
│  │ [NÄSTA TAB]                                 │            │
│  └─────────────────────────────────────────────┘            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Fördelar:**
- Fokuserad på en sektion åt gången
- Mindre överbelastning
- Tydlig progression

**Nackdelar:**
- Måste klicka mellan tabs
- Svårare att se helbilden
- Mer klick för mäklare

---

## 4. REKOMMENDATION: HYBRID LAYOUT

Kombinera det bästa från båda:

### 4.1 Struktur
```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Progress Bar + Status                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ MAIN CONTENT (2-3 kolumner):                               │
│                                                             │
│ ┌──────────────────┐  ┌──────────────────┐                │
│ │ ESSENTIELL       │  │ BILDER           │                │
│ │ (Obligatorisk)   │  │ (Viktigt)        │                │
│ │                  │  │                  │                │
│ │ Compact layout   │  │ Upload area      │                │
│ │ Alla fält synliga│  │ Galleriet        │                │
│ └──────────────────┘  └──────────────────┘                │
│                                                             │
│ ┌──────────────────┐  ┌──────────────────┐                │
│ │ KÖK & BADRUM     │  │ LÄGE & TRANSPORT │                │
│ │ (Viktigt)        │  │ (Viktigt)        │                │
│ │                  │  │                  │                │
│ │ Chips + fritext  │  │ Chips + fritext  │                │
│ └──────────────────┘  └──────────────────┘                │
│                                                             │
│ ┌──────────────────┐  ┌──────────────────┐                │
│ │ MATERIAL & TEKNIK│  │ FÖRSÄLJNINGSARG. │                │
│ │ (Valfritt)       │  │ (Viktigt)        │                │
│ │                  │  │                  │                │
│ │ Collapsible      │  │ Chips + fritext  │                │
│ └──────────────────┘  └──────────────────┘                │
│                                                             │
│ ┌──────────────────────────────────────────┐              │
│ │ SUBMIT BUTTON (Sticky Bottom)            │              │
│ └──────────────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Fördelar
- ✓ Minimal scrollning (bara för långa sektioner)
- ✓ Alla viktiga sektioner synliga
- ✓ Tydlig visuell separation (boxar)
- ✓ Logisk gruppering
- ✓ Mäklare kan se helbilden
- ✓ Responsiv (staplas på mobil)
- ✓ Snabb att fylla i

---

## 5. CONTAINER DESIGN

### 5.1 Varje Sektion = Tydlig Box
```
┌─────────────────────────────────────────┐
│ TITEL (Obligatorisk/Viktigt/Valfritt)  │
├─────────────────────────────────────────┤
│                                         │
│ Fält 1: [Input]                        │
│ Fält 2: [Input]                        │
│ Fält 3: [Chips]                        │
│                                         │
│ [Expandera] eller [Dölj]               │
│                                         │
└─────────────────────────────────────────┘
```

### 5.2 Visuell Hierarki
- **Obligatorisk:** Röd/Orange border, högre prioritet
- **Viktigt:** Blå border, medium prioritet
- **Valfritt:** Grå border, låg prioritet
- **Collapsible:** Kan döljas för att spara plats

---

## 6. RESPONSIVE DESIGN

### Desktop (1400px+)
```
┌─────────────────────────────────────────────────────────┐
│ [Box1] [Box2]                                           │
│ [Box3] [Box4]                                           │
│ [Box5] [Box6]                                           │
└─────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1399px)
```
┌─────────────────────────────────────────────────────────┐
│ [Box1]                                                  │
│ [Box2]                                                  │
│ [Box3]                                                  │
│ [Box4]                                                  │
└─────────────────────────────────────────────────────────┘
```

### Mobil (< 768px)
```
┌─────────────────────────────────────────┐
│ [Box1]                                  │
│ [Box2]                                  │
│ [Box3]                                  │
│ [Box4]                                  │
│ [Box5]                                  │
│ [Box6]                                  │
└─────────────────────────────────────────┘
```

---

## 7. IMPLEMENTERING STEG

### Steg 1: Reorganisera Sektioner
- Gruppera relaterade fält
- Skapa tydliga containers
- Definiera prioritet för varje sektion

### Steg 2: Implementera Grid Layout
- 2-3 kolumner på desktop
- 1 kolumn på mobil
- Sticky header med progress
- Sticky footer med submit button

### Steg 3: Visuell Design
- Tydliga boxar runt varje sektion
- Färgkodning för prioritet
- Tydlig typografi
- Konsistent spacing

### Steg 4: Interaktivitet
- Collapsible sektioner för valfria fält
- Smooth scrolling mellan sektioner
- Keyboard navigation
- Responsive design

---

## 8. FÖRVÄNTADE RESULTAT

### Före
- Långt formulär med mycket scrollning
- Svårt att få överblick
- Mäklare frustrerad
- Många fel pga. glömda fält

### Efter
- Kompakt layout utan scrollning
- Tydlig överblick
- Mäklare nöjd
- Färre fel
- Snabbare att fylla i
- Professionell utseende

---

## 9. NÄSTA STEG

1. Godkänn layout-koncept
2. Skapa wireframes
3. Implementera grid-layout
4. Testa på desktop/tablet/mobil
5. Samla feedback från mäklare
6. Iterera och förbättra
