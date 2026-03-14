import fs from "fs";
import path from "path";

type Level = "pass" | "warn" | "fail";

interface CheckResult {
  id: string;
  level: Level;
  title: string;
  detail: string;
}

const root = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(path.resolve(root, filePath), "utf8");
}

function exists(filePath: string): boolean {
  return fs.existsSync(path.resolve(root, filePath));
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function run(): number {
  const results: CheckResult[] = [];

  const packageJson = JSON.parse(read("package.json"));
  const scripts = packageJson.scripts || {};
  const envExample = exists(".env.example") ? read(".env.example") : "";
  const indexTs = exists("server/index.ts") ? read("server/index.ts") : "";
  const routesTs = exists("server/routes.ts") ? read("server/routes.ts") : "";
  const emailWebhooks = exists("server/routes/email-webhooks.ts") ? read("server/routes/email-webhooks.ts") : "";
  const securityMiddleware = exists("server/middleware/security.ts") ? read("server/middleware/security.ts") : "";
  const monitoring = exists("server/lib/monitoring.ts") ? read("server/lib/monitoring.ts") : "";
  const replitConfig = exists(".replit") ? read(".replit") : "";
  const sharedSchema = exists("shared/schema.ts") ? read("shared/schema.ts") : "";

  const requiredScripts = ["test", "check", "build", "start"];
  const missingScripts = requiredScripts.filter((name) => !scripts[name]);
  results.push({
    id: "scripts-core",
    level: missingScripts.length === 0 ? "pass" : "fail",
    title: "Kärnscript för release",
    detail: missingScripts.length === 0 ? "test/check/build/start finns." : `Saknar scripts: ${missingScripts.join(", ")}.`,
  });

  const requiredEnv = [
    "DATABASE_URL",
    "SESSION_SECRET",
    "APP_URL",
    "RESEND_API_KEY",
    "FROM_EMAIL",
    "RESEND_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRO_PRICE_ID",
    "STRIPE_PREMIUM_PRICE_ID",
  ];
  const missingEnvInExample = requiredEnv.filter((key) => !envExample.includes(`${key}=`));
  results.push({
    id: "env-example",
    level: missingEnvInExample.length === 0 ? "pass" : "warn",
    title: "Miljövariabler i .env.example",
    detail: missingEnvInExample.length === 0 ? "Alla kritiska variabler dokumenterade." : `Saknas i .env.example: ${missingEnvInExample.join(", ")}.`,
  });

  const hasStripeRawBody = indexTs.includes('app.post("/api/stripe/webhook", express.raw(');
  results.push({
    id: "stripe-raw-body",
    level: hasStripeRawBody ? "pass" : "fail",
    title: "Stripe webhook raw body",
    detail: hasStripeRawBody ? "Raw-body route finns före json-parser." : "Raw-body route saknas eller ligger fel för Stripe webhook.",
  });

  const hasStripeSignatureVerification = includesAny(routesTs, [
    "stripe.webhooks.constructEvent",
    "constructEvent(",
  ]);
  results.push({
    id: "stripe-signature",
    level: hasStripeSignatureVerification ? "pass" : "fail",
    title: "Stripe signaturverifiering",
    detail: hasStripeSignatureVerification ? "Stripe webhook-verifiering hittades." : "Stripe webhook-verifiering hittades inte.",
  });

  const hasEmailSignatureImplementation = includesAny(emailWebhooks, [
    "verifyEmailWebhookSignature(",
    "Invalid webhook signature",
  ]);
  results.push({
    id: "email-webhook-signature",
    level: hasEmailSignatureImplementation ? "pass" : "fail",
    title: "Email webhook-signatur",
    detail: hasEmailSignatureImplementation ? "Signaturverifiering verkar implementerad." : "Signaturverifiering är inte implementerad.",
  });

  const allowsAdminKeyQuery = includesAny(routesTs, [
    "req.query.adminKey",
    "Query param: ?adminKey=",
  ]);
  results.push({
    id: "admin-key-header-only",
    level: allowsAdminKeyQuery ? "fail" : "pass",
    title: "Adminnyckel endast via header",
    detail: allowsAdminKeyQuery
      ? "Adminnyckel kan skickas via query-param."
      : "Adminnyckel kräver x-admin-key header.",
  });

  const hasStripeIdempotency = includesAny(routesTs, [
    "acquireStripeWebhookEventLock(",
    "finalizeStripeWebhookEvent(",
  ]);
  results.push({
    id: "stripe-webhook-idempotency",
    level: hasStripeIdempotency ? "pass" : "fail",
    title: "Stripe webhook-idempotens",
    detail: hasStripeIdempotency
      ? "Webhook events dedupliceras innan processning."
      : "Webhook-idempotens saknas.",
  });

  const securityMiddlewareDefined = securityMiddleware.length > 0;
  const securityMiddlewareUsed = includesAny(indexTs + routesTs, [
    "securityHeaders",
    "sanitizeInput",
    "preventSQLInjection",
    "preventXSS",
    "authRateLimit",
    "apiRateLimit",
    "aiRateLimit",
  ]);
  results.push({
    id: "security-middleware-wiring",
    level: securityMiddlewareDefined && securityMiddlewareUsed ? "pass" : "warn",
    title: "Säkerhetsmiddleware koppling",
    detail: securityMiddlewareDefined && securityMiddlewareUsed
      ? "Definierad middleware används i appflödet."
      : "Säkerhetsmiddleware finns men full koppling kan saknas.",
  });

  const hasAuthGlobalLimit = indexTs.includes('app.use("/auth", authRateLimit)');
  const hasScopedAuthLimits = includesAny(indexTs, [
    'app.use("/auth/login", authRateLimit)',
    'app.use("/auth/register", authRateLimit)',
  ]);
  results.push({
    id: "auth-rate-limit-scoped",
    level: hasAuthGlobalLimit || !hasScopedAuthLimits ? "warn" : "pass",
    title: "Auth rate-limit scoped",
    detail: hasAuthGlobalLimit || !hasScopedAuthLimits
      ? "Auth rate-limit är inte tydligt scoped till riskendpoints."
      : "Auth rate-limit är scoped till login/register/reset.",
  });

  const hasStrictOptimizeSchema = includesAny(sharedSchema, [
    'z.enum(["hemnet", "booli"])',
    "Invalid image URL",
    "Maximum 5 images allowed",
    "wordCountMin cannot be greater than wordCountMax",
  ]);
  results.push({
    id: "optimize-schema-hardening",
    level: hasStrictOptimizeSchema ? "pass" : "warn",
    title: "Optimize-schema härdning",
    detail: hasStrictOptimizeSchema
      ? "Inputschema för optimize har plattformsvalidering, URL-validering och gränskontroller."
      : "Optimize-schema saknar någon av de viktiga gränskontrollerna.",
  });

  const hasObservabilityWiring = includesAny(routesTs, [
    "pipelineObservability.startRun(",
    "pipelineObservability.startStep(",
    "finalizeObservabilityRun(",
  ]);
  results.push({
    id: "pipeline-observability-wiring",
    level: hasObservabilityWiring ? "pass" : "warn",
    title: "Pipeline-observability koppling",
    detail: hasObservabilityWiring
      ? "Optimize-pipeline är kopplad till run/step-observability."
      : "Observability är definierad men koppling i optimize-pipeline saknas.",
  });

  const hasQuotaRefillScript = typeof scripts["quota:refill"] === "string"
    && scripts["quota:refill"].includes("script/refill-quota.ts")
    && exists("script/refill-quota.ts");
  results.push({
    id: "quota-refill-operations-script",
    level: hasQuotaRefillScript ? "pass" : "warn",
    title: "Kvotpåfyllning via shell-script",
    detail: hasQuotaRefillScript
      ? "Driftscript för kvotpåfyllning finns och är kopplat i package scripts."
      : "Kvotpåfyllningsscript saknas eller är inte kopplat i package scripts.",
  });

  const hasOperationsRunbook = exists("docs/operations-runbook.md");
  results.push({
    id: "operations-runbook",
    level: hasOperationsRunbook ? "pass" : "warn",
    title: "Operativ runbook",
    detail: hasOperationsRunbook
      ? "Runbook för incident, release och quota-åtgärder finns."
      : "Operativ runbook saknas.",
  });

  const hasSimulatedMonitoring = includesAny(monitoring, [
    "Math.random()",
    "Simulated",
    "In production,",
  ]);
  results.push({
    id: "monitoring-data-quality",
    level: hasSimulatedMonitoring ? "warn" : "pass",
    title: "Övervakningsdatakvalitet",
    detail: hasSimulatedMonitoring ? "Monitorering innehåller simulerade värden." : "Monitorering ser ut att använda reala källor.",
  });

  const replitTargetsCjs = includesAny(replitConfig, ['run = ["node", "./dist/index.cjs"]']);
  const startTargetsMjs = typeof scripts.start === "string" && scripts.start.includes("dist/index.mjs");
  const replitMismatch = replitTargetsCjs && startTargetsMjs;
  results.push({
    id: "deploy-entrypoint-alignment",
    level: replitMismatch ? "warn" : "pass",
    title: "Deploy entrypoint-alignment",
    detail: replitMismatch ? "`.replit` kör dist/index.cjs men start-script kör dist/index.mjs." : "Entrypoints ser alignade ut.",
  });

  const criticalPaths = [
    "client/src/pages/Home.tsx",
    "client/src/pages/Settings.tsx",
    "client/src/pages/HistoryPage.tsx",
    "client/src/pages/Teams.tsx",
    "client/src/pages/PromptEditor.tsx",
    "server/index.ts",
    "server/routes.ts",
    "server/auth.ts",
    "server/storage.ts",
    "shared/schema.ts",
  ];
  const missingCriticalPaths = criticalPaths.filter((file) => !exists(file));
  results.push({
    id: "critical-modules",
    level: missingCriticalPaths.length === 0 ? "pass" : "fail",
    title: "Kritiska moduler finns",
    detail: missingCriticalPaths.length === 0 ? "Alla kritiska moduler hittades." : `Saknade moduler: ${missingCriticalPaths.join(", ")}.`,
  });

  const blockerCount = results.filter((r) => r.level === "fail").length;
  const warningCount = results.filter((r) => r.level === "warn").length;

  const status = blockerCount > 0 ? "NO-GO" : warningCount > 0 ? "GO-WITH-CONDITIONS" : "GO";
  const now = new Date().toISOString();

  console.log(`Launch Gate Status: ${status}`);
  console.log(`Timestamp: ${now}`);
  console.log("");
  for (const result of results) {
    const icon = result.level === "pass" ? "✅" : result.level === "warn" ? "⚠️" : "❌";
    console.log(`${icon} [${result.id}] ${result.title}`);
    console.log(`   ${result.detail}`);
  }

  console.log("");
  console.log(`Summary: ${results.length} checks, ${blockerCount} blockers, ${warningCount} warnings.`);
  return blockerCount > 0 ? 1 : 0;
}

process.exitCode = run();
