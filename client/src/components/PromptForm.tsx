import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sparkles, Building2, Home as HouseIcon } from "lucide-react";

interface PromptFormProps {
  onSubmit: (data: { prompt: string; type: "apartment" | "villa" }) => void;
  isPending: boolean;
  disabled: boolean;
  clearOnSuccess?: boolean;
}

export function PromptForm({ onSubmit, isPending, disabled }: PromptFormProps) {
  const [objectType, setObjectType] = useState<"apartment" | "villa">("apartment");
  const [formData, setFormData] = useState({
    address: "",
    area: "",
    rooms: "",
    fee: "",
    netDebt: "",
    association: "",
    plotArea: "",
    renovations: "",
    highlights: ""
  });

  const handleGenerate = () => {
    const structuredPrompt = `
      OBJEKTSTYP: ${objectType === "apartment" ? "Bostadsrätt" : "Villa"}
      ADRESS: ${formData.address}
      YTA: ${formData.area} kvm, RUM: ${formData.rooms}
      ${objectType === "apartment" ? `FÖRENING: ${formData.association}\nAVGIFT: ${formData.fee}\nNETTOSKULD: ${formData.netDebt}` : `TOMTAREAL: ${formData.plotArea}\nDRIFTSKOSTNAD: ${formData.fee}\nTAXERINGSVÄRDE: ${formData.netDebt}`}
      SKICK/RENOVERINGAR: ${formData.renovations}
      MERVÄRDEN: ${formData.highlights}
    `;
    onSubmit({ prompt: structuredPrompt, type: objectType });
  };

  return (
    <Card className="p-6 bg-white/[0.02] border-white/[0.06] backdrop-blur-md shadow-2xl">
      <div className="space-y-8">
        <div className="flex p-1 bg-white/[0.04] rounded-lg w-full max-w-[320px] mx-auto">
          <button onClick={() => setObjectType("apartment")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${objectType === "apartment" ? "bg-violet-600 text-white" : "text-white/40"}`}>
            <Building2 className="w-4 h-4" /> Lägenhet
          </button>
          <button onClick={() => setObjectType("villa")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${objectType === "villa" ? "bg-violet-600 text-white" : "text-white/40"}`}>
            <HouseIcon className="w-4 h-4" /> Villa
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400/80 px-1">Objektsdata</h3>
            <Input className="bg-white/[0.03] border-white/[0.1] h-12" placeholder="Adress" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <Input className="bg-white/[0.03] border-white/[0.1] h-12" placeholder="Boarea" value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} />
              <Input className="bg-white/[0.03] border-white/[0.1] h-12" placeholder="Antal rum" value={formData.rooms} onChange={(e) => setFormData({...formData, rooms: e.target.value})} />
            </div>
            {objectType === "villa" && <Input className="bg-white/[0.03] border-white/[0.1] h-12" placeholder="Tomtareal" value={formData.plotArea} onChange={(e) => setFormData({...formData, plotArea: e.target.value})} />}
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400/80 px-1">Ekonomi & Juridik</h3>
            <Input className="bg-white/[0.03] border-white/[0.1] h-12" placeholder={objectType === "apartment" ? "Månadsavgift" : "Driftskostnad"} value={formData.fee} onChange={(e) => setFormData({...formData, fee: e.target.value})} />
            <Input className="bg-white/[0.03] border-white/[0.1] h-12" placeholder={objectType === "apartment" ? "Indirekt nettoskuldsättning" : "Taxeringsvärde"} value={formData.netDebt} onChange={(e) => setFormData({...formData, netDebt: e.target.value})} />
            {objectType === "apartment" && <Input className="bg-white/[0.03] border-white/[0.1] h-12" placeholder="BRF-namn" value={formData.association} onChange={(e) => setFormData({...formData, association: e.target.value})} />}
          </div>
          <div className="col-span-full space-y-4 pt-4 border-t border-white/[0.06]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea className="bg-white/[0.03] border-white/[0.1] min-h-[120px] resize-none" placeholder="Renoveringar och skick" value={formData.renovations} onChange={(e) => setFormData({...formData, renovations: e.target.value})} />
              <Textarea className="bg-white/[0.03] border-white/[0.1] min-h-[120px] resize-none" placeholder="Säljande attribut (balkongläge, utsikt etc)" value={formData.highlights} onChange={(e) => setFormData({...formData, highlights: e.target.value})} />
            </div>
          </div>
        </div>
        <Button className="w-full h-14 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg" onClick={handleGenerate} disabled={isPending || disabled}>
          {isPending ? "Analyserar enligt FMI-standard..." : "Generera Objektbeskrivning"}
        </Button>
      </div>
    </Card>
  );
}