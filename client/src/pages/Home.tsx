import { useState } from "react";
import { PromptForm } from "@/components/PromptForm";
import { ResultSection } from "@/components/ResultSection";
import { useOptimize } from "@/hooks/use-optimize";
import { type OptimizeResponse } from "@shared/schema";
import { Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { mutate, isPending } = useOptimize();
  const [result, setResult] = useState<OptimizeResponse | null>(null);

  const handleSubmit = (data: { prompt: string; type: any }) => {
    mutate(data, {
      onSuccess: (data) => {
        setResult(data);
        // Smooth scroll to results
        setTimeout(() => {
          const resultElement = document.getElementById("results");
          if (resultElement) {
            resultElement.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Hero */}
      <header className="bg-white border-b border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-indigo-500" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Zap className="w-4 h-4 fill-current" />
            <span>AI-Driven Optimering</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 font-display">
            Prompt<span className="text-primary">Forge</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Skriv bättre prompts. Få bättre AI-resultat. Direkt.
          </p>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            Sluta gissa hur du ska prata med AI. PromptForge förvandlar vaga prompts till kraftfulla instruktioner.
          </p>
        </div>

        
        {/* Decorative background blobs */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-x-1/3 pointer-events-none" />
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <PromptForm onSubmit={handleSubmit} isPending={isPending} />

        {result && (
          <div id="results">
            <ResultSection result={result} />
          </div>
        )}

        {/* How it works */}
        <section className="mt-24 space-y-12">
          <h2 className="text-3xl font-bold text-center text-gray-900">Hur det fungerar</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm mx-auto flex items-center justify-center text-lg font-bold text-gray-400">1</div>
              <h3 className="font-semibold text-gray-900">Klistra in din prompt</h3>
              <p className="text-sm text-gray-500">Börja med din idé eller råa text.</p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm mx-auto flex items-center justify-center text-lg font-bold text-gray-400">2</div>
              <h3 className="font-semibold text-gray-900">Vi optimerar den</h3>
              <p className="text-sm text-gray-500">Vi använder AI best practices för att förbättra strukturen.</p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm mx-auto flex items-center justify-center text-lg font-bold text-gray-400">3</div>
              <h3 className="font-semibold text-gray-900">Kopiera & använd</h3>
              <p className="text-sm text-gray-500">Få bättre svar från din AI omedelbart.</p>
            </div>
          </div>
        </section>

        {/* Why PromptForge */}
        <section className="mt-32 p-8 md:p-12 bg-white rounded-3xl border border-indigo-50 shadow-sm">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Varför PromptForge?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">✅</div>
              <div>
                <h4 className="font-bold">Tydligare instruktioner</h4>
                <p className="text-gray-500 text-sm">Minskar risken för missförstånd.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">✅</div>
              <div>
                <h4 className="font-bold">Bättre struktur</h4>
                <p className="text-gray-500 text-sm">Logiskt uppbyggda prompts.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">✅</div>
              <div>
                <h4 className="font-bold">Smartare kontext</h4>
                <p className="text-gray-500 text-sm">AI får rätt bakgrundsinformation.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">✅</div>
              <div>
                <h4 className="font-bold">Högre kvalitet</h4>
                <p className="text-gray-500 text-sm">Bättre svar från alla AI-modeller.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-32 mb-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Prissättning</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold mb-2">Gratis</h3>
              <p className="text-3xl font-extrabold mb-6">0 kr<span className="text-base font-normal text-gray-500">/mån</span></p>
              <ul className="space-y-4 text-gray-600 mb-8">
                <li className="flex items-center gap-2"><span>✅</span> 3 optimeringar per dag</li>
                <li className="flex items-center gap-2 text-gray-400"><span>❌</span> Obegränsat antal prompts</li>
                <li className="flex items-center gap-2 text-gray-400"><span>❌</span> Pro-support</li>
              </ul>
              <Button variant="outline" className="w-full">Nuvarande plan</Button>
            </Card>
            <Card className="p-8 border-primary shadow-xl shadow-primary/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-white text-xs font-bold rounded-bl-lg">POPULÄR</div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-3xl font-extrabold mb-6">129 kr<span className="text-base font-normal text-gray-500">/mån</span></p>
              <ul className="space-y-4 text-gray-600 mb-8">
                <li className="flex items-center gap-2"><span>✅</span> Obegränsat antal prompts</li>
                <li className="flex items-center gap-2"><span>✅</span> Prompthistorik</li>
                <li className="flex items-center gap-2"><span>✅</span> Avancerade förslag</li>
                <li className="flex items-center gap-2"><span>✅</span> Prioriterad AI-modell</li>
              </ul>
              <Button className="w-full">Uppgradera nu</Button>
            </Card>
          </div>
        </section>

      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} PromptForge. Byggd för bättre AI-interaktioner.</p>
        </div>
      </footer>
    </div>
  );
}
