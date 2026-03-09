/**
 * Enterprise API Routes
 * Health checks, metrics, and operational endpoints
 */

import { Router } from "express";
import { enterpriseHealthChecker, metricsMiddleware } from "../lib/enterprise-health";
import { circuitBreakerRegistry } from "../lib/circuit-breaker";
import { pipelineObservability } from "../lib/listing-pipeline-observability";
import { experimentManager } from "../lib/experiment-framework";

const router = Router();

// Apply metrics middleware to all routes
router.use(metricsMiddleware());

/**
 * GET /health - Liveness probe
 * Kubernetes/Docker health check
 */
router.get("/health", (_req, res) => {
  const isAlive = enterpriseHealthChecker.isAlive();
  
  if (isAlive) {
    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: "not-alive",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /ready - Readiness probe
 * Load balancer readiness check
 */
router.get("/ready", async (_req, res) => {
  const isReady = enterpriseHealthChecker.isReady();
  
  if (isReady) {
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: "not-ready",
      timestamp: new Date().toISOString(),
      reason: "System is currently unhealthy",
    });
  }
});

/**
 * GET /status - Full health status
 * Comprehensive system health check
 */
router.get("/status", async (_req, res) => {
  try {
    const health = await enterpriseHealthChecker.checkHealth(circuitBreakerRegistry);
    
    // Include pipeline metrics
    const pipelineReport = pipelineObservability.generateReport();
    
    // Include circuit breaker status
    const circuitBreakers = circuitBreakerRegistry.healthCheck();
    
    const status = {
      ...health,
      pipeline: pipelineReport,
      circuitBreakers,
    };
    
    const statusCode = health.status === "healthy" ? 200 : 
                       health.status === "degraded" ? 200 : 503;
    
    res.status(statusCode).json(status);
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /metrics - Prometheus-style metrics
 * Production metrics for monitoring systems
 */
router.get("/metrics", (_req, res) => {
  try {
    const report = pipelineObservability.generateReport();
    const circuitBreakerMetrics = circuitBreakerRegistry.getAllMetrics();
    
    // Format as Prometheus text
    let output = "";
    
    // Pipeline metrics
    output += `# HELP pipeline_runs_total Total pipeline runs\n`;
    output += `# TYPE pipeline_runs_total counter\n`;
    output += `pipeline_runs_total ${report.totalRuns}\n`;
    
    output += `# HELP pipeline_success_rate Pipeline success rate\n`;
    output += `# TYPE pipeline_success_rate gauge\n`;
    output += `pipeline_success_rate ${report.successRate}\n`;
    
    output += `# HELP pipeline_avg_duration_ms Average pipeline duration\n`;
    output += `# TYPE pipeline_avg_duration_ms gauge\n`;
    output += `pipeline_avg_duration_ms ${report.avgDurationMs}\n`;
    
    // Step performance
    for (const step of report.stepPerformance) {
      output += `# HELP pipeline_step_duration_ms{step="${step.step}"} Step duration\n`;
      output += `pipeline_step_duration_ms{step="${step.step}"} ${step.avgDurationMs}\n`;
      
      output += `# HELP pipeline_step_error_rate{step="${step.step}"} Step error rate\n`;
      output += `pipeline_step_error_rate{step="${step.step}"} ${step.errorRate}\n`;
    }
    
    // Circuit breaker metrics
    for (const [name, metrics] of Object.entries(circuitBreakerMetrics)) {
      output += `# HELP circuit_breaker_state Circuit breaker state (0=closed, 1=half-open, 2=open)\n`;
      const stateValue = metrics.state === "closed" ? 0 : metrics.state === "half-open" ? 1 : 2;
      output += `circuit_breaker_state{name="${name}"} ${stateValue}\n`;
      
      output += `# HELP circuit_breaker_failure_rate Circuit breaker failure rate\n`;
      output += `circuit_breaker_failure_rate{name="${name}"} ${metrics.failureRate}\n`;
    }
    
    res.setHeader("Content-Type", "text/plain");
    res.send(output);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate metrics",
    });
  }
});

/**
 * GET /experiments - List all experiments
 */
router.get("/experiments", (_req, res) => {
  const experiments = experimentManager.getAllExperiments();
  res.json({
    experiments,
    count: experiments.length,
  });
});

/**
 * GET /experiments/:id/results - Get experiment results
 */
router.get("/experiments/:id/results", (req, res) => {
  const { id } = req.params;
  const results = experimentManager.getResults(id);
  
  res.json({
    experimentId: id,
    ...results,
  });
});

/**
 * POST /experiments/:id/start - Start an experiment
 */
router.post("/experiments/:id/start", (req, res) => {
  const { id } = req.params;
  const success = experimentManager.startExperiment(id);
  
  if (success) {
    res.json({
      success: true,
      message: `Experiment ${id} started`,
    });
  } else {
    res.status(400).json({
      success: false,
      message: `Failed to start experiment ${id}. May already be running or not exist.`,
    });
  }
});

/**
 * POST /experiments/:id/pause - Pause an experiment
 */
router.post("/experiments/:id/pause", (req, res) => {
  const { id } = req.params;
  const success = experimentManager.pauseExperiment(id);
  
  if (success) {
    res.json({
      success: true,
      message: `Experiment ${id} paused`,
    });
  } else {
    res.status(400).json({
      success: false,
      message: `Failed to pause experiment ${id}. May not be running.`,
    });
  }
});

/**
 * POST /experiments/:id/complete - Complete an experiment
 */
router.post("/experiments/:id/complete", (req, res) => {
  const { id } = req.params;
  const { winner } = req.body;
  const success = experimentManager.completeExperiment(id, winner);
  
  if (success) {
    res.json({
      success: true,
      message: `Experiment ${id} completed${winner ? ` with winner ${winner}` : ""}`,
    });
  } else {
    res.status(400).json({
      success: false,
      message: `Failed to complete experiment ${id}.`,
    });
  }
});

/**
 * GET /pipeline/report - Generate pipeline performance report
 */
router.get("/pipeline/report", (_req, res) => {
  const report = pipelineObservability.generateReport();
  res.json(report);
});

/**
 * GET /pipeline/runs - Get recent pipeline runs
 */
router.get("/pipeline/runs", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const history = pipelineObservability.getRunHistory(limit);
  
  res.json({
    runs: history,
    count: history.length,
  });
});

/**
 * GET /circuit-breakers - Circuit breaker status
 */
router.get("/circuit-breakers", (_req, res) => {
  const all = circuitBreakerRegistry.getAllMetrics();
  const health = circuitBreakerRegistry.healthCheck();
  
  res.json({
    circuitBreakers: all,
    health,
    summary: {
      healthy: health.healthy.length,
      degraded: health.degraded.length,
      unhealthy: health.unhealthy.length,
      total: health.healthy.length + health.degraded.length + health.unhealthy.length,
    },
  });
});

/**
 * POST /circuit-breakers/:name/reset - Reset a circuit breaker
 */
router.post("/circuit-breakers/:name/reset", (req, res) => {
  const { name } = req.params;
  const breaker = circuitBreakerRegistry.get(name);
  
  breaker.forceClose();
  
  res.json({
    success: true,
    message: `Circuit breaker ${name} reset to closed state`,
    metrics: breaker.getMetrics(),
  });
});

/**
 * GET /observability/config - Get observability configuration
 */
router.get("/observability/config", (_req, res) => {
  res.json({
    observability: "Pipeline observability is enabled",
    features: {
      stepMetrics: true,
      aiCallTracking: true,
      errorTracking: true,
      qualityMetrics: true,
      timing: true,
    },
    endpoints: {
      health: "/api/enterprise/health",
      ready: "/api/enterprise/ready",
      status: "/api/enterprise/status",
      metrics: "/api/enterprise/metrics",
      experiments: "/api/enterprise/experiments",
      pipelineReport: "/api/enterprise/pipeline/report",
      circuitBreakers: "/api/enterprise/circuit-breakers",
    },
  });
});

export default router;
