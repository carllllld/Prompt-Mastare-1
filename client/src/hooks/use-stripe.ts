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

      if (res.status === 401) {
        throw new Error("LOGIN_REQUIRED");
      }

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Could not start payment." }));
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
      if (error.message === "LOGIN_REQUIRED") {
        toast({
          title: "Login required",
          description: "Please log in to upgrade to Pro.",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      toast({
        title: "Payment error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
