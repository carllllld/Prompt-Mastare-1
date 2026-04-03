import { useState, useCallback } from "react";

export interface TargetAudienceAnalysis {
  primary: string;
  secondary: string;
  reasoning: string;
}

export interface SellingPoint {
  rank: number;
  argument: string;
  whyItMatters: string;
}

export interface PricingPerspective {
  positioning: string;
  textSuggestion: string;
}

export interface ShowingStrategy {
  tips: string[];
  openingMove: string;
}

export interface AdOptimization {
  bestPublishDay: string;
  bestPublishTime: string;
  firstImageSuggestion: string;
  reasoning: string;
}

export interface SalesStrategyResult {
  targetAudience: TargetAudienceAnalysis;
  sellingPoints: SellingPoint[];
  pricingPerspective: PricingPerspective;
  showingStrategy: ShowingStrategy;
  adOptimization: AdOptimization;
  generatedAt: string;
}

export function useSalesStrategy() {
  const [strategy, setStrategy] = useState<SalesStrategyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    propertyData: Record<string, any>,
    generatedText?: string,
    platform?: string,
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sales-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ propertyData, generatedText, platform }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Kunde inte generera säljstrategi");
      }

      const data: SalesStrategyResult = await response.json();
      setStrategy(data);
      return data;
    } catch (err: any) {
      const msg = err.message || "Något gick fel";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setStrategy(null);
    setError(null);
  }, []);

  return { strategy, isLoading, error, generate, reset };
}
