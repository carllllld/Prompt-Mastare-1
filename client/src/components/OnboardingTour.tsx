import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Sparkles, Target, Zap, Shield } from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  icon: React.ReactNode;
  action?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const tourSteps: TourStep[] = [
    {
      id: 'welcome',
      title: 'Välkommen till OptiPrompt Mäklare!',
      description: 'Låt oss visa dig hur du skapar professionella objektbeskrivningar på under 30 sekunder.',
      target: 'body',
      icon: <Sparkles className="w-6 h-6 text-blue-500" />,
      position: 'center'
    },
    {
      id: 'prompt-form',
      title: 'Fyll i fastighetsdata',
      description: 'Ange grundläggande information om objektet. Ju mer data du fyller i, desto bättre blir resultatet.',
      target: '#prompt-form',
      icon: <Target className="w-6 h-6 text-green-500" />,
      action: 'Fyll i adress och grunduppgifter',
      position: 'top'
    },
    {
      id: 'ai-generation',
      title: 'AI-generering',
      description: 'Klicka på "Generera text" så skapar vår AI professionella beskrivningar för både Hemnet och Booli.',
      target: '#generate-button',
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      action: 'Prova att generera din första text',
      position: 'bottom'
    },
    {
      id: 'results',
      title: 'Se dina resultat',
      description: 'Här ser du de genererade texterna. Kopiera dem direkt till Hemnet/Booli eller redigera vid behov.',
      target: '#results-section',
      icon: <Shield className="w-6 h-6 text-purple-500" />,
      action: 'Kopiera en text till urklipp',
      position: 'left'
    },
    {
      id: 'upgrade',
      title: 'Uppgradera för fler funktioner',
      description: 'Som Pro-användare får du 10 texter/månad, team-samarbete och avancerade funktioner.',
      target: '#upgrade-button',
      icon: <Check className="w-6 h-6 text-emerald-500" />,
      action: 'Utforska Pro-funktioner',
      position: 'top'
    }
  ];

  const currentStepData = tourSteps[currentStep];

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsCompleted(true);
    onComplete();
    localStorage.setItem('onboarding-completed', 'true');
  };

  const skipTour = () => {
    completeTour();
  };

  const highlightTarget = () => {
    if (currentStepData.target === 'body') return;
    
    const targetElement = document.querySelector(currentStepData.target);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.add('tour-highlight');
      
      setTimeout(() => {
        targetElement.classList.remove('tour-highlight');
      }, 500);
    }
  };

  useEffect(() => {
    if (isOpen) {
      highlightTarget();
    }
  }, [currentStep, isOpen]);

  const getPositionClasses = () => {
    switch (currentStepData.position) {
      case 'center':
        return 'fixed inset-0 flex items-center justify-center z-50';
      case 'top':
        return 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50';
      case 'bottom':
        return 'fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50';
      case 'left':
        return 'fixed left-4 top-1/2 transform -translate-y-1/2 z-50';
      case 'right':
        return 'fixed right-4 top-1/2 transform -translate-y-1/2 z-50';
      default:
        return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50';
    }
  };

  if (!isOpen) return null;

  if (isCompleted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Klart! 🎉
          </h3>
          <p className="text-gray-600 mb-6">
            Du är nu redo att skapa professionella objektbeskrivningar. Lycka till!
          </p>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Börja skapa
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Tour Content */}
      <div className={getPositionClasses()}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>Steg {currentStep + 1} av {tourSteps.length}</span>
              <span>{Math.round(((currentStep + 1) / tourSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Icon */}
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            {currentStepData.icon}
          </div>

          {/* Content */}
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {currentStepData.title}
          </h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            {currentStepData.description}
          </p>

          {/* Action Hint */}
          {currentStepData.action && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-700 font-medium">
                💡 {currentStepData.action}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentStep === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Föregående
            </button>

            <div className="flex gap-2">
              <button
                onClick={skipTour}
                className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm transition-colors"
              >
                Hoppa över
              </button>
              <button
                onClick={nextStep}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {currentStep === tourSteps.length - 1 ? 'Slutför' : 'Nästa'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Highlight Styles */}
      <style jsx>{`
        .tour-highlight {
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          border-radius: 8px;
          transition: box-shadow 0.3s ease;
        }
      `}</style>
    </>
  );
}
