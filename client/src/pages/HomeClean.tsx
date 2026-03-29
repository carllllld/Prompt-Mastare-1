import { useState, useEffect, useRef } from "react";
import { useSearch, Link, useLocation } from "wouter";
import { PromptFormClean } from "@/components/PromptFormClean";
import { ResultSection } from "@/components/ResultSection";
import { AuthModal } from "@/components/AuthModal";
import { PromptGenerationSkeleton } from "@/components/LoadingSkeleton";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout, useStripePortal } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { type OptimizeResponse } from "@shared/schema";
import {
  Loader2, LogOut, FileText, Clock, Crown, ArrowUp, Settings, User, ChevronDown, AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HomeClean() {
  const { mutate, isPending, setProgressCallback, lastError, clearLastError } = useOptimize();
  const { data: userStatus } = useUserStatus();
  const { mutate: startCheckout, isPending: isCheckoutPending } = useStripeCheckout();
  const { mutate: openPortal, isPending: isPortalPending } = useStripePortal();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [lastSubmitData, setLastSubmitData] = useState<any>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const [loadingMessage, setLoadingMessage] = useState("Förbereder generering...");
  const LOADING_STEPS_COUNT = 7;
  const progressStep = Math.min(Math.max(loadingStep + 1, 1), LOADING_STEPS_COUNT);
  const progressPercent = Math.round((progressStep / LOADING_STEPS_COUNT) * 100);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Handle Stripe redirects
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("success") === "true") {
      toast({
        title: "Prenumeration aktiverad!",
        description: "Välkommen! Ditt konto håller på att uppgraderas...",
      });
      window.history.replaceState({}, "", "/app");
      
      let polls = 0;
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
        queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
        polls++;
        if (polls >= 15) clearInterval(pollInterval);
      }, 2000);
      return () => clearInterval(pollInterval);
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Betalning avbruten",
        description: "Ingen betalning genomfördes.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/app");
    }
  }, [search, toast]);

  // Wire up progress
  useEffect(() => {
    setProgressCallback((event) => {
      setLoadingStep(event.step - 1);
      setLoadingMessage(event.message);
    });
    return () => setProgressCallback(undefined);
  }, [setProgressCallback]);

  useEffect(() => {
    if (isPending) {
      setLoadingStep(0);
      setLoadingMessage("Förbereder generering...");
    }
  }, [isPending]);

  const handleSubmit = (data: any) => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    if ((userStatus?.textsRemaining ?? 0) <= 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
      toast({
        title: "Månadskvot uppnådd",
        description: "Du har inga genereringar kvar den här månaden.",
        variant: "destructive",
      });
      return;
    }

    setResult(null);
    setLoadingStep(0);
    setLoadingMessage("Förbereder generering...");
    setLastSubmitData(data);
    clearLastError();
    
    mutate(data, {
      onSuccess: (res: OptimizeResponse) => {
        setResult(res);
        clearLastError();
        queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      },
      onError: () => {
        setLoadingStep(0);
        setLoadingMessage("Förbereder generering...");
        queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
      },
    });
  };

  const plan = userStatus?.plan || "free";
  const remaining = userStatus?.textsRemaining ?? 0;
  const limit = userStatus?.monthlyTextLimit ?? 2;
  const used = userStatus?.textsUsedThisMonth ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span className="text-lg font-semibold" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>Mäklartexter</span>
          </Link>

          <div className="flex items-center gap-6">
            {authLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isAuthenticated ? (
              <>
                {/* Kvot - direkt i headern */}
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{remaining}</span>
                  <span>/</span>
                  <span>{limit}</span>
                  <span className="text-xs">kvar</span>
                </div>

                {/* Historik - direkt i headern */}
                <Link href="/history" className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Clock className="w-4 h-4" />
                  <span>Historik</span>
                </Link>

                {/* Uppgradera/Plan - direkt i headern */}
                {(plan === "pro" || plan === "premium") ? (
                  <button
                    onClick={() => openPortal()}
                    disabled={isPortalPending}
                    className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Crown className="w-4 h-4 text-primary" />
                    <span>{plan === "premium" ? "Premium" : "Pro"}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startCheckout("pro")}
                    disabled={isCheckoutPending}
                    className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isCheckoutPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                    <span>Uppgradera</span>
                  </button>
                )}

                {/* User menu - mobile fallback */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors border border-gray-200">
                      <User className="w-4 h-4" />
                      <span className="hidden md:inline max-w-[120px] truncate">{user?.email?.split("@")[0]}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2 border-b">
                      <p className="text-xs font-medium truncate">{user?.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan === "premium" ? "Premium" : plan === "pro" ? "Pro" : "Gratis"}
                      </p>
                    </div>
                    {/* Mobile: Show kvot, historik, uppgradera */}
                    <div className="sm:hidden">
                      <DropdownMenuItem asChild>
                        <div className="flex items-center justify-between">
                          <span className="text-xs">Kvot</span>
                          <span className="text-xs font-semibold">{remaining}/{limit}</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/history" className="flex items-center gap-2 cursor-pointer">
                          <Clock className="w-3.5 h-3.5" />
                          Historik
                        </Link>
                      </DropdownMenuItem>
                      {plan === "free" ? (
                        <DropdownMenuItem onClick={() => startCheckout("pro")} disabled={isCheckoutPending} className="cursor-pointer">
                          <ArrowUp className="w-3.5 h-3.5 mr-2" />
                          Uppgradera till Pro
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => openPortal()} disabled={isPortalPending} className="cursor-pointer">
                          <Settings className="w-3.5 h-3.5 mr-2" />
                          Hantera prenumeration
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                    </div>
                    <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-gray-600">
                      <LogOut className="w-3.5 h-3.5 mr-2" />
                      Logga ut
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)} size="sm">
                Logga in
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page title */}
        {isAuthenticated && !result && (
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Generera objektbeskrivningar
            </h1>
            <p className="text-sm text-muted-foreground">
              Fyll i fastighetens uppgifter nedan. Du får 5 olika texter på under en minut.
            </p>
          </div>
        )}

        {/* Quota warning */}
        {isAuthenticated && remaining === 0 && !result && (
          <div className="mb-6 rounded-lg border border-warning bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Månadskvoten är slut</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {plan === "free"
                    ? "Uppgradera till Pro för 10 genereringar per månad."
                    : `Återställs ${userStatus?.resetTime ? new Date(userStatus.resetTime).toLocaleDateString("sv-SE", { day: "numeric", month: "long" }) : "nästa månad"}`}
                </p>
              </div>
              {plan === "free" && (
                <Button size="sm" onClick={() => startCheckout("pro")} disabled={isCheckoutPending}>
                  {isCheckoutPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Uppgradera"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {isAuthenticated && lastError && !isPending && (
          <div className="mb-6 rounded-lg border border-destructive bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{lastError.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{lastError.message}</p>
                <div className="flex gap-2 mt-3">
                  {lastSubmitData && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubmit(lastSubmitData)}
                      disabled={isPending}
                    >
                      Försök igen
                    </Button>
                  )}
                  {lastError.actionType === "upgrade" && (
                    <Button
                      size="sm"
                      onClick={() => startCheckout(plan === "free" ? "pro" : "premium")}
                      disabled={isCheckoutPending}
                    >
                      {lastError.actionLabel || "Uppgradera"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content - full width */}
        <div className="max-w-4xl mx-auto">
          {/* Form */}
          <PromptFormClean
            onSubmit={handleSubmit}
            isPending={isPending}
            disabled={isAuthenticated && remaining === 0}
            isPro={plan === "pro" || plan === "premium"}
          />

          {/* Loading */}
          {isPending && (
            <div className="mt-6 bg-card border p-6">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="font-medium">Genererar texter...</span>
                <span className="text-muted-foreground">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 overflow-hidden bg-muted mb-4">
                <div
                  className="h-full transition-all duration-500 bg-primary"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <PromptGenerationSkeleton step={loadingStep} total={LOADING_STEPS_COUNT} message={loadingMessage} />
            </div>
          )}

          {/* Result - full width below form */}
          {result && (
            <div ref={resultRef} className="mt-6">
              <ResultSection
                result={result}
                onNewPrompt={() => setResult(null)}
                onRegenerate={lastSubmitData ? () => handleSubmit(lastSubmitData) : undefined}
                isRegenerating={isPending}
                propertyData={lastSubmitData?.propertyData}
                vitecObjectId={lastSubmitData?.propertyData?._sourceId}
              />
            </div>
          )}
        </div>
      </main>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} initialMode="login" />
    </div>
  );
}
