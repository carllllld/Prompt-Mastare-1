import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronDown, ChevronUp, Sparkles, Plus, X, Lock, Crown } from "lucide-react";
import { useState } from "react";

interface PropertyFormData {
  propertyType: "apartment" | "house" | "townhouse" | "villa";
  address: string;
  area: string;
  price: string;
  monthlyFee: string;
  livingArea: string;
  totalRooms: string;
  bedrooms: string;
  buildYear: string;
  condition: string;
  energyClass: string;
  floor: string;
  elevator: boolean;
  layoutDescription: string;
  kitchenDescription: string;
  bathroomDescription: string;
  uniqueSellingPoints: string;
  view: string;
  neighborhood: string;
  transport: string;
  parking: string;
  flooring: string;
  heating: string;
  lotArea: string;
  balconyArea: string;
  specialFeatures: string;
  otherInfo: string;
  platform: "hemnet" | "booli" | "general";
}

const PROPERTY_CONDITIONS = [
  "Nytt", "Nyskick", "Mycket gott skick", "Gott skick", "Bra skick", "Behöver renoveras"
];

const ENERGY_CLASSES = ["A", "B", "C", "D", "E", "F", "G"];

const HEATING_TYPES = [
  "Fjärrvärme", "Värmepump", "Bergvärme", "Elpanna", "Vedpanna", "Golvvärme", "Direktverkande el"
];

interface PromptFormProps {
  onSubmit: (data: {
    prompt: string;
    type: string;
    platform: string;
    wordCountMin?: number;
    wordCountMax?: number;
    imageUrls?: string[];
  }) => void;
  isPending: boolean;
  disabled?: boolean;
  isPro?: boolean;
}

