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
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Förbättrad Prompt</h2>
        </div>
        
        <Card className="relative overflow-hidden border-indigo-100 bg-white shadow-lg shadow-indigo-500/5">
          <div className="p-6 md:p-8 bg-gradient-to-br from-white to-indigo-50/50">
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-lg font-medium" data-testid="text-current-prompt">
              {currentPrompt}
            </p>
            {appliedSuggestions.size > 0 && (
              <div className="mt-4 pt-4 border-t border-indigo-100">
                <span className="text-sm text-indigo-600 font-medium">
                  {appliedSuggestions.size} förslag tillagt
                </span>
              </div>
            )}
          </div>
          <div className="bg-gray-50/80 p-4 flex justify-end border-t border-gray-100">
            <Button
              variant={copied ? "default" : "secondary"}
              onClick={handleCopy}
              className={`
                font-semibold transition-all duration-300
                ${copied ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20" : "hover:bg-white hover:shadow-md"}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section B: Improvements */}
        <motion.div variants={item} className="h-full">
          <div className="flex items-center gap-2 mb-4">
             <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
               <ListChecks className="w-5 h-5" />
             </div>
            <h3 className="text-lg font-bold text-gray-900">Vad som förbättrades</h3>
          </div>
          
          <Card className="h-full border-blue-100 bg-blue-50/30 p-6 shadow-sm">
            <ul className="space-y-3">
              {result.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{improvement}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>

        {/* Section C: Suggestions */}
        <motion.div variants={item} className="h-full">
           <div className="flex items-center gap-2 mb-4">
             <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
               <Lightbulb className="w-5 h-5" />
             </div>
            <h3 className="text-lg font-bold text-gray-900">Extra förslag</h3>
          </div>

          <Card className="h-full border-amber-100 bg-amber-50/30 p-6 shadow-sm">
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
                        ? "bg-green-100 border border-green-300 text-green-700 cursor-default" 
                        : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 cursor-pointer"
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
             <p className="mt-4 text-sm text-gray-500 italic">
               Klicka på ett förslag för att lägga till det i din prompt.
             </p>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
