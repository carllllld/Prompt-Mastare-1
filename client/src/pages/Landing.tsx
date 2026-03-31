import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Crown, Check, ArrowRight, FileCheck, Shield, FileText,
  UserCheck, BarChart3, Pen, Menu, X, Image, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";

const DEMO = [
  {
    label: "Rubrik",
    before: "Drömboende i toppskick!",
    after: "Helrenoverad trea med köksö och balkong i söder",
  },
  {
    label: "Objektbeskrivning",
    before:
      "Välkommen till denna fantastiska lägenhet med generösa ytor och en härlig balkong. Här bor du i ett attraktivt läge med närhet till allt du kan önska. Köket är perfekt för matlagning och hemmet bjuder på en underbar känsla. Missa inte denna unika möjlighet!",
    after:
      "Balkong i söder och kök renoverat 2022 med köksö i kvartskomposit. Lägenheten ligger på tredje våningen med fritt läge mot innergården.\n\nKöket har luckor från Ballingslöv, integrerade Siemens-vitvaror och matplats vid fönster mot gården. Vardagsrummet har ekparkett och utgång till balkongen.\n\nTvå sovrum mot gårdssidan. Badrummet är helkaklat och renoverat 2020 med golvvärme och kombimaskin.\n\nTunnelbana Östermalmstorg fyra minuter till fots. Nytorget med kaféer och matbutiker ligger ett kvarter bort.",
  },
  {
    label: "Social text",
    before:
      "Nu finns en fin lägenhet till salu! Ljus, fräsch och perfekt för dig som vill bo centralt. Hör av dig för mer information! #bostad #lägenhet",
    after:
      "Trea om 76 kvm med balkong i söder och kök renoverat 2022.\nLugnt gårdsläge, tunnelbana fyra minuter till fots.\n\nBoka visning via mäklaren.",
  },
  {
    label: "Visningsinbjudan",
    before:
      "Varmt välkommen på visning av denna fantastiska lägenhet! Ett hem med härlig känsla och smart planlösning.\n\nTid: [TID]\nPlats: Karlavägen 12\nAnmälan: [KONTAKT]",
    after:
      "Visning — Karlavägen 12, 3 tr.\nTrea med balkong i söder och kök renoverat 2022.\n\nTid: [TID]\nPlats: Karlavägen 12, 3 tr (port B)\nAnmälan via mäklaren.",
  },
  {
    label: "Kortannons",
    before: "Fin trea i bra område. Balkong. Måste ses!",
    after:
      "Trea om 76 kvm med balkong i söder och kök renoverat 2022. Helkaklat badrum 2020 med golvvärme. Tunnelbana fyra minuter.",
  },
];

