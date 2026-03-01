import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronUp, Sparkles, Plus, X, Lock, MapPin, Minus } from "lucide-react";
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

// Field names must match buildDispositionFromStructuredData() in server/routes.ts
interface PropertyFormData {
  propertyType: "apartment" | "house" | "townhouse" | "villa";
  address: string;
  area: string;
  price: string;
  monthlyFee: string;
  livingArea: string;
  totalRooms: string;
  bedrooms: string;
  bathrooms: string;
  buildYear: string;
  condition: string;
  energyClass: string;
  floor: string;
  elevator: boolean;
  balconyArea: string;
  balconyDirection: string;
  brfName: string;
  storage: string;
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
  gardenDescription: string;
  specialFeatures: string;
  otherInfo: string;
  platform: "hemnet" | "booli" | "general";
  writingStyle: "factual" | "balanced" | "selling";
}

// ── CHIP OPTIONS ──
const KITCHEN_CHIPS = [
  "Nytt kök", "Stenbänk", "Köksö", "Diskmaskin", "Induktionshäll",
  "Integrerade vitvaror", "Öppet till vardagsrum", "Matplats för 4+",
  "Kakelvägg", "Vinkyl",
];
const BATHROOM_CHIPS = [
  "Helkaklat", "Golvvärme", "Dusch", "Badkar", "Dubbla handfat",
  "Tvättmaskin", "Torktumlare", "Handdukstork", "Renoverat",
];
const FLOORING_CHIPS = [
  "Ekparkett", "Laminat", "Klinker", "Originalparkett",
  "Marmor", "Stengolv", "Vinyl",
];
const HEATING_CHIPS = [
  "Fjärrvärme", "Bergvärme", "Luft-vattenvärmepump", "Luft-luftvärmepump",
  "Golvvärme", "Elpanna", "Vedpanna", "Direktverkande el",
];
const SPECIAL_CHIPS = [
  "Öppen spis", "Braskamin", "Stuckatur", "Takbjälkar",
  "Takhöjd 2.7m+", "Inglasad balkong", "Nya fönster",
  "Nytt tak", "Stambyte genomfört", "Fiber",
  "Laddplats elbil", "Smart hem",
];
const GARDEN_CHIPS = [
  "Gräsmatta", "Uteplats i söder", "Altan/trädäck", "Fruktträd",
  "Häck", "Växthus", "Pool", "Förråd/bod",
];
const USP_CHIPS = [
  "Söderläge", "Tyst läge", "Sjöutsikt", "Havsutsikt", "Parkutsikt",
  "Öppen planlösning", "Nytt kök", "Nytt badrum", "Hög takhöjd",
  "Originaldetaljer", "Nära centrum", "Nära kollektivtrafik",
  "Gavellägenhet", "Stort förråd", "Ingen insyn",
];
const PROPERTY_CONDITIONS = [
  "Nyskick", "Mycket gott skick", "Gott skick", "Bra skick", "Behöver renoveras",
];
const ENERGY_CLASSES = ["A", "B", "C", "D", "E", "F", "G"];
const BALCONY_DIRECTIONS = [
  "Norr", "Nordost", "Öst", "Sydost", "Söder", "Sydväst", "Väst", "Nordväst",
];

// ── HELPER: Chip Selector ──
function ChipSelector({ chips, selected, onToggle }: {
  chips: string[];
  selected: string[];
  onToggle: (chip: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const isOn = selected.includes(chip);
        return (
          <button
            key={chip}
            type="button"
            onClick={() => onToggle(chip)}
            className="px-2.5 py-1 text-[11px] rounded-full border transition-all font-medium select-none"
            style={{
              background: isOn ? "#2D6A4F" : "#FAFAF7",
              color: isOn ? "#fff" : "#6B7280",
              borderColor: isOn ? "#2D6A4F" : "#E8E5DE",
            }}
          >
            {chip}
          </button>
        );
      })}
    </div>
  );
}

// ── HELPER: Number Stepper ──
function NumberStepper({ value, onChange, min = 0, max = 20, label }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-gray-400 font-medium">{label}</span>
      <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: "#E8E5DE" }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-8 h-8 flex items-center justify-center text-sm font-semibold" style={{ color: "#1B4332" }}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface PromptFormProps {
  onSubmit: (data: {
    prompt: string;
    type: string;
    platform: string;
    writingStyle?: string;
    propertyData?: any;
    wordCountMin?: number;
    wordCountMax?: number;
    imageUrls?: string[];
  }) => void;
  isPending: boolean;
  disabled?: boolean;
  isPro?: boolean;
}

