import { useState } from "react";
import { PromptForm } from "@/components/PromptForm";
import { ResultSection } from "@/components/ResultSection";
import { useOptimize } from "@/hooks/use-optimize";
import { type OptimizeResponse } from "@shared/schema";
import { Zap } from "lucide-react";

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
            Prompt<span className="text-primary">Optimera</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Förvandla dina enkla frågor till kraftfulla prompts. Få bättre, mer precisa och användbara svar från AI-modeller som ChatGPT.
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

        {/* Empty State / How it works */}
        {!result && !isPending && (
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center opacity-60 hover:opacity-100 transition-opacity duration-500">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm mx-auto flex items-center justify-center text-lg font-bold text-gray-400">1</div>
              <h3 className="font-semibold text-gray-900">Skriv din idé</h3>
              <p className="text-sm text-gray-500">Klistra in din råa, ostrukturerade prompt.</p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm mx-auto flex items-center justify-center text-lg font-bold text-gray-400">2</div>
              <h3 className="font-semibold text-gray-900">Välj kategori</h3>
              <p className="text-sm text-gray-500">Anpassa optimeringen efter ditt användningsområde.</p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm mx-auto flex items-center justify-center text-lg font-bold text-gray-400">3</div>
              <h3 className="font-semibold text-gray-900">Få superkrafter</h3>
              <p className="text-sm text-gray-500">Få en strukturerad och effektiv prompt direkt.</p>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} PromptOptimera. Byggd för bättre AI-interaktioner.</p>
        </div>
      </footer>
    </div>
  );
}
