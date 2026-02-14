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
    <div className="space-y-5 pb-12">

      {/* HUVUDANNONS */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E8E5DE" }}>
        <div className="px-6 py-4 border-b flex justify-between items-center" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: "#2D6A4F" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>
              Objektbeskrivning
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => copyToClipboard(result.improvedPrompt, 'main')} 
            className="h-8 text-xs font-medium"
            style={{ borderColor: "#D1D5DB", color: copiedMain ? "#2D6A4F" : "#374151" }}
          >
            {copiedMain ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copiedMain ? "Kopierad!" : "Kopiera"}
          </Button>
        </div>
        <div className="p-6 sm:p-8">
          <div className="whitespace-pre-wrap leading-relaxed text-base" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
            {result.improvedPrompt}
          </div>
        </div>
      </div>

      {/* SOCIAL MEDIA */}
      {result.socialCopy && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E8E5DE" }}>
          <div className="px-5 py-3 border-b flex justify-between items-center" style={{ borderColor: "#E8E5DE" }}>
            <div className="flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Social media</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyToClipboard(result.socialCopy, 'social')} 
              className="h-7 text-xs"
              style={{ color: "#6B7280" }}
            >
              {copiedSocial ? "Kopierad!" : "Kopiera"}
            </Button>
          </div>
          <div className="p-5 text-sm leading-relaxed italic" style={{ color: "#4B5563" }}>
            {result.socialCopy}
          </div>
        </div>
      )}

      {/* TIPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.suggestions && result.suggestions.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-3.5 h-3.5" style={{ color: "#D97706" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#92400E" }}>Att tänka på</span>
            </div>
            <ul className="space-y-2">
              {result.suggestions.map((s, i) => (
                <li key={i} className="text-xs flex gap-2" style={{ color: "#78350F" }}>
                  <span style={{ color: "#F59E0B" }}>•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.improvements && result.improvements.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: "#ECFDF5", borderColor: "#A7F3D0" }}>
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-3.5 h-3.5" style={{ color: "#059669" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#065F46" }}>Förbättringar</span>
            </div>
            <ul className="space-y-2">
              {result.improvements.map((imp, i) => (
                <li key={i} className="text-xs flex gap-2" style={{ color: "#064E3B" }}>
                  <span style={{ color: "#10B981" }}>✓</span> {imp}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <Button 
          variant="ghost" 
          onClick={onNewPrompt}
          className="text-sm transition-colors"
          style={{ color: "#9CA3AF" }}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Skapa ny beskrivning
        </Button>
      </div>
    </div>
  );
}