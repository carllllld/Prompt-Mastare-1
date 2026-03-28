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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">OptiPrompt</span>
          </Link>

          <div className="flex items-center gap-3">
            {authLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isAuthenticated ? (
              <>
                <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                  <span className="font-semibold text-primary">{remaining}</span>
                  <span>/</span>
                  <span>{limit}</span>
                </div>

                {(plan === "pro" || plan === "premium") ? (
                  <div className={`hidden sm:flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                    plan === "premium" ? "bg-purple-600 text-white" : "bg-amber-500 text-white"
                  }`}>
                    <Crown className="w-3 h-3" />
                    {plan === "premium" ? "Premium" : "Pro"}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => startCheckout("pro")}
                    disabled={isCheckoutPending}
                    className="text-xs font-medium gap-1"
                  >
                    {isCheckoutPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUp className="w-3 h-3" />}
                    <span className="hidden sm:inline">Uppgradera</span>
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors border">
                      <User className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline max-w-[120px] truncate">{user?.email?.split("@")[0]}</span>
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
                    <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive">
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

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <PromptFormClean
              onSubmit={handleSubmit}
              isPending={isPending}
              disabled={isAuthenticated && remaining === 0}
              isPro={plan === "pro" || plan === "premium"}
            />

            {/* Loading */}
            {isPending && (
              <div className="mt-6 bg-card rounded-lg border p-6">
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="font-medium">Genererar texter...</span>
                  <span className="text-muted-foreground">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden bg-muted mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-primary"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <PromptGenerationSkeleton step={loadingStep} total={LOADING_STEPS_COUNT} message={loadingMessage} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div ref={resultRef} className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-24">
              {/* Result */}
              {result ? (
                <ResultSection
                  result={result}
                  onNewPrompt={() => setResult(null)}
                  onRegenerate={lastSubmitData ? () => handleSubmit(lastSubmitData) : undefined}
                  isRegenerating={isPending}
                  propertyData={lastSubmitData?.propertyData}
                  vitecObjectId={lastSubmitData?.propertyData?._sourceId}
                />
              ) : (
                /* Usage card */
                isAuthenticated && (
                  <div className="bg-card rounded-lg border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">Månadskvot</h3>
                      {plan === "premium" ? (
                        <Badge className="bg-purple-600 text-white">Premium</Badge>
                      ) : plan === "pro" ? (
                        <Badge className="bg-amber-500 text-white">Pro</Badge>
                      ) : (
                        <Badge variant="secondary">Gratis</Badge>
                      )}
                    </div>
                    <div className="flex items-end justify-between mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-bold ${remaining === 0 ? "text-destructive" : "text-foreground"}`}>
                          {remaining}
                        </span>
                        <span className="text-sm text-muted-foreground">/ {limit} kvar</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{used} använda</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden bg-muted mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${
                          remaining === 0 ? "bg-destructive" : plan === "premium" ? "bg-purple-600" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
                      />
                    </div>
                    {userStatus?.resetTime && (
                      <p className="text-xs text-muted-foreground">
                        Återställs {new Date(userStatus.resetTime).toLocaleDateString("sv-SE", { day: "numeric", month: "long" })}
                      </p>
                    )}
                  </div>
                )
              )}

              {/* Upgrade CTA */}
              {isAuthenticated && plan === "free" && !result && (
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="text-sm font-semibold mb-2">Uppgradera till Pro</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Få 10 genereringar per månad, adressuppslag, bildanalys och mycket mer.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => startCheckout("pro")}
                    disabled={isCheckoutPending}
                  >
                    {isCheckoutPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                    Uppgradera till Pro
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} initialMode="login" />
    </div>
  );
}
