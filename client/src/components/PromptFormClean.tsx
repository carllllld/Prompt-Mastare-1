import { useForm, useFieldArray } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, Home, Loader2, MapPin, Maximize, ArrowUpCircle, Trees, Layout, 
  DollarSign, Sun, Wind, Car, Bath, Sofa, Bed, Utensils, Flame, Wifi, Shield, Package,
  Plus, Minus, ChevronDown, ChevronUp, Info, Check, X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Room {
  id: string;
  type: string;
  size: string;
  description: string;
  features: string[];
}

interface PropertyFormData {
  // Grundinformation
  propertyType: "apartment" | "house" | "townhouse" | "villa";
  address: string;
  area: string;
  price: string;
  monthlyFee?: string;
  
  // Ytor
  livingArea: string;
  lotArea?: string;
  additionalArea?: string;
  balconyArea?: string;
  
  // Rum & planlösning
  totalRooms: string;
  bedrooms: string;
  rooms: Room[];
  
  // Byggnadsinformation
  buildYear: string;
  renovationYear?: string;
  condition: string;
  energyClass: string;
  operatingCost?: string;
  
  // Kök & badrum
  kitchenDescription: string;
  kitchenBrand?: string;
  kitchenYear?: string;
  bathrooms: number;
  bathroomDescription: string;
  
  // Material & ytskikt
  flooring: string;
  walls: string;
  windows: string;
  doors: string;
  
  // Installationer & teknik
  heating: string;
  ventilation: string;
  electrical: string;
  broadband: string;
  tv: string;
  alarm: string;
  
  // Uteområden & parkering
  garden?: string;
  terrace?: string;
  balcony?: string;
  parking: string;
  parkingType: string[];
  storage?: string;
  
  // Läge & omgivning
  floor?: string;
  elevator: boolean;
  view: string;
  neighborhood: string;
  transport: string;
  services: string[];
  
  // Särskilda egenskaper
  specialFeatures: string[];
  uniqueSellingPoints: string[];
  
  // Övrigt
  monthlyCost?: string;
  otherInfo?: string;
  
  // Plattform
  platform: "hemnet" | "booli" | "general";
}

const ROOM_TYPES = [
  "Vardagsrum", "Kök", "Sovrum", "Badrum", "Hall", "Toalett", "Klädkammare", 
  "Gästrum", "Kontor", "Bibliotek", "Matrum", "Tvättstuga", "Förråd", "Gym", "Hobbyrum"
];

const PROPERTY_CONDITIONS = [
  "Nytt", "Nyskick", "Mycket gott skick", "Gott skick", "Bra skick", "Behöver renoveras"
];

const ENERGY_CLASSES = ["A", "B", "C", "D", "E", "F", "G"];

const HEATING_TYPES = [
  "Fjärrvärme", "Värmepump", "Bergvärme", "Elpanna", "Vedpanna", "Golvvärme", "Direktverkande el"
];

const FLOORING_TYPES = [
  "Ekparkett", "Laminat", "Klinker", "Vinyl", "Matta", "Träslager", "Stengolv", "Betong"
];

const PARKING_TYPES = [
  "Garage", "Carport", "P-plats", "Gästparkering", "Gatuparkering", "Ingen parkering"
];

const SERVICES = [
  "Skola", "Förskola", "Matbutik", "Apotek", "Vårdcentral", "Tågstation", "Tunnelbana", "Buss"
];