export function PromptFormProfessional({ onSubmit, isPending, disabled, isPro = false }: PromptFormProps) {
  const { toast } = useToast();

  // Chip selections (merged into form values on submit)
  const [kitchenChips, setKitchenChips] = useState<string[]>([]);
  const [bathroomChips, setBathroomChips] = useState<string[]>([]);
  const [flooringChips, setFlooringChips] = useState<string[]>([]);
  const [heatingChips, setHeatingChips] = useState<string[]>([]);
  const [specialChips, setSpecialChips] = useState<string[]>([]);
  const [gardenChips, setGardenChips] = useState<string[]>([]);
  const [uspChips, setUspChips] = useState<string[]>([]);

  // UI state
  const [showDetails, setShowDetails] = useState(false);
  const [wordCountMin, setWordCountMin] = useState(350);
  const [wordCountMax, setWordCountMax] = useState(450);
  const [selectedModel, setSelectedModel] = useState<"gpt-5.2" | "claude-sonnet-4.6">("gpt-5.2");
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [addressLookupResult, setAddressLookupResult] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [rooms, setRooms] = useState(3);
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [hasBalcony, setHasBalcony] = useState(false);

  const handleWordCountMin = (val: number) => {
    setWordCountMin(val);
    if (val > wordCountMax) setWordCountMax(val);
  };
  const handleWordCountMax = (val: number) => {
    setWordCountMax(val);
    if (val < wordCountMin) setWordCountMin(val);
  };

  const toggleChip = useCallback((list: string[], setList: (v: string[]) => void, chip: string) => {
    setList(list.includes(chip) ? list.filter(c => c !== chip) : [...list, chip]);
  }, []);

  const form = useForm<PropertyFormData>({
    defaultValues: {
      propertyType: "apartment",
      address: "",
      area: "",
      price: "",
      monthlyFee: "",
      livingArea: "",
      totalRooms: "3",
      bedrooms: "2",
      bathrooms: "1",
      buildYear: "",
      condition: "Gott skick",
      energyClass: "",
      floor: "",
      elevator: false,
      balconyArea: "",
      balconyDirection: "",
      brfName: "",
      storage: "",
      layoutDescription: "",
      kitchenDescription: "",
      bathroomDescription: "",
      uniqueSellingPoints: "",
      view: "",
      neighborhood: "",
      transport: "",
      parking: "",
      flooring: "",
      heating: "",
      lotArea: "",
      gardenDescription: "",
      specialFeatures: "",
      otherInfo: "",
      platform: "hemnet",
      writingStyle: "balanced",
    },
  });

  const selectedPlatform = form.watch("platform");
  const selectedType = form.watch("propertyType");
  const selectedStyle = form.watch("writingStyle");
  const isApartmentType = selectedType === "apartment" || selectedType === "townhouse";
  const isHouseType = selectedType === "house" || selectedType === "villa";

  // Merge chips + freetext into pipeline-compatible field values, then submit
  const onLocalSubmit = (values: PropertyFormData) => {
    const mergeChipsAndText = (chips: string[], text: string) => {
      const parts = [chips.join(", "), text].filter(Boolean);
      return parts.join(". ");
    };

    const merged = {
      ...values,
      totalRooms: String(rooms),
      bedrooms: String(bedrooms),
      bathrooms: String(bathrooms),
      kitchenDescription: mergeChipsAndText(kitchenChips, values.kitchenDescription),
      bathroomDescription: mergeChipsAndText(bathroomChips, values.bathroomDescription),
      flooring: mergeChipsAndText(flooringChips, values.flooring),
      heating: heatingChips.length > 0 ? heatingChips.join(", ") : values.heating,
      specialFeatures: mergeChipsAndText(specialChips, values.specialFeatures),
      gardenDescription: mergeChipsAndText(gardenChips, values.gardenDescription),
      uniqueSellingPoints: mergeChipsAndText(uspChips, values.uniqueSellingPoints),
      balconyArea: hasBalcony ? values.balconyArea : "",
      balconyDirection: hasBalcony ? values.balconyDirection : "",
    };

    const typeLabels: Record<string, string> = {
      apartment: "Lägenhet", house: "Hus", townhouse: "Radhus", villa: "Villa",
    };

    let d = "OBJEKTDISPOSITION\n\n";

    d += "=== GRUNDINFORMATION ===\n";
    d += `Typ: ${typeLabels[merged.propertyType] || merged.propertyType}\n`;
    if (merged.address) d += `Adress: ${merged.address}\n`;
    if (merged.area) d += `Stadsdel/Område: ${merged.area}\n`;
    if (merged.price) d += `Pris: ${merged.price} kr\n`;
    if (merged.monthlyFee) {
      const feeLabel = isApartmentType ? "Avgift" : "Driftskostnad";
      d += `${feeLabel}: ${merged.monthlyFee} kr/mån\n`;
    }

    d += "\n=== YTOR ===\n";
    if (merged.livingArea) d += `Boarea: ${merged.livingArea} kvm\n`;
    if (merged.lotArea) d += `Tomtarea: ${merged.lotArea} kvm\n`;
    if (hasBalcony && merged.balconyArea) d += `Balkong: ${merged.balconyArea} kvm\n`;
    if (hasBalcony && merged.balconyDirection) d += `Balkong väderstreck: ${merged.balconyDirection}\n`;
    d += `Antal rum: ${rooms}\n`;
    d += `Sovrum: ${bedrooms}\n`;
    d += `Badrum/WC: ${bathrooms}\n`;

    d += "\n=== BYGGNAD ===\n";
    if (merged.buildYear) d += `Byggår: ${merged.buildYear}\n`;
    if (merged.condition) d += `Skick: ${merged.condition}\n`;
    if (merged.energyClass) d += `Energiklass: ${merged.energyClass}\n`;
    if (isApartmentType) {
      if (merged.floor) d += `Våning: ${merged.floor}\n`;
      d += `Hiss: ${merged.elevator ? "Ja" : "Nej"}\n`;
    }
    if (merged.brfName) d += `Förening: ${merged.brfName}\n`;
    if (merged.storage) d += `Förråd/Förvaring: ${merged.storage}\n`;

    if (merged.layoutDescription) {
      d += "\n=== PLANLÖSNING & RUM ===\n";
      d += `${merged.layoutDescription}\n`;
    }
    if (merged.kitchenDescription) {
      d += "\n=== KÖK ===\n";
      d += `${merged.kitchenDescription}\n`;
    }
    if (merged.bathroomDescription) {
      d += "\n=== BADRUM ===\n";
      d += `${merged.bathroomDescription}\n`;
    }
    if (merged.flooring || merged.heating) {
      d += "\n=== MATERIAL & TEKNIK ===\n";
      if (merged.flooring) d += `Golvmaterial: ${merged.flooring}\n`;
      if (merged.heating) d += `Uppvärmning: ${merged.heating}\n`;
    }
    if (merged.view || merged.neighborhood || merged.transport || merged.parking) {
      d += "\n=== LÄGE & OMGIVNING ===\n";
      if (merged.view) d += `Utsikt: ${merged.view}\n`;
      if (merged.neighborhood) d += `Områdesbeskrivning: ${merged.neighborhood}\n`;
      if (merged.transport) d += `Kommunikationer: ${merged.transport}\n`;
      if (merged.parking) d += `Parkering: ${merged.parking}\n`;
    }
    if (merged.uniqueSellingPoints) {
      d += "\n=== FÖRSÄLJNINGSARGUMENT ===\n";
      d += "(Unika kvaliteter som gör bostaden attraktiv — lyft dessa i texten)\n";
      d += `${merged.uniqueSellingPoints}\n`;
    }
    if (merged.gardenDescription) {
      d += "\n=== TRÄDGÅRD & UTEPLATS ===\n";
      d += `${merged.gardenDescription}\n`;
    }
    if (merged.specialFeatures) {
      d += "\n=== SÄRSKILDA EGENSKAPER ===\n";
      d += `${merged.specialFeatures}\n`;
    }
    if (merged.otherInfo) {
      d += "\n=== ÖVRIGT ===\n";
      d += `${merged.otherInfo}\n`;
    }

    onSubmit({
      prompt: d,
      type: merged.propertyType,
      platform: merged.platform,
      writingStyle: merged.writingStyle,
      propertyData: merged,
      ...(isPro && { wordCountMin, wordCountMax }),
      ...(isPro && { model: selectedModel }),
      ...(uploadedImages.length > 0 && { imageUrls: uploadedImages }),
    });
  };

  // Address lookup with toast-based upgrade flow
  const handleAddressLookup = async (address: string) => {
    if (!address) return;
    const userStatus = await fetch('/api/user/status', { credentials: 'include' }).then(r => r.json()).catch(() => null);
    if (userStatus?.plan === 'free') {
      toast({ title: "Pro-funktion", description: "Uppgradera till Pro för att automatiskt fylla i kommunikationer och närområde.", variant: "destructive" });
      return;
    }
    setAddressLookupLoading(true);
    setAddressLookupResult(null);
    try {
      const res = await fetch("/api/address-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ address }),
      });
      if (!res.ok) {
        const error = await res.json();
        if (error.upgradeRequired) {
          toast({ title: error.message || "Uppgradering krävs", description: "Uppgradera till Pro för adress-sökning.", variant: "destructive" });
          return;
        }
        throw new Error(error.message || 'Kunde inte slå upp adressen');
      }
      const data = await res.json();
      if (data.transport) form.setValue("transport", data.transport);
      if (data.neighborhood) form.setValue("neighborhood", data.neighborhood);
      setAddressLookupResult(`${data.places?.length || 0} platser hittade`);
      if (!showDetails) setShowDetails(true);
    } catch (err) {
      console.error("Address lookup failed:", err);
      setAddressLookupResult("Kunde inte slå upp adressen");
    } finally {
      setAddressLookupLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onLocalSubmit)} className="space-y-0">

        {/* ── SECTION 1: OBJEKTTYP ── */}
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

        {/* ── SECTION 2: GRUNDFAKTA ── */}
        <div className="border-t pt-5 pb-5" style={{ borderColor: "#E8E5DE" }}>
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-3" style={{ color: "#9CA3AF" }}>
            Grundfakta
          </label>

          {/* Address + Area */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField control={form.control} name="address" rules={{ required: "Ange adress" }} render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-xs text-gray-500">Adress *</FormLabel>
                <div className="flex gap-2">
                  <FormControl><Input placeholder="Storgatan 1, Stockholm" {...field} className="h-10 flex-1" /></FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={addressLookupLoading || !field.value}
                    className="h-10 text-[11px] px-3 whitespace-nowrap"
                    style={{ borderColor: "#D1D5DB", color: addressLookupLoading ? "#9CA3AF" : "#2D6A4F" }}
                    onClick={() => handleAddressLookup(field.value)}
                  >
                    {addressLookupLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <><MapPin className="w-3.5 h-3.5 mr-1" />Sök läge</>
                    )}
                  </Button>
                </div>
                {addressLookupResult && (
                  <p className="text-[10px] mt-1" style={{ color: "#2D6A4F" }}>
                    ✓ {addressLookupResult} — kollektivtrafik & närområde ifyllt
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="area" rules={{ required: "Ange område" }} render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Stadsdel *</FormLabel>
                <FormControl><Input placeholder="Vasastan" {...field} className="h-10" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Size + Price + Fee */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <FormField control={form.control} name="livingArea" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Boarea (kvm)</FormLabel>
                <FormControl><Input type="number" placeholder="85" {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Pris (kr)</FormLabel>
                <FormControl><Input type="number" placeholder="4 500 000" {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="monthlyFee" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">
                  {isApartmentType ? "Avgift (kr/mån)" : "Driftskostnad"}
                </FormLabel>
                <FormControl><Input type="number" placeholder={isApartmentType ? "3 500" : "2 000"} {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
          </div>

          {/* Rooms — number steppers + Condition */}
          <div className="flex items-end gap-6 mt-4">
            <NumberStepper label="Rum" value={rooms} onChange={setRooms} min={1} max={15} />
            <NumberStepper label="Sovrum" value={bedrooms} onChange={setBedrooms} min={0} max={10} />
            <NumberStepper label="Badrum" value={bathrooms} onChange={setBathrooms} min={1} max={6} />
            <div className="flex-1">
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

          {/* Apartment-specific: Floor, BRF, BuildYear, Elevator */}
          {isApartmentType && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <FormField control={form.control} name="floor" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Våning</FormLabel>
                  <FormControl><Input placeholder="3 av 5" {...field} className="h-10" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="brfName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">BRF-namn</FormLabel>
                  <FormControl><Input placeholder="BRF Solhemmet" {...field} className="h-10" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="buildYear" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Byggår</FormLabel>
                  <FormControl><Input type="number" placeholder="1998" {...field} className="h-10" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="elevator" render={({ field }) => (
                <FormItem className="flex flex-row items-end gap-2 space-y-0 pb-1">
                  <FormControl>
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className="px-3.5 py-2 text-xs rounded-lg border transition-all font-medium"
                      style={{
                        background: field.value ? "#2D6A4F" : "#fff",
                        color: field.value ? "#fff" : "#6B7280",
                        borderColor: field.value ? "#2D6A4F" : "#E8E5DE",
                      }}
                    >
                      {field.value ? "✓ Hiss" : "Hiss"}
                    </button>
                  </FormControl>
                </FormItem>
              )} />
            </div>
          )}

          {/* House/Villa-specific: BuildYear, LotArea, Parking */}
          {isHouseType && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              <FormField control={form.control} name="buildYear" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Byggår</FormLabel>
                  <FormControl><Input type="number" placeholder="1998" {...field} className="h-10" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="lotArea" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Tomtarea (kvm)</FormLabel>
                  <FormControl><Input type="number" placeholder="800" {...field} className="h-10" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="parking" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Parkering</FormLabel>
                  <FormControl><Input placeholder="Garage, carport" {...field} className="h-10" /></FormControl>
                </FormItem>
              )} />
            </div>
          )}

          {/* Balcony toggle + details */}
          <div className="mt-3 flex items-start gap-4">
            <button
              type="button"
              onClick={() => setHasBalcony(!hasBalcony)}
              className="px-3.5 py-2 text-xs rounded-lg border transition-all font-medium shrink-0 mt-5"
              style={{
                background: hasBalcony ? "#2D6A4F" : "#fff",
                color: hasBalcony ? "#fff" : "#6B7280",
                borderColor: hasBalcony ? "#2D6A4F" : "#E8E5DE",
              }}
            >
              {hasBalcony ? "✓ Balkong/Uteplats" : "Balkong/Uteplats"}
            </button>
            {hasBalcony && (
              <div className="flex gap-3 flex-1">
                <FormField control={form.control} name="balconyArea" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs text-gray-500">Storlek (kvm)</FormLabel>
                    <FormControl><Input type="number" placeholder="8" {...field} className="h-10" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="balconyDirection" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs text-gray-500">Väderstreck</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Välj..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {BALCONY_DIRECTIONS.map((dir) => <SelectItem key={dir} value={dir}>{dir}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 3: KÖK & BADRUM (chip-based) ── */}
        <div className="border-t pt-5 pb-5" style={{ borderColor: "#E8E5DE" }}>
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-3" style={{ color: "#9CA3AF" }}>
            Kök & Badrum
          </label>
          <div className="space-y-4">
            {/* Kitchen chips */}
            <div>
              <span className="text-xs text-gray-500 font-medium block mb-2">Kök — välj det som stämmer</span>
              <ChipSelector chips={KITCHEN_CHIPS} selected={kitchenChips} onToggle={(c) => toggleChip(kitchenChips, setKitchenChips, c)} />
              <FormField control={form.control} name="kitchenDescription" render={({ field }) => (
                <FormItem className="mt-2">
                  <FormControl>
                    <Input placeholder="Övrigt: märke, renoveringsår, speciella detaljer..." {...field} className="h-9 text-xs" />
                  </FormControl>
                </FormItem>
              )} />
            </div>
            {/* Bathroom chips */}
            <div>
              <span className="text-xs text-gray-500 font-medium block mb-2">Badrum — välj det som stämmer</span>
              <ChipSelector chips={BATHROOM_CHIPS} selected={bathroomChips} onToggle={(c) => toggleChip(bathroomChips, setBathroomChips, c)} />
              <FormField control={form.control} name="bathroomDescription" render={({ field }) => (
                <FormItem className="mt-2">
                  <FormControl>
                    <Input placeholder="Övrigt: renoveringsår, speciella detaljer..." {...field} className="h-9 text-xs" />
                  </FormControl>
                </FormItem>
              )} />
            </div>
          </div>
        </div>

        {/* ── SECTION 4: SÄLJPUNKTER (prominent!) ── */}
        <div className="border-t pt-5 pb-5" style={{ borderColor: "#E8E5DE" }}>
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "#2D6A4F" }}>
            ★ Vad gör objektet speciellt?
          </label>
          <p className="text-[10px] text-gray-400 mb-3">
            Välj och/eller beskriv med egna ord. Ju mer specifik desto bättre text.
          </p>
          <ChipSelector chips={USP_CHIPS} selected={uspChips} onToggle={(c) => toggleChip(uspChips, setUspChips, c)} />
          <FormField control={form.control} name="uniqueSellingPoints" render={({ field }) => (
            <FormItem className="mt-2">
              <FormControl>
                <Textarea
                  placeholder="T.ex: Balkong 7 kvm i söderläge med kvällssol. Originalparkett från 1920. Tyst innergård."
                  {...field}
                  className="min-h-[56px] resize-none text-sm"
                />
              </FormControl>
            </FormItem>
          )} />
        </div>

        {/* ── SECTION 5: PLANLÖSNING (optional freetext) ── */}
        <div className="border-t pt-5 pb-5" style={{ borderColor: "#E8E5DE" }}>
          <FormField control={form.control} name="layoutDescription" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-gray-500">Planlösning & rum (valfritt)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="T.ex: Hall med garderob. Öppen planlösning kök/vardagsrum. 2 sovrum, det större ca 12 kvm. Gäst-wc vid hall."
                  {...field}
                  className="min-h-[56px] resize-none text-sm"
                />
              </FormControl>
            </FormItem>
          )} />
        </div>

        {/* ── SECTION 6: MER DETALJER (expandable) ── */}
        <div className="border-t" style={{ borderColor: "#E8E5DE" }}>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between py-4 text-sm font-medium transition-colors hover:text-gray-700"
            style={{ color: "#9CA3AF" }}
          >
            <span>Material, läge & fler detaljer</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDetails && (
            <div className="pb-5 space-y-4">
              {/* Flooring chips */}
              <div>
                <span className="text-xs text-gray-500 font-medium block mb-2">Golv</span>
                <ChipSelector chips={FLOORING_CHIPS} selected={flooringChips} onToggle={(c) => toggleChip(flooringChips, setFlooringChips, c)} />
                <FormField control={form.control} name="flooring" render={({ field }) => (
                  <FormItem className="mt-2">
                    <FormControl><Input placeholder="Detaljer: t.ex. ekparkett vardagsrum, klinker badrum" {...field} className="h-9 text-xs" /></FormControl>
                  </FormItem>
                )} />
              </div>

              {/* Heating chips */}
              <div>
                <span className="text-xs text-gray-500 font-medium block mb-2">Uppvärmning</span>
                <ChipSelector chips={HEATING_CHIPS} selected={heatingChips} onToggle={(c) => toggleChip(heatingChips, setHeatingChips, c)} />
              </div>

              {/* Special features chips */}
              <div>
                <span className="text-xs text-gray-500 font-medium block mb-2">Särskilda egenskaper</span>
                <ChipSelector chips={SPECIAL_CHIPS} selected={specialChips} onToggle={(c) => toggleChip(specialChips, setSpecialChips, c)} />
                <FormField control={form.control} name="specialFeatures" render={({ field }) => (
                  <FormItem className="mt-2">
                    <FormControl><Input placeholder="Övrigt: t.ex. fönster bytta 2018, originalstuckatur" {...field} className="h-9 text-xs" /></FormControl>
                  </FormItem>
                )} />
              </div>

              {/* House/Villa: Garden chips */}
              {isHouseType && (
                <div>
                  <span className="text-xs text-gray-500 font-medium block mb-2">Trädgård & uteplats</span>
                  <ChipSelector chips={GARDEN_CHIPS} selected={gardenChips} onToggle={(c) => toggleChip(gardenChips, setGardenChips, c)} />
                  <FormField control={form.control} name="gardenDescription" render={({ field }) => (
                    <FormItem className="mt-2">
                      <FormControl><Input placeholder="Övrigt om trädgården..." {...field} className="h-9 text-xs" /></FormControl>
                    </FormItem>
                  )} />
                </div>
              )}

              {/* View + Transport */}
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

              {/* Neighborhood */}
              <FormField control={form.control} name="neighborhood" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Områdesbeskrivning</FormLabel>
                  <FormControl><Input placeholder="T.ex: ICA 300 m, grundskola 500 m, nära park" {...field} className="h-10" /></FormControl>
                </FormItem>
              )} />

              {/* Energy, Storage, Parking (apartment) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <FormField control={form.control} name="energyClass" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Energiklass</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Välj..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ENERGY_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="storage" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Förråd</FormLabel>
                    <FormControl><Input placeholder="8 kvm i källare" {...field} className="h-10" /></FormControl>
                  </FormItem>
                )} />
                {isApartmentType && (
                  <FormField control={form.control} name="parking" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Parkering</FormLabel>
                      <FormControl><Input placeholder="Garage, P-plats" {...field} className="h-10" /></FormControl>
                    </FormItem>
                  )} />
                )}
              </div>

              {/* Other info */}
              <FormField control={form.control} name="otherInfo" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Övrig information</FormLabel>
                  <FormControl><Input placeholder="T.ex: Nytt tak 2022. Stambyte 2015." {...field} className="h-10" /></FormControl>
                </FormItem>
              )} />
            </div>
          )}
        </div>

        {/* ── SECTION 7: PLATTFORM, STIL & SUBMIT ── */}
        <div className="border-t pt-5 space-y-4" style={{ borderColor: "#E8E5DE" }}>

          {/* Platform + Writing style — compact */}
          <div className="flex flex-wrap gap-6">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "#9CA3AF" }}>Plattform</span>
              <div className="flex gap-1.5">
                {([
                  { value: "hemnet" as const, label: "Hemnet" },
                  { value: "booli" as const, label: "Booli" },
                  { value: "general" as const, label: "Egen sida" },
                ]).map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => form.setValue("platform", p.value)}
                    className="px-3 py-1.5 text-xs rounded-full border transition-all font-medium"
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
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "#9CA3AF" }}>Textstil</span>
              <div className="flex gap-1.5">
                {([
                  { value: "factual" as const, label: "PM-stil" },
                  { value: "balanced" as const, label: "Balanserad" },
                  { value: "selling" as const, label: "Säljande" },
                ]).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => form.setValue("writingStyle", s.value)}
                    className="px-3 py-1.5 text-xs rounded-full border transition-all font-medium"
                    style={{
                      background: selectedStyle === s.value ? "#1B4332" : "#fff",
                      color: selectedStyle === s.value ? "#fff" : "#6B7280",
                      borderColor: selectedStyle === s.value ? "#1B4332" : "#E8E5DE",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: "#9CA3AF" }}>
                {selectedStyle === "factual" && "Ren fakta, kronologisk, noll säljspråk."}
                {selectedStyle === "balanced" && "Fakta i fokus men med rytm. Lyfter säljpunkter utan klyschor."}
                {selectedStyle === "selling" && "Klyschfritt men övertygande. Starkare betoning och avslut."}
              </p>
            </div>
          </div>

          {/* Pro: word count */}
          {isPro && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium">Textlängd:</span>
              <div className="flex items-center gap-2">
                <Select value={String(wordCountMin)} onValueChange={(v) => handleWordCountMin(Number(v))}>
                  <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[200, 250, 300, 350, 400, 450, 500].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} ord</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-300">—</span>
                <Select value={String(wordCountMax)} onValueChange={(v) => handleWordCountMax(Number(v))}>
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

          {/* Pro: AI model selection */}
          {isPro && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium">AI-modell:</span>
              <Select value={selectedModel} onValueChange={(v: "gpt-5.2" | "claude-sonnet-4.6") => setSelectedModel(v)}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5.2">
                    <div className="flex flex-col">
                      <span>GPT-5.2</span>
                      <span className="text-xs text-gray-400">Bäst värde</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="claude-sonnet-4.6">
                    <div className="flex flex-col">
                      <span>Claude Sonnet 4.6</span>
                      <span className="text-xs text-gray-400">Bästa svenska</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Images — Pro feature */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400 font-medium">Bilder (valfritt)</span>
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "#D4AF37", color: "#fff" }}>Pro</span>
              {isPro && uploadedImages.length > 0 && (
                <span className="text-xs text-gray-400 ml-auto">{uploadedImages.length} bild(er)</span>
              )}
            </div>
            {isPro ? (
              <>
                <div className="border border-dashed rounded-lg p-3 text-center transition-colors hover:border-gray-400" style={{ borderColor: "#D1D5CB" }}>
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
                        <img src={img} alt={`Bild ${idx + 1}`} className="w-14 h-14 object-cover rounded-lg border" style={{ borderColor: "#E8E5DE" }} />
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
              <div className="border border-dashed rounded-lg p-3 text-center" style={{ borderColor: "#E8E5DE", background: "#FAFAF7" }}>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                  Uppgradera till Pro för bildanalys
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