export function PromptFormProfessional({ onSubmit, isPending, disabled, isPro = false }: PromptFormProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [wordCountMin, setWordCountMin] = useState(350);
  const [wordCountMax, setWordCountMax] = useState(450);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const form = useForm<PropertyFormData>({
    defaultValues: {
      propertyType: "apartment",
      address: "",
      area: "",
      price: "",
      monthlyFee: "",
      livingArea: "",
      totalRooms: "",
      bedrooms: "",
      buildYear: "",
      condition: "Gott skick",
      energyClass: "C",
      floor: "",
      elevator: false,
      layoutDescription: "",
      kitchenDescription: "",
      bathroomDescription: "",
      uniqueSellingPoints: "",
      view: "",
      neighborhood: "",
      transport: "",
      parking: "",
      flooring: "",
      heating: "Fjärrvärme",
      lotArea: "",
      balconyArea: "",
      specialFeatures: "",
      otherInfo: "",
      platform: "hemnet",
    },
  });

  const selectedPlatform = form.watch("platform");
  const selectedType = form.watch("propertyType");

  const onLocalSubmit = (values: PropertyFormData) => {
    const typeLabels: Record<string, string> = {
      apartment: "Lägenhet", house: "Hus", townhouse: "Radhus", villa: "Villa",
    };

    let d = "OBJEKTDISPOSITION\n\n";

    d += "=== GRUNDINFORMATION ===\n";
    d += `Typ: ${typeLabels[values.propertyType] || values.propertyType}\n`;
    if (values.address) d += `Adress: ${values.address}\n`;
    if (values.area) d += `Stadsdel/Område: ${values.area}\n`;
    if (values.price) d += `Pris: ${values.price} kr\n`;
    if (values.monthlyFee) d += `Avgift: ${values.monthlyFee} kr/mån\n`;

    d += "\n=== YTOR ===\n";
    if (values.livingArea) d += `Boarea: ${values.livingArea} kvm\n`;
    if (values.lotArea) d += `Tomtarea: ${values.lotArea} kvm\n`;
    if (values.balconyArea) d += `Balkong: ${values.balconyArea} kvm\n`;
    if (values.totalRooms) d += `Antal rum: ${values.totalRooms}\n`;
    if (values.bedrooms) d += `Sovrum: ${values.bedrooms}\n`;

    d += "\n=== BYGGNAD ===\n";
    if (values.buildYear) d += `Byggår: ${values.buildYear}\n`;
    if (values.condition) d += `Skick: ${values.condition}\n`;
    if (values.energyClass) d += `Energiklass: ${values.energyClass}\n`;
    if (values.floor) d += `Våning: ${values.floor}\n`;
    d += `Hiss: ${values.elevator ? "Ja" : "Nej"}\n`;

    if (values.layoutDescription) {
      d += "\n=== PLANLÖSNING & RUM ===\n";
      d += `${values.layoutDescription}\n`;
    }

    if (values.kitchenDescription) {
      d += "\n=== KÖK ===\n";
      d += `${values.kitchenDescription}\n`;
    }

    if (values.bathroomDescription) {
      d += "\n=== BADRUM ===\n";
      d += `${values.bathroomDescription}\n`;
    }

    d += "\n=== MATERIAL & TEKNIK ===\n";
    if (values.flooring) d += `Golvmaterial (typ och var i bostaden, t.ex. per rum): ${values.flooring}\n`;
    if (values.heating) d += `Uppvärmning: ${values.heating}\n`;

    if (values.view || values.neighborhood || values.transport || values.parking) {
      d += "\n=== LÄGE & OMGIVNING ===\n";
      if (values.view) d += `Utsikt: ${values.view}\n`;
      if (values.neighborhood) d += `Områdesbeskrivning (karaktär, service, grannar): ${values.neighborhood}\n`;
      if (values.transport) d += `Kommunikationer: ${values.transport}\n`;
      if (values.parking) d += `Parkering: ${values.parking}\n`;
    }

    if (values.uniqueSellingPoints) {
      d += "\n=== FÖRSÄLJNINGSARGUMENT ===\n";
      d += "(Unika kvaliteter som gör bostaden attraktiv — lyft dessa i texten)\n";
      d += `${values.uniqueSellingPoints}\n`;
    }

    if (values.specialFeatures) {
      d += "\n=== SÄRSKILDA EGENSKAPER ===\n";
      d += "(Specifik utrustning, installationer eller egenskaper utöver standard)\n";
      d += `${values.specialFeatures}\n`;
    }

    if (values.otherInfo) {
      d += "\n=== ÖVRIGT ===\n";
      d += `${values.otherInfo}\n`;
    }

    onSubmit({
      prompt: d,
      type: values.propertyType,
      platform: values.platform,
      ...(isPro && { wordCountMin, wordCountMax }),
      ...(uploadedImages.length > 0 && { imageUrls: uploadedImages }),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onLocalSubmit)} className="space-y-0">

        {/* ── OBJEKTTYP (pills) ── */}
        <div className="pb-5">
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2.5" style={{ color: "#9CA3AF" }}>
            Objekttyp
          </label>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "apartment" as const, label: "Lägenhet" },
              { value: "house" as const, label: "Hus" },
              { value: "townhouse" as const, label: "Radhus" },
              { value: "villa" as const, label: "Villa" },
            ]).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => form.setValue("propertyType", t.value)}
                className="px-4 py-2 text-sm rounded-lg border transition-all font-medium"
                style={{
                  background: selectedType === t.value ? "#2D6A4F" : "#fff",
                  color: selectedType === t.value ? "#fff" : "#4B5563",
                  borderColor: selectedType === t.value ? "#2D6A4F" : "#E8E5DE",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── GRUNDUPPGIFTER ── */}
        <div className="border-t pt-5 pb-5" style={{ borderColor: "#E8E5DE" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel className="text-xs text-gray-500">Adress</FormLabel>
                <FormControl><Input placeholder="Storgatan 1, Stockholm" {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="area" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Stadsdel / Område</FormLabel>
                <FormControl><Input placeholder="Vasastan" {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 mt-3">
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Pris (kr)</FormLabel>
                <FormControl><Input type="number" placeholder="5 500 000" {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="monthlyFee" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Avgift (kr/mån)</FormLabel>
                <FormControl><Input type="number" placeholder="3 500" {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="livingArea" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Boarea (kvm)</FormLabel>
                <FormControl><Input type="number" placeholder="85" {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mt-3">
            <FormField control={form.control} name="totalRooms" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Rum</FormLabel>
                <FormControl><Input type="number" placeholder="3" {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="bedrooms" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Sovrum</FormLabel>
                <FormControl><Input type="number" placeholder="2" {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="buildYear" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Byggår</FormLabel>
                <FormControl><Input type="number" placeholder="1998" {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="condition" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Skick</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {PROPERTY_CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
          </div>
        </div>

        {/* ── BESKRIV OBJEKTET ── */}
        <div className="border-t pt-5 pb-5" style={{ borderColor: "#E8E5DE" }}>
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-3" style={{ color: "#9CA3AF" }}>
            Beskriv objektet
          </label>

          <div className="space-y-3">
            <FormField control={form.control} name="layoutDescription" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Planlösning & rum</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="T.ex: Öppen planlösning med kök och vardagsrum i söderläge. 2 sovrum varav det större har garderobsvägg. Rymlig hall med förvaring."
                    {...field}
                    className="min-h-[80px] resize-none text-sm"
                  />
                </FormControl>
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField control={form.control} name="kitchenDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Kök</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="T.ex: Nytt kök 2022, vita luckor, stenbänk, integrerade vitvaror från Siemens"
                      {...field}
                      className="min-h-[72px] resize-none text-sm"
                    />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="bathroomDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Badrum</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="T.ex: Helkaklat, renoverat 2020, dusch och badkar, golvvärme"
                      {...field}
                      className="min-h-[72px] resize-none text-sm"
                    />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="uniqueSellingPoints" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Vad gör objektet speciellt?</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="T.ex: Högt i tak, originalplank, söderläge med balkong, sjöutsikt, lugn innergård"
                    {...field}
                    className="min-h-[72px] resize-none text-sm"
                  />
                </FormControl>
              </FormItem>
            )} />
          </div>
        </div>

        {/* ── MER DETALJER (expandable) ── */}
        <div className="border-t" style={{ borderColor: "#E8E5DE" }}>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between py-4 text-sm font-medium transition-colors hover:text-gray-700"
            style={{ color: "#9CA3AF" }}
          >
            <span>Läge, material & fler detaljer</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDetails && (
            <div className="pb-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField control={form.control} name="view" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Utsikt</FormLabel>
                    <FormControl><Input placeholder="Sjöutsikt, parkutsikt, innergård" {...field} className="h-10" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="transport" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Kommunikationer</FormLabel>
                    <FormControl><Input placeholder="5 min till t-bana, buss utanför" {...field} className="h-10" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="neighborhood" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Områdesbeskrivning</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="T.ex: Populärt familjeområde nära parker, skolor och matbutiker. Lugnt men centralt."
                      {...field}
                      className="min-h-[68px] resize-none text-sm"
                    />
                  </FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <FormField control={form.control} name="flooring" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Golvmaterial</FormLabel>
                    <FormControl><Input placeholder="T.ex: Ekparkett i vardagsrum, klinker i hall" {...field} className="h-10" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="heating" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Uppvärmning</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {HEATING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="energyClass" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Energiklass</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ENERGY_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FormField control={form.control} name="parking" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-xs text-gray-500">Parkering</FormLabel>
                    <FormControl><Input placeholder="Garage, carport, P-plats" {...field} className="h-10" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="floor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Våning</FormLabel>
                    <FormControl><Input placeholder="3 av 5" {...field} className="h-10" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="elevator" render={({ field }) => (
                  <FormItem className="flex flex-row items-end gap-2 space-y-0 pb-1">
                    <FormControl>
                      <Checkbox
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                        id="elevator-check"
                      />
                    </FormControl>
                    <label htmlFor="elevator-check" className="text-sm text-gray-600 cursor-pointer leading-none">
                      Hiss
                    </label>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField control={form.control} name="lotArea" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Tomtarea (kvm)</FormLabel>
                    <FormControl><Input type="number" placeholder="500" {...field} className="h-10" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="balconyArea" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Balkong (kvm)</FormLabel>
                    <FormControl><Input type="number" placeholder="8" {...field} className="h-10" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="specialFeatures" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Särskilda egenskaper</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="T.ex: Golvvärme i badrum, öppen spis, originaldetaljer, takbjälkar"
                      {...field}
                      className="min-h-[68px] resize-none text-sm"
                    />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="otherInfo" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Övrig information</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Allt annat som AI:n bör veta om objektet"
                      {...field}
                      className="min-h-[60px] resize-none text-sm"
                    />
                  </FormControl>
                </FormItem>
              )} />
            </div>
          )}
        </div>

        {/* ── PLATTFORM, PRO-OPTIONS & SUBMIT ── */}
        <div className="border-t pt-5 space-y-4" style={{ borderColor: "#E8E5DE" }}>

          {/* Platform pills */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 font-medium shrink-0">Plattform:</span>
            <div className="flex gap-2">
              {([
                { value: "hemnet" as const, label: "Hemnet" },
                { value: "booli" as const, label: "Booli" },
                { value: "general" as const, label: "Egen sida" },
              ]).map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => form.setValue("platform", p.value)}
                  className="px-3.5 py-1.5 text-xs rounded-full border transition-all font-medium"
                  style={{
                    background: selectedPlatform === p.value ? "#2D6A4F" : "#fff",
                    color: selectedPlatform === p.value ? "#fff" : "#6B7280",
                    borderColor: selectedPlatform === p.value ? "#2D6A4F" : "#E8E5DE",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pro: word count */}
          {isPro && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-400 font-medium shrink-0">Textlängd:</span>
              <div className="flex items-center gap-2">
                <Select value={String(wordCountMin)} onValueChange={(v) => setWordCountMin(Number(v))}>
                  <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[200, 250, 300, 350, 400, 450, 500].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} ord</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-300">—</span>
                <Select value={String(wordCountMax)} onValueChange={(v) => setWordCountMax(Number(v))}>
                  <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[300, 350, 400, 450, 500, 550, 600].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} ord</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Images — Pro feature, visible to all */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Bilder (valfritt)</span>
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "#D4AF37", color: "#fff" }}>Pro</span>
              </div>
              {isPro && uploadedImages.length > 0 && (
                <span className="text-xs text-gray-400">{uploadedImages.length} bild(er)</span>
              )}
            </div>
            {isPro ? (
              <>
                <div
                  className="border border-dashed rounded-lg p-3 text-center transition-colors hover:border-gray-400"
                  style={{ borderColor: "#D1D5CB" }}
                >
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="image-upload"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setUploadedImages((prev) => [...prev, reader.result as string]);
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Plus className="w-3.5 h-3.5" />
                    Ladda upp bilder
                  </label>
                </div>
                {uploadedImages.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Bild ${idx + 1}`}
                          className="w-14 h-14 object-cover rounded-lg border"
                          style={{ borderColor: "#E8E5DE" }}
                        />
                        <button
                          type="button"
                          onClick={() => setUploadedImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div
                className="border border-dashed rounded-lg p-3.5 text-center"
                style={{ borderColor: "#E8E5DE", background: "#FAFAF7" }}
              >
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                  Uppgradera till Pro för att ladda upp bilder
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 text-sm font-semibold transition-colors"
            disabled={isPending || disabled}
            style={{ background: "#2D6A4F", color: "#fff" }}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Genererar beskrivning...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generera objektbeskrivning
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
