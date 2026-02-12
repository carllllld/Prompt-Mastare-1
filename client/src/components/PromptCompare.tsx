import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, GitCompare, Eye } from "lucide-react";
import { motion } from "framer-motion";

interface PromptCompareProps {
  original: string;
  improved: string;
}

function highlightDifferences(original: string, improved: string): { added: string[]; removed: string[] } {
  const originalWords = new Set(original.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const improvedWords = new Set(improved.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const added: string[] = [];
  const removed: string[] = [];
  
  improvedWords.forEach(word => {
    if (!originalWords.has(word)) {
      added.push(word);
    }
  });
  
  originalWords.forEach(word => {
    if (!improvedWords.has(word)) {
      removed.push(word);
    }
  });
  
  return { added: added.slice(0, 8), removed: removed.slice(0, 8) };
}

function getStats(original: string, improved: string) {
  const originalWords = original.trim() ? original.split(/\s+/).length : 0;
  const improvedWords = improved.trim() ? improved.split(/\s+/).length : 0;
  const wordDiff = improvedWords - originalWords;
  const percentChange = originalWords > 0 ? Math.round((wordDiff / originalWords) * 100) : 0;
  
  return {
    originalWords,
    improvedWords,
    wordDiff,
    percentChange,
  };
}

function highlightText(text: string, wordsToHighlight: Set<string>, className: string) {
  const words = text.split(/(\s+)/);
  return words.map((word, i) => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
    if (wordsToHighlight.has(cleanWord) && cleanWord.length > 2) {
      return (
        <span key={i} className={className}>
          {word}
        </span>
      );
    }
    return word;
  });
}

function getDiffWords(original: string, improved: string) {
  const originalWords = new Set(
    original.toLowerCase().split(/\s+/).map(w => w.replace(/[.,!?;:'"]/g, '')).filter(w => w.length > 2)
  );
  const improvedWords = new Set(
    improved.toLowerCase().split(/\s+/).map(w => w.replace(/[.,!?;:'"]/g, '')).filter(w => w.length > 2)
  );
  
  const added = new Set<string>();
  const removed = new Set<string>();
  
  improvedWords.forEach(word => {
    if (!originalWords.has(word)) {
      added.add(word);
    }
  });
  
  originalWords.forEach(word => {
    if (!improvedWords.has(word)) {
      removed.add(word);
    }
  });
  
  return { added, removed };
}

export function PromptCompare({ original, improved }: PromptCompareProps) {
  const [view, setView] = useState<"side-by-side" | "unified">("side-by-side");
  const { added, removed } = highlightDifferences(original, improved);
  const diffWords = getDiffWords(original, improved);
  const stats = getStats(original, improved);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
            <GitCompare className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">Compare Prompts</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={view === "side-by-side" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("side-by-side")}
            className={view === "side-by-side" ? "bg-violet-600 hover:bg-violet-500" : "border-white/10 text-white/70 hover:bg-white/5"}
            data-testid="button-view-side-by-side"
          >
            <Eye className="w-4 h-4 mr-1" />
            Side by side
          </Button>
          <Button
            variant={view === "unified" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("unified")}
            className={view === "unified" ? "bg-violet-600 hover:bg-violet-500" : "border-white/10 text-white/70 hover:bg-white/5"}
            data-testid="button-view-unified"
          >
            <FileText className="w-4 h-4 mr-1" />
            Unified
          </Button>
        </div>
      </div>

      <Card className="bg-white/[0.02] border-white/[0.08] overflow-hidden">
        <div className="bg-purple-500/5 p-4 border-b border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-white/50">Original:</span>
              <div className="bg-white/10 text-white/70 text-xs px-2 py-1 rounded-md font-semibold">{stats.originalWords} words</div>
            </div>
            <ArrowRight className="w-4 h-4 text-white/30" />
            <div className="flex items-center gap-2">
              <span className="text-white/50">Improved:</span>
              <div className="bg-white/10 text-white/70 text-xs px-2 py-1 rounded-md font-semibold">{stats.improvedWords} words</div>
            </div>
            <div className={`text-xs px-2 py-1 rounded-md font-semibold border ${
              stats.wordDiff > 0 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-white/10 text-white/70"
            }`}>
              {stats.wordDiff > 0 ? "+" : ""}{stats.wordDiff} words ({stats.percentChange > 0 ? "+" : ""}{stats.percentChange}%)
            </div>
          </div>
        </div>

        {view === "side-by-side" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-sm font-medium text-white/60">Original</span>
              </div>
              <p className="text-white/70 whitespace-pre-wrap leading-relaxed" data-testid="text-original-prompt">
                {highlightText(original, diffWords.removed, "bg-red-500/30 px-0.5 rounded text-red-300")}
              </p>
            </div>
            <div className="p-6 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-white/60">Improved</span>
              </div>
              <p className="text-white/70 whitespace-pre-wrap leading-relaxed" data-testid="text-improved-prompt">
                {highlightText(improved, diffWords.added, "bg-emerald-500/30 px-0.5 rounded text-emerald-300")}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-sm font-medium text-red-300">Original prompt</span>
              </div>
              <p className="text-white/70 whitespace-pre-wrap" data-testid="text-original-unified">
                {highlightText(original, diffWords.removed, "bg-red-500/30 px-0.5 rounded text-red-300")}
              </p>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-white/30 rotate-90" />
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-300">Improved prompt</span>
              </div>
              <p className="text-white/70 whitespace-pre-wrap" data-testid="text-improved-unified">
                {highlightText(improved, diffWords.added, "bg-emerald-500/30 px-0.5 rounded text-emerald-300")}
              </p>
            </div>
          </div>
        )}

        {(added.length > 0 || removed.length > 0) && (
          <div className="bg-white/[0.02] p-4 border-t border-white/[0.06]">
            <p className="text-sm font-medium text-white/60 mb-3">Key changes:</p>
            <div className="flex flex-wrap gap-2">
              {added.map((word, i) => (
                <div key={`add-${i}`} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2 py-1 rounded-md font-semibold">
                  + {word}
                </div>
              ))}
              {removed.map((word, i) => (
                <div key={`rem-${i}`} className="bg-red-500/20 text-red-400 border border-red-500/30 line-through text-xs px-2 py-1 rounded-md font-semibold">
                  {word}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
