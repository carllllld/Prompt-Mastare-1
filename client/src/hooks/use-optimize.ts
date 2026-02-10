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
      console.log("[useOptimize Debug] mutationFn called with:", data);
      const validated = api.optimize.input.parse(data);
      console.log("[useOptimize Debug] validated data:", validated);
      const res = await fetch(api.optimize.path, {
        method: api.optimize.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      console.log("[useOptimize Debug] fetch response status:", res.status);
      console.log("[useOptimize Debug] fetch response ok:", res.ok);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "An unexpected error occurred." }));
        console.log("[useOptimize Debug] error data:", errorData);
        
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

      const result = await res.json();
      console.log("[useOptimize Debug] success response:", result);
      return api.optimize.responses[200].parse(result);
    },
    onError: (error: LimitError) => {
      console.log("[useOptimize Debug] onError called:", error);
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
