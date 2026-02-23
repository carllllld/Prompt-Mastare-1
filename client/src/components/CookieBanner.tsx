import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface CookieConsent {
  accepted: boolean;
  timestamp: number;
}

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    const consent: CookieConsent = {
      accepted: true,
      timestamp: Date.now()
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setIsVisible(false);
  };

  const rejectCookies = () => {
    // Note: We can't actually reject session cookies as they're required for login
    // But we can store the preference and show minimal tracking
    const consent: CookieConsent = {
      accepted: false,
      timestamp: Date.now()
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm">
            <span className="font-semibold">Cookies:</span> Vi använder nödvändiga cookies för att du ska kunna logga in och använda tjänsten. 
            Dina sessionsdata lagras säkert i 30 dagar för att du ska förbli inloggad.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Inga spårnings- eller marknadsföringscookies används. <a href="/privacy" className="underline hover:text-gray-300">Integritetspolicy</a>
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={rejectCookies}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Minimal
          </button>
          <button
            onClick={acceptCookies}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded font-medium transition-colors flex items-center gap-2"
          >
            Acceptera & Fortsätt
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
