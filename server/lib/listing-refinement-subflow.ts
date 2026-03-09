export interface ExpansionAttemptOutcome {
  accepted: boolean;
  nextWordCount: number;
  nextShortfall: number;
  reason: string;
}

export interface FactCheckAttemptOutcome {
  accepted: boolean;
  nextWordCount: number;
  reason: string;
}

export interface PostRefinementGuardDecision {
  shouldRevert: boolean;
  reason: string;
}

export interface FactCheckStateTransition {
  nextTextBasis: string | null;
  shouldApplyCorrectedText: boolean;
}

export function buildExpansionAttemptOutcome(params: {
  accepted: boolean;
  currentWordCount: number;
  nextWordCount: number;
  minimumPublishableWordMin: number;
  rejectionReason?: string;
}): ExpansionAttemptOutcome {
  return {
    accepted: params.accepted,
    nextWordCount: params.accepted ? params.nextWordCount : params.currentWordCount,
    nextShortfall: Math.max(0, params.minimumPublishableWordMin - (params.accepted ? params.nextWordCount : params.currentWordCount)),
    reason: params.accepted
      ? "expansion accepted"
      : params.rejectionReason || "expansion rejected",
  };
}

export function buildFactCheckAttemptOutcome(params: {
  accepted: boolean;
  currentWordCount: number;
  nextWordCount: number;
  minimumPublishableWordMin: number;
  rejectionReason?: string;
}): FactCheckAttemptOutcome {
  const staysPublishable = !(params.currentWordCount >= params.minimumPublishableWordMin && params.nextWordCount < params.minimumPublishableWordMin);
  const finalAccepted = params.accepted && staysPublishable;

  return {
    accepted: finalAccepted,
    nextWordCount: finalAccepted ? params.nextWordCount : params.currentWordCount,
    reason: finalAccepted
      ? "fact check accepted"
      : params.rejectionReason || "fact check rejected",
  };
}

export function decidePostRefinementGuard(params: {
  baselineWordCount: number;
  baselineViolationCount: number;
  baselineScore: number;
  baselineIsStrong: boolean;
  refinedWordCount: number;
  refinedViolationCount: number;
  refinedScore: number;
  refinedIsStrong: boolean;
  minimumPublishableWordMin: number;
}): PostRefinementGuardDecision {
  const droppedBelowPublishableMin = params.baselineWordCount >= params.minimumPublishableWordMin && params.refinedWordCount < params.minimumPublishableWordMin;
  const addedViolations = params.refinedViolationCount > params.baselineViolationCount;
  const meaningfulScoreDrop = params.refinedScore < params.baselineScore - 0.04;
  const lostStrongStatus = params.baselineIsStrong && !params.refinedIsStrong;

  if (droppedBelowPublishableMin) {
    return { shouldRevert: true, reason: "dropped below publishable floor" };
  }

  if (addedViolations) {
    return { shouldRevert: true, reason: "introduced additional violations" };
  }

  if (meaningfulScoreDrop) {
    return { shouldRevert: true, reason: "meaningful quality score drop" };
  }

  if (lostStrongStatus) {
    return { shouldRevert: true, reason: "lost strong publishable status" };
  }

  return { shouldRevert: false, reason: "refinement preserved publishable quality" };
}

export function buildFactCheckStateTransition(params: {
  accepted: boolean;
  currentTextBasis: string | null;
  correctedText: string | null;
}): FactCheckStateTransition {
  if (params.accepted && params.correctedText) {
    return {
      nextTextBasis: params.correctedText,
      shouldApplyCorrectedText: true,
    };
  }

  return {
    nextTextBasis: params.currentTextBasis,
    shouldApplyCorrectedText: false,
  };
}
