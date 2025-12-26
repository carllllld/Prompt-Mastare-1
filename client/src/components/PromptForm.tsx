import { useState } from "react";
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
}

const categories = [
  "General",
  "Business",
  "Programming",
  "Academic",
  "Creative",
  "Marketing",
] as const;

export function PromptForm({ onSubmit, isPending }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<OptimizeRequest["type"]>("General");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit({ prompt, type });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl shadow-xl shadow-indigo-500/5 border border-indigo-100 p-6 md:p-8"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="type" className="text-base font-semibold text-gray-700">
            Kategori
          </Label>
          <Select
            value={type}
            onValueChange={(val) => setType(val as OptimizeRequest["type"])}
          >
            <SelectTrigger id="type" className="h-12 text-base rounded-xl border-gray-200 focus:ring-primary/20">
              <SelectValue placeholder="Välj kategori" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-base font-semibold text-gray-700">
            Din prompt
          </Label>
          <Textarea
            id="prompt"
            placeholder="Skriv eller klistra in din prompt här..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[160px] resize-none text-base p-4 rounded-xl border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </div>

        <Button
          type="submit"
          disabled={!prompt.trim() || isPending}
          className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:to-indigo-700 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Optimerar...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Optimera Prompt
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
