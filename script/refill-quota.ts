import { pool } from "../server/db";

type Args = {
  email?: string;
  userId?: string;
  resetAll: boolean;
  addTexts: number;
  addTextEdits: number;
  addAreaSearches: number;
  addPersonalStyleAnalyses: number;
};

function readArg(name: string): string | undefined {
  const prefixed = `--${name}=`;
  const exact = process.argv.find((arg) => arg.startsWith(prefixed));
  if (exact) return exact.slice(prefixed.length);
  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index >= 0) {
    const next = process.argv[index + 1];
    if (next && !next.startsWith("--")) return next;
  }
  return undefined;
}

function readNumber(name: string, fallback: number = 0): number {
  const raw = readArg(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Ogiltigt värde för --${name}: ${raw}`);
  }
  return parsed;
}

function parseArgs(): Args {
  const resetAll = process.argv.includes("--reset-all");
  const email = readArg("email");
  const userId = readArg("user-id");

  if (!email && !userId) {
    throw new Error("Ange --email eller --user-id");
  }
  if (email && userId) {
    throw new Error("Ange bara en av --email eller --user-id");
  }

  const addTexts = readNumber("add-texts", 0);
  const addTextEdits = readNumber("add-text-edits", 0);
  const addAreaSearches = readNumber("add-area-searches", 0);
  const addPersonalStyleAnalyses = readNumber("add-style-analyses", 0);

  if (!resetAll && addTexts === 0 && addTextEdits === 0 && addAreaSearches === 0 && addPersonalStyleAnalyses === 0) {
    throw new Error("Ange minst en åtgärd: --reset-all eller ett --add-* värde");
  }

  return {
    email,
    userId,
    resetAll,
    addTexts,
    addTextEdits,
    addAreaSearches,
    addPersonalStyleAnalyses,
  };
}

function computePeriodKey(planStartAt: Date | null, createdAt: Date | null, now: Date = new Date()): { month: string; year: number } {
  const anchor = new Date(planStartAt || createdAt || now);
  anchor.setHours(0, 0, 0, 0);

  let periodStart = new Date(anchor);
  while (true) {
    const next = new Date(periodStart);
    next.setMonth(next.getMonth() + 1);
    next.setHours(0, 0, 0, 0);
    if (next <= now) {
      periodStart = next;
      continue;
    }
    break;
  }

  return {
    month: String(periodStart.getMonth() + 1).padStart(2, "0"),
    year: periodStart.getFullYear(),
  };
}

async function run(): Promise<void> {
  const args = parseArgs();
  const userResult = args.email
    ? await pool.query(
      `SELECT id, email, plan, plan_start_at, created_at FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [args.email],
    )
    : await pool.query(
      `SELECT id, email, plan, plan_start_at, created_at FROM users WHERE id = $1 LIMIT 1`,
      [args.userId],
    );

  if (userResult.rowCount === 0) {
    throw new Error("Ingen användare hittades");
  }

  const user = userResult.rows[0];
  const period = computePeriodKey(user.plan_start_at ? new Date(user.plan_start_at) : null, user.created_at ? new Date(user.created_at) : null);

  let beforeResult = await pool.query(
    `SELECT texts_generated, area_searches_used, text_edits_used, personal_style_analyses
     FROM usage_tracking
     WHERE user_id = $1 AND month = $2 AND year = $3
     LIMIT 1`,
    [user.id, period.month, period.year],
  );

  if (beforeResult.rowCount === 0) {
    try {
      await pool.query(
        `INSERT INTO usage_tracking (user_id, month, year, plan_type, texts_generated, area_searches_used, text_edits_used, personal_style_analyses)
         VALUES ($1, $2, $3, $4, 0, 0, 0, 0)`,
        [user.id, period.month, period.year, user.plan || "free"],
      );
    } catch (error: unknown) {
      const maybeCode = (error as { code?: string } | null)?.code;
      if (maybeCode !== "23505") {
        throw error;
      }
    }

    beforeResult = await pool.query(
      `SELECT texts_generated, area_searches_used, text_edits_used, personal_style_analyses
       FROM usage_tracking
       WHERE user_id = $1 AND month = $2 AND year = $3
       LIMIT 1`,
      [user.id, period.month, period.year],
    );
  }

  if (beforeResult.rowCount === 0) {
    throw new Error("Kunde inte läsa usage-rad för vald period");
  }

  const before = beforeResult.rows[0];
  const nextTexts = args.resetAll ? 0 : Math.max(0, Number(before.texts_generated || 0) - args.addTexts);
  const nextAreaSearches = args.resetAll ? 0 : Math.max(0, Number(before.area_searches_used || 0) - args.addAreaSearches);
  const nextTextEdits = args.resetAll ? 0 : Math.max(0, Number(before.text_edits_used || 0) - args.addTextEdits);
  const nextStyleAnalyses = args.resetAll ? 0 : Math.max(0, Number(before.personal_style_analyses || 0) - args.addPersonalStyleAnalyses);

  await pool.query(
    `UPDATE usage_tracking
     SET texts_generated = $1,
         area_searches_used = $2,
         text_edits_used = $3,
         personal_style_analyses = $4,
         plan_type = $8,
         updated_at = NOW()
     WHERE user_id = $5 AND month = $6 AND year = $7`,
    [nextTexts, nextAreaSearches, nextTextEdits, nextStyleAnalyses, user.id, period.month, period.year, user.plan || "free"],
  );

  const afterResult = await pool.query(
    `SELECT texts_generated, area_searches_used, text_edits_used, personal_style_analyses
     FROM usage_tracking
     WHERE user_id = $1 AND month = $2 AND year = $3
     LIMIT 1`,
    [user.id, period.month, period.year],
  );
  const after = afterResult.rows[0];

  console.log(JSON.stringify({
    success: true,
    user: { id: user.id, email: user.email, plan: user.plan },
    period,
    before: {
      textsGenerated: Number(before.texts_generated || 0),
      areaSearchesUsed: Number(before.area_searches_used || 0),
      textEditsUsed: Number(before.text_edits_used || 0),
      personalStyleAnalyses: Number(before.personal_style_analyses || 0),
    },
    after: {
      textsGenerated: Number(after.texts_generated || 0),
      areaSearchesUsed: Number(after.area_searches_used || 0),
      textEditsUsed: Number(after.text_edits_used || 0),
      personalStyleAnalyses: Number(after.personal_style_analyses || 0),
    },
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(`[quota:refill] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
