import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerfectSwedishAlerts } from '../lib/perfect-swedish-alerts';
import { PerfectSwedishMonitoring } from '../lib/perfect-swedish-monitoring';

// Mock the monitoring module
vi.mock('../lib/perfect-swedish-monitoring', () => ({
  PerfectSwedishMonitoring: vi.fn().mockImplementation(() => ({
    collectMetrics: vi.fn()
  }))
}));

// Mock Sentry
vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn()
}));

describe('PerfectSwedishAlerts', () => {
  let alerts: PerfectSwedishAlerts;
  let mockMonitoring: any;

  beforeEach(() => {
    alerts = new PerfectSwedishAlerts();
    mockMonitoring = (alerts as any).monitoring;
    vi.clearAllMocks();
  });

  describe('checkThresholds', () => {
    it('should detect success rate alert', async () => {
      mockMonitoring.collectMetrics.mockResolvedValue({
        variant: 'treatment',
        successRate: 92, // Below 95% threshold
        avgGenerationTime: 20000,
        fallbackRate: 5,
        userSatisfaction: 0.8,
        sampleSize: 50
      });

      const alertList = await alerts.checkThresholds('treatment', 1);

      expect(alertList.length).toBe(1);
      expect(alertList[0].metric).toBe('success_rate');
      expect(alertList[0].severity).toBe('warning');
      expect(alertList[0].currentValue).toBe(92);
    });

    it('should detect generation time alert', async () => {
      mockMonitoring.collectMetrics.mockResolvedValue({
        variant: 'treatment',
        successRate: 96,
        avgGenerationTime: 28000, // Above 25000ms threshold
        fallbackRate: 5,
        userSatisfaction: 0.8,
        sampleSize: 50
      });

      const alertList = await alerts.checkThresholds('treatment', 1);

      expect(alertList.length).toBe(1);
      expect(alertList[0].metric).toBe('generation_time');
      expect(alertList[0].severity).toBe('warning');
    });

    it('should detect fallback rate alert', async () => {
      mockMonitoring.collectMetrics.mockResolvedValue({
        variant: 'treatment',
        successRate: 96,
        avgGenerationTime: 20000,
        fallbackRate: 15, // Above 10% threshold
        userSatisfaction: 0.8,
        sampleSize: 50
      });

      const alertList = await alerts.checkThresholds('treatment', 1);

      expect(alertList.length).toBe(1);
      expect(alertList[0].metric).toBe('fallback_rate');
      expect(alertList[0].severity).toBe('warning');
    });

    it('should detect user satisfaction alert', async () => {
      mockMonitoring.collectMetrics.mockResolvedValue({
        variant: 'treatment',
        successRate: 96,
        avgGenerationTime: 20000,
        fallbackRate: 5,
        userSatisfaction: 0.65, // Below 0.7 threshold
        sampleSize: 50
      });

      const alertList = await alerts.checkThresholds('treatment', 1);

      expect(alertList.length).toBe(1);
      expect(alertList[0].metric).toBe('user_satisfaction');
      expect(alertList[0].severity).toBe('warning');
    });

    it('should detect multiple alerts', async () => {
      mockMonitoring.collectMetrics.mockResolvedValue({
        variant: 'treatment',
        successRate: 92, // Alert
        avgGenerationTime: 28000, // Alert
        fallbackRate: 15, // Alert
        userSatisfaction: 0.65, // Alert
        sampleSize: 50
      });

      const alertList = await alerts.checkThresholds('treatment', 1);

      expect(alertList.length).toBe(4);
    });

    it('should not alert when all metrics are healthy', async () => {
      mockMonitoring.collectMetrics.mockResolvedValue({
        variant: 'treatment',
        successRate: 97,
        avgGenerationTime: 22000,
        fallbackRate: 5,
        userSatisfaction: 0.85,
        sampleSize: 50
      });

      const alertList = await alerts.checkThresholds('treatment', 1);

      expect(alertList.length).toBe(0);
    });

    it('should skip check with insufficient sample size', async () => {
      mockMonitoring.collectMetrics.mockResolvedValue({
        variant: 'treatment',
        successRate: 50, // Would trigger alert
        avgGenerationTime: 50000, // Would trigger alert
        fallbackRate: 50, // Would trigger alert
        userSatisfaction: 0.3, // Would trigger alert
        sampleSize: 3 // Too small
      });

      const alertList = await alerts.checkThresholds('treatment', 1);

      expect(alertList.length).toBe(0);
    });

    it('should mark critical severity for severe violations', async () => {
      mockMonitoring.collectMetrics.mockResolvedValue({
        variant: 'treatment',
        successRate: 88, // 7pp below threshold = critical
        avgGenerationTime: 31000, // 24% above threshold = critical
        fallbackRate: 25, // 2.5x threshold = critical
        userSatisfaction: 0.55, // 0.15 below threshold = critical
        sampleSize: 50
      });

      const alertList = await alerts.checkThresholds('treatment', 1);

      expect(alertList.length).toBe(4);
      expect(alertList.every(a => a.severity === 'critical')).toBe(true);
    });
  });

  describe('checkAllVariants', () => {
    it('should check both control and treatment variants', async () => {
      mockMonitoring.collectMetrics
        .mockResolvedValueOnce({
          variant: 'control',
          successRate: 92,
          avgGenerationTime: 20000,
          fallbackRate: 5,
          userSatisfaction: 0.8,
          sampleSize: 50
        })
        .mockResolvedValueOnce({
          variant: 'treatment',
          successRate: 93,
          avgGenerationTime: 20000,
          fallbackRate: 5,
          userSatisfaction: 0.8,
          sampleSize: 50
        });

      const notification = await alerts.checkAllVariants(1);

      expect(notification.alerts.length).toBe(2);
      expect(notification.alerts.some(a => a.variant === 'control')).toBe(true);
      expect(notification.alerts.some(a => a.variant === 'treatment')).toBe(true);
    });
  });

  describe('updateThresholds', () => {
    it('should update thresholds', () => {
      alerts.updateThresholds({
        successRate: { min: 90, enabled: true }
      });

      const thresholds = alerts.getThresholds();
      expect(thresholds.successRate.min).toBe(90);
    });

    it('should preserve other thresholds when updating one', () => {
      const originalThresholds = alerts.getThresholds();
      
      alerts.updateThresholds({
        successRate: { min: 90, enabled: true }
      });

      const newThresholds = alerts.getThresholds();
      expect(newThresholds.generationTime.max).toBe(originalThresholds.generationTime.max);
      expect(newThresholds.fallbackRate.max).toBe(originalThresholds.fallbackRate.max);
    });
  });
});
