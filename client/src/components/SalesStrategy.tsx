import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Loader2, Lock, Target, TrendingUp, DollarSign, Eye, Megaphone } from "lucide-react";
import { Button } from "./ui/button";
import { useSalesStrategy, type SalesStrategyResult } from "@/hooks/use-sales-strategy";
import { LockedFeature } from "./LockedFeature";
import { type PlanType } from "@shared/schema";

interface SalesStrategyProps {
  propertyData: Record<string, any>;
  generatedText?: string;
  platform?: string;
  currentPlan: PlanType;
}

function StrategySection({ icon: Icon, title, children, defaultOpen = false }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-800">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Kopierad" : "Kopiera"}
    </button>
  );
}

function StrategyContent({ strategy }: { strategy: SalesStrategyResult }) {
  const allText = [
    "MÅLGRUPPSANALYS",
    `Primär: ${strategy.targetAudience.primary}`,
    `Sekundär: ${strategy.targetAudience.secondary}`,
    "",
    "SÄLJARGUMENT",
    ...strategy.sellingPoints.map(sp => `${sp.rank}. ${sp.argument} — ${sp.whyItMatters}`),
    "",
    "PRISSÄTTNING",
    strategy.pricingPerspective.positioning,
    strategy.pricingPerspective.textSuggestion,
    "",
    "VISNINGSSTRATEGI",
    `Öppningsdrag: ${strategy.showingStrategy.openingMove}`,
    ...strategy.showingStrategy.tips.map(t => `- ${t}`),
    "",
    "ANNONSOPTIMERING",
    `Publicera: ${strategy.adOptimization.bestPublishDay} ${strategy.adOptimization.bestPublishTime}`,
    `Första bild: ${strategy.adOptimization.firstImageSuggestion}`,
  ].join("\n");

  return (
    <div className="space-y-3 pt-3">
      <div className="flex justify-end">
        <CopyButton text={allText} />
      </div>

      <StrategySection icon={Target} title="Målgruppsanalys" defaultOpen>
        <div className="space-y-2 pt-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Primär målgrupp</p>
            <p className="text-sm text-gray-800">{strategy.targetAudience.primary}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sekundär målgrupp</p>
            <p className="text-sm text-gray-800">{strategy.targetAudience.secondary}</p>
          </div>
          {strategy.targetAudience.reasoning && (
            <p className="text-xs text-gray-500 italic">{strategy.targetAudience.reasoning}</p>
          )}
        </div>
      </StrategySection>

      <StrategySection icon={TrendingUp} title="Säljargument (rangordnade)">
        <div className="space-y-3 pt-3">
          {strategy.sellingPoints.map((sp) => (
            <div key={sp.rank} className="flex gap-3">
              <span className="text-sm font-semibold text-gray-400 w-5 flex-shrink-0">{sp.rank}.</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{sp.argument}</p>
                <p className="text-xs text-gray-500">{sp.whyItMatters}</p>
              </div>
            </div>
          ))}
        </div>
      </StrategySection>

      <StrategySection icon={DollarSign} title="Prissättningsperspektiv">
        <div className="space-y-2 pt-3">
          <p className="text-sm text-gray-800">{strategy.pricingPerspective.positioning}</p>
          {strategy.pricingPerspective.textSuggestion && (
            <div className="bg-gray-50 px-3 py-2 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Formuleringsförslag</p>
              <p className="text-sm text-gray-800 italic">"{strategy.pricingPerspective.textSuggestion}"</p>
            </div>
          )}
        </div>
      </StrategySection>

      <StrategySection icon={Eye} title="Visningsstrategi">
        <div className="space-y-2 pt-3">
          {strategy.showingStrategy.openingMove && (
            <div className="bg-gray-50 px-3 py-2 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Öppningsdrag</p>
              <p className="text-sm text-gray-800">{strategy.showingStrategy.openingMove}</p>
            </div>
          )}
          <div className="space-y-1.5">
            {strategy.showingStrategy.tips.map((tip, i) => (
              <p key={i} className="text-sm text-gray-800">- {tip}</p>
            ))}
          </div>
        </div>
      </StrategySection>

      <StrategySection icon={Megaphone} title="Annonsoptimering">
        <div className="space-y-2 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 px-3 py-2 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Bästa publiceringsdag</p>
              <p className="text-sm font-medium text-gray-800">{strategy.adOptimization.bestPublishDay}</p>
            </div>
            <div className="bg-gray-50 px-3 py-2 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Bästa tid</p>
              <p className="text-sm font-medium text-gray-800">{strategy.adOptimization.bestPublishTime}</p>
            </div>
          </div>
          {strategy.adOptimization.firstImageSuggestion && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Första bilden i annonsen</p>
              <p className="text-sm text-gray-800">{strategy.adOptimization.firstImageSuggestion}</p>
            </div>
          )}
          {strategy.adOptimization.reasoning && (
            <p className="text-xs text-gray-500 italic">{strategy.adOptimization.reasoning}</p>
          )}
        </div>
      </StrategySection>
    </div>
  );
}