export function PromptFormClean({ onSubmit, isPending, disabled }: PromptFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  
  const form = useForm<PropertyFormData>({
    defaultValues: {
      propertyType: "apartment",
      address: "",
      area: "",
      price: "",
      livingArea: "",
      totalRooms: "",
      bedrooms: "",
      buildYear: "",
      condition: "Gott skick",
      energyClass: "C",
      bathrooms: 1,
      bathroomDescription: "",
      kitchenDescription: "",
      flooring: "",
      heating: "Fjärrvärme",
      ventilation: "",
      broadband: "Fiber",
      parking: "",
      parkingType: [],
      elevator: false,
      view: "",
      neighborhood: "",
      transport: "",
      services: [],
      specialFeatures: [],
      uniqueSellingPoints: [],
      rooms: [],
      platform: "hemnet"
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rooms"
  });

  const addRoom = () => {
    append({
      id: Date.now().toString(),
      type: "Vardagsrum",
      size: "",
      description: "",
      features: []
    });
  };

  const onLocalSubmit = (values: PropertyFormData) => {
    // Bygg en professionell disposition för AI:n
    let disposition = `OBJEKTDISPOSITION\n\n`;
    disposition += `=== GRUNDINFORMATION ===\n`;
    disposition += `Typ: ${values.propertyType === "apartment" ? "Lägenhet" : values.propertyType === "house" ? "Hus" : values.propertyType === "townhouse" ? "Radhus" : "Villa"}\n`;
    disposition += `Adress: ${values.address}\n`;
    disposition += `Område: ${values.area}\n`;
    disposition += `Pris: ${values.price} kr\n`;
    if (values.monthlyFee) disposition += `Avgift: ${values.monthlyFee} kr/mån\n`;
    if (values.monthlyCost) disposition += `Driftskostnad: ${values.monthlyCost} kr/mån\n\n`;

    disposition += `=== YTOR ===\n`;
    disposition += `Boarea: ${values.livingArea} kvm\n`;
    if (values.lotArea) disposition += `Tomtarea: ${values.lotArea} kvm\n`;
    if (values.additionalArea) disposition += `Biarea: ${values.additionalArea} kvm\n`;
    if (values.balconyArea) disposition += `Balkong: ${values.balconyArea} kvm\n`;
    disposition += `Antal rum: ${values.totalRooms}\n`;
    disposition += `Sovrum: ${values.bedrooms}\n\n`;

    disposition += `=== BYGGNAD ===\n`;
    disposition += `Byggår: ${values.buildYear}\n`;
    if (values.renovationYear) disposition += `Renoveringsår: ${values.renovationYear}\n`;
    disposition += `Skick: ${values.condition}\n`;
    disposition += `Energiklass: ${values.energyClass}\n`;
    if (values.floor) disposition += `Våning: ${values.floor}\n`;
    disposition += `Hiss: ${values.elevator ? "Ja" : "Nej"}\n\n`;

    disposition += `=== RUM & PLANLÖSNING ===\n`;
    values.rooms.forEach(room => {
      disposition += `${room.type}: ${room.size}${room.size ? " kvm" : ""}\n`;
      if (room.description) disposition += `  Beskrivning: ${room.description}\n`;
      if (room.features.length > 0) disposition += `  Detaljer: ${room.features.join(", ")}\n`;
    });
    disposition += "\n";

    disposition += `=== KÖK ===\n`;
    disposition += `${values.kitchenDescription}\n`;
    if (values.kitchenBrand) disposition += `Märke: ${values.kitchenBrand}\n`;
    if (values.kitchenYear) disposition += `Från: ${values.kitchenYear}\n\n`;

    disposition += `=== BADRUM ===\n`;
    disposition += `Antal: ${values.bathrooms}\n`;
    disposition += `${values.bathroomDescription}\n\n`;

    disposition += `=== MATERIAL & YTSKIKT ===\n`;
    disposition += `Golv: ${values.flooring}\n`;
    if (values.walls) disposition += `Väggar: ${values.walls}\n`;
    if (values.windows) disposition += `Fönster: ${values.windows}\n`;
    if (values.doors) disposition += `Dörrar: ${values.doors}\n\n`;

    disposition += `=== INSTALLATIONER ===\n`;
    disposition += `Uppvärmning: ${values.heating}\n`;
    if (values.ventilation) disposition += `Ventilation: ${values.ventilation}\n`;
    if (values.electrical) disposition += `El: ${values.electrical}\n`;
    disposition += `Bredband: ${values.broadband}\n`;
    if (values.tv) disposition += `TV: ${values.tv}\n`;
    if (values.alarm) disposition += `Larm: ${values.alarm}\n\n`;

    disposition += `=== UTEOMRÅDEN ===\n`;
    if (values.garden) disposition += `Trädgård: ${values.garden}\n`;
    if (values.terrace) disposition += `Terrass: ${values.terrace}\n`;
    if (values.balcony) disposition += `Balkong: ${values.balcony}\n`;
    disposition += `Parkering: ${values.parking}\n`;
    if (values.parkingType.length > 0) disposition += `Parkeringstyper: ${values.parkingType.join(", ")}\n`;
    if (values.storage) disposition += `Förråd: ${values.storage}\n\n`;

    disposition += `=== LÄGE & OMGEVNING ===\n`;
    disposition += `Utsikt: ${values.view}\n`;
    disposition += `Område: ${values.neighborhood}\n`;
    disposition += `Kommunikationer: ${values.transport}\n`;
    if (values.services.length > 0) disposition += `Tjänster i närheten: ${values.services.join(", ")}\n\n`;

    disposition += `=== SÄRSKILDA EGENSKAPER ===\n`;
    if (values.specialFeatures.length > 0) disposition += `${values.specialFeatures.join("\n")}\n`;
    disposition += "\n";

    disposition += `=== FÖRSÄLJNINGSARGUMENT ===\n`;
    if (values.uniqueSellingPoints.length > 0) disposition += `${values.uniqueSellingPoints.join("\n")}\n`;
    disposition += "\n";

    if (values.otherInfo) {
      disposition += `=== ÖVRIGT ===\n`;
      disposition += `${values.otherInfo}\n\n`;
    }

    onSubmit({ 
      prompt: disposition, 
      type: values.propertyType, 
      platform: values.platform 
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onLocalSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Grundinfo</TabsTrigger>
            <TabsTrigger value="rooms">Rum</TabsTrigger>
            <TabsTrigger value="details">Detaljer</TabsTrigger>
            <TabsTrigger value="location">Läge</TabsTrigger>
          </TabsList>

          {/* GRUNDINFORMATION */}
          <TabsContent value="basic" className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objekttyp</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj objekttyp" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="apartment">Lägenhet</SelectItem>
                          <SelectItem value="house">Hus</SelectItem>
                          <SelectItem value="townhouse">Radhus</SelectItem>
                          <SelectItem value="villa">Villa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adress</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Storgatan 1, 12345 Stockholm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Område</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Vasastan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pris (kr)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 5500000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthlyFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Månadsavgift (kr)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 3500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="livingArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Boarea (kvm)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 85" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Antal rum</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sovrum</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="buildYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Byggår</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 1998" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skick</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj skick" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROPERTY_CONDITIONS.map(condition => (
                            <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>

          {/* RUM & PLANLÖSNING */}
          <TabsContent value="rooms" className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Rum i objektet</h4>
                <Button type="button" onClick={addRoom} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till rum
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h5 className="font-medium">Rum {index + 1}</h5>
                    <Button 
                      type="button" 
                      onClick={() => remove(index)} 
                      variant="outline" 
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`rooms.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rumstyp</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Välj rumstyp" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ROOM_TYPES.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`rooms.${index}.size`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storlek (kvm)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Ex: 25" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`rooms.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beskrivning</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Beskriv rummets karaktär, läge, ljusinsläpp etc..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="kitchenDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Köksbeskrivning</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Beskriv kökets stil, utrustning, material, skick..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathroomDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Badrumsbeskrivning</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Beskriv badrummet, material, utrustning, skick..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>

          {/* DETALJER */}
          <TabsContent value="details" className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="flooring"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Golv</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj golvmaterial" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FLOORING_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="heating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uppvärmning</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj uppvärmningstyp" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {HEATING_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="specialFeatures"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Särskilda egenskaper</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brandsäkra fönster, golvvärme i badrum, originaldetaljer, etc..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="uniqueSellingPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Försäljningsargument</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Vad gör detta objekt unikt? Läge, vy, material, planlösning..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* LÄGE */}
          <TabsContent value="location" className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="view"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Utsikt</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Sjöutsikt, parkutsikt, innergård" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kommunikationer</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 5 min till t-bana, buss utanför" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Områdesbeskrivning</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Beskriv områdets karaktär, grannar, lugnt/livligt etc..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parkering</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Garage i carport, gästparkering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Plattformval */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium mb-4">Plattform</h3>
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj plattform" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="hemnet">Hemnet</SelectItem>
                    <SelectItem value="booli">Booli</SelectItem>
                    <SelectItem value="general">Egen sida/Övrigt</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit */}
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isPending || disabled}
          size="lg"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Genererar objektbeskrivning...
            </>
          ) : (
            <>
              Generera objektbeskrivning
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}

interface PromptFormProps {
  onSubmit: (data: { prompt: string; type: "apartment" | "house" | "townhouse" | "villa"; platform: "hemnet" | "booli" | "general" }) => void;
  isPending: boolean;
  disabled?: boolean;
}