function DemoTabs() {
  const [activeTab, setActiveTab] = useState(1);
  const item = DEMO[activeTab];

  return (
    <div className="bg-card rounded-xl border border-card-border overflow-hidden shadow-md">
      <div className="px-5 pt-4 pb-3 border-b border-border bg-muted">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Exempeloutput (förkortad)
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEMO.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                activeTab === i
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="p-6 border-b md:border-b-0 md:border-r border-border bg-error-bg/30">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-error-bg text-error border border-error/20">
            Typisk chatt-AI
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {item.before}
          </p>
          <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2">
            {["generös", "fantastisk", "bjuder på", "unik möjlighet", "perfekt"].map((w) => (
              <span key={w} className="px-2 py-0.5 rounded text-xs font-medium bg-error-bg text-error border border-error/20">
                {w}
              </span>
            ))}
          </div>
        </div>

        <div className="p-6 bg-success-bg/30">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-success-bg text-success border border-success/20">
            Mäklartexter
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {item.after}
          </p>
          <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2">
            {["fakta först", "plattformstext", "klyschfilter", "redo att publicera"].map((w) => (
              <span key={w} className="px-2 py-0.5 rounded text-xs font-medium bg-success-bg text-success border border-success/20">
                {w}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FEATURES ───
const FEATURES = [
  {
    icon: FileCheck,
    title: "5 texter i ett flöde",
    desc: "Objektbeskrivning, rubrik, socialt inlägg, visningsinbjudan och kortannons — oftast klart på under en minut.",
  },
  {
    icon: Shield,
    title: "Kvalitetskontroll mot dina uppgifter",
    desc: "Kontrollerar texten mot dina indata och korrigerar bara det som avviker. Körs vid behov. (Pro/Premium)",
  },
  {
    icon: Pen,
    title: "Stilmedvetet klyschfilter",
    desc: "Ingen 'generös planlösning', 'bjuder på utsikt' eller 'välkommen till'. Ren faktabaserad svenska.",
  },
  {
    icon: BarChart3,
    title: "Adressuppslag (beta)",
    desc: "Försöker fylla i kollektivtrafik och närområde från adressen. Träffsäkerheten varierar — granska alltid resultatet. (Pro/Premium)",
  },
  {
    icon: Building2,
    title: "Vitec-integration — importera & exportera",
    desc: "Anslut ditt Vitec-konto och importera objekt direkt från ditt CRM. Exportera AI-genererade texter tillbaka med ett klick. Spara 30+ minuter per objekt. (Pro/Premium)",
  },
  {
    icon: Image,
    title: "Textanalys med Hemnet-länk",
    desc: "Klistra in en Hemnet-länk — få AI-driven analys av befintlig annonstext med förbättringsförslag och omskrivning.",
  },
  {
    icon: UserCheck,
    title: "Personlig skrivstil",
    desc: "Ladda upp dina bästa texter — AI:n lär sig din ton och skriver som du, fast snabbare. (Pro/Premium)",
  },
  {
    icon: Crown,
    title: "Team-samarbete",
    desc: "Bjud in kollegor, dela prompter och jobba tillsammans i samma flöde. (Premium)",
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
      "5 textformat per generering",
      "Klyschfilter för svensk mäklarprosa",
      "200–300 ord per objektbeskrivning",
      "1 textanalys / månad (Hemnet-länk)",
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
      "40 AI-textredigeringar / månad",
      "5 textanalyser / månad (Hemnet-länk)",
      "Vitec-integration — importera & exportera direkt",
      "Adressuppslag — beta, granska resultatet",
      "Bildanalys (valfritt)",
      "Personlig skrivstil",
      "Kvalitetskontroll & förbättringsförslag (vid behov)",
      "Valfri textlängd (200–600 ord)",
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
      "Allt i Pro, plus:",
      "25 genereringar / månad",
      "120 AI-textredigeringar / månad",
      "15 textanalyser / månad (Hemnet-länk)",
      "Team-samarbete",
    ],
    cta: "Välj Premium",
    tier: "premium" as "premium",
    highlight: false,
  },
];

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
            Mäklartexter
          </span>
          <nav className="hidden sm:flex items-center gap-6 text-sm" style={{ color: "#6B7280" }}>
            <a href="#hur-det-funkar" className="hover:text-gray-900 transition-colors">Hur det funkar</a>
            <a href="#funktioner" className="hover:text-gray-900 transition-colors">Funktioner</a>
            <a href="#priser" className="hover:text-gray-900 transition-colors">Priser</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={openLogin} className="hidden sm:inline-flex text-sm font-medium">
              Logga in
            </Button>
            <Button size="sm" onClick={openRegister} className="text-sm font-medium" style={{ background: "#2D6A4F", color: "#fff" }}>
              Testa gratis
            </Button>
            {/* Mobile hamburger */}
            <button
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Stäng meny" : "Öppna meny"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" style={{ color: "#1D2939" }} /> : <Menu className="w-5 h-5" style={{ color: "#1D2939" }} />}
            </button>
          </div>
        </div>
        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t px-6 py-4 space-y-3" style={{ background: "rgba(250,250,248,0.98)", borderColor: "#E8E5DE" }}>
            <a href="#hur-det-funkar" onClick={() => setMobileMenuOpen(false)} className="block text-sm py-2" style={{ color: "#4B5563" }}>Hur det funkar</a>
            <a href="#funktioner" onClick={() => setMobileMenuOpen(false)} className="block text-sm py-2" style={{ color: "#4B5563" }}>Funktioner</a>
            <a href="#priser" onClick={() => setMobileMenuOpen(false)} className="block text-sm py-2" style={{ color: "#4B5563" }}>Priser</a>
            <div className="pt-2 border-t" style={{ borderColor: "#E8E5DE" }}>
              <Button variant="ghost" size="sm" onClick={() => { openLogin(); setMobileMenuOpen(false); }} className="w-full justify-start text-sm font-medium">
                Logga in
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ════════ HERO ════════ */}
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 bg-success-bg text-success border border-success/20">
            Byggt för svenska fastighetsmäklare
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-foreground">
            Sluta skriva objektbeskrivningar.{" "}
            <span className="text-primary">Börja publicera.</span>
          </h1>

          <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed text-muted-foreground">
            Fyll i fastighetens data. Få 5 publiceringsklara texter på under en minut —
            Hemnet, rubrik, socialt inlägg, visningsinbjudan och kortannons.
            Utan klyschor. Utan "generösa ytor".
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Button
              onClick={openRegister}
              size="lg"
              className="text-base px-8 py-6 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Testa gratis — 2 genereringar/månad
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <span className="text-xs text-muted-foreground">Inget kort krävs</span>
          </div>

          {/* Stats — bara produktfakta, inga användarsiffror */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 pt-8 border-t border-border">
            {[
              { value: "Under 1 min", label: "per generering" },
              { value: "5 texter", label: "på en gång" },
              { value: "Stilmedvetet", label: "klyschfilter" },
              { value: "Vitec-integration", label: "importera & exportera" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs mt-0.5 text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Vitec highlight banner */}
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="relative overflow-hidden rounded-xl border-2 p-6" style={{ 
              background: "linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)",
              borderColor: "#2D6A4F"
            }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-sm flex-shrink-0">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      Vitec-integration
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                      Nytt!
                    </span>
                  </div>
                  <p className="text-sm text-white/90 mb-3 leading-relaxed">
                    Anslut ditt Vitec-konto och importera objekt direkt från ditt CRM. 
                    Exportera AI-genererade texter tillbaka med ett klick. Spara 30+ minuter per objekt.
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-white/90">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Snabb import från Vitec</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-yellow-400" />
                      <span>AI-optimering</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Direkt export tillbaka</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
            </div>
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
              { step: "2", title: "AI bygger och skriver", desc: "Disposition + skrivplan → textgenerering → klyschfilter. Pro/Premium får även kvalitetskontroll och förbättringsfeedback vid behov." },
              { step: "3", title: "Kopiera & publicera", desc: "Texterna är redo för Hemnet, Instagram och visningsinbjudan. Redigera om du vill." },
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
              Vänster: generisk chatt-AI. Höger: Mäklartexter som skriver från dina uppgifter och levererar i rätt format.
            </p>
          </div>
          <DemoTabs />
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section id="funktioner" className="py-16 sm:py-20 bg-muted">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3 text-foreground">
              Byggt för svenska mäklare
            </h2>
            <p className="text-sm max-w-xl mx-auto text-muted-foreground">
              Inte en chatt. Ett publiceringsflöde för objektsbeskrivningar — med klyschfilter, formatmallar och kvalitetskontroller.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-card rounded-xl border border-card-border p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-success-bg">
                  <f.icon className="w-10 h-10 text-success" />
                </div>
                <h3 className="font-semibold text-base mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ PRICING ════════ */}
      <section id="priser" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3 text-foreground">
              Enkel prissättning. Avsluta när du vill.
            </h2>
            <p className="text-sm text-muted-foreground">
              Varje generering ger 5 texter: objektbeskrivning, rubrik, socialt inlägg, visningsinbjudan & kortannons.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`bg-card rounded-xl p-6 relative shadow-md transition-shadow hover:shadow-lg ${
                  plan.highlight ? "border-2 border-primary" : "border border-card-border"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                    Populärast
                  </div>
                )}
                <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-primary">
                  {plan.name}
                </div>
                {plan.price !== null ? (
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price} kr</span>
                    <span className="text-sm text-muted-foreground">/månad</span>
                  </div>
                ) : (
                  <div className="mb-1">
                    <span className="text-4xl font-bold text-foreground">Anpassat</span>
                  </div>
                )}
                <p className="text-xs mb-6 text-muted-foreground">{plan.desc}</p>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={openRegister}
                  variant={plan.highlight ? "default" : "outline"}
                  className="w-full font-medium"
                >
                  {plan.tier && <Crown className="w-4 h-4 mr-2" />}
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-6 text-muted-foreground">
            Team-samarbete ingår i Premium. Vitec-integration ingår i Pro och Premium.
          </p>
        </div>
      </section>

      {/* ════════ FINAL CTA ════════ */}
      <section className="py-16 sm:py-20" style={{ background: "#2D6A4F" }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-white" style={{ fontFamily: "'Lora', Georgia, serif" }}>
            Redo att testa?
          </h2>
          <p className="text-sm mb-8" style={{ color: "#A7F3D0" }}>
            Skapa ditt konto på under en minut. Ingen bindningstid. Inga dolda avgifter. 2 gratis genereringar direkt.
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
            Mäklartexter
          </span>
          <div className="flex items-center gap-6 text-xs" style={{ color: "#9CA3AF" }}>
            <Link href="/privacy" className="hover:text-white transition-colors">Integritetspolicy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Villkor</Link>
            <a href="mailto:support@maklartexter.se" className="hover:text-white transition-colors">support@maklartexter.se</a>
          </div>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            © {new Date().getFullYear()} Mäklartexter
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
