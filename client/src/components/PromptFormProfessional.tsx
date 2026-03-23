import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronUp, Sparkles, Plus, X, Lock, MapPin, Minus, Info, CheckCircle2 } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  fastighetsbeteckning: string;
  taxeringsvarde: string;
  tomtrattsavgald: string;
  konstruktionMaterial: string;
  taktyp: string;
  renoveringsar: string;
  floors: string;
  biarea: string;
  tilltradesdag: string;
  platform: "hemnet" | "booli" | "general";
  writingStyle: "factual" | "balanced" | "selling";
  visningstid: string;
  maklarnamn: string;
  maklartelefon: string;
}

// ── CHIP OPTIONS ──
const KITCHEN_CHIPS = [
  "Renoverat kök", "Köksö", "Stenbänk/komposit",
  "Integrerade vitvaror", "Platsbyggt kök", "Matplats 4–6 pers",
  "Öppen planlösning", "Vitvaror uppdaterade", "Fönster vid matplats",
];
const BATHROOM_CHIPS = [
  "Helkaklat", "Renoverat badrum", "Duschvägg i glas",
  "Badkar", "Tvättmaskin", "Torktumlare",
];
const FLOORING_CHIPS = [
  "Ekparkett", "Originalparkett", "Björkparkett",
  "Massivt trägolv", "Klinker", "Stengolv",
];
const HEATING_CHIPS = [
  "Fjärrvärme", "Bergvärme", "Luft-vattenvärmepump", "Luft-luftvärmepump",
  "Golvvärme", "Frånluftsvärmepump", "Vattenburen värme",
];
const SPECIAL_CHIPS = [
  "Stambyte genomfört", "Nya fönster", "Nytt tak",
  "Dränering utförd", "Solceller", "Fiber indraget",
  "Braskamin", "Kakelugn", "Originaldetaljer",
];
const GARDEN_CHIPS = [
  "Välskött trädgård", "Uteplats i söder", "Altan/trädäck",
  "Fruktträd", "Insynsskyddat", "Förråd/bod", "Pergola", "Eldstad ute",
];
const USP_CHIPS = [
  "Söderläge", "Fri utsikt", "Ingen insyn", "Lugn gårdssida",
  "Genomgående planlösning", "Låg avgift", "Stabil BRF",
  "Renoverat kök med årtal", "Renoverat badrum med årtal",
  "Nära pendling", "Garage/laddbox", "Flera badrum",
];
const PARKING_CHIPS = [
  "Garage", "Dubbelgarage", "Carport", "P-plats",
  "Garageplats", "Boendeparkering", "Laddbox för elbil", "Förberett för laddbox",
];
const ROOF_CHIPS = [
  "Plåttak", "Betongpannor", "Tegeltak", "Papptak", "Platt tak",
];
const MATERIAL_CHIPS = [
  "Trä", "Tegel", "Puts", "Betong", "Plåt", "Leca",
];
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
function ChipSelector({ chips, selected, onToggle, variant = "default", tooltips }: {
  chips: string[];
  selected: string[];
  onToggle: (chip: string) => void;
  variant?: "default" | "kitchen" | "bathroom" | "flooring" | "heating" | "special" | "garden" | "usp" | "parking" | "roof" | "material";
  tooltips?: Record<string, string>;
}) {
  const getChipClasses = (isOn: boolean) => {
    if (!isOn) return "bg-background text-muted-foreground border-border hover:bg-accent hover:border-accent-hover";

    const variantClasses = {
      default: "bg-primary text-primary-foreground border-primary hover:bg-primary-hover",
      kitchen: "bg-warning-bg text-warning border-warning hover:bg-warning-bg/80",
      bathroom: "bg-info-bg text-info border-info hover:bg-info-bg/80",
      flooring: "bg-secondary text-secondary-foreground border-secondary-border hover:bg-accent",
      heating: "bg-error-bg text-error border-error hover:bg-error-bg/80",
      special: "bg-accent text-accent-foreground border-border hover:bg-accent-hover",
      garden: "bg-success-bg text-success border-success hover:bg-success-bg/80",
      usp: "bg-warning-bg text-warning border-warning hover:bg-warning-bg/80",
      parking: "bg-info-bg text-info border-info hover:bg-info-bg/80",
      roof: "bg-warning-bg text-warning border-warning hover:bg-warning-bg/80",
      material: "bg-muted text-muted-foreground border-border hover:bg-accent",
    };
    return variantClasses[variant];
  };

  const handleKeyDown = (e: React.KeyboardEvent, chip: string) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle(chip);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
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
            aria-label={chip}
            className={`px-2.5 py-1 md:py-2 md:px-3 text-xs rounded-full border transition-all font-medium select-none focus:ring-2 focus:ring-ring focus:ring-offset-1 inline-flex items-center gap-1 ${chipClasses}`}
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

// PriorityChecklist Component
interface PriorityItem {
  label: string;
  completed: boolean;
  fieldName: string;
  priority: 'critical' | 'important' | 'optional';
}

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
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-warning bg-warning-bg';
      case 'important': return 'border-success bg-success-bg';
      case 'optional': return 'border-border bg-muted';
      default: return 'border-border bg-muted';
    }
  };
  
  const getPriorityAccent = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-warning';
      case 'important': return 'bg-success';
      case 'optional': return 'bg-muted-foreground';
      default: return 'bg-muted-foreground';
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
      
      <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            percentage < 40 ? 'bg-warning' : percentage < 70 ? 'bg-success' : 'bg-success'
          }`}
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

// FieldGroup Component
interface FieldGroupProps {
  title: string;
  icon?: React.ReactNode;
  priority?: 'critical' | 'important' | 'optional';
  defaultExpanded?: boolean;
  persistKey?: string;
  children: React.ReactNode;
  helpText?: string;
}

function FieldGroup({ 
  title, 
  icon, 
  priority = 'optional', 
  defaultExpanded = true, 
  persistKey,
  children,
  helpText 
}: FieldGroupProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (!persistKey) return defaultExpanded;
    try {
      const saved = localStorage.getItem(`fieldgroup-${persistKey}`);
      return saved !== null ? saved === 'true' : defaultExpanded;
    } catch {
      return defaultExpanded;
    }
  });
  
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (persistKey) {
      try {
        localStorage.setItem(`fieldgroup-${persistKey}`, String(newState));
      } catch {
        // Ignore localStorage errors
      }
    }
  };
  
  const getPriorityColor = () => {
    switch (priority) {
      case 'critical': return 'bg-warning-bg border-warning';
      case 'important': return 'bg-success-bg border-success';
      case 'optional': return 'bg-muted border-border';
      default: return 'bg-muted border-border';
    }
  };
  
  const getPriorityAccent = () => {
    switch (priority) {
      case 'critical': return 'text-warning';
      case 'important': return 'text-success';
      case 'optional': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };
  
  return (
    <div className={`rounded-lg border p-4 ${getPriorityColor()}`}>
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between mb-3 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          {icon && <span className={getPriorityAccent()}>{icon}</span>}
          <h3 className={`text-sm font-semibold ${getPriorityAccent()}`}>{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      {helpText && isExpanded && (
        <p className="text-xs text-muted-foreground mb-3">{helpText}</p>
      )}
      
      {isExpanded && <div className="space-y-3">{children}</div>}
    </div>
  );
}

// FieldImpactBadge Component
type TextImpact = 'huvudtext' | 'rubrik' | 'socialt' | 'alla' | 'metadata' | 'juridiskt';

interface FieldImpactBadgeProps {
  impacts: TextImpact[];
  examples?: string[];
}

function FieldImpactBadge({ impacts, examples }: FieldImpactBadgeProps) {
  const getImpactLabel = (impact: TextImpact) => {
    switch (impact) {
      case 'huvudtext': return 'Huvudtext';
      case 'rubrik': return 'Rubrik';
      case 'socialt': return 'Socialt';
      case 'alla': return 'Alla texter';
      case 'metadata': return 'Metadata';
      case 'juridiskt': return 'Juridiskt';
      default: return impact;
    }
  };
  
  const getImpactColor = (impact: TextImpact) => {
    switch (impact) {
      case 'huvudtext': return 'bg-blue-100 text-blue-700';
      case 'rubrik': return 'bg-purple-100 text-purple-700';
      case 'socialt': return 'bg-pink-100 text-pink-700';
      case 'alla': return 'bg-green-100 text-green-700';
      case 'metadata': return 'bg-gray-100 text-gray-700';
      case 'juridiskt': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {impacts.map((impact, index) => (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getImpactColor(impact)}`}>
              {getImpactLabel(impact)}
            </span>
          </TooltipTrigger>
          {examples && examples.length > 0 && (
            <TooltipContent>
              <p className="text-xs font-semibold mb-1">Påverkar:</p>
              <ul className="text-xs space-y-0.5">
                {examples.map((example, i) => (
                  <li key={i}>• {example}</li>
                ))}
              </ul>
            </TooltipContent>
          )}
        </Tooltip>
      ))}
    </div>
  );
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
  const [parkingChips, setParkingChips] = useState<string[]>([]);
  const [roofChips, setRoofChips] = useState<string[]>([]);
  const [materialChips, setMaterialChips] = useState<string[]>([]);

  // UI state
  const [showDetails, setShowDetails] = useState(false);
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<PropertyFormData | null>(null);

  const modelLimits = { min: 200, max: 600, defaultMin: 350, defaultMax: 450 };
  const [wordCountMin, setWordCountMin] = useState(modelLimits.defaultMin);
  const [wordCountMax, setWordCountMax] = useState(modelLimits.defaultMax);
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
      fastighetsbeteckning: "",
      taxeringsvarde: "",
      tomtrattsavgald: "",
      konstruktionMaterial: "",
      taktyp: "",
      renoveringsar: "",
      floors: "",
      biarea: "",
      tilltradesdag: "",
      platform: "hemnet",
      writingStyle: "balanced",
      visningstid: "",
      maklarnamn: "",
      maklartelefon: "",
    },
  });

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
  const isApartmentType = selectedType === "apartment" || selectedType === "townhouse";
  const isHouseType = selectedType === "house" || selectedType === "villa";
  const hasKitchenBathroomFacts = Boolean(kitchenValue?.trim() || bathroomValue?.trim() || kitchenChips.length > 0 || bathroomChips.length > 0);
  const hasLocationFacts = Boolean(transportValue?.trim() || neighborhoodValue?.trim());
  const hasStrongDifferentiator = Boolean(uspValue?.trim() || uspChips.length > 0 || viewValue?.trim());
  
  // Priority checklist items with field references for scroll-to functionality
  const priorityItems: PriorityItem[] = [
    { label: "Adress", completed: Boolean(addressValue?.trim()), fieldName: "address", priority: "critical" },
    { label: "Boarea", completed: Boolean(livingAreaValue?.trim()), fieldName: "livingArea", priority: "critical" },
    { label: "Rum & badrum", completed: Boolean((rooms || 0) > 0 && (bathrooms || 0) > 0), fieldName: "totalRooms", priority: "critical" },
    { label: "Kök & badrum", completed: hasKitchenBathroomFacts, fieldName: "kitchenDescription", priority: "important" },
    { label: "Läge & transport", completed: hasLocationFacts, fieldName: "transport", priority: "important" },
    { label: "Försäljningsargument", completed: hasStrongDifferentiator, fieldName: "uniqueSellingPoints", priority: "critical" },
    { label: "Planlösning & skick", completed: Boolean(layoutValue?.trim() || conditionValue?.trim()), fieldName: "layout", priority: "important" },
  ];
  
  const priorityChecklist = priorityItems.map(item => item.completed);
  const priorityCompleted = priorityChecklist.filter(Boolean).length;
  
  // Scroll to field handler
  const handleScrollToField = useCallback((fieldName: string) => {
    const element = document.querySelector(`[name="${fieldName}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add temporary highlight
      element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
      }, 2000);
    }
  }, []);

  // Merge chips + freetext into pipeline-compatible field values, then submit
  const onLocalSubmit = (values: PropertyFormData) => {
    // Check if priority fields are incomplete (less than 4 completed)
    if (priorityCompleted < 4) {
      setPendingFormData(values);
      setShowIncompleteDialog(true);
      return;
    }
    
    // Proceed with submission
    submitForm(values);
  };
  
  const submitForm = (values: PropertyFormData) => {
    // Canonical rules for chip normalization - maps aliases to canonical forms
    const CANONICAL_RULES: Array<{ canonical: string; pattern: RegExp }> = [
      // Laddning för elbilar
      { canonical: "Laddbox för elbil", pattern: /\b(laddplats elbil|laddplats för elbil|laddbox(?: installerad)?|elbilsladdare)\b/i },
      
      // Fönster
      { canonical: "Nya fönster", pattern: /\b(fönster bytta|nya fönster|fönsterbyte|uppdaterade fönster)\b/i },
      
      // Stammar
      { canonical: "Stambyte genomfört", pattern: /\b(stambyte|stamrenovering|nya stammar)\b/i },
      
      // Golvvärme (kan finnas i både badrum och uppvärmning)
      { canonical: "Golvvärme", pattern: /\b(golvvärme|varmvatten i golv)\b/i },
      
      // Balkong/uteplats
      { canonical: "Balkong", pattern: /\b(balkong|uteplats på balkong)\b/i },
      { canonical: "Altan", pattern: /\b(altan|uteplats)\b/i },
      
      // Parkering
      { canonical: "Garage", pattern: /\b(garage|carport med garage)\b/i },
      { canonical: "Carport", pattern: /\b(carport|biltak)\b/i },
      
      // Kök
      { canonical: "Öppen planlösning", pattern: /\b(öppen planlösning|öppet kök|kök öppet mot vardagsrum)\b/i },
      { canonical: "Vitvaror uppdaterade", pattern: /\b(vitvaror uppdaterade|nya vitvaror|moderna vitvaror)\b/i },
      
      // Badrum
      { canonical: "Renoverat badrum", pattern: /\b(renoverat badrum|nyrenoverat badrum|badrum renoverat)\b/i },
      { canonical: "Helkaklat", pattern: /\b(helkaklat|helkaklat badrum)\b/i },
      
      // Golv
      { canonical: "Ekparkett", pattern: /\b(ekparkett|parkett i ek)\b/i },
      { canonical: "Massivt trägolv", pattern: /\b(massivt trägolv|massiv parkett)\b/i },
      
      // Uppvärmning
      { canonical: "Fjärrvärme", pattern: /\b(fjärrvärme|stadsvärme)\b/i },
      { canonical: "Bergvärme", pattern: /\b(bergvärme|bergvärmepump)\b/i },
      
      // Trädgård
      { canonical: "Stor trädgård", pattern: /\b(stor trädgård|rymlig trädgård|generös trädgård)\b/i },
      { canonical: "Altan", pattern: /\b(altan|uteplats|terrass)\b/i },
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
      // Detect conflicts: same info in both chips and freetext
      if (chips.length > 0 && text.trim()) {
        const textLower = text.toLowerCase();
        const conflicts: string[] = [];
        
        chips.forEach(chip => {
          const chipLower = chip.toLowerCase();
          // Check if chip text appears in freetext
          if (textLower.includes(chipLower)) {
            conflicts.push(chip);
          }
          
          // Check canonical aliases
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

    if (merged.fastighetsbeteckning) d += `Fastighetsbeteckning: ${merged.fastighetsbeteckning}\n`;
    if (merged.taxeringsvarde) d += `Taxeringsvärde: ${merged.taxeringsvarde} kr\n`;
    if (merged.tomtrattsavgald) d += `Tomträttsavgäld: ${merged.tomtrattsavgald} kr/år\n`;
    if (merged.renoveringsar) d += `Renoverat: ${merged.renoveringsar}\n`;
    if (merged.tilltradesdag) d += `Tilltr\u00e4de: ${merged.tilltradesdag}\n`;

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
    if (merged.buildYear) d += `Bygg\u00e5r: ${merged.buildYear}\n`;
    if (merged.floors) d += `Antal plan: ${merged.floors}\n`;
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
    if (merged.flooring || merged.heating || merged.konstruktionMaterial || merged.taktyp) {
      d += "\n=== MATERIAL & TEKNIK ===\n";
      if (merged.flooring) d += `Golvmaterial: ${merged.flooring}\n`;
      if (merged.heating) d += `Uppvärmning: ${merged.heating}\n`;
      if (merged.konstruktionMaterial) d += `Byggnadsmaterial: ${merged.konstruktionMaterial}\n`;
      if (merged.taktyp) d += `Taktyp: ${merged.taktyp}\n`;
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
      ...(uploadedImages.length > 0 && { imageUrls: uploadedImages }),
    });

    // Clear draft on successful submit
    try {
      localStorage.removeItem('optiprompt-form-draft');
      localStorage.removeItem('optiprompt-form-chips');
    } catch { }
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

  // Keyboard shortcut: Cmd/Ctrl+Enter to submit
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

  // ── DRAFT PERSISTENCE: Restore saved draft on mount ──
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
          'otherInfo', 'fastighetsbeteckning', 'taxeringsvarde', 'tomtrattsavgald',
          'konstruktionMaterial', 'taktyp', 'renoveringsar', 'floors', 'biarea',
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
    } catch { /* ignore corrupted drafts */ }
  }, []);

  // ── DRAFT PERSISTENCE: Auto-save form on changes ──
  useEffect(() => {
    const subscription = form.watch((values) => {
      try {
        localStorage.setItem('optiprompt-form-draft', JSON.stringify({
          ...values,
          rooms, bedrooms, bathrooms, hasBalcony, wordCountMin, wordCountMax,
        }));
      } catch { /* storage full */ }
    });
    return () => subscription.unsubscribe();
  }, [form, rooms, bedrooms, bathrooms, hasBalcony, wordCountMin, wordCountMax]);

  // ── DRAFT PERSISTENCE: Auto-save chips on changes ──
  useEffect(() => {
    try {
      localStorage.setItem('optiprompt-form-chips', JSON.stringify({
        kitchen: kitchenChips, bathroom: bathroomChips, flooring: flooringChips,
        heating: heatingChips, special: specialChips, garden: gardenChips,
        usp: uspChips, parking: parkingChips, roof: roofChips, material: materialChips,
      }));
    } catch { /* storage full */ }
  }, [kitchenChips, bathroomChips, flooringChips, heatingChips, specialChips, gardenChips, uspChips, parkingChips, roofChips, materialChips]);

  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onLocalSubmit)} className="space-y-4">

          <div className="mb-1 rounded-xl border px-4 py-3.5 pro-muted-panel">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-success-bg text-success">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Skriv det som faktiskt höjer kvaliteten i en publicerbar objektsbeskrivning</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Prioritera skick, större renoveringar, planlösning, läge och det som avviker positivt från standard. Saker som oftast är standard ska bara nämnas om de faktiskt är särskiljande för objektet.
                </p>
              </div>
            </div>
          </div>

          {/* Priority Checklist */}
          <PriorityChecklist items={priorityItems} onItemClick={handleScrollToField} />

          <div className="mb-5 grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-3">
            <div className="pro-section-card">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Snabbast väg till bra text</p>
                  <p className="text-sm font-semibold mt-1 text-foreground">Fyll det som styr huvudtexten först</p>
                </div>
                <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-success-bg text-success">
                  {priorityCompleted}/{priorityChecklist.length} klara
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {[
                  ["Adress", Boolean(addressValue?.trim())],
                  ["Boarea", Boolean(livingAreaValue?.trim())],
                  ["Rum och badrum", Boolean((rooms || 0) > 0 && (bathrooms || 0) > 0)],
                  ["Kök/badrum med fakta", hasKitchenBathroomFacts],
                  ["Kommunikation/läge", hasLocationFacts],
                  ["Särskiljande styrkor", hasStrongDifferentiator],
                  ["Planlösning/skick", Boolean(layoutValue?.trim() || conditionValue?.trim())],
                ].map(([label, done]) => (
                  <div key={String(label)} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${done ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'}`}>
                      {done ? "✓" : "•"}
                    </div>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pro-section-card">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground">Så används dina fält i modellen</p>
              <div className="space-y-2 text-xs">
                <div className="rounded-lg px-3 py-2 bg-success-bg text-success">
                  <span className="font-semibold">Direkt i huvudtexten:</span>
                  <span> adress, boarea, rum, kök/badrum, kommunikationer och tydliga säljpunkter.</span>
                </div>
                <div className="rounded-lg px-3 py-2 bg-muted text-muted-foreground">
                  <span className="font-semibold text-foreground">Kontext till AI:n:</span>
                  <span> energi, material, förråd, taktyp och övrigt vägs in men skrivs bara ut när de stärker köparnyttan.</span>
                </div>
                <div className="rounded-lg px-3 py-2 bg-muted text-muted-foreground">
                  <span className="font-semibold text-foreground">Regel:</span>
                  <span> lägg laddbox under Parkering och undvik att upprepa samma fakta i flera fält.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 1: OBJEKTTYP ── */}
          <div className="pro-section-card">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Objekttyp
              </label>
              <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-success-bg text-success">
                <CheckCircle2 className="w-3 h-3" />
                Steg 1
              </div>
            </div>
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
                  className={`px-4 py-2 text-sm rounded-lg border transition-all font-medium ${
                    selectedType === t.value 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background text-muted-foreground border-input hover:bg-accent'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── SECTION 2: GRUNDFAKTA ── */}
          <div className="pro-section-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Grundfakta
                </label>
                <p className="text-xs mt-1 text-muted-foreground">Det här är basen för hela objektbeskrivningen. Fyll i detta först för bäst resultat.</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-warning-bg text-warning">
                <div className="w-3 h-3 rounded-full border-2 border-warning" />
                Högst prioritet
              </div>
            </div>

            {/* Address + Area */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField control={form.control} name="address" rules={{ required: "Ange adress" }} render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel className="text-xs text-gray-500">Adress *</FormLabel>
                  <div className="flex gap-2">
                    <FormControl><Input placeholder="Ex: Karlavägen 12, 114 31 Stockholm" {...field} className={`${exampleInputClass} flex-1`} /></FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={addressLookupLoading || !field.value}
                      className="h-10 text-xs px-3 whitespace-nowrap border-input text-primary disabled:text-muted-foreground"
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
                    <p className="text-xs mt-1 text-success">
                      ✓ {addressLookupResult} — kollektivtrafik och närområde ifyllt
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="area" rules={{ required: "Ange område" }} render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Stadsdel / Område *</FormLabel>
                  <FormControl><Input placeholder="Ex: Vasastan, Linnéstaden eller Centrala Sundbyberg" {...field} className={exampleInputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Size + Price + Fee */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              <FormField control={form.control} name="livingArea" rules={{ required: "Ange boarea" }} render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Boarea (kvm) *</FormLabel>
                  <FormControl><Input type="number" placeholder="Ex: 84" {...field} className={exampleInputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Pris (kr)</FormLabel>
                  <FormControl><Input type="number" placeholder="Ex: 4 495 000" {...field} className={exampleInputClass} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="monthlyFee" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">
                    {isApartmentType ? "Avgift (kr/mån)" : "Driftskostnad (kr/år)"}
                  </FormLabel>
                  <FormControl><Input type="number" placeholder={isApartmentType ? "Ex: 3 842" : "Ex: 39 600"} {...field} className={exampleInputClass} /></FormControl>
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
                      <FormControl><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="bg-white border border-input shadow-lg">
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
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <FormField control={form.control} name="floor" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Våning</FormLabel>
                      <FormControl><Input placeholder="Ex: 3 av 5" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="brfName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">BRF-namn</FormLabel>
                      <FormControl><Input placeholder="Ex: Brf Lokstallet 7" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="buildYear" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Byggår</FormLabel>
                      <FormControl><Input type="number" placeholder="Ex: 1998" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="elevator" render={({ field }) => (
                    <FormItem className="flex flex-row items-end gap-2 space-y-0 pb-1">
                      <FormControl>
                        <button
                          type="button"
                          onClick={() => field.onChange(!field.value)}
                          className={`px-3.5 py-2 text-xs rounded-lg border transition-all font-medium ${
                            field.value 
                              ? 'bg-primary text-primary-foreground border-primary' 
                              : 'bg-background text-muted-foreground border-input'
                          }`}
                        >
                          {field.value ? "✓ Hiss" : "Hiss"}
                        </button>
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <FormField control={form.control} name="taxeringsvarde" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-xs text-gray-500">Taxeringsvärde (kr)</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Skatteverkets värdering. Finns på taxeringsbeslut.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl><Input type="number" placeholder="Ex: 1 245 000" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="renoveringsar" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Viktiga renoveringar</FormLabel>
                      <p className="text-[10px] text-gray-400 mb-1">Fyll bara i sådant som inte redan framgår i kök, badrum eller andra fält ovan.</p>
                      <FormControl><Input placeholder="Ex: Hall renoverad 2022, nya ytskikt 2021, badrum stamrenoverat 2018" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </>
            )}

            {/* House/Villa-specific */}
            {isHouseType && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <FormField control={form.control} name="buildYear" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Byggår</FormLabel>
                      <FormControl><Input type="number" placeholder="Ex: 1987" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="floors" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Antal plan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Välj..." /></SelectTrigger></FormControl>
                        <SelectContent className="bg-white border border-input shadow-lg">
                          {PROPERTY_FLOORS_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lotArea" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Tomtarea (kvm)</FormLabel>
                      <FormControl><Input type="number" placeholder="Ex: 824" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="biarea" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Biarea (kvm)</FormLabel>
                      <FormControl><Input type="number" placeholder="Ex: 38" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <FormField control={form.control} name="fastighetsbeteckning" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-xs text-gray-500">Fastighetsbeteckning</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Finns på köpebrev/lagfart. Format: KOMMUN STADSDEL 1:23</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl><Input placeholder="Ex: Nacka Sicklaön 145:7" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="taxeringsvarde" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-xs text-gray-500">Taxeringsvärde (kr)</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Skatteverkets värdering. Finns på taxeringsbeslut.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl><Input type="number" placeholder="Ex: 2 673 000" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tomtrattsavgald" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-xs text-gray-500">Tomträttsavgäld (kr/år)</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Årlig avgift till markägare (oftast kommun). Endast för tomträtt.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl><Input type="number" placeholder="Ex: 9 600" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="renoveringsar" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Viktiga renoveringar</FormLabel>
                      <p className="text-[10px] text-gray-400 mb-1">Ange bara större åtgärder som inte redan framgår tydligt i övriga fält.</p>
                      <FormControl><Input placeholder="Ex: Tak omlagt 2021, dränering utförd 2019, kök renoverat 2018" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </>
            )}

            {/* Balcony toggle + details */}
            <div className="mt-3 flex items-start gap-4">
              <button
                type="button"
                onClick={() => setHasBalcony(!hasBalcony)}
                className={`px-3.5 py-2 text-xs rounded-lg border transition-all font-medium shrink-0 mt-5 ${
                  hasBalcony 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background text-muted-foreground border-input'
                }`}
              >
                {hasBalcony ? "✓ Balkong/Uteplats" : "Balkong/Uteplats"}
              </button>
              {hasBalcony && (
                <div className="flex gap-3 flex-1">
                  <FormField control={form.control} name="balconyArea" render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-xs text-gray-500">Storlek (kvm)</FormLabel>
                      <FormControl><Input type="number" placeholder="Ex: 7" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="balconyDirection" render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-xs text-gray-500">Väderstreck</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Välj..." /></SelectTrigger></FormControl>
                        <SelectContent className="bg-white border border-input shadow-lg">
                          {BALCONY_DIRECTIONS.map((dir) => <SelectItem key={dir} value={dir}>{dir}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              )}
            </div>

            {/* Tillträdesdag — all property types */}
            <div className="mt-3">
              <FormField control={form.control} name="tilltradesdag" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Tillträdesdag</FormLabel>
                  <FormControl><Input placeholder="Ex: Enligt överenskommelse eller snabbt tillträde möjligt" {...field} className={exampleInputClass} /></FormControl>
                </FormItem>
              )} />
            </div>
          </div>

          {/* ── SECTION 3: KÖK & BADRUM (chip-based) ── */}
          <div className="pro-section-card">
            <label className="text-xs font-semibold uppercase tracking-wider block mb-3 text-muted-foreground">
              Kök & Badrum
            </label>
            <div className="space-y-4">
              {/* Kitchen chips */}
              <div>
                <span className="text-xs text-gray-500 font-medium block mb-2">Kök — välj det som stämmer</span>
                <ChipSelector chips={KITCHEN_CHIPS} selected={kitchenChips} onToggle={(c) => toggleChip(kitchenChips, setKitchenChips, c)} variant="kitchen" />
                <FormField control={form.control} name="kitchenDescription" render={({ field }) => (
                  <FormItem className="mt-2">
                    <p className="text-[10px] text-gray-400 mb-1">Komplettera bara chipsen med sådant som ger bättre text, till exempel material, fabrikat eller årtal.</p>
                    <FormControl>
                      <Input placeholder="Ex: Marbodalkök från 2019, bänkskiva i kvartskomposit och full maskinell utrustning från Siemens" {...field} className={exampleCompactInputClass} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              {/* Bathroom chips */}
              <div>
                <span className="text-xs text-gray-500 font-medium block mb-2">Badrum — välj det som stämmer</span>
                <ChipSelector chips={BATHROOM_CHIPS} selected={bathroomChips} onToggle={(c) => toggleChip(bathroomChips, setBathroomChips, c)} variant="bathroom" />
                <FormField control={form.control} name="bathroomDescription" render={({ field }) => (
                  <FormItem className="mt-2">
                    <p className="text-[10px] text-gray-400 mb-1">Lägg bara till fakta som inte redan täcks av chipsen, till exempel årtal, tvättdel eller materialval.</p>
                    <FormControl>
                      <Input placeholder="Ex: Badrum renoverat 2020 med golvvärme, duschvägg i glas och kombimaskin under arbetsbänk" {...field} className={exampleCompactInputClass} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
            </div>
          </div>

          {/* ── SECTION 4: SÄLJPUNKTER (prominent!) ── */}
          <div className="pro-section-card">
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-success">
              ★ Vad gör objektet speciellt?
            </label>
            <p className="text-[10px] text-gray-400 mb-3">
              Det här påverkar textens styrka mest. Välj och/eller beskriv med egna ord. Ju mer specifik desto bättre text.
            </p>
            <ChipSelector chips={USP_CHIPS} selected={uspChips} onToggle={(c) => toggleChip(uspChips, setUspChips, c)} variant="usp" />
            <FormField control={form.control} name="uniqueSellingPoints" render={({ field }) => (
              <FormItem className="mt-2">
                <FormControl>
                  <Textarea
                    placeholder="Ex: Balkong om cirka 7 kvm i söderläge med eftermiddags- och kvällssol. Genomgående planlösning, originalparkett och fritt läge mot lugn innergård."
                    {...field}
                    className={exampleTextareaClass}
                  />
                </FormControl>
              </FormItem>
            )} />
          </div>

          {/* ── SECTION 5: PLANLÖSNING (optional freetext) ── */}
          <div className="pro-section-card">
            <FormField control={form.control} name="layoutDescription" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-500">Planlösning & rumsbeskrivning (valfritt)</FormLabel>
                <p className="text-[10px] text-gray-400 mb-1">Beskriv flödet mellan rummen och bara sådant som hjälper mäklartexten framåt. Upprepa inte rena fakta som redan finns ovan.</p>
                <FormControl>
                  <Textarea
                    placeholder="Ex: Hall med avhängning och garderober. Kök och vardagsrum i öppen planlösning med naturlig plats för matbord intill fönster. Sovrum mot gård med garderobsvägg och ytterligare rum som passar bra som barnrum eller kontor."
                    {...field}
                    className={exampleTextareaClass}
                  />
                </FormControl>
              </FormItem>
            )} />
          </div>

          {/* ── SECTION 6: MER DETALJER (expandable) ── */}
          <div className="pro-section-card">
            <p className="text-[10px] text-gray-400 mb-2">
              Detaljerna här fungerar främst som kontext. De skrivs ut i huvudtexten när de stärker beslutsvärdet.
            </p>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                showDetails 
                  ? 'bg-success-bg border-success' 
                  : 'bg-background border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${showDetails ? 'text-success' : 'text-foreground'}`}>Material, läge &amp; fler detaljer</span>
                {!showDetails && (
                  <span className="text-xs text-muted-foreground">— golv, uppvärmning, parkering, utsikt och mer</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {!showDetails && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Bra att ha
                  </span>
                )}
                <span className={`text-xs font-semibold ${showDetails ? 'text-success' : 'text-muted-foreground'}`}>
                  {showDetails ? "Dölj" : "Lägg till"}
                </span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showDetails && (
              <div className="mt-3 pb-1 space-y-4 pro-muted-panel p-4">
                {/* Flooring chips */}
                <div>
                  <span className="text-xs text-gray-500 font-medium block mb-2">Golv</span>
                  <ChipSelector chips={FLOORING_CHIPS} selected={flooringChips} onToggle={(c) => toggleChip(flooringChips, setFlooringChips, c)} />
                  <FormField control={form.control} name="flooring" render={({ field }) => (
                    <FormItem className="mt-2">
                      <FormControl><Input placeholder="Ex: Enstavsparkett i vardagsrum och sovrum, klinker med golvvärme i hall och badrum" {...field} className={exampleCompactInputClass} /></FormControl>
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
                  <p className="text-[10px] text-gray-400 mb-1">Välj sådant som inte redan täcks av kök, badrum, parkering eller trädgård.</p>
                  <ChipSelector chips={SPECIAL_CHIPS} selected={specialChips} onToggle={(c) => toggleChip(specialChips, setSpecialChips, c)} />
                  <FormField control={form.control} name="specialFeatures" render={({ field }) => (
                    <FormItem className="mt-2">
                      <FormControl><Input placeholder="Ex: Stambyte 2017, fungerande kakelugn och platsbyggd förvaring i vardagsrum" {...field} className={exampleCompactInputClass} /></FormControl>
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
                        <FormControl><Input placeholder="Ex: Plan trädgårdstomt med häck, äppelträd, odlingslådor och stor altan i västerläge" {...field} className={exampleCompactInputClass} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                )}

                {/* View + Transport */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField control={form.control} name="view" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Utsikt</FormLabel>
                      <FormControl><Input placeholder="Ex: Fri utsikt över park, grönska och takåsar" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="transport" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Kommunikationer</FormLabel>
                      <FormControl><Input placeholder="Ex: Cirka 4 min promenad till tunnelbana och buss runt hörnet" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Neighborhood */}
                <FormField control={form.control} name="neighborhood" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Områdesbeskrivning</FormLabel>
                    <FormControl><Input placeholder="Ex: Närhet till mataffärer, caféer, förskola, gym och grönområden inom några minuters promenad" {...field} className={exampleInputClass} /></FormControl>
                  </FormItem>
                )} />

                {/* Energy & Storage */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="energyClass" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Energiklass</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Välj..." /></SelectTrigger></FormControl>
                        <SelectContent className="bg-white border border-input shadow-lg">
                          {ENERGY_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="storage" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-gray-500">Förråd</FormLabel>
                      <FormControl><Input placeholder="Ex: Källarförråd om cirka 6 kvm samt matkällare" {...field} className={exampleInputClass} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Parking chips */}
                <div>
                  <span className="text-xs text-gray-500 font-medium block mb-2">Parkering</span>
                  <p className="text-[10px] text-gray-400 mb-1">Laddbox och garageinfo ska ligga här för att undvika dubbla formuleringar i texten.</p>
                  <ChipSelector chips={PARKING_CHIPS} selected={parkingChips} onToggle={(c) => toggleChip(parkingChips, setParkingChips, c)} />
                  <FormField control={form.control} name="parking" render={({ field }) => (
                    <FormItem className="mt-2">
                      <FormControl><Input placeholder="Ex: Isolerat garage med laddbox samt uppfart med plats för två bilar" {...field} className={exampleCompactInputClass} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* House/Villa: Building material + roof type */}
                {isHouseType && (
                  <>
                    <div>
                      <span className="text-xs text-gray-500 font-medium block mb-2">Byggnadsmaterial</span>
                      <ChipSelector chips={MATERIAL_CHIPS} selected={materialChips} onToggle={(c) => toggleChip(materialChips, setMaterialChips, c)} />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 font-medium block mb-2">Taktyp</span>
                      <ChipSelector chips={ROOF_CHIPS} selected={roofChips} onToggle={(c) => toggleChip(roofChips, setRoofChips, c)} />
                    </div>
                  </>
                )}

                {/* Other info */}
                <FormField control={form.control} name="otherInfo" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-500">Övrig information</FormLabel>
                      <FormControl><Input placeholder="Ex: Stambyte utfört 2015, nya 3-glasfönster 2021 och dokumenterat låg energiförbrukning senaste 12 månaderna" {...field} className={exampleInputClass} /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}
          </div>

          {/* ── SECTION 6b: VISNINGSINFORMATION ── */}
          <div className="pro-section-card">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Visningsinformation
              </label>
              <span className="text-xs text-muted-foreground">Valfritt — för visningsinbjudan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField control={form.control} name="visningstid" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Visningstid</FormLabel>
                  <FormControl><Input placeholder="Ex: Sön 15 juni kl. 13:00-14:00" {...field} className={exampleInputClass} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="maklarnamn" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Mäklarens namn</FormLabel>
                  <FormControl><Input placeholder="Ex: Anna Svensson" {...field} className={exampleInputClass} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="maklartelefon" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Telefon</FormLabel>
                  <FormControl><Input placeholder="Ex: 070-123 45 67" {...field} className={exampleInputClass} /></FormControl>
                </FormItem>
              )} />
            </div>
          </div>

          {/* ── SECTION 7: PLATTFORM, STIL & SUBMIT ── */}
          <div className="pro-section-card space-y-4">

            {/* Platform + Writing style — compact */}
            <div className="flex flex-wrap gap-6 pro-muted-panel px-3.5 py-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block mb-2 text-muted-foreground">Plattform</span>
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
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                        selectedPlatform === p.value 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-background text-muted-foreground border-input'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block mb-2 text-muted-foreground">Textstil</span>
                <div className="flex gap-1.5">
                  {([
                    { value: "factual" as const, label: "Faktabaserad" },
                    { value: "balanced" as const, label: "Balanserad" },
                    { value: "selling" as const, label: "Säljande" },
                  ]).map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => form.setValue("writingStyle", s.value)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                        selectedStyle === s.value 
                          ? 'bg-foreground text-background border-foreground' 
                          : 'bg-background text-muted-foreground border-input'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-1.5 text-muted-foreground">
                  {selectedStyle === "factual" && "Saklig och rak ton med fokus på verifierbara fakta."}
                  {selectedStyle === "balanced" && "Fakta i fokus med naturlig rytm och tydlig köparnytta."}
                  {selectedStyle === "selling" && "Mer säljtryck och tydlig vinkel utan klyschor."}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-input px-3.5 py-3 bg-muted">
              <span className="text-xs font-medium text-muted-foreground">
                Hemnet använder hårdast klyschfilter. Booli/Egen sida tillåter mer berättande ton när fakta förblir konkreta.
              </span>
            </div>

            {/* Pro: word count */}
            {isPro && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-400 font-medium">Textlängd:</span>
                <div className="flex items-center gap-2">
                  <Select value={String(wordCountMin)} onValueChange={(v: string) => handleWordCountMin(Number(v))}>
                    <SelectTrigger className="h-8 w-24 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border border-input shadow-lg">
                      {Array.from({ length: Math.floor((modelLimits.max - modelLimits.min) / 50) + 1 }, (_, i) => modelLimits.min + i * 50).map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} ord</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-gray-400">till</span>
                  <Select value={String(wordCountMax)} onValueChange={(v: string) => handleWordCountMax(Number(v))}>
                    <SelectTrigger className="h-8 w-24 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border border-input shadow-lg">
                      {Array.from({ length: Math.floor((modelLimits.max - modelLimits.min) / 50) + 1 }, (_, i) => modelLimits.min + i * 50).map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} ord</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-gray-400 ml-2">(anpassas efter din plan)</span>
                </div>
              </div>
            )}

            {/* AI Model Info - Fixed GPT-5.2 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium">AI-modell:</span>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-md">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-white">GPT-5.2</span>
                <span className="text-xs text-gray-400">optimerad för objektsbeskrivning</span>
              </div>
            </div>

            {/* Images — Pro feature */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 font-medium">Bilder (valfritt)</span>
                <span className="text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-warning text-warning-foreground">Pro</span>
                {isPro && uploadedImages.length > 0 && (
                  <span className="text-xs text-gray-400 ml-auto">{uploadedImages.length} bild(er)</span>
                )}
              </div>
              {isPro ? (
                <>
                  <div className="border border-dashed border-border rounded-lg p-3 text-center transition-colors hover:border-muted-foreground">
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
                          <img src={img} alt={`Bild ${idx + 1}`} className="w-14 h-14 object-cover rounded-lg border border-input" />
                          <button
                            type="button"
                            onClick={() => setUploadedImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1.5 -right-1.5 bg-error text-error-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="border border-dashed border-input rounded-lg p-3 text-center bg-muted">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Lock className="w-3.5 h-3.5" />
                    Uppgradera till Pro för bildtolkning
                  </div>
                </div>
              )}
            </div>

            {/* Submit - sticky on mobile */}
            <div className="sticky bottom-0 left-0 right-0 pt-4 pb-2 -mx-6 px-6 sm:relative sm:mx-0 sm:px-0 sm:pb-0 bg-gradient-to-t from-muted via-muted to-transparent">
              <Button
                type="submit"
                className="w-full h-12 text-sm font-semibold transition-colors shadow-lg sm:shadow-none bg-primary text-primary-foreground hover:bg-primary-hover"
                disabled={isPending || disabled}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Genererar textpaket...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generera textpaket
                    <span className="hidden sm:inline text-xs ml-2 opacity-60">(⌘↵)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
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
