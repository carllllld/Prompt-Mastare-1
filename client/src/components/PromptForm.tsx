import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Home, Sparkles, Loader2, MapPin, Maximize, ArrowUpCircle, Trees, Layout, DollarSign } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PromptFormProps {
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
      price: "",
      fee: "", // Avgift för bostadsrätt
      buildYear: "", // Byggår
      features: "",
      platform: "hemnet", // Standardval
    },
  });

  const onLocalSubmit = (values: any) => {
    // Bygg ihop en detaljerad prompt som AI:n använder för kontext
    let detailString = `Bostadstyp: ${propertyType === "apartment" ? "Lägenhet" : "Villa/Hus"}\n`;
    detailString += `Adress: ${values.address}\n`;
    detailString += `Boarea: ${values.size} kvm\n`;
    detailString += `Antal rum: ${values.rooms}\n`;

    if (propertyType === "apartment") {
      detailString += `Våning: ${values.floor}, Hiss: ${values.elevator}\n`;
      if (values.fee) {
        detailString += `Avgift: ${values.fee} kr/mån\n`;
      }
    } else {
      detailString += `Tomtarea: ${values.lotSize} kvm\n`;
    }

    if (values.buildYear) {
      detailString += `Byggår: ${values.buildYear}\n`;
    }

    if (values.price) {
      detailString += `Pris: ${values.price} kr\n`;
    }

    detailString += `Beskrivning av egenskaper: ${values.features}`;

    // Skicka all data till backend
    onSubmit({ 
      prompt: detailString, 
      type: propertyType, 
      platform: values.platform 
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onLocalSubmit)} className="space-y-6">

        {/* VÄLJ TYP */}
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

        {/* ADRESS & STORLEK */}
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
                  <Input {...field} className="!bg-white !text-black border-slate-300 h-12" placeholder="t.ex. Riddargatan 12" />
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
                  <Input {...field} className="!bg-white !text-black border-slate-300 h-12" placeholder="t.ex. 65" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* PRIS */}
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="!text-slate-700 font-bold flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" /> Pris (kr)
              </FormLabel>
              <FormControl>
                <Input {...field} className="!bg-white !text-black border-slate-300 h-12" placeholder="t.ex. 4 500 000" />
              </FormControl>
              <p className="text-[11px] text-slate-400 italic leading-snug mt-1">
                * Priset används av AI:n för att välja rätt ton och stil (STANDARD/PREMIUM/EXKLUSIVT), även om det döljs i Hemnet-läget.
              </p>
            </FormItem>
          )}
        />

        {/* SPECIFIKA FÄLT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="rooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="!text-slate-700 font-bold text-xs uppercase">Antal rum</FormLabel>
                <FormControl>
                  <Input {...field} className="!bg-white !text-black border-slate-300 h-11" placeholder="2.5" />
                </FormControl>
              </FormItem>
            )}
          />

          {propertyType === "apartment" ? (
            <>
              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-slate-700 font-bold text-xs uppercase">Avgift (kr/mån)</FormLabel>
                    <FormControl>
                      <Input {...field} className="!bg-white !text-black border-slate-300 h-11" placeholder="4 200" />
                    </FormControl>
                  </FormItem>
                )}
              />
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

        {/* PLATFORMSVÄLJARE MED HJÄLPTEXT */}
        <FormField
          control={form.control}
          name="platform"
          render={({ field }) => (
            <FormItem className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
              <FormLabel className="!text-slate-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Layout className="w-3.5 h-3.5 text-indigo-500" /> Publiceringsformat:
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
                  Egen sida / Booli
                </button>
              </div>

              <p className="text-[11px] text-slate-400 italic leading-snug mt-2 px-1">
                * Faktan ovan används för att AI:n ska förstå kontext och anpassa ordval, även om siffrorna döljs i Hemnet-läget.
              </p>
            </FormItem>
          )}
        />

        {/* FRITEXT: BESKRIVNING */}
        <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="!text-slate-700 font-bold">Övrig information till AI:n</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  className="!bg-white !text-black border-slate-300 min-h-[140px] leading-relaxed focus:border-indigo-500 transition-all" 
                  placeholder={`Skriv allt annat som AI:n behöver veta, t.ex:

• Balkong/uteplats (väderstreck, storlek)
• Renoveringar (kök 2022, badrum 2020, stambytt)
• Material (parkett, kakel, marmor)
• Ljusförhållanden (genomgående, fönster i flera väderstreck)
• Förening (skuldfri, stabil ekonomi, planerade renoveringar)
• Unika detaljer (öppen spis, takhöjd, originaldetaljer)
• Närområde (tunnelbana, skola, park)`} 
                />
              </FormControl>
              <p className="text-[11px] text-amber-600 font-medium mt-2">
                ⚠️ Juridiskt viktigt för bostadsrätt: avgift, andelstal, pantsättning, föreningens skuld
              </p>
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