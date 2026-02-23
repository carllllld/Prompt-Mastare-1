import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
            Integritetspolicy
          </h1>
        </div>

        <div className="prose prose-sm max-w-none space-y-6" style={{ color: "#4B5563" }}>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>Senast uppdaterad: {new Date().toLocaleDateString("sv-SE")}</p>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>1. Personuppgiftsansvarig</h2>
            <p>OptiPrompt ("vi", "oss", "vår") ansvarar för behandlingen av dina personuppgifter i enlighet med EU:s dataskyddsförordning (GDPR) och svensk dataskyddslagstiftning.</p>
            <p>Kontakt: <a href="mailto:support@optiprompt.se" className="underline" style={{ color: "#2D6A4F" }}>support@optiprompt.se</a></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>2. Vilka uppgifter vi samlar in</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Kontouppgifter:</strong> E-postadress och lösenord (krypterat med bcrypt)</li>
              <li><strong>Användningsdata:</strong> Antal genererade texter, plan-typ, skapade optimeringar</li>
              <li><strong>Fastighetsdata:</strong> Information du fyller i formuläret (adress, storlek, etc.) — används enbart för textgenerering</li>
              <li><strong>Betalningsuppgifter:</strong> Hanteras av Stripe — vi lagrar aldrig kortnummer</li>
              <li><strong>Sessionscookies:</strong> För att hålla dig inloggad (30 dagars livslängd)</li>
              <li><strong>Teknisk data:</strong> IP-adress och user-agent vid inloggning (säkerhetsändamål)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>3. Varför vi behandlar dina uppgifter</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Fullgöra avtal:</strong> Skapa konto, generera texter, hantera prenumeration</li>
              <li><strong>Berättigat intresse:</strong> Förbättra tjänsten, säkerhet, förhindra missbruk</li>
              <li><strong>Rättslig förpliktelse:</strong> Bokföring av betalningar</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>4. Tredjepartsleverantörer</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>OpenAI:</strong> AI-textgenerering — dina fastighetsdata skickas för att generera texter</li>
              <li><strong>Stripe:</strong> Betalningshantering — PCI DSS-certifierad</li>
              <li><strong>Resend:</strong> E-postutskick (verifiering, lösenordsåterställning)</li>
              <li><strong>Render:</strong> Hosting av applikationen (EU/US)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>5. Hur länge vi sparar dina uppgifter</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Kontoinformation:</strong> Så länge du har ett aktivt konto</li>
              <li><strong>Genererade texter:</strong> 30 dagar i historiken</li>
              <li><strong>Sessionsdata:</strong> 30 dagar</li>
              <li><strong>Betalningshistorik:</strong> Enligt bokföringslagens krav (7 år)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>6. Dina rättigheter enligt GDPR</h2>
            <p>Du har rätt att:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Få tillgång</strong> till dina personuppgifter</li>
              <li><strong>Rätta</strong> felaktiga uppgifter</li>
              <li><strong>Radera</strong> ditt konto och alla tillhörande data</li>
              <li><strong>Begränsa</strong> behandlingen av dina uppgifter</li>
              <li><strong>Dataportabilitet</strong> — få ut dina data i maskinläsbart format</li>
              <li><strong>Invända</strong> mot behandling baserad på berättigat intresse</li>
            </ul>
            <p>Kontakta <a href="mailto:support@optiprompt.se" className="underline" style={{ color: "#2D6A4F" }}>support@optiprompt.se</a> för att utöva dina rättigheter.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>7. Cookies</h2>
            <p>Vi använder enbart nödvändiga sessionscookies för inloggning. Vi använder inga spårnings- eller marknadsföringscookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>8. Säkerhet</h2>
            <p>Vi skyddar dina uppgifter genom:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Kryptering av lösenord (bcrypt med salt)</li>
              <li>HTTPS för all kommunikation</li>
              <li>Säkra sessionscookies (httpOnly, secure, sameSite)</li>
              <li>Rate limiting för att förhindra missbruk</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>9. Tillsynsmyndighet</h2>
            <p>Om du anser att vi behandlar dina personuppgifter felaktigt har du rätt att lämna in klagomål till Integritetsskyddsmyndigheten (IMY), <a href="https://www.imy.se" className="underline" style={{ color: "#2D6A4F" }} target="_blank" rel="noopener noreferrer">www.imy.se</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1D2939" }}>10. Ändringar</h2>
            <p>Vi kan uppdatera denna policy vid behov. Väsentliga ändringar meddelas via e-post eller i tjänsten.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
