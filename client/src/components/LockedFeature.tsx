import React from "react";
import { Lock, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { type PlanType } from "@shared/schema";

interface LockedFeatureProps {
  requiredPlan: "pro" | "premium";
  featureName: string;
  currentPlan: PlanType;
  children: React.ReactNode;
  showOverlay?: boolean;
}

export function LockedFeature({
  requiredPlan,
  featureName,
  currentPlan,
  children,
  showOverlay = true,
}: LockedFeatureProps) {
  const { mutate: startCheckout, isPending } = useStripeCheckout();

  // If user has required plan or higher, show unlocked
  const isUnlocked =
    currentPlan === "premium" ||
    (currentPlan === "pro" && requiredPlan === "pro");

  if (isUnlocked) {
    return <>{children}</>;
  }

  // Show locked version
  return (
    <div className="relative">
      {/* Render children with reduced opacity */}
      <div className={showOverlay ? "opacity-50 pointer-events-none" : ""}>
        {children}
      </div>

      {/* Overlay with upgrade prompt */}
      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg border-2 border-primary/20">
          <div className="text-center px-4 py-3 max-w-xs">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {featureName}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Uppgradera till {requiredPlan === "premium" ? "Premium" : "Pro"} för att använda denna funktion
            </p>
            <Button
              size="sm"
              onClick={() => startCheckout(requiredPlan)}
              disabled={isPending}
              className="text-xs font-semibold"
            >
              {isPending ? (
                "Laddar..."
              ) : (
                <>
                  <ArrowUp className="w-3 h-3 mr-1.5" />
                  Uppgradera till {requiredPlan === "premium" ? "Premium" : "Pro"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
