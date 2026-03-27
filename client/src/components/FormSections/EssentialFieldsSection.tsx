import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

// PropertyFormData type - must match the form component
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
  konstruktionMaterial: string;
  taktyp: string;
  floors: string;
  biarea: string;
  tilltradesdag: string;
  platform: "hemnet" | "booli" | "general";
  writingStyle: "factual" | "balanced" | "selling";
  visningstid: string;
  maklarnamn: string;
  maklartelefon: string;
}

interface EssentialFieldsSectionProps {
  form: UseFormReturn<PropertyFormData>;
  isApartmentType: boolean;
  isHouseOrTownhouseType: boolean;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  setRooms: (v: number) => void;
  setBedrooms: (v: number) => void;
  setBathrooms: (v: number) => void;
  addressLookupLoading: boolean;
  addressLookupResult: string | null;
  onAddressLookup: (address: string) => void;
  priorityCompleted: number;
  priorityTotal: number;
}

const exampleInputClass = "h-10 bg-white border-input text-sm";
const PROPERTY_CONDITIONS = ["Utmärkt skick", "Mycket gott skick", "Gott skick", "Normalt skick", "Behöver renovering"];
const PROPERTY_FLOORS_OPTIONS = ["1", "1.5", "2", "2.5", "3", "3.5", "4+"];
const BALCONY_DIRECTIONS = ["Norr", "Nordöst", "Öst", "Sydöst", "Söder", "Sydväst", "Väst", "Nordväst"];

