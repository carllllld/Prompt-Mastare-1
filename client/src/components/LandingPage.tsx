import { Crown, Check, ArrowRight, Zap, Shield, Clock, FileText, Sparkles, Star, BarChart3, Users, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingPageProps {
  onGetStarted: () => void;
  onStartCheckout: (tier: "pro" | "premium") => void;
  isCheckoutPending: boolean;
}

// ─── BEFORE / AFTER DEMO DATA ───
const BEFORE_TEXT = `Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor och en härlig balkong. Bostaden präglas av ljusa och luftiga rum som bjuder på en underbar känsla. Det moderna köket är perfekt för den som älskar att laga mat. Här kan du njuta av lugnet i ett attraktivt och eftertraktat område. Missa inte denna unika möjlighet!`;

const AFTER_TEXT = `Storgatan 15, 3 tr, Vasastan. Trea om 78 kvm med genomgående planlösning och balkong mot innergård.

Köket renoverat 2022 med induktionshäll, kvartskomposit och plats för matbord vid fönstret. Vardagsrummet 24 kvm med fiskbensparkett och stuckaturer — balkongdörr mot söder.

Två sovrum: 14 kvm respektive 10 kvm. Badrum med kakel och golvvärme, renoverat 2020. Avgift 4 200 kr/mån, förening utan lån.

Visning söndag 13–14.`;

// ─── TESTIMONIALS DATA ───
const TESTIMONIALS = [
  {
    name: "Maria Lindström",
    role: "Fastighetsmäklare, Bjurfors Göteborg",
    text: "Vi testade OptiPrompt på ett svårsålt radhus i Partille. Texten var klar på 15 sekunder och vi behövde knappt ändra ett ord. Köparen sa att annonsen fick dem att boka visning direkt.",
    rating: 5,
  },
  {
    name: "Erik Johansson",
    role: "Mäklarassistent, Svensk Fastighetsförmedling",
    text: "Jag skrev objektbeskrivningar manuellt i 3 år. Det tog minst 45 minuter per objekt. Nu tar det 20 sekunder och texterna är ärligt talat bättre än mina egna. Sparar mig 5-6 timmar i veckan.",
    rating: 5,
  },
  {
    name: "Anna Bergqvist",
    role: "Franchise-ägare, HusmanHagberg Uppsala",
    text: "Det bästa med OptiPrompt är att texterna inte låter AI-genererade. Inga klyschor, inga 'generösa ytor' eller 'bjuder på'. Ren faktabaserad svenska som våra kunder förtjänar.",
    rating: 5,
  },
];

// ─── FEATURES DATA ───
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
    title: "Klyschfri svenska",
    desc: "397+ förbjudna AI-klyschor filtreras bort. Ingen 'generös planlösning' eller 'bjuder på utsikt'.",
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

export function LandingPage({ onGetStarted, onStartCheckout, isCheckoutPending }: LandingPageProps) {
  return (
    <div className="space-y-0">

      {/* ════════ HERO ════════ */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="max-w-4xl mx-auto text-center px-6">
          {/* Social proof badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8" style={{ background: "#E8F5E9", color: "#2D6A4F" }}>
            <div className="flex -space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-current" style={{ color: "#D4AF37" }} />
              ))}
            </div>
            Används av 200+ svenska mäklare
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
              onClick={onGetStarted}
              className="text-base px-8 py-6 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              style={{ background: "#2D6A4F", color: "#fff" }}
            >
              Testa gratis — 3 texter/månad
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <span className="text-xs" style={{ color: "#9CA3AF" }}>Inget kort krävs</span>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 pt-8 border-t" style={{ borderColor: "#E8E5DE" }}>
            {[
              { value: "15 sek", label: "per text" },
              { value: "5 texter", label: "per generering" },
              { value: "283", label: "klyschor filtreras" },
              { value: "100%", label: "svensk AI" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl sm:text-2xl font-bold" style={{ color: "#2D6A4F" }}>{stat.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ BEFORE / AFTER ════════ */}
      <section className="py-16 sm:py-20" style={{ background: "#F8F6F1" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4" style={{ background: "#FEE2E2", color: "#991B1B" }}>
              Före & Efter
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
      <section className="py-16 sm:py-20">
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

      {/* ════════ TESTIMONIALS ════════ */}
      <section className="py-16 sm:py-20" style={{ background: "#F8F6F1" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
              Mäklare som sparar timmar varje vecka
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-xl border p-6" style={{ borderColor: "#E8E5DE" }}>
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" style={{ color: "#D4AF37" }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "#4B5563" }}>
                  "{t.text}"
                </p>
                <div className="pt-3 border-t" style={{ borderColor: "#F3F4F6" }}>
                  <div className="font-semibold text-sm" style={{ color: "#1D2939" }}>{t.name}</div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ PRICING ════════ */}
      <section className="py-16 sm:py-20" id="pricing">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
              Enkel prissättning. Avsluta när du vill.
            </h2>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Alla planer inkluderar 5 texter per generering. Uppgradera eller avsluta med ett klick.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FREE */}
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#E8E5DE" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Gratis</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold" style={{ color: "#1D2939" }}>0 kr</span>
                <span className="text-sm" style={{ color: "#9CA3AF" }}>/månad</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "#6B7280" }}>Perfekt för att testa</p>
              <ul className="space-y-2.5 mb-6">
                {["3 genereringar / månad", "Hemnet + Booli-texter", "Rubrik + Instagram + kortannons", "Grundläggande AI-pipeline"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#374151" }}>
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#2D6A4F" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={onGetStarted}
                variant="outline"
                className="w-full font-medium"
              >
                Kom igång gratis
              </Button>
            </div>

            {/* PRO — highlighted */}
            <div className="bg-white rounded-xl border-2 p-6 relative shadow-lg" style={{ borderColor: "#2D6A4F" }}>
              <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: "#2D6A4F" }}>
                Populärast
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#2D6A4F" }}>Pro</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold" style={{ color: "#1D2939" }}>299 kr</span>
                <span className="text-sm" style={{ color: "#9CA3AF" }}>/månad</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "#6B7280" }}>För aktiva mäklare</p>
              <ul className="space-y-2.5 mb-6">
                {[
                  "10 genereringar / månad",
                  "Personlig skrivstil",
                  "Områdesanalys & marknadsdata",
                  "Text-redigering med AI",
                  "Faktagranskning",
                  "Förbättringsförslag",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#374151" }}>
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#2D6A4F" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => onStartCheckout("pro")}
                disabled={isCheckoutPending}
                className="w-full font-medium text-white"
                style={{ background: "#2D6A4F" }}
              >
                <Crown className="w-4 h-4 mr-2" />
                Välj Pro
              </Button>
            </div>

            {/* PREMIUM */}
            <div className="bg-white rounded-xl border p-6 relative" style={{ borderColor: "#E8E5DE" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B5CF6" }}>Premium</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold" style={{ color: "#1D2939" }}>599 kr</span>
                <span className="text-sm" style={{ color: "#9CA3AF" }}>/månad</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "#6B7280" }}>För team & storproducenter</p>
              <ul className="space-y-2.5 mb-6">
                {[
                  "Obegränsat antal genereringar",
                  "Allt i Pro, plus:",
                  "Team-funktioner (dela stil)",
                  "API-access",
                  "Priority support",
                  "Avancerad marknadsanalys",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#374151" }}>
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#8B5CF6" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => onStartCheckout("premium")}
                disabled={isCheckoutPending}
                className="w-full font-medium text-white"
                style={{ background: "#8B5CF6" }}
              >
                <Crown className="w-4 h-4 mr-2" />
                Välj Premium
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ FINAL CTA ════════ */}
      <section className="py-16 sm:py-20" style={{ background: "#2D6A4F" }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-white" style={{ fontFamily: "'Lora', Georgia, serif" }}>
            Redo att spara 5 timmar i veckan?
          </h2>
          <p className="text-sm mb-8" style={{ color: "#A7F3D0" }}>
            Skapa ditt konto på 30 sekunder. Ingen bindningstid. Inga dolda avgifter. 3 gratis genereringar direkt.
          </p>
          <Button
            onClick={onGetStarted}
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
    </div>
  );
}
