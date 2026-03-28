/**
 * PromptFormProfessionalV2 - Integrated with ALL logic from PromptFormProfessional
 * 
 * This version combines:
 * - ALL constants (KITCHEN_CHIPS, BATHROOM_CHIPS, etc.)
 * - ALL helper functions (ChipSelector, NumberStepper, etc.)
 * - ALL state management
 * - ALL form logic (handleExternalImport, submitForm, etc.)
 * - ALL useEffect hooks
 * - ALL validation logic
 * 
 * With the new multi-column grid layout (3 cols desktop, 2 cols tablet, 1 col mobile)
 */

import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronUp, Sparkles, Plus, X, Lock, MapPin, Minus, Info, CheckCircle2 } from "lucide-react";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { validateRequiredFields, getFieldLabel, type PropertyType, type Platform } from "@/lib/form-validation";
import { HemnetImportButton, VitecImportPicker } from "@/components/IntegrationsPanel";
import { EssentialFieldsSection } from "@/components/FormSections/EssentialFieldsSection";
import { ImageSection } from "@/components/FormSections/ImageSection";
import { DetailsSection } from "@/components/FormSections/DetailsSection";
import { CollapsibleChipSelector } from "@/components/FormSections/CollapsibleChipSelector";
import { ProgressIndicator } from "@/components/FormSections/ProgressIndicator";
import { FormGridLayout, FormSection, FormSectionFull, CollapsibleFormSection } from "@/components/FormSections/FormGridLayout";
import { StickyHeader } from "@/components/FormSections/StickyHeader";
import { StickyFooter } from "@/components/FormSections/StickyFooter";
import { CompactWidgetsPanel } from "@/components/CompactWidgets";
import { useCollapsedSections } from "@/hooks/use-collapsed-sections";
import { useCompactMode } from "@/hooks/use-compact-mode";
import { usePrintMode } from "@/hooks/use-print-mode";
import { scrollToField } from "@/lib/scroll-to-section";
import { calculateSectionCompletion, type SectionConfig } from "@/lib/section-completion";

// ── INTERFACES ──
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
  // Phase 2: Critical additions for Swedish brokers
  landOwnership?: "aganderatt" | "tomtratt";  // Äganderätt vs Tomträtt (houses only)
  brfUnits?: string;  // Antal lägenheter i föreningen (apartments only)
  nearbySchools?: string;  // Förskola/Skola nearby
  nearbyServices?: string;  // Affärer & Service nearby
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

interface PriorityItem {
  label: string;
  completed: boolean;
  fieldName: string;
  priority: 'critical' | 'important' | 'optional';
}

// ── SECTION CONFIGURATIONS ──
const SECTION_CONFIGS: SectionConfig[] = [
  {
    id: 'essential-fields',
    title: 'Essentiell Information',
    priority: 'critical',
    defaultCollapsed: false,
    fields: ['address', 'area', 'livingArea', 'totalRooms', 'bedrooms', 'bathrooms'],
    order: 1,
    mobileOrder: 1,
  },
  {
    id: 'images',
    title: 'Objektbilder',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['uploadedImages'],
    order: 2,
    mobileOrder: 3,
  },
  {
    id: 'selling-points',
    title: 'Försäljningsargument',
    priority: 'critical',
    defaultCollapsed: false,
    fields: ['uniqueSellingPoints', 'uspChips'],
    order: 3,
    mobileOrder: 2,
  },
  {
    id: 'kitchen-bathroom',
    title: 'Kök & Badrum',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['kitchenDescription', 'bathroomDescription', 'kitchenChips', 'bathroomChips'],
    order: 4,
    mobileOrder: 4,
  },
  {
    id: 'location-transport',
    title: 'Läge & Transport',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['neighborhood', 'transport', 'view'],
    order: 5,
    mobileOrder: 5,
  },
  {
    id: 'material-tech',
    title: 'Material & Teknik',
    priority: 'optional',
    defaultCollapsed: true,
    fields: ['flooring', 'heating', 'konstruktionMaterial', 'taktyp'],
    order: 6,
    mobileOrder: 7,
  },
  {
    id: 'layout-details',
    title: 'Planlösning & Detaljer',
    priority: 'optional',
    defaultCollapsed: true,
    fields: ['layoutDescription', 'gardenDescription'],
    order: 7,
    mobileOrder: 8,
  },
];

// ── CHIP OPTIONS ──
const KITCHEN_CHIPS = [
  "Renoverat kök", "Köksö", "Stenbänk", "Kompositbänk",
  "Integrerade vitvaror", "Platsbyggt kök", "Matplats i kök",
  "Öppen planlösning", "Moderna vitvaror", "Fönster vid matplats",
  "Diskmaskin", "Induktionshäll",
];
const BATHROOM_CHIPS = [
  "Helkaklat", "Renoverat badrum", "Duschvägg i glas",
  "Badkar", "Tvättmaskin", "Torktumlare", "Golvvärme i badrum",
  "Dubbla handfat",
];
const FLOORING_CHIPS = [
  "Ekparkett", "Originalparkett", "Björkparkett",
  "Massivt trägolv", "Klinker", "Stengolv", "Laminat",
];
const HEATING_CHIPS = [
  "Fjärrvärme", "Bergvärme", "Luft-vattenvärmepump", "Luft-luftvärmepump",
  "Golvvärme", "Frånluftsvärmepump", "Vattenburen värme",
];
const SPECIAL_CHIPS = [
  "Stambyte genomfört", "Nya fönster", "Nytt tak",
  "Dränering utförd", "Solceller", "Fiber indraget",
  "Braskamin", "Säkerhetsdörr", "Varmvattenberedare", "Bastu",
  // Note: "Hiss" removed - already captured in elevator boolean field
];
const GARDEN_CHIPS = [
  "Välskött trädgård", "Uteplats i söder", "Altan", "Trädäck",
  "Fruktträd", "Förråd", "Bod", "Pergola", "Växthus", "Insynsskyddat",
];
const USP_CHIPS = [
  "Söderläge", "Fri utsikt", "Ingen insyn", "Lugn gårdssida",
  "Genomgående planlösning", "Låg avgift", "Stabil BRF",
  "Nära pendling", "Hög standard", "Nyproduktion",
  "Högt i tak", "Ljust", "Centralt läge",
  // Note: Removed duplicates - "Garage", "Laddbox för elbil" (in PARKING_CHIPS),
  // "Flera badrum" (use bathrooms counter), "Balkong i söder" (use balconyDirection field)
];
const PARKING_CHIPS = [
  "Garage", "Dubbelgarage", "Carport", "P-plats",
  "Garageplats", "Boendeparkering", "Laddbox för elbil", "Förberett för laddbox",
];
const ROOF_CHIPS = [
  "Plåttak", "Betongpannor", "Tegeltak", "Papptak", "Platt tak", "Takpannor",
];
const MATERIAL_CHIPS = [
  "Trä", "Tegel", "Puts", "Betong", "Plåt", "Leca",
];

