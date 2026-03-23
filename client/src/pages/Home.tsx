import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { Link, useLocation } from "wouter";
import { PromptFormProfessional } from "@/components/PromptFormProfessional";
import { ResultSection } from "@/components/ResultSection";
import { HistoryPanel } from "@/components/HistoryPanel";
import { PersonalStyle } from "@/components/PersonalStyle";
import { AuthModal } from "@/components/AuthModal";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { PromptGenerationSkeleton } from "@/components/LoadingSkeleton";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout, useStripePortal } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { type OptimizeResponse } from "@shared/schema";
import {
  Loader2, LogOut, FileText, Clock, Crown, ChevronRight, ArrowUp, Check, Settings, KeyRound, User, ChevronDown, SlidersHorizontal, AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const BEFORE_AFTER = [
  {
    label: "Objektbeskrivning",
    before: `Välkommen till denna fantastiska bostad med ljus och rymd. Här bor du i ett attraktivt område med närhet till det mesta. Köket passar både vardag och fest och planlösningen är väl genomtänkt. Missa inte chansen att uppleva denna unika möjlighet!`,
    after: `Storgatan 12, 3 tr — trea om 76 kvm med balkong i söderläge och lugnt gårdsläge.\n\nVardagsrummet har ekparkett, plats för soffgrupp och matbord samt utgång till balkong. Köket renoverades 2022 med god arbetsyta, induktionshäll och plats för matbord vid fönster.\n\nTvå sovrum ligger avskilt. Badrummet är helkaklat och uppdaterat 2020. Avgift 3 900 kr/mån.\n\nKommunikationer och service nås inom kort promenad.`,
  },
  {
    label: "Rubrik",
    before: `Drömboende i toppskick!`,
    after: `Trea med söderbalkong och renoverat kök`,
  },
  {
    label: "Socialt inlägg",
    before: `Nu finns en fin lägenhet till salu i ett bra område! Ljus och fräsch med perfekt läge. Hör av dig för mer information! #bostad #lägenhet`,
    after: `Storgatan 12 — trea om 76 kvm med söderbalkong och kök renoverat 2022.\nAvgift 3 900 kr/mån. Lugnt gårdsläge.\n\nBoka visning: [KONTAKT]\n#tillsalu #lägenhet #balkong`,
  },
  {
    label: "Instagram",
    before: `Drömmer du om ditt nya hem? Den här pärlan måste upplevas på plats! ✨\n\n#nytthem #drömboende`,
    after: `🏡 Storgatan 12 — trea om 76 kvm med söderbalkong.\n🍳 Kök renoverat 2022 och helkaklat badrum (uppdaterat 2020).\n💬 Avgift 3 900 kr/mån.\n\nVälkommen på visning: [TID].`,
  },
  {
    label: "Visningsinbjudan",
    before: `Varmt välkommen på visning av denna fantastiska lägenhet! Här får du ett hem med härlig känsla och smart planlösning i ett attraktivt område.\n\nTid: [TID]\nPlats: Storgatan 12\nAnmälan: [KONTAKT]`,
    after: `Visning — Storgatan 12, 3 tr.\nTrea om 76 kvm med söderbalkong och kök renoverat 2022.\n\nTid: [TID]\nPlats: Storgatan 12, 3 tr\nAnmälan: [KONTAKT]`,
  },
  {
    label: "Kortannons",
    before: `Fin trea i bra område. Balkong. Måste ses!`,
    after: `Storgatan 12, 3 tr — trea om 76 kvm. Söderbalkong och kök renoverat 2022. Avgift 3 900 kr/mån. Visning: [TID].`,
  },
];

function BeforeAfterDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const item = BEFORE_AFTER[activeTab];

  return (
    <div className="pro-card pro-card-premium rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: "#E8E5DE" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2D6A4F" }}></div>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
            Kvalitetslyft i praktiken
          </span>
        </div>
        <div className="flex gap-1">
          {BEFORE_AFTER.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className="px-2.5 py-1 text-[11px] rounded-full border transition-all font-medium"
              style={{
                background: activeTab === i ? "#2D6A4F" : "#fff",
                color: activeTab === i ? "#fff" : "#9CA3AF",
                borderColor: activeTab === i ? "#2D6A4F" : "#E8E5DE",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: "#FEE2E2", color: "#DC2626" }}>
              Utan optimering
            </span>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#9CA3AF", fontStyle: "italic" }}>
            {item.before}
          </p>
        </div>
        <div className="border-t pt-4" style={{ borderColor: "#F3F4F6" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: "#DCFCE7", color: "#16A34A" }}>
              Publiceringsklar version
            </span>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#1D2939" }}>
            {item.after}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { mutate, isPending, setProgressCallback, lastError, clearLastError } = useOptimize();
  const { data: userStatus } = useUserStatus();
  const { mutate: startCheckout, isPending: isCheckoutPending } = useStripeCheckout();
  const { mutate: openPortal, isPending: isPortalPending } = useStripePortal();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Show toast after Stripe redirect + aggressively poll for plan update
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("success") === "true") {
      toast({
        title: "Prenumeration aktiverad!",
        description: "Välkommen! Ditt konto håller på att uppgraderas...",
      });
      window.history.replaceState({}, "", "/app");

      // Poll every 2s for 30s to pick up webhook-driven plan change
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
        description: "Ingen betalning genomfördes. Du kan uppgradera när du vill.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/app");
    }
  }, [search, toast]);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [lastSubmitData, setLastSubmitData] = useState<any>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const [loadingMessage, setLoadingMessage] = useState("Förbereder generering...");
  const LOADING_STEPS_COUNT = 7;
  const progressStep = Math.min(Math.max(loadingStep + 1, 1), LOADING_STEPS_COUNT);
  const progressPercent = Math.round((progressStep / LOADING_STEPS_COUNT) * 100);

  // Wire up real-time streaming progress from the server pipeline
  useEffect(() => {
    setProgressCallback((event) => {
      setLoadingStep(event.step - 1); // 0-indexed for the UI
      setLoadingMessage(event.message);
    });
    return () => setProgressCallback(undefined);
  }, [setProgressCallback]);

  // Reset loading state when mutation starts/stops
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
    <div className="min-h-screen app-shell-bg">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-[2200px] mx-auto flex items-center justify-between px-4 sm:px-6 xl:px-10 2xl:px-14 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              OptiPrompt
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {authLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isAuthenticated ? (
              <>
                {/* Usage pill */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                  <span className="font-semibold text-primary">{remaining}</span>
                  <span>/</span>
                  <span>{limit}</span>
                </div>

                {/* Plan badge or upgrade */}
                {(plan === "pro" || plan === "premium") ? (
                  <div className={`hidden sm:flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                    plan === "premium" 
                      ? "bg-purple-600 text-white" 
                      : "bg-amber-500 text-white"
                  }`}>
                    <Crown className="w-3 h-3" />
                    {plan === "premium" ? "Premium" : "Pro"}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => startCheckout("pro")}
                    disabled={isCheckoutPending}
                    className="text-xs font-medium gap-1 bg-primary text-primary-foreground hover:bg-primary-hover"
                  >
                    {isCheckoutPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUp className="w-3 h-3" />}
                    <span className="hidden sm:inline">Uppgradera</span>
                  </Button>
                )}

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors border border-border">
                      <User className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline max-w-[120px] truncate">{user?.email?.split("@")[0]}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 shadow-lg">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan === "premium" ? "Premium" : plan === "pro" ? "Pro" : "Gratis"}</p>
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
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Inställningar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setChangePasswordOpen(true)} className="cursor-pointer">
                      <KeyRound className="w-3.5 h-3.5 mr-2" />
                      Ändra lösenord
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-error focus:text-error">
                      <LogOut className="w-3.5 h-3.5 mr-2" />
                      Logga ut
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                onClick={() => setAuthModalOpen(true)}
                size="sm"
                className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                Logga in
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="max-w-[2200px] w-full mx-auto px-4 sm:px-6 xl:px-10 2xl:px-14 py-5 sm:py-6">

        {/* Hero — only when no result is showing (logged in users) */}
        {isAuthenticated && !result && (
          <div className="mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl leading-snug" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
                  Fyll i fastighetsdata. Få 5 texter.
                </h1>
                <p className="text-xs sm:text-sm mt-1.5 max-w-3xl" style={{ color: "#6B7280" }}>
                  Börja med grundfakta, lägg sedan kraft på det som faktiskt säljer objektet: skick, planlösning, renoveringar, material, läge och unika kvaliteter.
                </p>
              </div>
              {userStatus?.resetTime && (
                <span className="text-xs shrink-0" style={{ color: "#9CA3AF" }}>
                  Kvot återställs {new Date(userStatus.resetTime).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { label: "Objektbeskrivning", sub: "Hemnet & Booli" },
                { label: "Rubrik", sub: "kort och klickstark" },
                { label: "Socialt inlägg", sub: "+ hashtags" },
                { label: "Visningsinbjudan", sub: "mäklarinfo" },
                { label: "Kortannons", sub: "kort format" },
              ].map((pill) => (
                <div key={pill.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#2D6A4F" }} />
                  <span className="font-medium" style={{ color: "#374151" }}>{pill.label}</span>
                  <span style={{ color: "#9CA3AF" }}>· {pill.sub}</span>
                </div>
              ))}
            </div>
            <div className="pro-card-soft rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: "#4B5563" }}>
              <span className="font-semibold" style={{ color: "#1D2939" }}>Rekommenderat arbetsflöde:</span>
              <span>1. Grundfakta</span>
              <span>2. Vad som gör objektet speciellt</span>
              <span>3. Planlösning</span>
              <span>4. Mer detaljer vid behov</span>
            </div>
          </div>
        )}

        {/* Limit warning */}
        {isAuthenticated && remaining === 0 && !result && (
          <div className="mb-6 rounded-xl border border-warning overflow-hidden">
            <div className="px-5 py-3.5 flex items-center gap-4 bg-warning-bg">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-warning" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-warning">Månadskvoten är slut</p>
                <p className="text-xs mt-0.5 text-warning">
                  {plan === "free"
                    ? "Pro ger 10 genereringar, 40 AI-redigeringar, adressuppslag, bildanalys, personlig skrivstil och team-samarbete."
                    : `Återställs ${userStatus?.resetTime ? new Date(userStatus.resetTime).toLocaleDateString("sv-SE", { day: "numeric", month: "long" }) : "nästa månad"}`}
                </p>
              </div>
              {plan === "free" && (
                <Button
                  size="sm"
                  onClick={() => startCheckout("pro")}
                  disabled={isCheckoutPending}
                  className="shrink-0 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover"
                >
                  {isCheckoutPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Uppgradera till Pro"}
                </Button>
              )}
            </div>
          </div>
        )}

        {isAuthenticated && lastError && !isPending && (
          <div className="mb-6 rounded-xl border overflow-hidden" style={{ borderColor: "#FECACA" }}>
            <div className="px-5 py-4" style={{ background: "#FEF2F2" }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: "#DC2626" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#991B1B" }}>{lastError.title}</p>
                  <p className="text-xs mt-1" style={{ color: "#7F1D1D" }}>{lastError.message}</p>
                  {lastError.code && (
                    <p className="text-[11px] mt-1.5" style={{ color: "#B91C1C" }}>Kod: {lastError.code}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {lastSubmitData && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSubmit(lastSubmitData)}
                        disabled={isPending}
                        className="text-xs"
                        style={{ borderColor: "#FCA5A5", color: "#991B1B", background: "#fff" }}
                      >
                        Försök igen
                      </Button>
                    )}
                    {lastError.actionType === "upgrade" && (
                      <Button
                        size="sm"
                        onClick={() => startCheckout(plan === "free" ? "pro" : "premium")}
                        disabled={isCheckoutPending}
                        className="text-xs font-semibold"
                        style={{ background: "#2D6A4F", color: "#fff" }}
                      >
                        {isCheckoutPending ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
                        {lastError.actionLabel || "Uppgradera konto"}
                      </Button>
                    )}
                    <Link href="/settings" className="text-xs font-medium hover:underline" style={{ color: "#7F1D1D" }}>
                      Öppna inställningar
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main grid — 12 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-7 items-start">
          <div className="hidden lg:flex lg:col-span-7 items-center justify-between px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Input</p>
              <p className="text-sm font-semibold" style={{ color: "#1D2939" }}>Objektdata och skrivinställningar</p>
            </div>
          </div>
          <div className="hidden lg:flex lg:col-span-5 items-center justify-between px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Output</p>
              <p className="text-sm font-semibold" style={{ color: "#1D2939" }}>Resultat, kvot och arbetsyta</p>
            </div>
          </div>

          {/* ── LEFT: Form ── */}
          <div className="lg:col-span-7">
            <div className="pro-card pro-card-premium rounded-2xl p-5 sm:p-6">
              <PromptFormProfessional
                onSubmit={handleSubmit}
                isPending={isPending}
                disabled={isAuthenticated && remaining === 0}
                isPro={plan === "pro" || plan === "premium"}
              />
            </div>

            {/* Loading progress with skeleton */}
            {isPending && (
              <div className="mt-4 pro-card pro-card-premium rounded-2xl p-5">
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Generering pågår — steg {progressStep}/{LOADING_STEPS_COUNT}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden mb-4 bg-border">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-primary"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <PromptGenerationSkeleton step={loadingStep} total={LOADING_STEPS_COUNT} message={loadingMessage} />
              </div>
            )}
          </div>

          {/* ── RIGHT: Result or sidebar ── */}
          <div ref={resultRef} className="lg:col-span-5">
            <div className="space-y-6 lg:sticky lg:top-24">
              {result ? (
                <div className="animate-fade-in">
                  <ResultSection
                    result={result}
                    onNewPrompt={() => setResult(null)}
                    onRegenerate={lastSubmitData ? () => handleSubmit(lastSubmitData) : undefined}
                    isRegenerating={isPending}
                  />
                </div>
              ) : (
                <BeforeAfterDemo />
              )}

              {/* Usage indicator */}
              {isAuthenticated && (
                <div className="pro-card pro-card-premium rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Månadskvot</span>
                    {plan === "premium" ? (
                      <Badge size="sm" className="bg-purple-600 text-white border-transparent">
                        Premium
                      </Badge>
                    ) : plan === "pro" ? (
                      <Badge variant="success" size="sm">
                        Pro
                      </Badge>
                    ) : (
                      <Badge variant="secondary" size="sm">
                        Gratis
                      </Badge>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-end justify-between mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-bold ${remaining === 0 ? "text-error" : "text-foreground"}`}>{remaining}</span>
                        <span className="text-sm text-muted-foreground">/ {limit} kvar</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{used} använda</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          remaining === 0 ? "bg-error" : plan === "premium" ? "bg-purple-600" : "bg-success"
                        }`}
                        style={{
                          width: `${Math.min(100, (used / limit) * 100)}%`,
                        }}
                      />
                    </div>
                    {userStatus?.resetTime && (
                      <p className="text-xs mt-2.5 text-muted-foreground">
                        Återställs {new Date(userStatus.resetTime).toLocaleDateString("sv-SE", { day: "numeric", month: "long" })}
                      </p>
                    )}
                    <div className="mt-4 rounded-lg border border-border px-3 py-3 text-xs bg-muted text-muted-foreground">
                      <p className="font-semibold mb-1 text-foreground">För bäst resultat</p>
                      <p>Fyll först i adress, område, boarea, skick, planlösning och objektets starkaste säljpunkter. Resten är förfining.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upgrade CTA */}
              {isAuthenticated && plan !== "premium" && (
                <div className="pro-card pro-card-premium rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                      {plan === "free" ? "Uppgradera" : "Uppgradera till Premium"}
                    </p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: "#1D2939", fontFamily: "'Lora', Georgia, serif" }}>
                      {plan === "free" ? "Fler objekt per månad." : "Maximal kapacitet."}
                    </p>
                  </div>
                  <div className="p-4 bg-white space-y-3">
                    {plan === "free" && (
                      <div className="rounded-lg border p-4" style={{ borderColor: "#BBF7D0", background: "#F0FDF4" }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-bold" style={{ color: "#2D6A4F" }}>Pro</span>
                              <span className="text-xs font-semibold" style={{ color: "#1D2939" }}>299 kr/mån</span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: "#4B5563" }}>
                              <span>10 texter / mån</span>
                              <span>40 AI-redigeringar</span>
                              <span>Adressuppslag</span>
                              <span>Bildanalys</span>
                              <span>Team-samarbete</span>
                            </div>
                          </div>
                          <Button
                            onClick={() => startCheckout("pro")}
                            disabled={isCheckoutPending}
                            size="sm"
                            className="shrink-0 text-xs font-semibold h-8"
                            style={{ background: "#2D6A4F", color: "#fff" }}
                          >
                            {isCheckoutPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Välj Pro"}
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="rounded-lg border p-4" style={{ borderColor: "#DDD6FE", background: "#F5F3FF" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-bold" style={{ color: "#7C3AED" }}>Premium</span>
                            <span className="text-xs font-semibold" style={{ color: "#1D2939" }}>599 kr/mån</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: "#4B5563" }}>
                            <span>25 texter / mån</span>
                            <span>120 AI-redigeringar</span>
                            <span>Adressuppslag</span>
                            <span>Bildanalys</span>
                            <span>Team-samarbete</span>
                            <span>Mer kapacitet</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => startCheckout("premium")}
                          disabled={isCheckoutPending}
                          size="sm"
                          className="shrink-0 text-xs font-semibold h-8"
                          style={{ background: "#7C3AED", color: "#fff" }}
                        >
                          {isCheckoutPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Välj Premium"}
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-center pt-1" style={{ color: "#9CA3AF" }}>
                      Ingen bindningstid · Avsluta när du vill
                    </p>
                    <div className="pt-1 text-center">
                      <Link href="/settings" className="text-[11px] font-medium hover:underline" style={{ color: "#4B5563" }}>
                        Se full planjämförelse i Inställningar
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* History panel — logged in users */}
              {isAuthenticated && (
                <div className="pro-card pro-card-premium rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Historik</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: "#1D2939", fontFamily: "'Lora', Georgia, serif" }}>Tidigare genereringar</p>
                  </div>
                  <div className="p-4">
                    <HistoryPanel />
                  </div>
                </div>
              )}

              {/* Personal Style — Pro & Premium users */}
              {isAuthenticated && (plan === "pro" || plan === "premium") && (
                <div className="pro-card pro-card-premium rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Personlig stil</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: "#1D2939", fontFamily: "'Lora', Georgia, serif" }}>Kalibrera tonalitet med dina exempel</p>
                  </div>
                  <div className="p-4">
                    <PersonalStyle />
                  </div>
                </div>
              )}

              {/* Not logged in — sidebar CTA */}
              {!isAuthenticated && (
                <div className="pro-card pro-card-premium rounded-2xl overflow-hidden">
                  <div className="px-5 py-4" style={{ background: "#2D6A4F" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#A7F3D0" }}>Gratis konto</p>
                    <p className="text-base font-semibold mt-0.5 text-white" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                      2 texter per månad, gratis
                    </p>
                  </div>
                  <div className="p-5 bg-white space-y-2.5">
                    {[
                      "5 textformat per generering",
                      "Hemnet + Booli-anpassad huvudtext",
                      "Stilmedvetet klyschfilter",
                      "Inget kreditkort krävs",
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-2 text-xs" style={{ color: "#374151" }}>
                        <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#2D6A4F" }} />
                        {f}
                      </div>
                    ))}
                    <Button
                      onClick={() => setAuthModalOpen(true)}
                      className="w-full font-semibold mt-1"
                      style={{ background: "#2D6A4F", color: "#fff" }}
                    >
                      Kom igång gratis
                      <ChevronRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t mt-4 py-4 hidden xl:block" style={{ borderColor: "#E8E5DE" }}>
        <div className="max-w-[2200px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-14 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: "#9CA3AF" }}>
          <span>© {new Date().getFullYear()} OptiPrompt</span>
          <div className="flex gap-4">
            <Link href="/history" className="hover:underline" style={{ color: "#9CA3AF" }}>Historik</Link>
            <Link href="/teams" className="hover:underline" style={{ color: "#9CA3AF" }}>Team</Link>
            <Link href="/privacy" className="hover:underline" style={{ color: "#9CA3AF" }}>Integritetspolicy</Link>
            <Link href="/terms" className="hover:underline" style={{ color: "#9CA3AF" }}>Villkor</Link>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
