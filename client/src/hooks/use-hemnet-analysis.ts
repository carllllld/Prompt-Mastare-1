import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Types for Hemnet analysis
export interface HemnetProperty {
  id: string;
  url: string;
  address: string;
  city: string;
  description?: string;
  imageUrls?: string[];
}

export interface HemnetAnalysisResult {
  property: HemnetProperty;
  originalText: string;
  analysis: {
    overallQuality: number;
    strengths: string[];
    improvements: Array<{
      id: string;
      issue: string;
      location: string;
      textSpan?: { start: number; end: number; field: string };
      suggestion: string;
      category: 'grammar' | 'style' | 'legal' | 'broker_realism' | 'clarity';
      severity: 'critical' | 'important' | 'suggestion';
      expert: 'broker' | 'lawyer';
      actionable: boolean;
      autoFix?: string;
    }>;
    legalCheck: {
      compliant: boolean;
      notes: string;
      issues: string[];
    };
    duration: number;
  };
  images: string[];
  metadata: {
    wordCount: number;
    paragraphCount: number;
    sentenceCount: number;
  };
}

export interface GenerateImprovedRequest {
  originalText: string;
  acceptedFixes: string[]; // feedback IDs
  allFeedback: Array<{
    id: string;
    textSpan: { start: number; end: number; field: string };
    autoFix: string;
  }>;
}

export interface GenerateImprovedResult {
  improvedText: string;
  changes: Array<{
    type: 'addition' | 'deletion' | 'modification';
    originalSpan: { start: number; end: number };
    improvedSpan: { start: number; end: number };
    category: string;
    description: string;
  }>;
  appliedFixes: string[];
  stats: {
    originalWordCount: number;
    improvedWordCount: number;
    fixesApplied: number;
  };
}

/**
 * Hook for analyzing Hemnet listing text
 */
export function useHemnetAnalysis() {
  const queryClient = useQueryClient();

  return useMutation<HemnetAnalysisResult, Error, string>({
    mutationFn: async (url: string) => {
      const res = await apiRequest('POST', '/api/integrations/hemnet/analyze', { url });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Okänt fel' }));
        throw new Error(error.message || 'Kunde inte analysera Hemnet-texten');
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Invalidate user status to update quota
      queryClient.invalidateQueries({ queryKey: ['/api/user/status'] });
    },
  });
}

/**
 * Hook for analyzing any text (manual input)
 */
export function useTextAnalysis() {
  const queryClient = useQueryClient();

  return useMutation<Omit<HemnetAnalysisResult, 'property'>, Error, string>({
    mutationFn: async (text: string) => {
      const res = await apiRequest('POST', '/api/text/analyze', { text });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Okänt fel' }));
        throw new Error(error.message || 'Kunde inte analysera texten');
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Invalidate user status to update quota
      queryClient.invalidateQueries({ queryKey: ['/api/user/status'] });
    },
  });
}

/**
 * Hook for generating improved version with accepted fixes
 */
export function useGenerateImproved() {
  return useMutation<GenerateImprovedResult, Error, GenerateImprovedRequest>({
    mutationFn: async (data: GenerateImprovedRequest) => {
      const res = await apiRequest('POST', '/api/integrations/hemnet/generate-improved', data);
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Okänt fel' }));
        throw new Error(error.message || 'Kunde inte generera förbättrad version');
      }
      
      return res.json();
    },
  });
}

/**
 * Hook for rewriting text with AI based on analysis and context
 */
export function useRewriteText() {
  const queryClient = useQueryClient();

  return useMutation<{ rewrittenText: string; changes: string[] }, Error, { 
    originalText: string; 
    improvements: any[]; 
    context?: string;
  }>({
    mutationFn: async (data) => {
      const res = await apiRequest('POST', '/api/text/rewrite', data);
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Okänt fel' }));
        throw new Error(error.message || 'Kunde inte skriva om texten');
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Invalidate user status to update quota if needed
      queryClient.invalidateQueries({ queryKey: ['/api/user/status'] });
    },
  });
}
