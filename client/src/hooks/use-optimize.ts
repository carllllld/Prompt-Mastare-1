import { useMutation } from "@tanstack/react-query";
import { api, type OptimizeRequest, type OptimizeResponse } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { retryApiCall } from "@/lib/retry";
import { ErrorHandler } from "@/lib/error-handler";

interface LimitError extends Error {
  limitReached?: boolean;
}

export function useOptimize() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: OptimizeRequest): Promise<OptimizeResponse> => {
      const validated = api.optimize.input.parse(data);
      
      return retryApiCall(
        api.optimize.path,
        {
          method: api.optimize.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validated),
          credentials: "include",
        },
        {
          maxRetries: 2,
          baseDelay: 1000,
          onRetry: (error, attempt) => {
            console.log(`Retry attempt ${attempt} for optimization:`, error.message);
          }
        }
      );
    },
    onError: (error: LimitError) => {
      if (error.limitReached) {
        // Handle usage limit errors specifically
        const appError = ErrorHandler.classifyError(error);
        ErrorHandler.logError(appError, 'useOptimize - limit reached');
        
        toast({
          title: 'Månadskvot uppnådd',
          description: 'Uppgradera till Pro för fler beskrivningar.',
          variant: 'destructive',
        });
      } else {
        // Handle other errors with improved error handling
        const appError = ErrorHandler.classifyError(error);
        ErrorHandler.logError(appError, 'useOptimize');
        
        const toastConfig = ErrorHandler.getToastConfig(appError);
        toast(toastConfig);
      }
    },
  });
}
