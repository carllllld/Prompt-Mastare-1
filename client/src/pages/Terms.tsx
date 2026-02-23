import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7" }}>
      <header className="border-b" style={{ borderColor: "#E8E5DE" }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-6 h-16">
          <Link href="/" className="flex items-center gap-2 text-sm no-underline" style={{ color: "#2D6A4F" }}>
            <ArrowLeft className="w-4 h-4" />
            Tillbaka
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#2D6A4F" }}>
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
            Användarvillkor
          </h1>
        </div>

        <div className="prose prose-sm max-w-none space-y-6" style={{ color: "#4B5563" }}>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>Senast uppdaterad: {new Date().toLocaleDateString("sv-SE")}</p>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>1. Tjänsten</h2>
            <p>OptiPrompt är ett AI-verktyg som genererar objektbeskrivningar och marknadsföringstexter för svenska fastighetsmäklare. Tjänsten tillhandahålls av OptiPrompt ("vi", "oss").</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>2. Konto och registrering</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Du måste ange en giltig e-postadress och verifiera den för att använda tjänsten.</li>
              <li>Du ansvarar för att hålla ditt lösenord säkert.</li>
              <li>Du får inte dela ditt konto med andra personer.</li>
              <li>Vi förbehåller oss rätten att stänga av konton som bryter mot dessa villkor.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>3. Planer och betalning</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Gratis:</strong> 3 textgenereringar per månad. Ingen betalning krävs.</li>
              <li><strong>Pro (299 kr/mån):</strong> 10 textgenereringar, personlig skrivstil, områdesanalys, textredigering.</li>
              <li><strong>Premium (599 kr/mån):</strong> Obegränsat antal texter, team-funktioner, API-access, priority support.</li>
            </ul>
            <p>Betalning sker via Stripe. Prenumerationer förnyas automatiskt varje månad. Du kan avsluta din prenumeration när som helst via kundportalen — den gäller då till slutet av den betalda perioden.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>4. AI-genererat innehåll</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Texterna genereras av AI (OpenAI) baserat på den data du tillhandahåller.</li>
              <li><strong>Du äger rättigheterna</strong> till de genererade texterna och kan använda dem fritt.</li>
              <li>Vi garanterar inte att texterna är felfria. Du ansvarar för att granska och godkänna texterna innan publicering.</li>
              <li>Vi ansvarar inte för eventuella felaktigheter i AI-genererade texter, faktafel, eller konsekvenser av att publicera texterna.</li>
              <li>Faktagranskning (Pro/Premium) är ett hjälpmedel men ersätter inte din egen granskning.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>5. Acceptabel användning</h2>
            <p>Du får inte:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Använda tjänsten för att generera vilseledande eller bedrägligt innehåll.</li>
              <li>Försöka kringgå användningsbegränsningar eller säkerhetsåtgärder.</li>
              <li>Automatisera åtkomst till tjänsten utan tillåtelse (scraping, bottar).</li>
              <li>Använda tjänsten på ett sätt som skadar andra användare eller tjänstens tillgänglighet.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>6. Tillgänglighet</h2>
            <p>Vi strävar efter hög tillgänglighet men garanterar inte att tjänsten alltid är tillgänglig. Underhåll, tekniska problem, eller tredjepartsleverantörers avbrott kan påverka tjänsten. Vi ansvarar inte för förluster orsakade av driftstopp.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>7. Ansvarsbegränsning</h2>
            <p>OptiPrompt tillhandahålls "i befintligt skick". Vi ansvarar inte för:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Indirekta skador, förlorad vinst, eller förlorade affärsmöjligheter.</li>
              <li>Felaktigheter i AI-genererat innehåll.</li>
              <li>Skador orsakade av tredjepartsleverantörer (OpenAI, Stripe, etc.).</li>
            </ul>
            <p>Vårt totala ansvar begränsas till det belopp du har betalat till oss under de senaste 12 månaderna.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>8. Uppsägning</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Du kan avsluta ditt konto när som helst genom att kontakta oss.</li>
              <li>Vid uppsägning raderas dina data i enlighet med vår integritetspolicy.</li>
              <li>Redan betalda prenumerationsperioder återbetalas inte.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>9. Ändringar</h2>
            <p>Vi kan uppdatera dessa villkor. Väsentliga ändringar meddelas minst 30 dagar i förväg via e-post. Fortsatt användning av tjänsten efter ändringar innebär att du accepterar de nya villkoren.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>10. Tillämplig lag</h2>
            <p>Dessa villkor regleras av svensk lag. Eventuella tvister ska avgöras av svensk domstol.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>11. Kontakt</h2>
            <p>Frågor om dessa villkor? Kontakta oss på <a href="mailto:support@optiprompt.se" className="underline" style={{ color: "#2D6A4F" }}>support@optiprompt.se</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
