import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Home, ListChecks, MapPin, Wand2 } from "lucide-react";
import { type OptimizeRequest, CHARACTER_LIMITS } from "@shared/schema";
import { useUserStatus } from "@/hooks/use-user-status";
import { motion } from "framer-motion";

interface PromptFormProps {
  onSubmit: (data: OptimizeRequest) => void;
  isPending: boolean;
  disabled?: boolean;
  clearOnSuccess?: boolean;
}

const tonlages = [
  { id: "Elegant", label: "Exklusivt & Elegant" },
  { id: "Modern", label: "Modernt & Avskalat" },
  { id: "Familjärt", label: "Varmt & Familjärt" },
  { id: "Säljigt", label: "Säljigt & Kraftfullt" },
] as const;

export function PromptForm({ onSubmit, isPending, disabled = false, clearOnSuccess = false }: PromptFormProps) {
  // Nya fält för mäklardata
  const [address, setAddress] = useState("");
  const [highlights, setHighlights] = useState("");
  const [areaInfo, setAreaInfo] = useState("");
  const [ton, setTon] = useState<string>("Elegant");

  const wasSubmitting = useRef(false);
  const { data: userStatus } = useUserStatus();
  const plan = userStatus?.plan || "free";
  const charLimit = CHARACTER_LIMITS[plan as keyof typeof CHARACTER_LIMITS];

  // Slå ihop all info till en "super-prompt" för backend
  const combinedPrompt = `ADRESS: ${address}\nHÖJDPUNKTER: ${highlights}\nOMRÅDE/FÖRENING: ${areaInfo}\nÖNSKAT TONLÄGE: ${ton}`;
  const isOverLimit = combinedPrompt.length > charLimit;

  useEffect(() => {
    if (wasSubmitting.current && !isPending && clearOnSuccess) {
      setAddress("");
      setHighlights("");
      setAreaInfo("");
    }
    wasSubmitting.current = isPending;
  }, [isPending, clearOnSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !highlights.trim() || isPending) return;

    // Vi skickar den sammansatta texten som "prompt"
    onSubmit({ prompt: combinedPrompt, type: "Marketing" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.08] p-6 md:p-8 shadow-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Adress & Typ */}
        <div className="space-y-2">
          <Label className="text-white/70 flex items-center gap-2">
            <Home className="w-4 h-4" /> Bostadstyp & Adress
          </Label>
          <Input 
            placeholder="t.ex. 3:a på Vasagatan 12, vindsvåning"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="bg-white/[0.03] border-white/10 text-white h-12"
          />
        </div>

        {/* Höjdpunkter */}
        <div className="space-y-2">
          <Label className="text-white/70 flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Höjdpunkter & Detaljer
          </Label>
          <Textarea
            placeholder="t.ex. Sekelskifte, 3.2m takhöjd, kakelugn, nyslipade golv, solig balkong..."
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            className="min-h-[100px] bg-white/[0.03] border-white/10 text-white"
          />
        </div>

        {/* Område */}
        <div className="space-y-2">
          <Label className="text-white/70 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Område & Förening
          </Label>
          <Input 
            placeholder="t.ex. Stabil brf med låg belåning. Nära parker och kommunikationer."
            value={areaInfo}
            onChange={(e) => setAreaInfo(e.target.value)}
            className="bg-white/[0.03] border-white/10 text-white h-12"
          />
        </div>

        {/* Tonläge */}
        <div className="space-y-2">
          <Label className="text-white/70 flex items-center gap-2">
            <Wand2 className="w-4 h-4" /> Önskat Tonläge
          </Label>
          <Select value={ton} onValueChange={setTon}>
            <SelectTrigger className="bg-white/[0.03] border-white/10 text-white h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-white/10">
              {tonlages.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-white">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            disabled={!address.trim() || !highlights.trim() || isPending || disabled || isOverLimit}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:scale-[1.02] transition-transform shadow-lg shadow-violet-500/20"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Skapar beskrivning...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generera Hemnet-text
              </>
            )}
          </Button>
          <p className="text-center text-xs text-white/30 mt-4">
            Genom att klicka genererar du en professionell objektsbeskrivning baserad på din fakta.
          </p>
        </div>
      </form>
    </motion.div>
  );
}