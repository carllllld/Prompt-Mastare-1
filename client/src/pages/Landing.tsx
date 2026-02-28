import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Crown, Check, ArrowRight, Zap, Shield, FileText,
  Sparkles, BarChart3, Users, Pen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";

// ─── BEFORE / AFTER DEMO ───
const BEFORE_TEXT = `Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor och en härlig balkong. Bostaden präglas av ljusa och luftiga rum som bjuder på en underbar känsla. Det moderna köket är perfekt för den som älskar att laga mat. Här kan du njuta av lugnet i ett attraktivt och eftertraktat område. Missa inte denna unika möjlighet!`;

const AFTER_TEXT = `Storgatan 15, 3 tr, Vasastan. Trea om 78 kvm med genomgående planlösning och balkong mot innergård.

Köket renoverat 2022 med induktionshäll, kvartskomposit och plats för matbord vid fönstret. Vardagsrummet 24 kvm med fiskbensparkett och stuckaturer — balkongdörr mot söder.

Två sovrum: 14 kvm respektive 10 kvm. Badrum med kakel och golvvärme, renoverat 2020. Avgift 4 200 kr/mån, förening utan lån.

Visning söndag 13–14.`;

// ─── FEATURES ───
const FEATURES = [
  {
    icon: Zap,
    title: "5 texter på 15 sekunder",
    desc: "Objektbeskrivning, rubrik, Instagram, visningsinbjudan och kortannons — allt genereras samtidigt.",
  },
  {
    icon: Shield,
    title: "Faktagranskning med AI",
    desc: "Automatisk kontroll att texten stämmer med dina indata. Fångar faktafel innan publicering.",
  },
  {
    icon: Pen,
    title: "397+ klyschor filtreras bort",
    desc: "Ingen 'generös planlösning', 'bjuder på utsikt' eller 'välkommen till'. Ren faktabaserad svenska.",
  },
  {
    icon: BarChart3,
    title: "Områdesanalys",
    desc: "AI:n analyserar marknadsposition, arkitektoniskt värde och köparpsykologi för varje objekt.",
  },
  {
    icon: Sparkles,
    title: "Personlig skrivstil",
    desc: "Ladda upp dina bästa texter — AI:n lär sig din ton och skriver som du, fast snabbare.",
  },
  {
    icon: Users,
    title: "Team-funktioner",
    desc: "Dela skrivstil och mallar med hela kontoret. Konsekvent kvalitet oavsett vem som skriver.",
  },
];

