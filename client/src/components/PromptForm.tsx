import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { type OptimizeRequest } from "@shared/schema";
import { motion } from "framer-motion";

interface PromptFormProps {
  onSubmit: (data: OptimizeRequest) => void;
  isPending: boolean;
  disabled?: boolean;
  clearOnSuccess?: boolean;
}

const categories = [
  "General",
  "Business",
  "Programming",
  "Academic",
  "Creative",
  "Marketing",
] as const;

export function PromptForm({ onSubmit, isPending, disabled = false, clearOnSuccess = false }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<OptimizeRequest["type"]>("General");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (wasSubmitting.current && !isPending && clearOnSuccess) {
      setPrompt("");
      textareaRef.current?.focus();
    }
    wasSubmitting.current = isPending;
  }, [isPending, clearOnSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isPending) return;
    onSubmit({ prompt, type });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (prompt.trim() && !isPending && !disabled) {
        onSubmit({ prompt, type });
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-6 md:p-8"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="type" className="text-sm font-medium text-white/70">
            Category
          </Label>
          <Select
            value={type}
            onValueChange={(val) => setType(val as OptimizeRequest["type"])}
          >
            <SelectTrigger id="type" className="h-12 text-base rounded-xl bg-white/[0.03] border-white/[0.08] text-white focus:ring-violet-500/30" data-testid="select-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-white/10">
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-white/90 focus:bg-white/10 focus:text-white">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-sm font-medium text-white/70">
            Your prompt
          </Label>
          <Textarea
            ref={textareaRef}
            id="prompt"
            placeholder="Write or paste your prompt here (any language supported)..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[160px] resize-none text-base p-4 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
            data-testid="input-prompt"
          />
          <p className="text-xs text-white/30 mt-1">Press Ctrl+Enter to optimize quickly</p>
        </div>

        <Button
          type="submit"
          disabled={!prompt.trim() || isPending || disabled}
          className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300"
          data-testid="button-optimize"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Optimize Prompt
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
