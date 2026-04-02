import { Rocket, Gem, Settings } from "lucide-react";

export type FormMode = 'quick' | 'improve' | 'expert';

interface FormModeSelectorProps {
  mode: FormMode;
  onModeChange: (mode: FormMode) => void;
  completionPercentage?: number;
}

export function FormModeSelector({ mode, onModeChange, completionPercentage = 0 }: FormModeSelectorProps) {
  const modes = [
    {
      value: 'quick' as const,
      label: 'Snabbstart',
      icon: Rocket,
      time: '2 min',
      description: 'Grundläggande info → Generera text direkt',
      color: 'bg-amber-50 border-amber-200 text-amber-900',
      activeColor: 'bg-amber-500 text-white border-amber-500',
    },
    {
      value: 'improve' as const,
      label: 'Förbättra',
      icon: Gem,
      time: '5 min',
      description: 'Lägg till kök, läge, USP → Bättre text',
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      activeColor: 'bg-blue-500 text-white border-blue-500',
    },
    {
      value: 'expert' as const,
      label: 'Expert',
      icon: Settings,
      time: '15 min',
      description: 'Alla fält → Maximal kontroll',
      color: 'bg-gray-50 border-gray-200 text-gray-900',
      activeColor: 'bg-gray-700 text-white border-gray-700',
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Välj arbetsläge</h3>
        {completionPercentage > 0 && (
          <span className="text-xs text-gray-500">
            {completionPercentage}% ifyllt
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.value;
          
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onModeChange(m.value)}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${isActive ? m.activeColor : m.color}
                hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              `}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-current'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-current'}`}>
                      {m.label}
                    </span>
                    <span className={`text-xs font-medium ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                      {m.time}
                    </span>
                  </div>
                  <p className={`text-xs ${isActive ? 'text-white/90' : 'text-gray-600'}`}>
                    {m.description}
                  </p>
                </div>
              </div>
              
              {isActive && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          💡 <strong>Tips:</strong> Börja med Snabbstart för att få en grundtext på 2 minuter. 
          Du kan alltid förbättra texten efteråt genom att lägga till mer information.
        </p>
      </div>
    </div>
  );
}