function LockedPreview({ strategy }: { strategy: SalesStrategyResult }) {
  return (
    <div className="space-y-3 pt-3">
      <StrategySection icon={Target} title="Målgruppsanalys" defaultOpen>
        <div className="space-y-2 pt-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Primär målgrupp</p>
            <p className="text-sm text-gray-800">{strategy.targetAudience.primary}</p>
          </div>
          <p className="text-xs text-gray-400 italic">Uppgradera till Premium för att se alla 5 sektioner.</p>
        </div>
      </StrategySection>
      <div className="opacity-40 pointer-events-none space-y-3">
        <StrategySection icon={TrendingUp} title="Säljargument (rangordnade)">
          <div />
        </StrategySection>
        <StrategySection icon={DollarSign} title="Prissättningsperspektiv">
          <div />
        </StrategySection>
        <StrategySection icon={Eye} title="Visningsstrategi">
          <div />
        </StrategySection>
        <StrategySection icon={Megaphone} title="Annonsoptimering">
          <div />
        </StrategySection>
      </div>
    </div>
  );
}

export function SalesStrategy({ propertyData, generatedText, platform, currentPlan }: SalesStrategyProps) {
  const { strategy, isLoading, error, generate } = useSalesStrategy();
  const [expanded, setExpanded] = useState(false);

  const isPremium = currentPlan === "premium";
  const isPro = currentPlan === "pro";

  const handleGenerate = async () => {
    setExpanded(true);
    await generate(propertyData, generatedText, platform);
  };

  // Free users see nothing
  if (currentPlan === "free") return null;

  return (
    <div className="border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => {
          if (!strategy && !isLoading) {
            handleGenerate();
          } else {
            setExpanded(!expanded);
          }
        }}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-800">AI Säljstrateg</span>
          {!isPremium && (
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              PREMIUM
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {isLoading && (
            <div className="flex items-center gap-2 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Analyserar bostaden och bygger säljstrategi...</span>
            </div>
          )}

          {error && (
            <div className="py-4">
              <p className="text-sm text-red-600">{error}</p>
              {isPremium && (
                <Button variant="outline" size="sm" onClick={handleGenerate} className="mt-2 text-xs">
                  Försök igen
                </Button>
              )}
            </div>
          )}

          {strategy && isPremium && <StrategyContent strategy={strategy} />}
          {strategy && isPro && <LockedPreview strategy={strategy} />}

          {!strategy && !isLoading && !error && isPremium && (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-500 mb-3">Generera en komplett säljstrategi baserad på bostadsdatan.</p>
              <Button variant="outline" size="sm" onClick={handleGenerate} className="text-xs">
                Generera säljstrategi
              </Button>
            </div>
          )}

          {!strategy && !isLoading && !error && isPro && (
            <LockedFeature requiredPlan="premium" featureName="AI Säljstrateg" currentPlan="pro">
              <div className="py-4 text-center">
                <p className="text-sm text-gray-500">Komplett säljstrategi med målgruppsanalys, visningsstrategi och annonsoptimering.</p>
              </div>
            </LockedFeature>
          )}
        </div>
      )}
    </div>
  );
}
