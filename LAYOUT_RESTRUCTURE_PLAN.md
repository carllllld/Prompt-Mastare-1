# Layout Restructure Plan

## Ny Grid-struktur för PromptFormProfessional

### Desktop Layout (3 kolumner)
```
┌─────────────────────────────────────────────────────────────────┐
│ STICKY HEADER: Progress Bar                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ │ ESSENTIELL       │  │ BILDER           │  │ FÖRSÄLJNINGSARG. │
│ │ (Critical)       │  │ (Important)      │  │ (Important)      │
│ │                  │  │                  │  │                  │
│ │ - Adress         │  │ - Upload         │  │ - USP chips      │
│ │ - Boarea         │  │ - Galleriet      │  │ - Fritext        │
│ │ - Rum/Badrum     │  │ - Från Hemnet    │  │                  │
│ │ - Byggår         │  │                  │  │                  │
│ │ - Energiklass    │  │                  │  │                  │
│ │ - Pris/Avgift    │  │                  │  │                  │
│ │ - Skick          │  │                  │  │                  │
│ │ - Våning/Hiss    │  │                  │  │                  │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘
│                                                                 │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ │ KÖK & BADRUM     │  │ LÄGE & TRANSPORT │  │ MATERIAL & TEKNIK│
│ │ (Important)      │  │ (Important)      │  │ (Optional)       │
│ │                  │  │                  │  │                  │
│ │ - Kök chips      │  │ - Område         │  │ - Golv           │
│ │ - Badrum chips   │  │ - Transport      │  │ - Uppvärmning    │
│ │ - Fritext        │  │ - Parkering      │  │ - Konstruktion   │
│ │                  │  │ - Utsikt         │  │ - Taktyp         │
│ │                  │  │                  │  │                  │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘
│                                                                 │
│ ┌──────────────────────────────────────────────────────────────┐
│ │ PLANLÖSNING & DETALJER (Optional - Collapsible)             │
│ │ - Layout                                                     │
│ │ - Trädgård                                                   │
│ │ - Specialfunktioner                                          │
│ │ - Övrigt                                                     │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ STICKY FOOTER: [SUBMIT BUTTON]                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tablet Layout (2 kolumner)
```
┌─────────────────────────────────────────────────────────────────┐
│ STICKY HEADER: Progress Bar                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────────────────────┐  ┌──────────────────────────┐     │
│ │ ESSENTIELL               │  │ BILDER                   │     │
│ │ (Critical)               │  │ (Important)              │     │
│ └──────────────────────────┘  └──────────────────────────┘     │
│                                                                 │
│ ┌──────────────────────────┐  ┌──────────────────────────┐     │
│ │ KÖK & BADRUM             │  │ LÄGE & TRANSPORT         │     │
│ │ (Important)              │  │ (Important)              │     │
│ └──────────────────────────┘  └──────────────────────────┘     │
│                                                                 │
│ ┌──────────────────────────┐  ┌──────────────────────────┐     │
│ │ FÖRSÄLJNINGSARGUMENT     │  │ MATERIAL & TEKNIK        │     │
│ │ (Important)              │  │ (Optional)               │     │
│ └──────────────────────────┘  └──────────────────────────┘     │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────────┐
│ │ PLANLÖSNING & DETALJER (Optional - Collapsible)             │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ STICKY FOOTER: [SUBMIT BUTTON]                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (1 kolumn)
```
┌─────────────────────────────────────────────────────────────────┐
│ STICKY HEADER: Progress Bar                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────────────────────────────────────────────────────────┐
│ │ ESSENTIELL (Critical)                                        │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
│ ┌──────────────────────────────────────────────────────────────┐
│ │ BILDER (Important)                                           │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
│ ┌──────────────────────────────────────────────────────────────┐
│ │ KÖK & BADRUM (Important)                                     │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
│ ┌──────────────────────────────────────────────────────────────┐
│ │ LÄGE & TRANSPORT (Important)                                 │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
│ ┌──────────────────────────────────────────────────────────────┐
│ │ FÖRSÄLJNINGSARGUMENT (Important)                             │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
│ ┌──────────────────────────────────────────────────────────────┐
│ │ MATERIAL & TEKNIK (Optional)                                 │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
│ ┌──────────────────────────────────────────────────────────────┐
│ │ PLANLÖSNING & DETALJER (Optional - Collapsible)             │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ STICKY FOOTER: [SUBMIT BUTTON]                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementering

### Steg 1: Wrapper-struktur
```tsx
<FormGridLayout>
  {/* Row 1 */}
  <FormSection title="ESSENTIELL INFORMATION" priority="critical">
    {/* Essential fields */}
  </FormSection>
  
  <FormSection title="OBJEKTBILDER" priority="important">
    {/* Image section */}
  </FormSection>
  
  <FormSection title="FÖRSÄLJNINGSARGUMENT" priority="important">
    {/* USP section */}
  </FormSection>
  
  {/* Row 2 */}
  <FormSection title="KÖK & BADRUM" priority="important">
    {/* Kitchen & bathroom */}
  </FormSection>
  
  <FormSection title="LÄGE & TRANSPORT" priority="important">
    {/* Location & transport */}
  </FormSection>
  
  <FormSection title="MATERIAL & TEKNIK" priority="optional">
    {/* Materials & tech */}
  </FormSection>
  
  {/* Full width */}
  <FormSectionFull title="PLANLÖSNING & DETALJER" priority="optional">
    {/* Layout, garden, special features */}
  </FormSectionFull>
</FormGridLayout>
```

### Steg 2: CSS Classes
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- `border-2` (kantig design)
- `p-4` (padding)
- Färgkodning baserat på priority

### Steg 3: Sticky Elements
- Header: `sticky top-0 z-50`
- Footer: `sticky bottom-0 z-50`

## Fördelar
✓ Minimal scrollning
✓ Tydlig överblick
✓ Logisk gruppering
✓ Responsiv design
✓ Kantig, professionell utseende
✓ Snabbare att fylla i
