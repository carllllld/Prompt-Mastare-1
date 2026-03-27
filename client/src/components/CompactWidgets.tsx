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

export function CompactUsageWidget({ remaining, limit, used, plan, resetTime }: UsageWidgetProps) {
  return (
    <div className="pro-card rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kvot</span>
        {plan === "premium" ? (
          <Badge size="sm" className="bg-purple-600 text-white border-transparent text-[10px]">Premium</Badge>
        ) : plan === "pro" ? (
          <Badge variant="success" size="sm" className="text-[10px]">Pro</Badge>
        ) : (
          <Badge variant="secondary" size="sm" className="text-[10px]">Gratis</Badge>
        )}
      </div>
      <div className="px-3 py-2.5">
        <div className="flex items-baseline gap-1 mb-1.5">
          <span className={`text-xl font-bold ${remaining === 0 ? "text-error" : "text-foreground"}`}>{remaining}</span>
          <span className="text-[10px] text-muted-foreground">/ {limit}</span>
        </div>
        <div className="w-full h-1 rounded-full overflow-hidden bg-muted mb-1">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              remaining === 0 ? "bg-error" : plan === "premium" ? "bg-purple-600" : "bg-success"
            }`}
            style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
          />
        </div>
        {resetTime && (
          <p className="text-[9px] text-muted-foreground">
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
      <div className="pro-card rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Historik</span>
        </div>
        <div className="px-3 py-2.5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">{historyCount}</p>
            <p className="text-[9px] text-muted-foreground">genereringar</p>
          </div>
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
    <div className="pro-card rounded-xl overflow-hidden" style={{ background: plan === "free" ? "#F0FDF4" : "#F5F3FF", borderColor: plan === "free" ? "#BBF7D0" : "#DDD6FE" }}>
      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ background: plan === "free" ? "#DCFCE7" : "#EDE9FE", borderColor: plan === "free" ? "#BBF7D0" : "#DDD6FE" }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: plan === "free" ? "#16A34A" : "#7C3AED" }}>
          {plan === "free" ? "Uppgradera" : "Premium"}
        </span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold mb-1" style={{ color: "#1D2939" }}>
          {plan === "free" ? "Pro" : "Premium"}
        </p>
        <p className="text-[9px] mb-2" style={{ color: "#6B7280" }}>
          {plan === "free" ? "10 texter/mån" : "25 texter/mån"}
        </p>
        <Button
          onClick={onUpgrade}
          disabled={isLoading}
          size="sm"
          className="w-full h-7 text-[10px] font-semibold"
          style={{ background: plan === "free" ? "#2D6A4F" : "#7C3AED", color: "#fff" }}
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : (
            <>
              <ArrowUp className="w-3 h-3 mr-1" />
              {plan === "free" ? "299 kr/mån" : "599 kr/mån"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
