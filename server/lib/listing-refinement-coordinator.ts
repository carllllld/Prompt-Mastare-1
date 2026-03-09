import { buildExpansionAttemptOutcome, buildFactCheckAttemptOutcome, buildFactCheckStateTransition } from "./listing-refinement-subflow";

export interface PolishCoordinatorResult {
  accepted: boolean;
  reason: string;
}

export interface ExpansionCoordinatorResult {
  accepted: boolean;
  nextWordCount: number;
  nextShortfall: number;
  reason: string;
}

export interface FactCheckCoordinatorResult {
  accepted: boolean;
  nextTextBasis: string | null;
  reason: string;
}

export interface RescueCoordinatorResult {
  accepted: boolean;
  reason: string;
}

export function coordinatePolishAcceptance(params: {
  accepted: boolean;
  currentViolationCount: number;
  nextViolationCount: number;
  rejectionReason?: string;
}): PolishCoordinatorResult {
  const accepted = params.accepted && params.nextViolationCount <= params.currentViolationCount;

  return {
    accepted,
    reason: accepted ? "polish accepted" : params.rejectionReason || "polish rejected",
  };
}

export function coordinateExpansionAcceptance(params: {
  accepted: boolean;
  currentWordCount: number;
  nextWordCount: number;
  minimumPublishableWordMin: number;
  rejectionReason?: string;
}): ExpansionCoordinatorResult {
  const outcome = buildExpansionAttemptOutcome({
    accepted: params.accepted,
    currentWordCount: params.currentWordCount,
    nextWordCount: params.nextWordCount,
    minimumPublishableWordMin: params.minimumPublishableWordMin,
    rejectionReason: params.rejectionReason,
  });

  return {
    accepted: outcome.accepted,
    nextWordCount: outcome.nextWordCount,
    nextShortfall: outcome.nextShortfall,
    reason: outcome.reason,
  };
}

export function coordinateFactCheckAcceptance(params: {
  accepted: boolean;
  currentWordCount: number;
  nextWordCount: number;
  minimumPublishableWordMin: number;
  currentTextBasis: string | null;
  correctedText: string | null;
  rejectionReason?: string;
}): FactCheckCoordinatorResult {
  const outcome = buildFactCheckAttemptOutcome({
    accepted: params.accepted,
    currentWordCount: params.currentWordCount,
    nextWordCount: params.nextWordCount,
    minimumPublishableWordMin: params.minimumPublishableWordMin,
    rejectionReason: params.rejectionReason,
  });

  const transition = buildFactCheckStateTransition({
    accepted: outcome.accepted,
    currentTextBasis: params.currentTextBasis,
    correctedText: params.correctedText,
  });

  return {
    accepted: transition.shouldApplyCorrectedText,
    nextTextBasis: transition.nextTextBasis,
    reason: outcome.reason,
  };
}

export function coordinateRescueAcceptance(params: {
  accepted: boolean;
  currentWordCount: number;
  nextWordCount: number;
  minimumPublishableWordMin: number;
  rejectionReason?: string;
}): RescueCoordinatorResult {
  const accepted = params.accepted && params.nextWordCount >= Math.max(params.currentWordCount - 5, params.minimumPublishableWordMin);

  return {
    accepted,
    reason: accepted ? "rescue accepted" : params.rejectionReason || "rescue rejected",
  };
}
