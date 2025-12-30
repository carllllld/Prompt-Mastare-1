import { useMutation } from "@tanstack/react-query";
import { api, type OptimizeRequest, type OptimizeResponse } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

interface LimitError extends Error {
  limitReached?: boolean;
}

export function useOptimize() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: OptimizeRequest): Promise<OptimizeResponse> => {
      const validated = api.optimize.input.parse(data);
      const res = await fetch(api.optimize.path, {
        method: api.optimize.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "An unexpected error occurred." }));
        
        if (res.status === 403 && errorData.limitReached) {
          const error: LimitError = new Error(errorData.message);
          error.limitReached = true;
          throw error;
        }
        
        if (res.status === 429) {
          throw new Error(errorData.message || "Too many requests. Please wait a moment.");
        }
        
        throw new Error(errorData.message || "Could not optimize the prompt. Please try again.");
      }

      return api.optimize.responses[200].parse(await res.json());
    },
    onError: (error: LimitError) => {
      if (!error.limitReached) {
        toast({
          title: "Optimization failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });
}
