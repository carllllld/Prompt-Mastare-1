import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useStripeCheckout() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Kunde inte starta betalning." }));
        throw new Error(error.message);
      }

      const data = await res.json();
      return data.url as string;
    },
    onSuccess: (url) => {
      if (url) {
        window.location.href = url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Betalningsfel",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
