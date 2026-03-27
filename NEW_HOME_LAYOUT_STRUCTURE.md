# Ny Home.tsx Layout-struktur

## Struktur:

```tsx
<main>
  {/* 1. KOMPAKT WIDGET-RAD (horisontell) */}
  {isAuthenticated && !result && (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {/* Hero-text (col-span-1) */}
      <div>
        <h1>Fyll i fastighetsdata. Få 5 texter.</h1>
        <p>Börja med grundfakta...</p>
      </div>
      
      {/* Månadskvot widget */}
      <CompactUsageWidget {...} />
      
      {/* Historik widget */}
      <CompactHistoryWidget historyCount={history.length} />
      
      {/* Upgrade widget */}
      <CompactUpgradeWidget {...} />
    </div>
  )}

  {/* 2. GRUNDLÄGGANDE UPPGIFTER + PERSONLIG STIL (2-kolumner) */}
  {isAuthenticated && !result && (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
      {/* Vänster: Grundläggande uppgifter från formuläret */}
      <div>
        <EssentialFieldsSection {...} />
      </div>
      
      {/* Höger: Personlig stil (bara för Pro/Premium) */}
      {(plan === "pro" || plan === "premium") && (
        <div className="pro-card rounded-2xl p-5">
          <PersonalStyle />
        </div>
      )}
    </div>
  )}

  {/* 3. RESTEN AV FORMULÄRET (full bredd) */}
  <div className="pro-card rounded-2xl p-5 mb-5">
    <PromptFormProfessional
      onSubmit={handleSubmit}
      isPending={isPending}
      disabled={remaining === 0}
      isPro={isPro}
      hideEssentialFields={true}  // NY PROP - dölj grundläggande uppgifter
    />
  </div>

  {/* 4. RESULTAT (full bredd) */}
  {result && (
    <div ref={resultRef}>
      <ResultSection {...} />
    </div>
  )}
</main>
```

## Ändringar som behövs:

1. ✅ Skapa CompactWidgets.tsx med kompakta widgets
2. ⏳ Lägg till `hideEssentialFields` prop till PromptFormProfessional
3. ⏳ Omstrukturera Home.tsx main-sektion
4. ⏳ Flytta state-hantering så EssentialFieldsSection kan renderas separat
