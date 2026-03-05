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
  Loader2, LogOut, FileText, Clock, Crown, ChevronRight, ArrowUp, Check, Settings, KeyRound, User, ChevronDown, SlidersHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const BEFORE_AFTER = [
  {
    label: "Objektbeskrivning",
    before: `Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor och en ljus och luftig atmosfär. Bostaden präglas av en genomtänkt planlösning som bjuder på en harmonisk känsla. Köket är genomtänkt och stilfullt renoverat vilket gör det perfekt för den matlagningsintresserade. Kontakta oss för visning!`,
    after: `Storgatan 12, 3 tr, Uppsala. Trea om 76 kvm med balkong i söderläge.\n\nHallen har garderob. Vardagsrummet med tre fönster och ekparkett, takhöjd 2,70 m.\n\nKöket renoverat 2022 med Ballingslöv-luckor och Siemens-vitvaror. Matplats för fyra.\n\nSovrummet rymmer dubbelsäng. Badrummet helkaklat med dusch, renoverat 2020.\n\nBalkong 4 kvm i söderläge. BRF Storgården, avgift 3 900 kr/mån.\n\nResecentrum 5 minuter. Coop 200 meter.`,
  },
  {
    label: "Socialt inlägg",
    before: `Fantastisk lägenhet i Uppsala! Ljus och luftig med generösa ytor och genomtänkt planlösning. Perfekt för den som söker ett modernt och stilrent boende i hjärtat av staden. Kontakta oss för mer info! ❤️ #Uppsala #Lägenhet #Drömboende`,
    after: `Storgatan 12, Uppsala. Trea om 76 kvm med Ballingslöv-kök från 2022 och balkong i söderläge. Ekparkett och takhöjd 2,70 m. Badrum renoverat 2020. BRF Storgården, avgift 3 900 kr/mån.\nUppsala resecentrum 5 minuter — pendlingsavstånd till Stockholm.\n\n#Uppsala #Hemnet #Lägenhet #Balkong #TillSalu`,
  },
  {
    label: "Visningsinbjudan",
    before: `Välkommen på visning av denna underbara lägenhet! Missa inte chansen att se denna fantastiska bostad som erbjuder allt du kan önska dig. Vi ser fram emot att träffa dig!\n\nTid: [TID]\nPlats: Storgatan 12\nAnmälan: [KONTAKT]`,
    after: `Visning — Storgatan 12, 3 tr, Uppsala.\nTrea om 76 kvm med renoverat kök 2022 och balkong i söderläge. Ekparkett, takhöjd 2,70 m. Badrum 2020.\n\nTid: [TID]\nPlats: Storgatan 12, 3 tr\nAnmälan: [KONTAKT]`,
  },
];

function BeforeAfterDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const item = BEFORE_AFTER[activeTab];

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E8E5DE" }}>
      <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: "#E8E5DE" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2D6A4F" }}></div>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
            Vad AI:n skriver — på riktigt
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
              Vanlig AI / ChatGPT
            </span>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#9CA3AF", fontStyle: "italic" }}>
            {item.before}
          </p>
        </div>
        <div className="border-t pt-4" style={{ borderColor: "#F3F4F6" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: "#DCFCE7", color: "#16A34A" }}>
              OptiPrompt
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
  const { mutate, isPending, setProgressCallback } = useOptimize();
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
    setLastSubmitData(data);
    mutate(data, {
      onSuccess: (res: OptimizeResponse) => {
        setResult(res);
        queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      },
      onError: (error: any) => {
        if (error.limitReached) {
          toast({
            title: "Månadskvot uppnådd",
            description: "Uppgradera till Pro för fler beskrivningar.",
          });
        } else {
          toast({
            title: "Något gick fel",
            description: error?.message || "Kunde inte generera text.",
          });
        }
      },
    });
  };

  const plan = userStatus?.plan || "free";
  const remaining = userStatus?.textsRemaining ?? 0;
  const limit = userStatus?.monthlyTextLimit ?? 2;
  const used = userStatus?.textsUsedThisMonth ?? 0;
  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7" }}>

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(250,250,247,0.95)", backdropFilter: "blur(8px)", borderColor: "#E8E5DE" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#2D6A4F" }}>
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
              OptiPrompt
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {authLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : isAuthenticated ? (
              <>
                {/* Usage pill */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: "#F0EDE6", color: "#4B5563" }}>
                  <span className="font-semibold" style={{ color: "#2D6A4F" }}>{remaining}</span>
                  <span>/</span>
                  <span>{limit}</span>
                </div>

                {/* Plan badge or upgrade */}
                {(plan === "pro" || plan === "premium") ? (
                  <div className="hidden sm:flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: plan === "premium" ? "#8B5CF6" : "#D4AF37", color: "#fff" }}>
                    <Crown className="w-3 h-3" />
                    {plan === "premium" ? "Premium" : "Pro"}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => startCheckout("pro")}
                    disabled={isCheckoutPending}
                    className="text-xs font-medium gap-1"
                    style={{ background: "#2D6A4F", color: "#fff" }}
                  >
                    {isCheckoutPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUp className="w-3 h-3" />}
                    <span className="hidden sm:inline">Uppgradera</span>
                  </Button>
                )}

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition-colors border" style={{ borderColor: "#E8E5DE" }}>
                      <User className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline max-w-[120px] truncate">{user?.email?.split("@")[0]}</span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2 border-b" style={{ borderColor: "#F3F4F6" }}>
                      <p className="text-xs font-medium text-gray-700 truncate">{user?.email}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{plan === "premium" ? "Premium" : plan === "pro" ? "Pro" : "Gratis"}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/history" className="flex items-center gap-2 cursor-pointer">
                        <Clock className="w-3.5 h-3.5" />
                        Historik
                      </Link>
                    </DropdownMenuItem>
                    {(plan === "pro" || plan === "premium") && (
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
                    <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-red-600 focus:text-red-600">
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
                className="text-sm font-medium"
                style={{ background: "#2D6A4F", color: "#fff" }}
              >
                Logga in
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Hero — only when no result is showing (logged in users) */}
        {isAuthenticated && !result && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h1 className="text-2xl sm:text-3xl leading-snug" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
                Fyll i fastighetsdata. Få 5 texter.
              </h1>
              {userStatus?.resetTime && (
                <span className="text-xs shrink-0" style={{ color: "#9CA3AF" }}>
                  Kvot återställs {new Date(userStatus.resetTime).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Objektbeskrivning", sub: "Hemnet & Booli" },
                { label: "Rubrik", sub: "max 70 tecken" },
                { label: "Socialt inlägg", sub: "+ hashtags" },
                { label: "Visningsinbjudan", sub: "mäklarinfo" },
                { label: "Kortannons", sub: "max 40 ord" },
              ].map((pill) => (
                <div key={pill.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#2D6A4F" }} />
                  <span className="font-medium" style={{ color: "#374151" }}>{pill.label}</span>
                  <span style={{ color: "#9CA3AF" }}>· {pill.sub}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Limit warning */}
        {isAuthenticated && remaining === 0 && !result && (
          <div className="mb-6 rounded-xl border overflow-hidden" style={{ borderColor: "#FDBA74" }}>
            <div className="px-5 py-3.5 flex items-center gap-4" style={{ background: "#FFF7ED" }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#F97316" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#9A3412" }}>Månadskvoten är slut</p>
                <p className="text-xs mt-0.5" style={{ color: "#C2410C" }}>
                  {plan === "free"
                    ? "Pro ger dig 10 genereringar + 40 AI-redigeringar per månad."
                    : `Återställs ${userStatus?.resetTime ? new Date(userStatus.resetTime).toLocaleDateString("sv-SE", { day: "numeric", month: "long" }) : "nästa månad"}`}
                </p>
              </div>
              {plan === "free" && (
                <Button
                  size="sm"
                  onClick={() => startCheckout("pro")}
                  disabled={isCheckoutPending}
                  className="shrink-0 text-xs font-semibold"
                  style={{ background: "#2D6A4F", color: "#fff" }}
                >
                  {isCheckoutPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Uppgradera till Pro"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Main grid — 12 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT: Form ── */}
          <div className={result ? "lg:col-span-5" : "lg:col-span-8"}>
            <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: "#E8E5DE" }}>
              <PromptFormProfessional
                onSubmit={handleSubmit}
                isPending={isPending}
                disabled={isAuthenticated && remaining === 0}
                isPro={plan === "pro" || plan === "premium"}
              />
            </div>

            {/* Loading progress with skeleton */}
            {isPending && (
              <div className="mt-4 bg-white rounded-xl border p-5" style={{ borderColor: "#E8E5DE" }}>
                <PromptGenerationSkeleton step={loadingStep} total={LOADING_STEPS_COUNT} message={loadingMessage} />
              </div>
            )}
          </div>

          {/* ── RIGHT: Result or sidebar ── */}
          <div ref={resultRef} className={result ? "lg:col-span-7" : "lg:col-span-4"}>
            {result ? (
              <div className="lg:sticky lg:top-24 animate-fade-in">
                <ResultSection
                  result={result}
                  onNewPrompt={() => setResult(null)}
                  onRegenerate={lastSubmitData ? () => handleSubmit(lastSubmitData) : undefined}
                  isRegenerating={isPending}
                />
              </div>
            ) : (
              <div className="space-y-5 lg:sticky lg:top-24">
                {/* Before/After demo */}
                <BeforeAfterDemo />

                {/* Usage indicator */}
                {isAuthenticated && (
                  <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E8E5DE" }}>
                    <div className="px-5 py-3 border-b flex items-center justify-between" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Månadskvot</span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: plan === "premium" ? "#F5F3FF" : plan === "pro" ? "#ECFDF5" : "#F3F4F6",
                          color: plan === "premium" ? "#7C3AED" : plan === "pro" ? "#2D6A4F" : "#4B5563",
                        }}
                      >
                        {plan === "pro" ? "Pro" : plan === "premium" ? "Premium" : "Gratis"}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-end justify-between mb-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold" style={{ color: remaining === 0 ? "#EF4444" : "#1D2939" }}>{remaining}</span>
                          <span className="text-sm" style={{ color: "#9CA3AF" }}>/ {limit} kvar</span>
                        </div>
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>{used} använda</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#F0EDE6" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            background: remaining === 0 ? "#EF4444" : plan === "premium" ? "#8B5CF6" : "#2D6A4F",
                            width: `${Math.min(100, (used / limit) * 100)}%`,
                          }}
                        />
                      </div>
                      {userStatus?.resetTime && (
                        <p className="text-[11px] mt-2.5" style={{ color: "#9CA3AF" }}>
                          Återställs {new Date(userStatus.resetTime).toLocaleDateString("sv-SE", { day: "numeric", month: "long" })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Upgrade CTA */}
                {isAuthenticated && plan !== "premium" && (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#E8E5DE" }}>
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
                                <span>Personlig skrivstil</span>
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
                              <span>800 ord / text</span>
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
                    </div>
                  </div>
                )}

                {/* History panel — logged in users */}
                {isAuthenticated && (
                  <HistoryPanel />
                )}

                {/* Personal Style — Pro & Premium users */}
                {isAuthenticated && (plan === "pro" || plan === "premium") && (
                  <PersonalStyle />
                )}

                {/* Not logged in — sidebar CTA */}
                {!isAuthenticated && (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#E8E5DE" }}>
                    <div className="px-5 py-4" style={{ background: "#2D6A4F" }}>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#A7F3D0" }}>Gratis konto</p>
                      <p className="text-base font-semibold mt-0.5 text-white" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                        2 texter per månad, gratis
                      </p>
                    </div>
                    <div className="p-5 bg-white space-y-2.5">
                      {[
                        "Objektbeskrivning, Hemnet & Booli",
                        "Rubrik, Instagram & kortannons",
                        "397+ klyschor filtreras bort",
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
            )}
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t mt-12 py-6" style={{ borderColor: "#E8E5DE" }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: "#9CA3AF" }}>
          <span>© {new Date().getFullYear()} OptiPrompt</span>
          <div className="flex gap-4">
            <Link href="/history" className="hover:underline" style={{ color: "#9CA3AF" }}>Historik</Link>
            <Link href="/teams" className="hover:underline" style={{ color: "#9CA3AF" }}>Teams</Link>
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
