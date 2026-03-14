import type { PlanType } from "@shared/schema";

export type WritingStyle = "factual" | "balanced" | "selling";

export interface BlueprintInput {
  plan: PlanType;
  platform: string;
  style: WritingStyle;
  targetWordMin: number;
  targetWordMax: number;
  disposition?: any;
  toneAnalysis?: any;
  writingPlan?: any;
  personalStylePrompt?: string;
}

interface PlatformDirective {
  openingPriority: string[];
  locationStrategy: string;
  weakFactPolicy: string;
  closingStrategy: string;
}

interface QualityThresholds {
  minimumPublishableWordMin: number;
  strongPublishableWordFloor: number;
  minimumEvidenceSignals: number;
  minimumQualityScore: number;
}

interface RepairPolicy {
  allowLocalExpansion: boolean;
  allowSectionRewrite: boolean;
  allowFullRewrite: boolean;
  rejectIfCorruptedArtifacts: boolean;
  rejectIfDispositionLike: boolean;
}

interface CollaborationRole {
  role: string;
  responsibility: string;
}

interface CollaborationModel {
  framing: string;
  roles: CollaborationRole[];
  workflow: string[];
}

export interface ListingGenerationBlueprint {
  plan: PlanType;
  platform: string;
  style: WritingStyle;
  propertyType: string;
  targetWordMin: number;
  targetWordMax: number;
  qualityThresholds: QualityThresholds;
  audience: string | null;
  platformDirective: PlatformDirective;
  mustIncludeFacts: string[];
  contextFacts: string[];
  emphasisPoints: string[];
  forbiddenPatterns: string[];
  repairPolicy: RepairPolicy;
  collaborationModel: CollaborationModel;
  promptDirectives: string[];
}

function getMinimumPublishableWordCount(requestedMin: number, style: WritingStyle): number {
  const ratio = style === "factual" ? 0.58 : style === "selling" ? 0.72 : 0.65;
  const absoluteFloor = style === "factual" ? 140 : style === "selling" ? 200 : 180;
  return Math.min(requestedMin, Math.max(absoluteFloor, Math.round(requestedMin * ratio)));
}

function getStrongPublishableWordFloor(minimumPublishableWordMin: number, plan: PlanType): number {
  if (plan === "premium") {
    return Math.max(minimumPublishableWordMin + 55, Math.round(minimumPublishableWordMin * 1.28));
  }
  if (plan === "pro") {
    return Math.max(minimumPublishableWordMin + 35, Math.round(minimumPublishableWordMin * 1.18));
  }
  return minimumPublishableWordMin;
}

