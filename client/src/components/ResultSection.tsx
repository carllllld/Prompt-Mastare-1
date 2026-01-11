import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Copy, AlertCircle, FileText, Share2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { type OptimizeResponse } from "@shared/schema";

interface ResultSectionProps {
  result: OptimizeResponse;
  onNewPrompt: () => void;
}

export function ResultSection({ result, onNewPrompt }: ResultSectionProps) {
  const [copiedMain, setCopiedMain] = useState(false);
  const [copiedSocial, setCopiedSocial] = useState(false);

  const copyToClipboard = (text: string, type: 'main' | 'social') => {
    navigator.clipboard.writeText(text);
    if (type === 'main') {
      setCopiedMain(true);
      setTimeout(() => setCopiedMain(false), 2000);
    } else {
      setCopiedSocial(true);
      setTimeout(() => setCopiedSocial(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* HUVUDANNONS */}
      <Card className="border-2 border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Genererad annonstext
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => copyToClipboard(result.improvedPrompt, 'main')} 
              className="h-9 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              {copiedMain ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copiedMain ? "Kopierad" : "Kopiera annons"}
            </Button>
          </div>
        </div>
        <CardContent className="p-8 bg-white">
          <div className="whitespace-pre-wrap text-slate-800 leading-relaxed font-serif text-lg">
            {result.improvedPrompt}
          </div>
        </CardContent>
      </Card>

      {/* SOCIALA MEDIER (VERSION UTAN EMOJIS) */}
      <Card className="border border-slate-200 bg-slate-50/30">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-500">
            <Share2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Kortversion för sociala medier</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => copyToClipboard(result.socialCopy, 'social')} 
            className="h-8 text-slate-600 text-xs hover:bg-white shadow-sm border border-slate-100"
          >
            {copiedSocial ? "Klar" : "Kopiera text"}
          </Button>
        </div>
        <CardContent className="p-5 text-slate-600 text-sm leading-relaxed italic">
          {result.socialCopy || "Ingen social media text genererades."}
        </CardContent>
      </Card>

      {/* ANALYS & TIPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3 text-amber-700 font-bold text-[10px] uppercase tracking-tighter">
            <AlertCircle className="w-4 h-4" /> Att tänka på
          </div>
          <ul className="space-y-2">
            {result.suggestions?.map((s, i) => (
              <li key={i} className="text-xs text-amber-900 flex gap-2">
                <span className="text-amber-400">•</span> {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3 text-emerald-700 font-bold text-[10px] uppercase tracking-tighter">
            <Check className="w-4 h-4" /> Förbättringar
          </div>
          <ul className="space-y-2">
            {result.improvements?.map((imp, i) => (
              <li key={i} className="text-xs text-emerald-900 flex gap-2">
                <span className="text-emerald-400">✓</span> {imp}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <Button 
          variant="ghost" 
          onClick={onNewPrompt}
          className="text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Skapa en ny version
        </Button>
      </div>
    </div>
  );
}