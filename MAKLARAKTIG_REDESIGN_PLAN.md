# Mäklaraktig Redesign - Komplett Omgång

## Designprinciper (Hemnet/SvenskaFast-stil)

### Färgpalett
- **Primär**: Vit (#FFFFFF) - 90% av ytan
- **Bakgrund**: Ljusgrå (#F8F9FA) - subtil kontrast
- **Text**: Mörkgrå (#1A1A1A) - inte svart
- **Accent**: Mörk grön (#2D5016) - sparsamt, bara CTA
- **Borders**: Ljusgrå (#E5E7EB) - tunna, subtila
- **Hover**: Mycket subtil (#F3F4F6)

### Typografi
- **En fontstorlek för body**: 15px (läsbar, professionell)
- **Labels**: 13px, normal weight, grå (#6B7280)
- **Headings**: 16px, semibold, mörkgrå
- **Ingen uppercase** - ser för "tech" ut
- **Minimal bold** - bara för viktiga saker

### Spacing
- **Mycket luft**: 24px mellan sektioner
- **Padding**: 20px inuti sektioner (inte 12px)
- **Margins**: Generösa, aldrig trångt

### Borders
- **Tunna**: 1px, inte 2px
- **Färg**: #E5E7EB (ljusgrå)
- **Inga färgade borders** - ser för "dashboard" ut
- **Inga rounded corners** - kantig, professionell

### Knappar
- **Primär**: Mörk grön bakgrund, vit text, ingen border
- **Sekundär**: Vit bakgrund, grå border, grå text
- **Hover**: Subtil darkening (10%)
- **Inga ikoner i knappar** - bara text
- **Padding**: 12px 24px (generös)

### Badges/Labels
- **Inga färgglada badges** - ser för "playful" ut
- **Om nödvändigt**: Grå text, ingen bakgrund, bara text

## Vad som ska bort

❌ Alla färgade borders (röd, blå, gul)
❌ Alla färgade bakgrunder (red-50, blue-50, yellow-50)
❌ Alla badges med färg
❌ Alla ikoner (utom absolut nödvändiga)
❌ Uppercase text
❌ För mycket bold
❌ Rounded corners
❌ Shadows (utom subtil på sticky elements)
❌ Animationer (utom fade)

## Vad som ska in

✅ Mycket vitt
✅ Subtila gråa borders
✅ Generöst spacing
✅ En konsekvent fontstorlek
✅ Minimal färganvändning
✅ Clean, luftig känsla
✅ Professionell, inte "tech"

## Komponenter att fixa

1. **FormGridLayout** - Mer spacing, vit bakgrund
2. **FormSection** - Ta bort färgade borders/bakgrunder
3. **CollapsibleFormSection** - Minimalistisk, ingen färg
4. **StickyHeader** - Clean, vit, subtil shadow
5. **StickyFooter** - Clean, vit, subtil shadow
6. **Buttons** - Mäklaraktig stil
7. **Inputs** - Större, mer padding, subtil border
8. **Labels** - Mindre, grå, normal weight

## Exempel: Före vs Efter

### Före (Tech-y)
```tsx
<div className="border-2 border-red-300 bg-red-50 p-3">
  <h3 className="text-xs font-bold uppercase text-red-700">
    VIKTIGT
  </h3>
</div>
```

### Efter (Mäklaraktig)
```tsx
<div className="border border-gray-200 bg-white p-6">
  <h3 className="text-base font-semibold text-gray-900 mb-4">
    Grundläggande uppgifter
  </h3>
</div>
```

