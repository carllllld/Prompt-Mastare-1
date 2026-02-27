import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronDown, ChevronUp, Sparkles, Plus, X, Lock, Crown, MapPin } from "lucide-react";
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

const PROPERTY_CONDITIONS = [
  "Nytt", "Nyskick", "Mycket gott skick", "Gott skick", "Bra skick", "Behöver renoveras"
];

const ENERGY_CLASSES = ["A", "B", "C", "D", "E", "F", "G"];

const HEATING_TYPES = [
  "Fjärrvärme", "Värmepump", "Bergvärme", "Elpanna", "Vedpanna", "Golvvärme", "Direktverkande el"
];

const BALCONY_DIRECTIONS = [
  "Norr", "Nordost", "Öst", "Sydost", "Söder", "Sydväst", "Väst", "Nordväst"
];

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
  const [showDetails, setShowDetails] = useState(false);
  const [wordCountMin, setWordCountMin] = useState(350);
  const [wordCountMax, setWordCountMax] = useState(450);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [addressLookupResult, setAddressLookupResult] = useState<string | null>(null);

  const handleWordCountMin = (val: number) => {
    setWordCountMin(val);
    if (val > wordCountMax) setWordCountMax(val);
  };
  const handleWordCountMax = (val: number) => {
    setWordCountMax(val);
    if (val < wordCountMin) setWordCountMin(val);
  };
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
      bathrooms: "",
      buildYear: "",
      condition: "Gott skick",
      energyClass: "C",
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
      heating: "Fjärrvärme",
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

  const onLocalSubmit = (values: PropertyFormData) => {
    const isApartmentType = values.propertyType === "apartment" || values.propertyType === "townhouse";
    const typeLabels: Record<string, string> = {
      apartment: "Lägenhet", house: "Hus", townhouse: "Radhus", villa: "Villa",
    };

    let d = "OBJEKTDISPOSITION\n\n";

    d += "=== GRUNDINFORMATION ===\n";
    d += `Typ: ${typeLabels[values.propertyType] || values.propertyType}\n`;
    if (values.address) d += `Adress: ${values.address}\n`;
    if (values.area) d += `Stadsdel/Område: ${values.area}\n`;
    if (values.price) d += `Pris: ${values.price} kr\n`;
    if (values.monthlyFee) {
      const feeLabel = isApartmentType ? "Avgift" : "Driftskostnad";
      d += `${feeLabel}: ${values.monthlyFee} kr/mån\n`;
    }

    d += "\n=== YTOR ===\n";
    if (values.livingArea) d += `Boarea: ${values.livingArea} kvm\n`;
    if (values.lotArea) d += `Tomtarea: ${values.lotArea} kvm\n`;
    if (values.balconyArea) d += `Balkong: ${values.balconyArea} kvm\n`;
    if (values.balconyDirection) d += `Balkong väderstreck: ${values.balconyDirection}\n`;
    if (values.totalRooms) d += `Antal rum: ${values.totalRooms}\n`;
    if (values.bedrooms) d += `Sovrum: ${values.bedrooms}\n`;
    if (values.bathrooms) d += `Badrum/WC: ${values.bathrooms}\n`;

    d += "\n=== BYGGNAD ===\n";
    if (values.buildYear) d += `Byggår: ${values.buildYear}\n`;
    if (values.condition) d += `Skick: ${values.condition}\n`;
    if (values.energyClass) d += `Energiklass: ${values.energyClass}\n`;
    if (isApartmentType) {
      if (values.floor) d += `Våning: ${values.floor}\n`;
      d += `Hiss: ${values.elevator ? "Ja" : "Nej"}\n`;
    }
    if (values.brfName) d += `Förening: ${values.brfName}\n`;
    if (values.storage) d += `Förråd/Förvaring: ${values.storage}\n`;

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

    if (values.flooring || values.heating) {
      d += "\n=== MATERIAL & TEKNIK ===\n";
      if (values.flooring) d += `Golvmaterial (typ och var i bostaden, t.ex. per rum): ${values.flooring}\n`;
      if (values.heating) d += `Uppvärmning: ${values.heating}\n`;
    }

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

    if (values.gardenDescription) {
      d += "\n=== TRÄDGÅRD & UTEPLATS ===\n";
      d += `${values.gardenDescription}\n`;
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
      writingStyle: values.writingStyle,
      propertyData: values,
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
            <FormField control={form.control} name="address" rules={{ required: "Ange adress" }} render={({ field }) => (
              <FormItem className="col-span-2">
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
                    onClick={async () => {
                      if (!field.value) return;

                      // Check if user is on free plan
                      const userStatus = await fetch('/api/user/status', {
                        credentials: 'include'
                      }).then(res => res.json()).catch(() => null);

                      if (userStatus?.plan === 'free') {
                        // Show upgrade message for free users
                        const upgradeMessage = document.createElement('div');
                        upgradeMessage.className = 'fixed top-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg z-50 max-w-sm';
                        upgradeMessage.innerHTML = `
                          <div class="flex items-start gap-3">
                            <div class="flex-shrink-0">
                              <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                              </svg>
                            </div>
                            <div class="flex-1">
                              <h3 class="text-sm font-medium text-yellow-800">Uppgradera krävs för "Sök läge"</h3>
                              <p class="text-xs text-yellow-700 mt-1">Adress-sökning är endast för Pro- och Premium-användare. Uppgradera för att automatiskt fylla i kollektivtrafik och närområde!</p>
                              <button class="mt-2 text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700" onclick="window.location.href='/app'">Uppgradera till Pro</button>
                            </div>
                            <button class="flex-shrink-0 text-yellow-500 hover:text-yellow-600" onclick="this.parentElement.parentElement.remove()">
                              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                        `;
                        document.body.appendChild(upgradeMessage);

                        // Auto-remove after 8 seconds
                        setTimeout(() => {
                          if (upgradeMessage.parentElement) {
                            upgradeMessage.remove();
                          }
                        }, 8000);

                        return;
                      }

                      setAddressLookupLoading(true);
                      setAddressLookupResult(null);
                      try {
                        const res = await fetch("/api/address-lookup", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ address: field.value }),
                        });

                        if (!res.ok) {
                          const error = await res.json();
                          if (error.upgradeRequired) {
                            // Show upgrade message
                            const upgradeMessage = document.createElement('div');
                            upgradeMessage.className = 'fixed top-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg z-50 max-w-sm';
                            upgradeMessage.innerHTML = `
                              <div class="flex items-start gap-3">
                                <div class="flex-shrink-0">
                                  <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                                  </svg>
                                </div>
                                <div class="flex-1">
                                  <h3 class="text-sm font-medium text-yellow-800">${error.message}</h3>
                                  <div class="mt-2">
                                    <button class="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700" onclick="window.location.href='/app'">Uppgradera till Pro</button>
                                  </div>
                                </div>
                                <button class="flex-shrink-0 text-yellow-500 hover:text-yellow-600" onclick="this.parentElement.parentElement.remove()">
                                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                  </svg>
                                </button>
                              </div>
                            `;
                            document.body.appendChild(upgradeMessage);

                            // Auto-remove after 8 seconds
                            setTimeout(() => {
                              if (upgradeMessage.parentElement) {
                                upgradeMessage.remove();
                              }
                            }, 8000);
                            return;
                          }
                          throw new Error(error.message || 'Failed to lookup address');
                        }

                        const data = await res.json();
                        if (data.transport) form.setValue("transport", data.transport);
                        if (data.neighborhood) form.setValue("neighborhood", data.neighborhood);
                        const count = [data.transport, data.neighborhood].filter(Boolean).length;
                        setAddressLookupResult(count > 0 ? `${data.places?.length || 0} platser hittade` : "Inga platser hittade");
                      } catch (err) {
                        console.error("Address lookup failed:", err);
                        setAddressLookupResult("Kunde inte slå upp adressen");
                      } finally {
                        setAddressLookupLoading(false);
                      }
                    }}
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
                <FormLabel className="text-xs text-gray-500">Stadsdel / Område *</FormLabel>
                <FormControl><Input placeholder="Vasastan" {...field} className="h-10" /></FormControl>
                <FormMessage />
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
                <FormLabel className="text-xs text-gray-500">
                  {(selectedType === "apartment" || selectedType === "townhouse") ? "Avgift (kr/mån)" : "Driftskostnad (kr/mån)"}
                </FormLabel>
                <FormControl><Input type="number" placeholder={(selectedType === "apartment" || selectedType === "townhouse") ? "3 500" : "2 000"} {...field} className="h-10" /></FormControl>
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
            <FormField control={form.control} name="bathrooms" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Badrum/WC</FormLabel>
                <FormControl><Input type="number" placeholder="1" {...field} className="h-10" /></FormControl>
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

          {/* Conditional: Apartment fields (floor, elevator, BRF, buildYear) */}
          {(selectedType === "apartment" || selectedType === "townhouse") && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mt-3">
              <FormField control={form.control} name="buildYear" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Byggår</FormLabel>
                  <FormControl><Input type="number" placeholder="1998" {...field} className="h-10" /></FormControl>
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
                    <Checkbox checked={field.value as boolean} onCheckedChange={field.onChange} id="elevator-main" />
                  </FormControl>
                  <label htmlFor="elevator-main" className="text-sm text-gray-600 cursor-pointer leading-none">Hiss</label>
                </FormItem>
              )} />
              <FormField control={form.control} name="brfName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">BRF-namn</FormLabel>
                  <FormControl><Input placeholder="BRF Solhemmet" {...field} className="h-10" /></FormControl>
                </FormItem>
              )} />
            </div>
          )}

          {/* Conditional: House/Villa fields (lot, garden) */}
          {(selectedType === "house" || selectedType === "villa") && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 mt-3">
              <FormField control={form.control} name="lotArea" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Tomtarea (kvm)</FormLabel>
                  <FormControl><Input type="number" placeholder="800" {...field} className="h-10" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="buildYear" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Byggår</FormLabel>
                  <FormControl><Input type="number" placeholder="1998" {...field} className="h-10" /></FormControl>
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

          {/* Balcony row — always visible */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mt-3">
            <FormField control={form.control} name="balconyArea" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Balkong/uteplats (kvm)</FormLabel>
                <FormControl><Input type="number" placeholder="8" {...field} className="h-10" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="balconyDirection" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Väderstreck</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Välj..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {BALCONY_DIRECTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="storage" render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel className="text-xs text-gray-500">Förråd/Förvaring</FormLabel>
                <FormControl><Input placeholder="T.ex: Förråd 8 kvm i källare + cykelrum" {...field} className="h-10" /></FormControl>
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
                    placeholder="T.ex: Hall med garderob. Öppen planlösning kök/vardagsrum. Takhöjd 2,70 m. Ekparkett. 2 sovrum, det större ca 12 kvm med garderobsvägg. Gäst-wc vid hall."
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
                      placeholder="T.ex: Ballingslöv-kök renoverat 2021. Kvartssten bänkskiva. Siemens ugn/spis. Bosch diskmaskin. Integrerat kylskåp. Matplats för 6 pers."
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
                      placeholder="T.ex: Helkaklat badrum renoverat 2019. Dusch och badkar. Golvvärme. Tvättmaskin/torktumlare. Klinkergolv."
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
                    placeholder="Skriv de 2-3 starkaste säljpunkterna. Var specifik: 'Balkong 7 kvm i söderläge', 'Originalparkett från 1920-tal', 'Sjöutsikt från vardagsrum'. Undvik vaga ord som 'fint' och 'bra läge'."
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
                      placeholder="T.ex: Lugnt bostadsområde med blandad bebyggelse. ICA 300 m, grundskola 500 m, pendeltåg 8 min. Nära Hultabergsparken."
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
                    <FormControl><Input placeholder="T.ex: Ekparkett vardagsrum/sovrum, klinker hall/kök, klinkergolv badrum" {...field} className="h-10" /></FormControl>
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

              {/* Apartment: parking here since not in main section */}
              {(selectedType === "apartment" || selectedType === "townhouse") && (
                <FormField control={form.control} name="parking" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Parkering</FormLabel>
                    <FormControl><Input placeholder="Garage, carport, P-plats i förening" {...field} className="h-10" /></FormControl>
                  </FormItem>
                )} />
              )}

              {/* House/Villa: garden description */}
              {(selectedType === "house" || selectedType === "villa") && (
                <FormField control={form.control} name="gardenDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Trädgård & uteplats</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="T.ex: Lättskött trädgård med gräsmatta, uteplats i söderläge, fruktträd, häck"
                        {...field}
                        className="min-h-[68px] resize-none text-sm"
                      />
                    </FormControl>
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="specialFeatures" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Särskilda egenskaper</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="T.ex: Golvvärme i badrum och hall. Öppen spis i vardagsrum. Originalstuckatur. Fönster bytta 2018."
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
                      placeholder="T.ex: Nytt tak 2022. Stambyte genomfört 2015. Energiklass C. Fullt möblerad om köparen vill."
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

          {/* Writing style */}
          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-xs text-gray-400 font-medium shrink-0 pt-1.5">Textstil:</span>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: "factual" as const, label: "PM-stil", desc: "Ren fakta, maximalt trovärdigt. Kronologisk struktur, noll säljspråk." },
                  { value: "balanced" as const, label: "Balanserad", desc: "Fakta i fokus men med rytm. Lyfter rätt säljpunkter utan klyschor." },
                  { value: "selling" as const, label: "Säljande", desc: "Klyschfritt men övertygande. Köpargruppsanpassad betoning, starkare avslut." },
                ]).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => form.setValue("writingStyle", s.value)}
                    title={s.desc}
                    className="px-3.5 py-1.5 text-xs rounded-full border transition-all font-medium"
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
              {selectedStyle && (
                <p className="text-[10px]" style={{ color: "#9CA3AF" }}>
                  {selectedStyle === "factual" && "Ren fakta, maximalt trovärdigt. Kronologisk struktur, noll säljspråk."}
                  {selectedStyle === "balanced" && "Fakta i fokus men med rytm. Lyfter rätt säljpunkter utan klyschor."}
                  {selectedStyle === "selling" && "Klyschfritt men övertygande. Köpargruppsanpassad betoning, starkare avslut."}
                </p>
              )}
            </div>
          </div>

          {/* Pro: word count */}
          {isPro && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-400 font-medium shrink-0">Textlängd:</span>
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
