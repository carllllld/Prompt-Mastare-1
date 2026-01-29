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
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="inga">Ingen balkong</SelectItem>
                      <SelectItem value="vanlig">Vanlig balkong</SelectItem>
                      <SelectItem value="stor">Stor balkong</SelectItem>
                      <SelectItem value="inglasad">Inglasad balkong</SelectItem>
                      <SelectItem value="terrass">Terrass</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="balconyDirection"
              render={({ field }) => (
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
                    <SelectContent position="popper">
                      <SelectItem value="syd">Syd (solkigast)</SelectItem>
                      <SelectItem value="sydvast">Sydväst (kvällssol)</SelectItem>
                      <SelectItem value="vast">Väst</SelectItem>
                      <SelectItem value="ost">Öst (morgonsol)</SelectItem>
                      <SelectItem value="norr">Norr (skuggigt)</SelectItem>
                      <SelectItem value="genom">Genomgående (flera)</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
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
              name="renovation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Renoveringar</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="inga">Inga renoveringar</SelectItem>
                      <SelectItem value="kok">Kök nytt</SelectItem>
                      <SelectItem value="badrum">Badrum nytt</SelectItem>
                      <SelectItem value="kokbad">Kök & badrum nya</SelectItem>
                      <SelectItem value="total">Totalrenoverad</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Skick</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="bra">Bra skick</SelectItem>
                      <SelectItem value="mycketbra">Mycket bra skick</SelectItem>
                      <SelectItem value="nyskick">Nyskick</SelectItem>
                      <SelectItem value="original">Originalskick</SelectItem>
                      <SelectItem value="renoveringsobjekt">Renoveringsobjekt</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* RAD 3: BYGGÅR & ENERGIKLASS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="buildYearPro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Byggår/Epok</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
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
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="energyClass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Energiklass</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="A">A (Bäst)</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                      <SelectItem value="G">G</SelectItem>
                      <SelectItem value="okand">Okänd</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* RAD 4: GOLV & FÖNSTER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="floorType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Golv</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="parkett">Parkett</SelectItem>
                      <SelectItem value="ekparkett">Ekparkett</SelectItem>
                      <SelectItem value="laminat">Laminat</SelectItem>
                      <SelectItem value="klinker">Klinker</SelectItem>
                      <SelectItem value="kakel">Kakel</SelectItem>
                      <SelectItem value="marmor">Marmor</SelectItem>
                      <SelectItem value="betsgolv">Betsgolv</SelectItem>
                      <SelectItem value="vinyl">Vinyl</SelectItem>
                      <SelectItem value="sten">Stengolv</SelectItem>
                      <SelectItem value="blandat">Blandat</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="windows"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Fönster</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="tra">Träfönster</SelectItem>
                      <SelectItem value="tra3">Trä 3-glas</SelectItem>
                      <SelectItem value="aluminium">Aluminiumfönster</SelectItem>
                      <SelectItem value="plast">Plastfönster</SelectItem>
                      <SelectItem value="genom">Genomgående</SelectItem>
                      <SelectItem value="stora">Stora fönster</SelectItem>
                      <SelectItem value="valv">Valvfönster</SelectItem>
                      <SelectItem value="skytte">Skyttfönster</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* RAD 5: KÖK & BADRUM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="kitchenType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Kök</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="kok">Standardkök</SelectItem>
                      <SelectItem value="kokkok">Kökskök</SelectItem>
                      <SelectItem value="oppet">Öppet kök</SelectItem>
                      <SelectItem value="design">Designkök</SelectItem>
                      <SelectItem value="hustill">Hushållskök</SelectItem>
                      <SelectItem value="studio">Studiokök</SelectItem>
                      <SelectItem value="galley">Galleykök</SelectItem>
                      <SelectItem value="kokisland">Kök-ö</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bathroomType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Badrum</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="standard">Standardbadrum</SelectItem>
                      <SelectItem value="modernt">Modernt badrum</SelectItem>
                      <SelectItem value="golvvarme">Golvvärme</SelectItem>
                      <SelectItem value="dusch">Duschbadrum</SelectItem>
                      <SelectItem value="badkar">Badkar</SelectItem>
                      <SelectItem value="baddusch">Badkar & dusch</SelectItem>
                      <SelectItem value="gastwc">Gäst-WC</SelectItem>
                      <SelectItem value="dubbel">Dubbel badrum</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
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
              name="view"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Utsikt</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="inga">Ingen särskild utsikt</SelectItem>
                      <SelectItem value="gard">Trädgård</SelectItem>
                      <SelectItem value="innergard">Innergård</SelectItem>
                      <SelectItem value="park">Park</SelectItem>
                      <SelectItem value="sjo">Sjöutsikt</SelectItem>
                      <SelectItem value="vattensidan">Vattensidan</SelectItem>
                      <SelectItem value="berg">Bergsutsikt</SelectItem>
                      <SelectItem value="stad">Stadsvy</SelectItem>
                      <SelectItem value="fri">Fri utsikt</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Område</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="centrum">Centrum</SelectItem>
                      <SelectItem value="stadskarn">Stadskärna</SelectItem>
                      <SelectItem value="residential">Bostadsområde</SelectItem>
                      <SelectItem value="familjevanligt">Familjevänligt</SelectItem>
                      <SelectItem value="lugnt">Lugnt område</SelectItem>
                      <SelectItem value="livligt">Livligt område</SelectItem>
                      <SelectItem value="exklusivt">Exklusivt område</SelectItem>
                      <SelectItem value="natur">Nära natur</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* RAD 7: TRANSPORT & FÖRENING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="transport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Kommunikation</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="tunnelbana">Tunnelbana (nära)</SelectItem>
                      <SelectItem value="tunnelbana5">Tunnelbana (5 min)</SelectItem>
                      <SelectItem value="tunnelbana10">Tunnelbana (10 min)</SelectItem>
                      <SelectItem value="buss">Buss (nära)</SelectItem>
                      <SelectItem value="pendeltag">Pendeltåg</SelectItem>
                      <SelectItem value="motorvag">Motorväg (nära)</SelectItem>
                      <SelectItem value="cykel">Cykelavstånd</SelectItem>
                      <SelectItem value="gata">Gatupptag</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="association"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-slate-700 font-bold text-xs">Förening</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="!bg-white !text-black border-slate-300 h-10">
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="skuldfri">Skuldfri</SelectItem>
                      <SelectItem value="lanskuldlag">Låg skuldsättning</SelectItem>
                      <SelectItem value="stabil">Stabil ekonomi</SelectItem>
                      <SelectItem value="planerad">Planerad renovering</SelectItem>
                      <SelectItem value="ny">Ny förening</SelectItem>
                      <SelectItem value="okand">Okänd status</SelectItem>
                      <SelectItem value="hyreshus">Hyreshus</SelectItem>
                      <SelectItem value="samfallighet">Samfällighetsförening</SelectItem>
                      <SelectItem value="annat">Annan (skriv in)</SelectItem>
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
                    <FormLabel className="text-xs font-normal">Hiss</FormLabel>
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
                    <FormLabel className="text-xs font-normal">Öppen spis</FormLabel>
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
                    <FormLabel className="text-xs font-normal">Golvvärme</FormLabel>
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
                    <FormLabel className="text-xs font-normal">Balkong i väst</FormLabel>
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
                    <FormLabel className="text-xs font-normal">Originaldetaljer</FormLabel>
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
                    <FormLabel className="text-xs font-normal">Takhöjd &gt;3m</FormLabel>
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
                    <FormLabel className="text-xs font-normal">Gästlägenhet</FormLabel>
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
                    <FormLabel className="text-xs font-normal">Fiber</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* MINIMAL FRITEXT - ENDAST OM NÖDVÄNDIGT */}
        <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="!text-slate-700 font-bold">Övrig info (frivilligt)</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  className="!bg-white !text-black border-slate-300 min-h-[80px] leading-relaxed focus:border-indigo-500 transition-all" 
                  placeholder={`Använd dropdowns ovan för vanliga detaljer. Skriv bara här om något saknas:

• Unika detaljer (öppen spis, takhöjd, originaldetaljer)
• Speciella material (marmor, ekparkett, designkök)
• Egna observationer (särskild utsikt, unika lösningar)
• Närområde (tunnelbana, skola, park, kommunikation)`} 
                />
              </FormControl>
              <p className="text-[11px] text-slate-400 italic mt-2">
                De flesta detaljer är redan ifyllda via kolumnerna ovan!
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