/**
 * VitecOnboardingBanner - Prominent banner to guide users to configure Vitec
 * Shows when user is Pro/Premium but hasn't configured Vitec yet
 */

import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Building2, X, ArrowRight, FileCheck, Zap } from "lucide-react";

interface IntegrationSettings {
  vitecEnabled: boolean;
  vitecApiKeySet: boolean;
}

export function VitecOnboardingBanner({ isPro }: { isPro: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("vitec-onboarding-dismissed") === "true";
  });

  const { data: settings } = useQuery<IntegrationSettings>({
    queryKey: ["/api/integrations/settings"],
    enabled: isPro,
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("vitec-onboarding-dismissed", "true");
  };

  // Don't show if:
  // - Not Pro/Premium
  // - Already configured
  // - User dismissed it
  if (!isPro || settings?.vitecEnabled || dismissed) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 p-6 mb-6" style={{ 
      background: "linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)",
      borderColor: "#2D6A4F"
    }}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Stäng"
      >
        <X className="w-4 h-4 text-white/70 hover:text-white" />
      </button>

      {/* Content */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-sm flex-shrink-0">
          <Building2 className="w-6 h-6 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 pr-8">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">
              Anslut ditt Vitec-konto
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
              Nytt!
            </span>
          </div>
          
          <p className="text-sm text-white/90 mb-4 leading-relaxed">
            Importera objekt direkt från Vitec och exportera AI-genererade texter tillbaka med ett klick. 
            Spara 30+ minuter per objekt.
          </p>

          {/* Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="flex items-center gap-2 text-white/90">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium">Snabb import</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <FileCheck className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium">AI-optimering</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <ArrowRight className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium">Direkt export</span>
            </div>
          </div>

          {/* CTA */}
          <Link href="/integrations">
            <Button
              size="sm"
              className="bg-white text-[#2D6A4F] hover:bg-white/90 font-medium"
            >
              Konfigurera Vitec nu
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
    </div>
  );
}
