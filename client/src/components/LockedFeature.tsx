import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { useToast } from "@/hooks/use-toast";

interface LockedFeatureProps {
  children: React.ReactNode;
  requiredPlan: "pro" | "premium";
  featureName: string;
  currentPlan: string;
}

export function LockedFeature({ children, requiredPlan, featureName, currentPlan }: LockedFeatureProps) {
  const { mutate: startCheckout, isPending } = useStripeCheckout();
  const { toast } = useToast();

  const handleClick = () => {
    toast({
      title: `${featureName} kräver ${requiredPlan === "pro" ? "Pro" : "Premium"}`,
      description: `Uppgradera för att använda ${featureName.toLowerCase()}.`,
      action: (
        <button
          onClick={() => startCheckout(requiredPlan)}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          Uppgradera nu
        </button>
      ),
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={handleClick}
            className="relative cursor-not-allowed opacity-60 hover:opacity-50 transition-opacity"
          >
            <div className="pointer-events-none">
              {children}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border shadow-sm">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {requiredPlan === "pro" ? "Pro" : "Premium"}
                </span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {featureName} kräver {requiredPlan === "pro" ? "Pro" : "Premium"}. Klicka för att uppgradera.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