// ── CHIP TOOLTIPS ──
const KITCHEN_TOOLTIPS: Record<string, string> = {
  "Stenbänk": "Bänkskiva i natursten (granit, marmor etc.)",
  "Kompositbänk": "Bänkskiva i kvartskomposit eller liknande",
  "Integrerade vitvaror": "Vitvaror inbyggda i köksinredningen",
  "Platsbyggt kök": "Skräddarsytt kök anpassat efter rummet",
  "Moderna vitvaror": "Nyare vitvaror i gott skick",
  "Matplats i kök": "Plats för matbord med 4–6 sittplatser i köket",
  "Köksö": "Fristående arbetsyta mitt i köket",
  "Diskmaskin": "Inbyggd diskmaskin",
  "Induktionshäll": "Modern induktionsspis (energieffektiv)",
};

const BATHROOM_TOOLTIPS: Record<string, string> = {
  "Helkaklat": "Väggar helt täckta med kakel",
  "Duschvägg i glas": "Glasvägg vid dusch istället för duschdraperi",
  "Golvvärme i badrum": "Vattenburet eller elektriskt uppvärmt golv i badrum",
  "Dubbla handfat": "Två handfat monterade sida vid sida",
};

const HEATING_TOOLTIPS: Record<string, string> = {
  "Fjärrvärme": "Värme från kommunalt fjärrvärmenät",
  "Bergvärme": "Värmepump som hämtar energi från berg",
  "Luft-vattenvärmepump": "Värmepump som värmer vatten via utomhusluft",
  "Luft-luftvärmepump": "Värmepump som värmer inomhusluften direkt",
  "Frånluftsvärmepump": "Värmepump som återvinner värme från ventilationsluft",
  "Vattenburen värme": "Radiatorsystem med varmvatten",
};

const SPECIAL_TOOLTIPS: Record<string, string> = {
  "Stambyte genomfört": "Byte av vatten- och avloppsledningar",
  "Dränering utförd": "System för bortledning av grundvatten",
  "Fiber indraget": "Fiberoptisk bredbandsanslutning",
  "Säkerhetsdörr": "Säkerhetsklassad ytterdörr med extra inbrottsskydd",
  "Varmvattenberedare": "Egen varmvattenberedare (vanligt i villor)",
  "Bastu": "Egen bastu i bostaden eller gemensam i föreningen",
};

const GARDEN_TOOLTIPS: Record<string, string> = {
  "Insynsskyddat": "Skyddat från insyn via häck, staket eller läge",
  "Förråd": "Större förvaringsbyggnad i trädgården",
  "Bod": "Mindre förvaringsbyggnad i trädgården",
  "Pergola": "Öppen spaljékonstruktion för klätterväxter",
  "Växthus": "Inglasad odlingsyta i trädgården",
};

const USP_TOOLTIPS: Record<string, string> = {
  "Genomgående planlösning": "Fönster på flera väderstreck ger genomljusning",
  "Stabil BRF": "Bostadsrättsförening med god ekonomi",
  "Hög standard": "Genomgående hög materialkvalitet och finish",
  "Nyproduktion": "Nybyggd bostad eller färdigställd senaste åren",
  "Högt i tak": "Takhöjd över 2,7 meter",
  "Ljust": "Gott ljusinsläpp från flera väderstreck",
  "Centralt läge": "Nära stadskärna, service och kommunikationer",
};

const PARKING_TOOLTIPS: Record<string, string> = {
  "Garageplats": "Parkeringsplats i garage",
  "Boendeparkering": "Parkeringstillstånd för boende i området",
  "Laddbox för elbil": "Installerad laddstation för elfordon",
  "Förberett för laddbox": "Elinstallation förberedd för framtida laddbox",
};

const MATERIAL_TOOLTIPS: Record<string, string> = {
  "Leca": "Lättbetong (Lättklinkerblock)",
};

const PROPERTY_CONDITIONS = [
  "Nyskick", "Mycket gott skick", "Gott skick", "Bra skick", "Behöver renoveras",
];
const ENERGY_CLASSES = ["A", "B", "C", "D", "E", "F", "G"];
const PROPERTY_FLOORS_OPTIONS = ["1 plan", "1½ plan", "2 plan", "2½ plan", "3 plan", "Suterräng"];
const BALCONY_DIRECTIONS = [
  "Norr", "Nordost", "Öst", "Sydost", "Söder", "Sydväst", "Väst", "Nordväst",
];

