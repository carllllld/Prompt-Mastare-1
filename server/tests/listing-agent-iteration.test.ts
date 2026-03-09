import { describe, expect, it } from "vitest";
import { runAgentIteration } from "../lib/listing-agent-iteration";
import { createListingRunState } from "../lib/listing-run-state";

describe("listing agent iteration", () => {
  it("combines checkpoint, recovery and observability into one result", () => {
    const runState = createListingRunState();
    runState.result = { improvedPrompt: "Kort text med generisk öppning" };

    const iteration = runAgentIteration({
      runState,
      stage: "pre-repair",
      actionLabel: "evaluate issues before local repair",
      currentViolations: ["Generisk öppning utan tydlig stark detalj"],
      wordShortfall: 24,
      genericBrokerPhraseCount: 1,
      factCheckAvailable: true,
      recoveryStage: "local_repair",
      hasUsableText: true,
    });

    expect(iteration.checkpoint.issueSummary.nextAction).toBe("expand");
    expect(iteration.recoveryDecision.action).toBe("continue");
    expect(iteration.checkpointEvent.stage).toBe("pre-repair");
  });

  it("can synchronize issues back into run state", () => {
    const runState = createListingRunState();
    runState.result = { improvedPrompt: "Text med generisk öppning" };

    runAgentIteration({
      runState,
      stage: "pre-fact-check",
      actionLabel: "evaluate whether fact-check should run",
      currentViolations: ["Generisk öppning utan tydlig stark detalj"],
      factCheckAvailable: true,
      recoveryStage: "local_repair",
      hasUsableText: true,
      syncRunState: true,
    });

    expect(runState.openIssues).toContain("Generisk öppning utan tydlig stark detalj");
    expect(runState.issueSummary?.nextAction).toBe("fact_check");
  });

  it("requests rescue in final audit iteration when issues remain", () => {
    const runState = createListingRunState();
    runState.result = { improvedPrompt: "Text med kvarvarande problem" };

    const iteration = runAgentIteration({
      runState,
      stage: "broker-audit-gate",
      actionLabel: "evaluate whether broker audit can be skipped",
      currentViolations: ["Svagt lägesslut"],
      genericBrokerPhraseCount: 0,
      narrativeIntegrityIssues: [],
      requiresBrokerAudit: true,
      factCheckAvailable: false,
      recoveryStage: "final_audit",
      hasUsableText: true,
    });

    expect(iteration.recoveryDecision.action).toBe("rescue");
    expect(iteration.checkpoint.issueSummary.nextAction).toBe("surgical_repair");
    expect(iteration.checkpointEvent.nextAction).toBe("surgical_repair");
  });

  it("can override the exposed event next action for rescue observability", () => {
    const runState = createListingRunState();
    runState.result = { improvedPrompt: "Text med kvarvarande problem" };

    const iteration = runAgentIteration({
      runState,
      stage: "final-audit-rescue-gate",
      actionLabel: "evaluate whether rescue rewrite should run",
      currentViolations: ["Svagt lägesslut"],
      recoveryStage: "final_audit",
      hasUsableText: true,
      overrideEventNextAction: "rescue_rewrite",
    });

    expect(iteration.recoveryDecision.action).toBe("rescue");
    expect(iteration.checkpoint.issueSummary.nextAction).toBe("surgical_repair");
    expect(iteration.checkpointEvent.nextAction).toBe("rescue_rewrite");
  });
});
