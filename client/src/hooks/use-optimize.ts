import { useMutation } from "@tanstack/react-query";
import { api, type OptimizeRequest, type OptimizeResponse } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useOptimize() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: OptimizeRequest) => {
      const validated = api.optimize.input.parse(data);
      const res = await fetch(api.optimize.path, {
        method: api.optimize.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 500) {
            const error = await res.json();
            throw new Error(error.message || "Ett oväntat fel uppstod.");
        }
        throw new Error("Kunde inte optimera prompten. Försök igen.");
      }

      return api.optimize.responses[200].parse(await res.json());
    },
    onError: (error: Error) => {
      toast({
        title: "Fel vid optimering",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
