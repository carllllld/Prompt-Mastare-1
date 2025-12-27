import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <GitCompare className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Jämför Prompts</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={view === "side-by-side" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("side-by-side")}
            data-testid="button-view-side-by-side"
          >
            <Eye className="w-4 h-4 mr-1" />
            Sida vid sida
          </Button>
          <Button
            variant={view === "unified" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("unified")}
            data-testid="button-view-unified"
          >
            <FileText className="w-4 h-4 mr-1" />
            Enhetlig
          </Button>
        </div>
      </div>

      <Card className="border-purple-100 dark:border-purple-900/50 overflow-hidden">
        <div className="bg-purple-50/50 dark:bg-purple-900/20 p-4 border-b border-purple-100 dark:border-purple-900/50">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Original:</span>
              <Badge variant="secondary">{stats.originalWords} ord</Badge>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Förbättrad:</span>
              <Badge variant="secondary">{stats.improvedWords} ord</Badge>
            </div>
            <Badge 
              variant={stats.wordDiff > 0 ? "default" : "outline"}
              className={stats.wordDiff > 0 ? "bg-green-600" : ""}
            >
              {stats.wordDiff > 0 ? "+" : ""}{stats.wordDiff} ord ({stats.percentChange > 0 ? "+" : ""}{stats.percentChange}%)
            </Badge>
          </div>
        </div>

        {view === "side-by-side" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-purple-100 dark:divide-purple-900/50">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Original</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed" data-testid="text-original-prompt">
                {highlightText(original, diffWords.removed, "bg-red-200 dark:bg-red-900/50 px-0.5 rounded")}
              </p>
            </div>
            <div className="p-6 bg-green-50/30 dark:bg-green-900/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Förbättrad</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed" data-testid="text-improved-prompt">
                {highlightText(improved, diffWords.added, "bg-green-200 dark:bg-green-900/50 px-0.5 rounded")}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Original prompt</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" data-testid="text-original-unified">
                {highlightText(original, diffWords.removed, "bg-red-200 dark:bg-red-800/50 px-0.5 rounded")}
              </p>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400 rotate-90" />
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Förbättrad prompt</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" data-testid="text-improved-unified">
                {highlightText(improved, diffWords.added, "bg-green-200 dark:bg-green-800/50 px-0.5 rounded")}
              </p>
            </div>
          </div>
        )}

        {(added.length > 0 || removed.length > 0) && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-purple-100 dark:border-purple-900/50">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Nyckelförändringar:</p>
            <div className="flex flex-wrap gap-2">
              {added.map((word, i) => (
                <Badge key={`add-${i}`} className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                  + {word}
                </Badge>
              ))}
              {removed.map((word, i) => (
                <Badge key={`rem-${i}`} variant="outline" className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800 line-through">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
