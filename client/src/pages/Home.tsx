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
  Loader2, LogOut, FileText, Clock, Crown, ChevronRight, ArrowUp, Check, Settings, KeyRound,
} from "lucide-react";
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
    label: "Instagram",
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
  const { mutate, isPending } = useOptimize();
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
  const loadingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const LOADING_STEPS = [
    "Analyserar fastighetsdata...",
    "Matchar exempeltexter...",
    "Skriver objektbeskrivning...",
    "Genererar rubrik & Instagram-text...",
    "Skapar visningsinbjudan & kortannons...",
    "Faktagranskar alla texter...",
    "Putsar och finsliper...",
  ];

  useEffect(() => {
    if (isPending) {
      setLoadingStep(0);
      loadingInterval.current = setInterval(() => {
        setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
      }, 3000);
    } else {
      if (loadingInterval.current) clearInterval(loadingInterval.current);
    }
    return () => { if (loadingInterval.current) clearInterval(loadingInterval.current); };
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
  const areaSearchesRemaining = userStatus?.areaSearchesRemaining ?? 0;
  const areaSearchesLimit = userStatus?.areaSearchesLimit ?? 0;
  const areaSearchesUsed = userStatus?.areaSearchesUsed ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7" }}>

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "#FAFAF7", borderColor: "#E8E5DE" }}>
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
                <div className="hidden sm:flex items-center gap-2 text-sm px-3 py-1.5 rounded-full" style={{ background: "#F0EDE6", color: "#4B5563" }}>
                  <span className="font-medium" style={{ color: "#2D6A4F" }}>{remaining}</span>
                  <span className="text-xs">/</span>
                  <span className="text-xs">{limit} denna månad</span>
                </div>

                {/* History link */}
                <Link href="/history">
                  <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-sm">Historik</span>
                  </Button>
                </Link>

                {/* Pro/Premium badge or upgrade */}
                {(plan === "pro" || plan === "premium") ? (
                  <div className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: plan === "premium" ? "#8B5CF6" : "#D4AF37", color: "#fff" }}>
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
                    Uppgradera
                  </Button>
                )}

                {/* Manage subscription (Pro/Premium only) */}
                {(plan === "pro" || plan === "premium") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openPortal()}
                    disabled={isPortalPending}
                    className="text-gray-500 hover:text-gray-700 gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">Konto</span>
                  </Button>
                )}

                {/* Change password */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChangePasswordOpen(true)}
                  className="text-gray-500 hover:text-gray-700 gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Lösenord</span>
                </Button>

                {/* User email (hidden on mobile) + logout (always visible) */}
                <div className="flex items-center gap-2 pl-3 border-l" style={{ borderColor: "#E8E5DE" }}>
                  <span className="hidden md:inline text-xs text-gray-500 max-w-[140px] truncate">{user?.email}</span>
                  <button onClick={() => logout()} className="text-gray-400 hover:text-red-500 transition-colors" title="Logga ut">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
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
            <h1 className="text-2xl sm:text-3xl leading-snug mb-2" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
              5 texter. 1 klick. Redo att publicera.
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
              Fyll i fastighetsdata — få objektbeskrivning, rubrik, Instagram-inlägg, visningsinbjudan och kortannons. Allt på en gång.
            </p>
          </div>
        )}

        {/* Limit warning */}
        {isAuthenticated && remaining === 0 && !result && (
          <div className="mb-8 flex items-center gap-4 p-4 rounded-lg border" style={{ background: "#FFF7ED", borderColor: "#FDBA74" }}>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "#9A3412" }}>Du har använt alla {limit} beskrivningar denna månad</p>
              <p className="text-xs mt-0.5" style={{ color: "#C2410C" }}>
                {plan === "free"
                  ? "Uppgradera till Pro för 10 genereringar per månad."
                  : `Nästa reset: ${userStatus?.resetTime || "nästa månad"}`}
              </p>
              {plan === "free" && (
                <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                  Vill du använda "Sök läge"? Uppgradera till Pro för obegränsad adress-sökning!
                </p>
              )}
            </div>
            {plan === "free" && (
              <Button
                size="sm"
                onClick={() => startCheckout("pro")}
                disabled={isCheckoutPending}
                className="shrink-0 text-xs font-medium"
                style={{ background: "#2D6A4F", color: "#fff" }}
              >
                Uppgradera till Pro
              </Button>
            )}
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
                <PromptGenerationSkeleton />
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

                {/* Usage indicator for logged in */}
                {isAuthenticated && (
                  <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#E8E5DE" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Användning denna månad</span>
                      <span className="text-xs font-medium" style={{ color: plan === "pro" ? "#D4AF37" : plan === "premium" ? "#8B5CF6" : "#6B7280" }}>
                        {plan === "pro" ? "Pro" : plan === "premium" ? "Premium" : "Gratis"}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#F0EDE6" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ background: plan === "premium" ? "#8B5CF6" : "#2D6A4F", width: `${Math.min(100, (used / limit) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs mt-2" style={{ color: "#9CA3AF" }}>
                      {remaining} av {limit} texter kvar
                    </p>
                  </div>
                )}

                {/* Upgrade CTA — show relevant options based on current plan */}
                {isAuthenticated && plan !== "premium" && (
                  <div className="rounded-xl border p-6" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
                    <h3 className="text-base font-semibold mb-2" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
                      {plan === "free" ? "Behöver du fler beskrivningar?" : "Uppgradera till Premium"}
                    </h3>
                    <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
                      {plan === "free"
                        ? "Välj mellan Pro (10 genereringar/månad) eller Premium (25 genereringar/månad)."
                        : "Premium ger dig 25 genereringar/mån, 100 AI-redigeringar, längre texter och priority support."
                      }
                    </p>

                    {/* Show both options for free users */}
                    {plan === "free" && (
                      <div className="space-y-3 mb-5">
                        <div className="border rounded-lg p-3" style={{ borderColor: "#E8E5DE" }}>
                          <h4 className="font-medium text-sm mb-2" style={{ color: "#2D6A4F" }}>Pro - 299kr/månad</h4>
                          <ul className="space-y-1">
                            {["10 genereringar / månad", "30 AI-textredigeringar", "Personlig skrivstil", "Adressuppslag & områdesinfo"].map((f) => (
                              <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "#374151" }}>
                                <Check className="w-3 h-3 flex-shrink-0" style={{ color: "#2D6A4F" }} />
                                {f}
                              </li>
                            ))}
                          </ul>
                          <Button
                            onClick={() => startCheckout("pro")}
                            disabled={isCheckoutPending}
                            className="w-full mt-2 font-medium text-sm"
                            style={{ background: "#2D6A4F", color: "#fff" }}
                          >
                            {isCheckoutPending ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-2" />
                            ) : (
                              <Crown className="w-3 h-3 mr-2" />
                            )}
                            Välj Pro
                          </Button>
                        </div>

                        <div className="border rounded-lg p-3" style={{ borderColor: "#E8E5DE" }}>
                          <h4 className="font-medium text-sm mb-2" style={{ color: "#8B5CF6" }}>Premium - 599kr/månad</h4>
                          <ul className="space-y-1">
                            {["25 genereringar / månad", "100 AI-textredigeringar", "Längre texter (800 ord)", "Priority support"].map((f) => (
                              <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "#374151" }}>
                                <Check className="w-3 h-3 flex-shrink-0" style={{ color: "#8B5CF6" }} />
                                {f}
                              </li>
                            ))}
                          </ul>
                          <Button
                            onClick={() => startCheckout("premium")}
                            disabled={isCheckoutPending}
                            className="w-full mt-2 font-medium text-sm"
                            style={{ background: "#8B5CF6", color: "#fff" }}
                          >
                            {isCheckoutPending ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-2" />
                            ) : (
                              <Crown className="w-3 h-3 mr-2" />
                            )}
                            Välj Premium
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Show premium upgrade for pro users */}
                    {plan === "pro" && (
                      <ul className="space-y-2 mb-5">
                        {[
                          "25 genereringar / månad",
                          "100 AI-textredigeringar / månad",
                          "Längre texter (upp till 800 ord)",
                          "Priority support"
                        ].map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#374151" }}>
                            <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#8B5CF6" }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Single premium button for pro users */}
                    {plan === "pro" && (
                      <Button
                        onClick={() => startCheckout("premium")}
                        disabled={isCheckoutPending}
                        className="w-full font-medium"
                        style={{ background: "#8B5CF6", color: "#fff" }}
                      >
                        {isCheckoutPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Crown className="w-4 h-4 mr-2" />
                        )}
                        Uppgradera till Premium (599kr/mån)
                      </Button>
                    )}
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

                {/* Not logged in — minimal CTA in sidebar */}
                {!isAuthenticated && (
                  <div className="rounded-xl border p-6 text-center" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
                    <h3 className="text-base font-semibold mb-2" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
                      Skapa ett konto gratis
                    </h3>
                    <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
                      Få 3 kostnadsfria objektbeskrivningar per månad.
                    </p>
                    <Button
                      onClick={() => setAuthModalOpen(true)}
                      className="font-medium"
                      style={{ background: "#2D6A4F", color: "#fff" }}
                    >
                      Kom igång — det är gratis
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
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
