import { Zap, TrendingUp, SlidersHorizontal } from "lucide-react";

export type FormMode = 'quick' | 'improve' | 'expert';

interface FormModeSelectorProps {
  mode: FormMode;
  onModeChange: (mode: FormMode) => void;
  completionPercentage?: number;
}

export function FormModeSelector({ mode, onModeChange }: FormModeSelectorProps) {
  const modes = [
    {
      value: 'quick' as const,
      label: 'Snabb',
      icon: Zap,
      description: 'Adress, yta, rum — generera direkt',
    },
    {
      value: 'improve' as const,
      label: 'Standard',
      icon: TrendingUp,
      description: 'Kök, badrum, läge, säljpunkter',
    },
    {
      value: 'expert' as const,
      label: 'Komplett',
      icon: SlidersHorizontal,
      description: 'Alla fält — planlösning, material, visning',
    },
  ];

  return (
    <div className="flex gap-2">
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.value;

        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onModeChange(m.value)}
            className={`
              flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all
              ${isActive
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}
            `}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
            <div className="min-w-0">
              <span className="text-sm font-medium block">{m.label}</span>
              <span className={`text-xs block ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                {m.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
