import { useMutation } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export function useStripeCheckout() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tier: "pro" | "premium") => {
      console.log("[Stripe Checkout] Starting checkout for tier:", tier);

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ⬅️ KRITISKT
        body: JSON.stringify({ tier }),
      });

      console.log("[Stripe Checkout] Response status:", response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error("[Stripe Checkout] Error response:", error);
        throw new Error(error.message || "Failed to create checkout session");
      }

      const data = await response.json();
      console.log("[Stripe Checkout] Success, redirecting to:", data.url);
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      console.error("[Stripe Checkout] Final error:", error);
      toast({
        title: "Fel vid betalning",
        description: error.message || "Kunde inte skapa betalningssession. Vänligen försök igen.",
        variant: "destructive",
      });
    },
  });
}

export function useStripePortal() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create portal session");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      console.error("Portal error:", error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte öppna kundportal.",
        variant: "destructive",
      });
    },
  });
}