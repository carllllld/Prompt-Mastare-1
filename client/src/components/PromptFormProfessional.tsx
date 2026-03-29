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
import { VitecImportPicker } from "@/components/IntegrationsPanel";
import { LockedFeature } from "@/components/LockedFeature";
import { EssentialFieldsSection } from "@/components/FormSections/EssentialFieldsSection";
import { ImageSection } from "@/components/FormSections/ImageSection";
import { DetailsSection } from "@/components/FormSections/DetailsSection";
import { CollapsibleChipSelector } from "@/components/FormSections/CollapsibleChipSelector";

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

// ── CHIP OPTIONS ──
const KITCHEN_CHIPS = [
  "Renoverat kök", "Köksö", "Stenbänk", "Kompositbänk",
  "Integrerade vitvaror", "Platsbyggt kök", "Matplats i kök",
  "Öppen planlösning", "Moderna vitvaror", "Fönster vid matplats",
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
  "Braskamin", "Säkerhetsdörr", "Varmvattenberedare",
];
const GARDEN_CHIPS = [
  "Välskött trädgård", "Uteplats i söder", "Altan", "Trädäck",
  "Fruktträd", "Förråd", "Bod", "Pergola",
];
const USP_CHIPS = [
  "Söderläge", "Fri utsikt", "Ingen insyn", "Lugn gårdssida",
  "Genomgående planlösning", "Låg avgift", "Stabil BRF",
  "Nära pendling", "Flera badrum",
  "Hög standard", "Nyproduktion", "Balkong i söder",
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
// Tooltips for technical or unclear chips to improve user understanding
const KITCHEN_TOOLTIPS: Record<string, string> = {
  "Stenbänk": "Bänkskiva i natursten (granit, marmor etc.)",
  "Kompositbänk": "Bänkskiva i kvartskomposit eller liknande",
  "Integrerade vitvaror": "Vitvaror inbyggda i köksinredningen",
  "Platsbyggt kök": "Skräddarsytt kök anpassat efter rummet",
  "Moderna vitvaror": "Nyare vitvaror i gott skick",
  "Matplats i kök": "Plats för matbord med 4–6 sittplatser i köket",
  "Köksö": "Fristående arbetsyta mitt i köket",
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
  "Hiss": "Hiss installerad i fastigheten",
  "Varmvattenberedare": "Egen varmvattenberedare (vanligt i villor)",
  "Originaldetaljer": "Bevarade historiska detaljer från byggnadsåret",
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
  "Laddbox för elbil": "Installerad laddstation för elfordon",
  "Hög standard": "Genomgående hög materialkvalitet och finish",
  "Nyproduktion": "Nybyggd bostad eller färdigställd senaste åren",
  "Balkong i söder": "Balkong med söderläge för maximalt solljus",
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
   * Mäklaraktig Chip Styling - Human Design
   * 
   * Design Philosophy:
   * - Unselected: White background, warm gray border, charcoal text
   * - Selected: Forest green background, white text, subtle checkmark
   * - NO colored variants - all chips look the same
   * - Clean, professional, minimal
   */
  const getChipClasses = (isOn: boolean) => {
    if (!isOn) {
      // Unselected: White with warm gray border
      return "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";
    }
    
    // Selected: Forest green (all variants use same style)
    return "bg-primary text-primary-foreground border-primary hover:bg-primary-hover";
  };

  const handleKeyDown = (e: React.KeyboardEvent, chip: string) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle(chip);
    }
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={id || "Chip-väljare"} id={id}>
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
            className={`min-h-[44px] min-w-[44px] px-3 py-2 text-sm border transition-all font-normal select-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:outline-none inline-flex items-center gap-1.5 ${chipClasses}`}
          >
            {isOn && <CheckCircle2 className="w-3.5 h-3.5" />}
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
                <p className="text-sm">{tooltip}</p>
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
  renderMode?: 'full' | 'essential-only' | 'rest-only';
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
                  <li key={i}>{example}</li>
                ))}
              </ul>
            </TooltipContent>
          )}
        </Tooltip>
      ))}
    </div>
  );
}

