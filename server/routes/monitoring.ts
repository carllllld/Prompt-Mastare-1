import { Router } from 'express';
import { monitoringSystem } from '../lib/monitoring';
import { securityMonitor } from '../lib/security-monitor';
import { promptCache } from '../lib/prompt-cache';

const router = Router();

// Get current metrics
router.get('/metrics', (req, res) => {
  try {
    const metrics = monitoringSystem.getMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Get dashboard data
router.get('/dashboard', (req, res) => {
  try {
    const dashboard = monitoringSystem.getDashboardData();
    res.json(dashboard);
  } catch (error) {
    console.error('Failed to get dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get performance trends
router.get('/trends', (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const trends = monitoringSystem.getPerformanceTrends(hours);
    res.json(trends);
  } catch (error) {
    console.error('Failed to get trends:', error);
    res.status(500).json({ error: 'Failed to get trends' });
  }
});

// Get security metrics
router.get('/security', (req, res) => {
  try {
    const securityMetrics = securityMonitor.getMetrics();
    const securityStatus = securityMonitor.getSecurityStatus();
    
    res.json({
      metrics: securityMetrics,
      status: securityStatus
    });
  } catch (error) {
    console.error('Failed to get security metrics:', error);
    res.status(500).json({ error: 'Failed to get security metrics' });
  }
});

// Get cache metrics
router.get('/cache', (req, res) => {
  try {
    const cacheStats = promptCache.getStats();
    const cacheInsights = promptCache.getInsights();
    
    res.json({
      stats: cacheStats,
      insights: cacheInsights
    });
  } catch (error) {
    console.error('Failed to get cache metrics:', error);
    res.status(500).json({ error: 'Failed to get cache metrics' });
  }
});

// Get system health
router.get('/health', (req, res) => {
  try {
    const health = monitoringSystem.getMetrics().health;
    res.json(health);
  } catch (error) {
    console.error('Failed to get health status:', error);
    res.status(500).json({ error: 'Failed to get health status' });
  }
});

// Get active alerts
router.get('/alerts', (req, res) => {
  try {
    const alerts = monitoringSystem.getActiveAlerts();
    const securityEvents = securityMonitor.getCriticalEvents(10);
    
    res.json({
      performance: alerts,
      security: securityEvents
    });
  } catch (error) {
    console.error('Failed to get alerts:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// Export metrics
router.get('/export', (req, res) => {
  try {
    const monitoringData = monitoringSystem.exportMetrics();
    const securityData = securityMonitor.exportEvents();
    const cacheData = promptCache.export();
    
    res.json({
      monitoring: monitoringData,
      security: securityData,
      cache: cacheData,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to export metrics:', error);
    res.status(500).json({ error: 'Failed to export metrics' });
  }
});

// Get performance report
router.get('/report/performance', (req, res) => {
  try {
    const metrics = monitoringSystem.getMetrics();
    const trends = monitoringSystem.getPerformanceTrends();
    
    let report = '# Performance Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    if (metrics.performance) {
      report += '## Current Performance\n';
      report += `- Response Time: ${metrics.performance.responseTime.toFixed(0)}ms\n`;
      report += `- Memory Usage: ${(metrics.performance.memoryUsage * 100).toFixed(1)}%\n`;
      report += `- CPU Usage: ${(metrics.performance.cpuUsage * 100).toFixed(1)}%\n`;
      report += `- Active Connections: ${metrics.performance.activeConnections}\n`;
      report += `- Error Rate: ${(metrics.performance.errorRate * 100).toFixed(2)}%\n`;
      report += `- Throughput: ${metrics.performance.throughput} req/s\n\n`;
    }
    
    report += '## Trends (Last 24h)\n';
    report += `- Response Time: ${trends.responseTime.current.toFixed(0)}ms (${trends.responseTime.trend})\n`;
    report += `- Error Rate: ${(trends.errorRate.current * 100).toFixed(2)}% (${trends.errorRate.trend})\n`;
    report += `- Throughput: ${trends.throughput.current} req/s (${trends.throughput.trend})\n\n`;
    
    if (metrics.business) {
      report += '## Business Metrics\n';
      report += `- Active Users: ${metrics.business.activeUsers}\n`;
      report += `- Daily Signups: ${metrics.business.dailySignups}\n`;
      report += `- Conversion Rate: ${(metrics.business.conversionRate * 100).toFixed(1)}%\n`;
      report += `- Revenue: SEK ${metrics.business.revenue}\n`;
      report += `- Total API Requests: ${metrics.business.apiUsage.totalRequests}\n\n`;
      
      report += '### Plan Distribution\n';
      report += `- Free: ${metrics.business.planDistribution.free}\n`;
      report += `- Pro: ${metrics.business.planDistribution.pro}\n`;
      report += `- Premium: ${metrics.business.planDistribution.premium}\n\n`;
    }
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(report);
  } catch (error) {
    console.error('Failed to generate performance report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get security report
router.get('/report/security', (req, res) => {
  try {
    const report = securityMonitor.generateReport();
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(report);
  } catch (error) {
    console.error('Failed to generate security report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Clear cache (admin only)
router.post('/cache/clear', (req, res) => {
  try {
    promptCache.clear();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Preload cache (admin only)
router.post('/cache/preload', async (req, res) => {
  try {
    await promptCache.preloadCommonPrompts();
    res.json({ message: 'Cache preloaded successfully' });
  } catch (error) {
    console.error('Failed to preload cache:', error);
    res.status(500).json({ error: 'Failed to preload cache' });
  }
});

export default router;
