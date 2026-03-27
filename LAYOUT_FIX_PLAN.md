# Korrekt Layout-struktur som användaren vill ha

## Nuvarande problem
- Formuläret är i 2-kolumns layout (7/5 split)
- Sidopaneler är i höger kolumn
- Användaren vill ha ALLT i full bredd

## Vad användaren FAKTISKT vill ha:

```
┌─────────────────────────────────────────────────────────────┐
│ [Header med logo och user menu]                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ [Hero-text]  [Månadskvot]  [Historik]  [Personlig stil]    │
│ (kompakt horisontell rad med alla widgets)                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────┐
│ Grundläggande uppgifter  │  Personlig stil (Pro/Premium)    │
│ (vänster)                │  (höger)                         │
└──────────────────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Resten av formuläret                                        │
│ (full bredd)                                                │
│ - Kök & Badrum                                              │
│ - Säljpunkter                                               │
│ - Planlösning                                               │
│ - etc...                                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Resultat                                                    │
│ (full bredd under formuläret)                              │
└─────────────────────────────────────────────────────────────┘
```

## Ändringar som behövs:

1. Ta bort 2-kolumns grid (lg:grid-cols-12)
2. Gör hero-området horisontellt med kompakta widgets
3. Flytta "Grundläggande uppgifter" och "Personlig stil" till en 2-kolumns rad
4. Resten av formuläret i full bredd under
5. Resultat i full bredd under formuläret