// ── SECTION COMPONENT: Collapsible section with color coding ──
interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  color: 'red' | 'blue' | 'gold' | 'green' | 'purple' | 'gray';
  defaultExpanded?: boolean;
  persistKey?: string;
  children: React.ReactNode;
  helpText?: string;
  badge?: React.ReactNode;
}

function Section({ title, icon, color, defaultExpanded = true, persistKey, children, helpText, badge }: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (!persistKey) return defaultExpanded;
    try {
      const saved = localStorage.getItem(`section-${persistKey}`);
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
        localStorage.setItem(`section-${persistKey}`, String(newState));
      } catch {}
    }
  };

  /**
   * Mäklaraktig Section Styling - Human Design
   * 
   * Design Philosophy:
   * - NO colored backgrounds
   * - Subtle left border (4px) indicates section type
   * - White background for all sections
   * - Warm gray border
   * - Charcoal text
   */
  const getBorderAccent = (color: string) => {
    switch (color) {
      case 'red': return 'border-l-amber-500';    // Critical: Amber
      case 'blue': return 'border-l-blue-400';    // Info: Subtle blue
      case 'gold': return 'border-l-amber-400';   // Material: Gold
      case 'green': return 'border-l-primary';    // Success: Forest green
      case 'purple': return 'border-l-purple-400';// Construction: Purple
      case 'gray': return 'border-l-gray-300';    // Optional: Gray
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${getBorderAccent(color)} p-4`}>
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-600">{icon}</span>}
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {badge && <div className="ml-auto">{badge}</div>}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {helpText && isExpanded && (
        <p className="text-sm text-gray-600 mb-3">{helpText}</p>
      )}

      {isExpanded && <div className="space-y-3">{children}</div>}
    </div>
  );
}

export function PromptFormProfessional({ onSubmit, isPending, disabled, isPro = false, renderMode = 'full' }: PromptFormProps) {
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
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<PropertyFormData | null>(null);

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
  const buildYearValue = form.watch("buildYear");
  const energyClassValue = form.watch("energyClass");
  const floorValue = form.watch("floor");
  const elevatorValue = form.watch("elevator");
  const lotAreaValue = form.watch("lotArea");
  const floorsValue = form.watch("floors");

  // Handles importing property data from Hemnet or Vitec and populating the form
  const handleExternalImport = useCallback((propertyData: Record<string, any>) => {
    // Helper: only set if value is non-empty. Always sets both as string (form) and raw (steppers).
    const set = (field: keyof PropertyFormData, value: any) => {
      if (value !== undefined && value !== null && value !== "") {
        form.setValue(field, String(value), { shouldDirty: true });
      }
    };

    // Property type — must be set first as it affects which fields are shown
    if (propertyData.propertyType) {
      form.setValue("propertyType", propertyData.propertyType as any, { shouldDirty: true });
    }

    // Core fields
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

    // Rooms — BOTH the form string field AND the number stepper state must be set
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

    // Floor / building
    set("floor", propertyData.floor);
    set("floors", propertyData.floors || propertyData.totalFloors);
    if (typeof propertyData.elevator === "boolean") {
      form.setValue("elevator", propertyData.elevator, { shouldDirty: true });
    }

    // Descriptions
    set("layoutDescription", propertyData.layoutDescription || propertyData.layout);
    set("kitchenDescription", propertyData.kitchenDescription || propertyData.kitchen);
    set("bathroomDescription", propertyData.bathroomDescription || propertyData.bathroom);
    set("gardenDescription", propertyData.gardenDescription || propertyData.garden);
    set("otherInfo", propertyData.description || propertyData.otherInfo);
    set("view", propertyData.view);

    // Location
    set("transport", propertyData.transport);
    set("neighborhood", propertyData.neighborhood || propertyData.district);

    // Features
    set("parking", propertyData.parking);
    set("storage", propertyData.storage);
    set("heating", propertyData.heating);
    set("flooring", propertyData.flooring);

    // Balcony
    set("balconyArea", propertyData.balconyArea);
    if (propertyData.balconyDirection) {
      form.setValue("balconyDirection", propertyData.balconyDirection as any, { shouldDirty: true });
    }

    // Construction (house types)
    set("konstruktionMaterial", propertyData.constructionMaterial || propertyData.konstruktionMaterial);
    set("taktyp", propertyData.roofType || propertyData.taktyp);

    // Broker / showing info
    set("maklarnamn", propertyData.maklarnamn || propertyData.brokerName);
    set("maklartelefon", propertyData.maklartelefon || propertyData.brokerPhone);
    set("visningstid", propertyData.visningstid || propertyData.showingDate);
    set("tilltradesdag", propertyData.tilltradesdag || propertyData.accessDate);

    // Chip state — special features
    if (Array.isArray(propertyData.specialFeatures) && propertyData.specialFeatures.length > 0) {
      setSpecialChips(propertyData.specialFeatures);
    }
    // Garden chips from Vitec gardenFeatures
    if (Array.isArray(propertyData.gardenFeatures) && propertyData.gardenFeatures.length > 0) {
      setGardenChips(propertyData.gardenFeatures);
    }
    // Images
    if (Array.isArray(propertyData.imageUrls) && propertyData.imageUrls.length > 0) {
      setUploadedImages(propertyData.imageUrls.slice(0, 5));
    }
  }, [form, setRooms, setBedrooms, setBathrooms, setSpecialChips, setGardenChips, setUploadedImages]);
  const isTownhouseType = selectedType === "townhouse";
  const isApartmentType = selectedType === "apartment" || isTownhouseType;
  const isHouseType = selectedType === "house" || selectedType === "villa";
  const isHouseOrTownhouseType = isHouseType || isTownhouseType;
  const hasKitchenBathroomFacts = Boolean(kitchenValue?.trim() || bathroomValue?.trim() || kitchenChips.length > 0 || bathroomChips.length > 0);
  const hasLocationFacts = Boolean(transportValue?.trim() || neighborhoodValue?.trim());
  const hasStrongDifferentiator = Boolean(uspValue?.trim() || uspChips.length > 0 || viewValue?.trim());
  
  // Priority checklist items with field references for scroll-to functionality
  // Updated to include platform-specific mandatory fields
  const priorityItems: PriorityItem[] = [
    { label: "Adress", completed: Boolean(addressValue?.trim()), fieldName: "address", priority: "critical" },
    { label: "Boarea", completed: Boolean(livingAreaValue?.trim()), fieldName: "livingArea", priority: "critical" },
    { label: "Rum & badrum", completed: Boolean((rooms || 0) > 0 && (bathrooms || 0) > 0), fieldName: "totalRooms", priority: "critical" },
    
    // Platform-specific mandatory fields
    ...(selectedPlatform === "hemnet" ? [
      { label: "Byggår", completed: Boolean(buildYearValue?.trim()), fieldName: "buildYear", priority: "critical" as const },
      { label: "Energiklass", completed: Boolean(energyClassValue?.trim()), fieldName: "energyClass", priority: "critical" as const },
      ...(isApartmentType ? [
        { label: "Avgift", completed: Boolean(form.watch("monthlyFee")?.trim()), fieldName: "monthlyFee", priority: "critical" as const },
      ] : []),
    ] : []),
    
    // Property type-specific mandatory fields
    ...(isApartmentType ? [
      { label: "Våning", completed: Boolean(floorValue?.trim()), fieldName: "floor", priority: "critical" as const },
      { label: "Hiss", completed: true, fieldName: "elevator", priority: "critical" as const }, // Boolean field always "completed"
    ] : []),
    ...(isHouseType ? [
      { label: "Tomtarea", completed: Boolean(lotAreaValue?.trim()), fieldName: "lotArea", priority: "critical" as const },
      { label: "Antal plan", completed: Boolean(floorsValue?.trim()), fieldName: "floors", priority: "critical" as const },
    ] : []),
    
    // Important fields (not mandatory but high impact)
    { label: "Kök & badrum", completed: hasKitchenBathroomFacts, fieldName: "kitchenDescription", priority: "important" },
    { label: "Läge & transport", completed: hasLocationFacts, fieldName: "transport", priority: "important" },
    { label: "Försäljningsargument", completed: hasStrongDifferentiator, fieldName: "uniqueSellingPoints", priority: "critical" },
    { label: "Planlösning & skick", completed: Boolean(layoutValue?.trim() || conditionValue?.trim()), fieldName: "layout", priority: "important" },
  ];
  
  const priorityChecklist = priorityItems.map(item => item.completed);
  const priorityCompleted = priorityChecklist.filter(Boolean).length;

  // Keep type-specific UI + chips aligned when property type changes
  useEffect(() => {
    if (isApartmentType) {
      // Apartment/townhouse flows should hide house-specific chips + fields
      form.setValue("lotArea", "");
      form.setValue("floors", "");
      setGardenChips([]);
      setRoofChips([]);
      setMaterialChips([]);
    }

    if (!isApartmentType) {
      // House/villa flows should hide apartment-specific extra fields
      form.setValue("floor", "");
      form.setValue("elevator", false);
      form.setValue("brfName", "");
    }
  }, [isApartmentType, form]);
  
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

  // Process image files with proper error handling
  const processImageFiles = useCallback((files: File[]) => {
    const validImages = files.filter(f => f.type.startsWith("image/") && f.size < 10 * 1024 * 1024); // 10MB limit
    
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

  // Merge chips + freetext into pipeline-compatible field values, then submit
  const onLocalSubmit = (values: PropertyFormData) => {
    // Validate required fields based on property type and platform
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
      
      // Scroll to first missing field
      if (validationResult.missingFields.length > 0) {
        const firstMissingField = validationResult.missingFields[0];
        handleScrollToField(firstMissingField);
      }
      
      return;
    }
    
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
      { canonical: "Laddbox för elbil", pattern: /\b(laddplats elbil|laddplats för elbil|laddbox(?: installerad)?|elbilsladdare|laddstation)\b/i },
      
      // Fönster
      { canonical: "Nya fönster", pattern: /\b(fönster bytta|nya fönster|fönsterbyte|uppdaterade fönster|3-glasfönster)\b/i },
      
      // Stammar
      { canonical: "Stambyte genomfört", pattern: /\b(stambyte|stamrenovering|nya stammar|stambyte genomfört)\b/i },
      
      // Golvvärme (kan finnas i både badrum och uppvärmning)
      { canonical: "Golvvärme", pattern: /\b(golvvärme|varmvatten i golv|golvvärme i badrum)\b/i },
      
      // Balkong/uteplats
      { canonical: "Balkong", pattern: /\b(balkong|uteplats på balkong)\b/i },
      
      // Parkering
      { canonical: "Garage", pattern: /\b(garage|carport med garage)\b/i },
      { canonical: "Carport", pattern: /\b(carport|biltak)\b/i },
      { canonical: "P-plats", pattern: /\b(p-plats|parkeringsplats|parkering)\b/i },
      
      // Kök
      { canonical: "Öppen planlösning", pattern: /\b(öppen planlösning|öppet kök|kök öppet mot vardagsrum)\b/i },
      { canonical: "Moderna vitvaror", pattern: /\b(vitvaror uppdaterade|nya vitvaror|moderna vitvaror|uppdaterade vitvaror)\b/i },
      { canonical: "Renoverat kök", pattern: /\b(renoverat kök|nyrenoverat kök|kök renoverat|nytt kök)\b/i },
      { canonical: "Köksö", pattern: /\b(köksö|fristående köksö)\b/i },
      { canonical: "Kompositbänk", pattern: /\b(kompositbänk|kvartskomposit|komposit bänkskiva|bänkskiva i komposit)\b/i },
      { canonical: "Stenbänk", pattern: /\b(stenbänk|granitbänk|marmorbänk|bänkskiva i sten|bänkskiva i granit)\b/i },
      
      // Badrum
      { canonical: "Renoverat badrum", pattern: /\b(renoverat badrum|nyrenoverat badrum|badrum renoverat|nytt badrum)\b/i },
      { canonical: "Helkaklat", pattern: /\b(helkaklat|helkaklat badrum|fullt kaklat)\b/i },
      { canonical: "Dubbla handfat", pattern: /\b(dubbla handfat|två handfat|dubbelhandfat)\b/i },
      { canonical: "Duschvägg i glas", pattern: /\b(duschvägg i glas|glasdusch|dusch i glas)\b/i },
      
      // Golv
      { canonical: "Ekparkett", pattern: /\b(ekparkett|parkett i ek|ek parkett)\b/i },
      { canonical: "Massivt trägolv", pattern: /\b(massivt trägolv|massiv parkett|massiva trägolv)\b/i },
      { canonical: "Originalparkett", pattern: /\b(originalparkett|original parkett|bevarad parkett)\b/i },
      
      // Uppvärmning
      { canonical: "Fjärrvärme", pattern: /\b(fjärrvärme|stadsvärme)\b/i },
      { canonical: "Bergvärme", pattern: /\b(bergvärme|bergvärmepump)\b/i },
      { canonical: "Luft-luftvärmepump", pattern: /\b(luft-luftvärmepump|luft till luft|luft-luft)\b/i },
      { canonical: "Luft-vattenvärmepump", pattern: /\b(luft-vattenvärmepump|luft till vatten|luft-vatten)\b/i },
      
      // Trädgård
      { canonical: "Stor trädgård", pattern: /\b(stor trädgård|rymlig trädgård|generös trädgård)\b/i },
      { canonical: "Altan", pattern: /\b(altan|uteplats|terrass)\b/i },
      { canonical: "Pergola", pattern: /\b(pergola|spaljé)\b/i },
      
      // Tak
      { canonical: "Nytt tak", pattern: /\b(nytt tak|tak omlagt|tak bytt|takrenovering)\b/i },
      
      // Övrigt
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
    // Task 5.1: otherInfo consolidated into specialFeatures section
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
    } catch { /* ignore corrupted drafts */ }
  }, []);

  // ── DRAFT PERSISTENCE: Debounced auto-save form on changes (Task 8.13 — performance) ──
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
        } catch { /* storage full */ }
      }, 300);
    });
    return () => {
      subscription.unsubscribe();
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [form, rooms, bedrooms, bathrooms, hasBalcony, wordCountMin, wordCountMax]);

  // ── DRAFT PERSISTENCE: Debounced auto-save chips on changes ──
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
      } catch { /* storage full */ }
    }, 300);
    return () => {
      if (chipTimerRef.current) clearTimeout(chipTimerRef.current);
    };
  }, [kitchenChips, bathroomChips, flooringChips, heatingChips, specialChips, gardenChips, uspChips, parkingChips, roofChips, materialChips]);

  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onLocalSubmit)} className="space-y-4">

          {/* Render mode: essential-only - only show objekttyp and essential fields */}
          {renderMode === 'essential-only' && (
            <>
              {/* Så används dina fält - viktig info */}
              <div className="bg-white border rounded-lg p-4" style={{ borderColor: "#E8E5DE", background: "#FAFAF8" }}>
                <p className="text-sm font-semibold mb-3" style={{ color: "#1D2939" }}>Så används dina fält</p>
                <div className="space-y-2 text-xs">
                  <div className="rounded-lg px-3 py-2" style={{ background: "#DCFCE7", color: "#166534" }}>
                    <span className="font-semibold">Direkt i huvudtexten:</span>
                    <span> adress, boarea, rum, kök/badrum, kommunikationer och tydliga säljpunkter.</span>
                  </div>
                  <div className="rounded-lg px-3 py-2" style={{ background: "#F3F4F6", color: "#4B5563" }}>
                    <span className="font-semibold" style={{ color: "#1D2939" }}>Kontext till AI:n:</span>
                    <span> energi, material, förråd, taktyp och övrigt vägs in men skrivs bara ut när de stärker köparnyttan.</span>
                  </div>
                </div>
              </div>

              {/* ── SECTION 1: OBJEKTTYP ── */}
              <div className="bg-white border rounded-lg p-4" style={{ borderColor: "#E8E5DE" }}>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold" style={{ color: "#1D2939" }}>
                    Objekttyp
                  </label>
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
                          ? 'text-white border-transparent' 
                          : 'bg-white border-input hover:bg-accent'
                      }`}
                      style={selectedType === t.value ? { background: "#2D6A4F" } : {}}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── SECTION 2: ESSENTIELL INFORMATION (NEW COMPONENT) ── */}
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
                isPro={isPro}
                importButtons={
                  isPro ? (
                    <VitecImportPicker onImport={handleExternalImport} isPro={isPro} />
                  ) : (
                    <LockedFeature requiredPlan="pro" featureName="Vitec-import" currentPlan="free" showOverlay={false}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="h-9 text-xs font-medium"
                      >
                        <Lock className="w-3 h-3 mr-1.5" />
                        Vitec-import
                      </Button>
                    </LockedFeature>
                  )
                }
              />
            </>
          )}

          {/* Render mode: rest-only - show everything except objekttyp and essential fields */}
          {(renderMode === 'rest-only' || renderMode === 'full') && (
            <>
              {/* ── SECTION 2.5: OBJEKTBILDER (NEW COMPONENT) ── */}
              <ImageSection
                uploadedImages={uploadedImages}
                onImagesAdded={processImageFiles}
                onImageRemoved={(idx) => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                imageUploadProgress={imageUploadProgress}
                onFromHemnet={() => {
                  toast({ title: "Hemnet-import", description: "Kommer snart", variant: "default" });
                }}
              />

          {/* ── SECTION 3: KÖK & BADRUM (chip-based) ── */}
          <div className="pro-section-card">
            <label className="text-xs font-semibold uppercase tracking-wider block mb-3 text-muted-foreground">
              Kök & Badrum
            </label>
            <div className="space-y-4">
              {/* Kitchen chips */}
              <div>
                <span className="text-xs text-gray-500 font-medium block mb-2" id="kitchen-label">Kök — välj det som stämmer</span>
                <CollapsibleChipSelector chips={KITCHEN_CHIPS} selected={kitchenChips} onToggle={(c) => toggleChip(kitchenChips, setKitchenChips, c)} tooltips={KITCHEN_TOOLTIPS} maxInitialChips={4} />
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
                <span className="text-xs text-gray-500 font-medium block mb-2" id="bathroom-label">Badrum — välj det som stämmer</span>
                <CollapsibleChipSelector chips={BATHROOM_CHIPS} selected={bathroomChips} onToggle={(c) => toggleChip(bathroomChips, setBathroomChips, c)} tooltips={BATHROOM_TOOLTIPS} maxInitialChips={4} />
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
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-slate-700">
              Vad gör objektet speciellt?
            </label>
            <p className="text-[10px] text-gray-400 mb-3">
              Det här påverkar textens styrka mest. Välj och/eller beskriv med egna ord. Ju mer specifik desto bättre text.
            </p>
            <CollapsibleChipSelector chips={USP_CHIPS} selected={uspChips} onToggle={(c) => toggleChip(uspChips, setUspChips, c)} tooltips={USP_TOOLTIPS} maxInitialChips={4} />
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

          {/* ── SECTION 5b: LÄGE & KOMMUNIKATIONER ── */}
          <div className="pro-section-card">
            <label className="text-xs font-semibold uppercase tracking-wider block mb-3 text-muted-foreground">
              Läge & Kommunikationer
            </label>
            <div className="space-y-3">
              <FormField control={form.control} name="transport" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Kommunikationer</FormLabel>
                  <FormControl><Input placeholder="Ex: Cirka 4 min promenad till tunnelbana och buss runt hörnet" {...field} className={exampleInputClass} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="neighborhood" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Områdesbeskrivning</FormLabel>
                  <FormControl><Input placeholder="Ex: Närhet till mataffärer, caféer, förskola, gym och grönområden inom några minuters promenad" {...field} className={exampleInputClass} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="view" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-500">Utsikt (används även som försäljningsargument)</FormLabel>
                  <FormControl><Input placeholder="Ex: Fri utsikt över park, grönska och takåsar" {...field} className={exampleInputClass} /></FormControl>
                </FormItem>
              )} />
            </div>
          </div>
          
          {/* Flooring section */}
          <DetailsSection
            title="Golv & Material"
            color="gold"
            persistKey="flooring-section"
          >
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-500 font-medium block mb-2" id="flooring-label">Golvtyp</span>
                <CollapsibleChipSelector chips={FLOORING_CHIPS} selected={flooringChips} onToggle={(c) => toggleChip(flooringChips, setFlooringChips, c)} maxInitialChips={4} />
                <FormField control={form.control} name="flooring" render={({ field }) => (
                  <FormItem className="mt-2">
                    <FormControl><Input placeholder="Ex: Enstavsparkett i vardagsrum och sovrum, klinker med golvvärme i hall och badrum" {...field} className={exampleCompactInputClass} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </div>
          </DetailsSection>

          {/* Heating section */}
          <DetailsSection
            title="Uppvärmning"
            color="gold"
            persistKey="heating-section"
          >
            <div className="space-y-3">
              <p className="text-[10px] text-gray-400">Välj den primära uppvärmningskällan. Kombinationer som fjärrvärme + golvvärme är vanliga.</p>
              <CollapsibleChipSelector chips={HEATING_CHIPS} selected={heatingChips} onToggle={(c) => toggleChip(heatingChips, setHeatingChips, c)} tooltips={HEATING_TOOLTIPS} maxInitialChips={4} />
            </div>
          </DetailsSection>

          {/* Special features section */}
          <DetailsSection
            title="Särskilda Egenskaper"
            color="gold"
            persistKey="special-features-section"
          >
            <div className="space-y-3">
              <p className="text-[10px] text-gray-400">Välj sådant som inte redan täcks av kök, badrum, parkering eller trädgård. Inkludera även renoveringar och tekniska uppgraderingar här.</p>
              <CollapsibleChipSelector chips={SPECIAL_CHIPS} selected={specialChips} onToggle={(c) => toggleChip(specialChips, setSpecialChips, c)} tooltips={SPECIAL_TOOLTIPS} maxInitialChips={4} />
              <FormField control={form.control} name="specialFeatures" render={({ field }) => (
                <FormItem>
                  <FormControl><Input placeholder="Ex: Stambyte 2017, nya 3-glasfönster 2021, kakelugn, platsbyggd förvaring" {...field} className={exampleCompactInputClass} /></FormControl>
                </FormItem>
              )} />
            </div>
          </DetailsSection>

          {/* Garden section (house/villa/townhouse only) */}
          {isHouseOrTownhouseType && (
            <DetailsSection
              title="Trädgård & Uteplats"
              color="green"
              persistKey="garden-section"
            >
              <div className="space-y-3">
                <CollapsibleChipSelector chips={GARDEN_CHIPS} selected={gardenChips} onToggle={(c) => toggleChip(gardenChips, setGardenChips, c)} tooltips={GARDEN_TOOLTIPS} maxInitialChips={4} />
                <FormField control={form.control} name="gardenDescription" render={({ field }) => (
                  <FormItem>
                    <FormControl><Input placeholder="Ex: Plan trädgårdstomt med häck, äppelträd, odlingslådor och stor altan i västerläge" {...field} className={exampleCompactInputClass} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </DetailsSection>
          )}

          {/* ── SECTION 6: OPTIONAL DETAILS (wrapped in DetailsSection components) ── */}

          {/* Energy & Storage section */}
          <DetailsSection
            title="Energi & Förvaring"
            color="gold"
            persistKey="energy-storage-section"
          >
            <div className="space-y-3">
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
            </div>
          </DetailsSection>

          {/* Parking section */}
          <DetailsSection
            title="Parkering"
            color="blue"
            persistKey="parking-section"
          >
            <div className="space-y-3">
              <p className="text-[10px] text-gray-400">Laddbox och garageinfo ska ligga här för att undvika dubbla formuleringar i texten.</p>
              <CollapsibleChipSelector chips={PARKING_CHIPS} selected={parkingChips} onToggle={(c) => toggleChip(parkingChips, setParkingChips, c)} tooltips={PARKING_TOOLTIPS} maxInitialChips={4} />
              <FormField control={form.control} name="parking" render={({ field }) => (
                <FormItem>
                  <FormControl><Input placeholder="Ex: Isolerat garage med laddbox samt uppfart med plats för två bilar" {...field} className={exampleCompactInputClass} /></FormControl>
                </FormItem>
              )} />
            </div>
          </DetailsSection>

          {/* Building material & roof (house/villa/townhouse only) */}
          {isHouseOrTownhouseType && (
            <>
              <DetailsSection
                title="Byggnadsmaterial"
                color="purple"
                persistKey="material-section"
              >
                <div className="space-y-3">
                  <CollapsibleChipSelector chips={MATERIAL_CHIPS} selected={materialChips} onToggle={(c) => toggleChip(materialChips, setMaterialChips, c)} tooltips={MATERIAL_TOOLTIPS} maxInitialChips={4} />
                </div>
              </DetailsSection>

              <DetailsSection
                title="Taktyp"
                color="purple"
                persistKey="roof-section"
              >
                <div className="space-y-3">
                  <CollapsibleChipSelector chips={ROOF_CHIPS} selected={roofChips} onToggle={(c) => toggleChip(roofChips, setRoofChips, c)} maxInitialChips={4} />
                </div>
              </DetailsSection>
            </>
          )}

          {/* ── SECTION 7b: VISNINGSINFORMATION ── */}
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

          {/* ── SECTION 8: PLATTFORM, STIL & SUBMIT ── */}
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

            {/* Word count */}
            {isPro ? (
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
            ) : (
              <LockedFeature requiredPlan="pro" featureName="Textlängdskontroll" currentPlan="free" showOverlay={false}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-400 font-medium">Textlängd:</span>
                  <div className="flex items-center gap-2">
                    <Select value="300" disabled>
                      <SelectTrigger className="h-8 w-24 text-xs bg-white"><SelectValue /></SelectTrigger>
                    </Select>
                    <span className="text-xs text-gray-400">till</span>
                    <Select value="450" disabled>
                      <SelectTrigger className="h-8 w-24 text-xs bg-white"><SelectValue /></SelectTrigger>
                    </Select>
                    <span className="text-xs text-gray-400 ml-2 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Fast för gratis-plan
                    </span>
                  </div>
                </div>
              </LockedFeature>
            )}

            {/* AI Model Info - Fixed GPT-5.2 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium">AI-modell:</span>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-800">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-white">GPT-5.2</span>
                <span className="text-xs text-gray-400">optimerad för objektsbeskrivning</span>
              </div>
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
            </>
          )}
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
