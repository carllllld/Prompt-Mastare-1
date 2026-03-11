/**
 * Enterprise Pipeline Contracts
 * Strict type contracts between all pipeline steps
 * Ensures data integrity and formal interfaces
 */

import type { PlanType } from "@shared/schema";
import type { WritingStyle } from "./listing-orchestrator";

// ============================================
// Core Pipeline Contracts
// ============================================

/**
 * Contract: Pipeline Input
 * What enters the pipeline
 */
export interface PipelineInputContract {
  version: "2.0";
  requestId: string;
  timestamp: string;
  user: {
    id: string;
    plan: PlanType;
  };
  prompt: {
    raw: string;
    type?: string;
    platform: "hemnet" | "booli";
    style: WritingStyle;
    wordCountMin: number;
    wordCountMax: number;
  };
  structuredData?: {
    propertyData: Record<string, any>;
  };
  imageUrls?: string[];
  features: {
    personalStyle: boolean;
    imageAnalysis: boolean;
    factCheck: boolean;
    improvementAnalysis: boolean;
  };
}

/**
 * Contract: Extraction Output
 * Output from Step 1 - Property Data Extraction
 */
export interface ExtractionOutputContract {
  step: "extraction";
  version: "2.0";
  timestamp: string;
  disposition: {
    property: {
      type: string;
      address: string;
      size?: number;
      rooms?: number;
      layout?: string;
      materials?: { kitchen?: string; bathroom?: string };
      preferred_outdoor_term?: string;
      unique_selling_points?: string[];
      year_built?: number;
      special_features?: string[];
    };
    economics?: {
      price?: number;
      fee?: number;
      association?: {
        name?: string;
        status?: string;
        renovations?: string;
      };
    };
    location?: {
      area?: string;
      transport?: string;
    };
  };
  toneAnalysis: {
    inferred_buyer?: string;
    target_audience?: string;
    market_position?: any;
    architectural_value?: any;
    market_trends?: any;
    brf_context?: any;
  };
  writingPlan: {
    emphasis_notes?: string[];
    recommended_opening?: string;
    key_strengths?: string[];
  };
  metadata: {
    source: "structured" | "ai-extracted";
    confidence: number;
    extractionDurationMs: number;
  };
}

/**
 * Contract: Blueprint Output
 * Output from Orchestrator - Generation Strategy
 */
export interface BlueprintOutputContract {
  step: "blueprint";
  version: "2.0";
  timestamp: string;
  strategy: {
    plan: PlanType;
    platform: string;
    style: WritingStyle;
    propertyType: string;
    targetWordMin: number;
    targetWordMax: number;
    minimumPublishableWordMin: number;
    strongPublishableWordFloor: number;
    qualityThresholds: {
      minimumQualityScore: number;
      minimumEvidenceSignals: number;
    };
  };
  directives: {
    openingPriority: string[];
    locationStrategy: string;
    weakFactPolicy: string;
    closingStrategy: string;
    mustIncludeFacts: string[];
    contextFacts: string[];
    emphasisPoints: string[];
    forbiddenPatterns: string[];
  };
  collaborationModel: {
    framing: string;
    roles: Array<{ role: string; responsibility: string }>;
    workflow: string[];
  };
  promptAddenda: {
    developer: string;
    user: string;
  };
}

/**
 * Contract: Generation Output
 * Output from Step 3 - Text Generation
 */
export interface GenerationOutputContract {
  step: "generation";
  version: "2.0";
  timestamp: string;
  candidates: Array<{
    label: string;
    text: string;
    qualityScore: number;
    wordCount: number;
    isPublishable: boolean;
  }>;
  selectedCandidate: {
    label: string;
    text: string;
    qualityScore: number;
    wordCount: number;
    violations: string[];
  };
  auxiliary: {
    headline: string | null;
    socialCopy: string | null;
    instagramCaption: string | null;
    showingInvitation: string | null;
    shortAd: string | null;
  };
  metadata: {
    generationDurationMs: number;
    aiCalls: number;
    temperatureUsed?: number;
    model: string;
  };
}

/**
 * Contract: Refinement Output
 * Output from Steps 4-5 - Polish and Repair
 */
export interface RefinementOutputContract {
  step: "refinement";
  version: "2.0";
  timestamp: string;
  stages: Array<{
    name: string;
    applied: boolean;
    inputText: string;
    outputText: string;
    qualityBefore: number;
    qualityAfter: number;
    violationsBefore: number;
    violationsAfter: number;
    wordCountBefore: number;
    wordCountAfter: number;
    accepted: boolean;
    rejectionReason?: string;
  }>;
  finalText: string;
  finalQuality: number;
  finalViolations: string[];
  repairStrategy?: string;
  metadata: {
    totalStages: number;
    acceptedStages: number;
    rejectedStages: number;
    totalDurationMs: number;
  };
}

/**
 * Contract: Validation Output
 * Output from Step 6 - Fact Check
 */
export interface ValidationOutputContract {
  step: "validation";
  version: "2.0";
  timestamp: string;
  factCheck: {
    executed: boolean;
    passed: boolean | null;
    issues: Array<{
      quote: string;
      reason: string;
    }>;
    qualityScore: number | null;
    correctionsApplied: boolean;
    correctedText?: string;
  };
  narrativeIntegrity: {
    issues: string[];
    genericPhraseCount: number;
  };
  finalValidation: {
    wordCount: number;
    meetsMinimumLength: boolean;
    isDispositionLike: boolean;
    isPublishable: boolean;
  };
}

/**
 * Contract: Audit Output
 * Output from Final Broker Audit
 */
