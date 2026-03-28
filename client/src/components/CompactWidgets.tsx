import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Crown, ArrowUp, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface UsageWidgetProps {
  remaining: number;
  limit: number;
  used: number;
  plan: string;
  resetTime?: string;
}

/**
 * CompactWidgetsPanel - Wrapper for equal height widgets
 * Uses flexbox with align-items: stretch to ensure all widgets have equal height
 */
interface CompactWidgetsPanelProps {
  children: React.ReactNode;
}

export function CompactWidgetsPanel({ children }: CompactWidgetsPanelProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 items-stretch">
      {children}
    </div>
  );
}

export function CompactUsageWidget({ remaining, limit, used, plan, resetTime }: UsageWidgetProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Kvot</span>
        {plan === "premium" ? (
          <span className="text-sm text-primary">Premium</span>
        ) : plan === "pro" ? (
          <span className="text-sm text-primary">Pro</span>
        ) : (
          <span className="text-sm text-muted-foreground">Gratis</span>
        )}
      </div>
      <div className="px-3 py-2.5 flex-1 flex flex-col justify-center">
        <div className="flex items-baseline gap-1 mb-1.5">
          <span className={`text-xl font-bold ${remaining === 0 ? "text-error" : "text-foreground"}`}>{remaining}</span>
          <span className="text-sm text-muted-foreground">/ {limit}</span>
        </div>
        <div className="w-full h-1 overflow-hidden bg-muted mb-1">
          <div
            className={`h-full transition-all duration-500 ${
              remaining === 0 ? "bg-gray-400" : "bg-primary"
            }`}
            style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
          />
        </div>
        {resetTime && (
          <p className="text-xs text-muted-foreground">
            Återställs {new Date(resetTime).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
          </p>
        )}
      </div>
    </div>
  );
}

interface CompactHistoryWidgetProps {
  historyCount: number;
}

export function CompactHistoryWidget({ historyCount }: CompactHistoryWidgetProps) {
  return (
    <Link href="/history">
      <div className="cursor-pointer hover:opacity-80 transition-opacity flex flex-col h-full">
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Historik</span>
        </div>
        <div className="px-3 py-2.5 flex-1 flex flex-col justify-center">
          <div className="flex items-baseline gap-1 mb-1.5">
            <span className="text-xl font-bold text-foreground">{historyCount}</span>
            <span className="text-sm text-muted-foreground">st</span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            Tidigare genereringar
          </p>
          <p className="text-xs text-muted-foreground">
            Klicka för att se alla
          </p>
        </div>
      </div>
    </Link>
  );
}

interface CompactUpgradeWidgetProps {
  plan: string;
  onUpgrade: () => void;
  isLoading: boolean;
}

export function CompactUpgradeWidget({ plan, onUpgrade, isLoading }: CompactUpgradeWidgetProps) {
  if (plan === "premium") return null;
  
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {plan === "free" ? "Uppgradera" : "Premium"}
        </span>
      </div>
      <div className="px-3 py-2.5 flex-1 flex flex-col justify-center">
        <p className="text-sm font-semibold mb-1 text-foreground">
          {plan === "free" ? "Pro" : "Premium"}
        </p>
        <p className="text-xs mb-2 text-muted-foreground">
          {plan === "free" ? "10 texter/mån" : "25 texter/mån"}
        </p>
        <Button
          onClick={onUpgrade}
          disabled={isLoading}
          size="sm"
          className="w-full h-8 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <>
              <ArrowUp className="w-4 h-4 mr-1" />
              {plan === "free" ? "299 kr/mån" : "599 kr/mån"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