function normalizePropertyType(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!value) return "bostad";
  if (value === "apartment") return "lägenhet";
  return value;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function takeStrings(values: unknown[], limit: number): string[] {
  const result: string[] = [];
  for (const value of values) {
    const normalized = asNonEmptyString(value);
    if (!normalized) continue;
    if (result.some((item) => item.toLowerCase() === normalized.toLowerCase())) continue;
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function buildPlatformDirective(platform: string, propertyType: string): PlatformDirective {
  const normalizedPlatform = (platform || "hemnet").toLowerCase();
  const isHouse = /(villa|radhus|parhus|kedjehus)/i.test(propertyType);

  if (normalizedPlatform === "booli") {
    return {
      openingPriority: isHouse
        ? ["uteplats eller tomt", "planlösning", "kök", "läge"]
        : ["ljus eller uteplats", "planlösning", "kök", "läge"],
      locationStrategy: "Skriv läget med lugn, pendling och vardagsfunktion i naturlig prosa; i Booli/egen sida får området ramas in mer berättande så länge fakta är konkreta och verifierbara.",
      weakFactPolicy: "Teknikfakta får bara vara med om de hjälper köparen förstå standard, drift eller vardagsnytta.",
      closingStrategy: "Avsluta med en vardagsnära bild eller köparnytta förankrad i fakta; undvik CTA men behåll berättande ton.",
    };
  }

  return {
    openingPriority: isHouse
      ? ["uteplats, solläge eller tomt", "sociala ytor", "kök", "läge"]
      : ["balkong, terrass eller ljus", "planlösning", "kök", "läge"],
    locationStrategy: "Hemnet-huvudtexten ska kännas publicerad: använd helst bostadstyp + boarea + stark detalj tidigt, och koppla läget till vardag, pendling eller närservice.",
    weakFactPolicy: "Energiklass ska aldrig nämnas i Hemnet-huvudtexten då den visas separat i annonsen. Fiber, parkering och teknik får aldrig ta plats från öppningen eller bära egna mekaniska meningar.",
    closingStrategy: "Avsluta med ett starkt men trovärdigt lägesankare eller en konkret sista köparnytta, aldrig med CTA eller drömsummering.",
  };
}

function getMinimumQualityScore(plan: PlanType): number {
  if (plan === "premium") return 0.88;
  if (plan === "pro") return 0.84;
  return 0.79;
}

function buildCollaborationModel(params: {
  plan: PlanType;
  propertyType: string;
  style: WritingStyle;
  audience: string | null;
}): CollaborationModel {
  return {
    framing: "Arbeta som ett litet bord av seniora kollegor som delar samma underlag, pratar kort och tydligt med varandra och gemensamt landar i en enda publicerbar huvudtext.",
    roles: [
      {
        role: "Objektstrateg",
        responsibility: `väljer vilka fakta om ${params.propertyType} som ska prioriteras först för rätt köpare och rätt marknadsnivå`,
      },
      {
        role: "Mäklarskribent",
        responsibility: `skriver flytande svensk mäklarprosa i en ${params.style === "factual" ? "saklig" : params.style === "selling" ? "säljdriven men trovärdig" : "balanserad och professionell"} ton utan klyschor`,
      },
      {
        role: "Faktagranskare",
        responsibility: "stoppar allt som inte stöds av dispositionen, markerar repetition och ser till att inga mekaniska faktarader tar över texten",
      },
    ],
    workflow: [
      "Börja med att enas om vilka 1-3 styrkor som ska bära öppningen.",
      params.audience
        ? `Anpassa prioriteringen till sannolik köpare: ${params.audience}.`
        : "Anpassa prioriteringen till en trovärdig svensk bostadsköpare utan att bli generisk.",
      "Låt skribenten formulera texten, men låt faktagranskaren stoppa överdrift, upprepning och påhitt direkt.",
      "Om kollegorna är oense ska faktatrohet och publicerbar klarhet vinna över kreativitet.",
    ],
  };
}

export function buildListingGenerationBlueprint(input: BlueprintInput): ListingGenerationBlueprint {
  const property = input.disposition?.property || {};
  const propertyType = normalizePropertyType(property.type || property.propertyType || input.disposition?.propertyType);
  const minimumPublishableWordMin = getMinimumPublishableWordCount(input.targetWordMin, input.style);
  const strongPublishableWordFloor = getStrongPublishableWordFloor(minimumPublishableWordMin, input.plan);
  const platformDirective = buildPlatformDirective(input.platform, propertyType);
  const audience = asNonEmptyString(input.toneAnalysis?.inferred_buyer)
    || asNonEmptyString(input.toneAnalysis?.target_audience)
    || asNonEmptyString(input.toneAnalysis?.target_group)
    || null;
  const collaborationModel = buildCollaborationModel({
    plan: input.plan,
    propertyType,
    style: input.style,
    audience,
  });

  const primaryFacts = takeStrings([
    property.address,
    typeof property.size === "number" ? `${property.size} kvm` : property.size,
    typeof property.rooms === "number" ? `${property.rooms} rum` : property.rooms,
    property.layout,
    property.preferred_outdoor_term,
    Array.isArray(input.disposition?.unique_features) ? input.disposition.unique_features[0] : null,
  ], 6);

  const contextFacts = takeStrings([
    property.materials?.kitchen,
    property.materials?.bathroom,
    input.disposition?.location?.area,
    input.disposition?.location?.transport,
    ...(Array.isArray(input.disposition?.location?.amenities) ? input.disposition.location.amenities : []),
    ...(Array.isArray(input.disposition?.location?.services) ? input.disposition.location.services : []),
    ...(Array.isArray(input.disposition?.property?.technical_details) ? input.disposition.property.technical_details : []),
  ], 10).filter((fact) => !primaryFacts.some((primary) => primary.toLowerCase() === fact.toLowerCase()));

  const emphasisPoints = takeStrings([
    ...(Array.isArray(property.emphasis_notes) ? property.emphasis_notes : []),
    ...(Array.isArray(input.disposition?.unique_features) ? input.disposition.unique_features : []),
    ...(Array.isArray(property.unique_selling_points) ? property.unique_selling_points : []),
    ...(Array.isArray(input.writingPlan?.emphasis_notes) ? input.writingPlan.emphasis_notes : []),
  ], 6);

  const forbiddenPatterns = [
    "erbjuder",
    "välkommen till",
    "bjuder på",
    "präglas av",
    "för den som",
    "vilket gör",
    "vilket ger",
    "mekaniska teknikrader",
    "rå punktlista i huvudtext",
  ];

  const promptDirectives = [
    `Primär målbild: skriv en ${input.style === "factual" ? "saklig" : input.style === "selling" ? "säljdriven men trovärdig" : "balanserad och professionell"} svensk objektbeskrivning för ${propertyType}.`,
    `Öppningen ska prioritera: ${platformDirective.openingPriority.join(", ")}.`,
    platformDirective.locationStrategy,
    platformDirective.weakFactPolicy,
    platformDirective.closingStrategy,
    audience ? `Tänk på sannolik köpare: ${audience}.` : "Skriv för en bred svensk bostadsköpare utan att bli generisk.",
    "Varje stycke måste bära egen köparnytta eller konkret fakta; upprepning av kärnfakta ska minimeras.",
    "Styckesstruktur ska efterlikna svensk publicerad objektsbeskrivning: stark öppning, boendekvaliteter i mitten, selektivt läges- eller föreningsavslut.",
    "Tänk som en svensk mäklare: skriv kort, tydligt och trovärdigt med rätt balans mellan säljtryck och saklighet.",
    "Fokusera på det köparen faktiskt väger in: planlösning, ljus, standard, läge, vardagslogistik, ekonomi och bevisbara kvaliteter.",
    "Använd endast de starkaste kärnfakta i löptexten. Övriga datapunkter ska fungera som kontext och får utelämnas om de stör läsbarhet.",
    "SPRÅKLIG INTEGRITET: Skriv alltid fullständiga och grammatiskt korrekta meningar. Undvik avhuggna ord, felaktiga radbrytningar eller korrupta tecken.",
    "Om underlaget är oklart ska texten bli försiktigare, inte mer fantasifull.",
    input.personalStylePrompt ? `PERSONLIG STIL:\n${input.personalStylePrompt}` : "",
    collaborationModel.framing,
  ].filter(Boolean);

  return {
    plan: input.plan,
    platform: input.platform,
    style: input.style,
    propertyType,
    targetWordMin: input.targetWordMin,
    targetWordMax: input.targetWordMax,
    qualityThresholds: {
      minimumPublishableWordMin,
      strongPublishableWordFloor,
      minimumEvidenceSignals: input.plan === "premium" ? 5 : 4,
      minimumQualityScore: getMinimumQualityScore(input.plan),
    },
    audience,
    platformDirective,
    mustIncludeFacts: primaryFacts,
    contextFacts,
    emphasisPoints,
    forbiddenPatterns,
    repairPolicy: {
      allowLocalExpansion: true,
      allowSectionRewrite: true,
      allowFullRewrite: input.plan !== "free",
      rejectIfCorruptedArtifacts: true,
      rejectIfDispositionLike: true,
    },
    collaborationModel,
    promptDirectives,
  };
}

export function buildBlueprintDeveloperAddendum(blueprint: ListingGenerationBlueprint): string {
  const lines = [
    "ORKESTRERINGSBLUEPRINT:",
    `- Nivå: ${blueprint.plan}`,
    `- Objekttyp: ${blueprint.propertyType}`,
    `- Stil: ${blueprint.style}`,
    `- Plattform: ${blueprint.platform}`,
    `- Publicerbar miniminivå: ${blueprint.qualityThresholds.minimumPublishableWordMin} ord`,
    `- Stark toppnivå kräver minst ${blueprint.qualityThresholds.strongPublishableWordFloor} ord och quality score ${blueprint.qualityThresholds.minimumQualityScore.toFixed(2)}`,
    `- Minsta evidensnivå: ${blueprint.qualityThresholds.minimumEvidenceSignals} konkreta signaler i huvudtexten`,
    `- Öppningen ska prioritera: ${blueprint.platformDirective.openingPriority.join(", ")}`,
    `- Läge: ${blueprint.platformDirective.locationStrategy}`,
    `- Svaga fakta: ${blueprint.platformDirective.weakFactPolicy}`,
    `- Avslut: ${blueprint.platformDirective.closingStrategy}`,
    `- Samarbetsmodell: ${blueprint.collaborationModel.framing}`,
    `- Förbjud särskilt: ${blueprint.forbiddenPatterns.join(", ")}`,
    ...blueprint.promptDirectives.map((directive) => `- ${directive}`),
  ];

  if (blueprint.mustIncludeFacts.length > 0) {
    lines.push(`- Prioritera i huvudtexten: ${blueprint.mustIncludeFacts.join(" | ")}`);
  }
  if (blueprint.contextFacts.length > 0) {
    lines.push(`- Kontextfakta (nämn bara om de stärker flödet): ${blueprint.contextFacts.join(" | ")}`);
  }
  if (blueprint.emphasisPoints.length > 0) {
    lines.push(`- Betona helst: ${blueprint.emphasisPoints.join(" | ")}`);
  }
  if (blueprint.audience) {
    lines.push(`- Trolig köpare: ${blueprint.audience}`);
  }
  lines.push(...blueprint.collaborationModel.roles.map((role) => `- ${role.role}: ${role.responsibility}`));
  lines.push(...blueprint.collaborationModel.workflow.map((step) => `- Samarbetsregel: ${step}`));

  return lines.join("\n");
}

export function buildBlueprintUserAddendum(blueprint: ListingGenerationBlueprint): string {
  const sections = [
    `MÅLPROFIL:\n- Objekttyp: ${blueprint.propertyType}\n- Plattform: ${blueprint.platform}\n- Stil: ${blueprint.style}\n- Ordmål: ${blueprint.targetWordMin}-${blueprint.targetWordMax}\n- Publicerbar miniminivå: ${blueprint.qualityThresholds.minimumPublishableWordMin}`,
  ];

  if (blueprint.mustIncludeFacts.length > 0) {
    sections.push(`PRIORITERA I HUVUDTEXTEN (om relevant och naturligt):\n- ${blueprint.mustIncludeFacts.join("\n- ")}`);
  }
  if (blueprint.contextFacts.length > 0) {
    sections.push(`KONTEXTFAKTA (använd selektivt, inte som checklista):\n- ${blueprint.contextFacts.join("\n- ")}`);
  }
  if (blueprint.emphasisPoints.length > 0) {
    sections.push(`BETONA GÄRNA TIDIGT:\n- ${blueprint.emphasisPoints.join("\n- ")}`);
  }
  sections.push(`EXPERTBORD:\n- ${blueprint.collaborationModel.framing}\n- ${blueprint.collaborationModel.roles.map((role) => `${role.role}: ${role.responsibility}`).join("\n- ")}`);
  sections.push(`SAMARBETSSÄTT:\n- ${blueprint.collaborationModel.workflow.join("\n- ")}`);
  sections.push(`PLATTFORMSSTRATEGI:\n- ${blueprint.platformDirective.locationStrategy}\n- ${blueprint.platformDirective.weakFactPolicy}\n- ${blueprint.platformDirective.closingStrategy}`);

  return sections.join("\n\n");
}
