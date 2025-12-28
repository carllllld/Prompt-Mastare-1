import { useState } from "react";
import { type OptimizeResponse } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Copy, Sparkles, Lightbulb, ListChecks, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { PromptCompare } from "./PromptCompare";
import { useToast } from "@/hooks/use-toast";

interface ResultSectionProps {
  result: OptimizeResponse;
}

export function ResultSection({ result }: ResultSectionProps) {
  const [copied, setCopied] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(result.improvedPrompt);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const applySuggestion = (suggestion: string, index: number) => {
    if (appliedSuggestions.has(index)) return;
    
    setCurrentPrompt(prev => `${prev}\n\n${suggestion}`);
    setAppliedSuggestions(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.add(index);
      return newSet;
    });
    toast({
      title: "Förslag tillagt",
      description: "Förslaget har lagts till i din prompt.",
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 mt-12"
    >
      {/* Section A: Improved Prompt */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400 border border-violet-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">Förbättrad Prompt</h2>
        </div>
        
        <Card className="relative overflow-hidden bg-white/[0.03] border-white/[0.08] backdrop-blur-sm">
          <div className="p-6 md:p-8">
            <p className="text-white/90 whitespace-pre-wrap leading-relaxed text-lg" data-testid="text-current-prompt">
              {currentPrompt}
            </p>
            {appliedSuggestions.size > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <span className="text-sm text-violet-400 font-medium">
                  {appliedSuggestions.size} förslag tillagt
                </span>
              </div>
            )}
          </div>
          <div className="bg-white/[0.02] p-4 flex justify-end border-t border-white/[0.06]">
            <Button
              onClick={handleCopy}
              className={`
                font-semibold transition-all duration-300
                ${copied 
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                  : "bg-white/10 hover:bg-white/15 text-white border-0"
                }
              `}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Kopierad!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Kopiera Prompt
                </>
              )}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Section: Compare Prompts */}
      <motion.div variants={item}>
        <PromptCompare original={result.originalPrompt} improved={result.improvedPrompt} />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section B: Improvements */}
        <motion.div variants={item} className="h-full">
          <div className="flex items-center gap-2 mb-4">
             <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
               <ListChecks className="w-5 h-5" />
             </div>
            <h3 className="text-lg font-bold text-white">Vad som förbättrades</h3>
          </div>
          
          <Card className="h-full bg-blue-500/5 border-blue-500/10 p-6">
            <ul className="space-y-3">
              {result.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-white/70">{improvement}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>

        {/* Section C: Suggestions */}
        <motion.div variants={item} className="h-full">
           <div className="flex items-center gap-2 mb-4">
             <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
               <Lightbulb className="w-5 h-5" />
             </div>
            <h3 className="text-lg font-bold text-white">Extra förslag</h3>
          </div>

          <Card className="h-full bg-amber-500/5 border-amber-500/10 p-6">
             <div className="flex flex-wrap gap-2">
              {result.suggestions.map((suggestion, index) => {
                const isApplied = appliedSuggestions.has(index);
                return (
                  <button
                    key={index}
                    onClick={() => applySuggestion(suggestion, index)}
                    disabled={isApplied}
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                      ${isApplied 
                        ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 cursor-default" 
                        : "bg-white/5 border border-amber-500/20 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/30 cursor-pointer"
                      }
                    `}
                    data-testid={`button-apply-suggestion-${index}`}
                  >
                    {isApplied ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    {suggestion}
                  </button>
                );
              })}
             </div>
             <p className="mt-4 text-sm text-white/40 italic">
               Klicka på ett förslag för att lägga till det i din prompt.
             </p>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
