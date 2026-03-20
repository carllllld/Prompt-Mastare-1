import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerfectSwedishMonitoring } from '../lib/perfect-swedish-monitoring';
import { pool } from '../db';

// Mock the database pool
vi.mock('../db', () => ({
  pool: {
    query: vi.fn()
  }
}));

// Mock Sentry
vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn()
}));

describe('PerfectSwedishMonitoring', () => {
  let monitoring: PerfectSwedishMonitoring;

  beforeEach(() => {
    monitoring = new PerfectSwedishMonitoring();
    vi.clearAllMocks();
  });

  describe('collectMetrics', () => {
    it('should collect metrics for a variant', async () => {
      // Mock generation metrics
      (pool.query as any).mockResolvedValueOnce({
        rows: [{
          total_generations: '100',
          successful_generations: '95',
          fallback_count: '5',
          avg_duration: '20000',
          p95_duration: '25000'
        }]
      });

      // Mock feedback metrics
      (pool.query as any).mockResolvedValueOnce({
        rows: [{
          avg_satisfaction: '0.85',
          regeneration_count: '10',
          minor_edit_count: '30'
        }]
      });

      const metrics = await monitoring.collectMetrics('treatment', 24);

      expect(metrics.variant).toBe('treatment');
      expect(metrics.successRate).toBe(95);
      expect(metrics.avgGenerationTime).toBe(20000);
      expect(metrics.p95GenerationTime).toBe(25000);
      expect(metrics.fallbackRate).toBe(5);
      expect(metrics.userSatisfaction).toBe(0.85);
      expect(metrics.regenerationRate).toBe(10);
      expect(metrics.minorEditRate).toBe(30);
      expect(metrics.sampleSize).toBe(100);
    });

    it('should handle zero generations gracefully', async () => {
      (pool.query as any).mockResolvedValueOnce({
        rows: [{
          total_generations: '0',
          successful_generations: '0',
          fallback_count: '0',
          avg_duration: null,
          p95_duration: null
        }]
      });

      (pool.query as any).mockResolvedValueOnce({
        rows: [{
          avg_satisfaction: null,
          regeneration_count: '0',
          minor_edit_count: '0'
        }]
      });

      const metrics = await monitoring.collectMetrics('control', 24);

      expect(metrics.successRate).toBe(0);
      expect(metrics.avgGenerationTime).toBe(0);
      expect(metrics.sampleSize).toBe(0);
    });
  });

  describe('generateDailySummary', () => {
    it('should generate a formatted summary', async () => {
      // Mock control metrics
      (pool.query as any).mockResolvedValueOnce({
        rows: [{
          total_generations: '100',
          successful_generations: '90',
          fallback_count: '10',
          avg_duration: '30000',
          p95_duration: '35000'
        }]
      });
      (pool.query as any).mockResolvedValueOnce({
        rows: [{
          avg_satisfaction: '0.75',
          regeneration_count: '15',
          minor_edit_count: '25'
        }]
      });

      // Mock treatment metrics
      (pool.query as any).mockResolvedValueOnce({
        rows: [{
          total_generations: '100',
          successful_generations: '96',
          fallback_count: '4',
          avg_duration: '22000',
          p95_duration: '24000'
        }]
      });
      (pool.query as any).mockResolvedValueOnce({
        rows: [{
          avg_satisfaction: '0.88',
          regeneration_count: '8',
          minor_edit_count: '35'
        }]
      });

      const summary = await monitoring.generateDailySummary();

      expect(summary).toContain('Perfect Swedish Pipeline - Daily Summary');
      expect(summary).toContain('Control (Old Pipeline)');
      expect(summary).toContain('Treatment (New Pipeline)');
      expect(summary).toContain('Success Rate: 90.0%');
      expect(summary).toContain('Success Rate: 96.0%');
      expect(summary).toContain('Improvement');
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics as JSON', async () => {
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            variant: 'treatment',
            metric_date: new Date('2024-01-15'),
            total_generations: '100',
            successful_generations: '95',
            failed_generations: '5',
            fallback_count: '3',
            avg_total_duration: '20000',
            p95_total_duration: '25000',
            avg_user_satisfaction: '0.85',
            regeneration_count: '10',
            minor_edit_count: '30'
          }
        ]
      });

      const json = await monitoring.exportMetrics('json');
      const data = JSON.parse(json);

      expect(Array.isArray(data)).toBe(true);
      expect(data[0].variant).toBe('treatment');
      expect(data[0].successRate).toBe(95);
    });

    it('should export metrics as CSV', async () => {
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            variant: 'treatment',
            metric_date: new Date('2024-01-15'),
            total_generations: '100',
            successful_generations: '95',
            failed_generations: '5',
            fallback_count: '3',
            avg_total_duration: '20000',
            p95_total_duration: '25000',
            avg_user_satisfaction: '0.85',
            regeneration_count: '10',
            minor_edit_count: '30'
          }
        ]
      });

      const csv = await monitoring.exportMetrics('csv');

      expect(csv).toContain('date,variant,success_rate');
      expect(csv).toContain('treatment');
      expect(csv).toContain('95.00');
    });
  });
});