const exampleInputClass = "h-10 rounded-lg border-input bg-background placeholder:italic placeholder:text-muted-foreground focus:placeholder-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const exampleCompactInputClass = "h-9 text-xs rounded-lg border-input bg-background placeholder:italic placeholder:text-muted-foreground focus:placeholder-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const exampleTextareaClass = "min-h-[56px] resize-none text-sm rounded-lg border-input bg-background placeholder:italic placeholder:text-muted-foreground focus:placeholder-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// ── HELPER: Chip Selector ──
function ChipSelector({ chips, selected, onToggle, variant = "default", tooltips, id }: {
  chips: string[];
  id?: string;
  selected: string[];
  onToggle: (chip: string) => void;
  variant?: "default" | "kitchen" | "bathroom" | "flooring" | "heating" | "special" | "garden" | "usp" | "parking" | "roof" | "material";
  tooltips?: Record<string, string>;
}) {
  /**
   * Mäklaraktig ChipSelector Styling
   * 
   * Design Philosophy:
   * - Unselected: White background, light gray border, gray text
   * - Selected: Dark green background (#2D5016), white text, checkmark
   * - NO colored variants (warning-bg, info-bg, success-bg, error-bg)
   * - ALL chips use the same styling regardless of variant
   */
  const getChipClasses = (isOn: boolean) => {
    if (!isOn) {
      // Unselected: White background, light gray border, gray text
      return "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";
    }
    
    // Selected: Dark green background, white text (ALL variants use same style)
    return "bg-primary text-primary-foreground border-primary hover:bg-primary-hover";
  };

  const handleKeyDown = (e: React.KeyboardEvent, chip: string) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle(chip);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={id || "Chip-väljare"} id={id}>
      {chips.map((chip) => {
        const isOn = selected.includes(chip);
        const chipClasses = getChipClasses(isOn);
        const tooltip = tooltips?.[chip];
        
        const chipButton = (
          <button
            key={chip}
            type="button"
            onClick={() => onToggle(chip)}
            onKeyDown={(e) => handleKeyDown(e, chip)}
            role="checkbox"
            aria-checked={isOn}
            aria-label={tooltip ? `${chip}: ${tooltip}` : chip}
            className={`min-h-[44px] min-w-[44px] px-3 py-2 text-xs rounded-full border transition-all font-medium select-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:outline-none inline-flex items-center gap-1 ${chipClasses}`}
          >
            {isOn && <CheckCircle2 className="w-3 h-3" />}
            {chip}
          </button>
        );
        
        if (tooltip) {
          return (
            <Tooltip key={chip}>
              <TooltipTrigger asChild>
                {chipButton}
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
        
        return chipButton;
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
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex items-center border border-input rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-8 h-8 flex items-center justify-center text-sm font-semibold text-foreground">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── HELPER: Priority Checklist ──
interface PriorityChecklistProps {
  items: PriorityItem[];
  onItemClick?: (fieldName: string) => void;
}

function PriorityChecklist({ items, onItemClick }: PriorityChecklistProps) {
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  
  const getProgressLevel = () => {
    if (percentage < 40) return { label: "Grundläggande", color: "text-warning" };
    if (percentage < 70) return { label: "Bra", color: "text-success" };
    return { label: "Utmärkt", color: "text-success" };
  };
  
  const progressLevel = getProgressLevel();
  
  /**
   * Mäklaraktig Priority Indicator Styling
   * 
   * Design Philosophy:
   * - NO colored backgrounds (no warning-bg, success-bg)
   * - Use subtle left border (border-l-4) with semantic color
   * - White background for all priority levels
   * - Light gray border for container
   */
  const getPriorityColor = (priority: string) => {
    // All use white background with light gray border
    return 'border-gray-200 bg-white';
  };
  
  const getPriorityAccent = (priority: string) => {
    // Left border color indicates priority
    switch (priority) {
      case 'critical': return 'bg-amber-500';  // Amber for critical
      case 'important': return 'bg-green-500'; // Green for important
      case 'optional': return 'bg-gray-400';   // Gray for optional
      default: return 'bg-gray-400';
    }
  };
  
  return (
    <div className="bg-card border border-card-border rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Prioriterade fält</h3>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${progressLevel.color}`}>
            {progressLevel.label}
          </span>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
        <div 
          className="h-2 rounded-full transition-all duration-300 bg-primary"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onItemClick?.(item.fieldName)}
            className={`w-full flex items-center gap-3 p-2 rounded border transition-all ${
              getPriorityColor(item.priority)
            } ${!item.completed ? 'animate-pulse' : ''} hover:shadow-sm`}
          >
            <div className={`w-1 h-6 rounded ${getPriorityAccent(item.priority)}`} />
            <div className="flex-1 text-left">
              <span className="text-sm text-foreground">{item.label}</span>
            </div>
            {item.completed ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ──
export function PromptFormProfessionalV2({ onSubmit, isPending, disabled, isPro = false }: PromptFormProps) {
  const { toast } = useToast();

  // ── STATE: Chip selections ──
  const [kitchenChips, setKitchenChips] = useState<string[]>([]);
  const [bathroomChips, setBathroomChips] = useState<string[]>([]);
  const [flooringChips, setFlooringChips] = useState<string[]>([]);
  const [heatingChips, setHeatingChips] = useState<string[]>([]);
  const [specialChips, setSpecialChips] = useState<string[]>([]);
  const [gardenChips, setGardenChips] = useState<string[]>([]);
  const [uspChips, setUspChips] = useState<string[]>([]);
  const [parkingChips, setParkingChips] = useState<string[]>([]);
  const [roofChips, setRoofChips] = useState<string[]>([]);
  const [materialChips, setMaterialChips] = useState<string[]>([]);

  // ── STATE: UI state ──
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<PropertyFormData | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // ── LAYOUT COMPRESSION STATE ──
  const defaultCollapsed = new Set(
    SECTION_CONFIGS.filter(s => s.defaultCollapsed).map(s => s.id)
  );

  const {
    collapsedSections: managedCollapsedSections,
    toggleSection,
    expandAll,
    collapseAll,
    isCollapsed,
  } = useCollapsedSections(defaultCollapsed);

  const { compactMode, toggleCompactMode } = useCompactMode();

  // Print mode hook
  usePrintMode(managedCollapsedSections, (sections) => {
    // Print mode automatically handles section expansion/restoration
  });

  // ── STATE: Form values ──
  const modelLimits = { min: 200, max: 600, defaultMin: 350, defaultMax: 450 };
  const [wordCountMin, setWordCountMin] = useState(modelLimits.defaultMin);
  const [wordCountMax, setWordCountMax] = useState(modelLimits.defaultMax);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [addressLookupResult, setAddressLookupResult] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageUploadProgress, setImageUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [rooms, setRooms] = useState(3);
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [hasBalcony, setHasBalcony] = useState(false);

  // ── FORM SETUP ──
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
      konstruktionMaterial: "",
      taktyp: "",
      floors: "",
      biarea: "",
      tilltradesdag: "",
      platform: "hemnet",
      writingStyle: "balanced",
      visningstid: "",
      maklarnamn: "",
      maklartelefon: "",
      // Phase 2: New fields
      landOwnership: undefined,
      brfUnits: "",
      nearbySchools: "",
      nearbyServices: "",
    },
  });

  // ── WATCH VALUES ──
  const selectedPlatform = form.watch("platform");
  const selectedType = form.watch("propertyType");
  const selectedStyle = form.watch("writingStyle");
  const addressValue = form.watch("address");
  const areaValue = form.watch("area");
  const livingAreaValue = form.watch("livingArea");
  const conditionValue = form.watch("condition");
  const uspValue = form.watch("uniqueSellingPoints");
  const layoutValue = form.watch("layoutDescription");
  const kitchenValue = form.watch("kitchenDescription");
  const bathroomValue = form.watch("bathroomDescription");
  const transportValue = form.watch("transport");
  const neighborhoodValue = form.watch("neighborhood");
  const viewValue = form.watch("view");
  const buildYearValue = form.watch("buildYear");
  const energyClassValue = form.watch("energyClass");
  const floorValue = form.watch("floor");
  const elevatorValue = form.watch("elevator");
  const lotAreaValue = form.watch("lotArea");
  const floorsValue = form.watch("floors");

  // ── DERIVED VALUES ──
  const isTownhouseType = selectedType === "townhouse";
  const isApartmentType = selectedType === "apartment" || isTownhouseType;
  const isHouseType = selectedType === "house" || selectedType === "villa";
  const isHouseOrTownhouseType = isHouseType || isTownhouseType;
  const hasKitchenBathroomFacts = Boolean(kitchenValue?.trim() || bathroomValue?.trim() || kitchenChips.length > 0 || bathroomChips.length > 0);
  const hasLocationFacts = Boolean(transportValue?.trim() || neighborhoodValue?.trim());
  const hasStrongDifferentiator = Boolean(uspValue?.trim() || uspChips.length > 0 || viewValue?.trim());

  // ── HELPER: Toggle chip ──
  const toggleChip = useCallback((list: string[], setList: (v: string[]) => void, chip: string) => {
    setList(list.includes(chip) ? list.filter(c => c !== chip) : [...list, chip]);
  }, []);

  // ── HELPER: Handle word count ──
  const handleWordCountMin = (val: number) => {
    setWordCountMin(val);
    if (val > wordCountMax) setWordCountMax(val);
  };
  const handleWordCountMax = (val: number) => {
    setWordCountMax(val);
    if (val < wordCountMin) setWordCountMin(val);
  };

  // ── HELPER: Process image files ──
  const processImageFiles = useCallback((files: File[]) => {
    const validImages = files.filter(f => f.type.startsWith("image/") && f.size < 10 * 1024 * 1024);
    
    if (validImages.length === 0) return;
    
    setImageUploadProgress({ current: 0, total: validImages.length });
    let completed = 0;
    
    validImages.forEach((file) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result as string;
          setUploadedImages((prev) => prev.length < 20 ? [...prev, result] : prev);
          completed++;
          setImageUploadProgress({ current: completed, total: validImages.length });
          if (completed === validImages.length) {
            setTimeout(() => setImageUploadProgress(null), 500);
          }
        } catch (err) {
          console.error("Error processing image:", err);
          completed++;
          setImageUploadProgress({ current: completed, total: validImages.length });
        }
      };
      
      reader.onerror = () => {
        console.error("FileReader error:", reader.error);
        completed++;
        setImageUploadProgress({ current: completed, total: validImages.length });
      };
      
      reader.readAsDataURL(file);
    });
  }, []);

  // ── HELPER: Scroll to field ──
  const handleScrollToField = useCallback((fieldName: string) => {
    scrollToField(fieldName);
  }, []);

  // ── HELPER: Expand/Collapse all ──
  const handleExpandAll = useCallback(() => {
    expandAll();
  }, [expandAll]);

  const handleCollapseAll = useCallback(() => {
    const optionalIds = SECTION_CONFIGS
      .filter(s => s.priority === 'optional')
      .map(s => s.id);
    collapseAll(optionalIds);
  }, [collapseAll]);

  // ── PRIORITY ITEMS ──
  const priorityItems: PriorityItem[] = [
    { label: "Adress", completed: Boolean(addressValue?.trim()), fieldName: "address", priority: "critical" },
    { label: "Boarea", completed: Boolean(livingAreaValue?.trim()), fieldName: "livingArea", priority: "critical" },
    { label: "Rum & badrum", completed: Boolean((rooms || 0) > 0 && (bathrooms || 0) > 0), fieldName: "totalRooms", priority: "critical" },
    
    ...(selectedPlatform === "hemnet" ? [
      { label: "Byggår", completed: Boolean(buildYearValue?.trim()), fieldName: "buildYear", priority: "critical" as const },
      { label: "Energiklass", completed: Boolean(energyClassValue?.trim()), fieldName: "energyClass", priority: "critical" as const },
      ...(isApartmentType ? [
        { label: "Avgift", completed: Boolean(form.watch("monthlyFee")?.trim()), fieldName: "monthlyFee", priority: "critical" as const },
      ] : []),
    ] : []),
    
    ...(isApartmentType ? [
      { label: "Våning", completed: Boolean(floorValue?.trim()), fieldName: "floor", priority: "critical" as const },
      { label: "Hiss", completed: true, fieldName: "elevator", priority: "critical" as const },
    ] : []),
    ...(isHouseType ? [
      { label: "Tomtarea", completed: Boolean(lotAreaValue?.trim()), fieldName: "lotArea", priority: "critical" as const },
      { label: "Antal plan", completed: Boolean(floorsValue?.trim()), fieldName: "floors", priority: "critical" as const },
    ] : []),
    
    { label: "Kök & badrum", completed: hasKitchenBathroomFacts, fieldName: "kitchenDescription", priority: "important" },
    { label: "Läge & transport", completed: hasLocationFacts, fieldName: "transport", priority: "important" },
    { label: "Försäljningsargument", completed: hasStrongDifferentiator, fieldName: "uniqueSellingPoints", priority: "critical" },
    { label: "Planlösning & skick", completed: Boolean(layoutValue?.trim() || conditionValue?.trim()), fieldName: "layout", priority: "important" },
  ];
  
  const priorityChecklist = priorityItems.map(item => item.completed);
  const priorityCompleted = priorityChecklist.filter(Boolean).length;

  // ── HANDLE EXTERNAL IMPORT ──
  const handleExternalImport = useCallback((propertyData: Record<string, any>) => {
    const set = (field: keyof PropertyFormData, value: any) => {
      if (value !== undefined && value !== null && value !== "") {
        form.setValue(field, String(value), { shouldDirty: true });
      }
    };

    if (propertyData.propertyType) {
      form.setValue("propertyType", propertyData.propertyType as any, { shouldDirty: true });
    }

    set("address", propertyData.address);
    set("area", propertyData.area || propertyData.district || propertyData.neighborhood);
    set("livingArea", propertyData.livingArea);
    set("biarea", propertyData.biarea || propertyData.biArea);
    set("lotArea", propertyData.lotArea);
    set("buildYear", propertyData.buildYear || propertyData.yearBuilt || propertyData.constructionYear);
    set("energyClass", propertyData.energyClass);
    set("monthlyFee", propertyData.monthlyFee);
    set("price", propertyData.price || propertyData.askingPrice);
    set("brfName", propertyData.brfName);
    set("condition", propertyData.condition);

    if (propertyData.totalRooms || propertyData.rooms) {
      const n = Number(propertyData.totalRooms || propertyData.rooms) || 3;
      form.setValue("totalRooms", String(n), { shouldDirty: true });
      setRooms(n);
    }
    if (propertyData.bedrooms) {
      const n = Number(propertyData.bedrooms) || 2;
      form.setValue("bedrooms", String(n), { shouldDirty: true });
      setBedrooms(n);
    }
    if (propertyData.bathrooms) {
      const n = Number(propertyData.bathrooms) || 1;
      form.setValue("bathrooms", String(n), { shouldDirty: true });
      setBathrooms(n);
    }

    set("floor", propertyData.floor);
    set("floors", propertyData.floors || propertyData.totalFloors);
    if (typeof propertyData.elevator === "boolean") {
      form.setValue("elevator", propertyData.elevator, { shouldDirty: true });
    }

    set("layoutDescription", propertyData.layoutDescription || propertyData.layout);
    set("kitchenDescription", propertyData.kitchenDescription || propertyData.kitchen);
    set("bathroomDescription", propertyData.bathroomDescription || propertyData.bathroom);
    set("gardenDescription", propertyData.gardenDescription || propertyData.garden);
    set("otherInfo", propertyData.description || propertyData.otherInfo);
    set("view", propertyData.view);

    set("transport", propertyData.transport);
    set("neighborhood", propertyData.neighborhood || propertyData.district);

    set("parking", propertyData.parking);
    set("storage", propertyData.storage);
    set("heating", propertyData.heating);
    set("flooring", propertyData.flooring);

    set("balconyArea", propertyData.balconyArea);
    if (propertyData.balconyDirection) {
      form.setValue("balconyDirection", propertyData.balconyDirection as any, { shouldDirty: true });
    }

    set("konstruktionMaterial", propertyData.constructionMaterial || propertyData.konstruktionMaterial);
    set("taktyp", propertyData.roofType || propertyData.taktyp);

    set("maklarnamn", propertyData.maklarnamn || propertyData.brokerName);
    set("maklartelefon", propertyData.maklartelefon || propertyData.brokerPhone);
    set("visningstid", propertyData.visningstid || propertyData.showingDate);
    set("tilltradesdag", propertyData.tilltradesdag || propertyData.accessDate);

    if (Array.isArray(propertyData.specialFeatures) && propertyData.specialFeatures.length > 0) {
      setSpecialChips(propertyData.specialFeatures);
    }
    if (Array.isArray(propertyData.gardenFeatures) && propertyData.gardenFeatures.length > 0) {
      setGardenChips(propertyData.gardenFeatures);
    }
    if (Array.isArray(propertyData.imageUrls) && propertyData.imageUrls.length > 0) {
      setUploadedImages(propertyData.imageUrls.slice(0, 5));
    }
  }, [form]);

  // ── SUBMIT FORM ──
  const submitForm = (values: PropertyFormData) => {
    const CANONICAL_RULES: Array<{ canonical: string; pattern: RegExp }> = [
      { canonical: "Laddbox för elbil", pattern: /\b(laddplats elbil|laddplats för elbil|laddbox(?: installerad)?|elbilsladdare|laddstation)\b/i },
      { canonical: "Nya fönster", pattern: /\b(fönster bytta|nya fönster|fönsterbyte|uppdaterade fönster|3-glasfönster)\b/i },
      { canonical: "Stambyte genomfört", pattern: /\b(stambyte|stamrenovering|nya stammar|stambyte genomfört)\b/i },
      { canonical: "Golvvärme", pattern: /\b(golvvärme|varmvatten i golv|golvvärme i badrum)\b/i },
      { canonical: "Balkong", pattern: /\b(balkong|uteplats på balkong)\b/i },
      { canonical: "Garage", pattern: /\b(garage|carport med garage)\b/i },
      { canonical: "Carport", pattern: /\b(carport|biltak)\b/i },
      { canonical: "P-plats", pattern: /\b(p-plats|parkeringsplats|parkering)\b/i },
      { canonical: "Öppen planlösning", pattern: /\b(öppen planlösning|öppet kök|kök öppet mot vardagsrum)\b/i },
      { canonical: "Moderna vitvaror", pattern: /\b(vitvaror uppdaterade|nya vitvaror|moderna vitvaror|uppdaterade vitvaror)\b/i },
      { canonical: "Renoverat kök", pattern: /\b(renoverat kök|nyrenoverat kök|kök renoverat|nytt kök)\b/i },
      { canonical: "Köksö", pattern: /\b(köksö|fristående köksö)\b/i },
      { canonical: "Kompositbänk", pattern: /\b(kompositbänk|kvartskomposit|komposit bänkskiva|bänkskiva i komposit)\b/i },
      { canonical: "Stenbänk", pattern: /\b(stenbänk|granitbänk|marmorbänk|bänkskiva i sten|bänkskiva i granit)\b/i },
      { canonical: "Renoverat badrum", pattern: /\b(renoverat badrum|nyrenoverat badrum|badrum renoverat|nytt badrum)\b/i },
      { canonical: "Helkaklat", pattern: /\b(helkaklat|helkaklat badrum|fullt kaklat)\b/i },
      { canonical: "Dubbla handfat", pattern: /\b(dubbla handfat|två handfat|dubbelhandfat)\b/i },
      { canonical: "Duschvägg i glas", pattern: /\b(duschvägg i glas|glasdusch|dusch i glas)\b/i },
      { canonical: "Ekparkett", pattern: /\b(ekparkett|parkett i ek|ek parkett)\b/i },
      { canonical: "Massivt trägolv", pattern: /\b(massivt trägolv|massiv parkett|massiva trägolv)\b/i },
      { canonical: "Originalparkett", pattern: /\b(originalparkett|original parkett|bevarad parkett)\b/i },
      { canonical: "Fjärrvärme", pattern: /\b(fjärrvärme|stadsvärme)\b/i },
      { canonical: "Bergvärme", pattern: /\b(bergvärme|bergvärmepump)\b/i },
      { canonical: "Luft-luftvärmepump", pattern: /\b(luft-luftvärmepump|luft till luft|luft-luft)\b/i },
      { canonical: "Luft-vattenvärmepump", pattern: /\b(luft-vattenvärmepump|luft till vatten|luft-vatten)\b/i },
      { canonical: "Stor trädgård", pattern: /\b(stor trädgård|rymlig trädgård|generös trädgård)\b/i },
      { canonical: "Altan", pattern: /\b(altan|uteplats|terrass)\b/i },
      { canonical: "Pergola", pattern: /\b(pergola|spaljé)\b/i },
      { canonical: "Nytt tak", pattern: /\b(nytt tak|tak omlagt|tak bytt|takrenovering)\b/i },
      { canonical: "Fiber indraget", pattern: /\b(fiber indraget|fiberanslutning|bredband via fiber|fiber installerat|fiberanslutet)\b/i },
      { canonical: "Solceller", pattern: /\b(solceller|solpaneler|solenergi)\b/i },
      { canonical: "Braskamin", pattern: /\b(braskamin|vedkamin|kamin)\b/i },
      { canonical: "Dränering utförd", pattern: /\b(dränering utförd|dränering gjord|ny dränering|dränerat)\b/i },
      { canonical: "Säkerhetsdörr", pattern: /\b(säkerhetsdörr|säkerhetsdörr installerad|säker dörr)\b/i },
      { canonical: "Balkong i söder", pattern: /\b(balkong i söder|balkong söder|söderbalkong)\b/i },
      { canonical: "Hiss", pattern: /\b(hiss|elevator|hiss installerad)\b/i },
      { canonical: "Varmvattenberedare", pattern: /\b(varmvattenberedare|beredare|varmvatten)\b/i },
    ];

    const normalizeListText = (value: string) => {
      if (!value) return "";
      const parts = value
        .split(/[,.;]\s*/)
        .map((part) => part.trim())
        .filter(Boolean);

      const seen = new Set<string>();
      const normalized = parts.map((part) => {
        for (const rule of CANONICAL_RULES) {
          if (rule.pattern.test(part)) return rule.canonical;
        }
        return part;
      }).filter((part) => {
        const key = part.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return normalized.join(", ");
    };

    const mergeChipsAndText = (chips: string[], text: string, fieldName?: string) => {
      if (chips.length > 0 && text.trim()) {
        const textLower = text.toLowerCase();
        const conflicts: string[] = [];
        
        chips.forEach(chip => {
          const chipLower = chip.toLowerCase();
          if (textLower.includes(chipLower)) {
            conflicts.push(chip);
          }
          
          for (const rule of CANONICAL_RULES) {
            if (rule.pattern.test(chip) && rule.pattern.test(text)) {
              if (!conflicts.includes(chip)) {
                conflicts.push(chip);
              }
            }
          }
        });
        
        if (conflicts.length > 0 && fieldName) {
          toast({
            title: "Dubblerad information upptäckt",
            description: `"${conflicts.join('", "')}" finns både som chip och i fritexten för ${fieldName}. Detta kommer normaliseras automatiskt.`,
            variant: "default",
          });
        }
      }
      
      const parts = [chips.join(", "), text].filter(Boolean);
      return normalizeListText(parts.join(". "));
    };

    const merged = {
      ...values,
      totalRooms: String(rooms),
      bedrooms: String(bedrooms),
      bathrooms: String(bathrooms),
      kitchenDescription: mergeChipsAndText(kitchenChips, values.kitchenDescription, "kök"),
      bathroomDescription: mergeChipsAndText(bathroomChips, values.bathroomDescription, "badrum"),
      flooring: mergeChipsAndText(flooringChips, values.flooring, "golv"),
      heating: normalizeListText(heatingChips.length > 0 ? heatingChips.join(", ") : values.heating),
      specialFeatures: mergeChipsAndText(specialChips, values.specialFeatures, "specialfunktioner"),
      gardenDescription: mergeChipsAndText(gardenChips, values.gardenDescription, "trädgård"),
      uniqueSellingPoints: mergeChipsAndText(uspChips, values.uniqueSellingPoints, "försäljningsargument"),
      parking: mergeChipsAndText(parkingChips, values.parking, "parkering"),
      konstruktionMaterial: mergeChipsAndText(materialChips, values.konstruktionMaterial, "konstruktionsmaterial"),
      taktyp: normalizeListText(roofChips.length > 0 ? roofChips.join(", ") : values.taktyp),
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

    if (merged.tilltradesdag) d += `Tillträde: ${merged.tilltradesdag}\n`;

    d += "\n=== YTOR ===\n";
    if (merged.livingArea) d += `Boarea: ${merged.livingArea} kvm\n`;
    if (merged.biarea) d += `Biarea: ${merged.biarea} kvm\n`;
    if (merged.lotArea) d += `Tomtarea: ${merged.lotArea} kvm\n`;
    if (hasBalcony && merged.balconyArea) d += `Balkong: ${merged.balconyArea} kvm\n`;
    if (hasBalcony && merged.balconyDirection) d += `Balkong väderstreck: ${merged.balconyDirection}\n`;
    d += `Antal rum: ${rooms}\n`;
    d += `Sovrum: ${bedrooms}\n`;
    d += `Badrum/WC: ${bathrooms}\n`;

    d += "\n=== BYGGNAD ===\n";
    if (merged.buildYear) d += `Byggår: ${merged.buildYear}\n`;
    if (merged.floors) d += `Antal plan: ${merged.floors}\n`;
    if (merged.condition) d += `Skick: ${merged.condition}\n`;
    if (merged.energyClass) d += `Energiklass: ${merged.energyClass}\n`;
    if (isApartmentType) {
      if (merged.floor) d += `Våning: ${merged.floor}\n`;
      d += `Hiss: ${merged.elevator ? "Ja" : "Nej"}\n`;
      if (merged.brfName) d += `Förening: ${merged.brfName}\n`;
      if (merged.brfUnits) d += `Antal lägenheter i föreningen: ${merged.brfUnits}\n`;
    }
    if (isHouseType && merged.landOwnership) {
      const ownershipLabel = merged.landOwnership === "aganderatt" ? "Äganderätt" : "Tomträtt";
      d += `Ägandeform: ${ownershipLabel}\n`;
    }
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
    if (merged.flooring || merged.heating || merged.konstruktionMaterial || merged.taktyp) {
      d += "\n=== MATERIAL & TEKNIK ===\n";
      if (merged.flooring) d += `Golvmaterial: ${merged.flooring}\n`;
      if (merged.heating) d += `Uppvärmning: ${merged.heating}\n`;
      if (merged.konstruktionMaterial) d += `Byggnadsmaterial: ${merged.konstruktionMaterial}\n`;
      if (merged.taktyp) d += `Taktyp: ${merged.taktyp}\n`;
    }
    if (merged.view || merged.neighborhood || merged.transport || merged.parking || merged.nearbySchools || merged.nearbyServices) {
      d += "\n=== LÄGE & OMGIVNING ===\n";
      if (merged.view) d += `Utsikt: ${merged.view}\n`;
      if (merged.neighborhood) d += `Områdesbeskrivning: ${merged.neighborhood}\n`;
      if (merged.transport) d += `Kommunikationer: ${merged.transport}\n`;
      if (merged.nearbySchools) d += `Förskola/Skola: ${merged.nearbySchools}\n`;
      if (merged.nearbyServices) d += `Affärer & Service: ${merged.nearbyServices}\n`;
      if (merged.parking) d += `Parkering: ${merged.parking}\n`;
    }
    if (merged.uniqueSellingPoints) {
      d += "\n=== FÖRSÄLJNINGSARGUMENT ===\n";
      d += "(Unika kvaliteter som gör bostaden attraktiv — lyft dessa i texten)\n";
      d += `${merged.uniqueSellingPoints}\n`;
    }

    if (merged.visningstid || merged.maklarnamn || merged.maklartelefon) {
      d += "\n=== VISNINGSINFORMATION ===\n";
      if (merged.visningstid) d += `Visningstid: ${merged.visningstid}\n`;
      if (merged.maklarnamn) d += `Mäklare: ${merged.maklarnamn}\n`;
      if (merged.maklartelefon) d += `Telefon: ${merged.maklartelefon}\n`;
      d += "(Använd dessa uppgifter i visningsinbjudan — ersätt [TID] och [KONTAKT] med faktiska värden)\n";
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
      d += `${merged.otherInfo}\n`;
    }

    onSubmit({
      prompt: d,
      type: merged.propertyType,
      platform: merged.platform,
      writingStyle: merged.writingStyle,
      propertyData: merged,
      ...(isPro && { wordCountMin, wordCountMax }),
      ...(uploadedImages.length > 0 && { imageUrls: uploadedImages }),
    });

    try {
      localStorage.removeItem('optiprompt-form-draft');
      localStorage.removeItem('optiprompt-form-chips');
    } catch { }
  };

  // ── LOCAL SUBMIT ──
  const onLocalSubmit = (values: PropertyFormData) => {
    const validationResult = validateRequiredFields(
      {
        ...values,
        totalRooms: String(rooms),
        bedrooms: String(bedrooms),
        bathrooms: String(bathrooms),
      },
      values.propertyType as PropertyType,
      values.platform as Platform
    );
    
    if (!validationResult.valid) {
      const missingFieldLabels = validationResult.missingFields.map(getFieldLabel);
      toast({
        title: "Obligatoriska fält saknas",
        description: `Följande fält måste fyllas i: ${missingFieldLabels.join(', ')}`,
        variant: "destructive",
      });
      
      if (validationResult.missingFields.length > 0) {
        const firstMissingField = validationResult.missingFields[0];
        handleScrollToField(firstMissingField);
      }
      
      return;
    }
    
    if (priorityCompleted < 4) {
      setPendingFormData(values);
      setShowIncompleteDialog(true);
      return;
    }
    
    submitForm(values);
  };

  // ── ADDRESS LOOKUP ──
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
    } catch (err) {
      console.error("Address lookup failed:", err);
      setAddressLookupResult("Kunde inte slå upp adressen");
    } finally {
      setAddressLookupLoading(false);
    }
  };

  // ── USEEFFECT: Keep type-specific UI aligned ──
  useEffect(() => {
    if (isApartmentType) {
      form.setValue("lotArea", "");
      form.setValue("floors", "");
      setGardenChips([]);
      setRoofChips([]);
      setMaterialChips([]);
    }

    if (!isApartmentType) {
      form.setValue("floor", "");
      form.setValue("elevator", false);
      form.setValue("brfName", "");
    }
  }, [isApartmentType, form]);

  // ── USEEFFECT: Keyboard shortcut ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        form.handleSubmit(onLocalSubmit)();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [form]);

  // ── USEEFFECT: Draft restoration ──
  const [draftRestored, setDraftRestored] = useState(false);
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('optiprompt-form-draft');
      const savedChips = localStorage.getItem('optiprompt-form-chips');
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        const fieldsToRestore: (keyof PropertyFormData)[] = [
          'propertyType', 'address', 'area', 'price', 'monthlyFee', 'livingArea',
          'buildYear', 'condition', 'energyClass', 'floor', 'elevator', 'balconyArea',
          'balconyDirection', 'brfName', 'storage', 'layoutDescription', 'kitchenDescription',
          'bathroomDescription', 'uniqueSellingPoints', 'view', 'neighborhood', 'transport',
          'parking', 'flooring', 'heating', 'lotArea', 'gardenDescription', 'specialFeatures',
          'otherInfo', 'konstruktionMaterial', 'taktyp', 'floors', 'biarea',
          'tilltradesdag', 'platform', 'writingStyle', 'visningstid', 'maklarnamn', 'maklartelefon',
        ];
        fieldsToRestore.forEach((key) => {
          if (draft[key] !== undefined && draft[key] !== '') {
            form.setValue(key, draft[key]);
          }
        });
        if (draft.rooms) setRooms(Number(draft.rooms));
        if (draft.bedrooms) setBedrooms(Number(draft.bedrooms));
        if (draft.bathrooms) setBathrooms(Number(draft.bathrooms));
        if (draft.hasBalcony) setHasBalcony(true);
        if (draft.wordCountMin) setWordCountMin(Number(draft.wordCountMin));
        if (draft.wordCountMax) setWordCountMax(Number(draft.wordCountMax));
        setDraftRestored(true);
      }
      if (savedChips) {
        const chips = JSON.parse(savedChips);
        if (chips.kitchen?.length) setKitchenChips(chips.kitchen);
        if (chips.bathroom?.length) setBathroomChips(chips.bathroom);
        if (chips.flooring?.length) setFlooringChips(chips.flooring);
        if (chips.heating?.length) setHeatingChips(chips.heating);
        if (chips.special?.length) setSpecialChips(chips.special);
        if (chips.garden?.length) setGardenChips(chips.garden);
        if (chips.usp?.length) setUspChips(chips.usp);
        if (chips.parking?.length) setParkingChips(chips.parking);
        if (chips.roof?.length) setRoofChips(chips.roof);
        if (chips.material?.length) setMaterialChips(chips.material);
      }
    } catch { }
  }, []);

  // ── USEEFFECT: Debounced auto-save form ──
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem('optiprompt-form-draft', JSON.stringify({
            ...values,
            rooms, bedrooms, bathrooms, hasBalcony, wordCountMin, wordCountMax,
          }));
        } catch { }
      }, 300);
    });
    return () => {
      subscription.unsubscribe();
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [form, rooms, bedrooms, bathrooms, hasBalcony, wordCountMin, wordCountMax]);

  // ── USEEFFECT: Debounced auto-save chips ──
  const chipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (chipTimerRef.current) clearTimeout(chipTimerRef.current);
    chipTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('optiprompt-form-chips', JSON.stringify({
          kitchen: kitchenChips, bathroom: bathroomChips, flooring: flooringChips,
          heating: heatingChips, special: specialChips, garden: gardenChips,
          usp: uspChips, parking: parkingChips, roof: roofChips, material: materialChips,
        }));
      } catch { }
    }, 300);
    return () => {
      if (chipTimerRef.current) clearTimeout(chipTimerRef.current);
    };
  }, [kitchenChips, bathroomChips, flooringChips, heatingChips, specialChips, gardenChips, uspChips, parkingChips, roofChips, materialChips]);

  // ── RENDER ──
  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onLocalSubmit)} className="min-h-screen flex flex-col bg-white">
          
          {/* STICKY HEADER */}
          <StickyHeader
            priorityItems={priorityItems}
            compactMode={compactMode}
            onCompactModeToggle={toggleCompactMode}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            onItemClick={handleScrollToField}
          />

          {/* MAIN CONTENT - GRID LAYOUT */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="max-w-7xl mx-auto p-6">
              <FormGridLayout compactMode={compactMode}>
                
                {/* ROW 1 */}
                
                {/* Column 1: Essentiell Information */}
                <FormSection title="Essentiell Information" priority="critical">
                  <EssentialFieldsSection
                    form={form}
                    isApartmentType={isApartmentType}
                    isHouseOrTownhouseType={isHouseOrTownhouseType}
                    rooms={rooms}
                    bedrooms={bedrooms}
                    bathrooms={bathrooms}
                    setRooms={setRooms}
                    setBedrooms={setBedrooms}
                    setBathrooms={setBathrooms}
                    addressLookupLoading={addressLookupLoading}
                    addressLookupResult={addressLookupResult}
                    onAddressLookup={handleAddressLookup}
                    importButtons={
                      <>
                        <HemnetImportButton onImport={handleExternalImport} />
                        <VitecImportPicker onImport={handleExternalImport} />
                      </>
                    }
                  />
                </FormSection>

                {/* Column 2: Bilder */}
                <FormSection title="Objektbilder" priority="important">
                  <ImageSection
                    uploadedImages={uploadedImages}
                    onImagesAdded={processImageFiles}
                    onImageRemoved={(idx) => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                    imageUploadProgress={imageUploadProgress}
                  />
                </FormSection>

                {/* Column 3: Försäljningsargument */}
                <FormSection title="Försäljningsargument" priority="important">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Unika Egenskaper</label>
                      <CollapsibleChipSelector
                        chips={USP_CHIPS}
                        selected={uspChips}
                        onToggle={(c) => toggleChip(uspChips, setUspChips, c)}
                        tooltips={USP_TOOLTIPS}
                      />
                    </div>
                    <FormField control={form.control} name="uniqueSellingPoints" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-600">Fritext</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Lägg till unika egenskaper..." {...field} className="min-h-[80px] text-xs" />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                </FormSection>

                {/* ROW 2 */}

                {/* Column 1: Kök & Badrum */}
                <FormSection title="Kök & Badrum" priority="important">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Kök</label>
                      <CollapsibleChipSelector
                        chips={KITCHEN_CHIPS}
                        selected={kitchenChips}
                        onToggle={(c) => toggleChip(kitchenChips, setKitchenChips, c)}
                        tooltips={KITCHEN_TOOLTIPS}
                      />
                    </div>
                    <FormField control={form.control} name="kitchenDescription" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-600">Komplettering</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Marbodalkök från 2019..." {...field} className={exampleCompactInputClass} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Badrum</label>
                      <CollapsibleChipSelector
                        chips={BATHROOM_CHIPS}
                        selected={bathroomChips}
                        onToggle={(c) => toggleChip(bathroomChips, setBathroomChips, c)}
                        tooltips={BATHROOM_TOOLTIPS}
                      />
                    </div>
                    <FormField control={form.control} name="bathroomDescription" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-600">Komplettering</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Badrum renoverat 2020..." {...field} className={exampleCompactInputClass} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                </FormSection>

                {/* Column 2: Läge & Transport */}
                <FormSection title="Läge & Transport" priority="important">
                  <div className="space-y-3">
                    <FormField control={form.control} name="neighborhood" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-gray-600">Område</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Vasastan" {...field} className="h-10" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="transport" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-gray-600">Transport</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Kollektivtrafik, pendling..." {...field} className="min-h-[60px]" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="nearbySchools" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-gray-600">Förskola/Skola</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Vasaskolan 500m, Förskola Solrosen 200m" {...field} className="h-10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="nearbyServices" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-gray-600">Affärer & Service</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: ICA Maxi 300m, Systembolaget, apotek" {...field} className="h-10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="view" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-gray-600">Utsikt</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Fri utsikt över park..." {...field} className="h-10" />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                </FormSection>

                {/* Column 3: Material & Teknik */}
                <CollapsibleFormSection 
                  id="material-tech"
                  title="Material & Teknik" 
                  priority="optional"
                  isCollapsed={isCollapsed('material-tech')}
                  onToggleCollapse={() => toggleSection('material-tech')}
                  completionPercentage={
                    calculateSectionCompletion(
                      SECTION_CONFIGS.find(s => s.id === 'material-tech')!,
                      form.getValues(),
                      form.formState.errors
                    ).percentage
                  }
                >
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Golv</label>
                      <CollapsibleChipSelector
                        chips={FLOORING_CHIPS}
                        selected={flooringChips}
                        onToggle={(c) => toggleChip(flooringChips, setFlooringChips, c)}
                      />
                    </div>
                    <FormField control={form.control} name="flooring" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-600">Komplettering</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Enstavsparkett..." {...field} className={exampleCompactInputClass} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Uppvärmning</label>
                      <CollapsibleChipSelector
                        chips={HEATING_CHIPS}
                        selected={heatingChips}
                        onToggle={(c) => toggleChip(heatingChips, setHeatingChips, c)}
                        tooltips={HEATING_TOOLTIPS}
                      />
                    </div>
                  </div>
                </CollapsibleFormSection>

                {/* ROW 3 - FULL WIDTH */}

                {/* Planlösning & Detaljer */}
                <CollapsibleFormSection 
                  id="layout-details"
                  title="Planlösning & Detaljer" 
                  priority="optional"
                  className="col-span-full"
                  isCollapsed={isCollapsed('layout-details')}
                  onToggleCollapse={() => toggleSection('layout-details')}
                  completionPercentage={
                    calculateSectionCompletion(
                      SECTION_CONFIGS.find(s => s.id === 'layout-details')!,
                      form.getValues(),
                      form.formState.errors
                    ).percentage
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="layoutDescription" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-600">Planlösning</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Beskriv planlösningen..." {...field} className="min-h-[80px] text-xs" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="gardenDescription" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-600">Trädgård</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Beskriv trädgården..." {...field} className="min-h-[80px] text-xs" />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                </CollapsibleFormSection>

              </FormGridLayout>
            </div>
          </div>

          {/* STICKY FOOTER */}
          <StickyFooter
            onSubmit={form.handleSubmit(onLocalSubmit)}
            isPending={isPending}
            disabled={disabled}
          />

        </form>
      </Form>

      {/* Incomplete Priority Fields Dialog */}
      <AlertDialog open={showIncompleteDialog} onOpenChange={setShowIncompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ofullständig information</AlertDialogTitle>
            <AlertDialogDescription>
              Du har bara fyllt i {priorityCompleted} av {priorityItems.length} prioriterade fält. 
              Detta kan påverka kvaliteten på den genererade texten negativt.
              <br /><br />
              Vill du fortsätta ändå eller gå tillbaka och fylla i mer information?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowIncompleteDialog(false);
              setPendingFormData(null);
            }}>
              Gå tillbaka
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowIncompleteDialog(false);
              if (pendingFormData) {
                submitForm(pendingFormData);
                setPendingFormData(null);
              }
            }}>
              Fortsätt ändå
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