export interface AuditOutputContract {
  step: "audit";
  version: "2.0";
  timestamp: string;
  audit: {
    performed: boolean;
    skipped: boolean;
    skipReason?: string;
    publishReady: boolean;
    qualityScore: number;
    verdict: string;
    issues: string[];
  };
  rescue: {
    attempted: boolean;
    applied: boolean;
    issues: string[];
    retryAudit?: {
      publishReady: boolean;
      qualityScore: number;
      verdict: string;
    };
  };
  final: {
    text: string;
    qualityScore: number;
    publishReady: boolean;
    wordCount: number;
  };
}

/**
 * Contract: Pipeline Output
 * Final output from the entire pipeline
 */
export interface PipelineOutputContract {
  version: "2.0";
  requestId: string;
  timestamp: string;
  success: boolean;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
    step: string;
  };
  data: {
    text: string;
    headline: string | null;
    socialCopy: string | null;
    instagramCaption: string | null;
    showingInvitation: string | null;
    shortAd: string | null;
    improvementSuggestions?: {
      tone: string;
      structure_quality: string;
      information_density: string;
      strengths: string[];
      text_improvements: string[];
    };
  };
  quality: {
    score: number;
    wordCount: number;
    publishReady: boolean;
    factCheckPassed: boolean | null;
    brokerAuditPassed: boolean;
    violations: string[];
  };
  metadata: {
    totalDurationMs: number;
    totalAiCalls: number;
    stepsExecuted: string[];
    featuresUsed: string[];
    rescueAttempts: number;
    polishAttempts: number;
    fastPathTaken: boolean;
    structuredDataUsed: boolean;
  };
}

// ============================================
// Contract Validation Functions
// ============================================

/**
 * Validate extraction output against contract
 */
export function validateExtractionOutput(
  output: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!output) {
    return { valid: false, errors: ["Output is null or undefined"] };
  }
  
  if (output.step !== "extraction") {
    errors.push(`Invalid step: expected 'extraction', got '${output.step}'`);
  }
  
  if (!output.disposition?.property?.address) {
    errors.push("Missing required field: disposition.property.address");
  }
  
  if (!output.toneAnalysis) {
    errors.push("Missing required field: toneAnalysis");
  }
  
  if (!output.writingPlan) {
    errors.push("Missing required field: writingPlan");
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate generation output against contract
 */
export function validateGenerationOutput(
  output: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!output) {
    return { valid: false, errors: ["Output is null or undefined"] };
  }
  
  if (output.step !== "generation") {
    errors.push(`Invalid step: expected 'generation', got '${output.step}'`);
  }
  
  if (!Array.isArray(output.candidates) || output.candidates.length === 0) {
    errors.push("Missing or empty candidates array");
  }
  
  if (!output.selectedCandidate?.text) {
    errors.push("Missing selected candidate text");
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate pipeline output against contract
 */
export function validatePipelineOutput(
  output: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!output) {
    return { valid: false, errors: ["Output is null or undefined"] };
  }
  
  if (output.version !== "2.0") {
    errors.push(`Invalid version: expected '2.0', got '${output.version}'`);
  }
  
  if (!output.requestId) {
    errors.push("Missing required field: requestId");
  }
  
  if (typeof output.success !== "boolean") {
    errors.push("Missing or invalid success flag");
  }
  
  if (!output.success && !output.error) {
    errors.push("Failed pipeline must include error details");
  }
  
  if (output.success && !output.data?.text) {
    errors.push("Successful pipeline must include output text");
  }
  
  return { valid: errors.length === 0, errors };
}

// ============================================
// Contract Envelopes (for step-to-step communication)
// ============================================

/**
 * Standard envelope for all step outputs
 */
export interface StepEnvelope<T> {
  version: "2.0";
  step: string;
  timestamp: string;
  requestId: string;
  payload: T;
  validation: {
    valid: boolean;
    errors: string[];
  };
  metrics: {
    durationMs: number;
    aiCalls: number;
    tokensUsed?: number;
  };
}

/**
 * Create a validated step envelope
 */
export function createStepEnvelope<T>(
  step: string,
  requestId: string,
  payload: T,
  validator: (payload: T) => { valid: boolean; errors: string[] },
  metrics: { durationMs: number; aiCalls: number; tokensUsed?: number }
): StepEnvelope<T> {
  const validation = validator(payload);
  
  return {
    version: "2.0",
    step,
    timestamp: new Date().toISOString(),
    requestId,
    payload,
    validation,
    metrics,
  };
}

// ============================================
// Error Contracts
// ============================================

export interface PipelineErrorContract {
  code: string;
  message: string;
  step: string;
  recoverable: boolean;
  originalError?: Error;
  context?: Record<string, any>;
}

export class PipelineContractError extends Error {
  public readonly code: string;
  public readonly step: string;
  public readonly recoverable: boolean;
  public readonly context?: Record<string, any>;
  
  constructor(contract: PipelineErrorContract) {
    super(contract.message);
    this.name = "PipelineContractError";
    this.code = contract.code;
    this.step = contract.step;
    this.recoverable = contract.recoverable;
    this.context = contract.context;
  }
}

// ============================================
// Migration Helpers
// ============================================

/**
 * Check if data matches expected contract version
 */
export function checkContractVersion(
  data: any,
  expectedVersion: string
): boolean {
  return data?.version === expectedVersion;
}

/**
 * Log contract violation for observability
 */
export function logContractViolation(
  step: string,
  violation: string,
  data: any
): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    message: "Contract violation",
    service: "pipeline-contracts",
    step,
    violation,
    dataPreview: typeof data === "object" ? Object.keys(data) : typeof data,
  }));
}
