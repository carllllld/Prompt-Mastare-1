# DIAGNOSTIK - Token Truncation

## Om primary candidate fortfarande truncar:

### 1. Kontrollera prompt-storlek
Leta i loggarna efter:
```
[Step 3:primary] Prompt very large (XXXXX chars) — switching to minimalFields mode.
```

Om du ser detta och XXXXX > 22000:
- Disposition JSON är för stor
- För många/långa exempel
- Competitor analysis eller image analysis är för lång

### 2. Kontrollera token budget
Leta efter:
```
max_output_tokens: XXXX
```

Om XXXX < 4800:
- Token budget beräknas fel
- `targetWordMax` är för låg
- `includeAuxFields` är false (borde vara true)

### 3. Kontrollera completion status
Leta efter:
```
[Step 3:primary] WARNING: Output truncated. Token limit hit.
```

Om du ser detta:
- gpt-5.2 reasoning tokens äter för mycket
- Input + reasoning + output > total limit
- Behöver minska reasoning effort eller input size

## Lösningar:

### A. Minska prompt ytterligare
I `server/routes.ts`, ändra:
```typescript
const exampleCharLimit = label === "emergency" ? 400 : 500;  // Från 500:600
const cappedNegativeExample = compactNegativeExample.slice(0, 300);  // Från 400
const cappedPositiveExample = compactPositiveExample.slice(0, 600);  // Från 800
```

### B. Öka token budget mer
I `server/routes.ts`, ändra:
```typescript
includeAuxFields ? 5500 : 900,  // Från 4800
includeAuxFields ? 8000 : 2600  // Från 7000
```

### C. Sänk reasoning effort för primary
I `server/routes.ts`, ändra candidateConfigs:
```typescript
{ label: "primary", ..., effort: "low" as const, ... },  // Från "medium"
```

### D. Komprimera disposition JSON
Före `compactDispositionJson`, lägg till:
```typescript
// Remove verbose fields from disposition
const slimDisposition = {
  property: {
    type: disposition?.property?.type,
    address: disposition?.property?.address,
    rooms: disposition?.property?.rooms,
    living_area: disposition?.property?.living_area,
    // ... bara essentiella fält
  },
  // ... etc
};
const compactDispositionJson = JSON.stringify(slimDisposition, null, 0);
```

## Rapportera tillbaka:

När du testat, ge mig:
1. Prompt size (chars)
2. Token budget (max_output_tokens)
3. Completion status (complete/incomplete)
4. Vilka fält som finns i response
5. Total tid
6. Om emergency fallback användes