export function EssentialFieldsSection({
  form,
  isApartmentType,
  isHouseOrTownhouseType,
  rooms,
  bedrooms,
  bathrooms,
  setRooms,
  setBedrooms,
  setBathrooms,
  addressLookupLoading,
  addressLookupResult,
  onAddressLookup,
  priorityCompleted,
  priorityTotal,
}: EssentialFieldsSectionProps) {
  const addressValue = form.watch("address");
  const buildYearValue = form.watch("buildYear");
  const energyClassValue = form.watch("energyClass");
  const floorValue = form.watch("floor");
  const elevatorValue = form.watch("elevator");
  const lotAreaValue = form.watch("lotArea");
  const floorsValue = form.watch("floors");

  return (
    <div className="pro-section-card border-l-4" style={{ borderLeftColor: "#D1D5DB" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Essentiell Information</span>
            <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600">
              {priorityCompleted}/{priorityTotal} klara
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Dessa fält måste fyllas i för att generera en bra beskrivning</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 p-3 bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700">Framsteg</span>
          <span className="text-xs font-bold text-slate-600">{Math.round((priorityCompleted / priorityTotal) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-300 overflow-hidden">
          <div
            className="h-full bg-slate-600 transition-all duration-300"
            style={{ width: `${(priorityCompleted / priorityTotal) * 100}%` }}
          />
        </div>
      </div>

      {/* Import section */}
      <div className="flex flex-wrap gap-2 mb-4 p-2 border" style={{ borderColor: "#D1D5DB", background: "#FAFBFC" }}>
        <div className="w-full flex items-center gap-1.5 mb-1">
          <span className="text-xs font-semibold text-slate-700">Importera objektdata</span>
          <span className="text-xs text-slate-500">— slipper fylla i formuläret manuellt</span>
        </div>
        {/* Import buttons will be passed as children or via props */}
      </div>

      {/* Address + Area */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <FormField control={form.control} name="address" rules={{ required: "Ange adress" }} render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel className="text-xs text-gray-500">Adress *</FormLabel>
            <div className="flex gap-2">
              <FormControl>
                <Input placeholder="Ex: Karlavägen 12, 114 31 Stockholm" {...field} className={`${exampleInputClass} flex-1`} />
              </FormControl>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={addressLookupLoading || !field.value}
                className="h-10 text-xs px-3 whitespace-nowrap border-input text-primary disabled:text-muted-foreground"
                onClick={() => onAddressLookup(field.value)}
              >
                {addressLookupLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    Sök läge
                  </>
                )}
              </Button>
            </div>
            {addressLookupResult && (
              <p className="text-xs mt-1 text-slate-600">{addressLookupResult} — kollektivtrafik och närområde ifyllt</p>
            )}
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="area" rules={{ required: "Ange område" }} render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-gray-500">Stadsdel / Område *</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Vasastan, Linnéstaden" {...field} className={exampleInputClass} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {/* Size + Price + Fee */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <FormField control={form.control} name="livingArea" rules={{ required: "Ange boarea" }} render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-gray-500">Boarea (kvm) *</FormLabel>
            <FormControl>
              <Input type="number" placeholder="Ex: 84" {...field} className={exampleInputClass} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-gray-500">Pris (kr)</FormLabel>
            <FormControl>
              <Input type="number" placeholder="Ex: 4 495 000" {...field} className={exampleInputClass} />
            </FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="monthlyFee" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-gray-500">Avgift (kr/mån)</FormLabel>
            <FormControl>
              <Input type="number" placeholder="Ex: 3 842" {...field} className={exampleInputClass} />
            </FormControl>
          </FormItem>
        )} />
      </div>

      {/* Rooms + Condition */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <FormItem>
          <FormLabel className="text-xs text-gray-500">Rum *</FormLabel>
          <div className="flex items-center gap-2 h-10">
            <Button type="button" variant="outline" size="sm" onClick={() => setRooms(Math.max(1, rooms - 1))} className="h-10 w-10 p-0">
              −
            </Button>
            <span className="text-sm font-semibold flex-1 text-center">{rooms}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setRooms(Math.min(15, rooms + 1))} className="h-10 w-10 p-0">
              +
            </Button>
          </div>
        </FormItem>
        <FormItem>
          <FormLabel className="text-xs text-gray-500">Sovrum *</FormLabel>
          <div className="flex items-center gap-2 h-10">
            <Button type="button" variant="outline" size="sm" onClick={() => setBedrooms(Math.max(0, bedrooms - 1))} className="h-10 w-10 p-0">
              −
            </Button>
            <span className="text-sm font-semibold flex-1 text-center">{bedrooms}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setBedrooms(Math.min(10, bedrooms + 1))} className="h-10 w-10 p-0">
              +
            </Button>
          </div>
        </FormItem>
        <FormItem>
          <FormLabel className="text-xs text-gray-500">Badrum *</FormLabel>
          <div className="flex items-center gap-2 h-10">
            <Button type="button" variant="outline" size="sm" onClick={() => setBathrooms(Math.max(1, bathrooms - 1))} className="h-10 w-10 p-0">
              −
            </Button>
            <span className="text-sm font-semibold flex-1 text-center">{bathrooms}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setBathrooms(Math.min(6, bathrooms + 1))} className="h-10 w-10 p-0">
              +
            </Button>
          </div>
        </FormItem>
        <FormField control={form.control} name="condition" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-gray-500">Skick *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-white border border-input shadow-lg">
                {PROPERTY_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )} />
      </div>

      {/* Apartment-specific fields */}
      {isApartmentType && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <FormField control={form.control} name="floor" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-gray-500">Våning *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 3 av 5" {...field} className={exampleInputClass} />
              </FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="buildYear" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-gray-500">Byggår *</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ex: 1998" {...field} className={exampleInputClass} />
              </FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="energyClass" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-gray-500">Energiklass *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Välj..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white border border-input shadow-lg">
                  {["A", "B", "C", "D", "E", "F", "G"].map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="elevator" render={({ field }) => (
            <FormItem className="flex flex-row items-end gap-2 space-y-0 pb-1">
              <FormControl>
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`px-3.5 py-2 text-xs border transition-all font-medium w-full ${
                    field.value ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-input"
                  }`}
                >
                  {field.value ? "Hiss: Ja" : "Hiss: Nej"}
                </button>
              </FormControl>
            </FormItem>
          )} />
        </div>
      )}

      {/* House-specific fields */}
      {isHouseOrTownhouseType && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <FormField control={form.control} name="buildYear" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-gray-500">Byggår *</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ex: 1987" {...field} className={exampleInputClass} />
              </FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="floors" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-gray-500">Antal plan *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Välj..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white border border-input shadow-lg">
                  {PROPERTY_FLOORS_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="lotArea" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-gray-500">Tomtarea (kvm) *</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ex: 824" {...field} className={exampleInputClass} />
              </FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="energyClass" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-gray-500">Energiklass *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Välj..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white border border-input shadow-lg">
                  {["A", "B", "C", "D", "E", "F", "G"].map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
      )}

      {/* Tillträdesdag */}
      <FormField control={form.control} name="tilltradesdag" render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs text-gray-500">Tillträdesdag</FormLabel>
          <FormControl>
            <Input placeholder="Ex: Enligt överenskommelse eller snabbt tillträde möjligt" {...field} className={exampleInputClass} />
          </FormControl>
        </FormItem>
      )} />
    </div>
  );
}
