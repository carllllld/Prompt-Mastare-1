import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Home, Sparkles, Loader2, MapPin, Maximize, ArrowUpCircle, Trees, Layout } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PromptFormProps {
  // Uppdaterad interface för att inkludera plattform
  onSubmit: (data: { prompt: string; type: "apartment" | "house"; platform: "hemnet" | "general" }) => void;
  isPending: boolean;
  disabled?: boolean;
}

export function PromptForm({ onSubmit, isPending, disabled }: PromptFormProps) {
  const [propertyType, setPropertyType] = useState<"apartment" | "house">("apartment");

  const form = useForm({
    defaultValues: {
      address: "",
      size: "",
      rooms: "",
      floor: "",
      elevator: "",
      lotSize: "",
      features: "",
      platform: "hemnet", // Standardvalet är Hemnet
    },
  });

  const onLocalSubmit = (values: any) => {
    // Här bygger vi ihop en detaljerad prompt baserat på ALLA fält
    let detailString = `Typ: ${propertyType === "apartment" ? "Lägenhet" : "Villa/Hus"}\n`;
    detailString += `Adress: ${values.address}\n`;
    detailString += `Boarea: ${values.size}\n`;
    detailString += `Antal rum: ${values.rooms}\n`;

    if (propertyType === "apartment") {
      detailString += `Våning: ${values.floor}\n`;
      detailString += `Hiss: ${values.elevator}\n`;
    } else {
      detailString += `Tomtarea: ${values.lotSize}\n`;
    }

    detailString += `Övriga egenskaper: ${values.features}`;

    // Skickar nu med platform-valet till backend
    onSubmit({ 
      prompt: detailString, 
      type: propertyType, 
      platform: values.platform 
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onLocalSubmit)} className="space-y-6">
        {/* VÄLJ TYP - Ändrar formulärets fält */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setPropertyType("apartment")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all",
              propertyType === "apartment" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Building2 className="w-4 h-4" /> Lägenhet
          </button>
          <button
            type="button"
            onClick={() => setPropertyType("house")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all",
              propertyType === "house" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Home className="w-4 h-4" /> Villa / Hus
          </button>
        </div>

        {/* RAD 1: Adress och Storlek */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="!text-slate-700 font-bold flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Adress
                </FormLabel>
                <FormControl>
                  <Input {...field} className="!bg-white !text-black border-slate-300 h-12" placeholder="Storgatan 1" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="!text-slate-700 font-bold flex items-center gap-2">
                  <Maximize className="w-3.5 h-3.5" /> Boarea (kvm)
                </FormLabel>
                <FormControl>
                  <Input {...field} className="!bg-white !text-black border-slate-300 h-12" placeholder="t.ex. 85" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* RAD 2: Specifika fält beroende på typ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="rooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="!text-slate-700 font-bold text-xs uppercase">Antal rum</FormLabel>
                <FormControl>
                  <Input {...field} className="!bg-white !text-black border-slate-300 h-11" placeholder="3.5" />
                </FormControl>
              </FormItem>
            )}
          />

          {propertyType === "apartment" ? (
            <>
              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-slate-700 font-bold text-xs uppercase">Våning</FormLabel>
                    <FormControl>
                      <Input {...field} className="!bg-white !text-black border-slate-300 h-11" placeholder="3 av 5" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="elevator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-slate-700 font-bold text-xs uppercase flex items-center gap-1">
                      <ArrowUpCircle className="w-3 h-3" /> Hiss
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="!bg-white !text-black border-slate-300 h-11" placeholder="Ja/Nej" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </>
          ) : (
            <FormField
              control={form.control}
              name="lotSize"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="!text-slate-700 font-bold text-xs uppercase flex items-center gap-1">
                    <Trees className="w-3 h-3" /> Tomtarea (kvm)
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="!bg-white !text-black border-slate-300 h-11" placeholder="t.ex. 1200" />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </div>

        {/* --- NY SEKTION: PLATFORMSVÄLJARE --- */}
        <FormField
          control={form.control}
          name="platform"
          render={({ field }) => (
            <FormItem className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <FormLabel className="!text-slate-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Layout className="w-3.5 h-3.5 text-indigo-500" /> Anpassa formatet för:
              </FormLabel>
              <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => form.setValue("platform", "hemnet")}
                  className={cn(
                    "flex-1 py-2 rounded-md text-xs font-bold transition-all",
                    form.watch("platform") === "hemnet" 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  Hemnet (Brödtext)
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("platform", "general")}
                  className={cn(
                    "flex-1 py-2 rounded-md text-xs font-bold transition-all",
                    form.watch("platform") === "general" 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  Egen hemsida / Booli
                </button>
              </div>
            </FormItem>
          )}
        />

        {/* STOR TEXTRUTA: Övrig info */}
        <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="!text-slate-700 font-bold">Beskrivning & Egenskaper</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  className="!bg-white !text-black border-slate-300 min-h-[140px] leading-relaxed" 
                  placeholder="Berätta om balkong i söderläge, nyrenoverat kök, eldstad, stabil förening eller lummig trädgård..." 
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending || disabled}
          className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Skapar din annons...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generera annonstext
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}