interface SecurityEvent {
  id: string;
  type: 'suspicious_request' | 'rate_limit_exceeded' | 'invalid_input' | 'sql_injection' | 'xss_attempt' | 'brute_force' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  ip: string;
  userAgent?: string;
  path: string;
  method: string;
  details: Record<string, any>;
  resolved: boolean;
}

interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topOffenders: Array<{ ip: string; count: number }>;
  recentEvents: SecurityEvent[];
  blockedIPs: Set<string>;
}

export class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private blockedIPs: Set<string> = new Set();
  private maxEvents: number = 10000;
  private alertThresholds = {
    suspicious_request: 10,
    rate_limit_exceeded: 5,
    invalid_input: 20,
    sql_injection: 1,
    xss_attempt: 1,
    brute_force: 5,
    unauthorized_access: 10
  };

  /**
   * Logga security event
   */
  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): SecurityEvent {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
      resolved: false
    };

    this.events.push(securityEvent);

    // Begränsa array storlek
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Processa event
    this.processEvent(securityEvent);

    return securityEvent;
  }

  /**
   * Processa security event
   */
  private processEvent(event: SecurityEvent): void {
    // Lägg till i blocked IPs om kritiskt
    if (event.severity === 'critical') {
      this.blockIP(event.ip, 24 * 60 * 60 * 1000); // 24 hours
    }

    // Skicka alert om threshold överskrids
    const threshold = this.alertThresholds[event.type];
    const recentCount = this.getRecentEventCount(event.type, event.ip, 60 * 60 * 1000); // 1 hour

    if (recentCount >= threshold) {
      this.sendAlert(event);
    }
  }

  /**
   * Blockera IP
   */
  blockIP(ip: string, durationMs: number): void {
    this.blockedIPs.add(ip);
    
    console.warn('[SECURITY] IP blocked:', {
      ip,
      duration: durationMs / 1000 / 60, // minutes
      timestamp: new Date().toISOString()
    });

    // Unblock efter duration
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      console.log('[SECURITY] IP unblocked:', {
        ip,
        timestamp: new Date().toISOString()
      });
    }, durationMs);
  }

  /**
   * Kontrollera om IP är blockerad
   */
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * Hämta antal events för given typ och IP
   */
  private getRecentEventCount(type: string, ip: string, timeWindowMs: number): number {
    const cutoff = Date.now() - timeWindowMs;
    
    return this.events.filter(event => 
      event.type === type && 
      event.ip === ip && 
      event.timestamp.getTime() > cutoff
    ).length;
  }

  /**
   * Skicka alert
   */
  private sendAlert(event: SecurityEvent): void {
    const alert = {
      type: 'SECURITY_ALERT',
      severity: event.severity,
      event: {
        type: event.type,
        ip: event.ip,
        path: event.path,
        timestamp: event.timestamp.toISOString(),
        details: event.details
      },
      timestamp: new Date().toISOString()
    };

    console.error('[SECURITY ALERT]', JSON.stringify(alert, null, 2));

    // I production, skicka till monitoring system
    if (process.env.NODE_ENV === 'production') {
      // Skicka till Sentry, Slack, etc.
      this.sendToMonitoringSystem(alert);
    }
  }

  /**
   * Skicka till monitoring system
   */
  private sendToMonitoringSystem(alert: any): void {
    // Implementera integration med ditt monitoring system
    // Ex: Sentry.captureMessage('Security Alert', { extra: alert });
  }

  /**
   * Generera event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hämta security metrics
   */
  getMetrics(): SecurityMetrics {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const ipCounts: Record<string, number> = {};

    for (const event of this.events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
    }

    const topOffenders = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    const recentEvents = this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      topOffenders,
      recentEvents,
      blockedIPs: this.blockedIPs
    };
  }

  /**
   * Hämta events per typ
   */
  getEventsByType(type: SecurityEvent['type'], limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Hämta events per IP
   */
  getEventsByIP(ip: string, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.ip === ip)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Hämta kritiska events
   */
  getCriticalEvents(limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.severity === 'critical')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Generera security rapport
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentEvents = this.events.filter(event => event.timestamp > last24h);
    const criticalEvents = recentEvents.filter(event => event.severity === 'critical');
    const highEvents = recentEvents.filter(event => event.severity === 'high');

    let report = '# Security Report\n\n';
    report += `Generated: ${now.toISOString()}\n`;
    report += `Period: Last 24 hours\n\n`;

    report += '## Summary\n';
    report += `- Total events: ${recentEvents.length}\n`;
    report += `- Critical events: ${criticalEvents.length}\n`;
    report += `- High severity events: ${highEvents.length}\n`;
    report += `- Blocked IPs: ${this.blockedIPs.size}\n\n`;

    report += '## Events by Type\n';
    for (const [type, count] of Object.entries(metrics.eventsByType)) {
      report += `- ${type}: ${count}\n`;
    }
    report += '\n';

    report += '## Events by Severity\n';
    for (const [severity, count] of Object.entries(metrics.eventsBySeverity)) {
      report += `- ${severity}: ${count}\n`;
    }
    report += '\n';

    report += '## Top Offenders\n';
    for (const { ip, count } of metrics.topOffenders.slice(0, 5)) {
      report += `- ${ip}: ${count} events\n`;
    }
    report += '\n';

    if (criticalEvents.length > 0) {
      report += '## Critical Events\n';
      for (const event of criticalEvents.slice(0, 10)) {
        report += `- ${event.timestamp.toISOString()}: ${event.type} from ${event.ip}\n`;
      }
      report += '\n';
    }

    if (highEvents.length > 0) {
      report += '## High Severity Events\n';
      for (const event of highEvents.slice(0, 10)) {
        report += `- ${event.timestamp.toISOString()}: ${event.type} from ${event.ip}\n`;
      }
      report += '\n';
    }

    // Recommendations
    report += '## Recommendations\n';
    if (criticalEvents.length > 0) {
      report += '- ⚠️ CRITICAL: Immediate action required\n';
    }
    if (highEvents.length > 10) {
      report += '- 📈 High number of high severity events detected\n';
    }
    if (metrics.topOffenders[0]?.count > 20) {
      report += '- 🚫 Consider permanent blocking top offender: ${metrics.topOffenders[0].ip}\n`;
    }
    if (this.blockedIPs.size > 100) {
      report += '- 📊 High number of blocked IPs, review security policies\n';
    }

    return report;
  }

  /**
   * Exportera events för backup
   */
  exportEvents(): SecurityEvent[] {
    return [...this.events];
  }

  /**
   * Importera events från backup
   */
  importEvents(events: SecurityEvent[]): void {
    this.events = events;
    this.cleanupOldEvents();
  }

  /**
   * Rensa gamla events
   */
  private cleanupOldEvents(): void {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    this.events = this.events.filter(event => event.timestamp.getTime() > cutoff);
  }

  /**
   * Auto-cleanup varje timme
   */
  startAutoCleanup(): void {
    setInterval(() => {
      this.cleanupOldEvents();
      console.log('[SECURITY] Auto-cleanup completed');
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Hämta security score
   */
  getSecurityScore(): number {
    const metrics = this.getMetrics();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = this.events.filter(event => event.timestamp > last24h);
    const criticalCount = recentEvents.filter(e => e.severity === 'critical').length;
    const highCount = recentEvents.filter(e => e.severity === 'high').length;
    const mediumCount = recentEvents.filter(e => e.severity === 'medium').length;
    
    // Base score 100, subtract points for events
    let score = 100;
    score -= criticalCount * 25;
    score -= highCount * 10;
    score -= mediumCount * 5;
    score -= this.blockedIPs.size * 2;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Hämta security status
   */
  getSecurityStatus(): {
    level: 'secure' | 'warning' | 'critical';
    score: number;
    blockedIPs: number;
    recentCriticalEvents: number;
    recommendations: string[];
  } {
    const score = this.getSecurityScore();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentCritical = this.events.filter(e => e.severity === 'critical' && e.timestamp > last24h).length;
    
    let level: 'secure' | 'warning' | 'critical' = 'secure';
    if (score < 50 || recentCritical > 0) {
      level = 'critical';
    } else if (score < 80) {
      level = 'warning';
    }

    const recommendations: string[] = [];
    if (recentCritical > 0) {
      recommendations.push('Immediate investigation required for critical events');
    }
    if (this.blockedIPs.size > 50) {
      recommendations.push('Review IP blocking policies');
    }
    if (score < 70) {
      recommendations.push('Consider implementing additional security measures');
    }

    return {
      level,
      score,
      blockedIPs: this.blockedIPs.size,
      recentCriticalEvents: recentCritical,
      recommendations
    };
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor();
