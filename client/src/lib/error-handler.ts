export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ErrorHandler {
  static classifyError(error: Error | string): AppError {
    const message = typeof error === 'string' ? error : error.message;
    const lowerMessage = message.toLowerCase();

    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message,
        userMessage: 'Nätverksproblem. Kontrollera din internetanslutning och försök igen.',
        retryable: true,
        severity: 'medium'
      };
    }

    // Timeout errors
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return {
        code: 'TIMEOUT_ERROR',
        message,
        userMessage: 'Förfrågan tog för lång tid. Försök igen.',
        retryable: true,
        severity: 'medium'
      };
    }

    // Rate limiting
    if (lowerMessage.includes('429') || lowerMessage.includes('too many requests')) {
      return {
        code: 'RATE_LIMIT',
        message,
        userMessage: 'För många förfrågningar. Vänligen vänta en stund och försök igen.',
        retryable: true,
        severity: 'medium'
      };
    }

    // Authentication errors
    if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized')) {
      return {
        code: 'AUTH_ERROR',
        message,
        userMessage: 'Du är inte inloggad. Vänligen logga in och försök igen.',
        retryable: false,
        severity: 'high'
      };
    }

    // Authorization errors
    if (lowerMessage.includes('403') || lowerMessage.includes('forbidden')) {
      if (lowerMessage.includes('limit')) {
        return {
          code: 'USAGE_LIMIT',
          message,
          userMessage: 'Du har nått din användningsgräns. Uppgradera till Pro för att fortsätta.',
          retryable: false,
          severity: 'medium'
        };
      }
      return {
        code: 'PERMISSION_ERROR',
        message,
        userMessage: 'Du har inte behörighet att utföra denna åtgärd.',
        retryable: false,
        severity: 'high'
      };
    }

    // Not found errors
    if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
      return {
        code: 'NOT_FOUND',
        message,
        userMessage: 'Kunde inte hitta den begärda resursen.',
        retryable: false,
        severity: 'low'
      };
    }

    // Validation errors
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return {
        code: 'VALIDATION_ERROR',
        message,
        userMessage: 'Vänligen kontrollera dina uppgifter och försök igen.',
        retryable: false,
        severity: 'medium'
      };
    }

    // Server errors
    if (lowerMessage.includes('500') || lowerMessage.includes('internal server')) {
      return {
        code: 'SERVER_ERROR',
        message,
        userMessage: 'Ett internt fel uppstod. Vårt team har informerats. Försök igen om en stund.',
        retryable: true,
        severity: 'high'
      };
    }

    // AI/Model errors
    if (lowerMessage.includes('ai') || lowerMessage.includes('model') || lowerMessage.includes('openai')) {
      return {
        code: 'AI_ERROR',
        message,
        userMessage: 'AI-tjänsten är för närvarande överbelastad. Försök igen om en stund.',
        retryable: true,
        severity: 'medium'
      };
    }

    // Default error
    return {
      code: 'UNKNOWN_ERROR',
      message,
      userMessage: 'Ett oväntat fel uppstod. Försök igen eller kontakta support om problemet kvarstår.',
      retryable: true,
      severity: 'medium'
    };
  }

  static getToastConfig(error: AppError) {
    const baseConfig = {
      title: this.getToastTitle(error),
      description: error.userMessage,
      variant: error.severity === 'critical' || error.severity === 'high' ? 'destructive' : 'default'
    } as const;

    // Add retry action for retryable errors
    if (error.retryable && error.severity !== 'critical') {
      return {
        ...baseConfig,
        action: {
          label: 'Försök igen',
          onClick: () => window.location.reload()
        }
      };
    }

    return baseConfig;
  }

  private static getToastTitle(error: AppError): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Nätverksfel';
      case 'TIMEOUT_ERROR':
        return 'Timeout';
      case 'RATE_LIMIT':
        return 'För många förfrågningar';
      case 'AUTH_ERROR':
        return 'Inloggning krävs';
      case 'PERMISSION_ERROR':
        return 'Åtkomst nekad';
      case 'USAGE_LIMIT':
        return 'Gräns nådd';
      case 'NOT_FOUND':
        return 'Hittades inte';
      case 'VALIDATION_ERROR':
        return 'Valideringsfel';
      case 'SERVER_ERROR':
        return 'Serverfel';
      case 'AI_ERROR':
        return 'AI-fel';
      default:
        return 'Fel';
    }
  }

  static logError(error: AppError, context?: string) {
    const logData = {
      code: error.code,
      message: error.message,
      severity: error.severity,
      retryable: error.retryable,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry, LogRocket, etc.
      console.error('[App Error]', logData);
    } else {
      console.error('[App Error]', logData);
    }
  }
}
