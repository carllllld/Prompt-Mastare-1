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
      fee: "", // Avgift för bostadsrätt
      buildYear: "", // Byggår
      features: "",
      platform: "hemnet", // Standardval
      // SMARTA FÄLT - MINIMAL INPUT
      balcony: "",
      balconyDirection: "",
      renovation: "",
      condition: "",
      heating: "",
      parking: "",
      storage: "",
      hasElevator: false,
      association: "",
      // NYA PRO-FÄLT
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
      // CHECKBOX FÄLT
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

    // LÄGG TILL ALLA DROPDOWN & CHECKBOX FÄLT
    if (values.balcony) detailString += `Balkong: ${values.balcony}\n`;
    if (values.balconyDirection) detailString += `Balkongläge: ${values.balconyDirection}\n`;
    if (values.renovation) detailString += `Renovering: ${values.renovation}\n`;
    if (values.condition) detailString += `Skick: ${values.condition}\n`;
    if (values.heating) detailString += `Uppvärmning: ${values.heating}\n`;
    if (values.parking) detailString += `Parkering: ${values.parking}\n`;
    if (values.storage) detailString += `Förråd: ${values.storage}\n`;
    if (values.association) detailString += `Förening: ${values.association}\n`;
    
    // PRO-FÄLT
    if (values.energyClass) detailString += `Energiklass: ${values.energyClass}\n`;
    if (values.floorType) detailString += `Golvtyp: ${values.floorType}\n`;
    if (values.kitchenType) detailString += `Köks typ: ${values.kitchenType}\n`;
    if (values.bathroomType) detailString += `Badrumstyp: ${values.bathroomType}\n`;
    if (values.windows) detailString += `Fönster: ${values.windows}\n`;
    if (values.view) detailString += `Utsikt: ${values.view}\n`;
    if (values.neighborhood) detailString += `Område: ${values.neighborhood}\n`;
    if (values.transport) detailString += `Kommunikation: ${values.transport}\n`;
    
    // CHECKBOXES
    if (values.hasElevator) detailString += `Hiss: Ja\n`;
    if (values.fireplace) detailString += `Öppen spis: Ja\n`;
    if (values.floorHeating) detailString += `Golvvärme: Ja\n`;
    if (values.balconyWest) detailString += `Balkong i väst: Ja\n`;
    if (values.originalDetails) detailString += `Originaldetaljer: Ja\n`;
    if (values.highCeiling) detailString += `Takhöjd >3m: Ja\n`;
    if (values.guestApartment) detailString += `Gästlägenhet: Ja\n`;
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
              <FormItem>
                <FormControl>
                  <Input {...field} className='!bg-white !text-black border-slate-300 h-12' placeholder='t.ex. Riddargatan 12' />
                </FormControl>
              </FormItem>
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="!text-slate-700 font-bold flex items-center gap-2">
                  <Maximize className="w-3.5 h-3.5" /> Boarea (kvm)
                </FormLabel>


                <FormControl>
                  <Input {...field} className='!bg-white !text-black border-slate-300 h-12' placeholder='t.ex. 65' />
                </FormControl>
              </FormItem>
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="!text-slate-700 font-bold flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" /> Pris (kr)
              </FormLabel>

              <FormControl>
                <Input {...field} className='!bg-white !text-black border-slate-300 h-12' placeholder='t.ex. 4 500 000' />
              </FormControl>
            </FormItem>
          )}

        {/* SPECIFIKA FÄLT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="rooms"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} className='!bg-white !text-black border-slate-300 h-12' placeholder='t.ex. 3' />
                </FormControl>
              </FormItem>

          {propertyType === "apartment" ? (
            <>
              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-slate-700 font-bold text-xs uppercase">Avgift (kr/mån)</FormLabel>

                  </FormItem>
                )}
              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-slate-700 font-bold text-xs uppercase">Våning</FormLabel>

                  </FormItem>
                )}
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

                </FormItem>
              )}
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

        {/* SMARTA KOLUMNER - MINIMAL INPUT */}
        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <FormLabel className="!text-slate-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Snabbval (klicka på det som gäller):
          </FormLabel>

          {/* RAD 1: BALKONG & VÄDERSTRECK */}
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
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                  />
                </FormControl>
              </FormItem>
                      <SelectItem value="inga">Ingen balkong</SelectItem>
                      <SelectItem value="vanlig">Vanlig balkong</SelectItem>
                      <SelectItem value="stor">Stor balkong</SelectItem>
                      <SelectItem value="inglasad">Inglasad balkong</SelectItem>
                      <SelectItem value="terrass">Terrass</SelectItem>
                    </SelectContent>
                  </Select>

                  )}
                </FormItem>
              )}

            <FormField
              control={form.control}
              name="balconyDirection" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs flex items-center gap-1">
                  </FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="V�lj..." />
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                      <SelectItem value="soder">S�der (soligt)</SelectItem>
                      <SelectItem value="vast">V�st (kv�llssol)</SelectItem>
                      <SelectItem value="ost">�st (morgonsol)</SelectItem>
                      <SelectItem value="norr">Norr (skuggigt)</SelectItem>
                      <SelectItem value="genom">Genomg�ende (flera)</SelectItem>
                    </SelectContent>
                  </Select>

                    </SelectContent>
                  </Select>
                  </FormControl>
                </FormItem>
                  )}

                  )}
                </FormItem>
              )}
          </div>

          {/* RAD 2: RENOVERING & SKICK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="renovation" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Renovering</FormLabel>
                  <FormLabel className='!text-slate-700 font-bold text-xs'>Renovering</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                    </SelectContent>
                  </Select>
                    </SelectContent>
                  </Select>
                  </FormControl>
                </FormItem>

                  )}

                  )}
                </FormItem>
              )}

            <FormField
              control={form.control}
              name="condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">condition</FormLabel>
                  <FormLabel className='!text-slate-700 font-bold text-xs'>condition</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                    </SelectContent>
                  </Select>
                    </SelectContent>
                  </Select>
                  </FormControl>
                </FormItem>

                  )}

                  )}
                </FormItem>
              )}
          </div>

          {/* RAD 3: BYGGÅR & ENERGIKLASS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="buildYearPro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Byggår/Epok</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>

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
                      <SelectItem value="karaktar">Karaktärsfastighet</SelectItem>
                    </SelectContent>
                  </Select>

                  )}
                </FormItem>
              )}

            <FormField
              control={form.control}
              name="energyClass" render={({ field }) => (
                <FormItem>
                  <FormLabel className='!text-slate-700 font-bold text-xs'>energyClass</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectValue placeholder="V�lj..." />
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                    </SelectContent>
                  </Select>
                  </FormControl>
                </FormItem>
                </FormItem>
              )}

                  )}

                  )}
                </FormItem>
              )}
          </div>

          {/* RAD 4: GOLV & FÖNSTER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="floorType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">floorType</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="V�lj..." />
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                    </SelectContent>
                  </Select>

                  )}
                </FormItem>
              )}

                  )}

                  )}
                </FormItem>
              )}

            <FormField
              control={form.control}
              name="windows" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">windows</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="V�lj..." />
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                    </SelectContent>
                  </Select>

                  )}
                </FormItem>
              )}

                  )}

                  )}
                </FormItem>
              )}
          </div>

          {/* RAD 5: KÖK & BADRUM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="kitchenType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">kitchenType</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="V�lj..." />
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                    </SelectContent>
                  </Select>

                  )}
                </FormItem>
              )}

                  )}

                  )}
                </FormItem>
              )}

            <FormField
              control={form.control}
              name="bathroomType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">bathroomType</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="V�lj..." />
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                    </SelectContent>
                  </Select>

                  )}
                </FormItem>
              )}

                  )}

                  )}
                </FormItem>
              )}
          </div>

          {/* RAD 6: UTSIKT & OMRADE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="view" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">view</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="V�lj..." />
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                    </SelectContent>
                  </Select>

                  )}
                </FormItem>
              )}

                  )}

                  )}
                </FormItem>
              )}

            <FormField
              control={form.control}
              name="neighborhood" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">neighborhood</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="V�lj..." />
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                    </SelectContent>
                  </Select>

                  )}
                </FormItem>
              )}

                  )}

                  )}
                </FormItem>
              )}
          </div>

          {/* RAD 7: TRANSPORT & FÖRENING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="transport" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">transport</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="V�lj..." />
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                    </SelectContent>
                  </Select>

                  )}
                </FormItem>
              )}

                  )}

                  )}
                </FormItem>
              )}

            <FormField
              control={form.control}
              name="association" render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">association</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="V�lj..." />
                      </SelectTrigger>

                    <SelectContent position="popper" className="!bg-white !text-black">
                    </SelectContent>
                  </Select>

                  )}
                </FormItem>
              )}

                  )}

                  )}
                </FormItem>
              )}
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
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"

                    <FormLabel className="text-xs font-normal !text-black">Hiss</FormLabel>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className='mt-1'
                      />
                    </FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"

                    <FormLabel className="text-xs font-normal !text-black">Öppen spis</FormLabel>
                  </FormItem>
                )}
              <FormField
                control={form.control}
                name="floorHeating"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"

                    <FormLabel className="text-xs font-normal !text-black">Golvvärme</FormLabel>
                  </FormItem>
                )}
              <FormField
                control={form.control}
                name="balconyWest"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"

                    <FormLabel className="text-xs font-normal !text-black">Balkong i väst</FormLabel>
                  </FormItem>
                )}
              <FormField
                control={form.control}
                name="originalDetails"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"

                    <FormLabel className="text-xs font-normal !text-black">Originaldetaljer</FormLabel>
                  </FormItem>
                )}
              <FormField
                control={form.control}
                name="highCeiling"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"

                    <FormLabel className="text-xs font-normal !text-black">Takhöjd &gt;3m</FormLabel>
                  </FormItem>
                )}
              <FormField
                control={form.control}
                name="guestApartment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"

                    <FormLabel className="text-xs font-normal !text-black">Gästlägenhet</FormLabel>
                  </FormItem>
                )}
              <FormField
                control={form.control}
                name="fiber"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"

                    <FormLabel className="text-xs font-normal !text-black">Fiber</FormLabel>
                  </FormItem>
                )}
            </div>
          </div>

          {/* MINIMAL FRITEXT - ENDAST OM NÖDVÄNDIGT */}
          <FormField
            control={form.control}
            name="features"
                <FormLabel className='!text-slate-700 font-bold'>�vrig info (frivilligt)</FormLabel>
                <FormControl>
                  <Textarea
                  <Textarea 
                    className="!bg-white !text-black border-slate-300 min-h-[80px] leading-relaxed focus:border-indigo-500 transition-all placeholder:text-slate-500" 
                    placeholder={`Använd dropdowns ovan för vanliga detaljer. Skriv bara här om något saknas:

• Unika detaljer (öppen spis, takhöjd, originaldetaljer)
• Speciella material (marmor, ekparkett, designkök)
• Egna observationer (särskild utsikt, unika lösningar)
• Närområde (tunnelbana, skola, park, kommunikation)`} 

                <p className="text-[11px] text-slate-400 italic mt-2">
                  De flesta detaljer är redan ifyllda via kolumnerna ovan!
                </p>
              </FormItem>
            )}

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












