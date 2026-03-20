# Perfect Swedish Pipeline - Monitoring and Alerting Setup

**Version:** 1.0  
**Last Updated:** 2026-01-20  
**Audience:** DevOps, SRE

---

## Table of Contents

1. [Overview](#overview)
2. [Metrics Collection](#metrics-collection)
3. [Alert Configuration](#alert-configuration)
4. [Dashboard Setup](#dashboard-setup)
5. [Sentry Integration](#sentry-integration)
6. [Automated Health Checks](#automated-health-checks)
7. [Custom Notifications](#custom-notifications)

---

## Overview

The Perfect Swedish Pipeline includes comprehensive monitoring and alerting infrastructure:

- **8 Key Metrics** tracked in real-time
- **Automated Health Checks** every 60 minutes
- **Configurable Alert Thresholds** for proactive monitoring
- **Daily Aggregation** for trend analysis
- **Sentry Integration** for error tracking
- **API Endpoints** for metrics access

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring System                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Metrics         │         │  Alerting        │         │
│  │  Collection      │────────▶│  System          │         │
│  │                  │         │                  │         │
│  │  - Success Rate  │         │  - Thresholds    │         │
│  │  - Duration      │         │  - Severity      │         │
│  │  - Satisfaction  │         │  - Notifications │         │
│  └──────────────────┘         └──────────────────┘         │
│           │                            │                     │
│           ▼                            ▼                     │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Database        │         │  Sentry          │         │
│  │  Storage         │         │  Error Tracking  │         │
│  │                  │         │                  │         │
│  │  - Generations   │         │  - Errors        │         │
│  │  - Metrics       │         │  - Alerts        │         │
│  │  - Feedback      │         │  - Context       │         │
│  └──────────────────┘         └──────────────────┘         │
│           │                            │                     │
│           └────────────┬───────────────┘                     │
│                        ▼                                     │
│              ┌──────────────────┐                           │
│              │  Scheduler       │                           │
│              │                  │                           │
│              │  - Health Checks │                           │
│              │  - Aggregation   │                           │
│              │  - Reports       │                           │
│              └──────────────────┘                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Metrics Collection

### Key Metrics

| Metric | Description | Target | Warning | Critical |
|--------|-------------|--------|---------|----------|
| **Success Rate** | % of successful generations | ≥95% | <95% | <90% |
| **Avg Generation Time** | Average total duration | <25s | >25s | >30s |
| **P95 Generation Time** | 95th percentile duration | <28s | >28s | >35s |
| **Fallback Rate** | % using old pipeline | <10% | >10% | >20% |
| **User Satisfaction** | % positive feedback | ≥70% | <70% | <60% |
| **Regeneration Rate** | % requiring regeneration | <15% | >15% | >25% |
| **Minor Edit Rate** | % with minor edits | ≥80% | <80% | <70% |
| **Sample Size** | Number of generations | - | - | - |

### Data Sources

#### 1. Pipeline Generations Table

```sql
-- Stores every generation attempt
CREATE TABLE pipeline_generations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  variant TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  total_duration INTEGER,
  step1_duration INTEGER,
  step2_duration INTEGER,
  step3_duration INTEGER,
  retry_count INTEGER DEFAULT 0,
  fallback_used BOOLEAN DEFAULT FALSE,
  error_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Metrics Derived:**
- Success rate
- Average duration
- P95/P99 duration
- Fallback rate
- Retry count

#### 2. User Feedback Table

```sql
-- Stores user satisfaction and behavior
CREATE TABLE user_feedback (
  id SERIAL PRIMARY KEY,
  generation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  satisfaction_score INTEGER CHECK (satisfaction_score IN (-1, 1)),
  regenerated BOOLEAN DEFAULT FALSE,
  edit_type TEXT CHECK (edit_type IN ('none', 'minor', 'major', 'complete_rewrite')),
  time_to_final_text INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Metrics Derived:**
- User satisfaction
- Regeneration rate
- Minor edit rate
- Time to final text

#### 3. Pipeline Metrics Table

```sql
-- Stores aggregated daily metrics
CREATE TABLE pipeline_metrics_v2 (
  id SERIAL PRIMARY KEY,
  variant TEXT NOT NULL,
  metric_date DATE NOT NULL,
  total_generations INTEGER NOT NULL DEFAULT 0,
  successful_generations INTEGER NOT NULL DEFAULT 0,
  failed_generations INTEGER NOT NULL DEFAULT 0,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  avg_total_duration FLOAT,
  p50_total_duration FLOAT,
  p95_total_duration FLOAT,
  p99_total_duration FLOAT,
  avg_user_satisfaction FLOAT,
  regeneration_count INTEGER NOT NULL DEFAULT 0,
  minor_edit_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (variant, metric_date)
);
```

**Purpose:**
- Historical trend analysis
- Daily reporting
- Performance comparison

### API Endpoints

#### Get Current Metrics

```bash
# Treatment (new pipeline)
GET /api/perfect-swedish/metrics/current/treatment

# Control (old pipeline)
GET /api/perfect-swedish/metrics/current/control

# Response:
{
  "variant": "treatment",
  "successRate": 96.5,
  "avgGenerationTime": 22000,
  "p95GenerationTime": 24500,
  "fallbackRate": 3.2,
  "userSatisfaction": 0.85,
  "regenerationRate": 8.5,
  "minorEditRate": 72.0,
  "sampleSize": 1250,
  "timestamp": "2026-01-20T10:00:00Z"
}
```

#### Get Historical Metrics

```bash
# Last 7 days
GET /api/perfect-swedish/metrics/historical?days=7

# Date range
GET /api/perfect-swedish/metrics/historical?startDate=2026-01-13&endDate=2026-01-20

# Filter by variant
GET /api/perfect-swedish/metrics/historical?variant=treatment&days=7

# Response: Array of MetricsSnapshot
[
  {
    "variant": "treatment",
    "successRate": 96.5,
    "avgGenerationTime": 22000,
    ...
    "timestamp": "2026-01-20T00:00:00Z"
  },
  ...
]
```

#### Generate Daily Summary

```bash
# Today's summary
GET /api/perfect-swedish/metrics/summary

# Specific date
GET /api/perfect-swedish/metrics/summary?date=2026-01-19

# Response: Formatted text report
📊 Perfect Swedish Pipeline - Daily Summary
Date: 2026-01-20

🔵 Control (Old Pipeline)
  • Success Rate: 72.3%
  • Avg Generation Time: 58.2s
  ...

🟢 Treatment (New Pipeline)
  • Success Rate: 96.5%
  • Avg Generation Time: 22.0s
  ...

📈 Improvement
  • Success Rate: +24.2pp
  • Generation Time: -36.2s
  ...
```

#### Export Metrics

```bash
# JSON format
GET /api/perfect-swedish/metrics/export?format=json

# CSV format
GET /api/perfect-swedish/metrics/export?format=csv

# Response: Metrics data in requested format
```

---

## Alert Configuration

### Default Thresholds

```typescript
// In perfect-swedish-alerts.ts
const defaultThresholds: AlertThresholds = {
  successRate: {
    min: 95,        // Alert if below 95%
    enabled: true
  },
  generationTime: {
    max: 25000,     // Alert if above 25 seconds
    enabled: true
  },
  fallbackRate: {
    max: 10,        // Alert if above 10%
    enabled: true
  },
  userSatisfaction: {
    min: 0.7,       // Alert if below 70%
    enabled: true
  }
};
```

### Customizing Thresholds

#### Via API

```bash
# Update thresholds
POST /api/perfect-swedish/alerts/thresholds
Content-Type: application/json

{
  "successRate": {
    "min": 93,
    "enabled": true
  },
  "generationTime": {
    "max": 30000,
    "enabled": true
  }
}

# Get current thresholds
GET /api/perfect-swedish/alerts/thresholds

# Response:
{
  "successRate": { "min": 93, "enabled": true },
  "generationTime": { "max": 30000, "enabled": true },
  "fallbackRate": { "max": 10, "enabled": true },
  "userSatisfaction": { "min": 0.7, "enabled": true }
}
```

#### Via Code

```typescript
// In server/index.ts or initialization
import { PerfectSwedishAlerts } from './lib/perfect-swedish-alerts';

const alerts = new PerfectSwedishAlerts({
  successRate: { min: 93, enabled: true },
  generationTime: { max: 30000, enabled: true },
  fallbackRate: { max: 15, enabled: true },
  userSatisfaction: { min: 0.65, enabled: true }
});
```

### Alert Severity Levels

#### Warning
- Metric approaching threshold
- Requires monitoring
- No immediate action needed

**Triggers:**
- Success rate: 90-95%
- Generation time: 25-30s
- Fallback rate: 10-20%
- User satisfaction: 60-70%

#### Critical
- Metric exceeds threshold significantly
- Immediate investigation required
- Consider rollback

**Triggers:**
- Success rate: <90%
- Generation time: >30s
- Fallback rate: >20%
- User satisfaction: <60%

### Alert Notifications

#### Console Logging

```typescript
// Enabled by default
await alerts.sendNotification(notification, ['console']);

// Output:
================================================================================
PERFECT SWEDISH PIPELINE ALERT
================================================================================
🚨 2 alert(s) detected (1 critical, 1 warning)

🟢 Treatment (New Pipeline):
  🔴 Success rate dropped to 88.5% (threshold: 95%)
  ⚠️ Average generation time increased to 27.2s (threshold: 25.0s)
================================================================================
```

#### Sentry Integration

```typescript
// Enabled for critical alerts
await alerts.sendNotification(notification, ['console', 'sentry']);

// Sends to Sentry with:
// - Level: error (critical) or warning
// - Tags: component, variant, metric, severity
// - Extra: currentValue, threshold, sampleSize
```

#### Email Notifications (Future)

```typescript
// TODO: Implement via Resend
await alerts.sendNotification(notification, ['console', 'sentry', 'email']);

// Configuration:
const emailConfig = {
  to: ['devops@optiprompt.se', 'oncall@optiprompt.se'],
  from: 'alerts@optiprompt.se',
  subject: 'Perfect Swedish Pipeline Alert'
};
```

#### Slack Notifications (Future)

```typescript
// TODO: Implement via webhook
await alerts.sendNotification(notification, ['console', 'sentry', 'slack']);

// Configuration:
const slackConfig = {
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  channel: '#pipeline-alerts',
  username: 'Pipeline Monitor'
};
```

---

## Dashboard Setup

### Metrics Dashboard (API-Based)

Create a simple dashboard using the metrics API:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Perfect Swedish Pipeline Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>Perfect Swedish Pipeline Metrics</h1>
  
  <div id="current-metrics">
    <h2>Current Metrics (Last Hour)</h2>
    <div id="treatment-metrics"></div>
    <div id="control-metrics"></div>
  </div>
  
  <div id="historical-chart">
    <h2>Historical Trends (Last 7 Days)</h2>
    <canvas id="metricsChart"></canvas>
  </div>
  
  <script>
    // Fetch current metrics
    async function fetchCurrentMetrics() {
      const treatment = await fetch('/api/perfect-swedish/metrics/current/treatment').then(r => r.json());
      const control = await fetch('/api/perfect-swedish/metrics/current/control').then(r => r.json());
      
      document.getElementById('treatment-metrics').innerHTML = `
        <h3>Treatment (New Pipeline)</h3>
        <ul>
          <li>Success Rate: ${treatment.successRate.toFixed(1)}%</li>
          <li>Avg Generation Time: ${(treatment.avgGenerationTime / 1000).toFixed(1)}s</li>
          <li>Fallback Rate: ${treatment.fallbackRate.toFixed(1)}%</li>
          <li>User Satisfaction: ${(treatment.userSatisfaction * 100).toFixed(1)}%</li>
          <li>Sample Size: ${treatment.sampleSize}</li>
        </ul>
      `;
      
      document.getElementById('control-metrics').innerHTML = `
        <h3>Control (Old Pipeline)</h3>
        <ul>
          <li>Success Rate: ${control.successRate.toFixed(1)}%</li>
          <li>Avg Generation Time: ${(control.avgGenerationTime / 1000).toFixed(1)}s</li>
          <li>Sample Size: ${control.sampleSize}</li>
        </ul>
      `;
    }
    
    // Fetch historical metrics and render chart
    async function fetchHistoricalMetrics() {
      const data = await fetch('/api/perfect-swedish/metrics/historical?days=7').then(r => r.json());
      
      const treatmentData = data.filter(d => d.variant === 'treatment');
      const controlData = data.filter(d => d.variant === 'control');
      
      const ctx = document.getElementById('metricsChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: treatmentData.map(d => d.timestamp.split('T')[0]),
          datasets: [
            {
              label: 'Treatment Success Rate',
              data: treatmentData.map(d => d.successRate),
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            },
            {
              label: 'Control Success Rate',
              data: controlData.map(d => d.successRate),
              borderColor: 'rgb(255, 99, 132)',
              tension: 0.1
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    }
    
    // Refresh every 60 seconds
    fetchCurrentMetrics();
    fetchHistoricalMetrics();
    setInterval(fetchCurrentMetrics, 60000);
  </script>
</body>
</html>
```

### Grafana Integration (Future)

```yaml
# grafana-dashboard.json
{
  "dashboard": {
    "title": "Perfect Swedish Pipeline",
    "panels": [
      {
        "title": "Success Rate",
        "targets": [
          {
            "expr": "perfect_swedish_success_rate{variant=\"treatment\"}",
            "legendFormat": "Treatment"
          },
          {
            "expr": "perfect_swedish_success_rate{variant=\"control\"}",
            "legendFormat": "Control"
          }
        ]
      },
      {
        "title": "Generation Time",
        "targets": [
          {
            "expr": "perfect_swedish_generation_time_avg{variant=\"treatment\"}",
            "legendFormat": "Treatment Avg"
          },
          {
            "expr": "perfect_swedish_generation_time_p95{variant=\"treatment\"}",
            "legendFormat": "Treatment P95"
          }
        ]
      }
    ]
  }
}
```

---

## Sentry Integration

### Configuration

```typescript
// In server/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,
  
  // Custom tags for filtering
  beforeSend(event, hint) {
    // Add custom context
    if (event.tags) {
      event.tags.pipeline_version = 'perfect-swedish-v1';
    }
    return event;
  }
});
```

### Error Tracking

All pipeline errors are automatically sent to Sentry with context:

```typescript
// In perfect-swedish-orchestrator.ts
try {
  // Pipeline execution
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'perfect-swedish-orchestrator',
      variant: request.variant,
      step: 'smart-generation'
    },
    extra: {
      userId: request.userId,
      sessionId: request.sessionId,
      disposition: request.disposition
    }
  });
}
```

### Alert Integration

Critical alerts are sent to Sentry:

```typescript
// In perfect-swedish-alerts.ts
if (criticalAlerts.length > 0) {
  Sentry.captureMessage('Critical alerts detected in Perfect Swedish Pipeline', {
    level: 'error',
    tags: {
      component: 'perfect-swedish-alerts',
      alert_count: criticalAlerts.length.toString()
    },
    extra: {
      alerts: criticalAlerts,
      summary: notification.summary
    }
  });
}
```

### Sentry Dashboard Filters

**Useful Filters:**
- `component:perfect-swedish-*` - All pipeline components
- `variant:treatment` - New pipeline errors
- `variant:control` - Old pipeline errors
- `severity:critical` - Critical alerts
- `metric:success_rate` - Success rate alerts

---

## Automated Health Checks

### Scheduler Configuration

```typescript
// In server/index.ts
import { initializeScheduler } from './lib/perfect-swedish-scheduler';

// Start scheduler in production
if (process.env.NODE_ENV === 'production') {
  initializeScheduler(60); // Check every 60 minutes
}
```

### Health Check Frequency

**Default:** Every 60 minutes

**Customizable:**
```typescript
// Check every 30 minutes
initializeScheduler(30);

// Check every 2 hours
initializeScheduler(120);
```

### Health Check Actions

1. **Collect Metrics** (last hour)
2. **Check Thresholds** (both variants)
3. **Generate Alerts** (if thresholds exceeded)
4. **Send Notifications** (console, Sentry)
5. **Log Results**

### Daily Aggregation

**Runs:** Every day at midnight (UTC)

**Actions:**
1. Aggregate yesterday's metrics
2. Store in `pipeline_metrics_v2` table
3. Generate daily summary report
4. Log to console

### Manual Triggers

```bash
# Trigger health check manually
POST /api/perfect-swedish/alerts/check

# Trigger daily aggregation manually
POST /api/perfect-swedish/metrics/aggregate?date=2026-01-19

# Response:
{
  "success": true,
  "alerts": [...],
  "summary": "..."
}
```

---

## Custom Notifications

### Email Notifications (Implementation Guide)

```typescript
// In perfect-swedish-alerts.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmailNotification(notification: AlertNotification): Promise<void> {
  const { data, error } = await resend.emails.send({
    from: 'alerts@optiprompt.se',
    to: ['devops@optiprompt.se', 'oncall@optiprompt.se'],
    subject: `Pipeline Alert: ${notification.alerts.length} alert(s) detected`,
    html: `
      <h1>Perfect Swedish Pipeline Alert</h1>
      <p><strong>Time:</strong> ${notification.timestamp}</p>
      <p><strong>Summary:</strong> ${notification.summary}</p>
      
      <h2>Alerts</h2>
      <ul>
        ${notification.alerts.map(alert => `
          <li>
            <strong>${alert.severity.toUpperCase()}</strong>: ${alert.message}
            <br>
            <small>Variant: ${alert.variant} | Metric: ${alert.metric}</small>
          </li>
        `).join('')}
      </ul>
      
      <p><a href="https://optiprompt.se/api/perfect-swedish/metrics/current/${notification.alerts[0]?.variant}">View Metrics</a></p>
    `
  });
  
  if (error) {
    console.error('Failed to send email notification:', error);
  }
}
```

### Slack Notifications (Implementation Guide)

```typescript
// In perfect-swedish-alerts.ts
async function sendSlackNotification(notification: AlertNotification): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  
  const color = notification.alerts.some(a => a.severity === 'critical') ? 'danger' : 'warning';
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: '#pipeline-alerts',
      username: 'Pipeline Monitor',
      icon_emoji: ':warning:',
      attachments: [
        {
          color,
          title: `Pipeline Alert: ${notification.alerts.length} alert(s)`,
          text: notification.summary,
          fields: notification.alerts.map(alert => ({
            title: alert.metric,
            value: alert.message,
            short: false
          })),
          footer: 'Perfect Swedish Pipeline',
          ts: Math.floor(notification.timestamp.getTime() / 1000)
        }
      ]
    })
  });
}
```

---

## Monitoring Checklist

### Initial Setup
- [ ] Verify database tables created
- [ ] Confirm Sentry integration working
- [ ] Test metrics API endpoints
- [ ] Configure alert thresholds
- [ ] Enable scheduler in production
- [ ] Set up notification channels

### Daily Monitoring
- [ ] Review daily summary report
- [ ] Check Sentry for new errors
- [ ] Monitor key metrics
- [ ] Review user feedback

### Weekly Monitoring
- [ ] Analyze A/B test results
- [ ] Review performance trends
- [ ] Check database size
- [ ] Update documentation

### Monthly Monitoring
- [ ] Clean up old data
- [ ] Review and optimize queries
- [ ] Analyze long-term trends
- [ ] Plan improvements

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-20  
**Next Review:** Monthly
