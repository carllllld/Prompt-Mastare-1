import type { ListingIssueSummary } from "./listing-issue-evaluator";

export interface ListingCandidateState {
  label: string;
  result: any;
  qualityScore: number;
  nonWordCountViolations: string[];
  wordCount: number;
  weakHemnetDetailCount: number;
  totalScore: number;
}

export interface ListingBaselineState {
  text: string;
  auxFields: {
    socialCopy: string | null;
    instagramCaption: string | null;
    showingInvitation: string | null;
    shortAd: string | null;
    headline: string | null;
  };
  nonWordCountViolations: string[];
  qualityScore: number;
  wordCount: number;
  isStrong: boolean;
}

export interface ListingRunState {
  candidates: ListingCandidateState[];
  selectedCandidateLabel: string | null;
  result: any;
  strongCandidateFastPath: boolean;
  baseline: ListingBaselineState | null;
  openIssues: string[];
  lastRepairKind: string | null;
  factCheckResult: any;
  factCheckTextBasis: string | null;
  finalBrokerAudit: any;
  issueSummary: ListingIssueSummary | null;
  agenticFeedback: string[];
}

export function createListingRunState(): ListingRunState {
  return {
    candidates: [],
    selectedCandidateLabel: null,
    result: null,
    strongCandidateFastPath: false,
    baseline: null,
    openIssues: [],
    lastRepairKind: null,
    factCheckResult: null,
    factCheckTextBasis: null,
    finalBrokerAudit: null,
    issueSummary: null,
    agenticFeedback: [],
  };
}

export function setAgenticFeedback(state: ListingRunState, feedback: string[]): void {
  state.agenticFeedback = feedback.slice();
}

export function addAgenticFeedback(state: ListingRunState, feedback: string[]): void {
  state.agenticFeedback = [...state.agenticFeedback, ...feedback];
}

export function addCandidateToRunState(state: ListingRunState, candidate: ListingCandidateState): void {
  state.candidates.push(candidate);
}

export function setSelectedCandidate(state: ListingRunState, label: string, result: any, strongCandidateFastPath: boolean): void {
  state.selectedCandidateLabel = label;
  state.result = result;
  state.strongCandidateFastPath = strongCandidateFastPath;
}

export function setRunBaseline(state: ListingRunState, baseline: ListingBaselineState): void {
  state.baseline = baseline;
}

export function setOpenIssues(state: ListingRunState, issues: string[]): void {
  state.openIssues = issues.slice();
}

export function setLastRepairKind(state: ListingRunState, repairKind: string | null): void {
  state.lastRepairKind = repairKind;
}

export function setFactCheckState(state: ListingRunState, factCheckResult: any, factCheckTextBasis: string | null): void {
  state.factCheckResult = factCheckResult;
  state.factCheckTextBasis = factCheckTextBasis;
}

export function setFinalBrokerAudit(state: ListingRunState, finalBrokerAudit: any): void {
  state.finalBrokerAudit = finalBrokerAudit;
}

export function setIssueSummary(state: ListingRunState, issueSummary: ListingIssueSummary | null): void {
  state.issueSummary = issueSummary;
}