// ─── PRICING ───
const PLANS = [
  {
    name: "Gratis",
    price: "0",
    desc: "Testa med 2 objekt per månad",
    color: "#9CA3AF",
    features: [
      "2 genereringar / månad",
      "Hemnet + Booli-texter",
      "Rubrik, Instagram & kortannons",
      "Grundläggande AI-pipeline",
    ],
    cta: "Kom igång gratis",
    tier: null as null | "pro" | "premium",
    highlight: false,
  },
  {
    name: "Pro",
    price: "299",
    desc: "Perfekt för aktiva mäklare",
    color: "#2D6A4F",
    features: [
      "10 genereringar / månad",
      "30 AI-textredigeringar / månad",
      "Personlig skrivstil",
      "Adressuppslag & områdesinfo",
      "Faktagranskning",
      "Förbättringsförslag",
    ],
    cta: "Välj Pro",
    tier: "pro" as "pro",
    highlight: true,
  },
  {
    name: "Premium",
    price: "599",
    desc: "För dig med många objekt",
    color: "#8B5CF6",
    features: [
      "25 genereringar / månad",
      "100 AI-textredigeringar / månad",
      "Allt i Pro, plus:",
      "Längre texter (upp till 800 ord)",
      "Fler ordgränsinställningar",
      "Priority support",
    ],
    cta: "Välj Premium",
    tier: "premium" as "premium",
    highlight: false,
  },
  {
    name: "Byrå",
    price: null,
    desc: "Hela kontoret på en plattform",
    color: "#1D2939",
    features: [
      "Obegränsade genereringar",
      "Obegränsade AI-redigeringar",
      "Delade skrivstilsprofiler",
      "Flera användare & roller",
      "Volymprissättning",
      "Dedikerad support",
    ],
    cta: "Kontakta oss",
    tier: null as null | "pro" | "premium",
    highlight: false,
  },
];

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Already logged in → go straight to app
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/app");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  function openRegister() {
    setAuthMode("register");
    setAuthOpen(true);
  }
  function openLogin() {
    setAuthMode("login");
    setAuthOpen(true);
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", fontFamily: "system-ui, sans-serif" }}>

      {/* ════════ HEADER ════════ */}
      <header className="sticky top-0 z-40 border-b" style={{ background: "rgba(250,250,248,0.95)", backdropFilter: "blur(8px)", borderColor: "#E8E5DE" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-semibold text-lg tracking-tight" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
            OptiPrompt
          </span>
          <nav className="hidden sm:flex items-center gap-6 text-sm" style={{ color: "#6B7280" }}>
            <a href="#hur-det-funkar" className="hover:text-gray-900 transition-colors">Hur det funkar</a>
            <a href="#funktioner" className="hover:text-gray-900 transition-colors">Funktioner</a>
            <a href="#priser" className="hover:text-gray-900 transition-colors">Priser</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={openLogin} className="text-sm font-medium">
              Logga in
            </Button>
            <Button size="sm" onClick={openRegister} className="text-sm font-medium" style={{ background: "#2D6A4F", color: "#fff" }}>
              Testa gratis
            </Button>
          </div>
        </div>
      </header>

      {/* ════════ HERO ════════ */}
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-4xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8" style={{ background: "#E8F5E9", color: "#2D6A4F" }}>
            Byggt för svenska fastighetsmäklare
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-semibold leading-tight mb-6"
            style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}
          >
            Sluta skriva objektbeskrivningar.{" "}
            <span style={{ color: "#2D6A4F" }}>Börja publicera.</span>
          </h1>

          <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed" style={{ color: "#6B7280" }}>
            Fyll i fastighetens data. Få 5 publiceringsklara texter på 15 sekunder —
            Hemnet, rubrik, Instagram, visningsinbjudan och kortannons.
            Utan klyschor. Utan "generösa ytor".
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Button
              onClick={openRegister}
              className="text-base px-8 py-6 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              style={{ background: "#2D6A4F", color: "#fff" }}
            >
              Testa gratis — 2 genereringar/månad
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <span className="text-xs" style={{ color: "#9CA3AF" }}>Inget kort krävs</span>
          </div>

          {/* Stats — bara produktfakta, inga användarsiffror */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 pt-8 border-t" style={{ borderColor: "#E8E5DE" }}>
            {[
              { value: "15 sek", label: "per generering" },
              { value: "5 texter", label: "på en gång" },
              { value: "397+", label: "klyschor filtreras" },
              { value: "6 steg", label: "AI-pipeline" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl sm:text-2xl font-bold" style={{ color: "#2D6A4F" }}>{stat.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ HUR DET FUNKAR ════════ */}
      <section id="hur-det-funkar" className="py-16 sm:py-20" style={{ background: "#F8F6F1" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
              Tre steg. Klart.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Fyll i fastighetsdata", desc: "Adress, yta, rum, skick, balkong, renovering — allt i ett strukturerat formulär." },
              { step: "2", title: "AI genererar 5 texter", desc: "6-stegs pipeline: extraktion → analys → textgenerering → klyschfilter → faktagranskning → förbättringsförslag." },
              { step: "3", title: "Kopiera & publicera", desc: "Texterna är redo för Hemnet, Booli, Instagram och visningsinbjudan. Redigera om du vill." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4" style={{ background: "#2D6A4F", color: "#fff" }}>
                  {s.step}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "#1D2939" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ BEFORE / AFTER ════════ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4" style={{ background: "#FEE2E2", color: "#991B1B" }}>
              Före &amp; Efter
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
              Ser du skillnaden?
            </h2>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Vänster: typisk AI-text full av klyschor. Höger: OptiPrompt-resultat med faktabaserad svenska.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BEFORE */}
            <div className="bg-white rounded-xl border-2 p-6 relative" style={{ borderColor: "#FCA5A5" }}>
              <div className="absolute -top-3 left-4 px-3 py-0.5 rounded-full text-xs font-bold" style={{ background: "#FEE2E2", color: "#991B1B" }}>
                ✗ TYPISK AI-TEXT
              </div>
              <p className="text-sm leading-relaxed mt-2" style={{ color: "#4B5563" }}>
                {BEFORE_TEXT}
              </p>
              <div className="mt-4 pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: "#F3F4F6" }}>
                {["fantastiska", "generösa ytor", "bjuder på", "präglas av", "perfekt", "unika möjlighet", "Välkommen"].map((w) => (
                  <span key={w} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: "#FEE2E2", color: "#991B1B" }}>
                    {w}
                  </span>
                ))}
              </div>
              <p className="text-[10px] mt-2" style={{ color: "#9CA3AF" }}>7 AI-klyschor hittade</p>
            </div>

            {/* AFTER */}
            <div className="bg-white rounded-xl border-2 p-6 relative" style={{ borderColor: "#86EFAC" }}>
              <div className="absolute -top-3 left-4 px-3 py-0.5 rounded-full text-xs font-bold" style={{ background: "#DCFCE7", color: "#166534" }}>
                ✓ OPTIPROMPT
              </div>
              <p className="text-sm leading-relaxed mt-2 whitespace-pre-line" style={{ color: "#4B5563" }}>
                {AFTER_TEXT}
              </p>
              <div className="mt-4 pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: "#F3F4F6" }}>
                {["adress först", "exakta mått", "årtal", "konkret fakta", "kort & tydligt"].map((w) => (
                  <span key={w} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: "#DCFCE7", color: "#166534" }}>
                    {w}
                  </span>
                ))}
              </div>
              <p className="text-[10px] mt-2" style={{ color: "#9CA3AF" }}>0 klyschor. 100% fakta.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section id="funktioner" className="py-16 sm:py-20" style={{ background: "#F8F6F1" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
              Byggt för svenska mäklare
            </h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: "#6B7280" }}>
              Inte ytterligare ett "klistra in i ChatGPT"-verktyg. OptiPrompt är en 6-stegs AI-pipeline specifikt tränad för svensk fastighetsmarknad.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-xl border p-5" style={{ borderColor: "#E8E5DE" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "#E8F5E9" }}>
                  <f.icon className="w-5 h-5" style={{ color: "#2D6A4F" }} />
                </div>
                <h3 className="font-semibold text-sm mb-1.5" style={{ color: "#1D2939" }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ PRICING ════════ */}
      <section id="priser" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
              Enkel prissättning. Avsluta när du vill.
            </h2>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Varje generering ger 5 texter: objektbeskrivning, rubrik, Instagram, visningsinbjudan & kortannons.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-xl p-6 relative ${plan.highlight ? "border-2 shadow-lg" : "border"}`}
                style={{ borderColor: plan.highlight ? plan.color : "#E8E5DE" }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: plan.color }}>
                    Populärast
                  </div>
                )}
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: plan.color }}>
                  {plan.name}
                </div>
                {plan.price !== null ? (
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold" style={{ color: "#1D2939" }}>{plan.price} kr</span>
                    <span className="text-sm" style={{ color: "#9CA3AF" }}>/månad</span>
                  </div>
                ) : (
                  <div className="mb-1">
                    <span className="text-2xl font-bold" style={{ color: "#1D2939" }}>Anpassat</span>
                  </div>
                )}
                <p className="text-xs mb-6" style={{ color: "#6B7280" }}>{plan.desc}</p>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#374151" }}>
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.name === "Byrå" ? (
                  <a
                    href="mailto:info@optiprompt.se?subject=Byrå-plan%20förfrågan"
                    className="inline-flex items-center justify-center w-full font-medium rounded-md border px-4 py-2 text-sm transition-colors hover:opacity-90"
                    style={{ borderColor: plan.color, color: plan.color }}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Button
                    onClick={openRegister}
                    variant={plan.highlight ? "default" : "outline"}
                    className="w-full font-medium"
                    style={plan.highlight ? { background: plan.color, color: "#fff" } : {}}
                  >
                    {plan.tier && <Crown className="w-4 h-4 mr-2" />}
                    {plan.cta}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FINAL CTA ════════ */}
      <section className="py-16 sm:py-20" style={{ background: "#2D6A4F" }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-white" style={{ fontFamily: "'Lora', Georgia, serif" }}>
            Redo att testa?
          </h2>
          <p className="text-sm mb-8" style={{ color: "#A7F3D0" }}>
            Skapa ditt konto på 30 sekunder. Ingen bindningstid. Inga dolda avgifter. 2 gratis genereringar direkt.
          </p>
          <Button
            onClick={openRegister}
            className="text-base px-8 py-6 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            style={{ background: "#fff", color: "#2D6A4F" }}
          >
            <FileText className="w-5 h-5 mr-2" />
            Skapa konto gratis
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {["Inget kort krävs", "Avsluta när du vill", "GDPR-kompatibel"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-xs" style={{ color: "#A7F3D0" }}>
                <Check className="w-3 h-3" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-10 border-t" style={{ background: "#1D2939", borderColor: "#374151" }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-semibold" style={{ fontFamily: "'Lora', Georgia, serif", color: "#F9FAFB" }}>
            OptiPrompt
          </span>
          <div className="flex items-center gap-6 text-xs" style={{ color: "#9CA3AF" }}>
            <Link href="/privacy" className="hover:text-white transition-colors">Integritetspolicy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Villkor</Link>
            <a href="mailto:support@optiprompt.se" className="hover:text-white transition-colors">support@optiprompt.se</a>
          </div>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            © {new Date().getFullYear()} OptiPrompt
          </p>
        </div>
      </footer>

      {/* Auth modal */}
      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
      />
    </div>
  );
}
