import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Home, Sparkles, Loader2, MapPin, Maximize, ArrowUpCircle, Trees, Layout, DollarSign, Sun, Wind, Car, Bath, Sofa } from "lucide-react";
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
      lotSize: "",
      price: "",
      fee: "", // Avgift fÃ¶r bostadsrÃ¤tt
      buildYear: "", // ByggÃ¥r
      features: "",
      platform: "hemnet", // Standardval
      // SMARTA FÃ„LT - MINIMAL INPUT
      balcony: "",
      balconyDirection: "",
      renovation: "",
      condition: "",
      heating: "",
      parking: "",
      storage: "",
      hasElevator: false,
      association: "",
      // NYA PRO-FÃ„LT
      buildYearPro: "",
      energyClass: "",
      floorType: "",
      kitchenType: "",
      bathroomType: "",
      windows: "",
      view: "",
      neighborhood: "",
      transport: "",
      yearBuilt: "",
      specialFeatures: [],
      // CHECKBOX FÃ„LT
      fireplace: false,
      floorHeating: false,
      balconyWest: false,
      originalDetails: false,
      highCeiling: false,
      guestApartment: false,
      fiber: false,
    },
  });

  const onLocalSubmit = (values: any) => {
    // Bygg ihop en detaljerad prompt som AI:n anvÃ¤nder fÃ¶r kontext
    let detailString = `Bostadstyp: ${propertyType === "apartment" ? "LÃ¤genhet" : "Villa/Hus"}\n`;
    detailString += `Adress: ${values.address}\n`;
    detailString += `Boarea: ${values.size} kvm\n`;
    detailString += `Antal rum: ${values.rooms}\n`;

    if (propertyType === "apartment") {
      detailString += `VÃ¥ning: ${values.floor}, Hiss: ${values.elevator}\n`;
      if (values.fee) {
        detailString += `Avgift: ${values.fee} kr/mÃ¥n\n`;
      }
    } else {
      detailString += `Tomtarea: ${values.lotSize} kvm\n`;
    }

    if (values.buildYear) {
      detailString += `ByggÃ¥r: ${values.buildYear}\n`;
    }

    if (values.price) {
      detailString += `Pris: ${values.price} kr\n`;
    }

    // LÃ„GG TILL ALLA DROPDOWN & CHECKBOX FÃ„LT
    if (values.balcony) detailString += `Balkong: ${values.balcony}\n`;
    if (values.balconyDirection) detailString += `BalkonglÃ¤ge: ${values.balconyDirection}\n`;
    if (values.renovation) detailString += `Renovering: ${values.renovation}\n`;
    if (values.condition) detailString += `Skick: ${values.condition}\n`;
    if (values.heating) detailString += `UppvÃ¤rmning: ${values.heating}\n`;
    if (values.parking) detailString += `Parkering: ${values.parking}\n`;
    if (values.storage) detailString += `FÃ¶rrÃ¥d: ${values.storage}\n`;
    if (values.association) detailString += `FÃ¶rening: ${values.association}\n`;
    
    // PRO-FÃ„LT
    if (values.energyClass) detailString += `Energiklass: ${values.energyClass}\n`;
    if (values.floorType) detailString += `Golvtyp: ${values.floorType}\n`;
    if (values.kitchenType) detailString += `KÃ¶ks typ: ${values.kitchenType}\n`;
    if (values.bathroomType) detailString += `Badrumstyp: ${values.bathroomType}\n`;
    if (values.windows) detailString += `FÃ¶nster: ${values.windows}\n`;
    if (values.view) detailString += `Utsikt: ${values.view}\n`;
    if (values.neighborhood) detailString += `OmrÃ¥de: ${values.neighborhood}\n`;
    if (values.transport) detailString += `Kommunikation: ${values.transport}\n`;
    
    // CHECKBOXES
    if (values.hasElevator) detailString += `Hiss: Ja\n`;
    if (values.fireplace) detailString += `Ã–ppen spis: Ja\n`;
    if (values.floorHeating) detailString += `GolvvÃ¤rme: Ja\n`;
    if (values.balconyWest) detailString += `Balkong i vÃ¤st: Ja\n`;
    if (values.originalDetails) detailString += `Originaldetaljer: Ja\n`;
    if (values.highCeiling) detailString += `TakhÃ¶jd >3m: Ja\n`;
    if (values.guestApartment) detailString += `GÃ¤stlÃ¤genhet: Ja\n`;
    if (values.fiber) detailString += `Fiber: Ja\n`;

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

        {/* VÃ„LJ TYP */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setPropertyType("apartment")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all",
              propertyType === "apartment" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Building2 className="w-4 h-4" /> LÃ¤genhet
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
                * Priset anvÃ¤nds av AI:n fÃ¶r att vÃ¤lja rÃ¤tt ton och stil (STANDARD/PREMIUM/EXKLUSIVT), Ã¤ven om det dÃ¶ljs i Hemnet-lÃ¤get.
              </p>
            </FormItem>
          )}
        />

        {/* SPECIFIKA FÃ„LT */}
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
                    <FormLabel className="!text-slate-700 font-bold text-xs uppercase">Avgift (kr/mÃ¥n)</FormLabel>
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
                    <FormLabel className="!text-slate-700 font-bold text-xs uppercase">VÃ¥ning</FormLabel>
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

        {/* PLATFORMSVÃ„LJARE MED HJÃ„LPTEXT */}
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
                  Hemnet (BrÃ¶dtext)
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
                * Faktan ovan anvÃ¤nds fÃ¶r att AI:n ska fÃ¶rstÃ¥ kontext och anpassa ordval, Ã¤ven om siffrorna dÃ¶ljs i Hemnet-lÃ¤get.
              </p>
            </FormItem>
          )}
        />

        {/* SMARTA KOLUMNER - MINIMAL INPUT */}
        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <FormLabel className="!text-slate-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Snabbval (klicka pÃ¥ det som gÃ¤ller):
          </FormLabel>

          {/* RAD 1: BALKONG & VÃ„DERSTRECK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="balcony"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs flex items-center gap-1">
                    <Sun className="w-3 h-3" /> Balkong/Uteplats
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="VÃ¤lj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="inga">Ingen balkong</SelectItem>
                      <SelectItem value="vanlig">Vanlig balkong</SelectItem>
                      <SelectItem value="stor">Stor balkong</SelectItem>
                      <SelectItem value="inglasad">Inglasad balkong</SelectItem>
                      <SelectItem value="terrass">Terrass</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="balconyDirection" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs flex items-center gap-1">
                    <Wind className="w-3 h-3" /> Väderstreck
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="soder">Söder (soligt)</SelectItem>
                      <SelectItem value="vast">Väst (kvällssol)</SelectItem>
                      <SelectItem value="ost">Öst (morgonsol)</SelectItem>
                      <SelectItem value="norr">Norr (skuggigt)</SelectItem>
                      <SelectItem value="genom">Genomgående (flera)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* RAD 2: RENOVERING & SKICK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="renovation" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Renovering</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="nytt">Nytt/Nyrenoverat</SelectItem>
                      <SelectItem value="gott">Gott skick</SelectItem>
                      <SelectItem value="original">Originalskick</SelectItem>
                      <SelectItem value="renoveringsbehov">Renoveringsbehov</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Skick</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="perfekt">Perfekt skick</SelectItem>
                      <SelectItem value="mycket-gott">Mycket gott skick</SelectItem>
                      <SelectItem value="gott">Gott skick</SelectItem>
                      <SelectItem value="acceptabelt">Acceptabelt skick</SelectItem>
                      <SelectItem value="renoveringsbehov">Renoveringsbehov</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* RAD 3: BYGGÃ…R & ENERGIKLASS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="buildYearPro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">ByggÃ¥r/Epok</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="VÃ¤lj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="nybyggd">Nybyggd (2020+)</SelectItem>
                      <SelectItem value="2000s">2000-tal</SelectItem>
                      <SelectItem value="1990s">1990-tal</SelectItem>
                      <SelectItem value="1980s">1980-tal</SelectItem>
                      <SelectItem value="1970s">1970-tal (Miljonprogram)</SelectItem>
                      <SelectItem value="1960s">1960-tal</SelectItem>
                      <SelectItem value="1950s">1950-tal</SelectItem>
                      <SelectItem value="sekelskifte">Sekelskifte (1900-1930)</SelectItem>
                      <SelectItem value="1800s">1800-tal</SelectItem>
                      <SelectItem value="karaktar">KaraktÃ¤rsfastighet</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="energyClass" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Energiklass</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="A">A (Bäst)</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                      <SelectItem value="G">G (Sämst)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* RAD 4: GOLV & FÃ–NSTER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="floorType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Golvtyp</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="parkett">Parkett</SelectItem>
                      <SelectItem value="ekparkett">Ekparkett</SelectItem>
                      <SelectItem value="laminat">Laminat</SelectItem>
                      <SelectItem value="klinker">Klinker</SelectItem>
                      <SelectItem value="tra">Trägolv</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="windows" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Fönster</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="3-glas">3-glas</SelectItem>
                      <SelectItem value="2-glas">2-glas</SelectItem>
                      <SelectItem value="sprojsade">Spröjsade</SelectItem>
                      <SelectItem value="takfonster">Takfönster</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* RAD 5: KÃ–K & BADRUM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="kitchenType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Kökstyp</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="oppet">Öppet kök</SelectItem>
                      <SelectItem value="separat">Separat kök</SelectItem>
                      <SelectItem value="kokso">Köksö</SelectItem>
                      <SelectItem value="pentry">Pentry</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bathroomType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Badrum</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="helkaklat">Helkaklat</SelectItem>
                      <SelectItem value="dusch">Dusch</SelectItem>
                      <SelectItem value="badkar">Badkar</SelectItem>
                      <SelectItem value="tvattstuga">Tvättstuga</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* RAD 6: UTSIKT & OMRADE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="view" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Utsikt</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="sjoutsikt">Sjöutsikt</SelectItem>
                      <SelectItem value="havsutsikt">Havsutsikt</SelectItem>
                      <SelectItem value="stadsutsikt">Stadsutsikt</SelectItem>
                      <SelectItem value="parkutsikt">Parkutsikt</SelectItem>
                      <SelectItem value="innergard">Innergård</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="neighborhood" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Område</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="lugnt">Lugnt område</SelectItem>
                      <SelectItem value="centralt">Centralt</SelectItem>
                      <SelectItem value="familjevanligt">Familjevänligt</SelectItem>
                      <SelectItem value="naturnara">Naturnära</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* RAD 7: TRANSPORT & FÃ–RENING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="transport" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Kommunikation</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="tunnelbana">Nära tunnelbana</SelectItem>
                      <SelectItem value="pendeltag">Nära pendeltåg</SelectItem>
                      <SelectItem value="buss">Nära buss</SelectItem>
                      <SelectItem value="sparvagn">Nära spårvagn</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="association" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Förening</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="valskott">Välskött förening</SelectItem>
                      <SelectItem value="nybildad">Nybildad förening</SelectItem>
                      <SelectItem value="stor">Stor förening</SelectItem>
                      <SelectItem value="liten">Liten förening</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* RAD 8: SPECIAL FEATURES - CHECKBOXES */}
          <div className="space-y-3">
            <FormLabel className="!text-slate-700 font-bold text-xs">Extra detaljer:</FormLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FormField
                control={form.control}
                name="hasElevator"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal !text-black">Hiss</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fireplace"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal !text-black">Ã–ppen spis</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="floorHeating"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal !text-black">GolvvÃ¤rme</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="balconyWest"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal !text-black">Balkong i vÃ¤st</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="originalDetails"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal !text-black">Originaldetaljer</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="highCeiling"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal !text-black">TakhÃ¶jd &gt;3m</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guestApartment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal !text-black">GÃ¤stlÃ¤genhet</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fiber"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal !text-black">Fiber</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* MINIMAL FRITEXT - ENDAST OM NÃ–DVÃ„NDIGT */}
          <FormField
            control={form.control}
            name="features"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="!text-slate-700 font-bold">Ã–vrig info (frivilligt)</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    className="!bg-white !text-black border-slate-300 min-h-[80px] leading-relaxed focus:border-indigo-500 transition-all placeholder:text-slate-500" 
                    placeholder={`AnvÃ¤nd dropdowns ovan fÃ¶r vanliga detaljer. Skriv bara hÃ¤r om nÃ¥got saknas:

â€¢ Unika detaljer (Ã¶ppen spis, takhÃ¶jd, originaldetaljer)
â€¢ Speciella material (marmor, ekparkett, designkÃ¶k)
â€¢ Egna observationer (sÃ¤rskild utsikt, unika lÃ¶sningar)
â€¢ NÃ¤romrÃ¥de (tunnelbana, skola, park, kommunikation)`} 
                  />
                </FormControl>
                <p className="text-[11px] text-slate-400 italic mt-2">
                  De flesta detaljer Ã¤r redan ifyllda via kolumnerna ovan!
                </p>
              </FormItem>
            )}
          />
        </div>

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












