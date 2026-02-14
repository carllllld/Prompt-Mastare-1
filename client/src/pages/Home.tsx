import { useState } from "react";
import { Link } from "wouter";
import { PromptFormProfessional } from "@/components/PromptFormProfessional";
import { ResultSection } from "@/components/ResultSection";
import { AuthModal } from "@/components/AuthModal";
import { useOptimize } from "@/hooks/use-optimize";
import { useUserStatus } from "@/hooks/use-user-status";
import { useStripeCheckout } from "@/hooks/use-stripe";
import { useAuth } from "@/hooks/use-auth";
import { type OptimizeResponse } from "@shared/schema";
import {
  Loader2, LogOut, FileText, Clock, Crown, ChevronRight, ArrowUp, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { mutate, isPending } = useOptimize();
  const { data: userStatus } = useUserStatus();
  const { mutate: startCheckout, isPending: isCheckoutPending } = useStripeCheckout();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleSubmit = (data: any) => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    mutate(data, {
      onSuccess: (res: OptimizeResponse) => {
        setResult(res);
        queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });
      },
      onError: (error: any) => {
        if (error.limitReached) {
          toast({
            title: "Dagskvot uppnådd",
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
  const remaining = userStatus?.promptsRemaining ?? 0;
  const limit = userStatus?.monthlyLimit ?? 2;
  const used = userStatus?.promptsUsedToday ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7" }}>

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "#FAFAF7", borderColor: "#E8E5DE" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
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
                  <span className="text-xs">{limit} idag</span>
                </div>

                {/* History link */}
                <Link href="/history">
                  <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-sm">Historik</span>
                  </Button>
                </Link>

                {/* Pro badge or upgrade */}
                {plan === "pro" ? (
                  <div className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "#D4AF37", color: "#fff" }}>
                    <Crown className="w-3 h-3" />
                    Pro
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

                {/* User email + logout */}
                <div className="hidden md:flex items-center gap-2 pl-3 border-l" style={{ borderColor: "#E8E5DE" }}>
                  <span className="text-xs text-gray-500 max-w-[140px] truncate">{user?.email}</span>
                  <button onClick={() => logout()} className="text-gray-400 hover:text-red-500 transition-colors">
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
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Hero — only when no result is showing */}
        {!result && (
          <div className="mb-10 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl leading-snug mb-3" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
              Skriv objektbeskrivningar som säljer
            </h1>
            <p className="text-base leading-relaxed" style={{ color: "#6B7280" }}>
              Fyll i fastighetsdata nedan. AI:n genererar en professionell annonstext
              redo för Hemnet, Booli eller din egen hemsida.
            </p>
          </div>
        )}

        {/* Limit warning */}
        {isAuthenticated && remaining === 0 && !result && (
          <div className="mb-8 flex items-center gap-4 p-4 rounded-lg border" style={{ background: "#FFF7ED", borderColor: "#FDBA74" }}>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "#9A3412" }}>Du har använt alla {limit} beskrivningar idag</p>
              <p className="text-xs mt-0.5" style={{ color: "#C2410C" }}>
                {plan === "free"
                  ? "Uppgradera till Pro för 20 beskrivningar per dag."
                  : `Nästa reset: ${userStatus?.resetTime || "imorgon"}`}
              </p>
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

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── LEFT: Form ── */}
          <div className={result ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="bg-white rounded-xl border p-6 sm:p-8" style={{ borderColor: "#E8E5DE" }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
                  Fastighetsdata
                </h2>
                {isAuthenticated && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#F0EDE6", color: "#6B7280" }}>
                    {remaining} kvar idag
                  </span>
                )}
              </div>
              <PromptFormProfessional
                onSubmit={handleSubmit}
                isPending={isPending}
                disabled={isAuthenticated && remaining === 0}
                isPro={plan === "pro"}
              />
            </div>
          </div>

          {/* ── RIGHT: Result or placeholder ── */}
          <div className={result ? "lg:col-span-3" : "lg:col-span-2"}>
            {result ? (
              <ResultSection
                result={result}
                onNewPrompt={() => setResult(null)}
              />
            ) : (
              <div className="space-y-6">
                {/* Preview card */}
                <div className="bg-white rounded-xl border p-6 sm:p-8" style={{ borderColor: "#E8E5DE" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2D6A4F" }}></div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>
                      Så här funkar det
                    </span>
                  </div>
                  <ol className="space-y-4">
                    {[
                      { step: "1", text: "Fyll i fastighetens data i formuläret" },
                      { step: "2", text: "Välj plattform — Hemnet, Booli eller allmän" },
                      { step: "3", text: "AI:n genererar en komplett objektbeskrivning" },
                      { step: "4", text: "Kopiera texten direkt till din annons" },
                    ].map((item) => (
                      <li key={item.step} className="flex items-start gap-3">
                        <span
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: "#E8F5E9", color: "#2D6A4F" }}
                        >
                          {item.step}
                        </span>
                        <span className="text-sm leading-relaxed pt-0.5" style={{ color: "#4B5563" }}>
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Upgrade CTA — only for free users */}
                {isAuthenticated && plan === "free" && (
                  <div className="rounded-xl border p-6" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
                    <h3 className="text-base font-semibold mb-2" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
                      Behöver du fler beskrivningar?
                    </h3>
                    <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
                      Pro ger dig 20 beskrivningar per dag, prioriterad AI och längre texter.
                    </p>
                    <ul className="space-y-2 mb-5">
                      {["20 beskrivningar / dag", "Längre & mer detaljerade texter", "Social media-texter inkluderade", "Prioriterad AI-bearbetning"].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#374151" }}>
                          <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#2D6A4F" }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => startCheckout("pro")}
                      disabled={isCheckoutPending}
                      className="w-full font-medium"
                      style={{ background: "#2D6A4F", color: "#fff" }}
                    >
                      {isCheckoutPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Crown className="w-4 h-4 mr-2" />
                      )}
                      Uppgradera till Pro
                    </Button>
                  </div>
                )}

                {/* Not logged in CTA */}
                {!isAuthenticated && (
                  <div className="rounded-xl border p-6 text-center" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
                    <h3 className="text-base font-semibold mb-2" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
                      Skapa ett konto gratis
                    </h3>
                    <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
                      Få 2 kostnadsfria objektbeskrivningar varje dag.
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
      <footer className="border-t mt-16 py-8" style={{ borderColor: "#E8E5DE" }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: "#9CA3AF" }}>
          <span>© {new Date().getFullYear()} OptiPrompt</span>
          <div className="flex gap-4">
            <Link href="/history" className="hover:underline" style={{ color: "#9CA3AF" }}>Historik</Link>
            <Link href="/teams" className="hover:underline" style={{ color: "#9CA3AF" }}>Teams</Link>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}
