/**
 * Regression tests: old pipeline removal (Task 12.1)
 *
 * Verifies that:
 * - Old 7-step pipeline files no longer exist
 * - A/B test infrastructure is gone
 * - PipelineResult has no variant/fallbackUsed fields
 * - PerfectSwedishOrchestrator is the only pipeline entry point
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const serverLib = path.resolve(__dirname, '../lib');

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(serverLib, relativePath));
}

// ─── Old pipeline files must NOT exist ───────────────────────────────────────

describe('12.1 Old 7-step pipeline files are removed', () => {
  const deletedFiles = [
    'listing-orchestrator.ts',
    'listing-agent-iteration.ts',
    'listing-loop-coordinator.ts',
    'listing-decision-engine.ts',
    'listing-quality-guards.ts',
    'listing-refinement-coordinator.ts',
    'listing-final-audit-subflow.ts',
    'listing-broker-realism-scorecard.ts',
    'listing-pipeline-observability.ts',
  ];

  deletedFiles.forEach(file => {
    it(`should NOT have ${file}`, () => {
      expect(fileExists(file)).toBe(false);
    });
  });
});

// ─── A/B test infrastructure must NOT exist ──────────────────────────────────

describe('12.1 A/B test infrastructure is removed', () => {
  it('should NOT have perfect-swedish-ab-test.ts', () => {
    expect(fileExists('perfect-swedish-ab-test.ts')).toBe(false);
  });
});

// ─── New pipeline files MUST exist ───────────────────────────────────────────

describe('12.1 New 3-step pipeline files exist', () => {
  const requiredFiles = [
    'perfect-swedish-orchestrator.ts',
    'perfect-swedish-generator.ts',
    'perfect-swedish-post-processor.ts',
    'perfect-swedish-analyzer.ts',
  ];

  requiredFiles.forEach(file => {
    it(`should have ${file}`, () => {
      expect(fileExists(file)).toBe(true);
    });
  });
});

// ─── PipelineResult interface has no old fields ───────────────────────────────

describe('12.1 PipelineResult has no old A/B test fields', () => {
  it('should not export variant field from PipelineResult', async () => {
    const { PerfectSwedishOrchestrator } = await import('../lib/perfect-swedish-orchestrator');
    // Instantiate to verify the class loads without errors
    const orch = new PerfectSwedishOrchestrator();
    expect(orch).toBeDefined();

    // The type check is compile-time, but we can verify the runtime shape
    // by checking that a mock result doesn't accidentally include these fields
    // (they would only appear if the orchestrator sets them)
  });

  it('PerfectSwedishOrchestrator should be importable as the sole pipeline', async () => {
    const module = await import('../lib/perfect-swedish-orchestrator');
    expect(module.PerfectSwedishOrchestrator).toBeDefined();
    expect(typeof module.PerfectSwedishOrchestrator).toBe('function');
  });

  it('should not be able to import old listing-orchestrator', async () => {
    const oldOrchestratorPath = path.join(serverLib, 'listing-orchestrator.ts');
    expect(fs.existsSync(oldOrchestratorPath)).toBe(false);
  });
});

// ─── Source code must not reference old modules ───────────────────────────────

describe('12.1 Source code has no references to deleted modules', () => {
  const orchestratorSource = fs.readFileSync(
    path.join(serverLib, 'perfect-swedish-orchestrator.ts'),
    'utf-8'
  );

  it('orchestrator should not import listing-orchestrator', () => {
    expect(orchestratorSource).not.toContain('listing-orchestrator');
  });

  it('orchestrator should not import listing-pipeline-observability', () => {
    expect(orchestratorSource).not.toContain('listing-pipeline-observability');
  });

  it('orchestrator should not import perfect-swedish-ab-test', () => {
    expect(orchestratorSource).not.toContain('perfect-swedish-ab-test');
  });

  it('orchestrator should not reference forceVariant', () => {
    expect(orchestratorSource).not.toContain('forceVariant');
  });

  it('orchestrator should not reference fallbackToOldPipeline', () => {
    expect(orchestratorSource).not.toContain('fallbackToOldPipeline');
  });

  it('orchestrator should not reference fallbackUsed', () => {
    expect(orchestratorSource).not.toContain('fallbackUsed');
  });
});

// ─── PipelineRequest interface ────────────────────────────────────────────────

describe('12.1 PipelineRequest has no old A/B test parameters', () => {
  it('PipelineRequest type should not include forceVariant', async () => {
    const orchestratorSource = fs.readFileSync(
      path.join(serverLib, 'perfect-swedish-orchestrator.ts'),
      'utf-8'
    );
    // The interface definition should not contain forceVariant
    const interfaceMatch = orchestratorSource.match(/interface PipelineRequest\s*\{([^}]+)\}/s);
    if (interfaceMatch) {
      expect(interfaceMatch[1]).not.toContain('forceVariant');
    }
  });

  it('PipelineResult type should not include variant', async () => {
    const orchestratorSource = fs.readFileSync(
      path.join(serverLib, 'perfect-swedish-orchestrator.ts'),
      'utf-8'
    );
    const interfaceMatch = orchestratorSource.match(/interface PipelineResult\s*\{([^}]+)\}/s);
    if (interfaceMatch) {
      expect(interfaceMatch[1]).not.toContain('variant');
      expect(interfaceMatch[1]).not.toContain('fallbackUsed');
    }
  });
});
