import { z } from "zod";

/**
 * The health file — the one shape everything in Diplodoctor reads and writes.
 *
 * The AI reading produces it, the browser stores it, a person you choose is handed it,
 * and "Export" writes exactly it to disk. One shape on purpose: a file that can
 * be exported and re-imported belongs to the person it is about, not to us.
 *
 * The zod schema below IS the definition; the TypeScript types are inferred
 * from it, so the two cannot disagree.
 *
 * Lenient about what is missing, strict about types. Both sources — a model's
 * JSON and an imported file — are untrusted, and a report that renders
 * "undefined" as a value is worse than one that renders no value. So a bad
 * optional field is dropped rather than failing the whole report, and only a
 * missing title makes something not a report at all.
 *
 * THE MODEL DOES NOT DECIDE WHAT IS OUT OF RANGE. It reads the numbers; code
 * compares them (`computeFlag`), because a language model asked "is 5.8 above
 * 5.6?" is the one place a wrong answer would look exactly like a right one.
 * It also cannot lower the urgency the numbers imply (`attentionFloor`).
 */

/** Trimmed, capped text. Over-long input is cut, not refused. */
const text = (max: number) =>
  z
    .string()
    .transform((s) => s.trim().slice(0, max))
    .pipe(z.string().min(1));

const optionalText = (max: number) => text(max).optional().catch(undefined);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(s)))
  .optional()
  .catch(undefined);

/** A list whose bad members are dropped instead of sinking the list. */
const listOf = <T extends z.ZodType>(item: T, max: number) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((list) =>
      list.slice(0, max).flatMap((entry) => {
        const parsed = item.safeParse(entry);
        return parsed.success ? [parsed.data as z.output<T>] : [];
      }),
    );

/** A finite number from a model that may send a string, or null/garbage. */
const optionalNumber = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "number" ? v : parseNumber(v)))
  .pipe(z.number().finite())
  .optional()
  .catch(undefined);

export const REPORT_KINDS = ["lab", "imaging", "discharge", "prescription", "other"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const FLAGS = ["normal", "low", "high", "critical", "unknown"] as const;
export type Flag = (typeof FLAGS)[number];

/** How soon a person should have a doctor look. Ordered: later is more urgent. */
export const ATTENTION = ["routine", "soon", "urgent"] as const;
export type Attention = (typeof ATTENTION)[number];

/**
 * A number as a laboratory prints it: "5.8", "5,8", "1'250", "1 250". Anything
 * else — "<0.5", "negative", "5.8-6.1" — is not a number for comparison.
 */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/[\s'’]/g, "").replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

/**
 * The flag the numbers imply, or null when they do not decide it: the value is
 * not a plain number, or the report printed no bound to compare with.
 */
export function computeFlag(value: string, low?: number, high?: number): Flag | null {
  const n = parseNumber(value);
  if (n === null || (low === undefined && high === undefined)) return null;
  if (low !== undefined && n < low) return "low";
  if (high !== undefined && n > high) return "high";
  return "normal";
}

const ResultSchema = z
  .object({
    id: optionalText(40),
    /** As the report prints it, in the report's own language. */
    name: text(200),
    /**
     * The measurement's common English name ("Hemoglobin", "LDL cholesterol"),
     * so the same value can be followed across reports in different languages.
     */
    analyte: optionalText(120),
    /** As printed: "5.8", "negativ". */
    value: text(80),
    unit: optionalText(40),
    /** The reference interval's bounds, only when the report prints numeric ones. */
    low: optionalNumber,
    high: optionalNumber,
    /** The reference as printed: "4.0 - 5.6", "< 5.2". */
    range: optionalText(80),
    flag: z.enum(FLAGS).catch("unknown"),
    /** The line of the report this was read from, verbatim, for the reader to check. */
    quote: optionalText(400),
    /** Plain-language information about a flagged value. Never a conclusion. */
    note: optionalText(800),
  })
  .transform((r) => {
    const computed = computeFlag(r.value, r.low, r.high);
    // Only the report itself may call a value critical; the numbers cannot
    // contradict that, but a plain "normal" can.
    const flag: Flag = r.flag === "critical" && computed !== "normal" ? "critical" : (computed ?? r.flag);
    return { ...r, flag, checked: computed !== null };
  });

const FollowUpSchema = z.object({
  id: optionalText(40),
  /** Something the report itself says to do. Never invented. */
  text: text(600),
  done: z.boolean().catch(false),
});

const TermSchema = z.object({ term: text(120), meaning: text(800) });

const DocTextSchema = z.object({
  /** BCP-47 tag, e.g. "de", "es", "fr". */
  lang: text(12).catch("und"),
  label: optionalText(40),
  text: text(30_000),
});

export const ReportFileSchema = z
  .object({
    id: optionalText(60),
    kind: z.enum(REPORT_KINDS).catch("other"),
    title: text(200),
    /** The laboratory, practice or hospital that issued it. */
    provider: optionalText(200),
    reference: optionalText(120),
    /** ISO dates (YYYY-MM-DD): when the sample was taken, and when it was reported. */
    collected: isoDate,
    reported: isoDate,
    summary: text(3000).catch(""),
    results: listOf(ResultSchema, 200),
    /** For a document that is not a table of values: the words in it, explained. */
    terms: listOf(TermSchema, 20),
    questions: listOf(text(400), 10),
    followUps: listOf(FollowUpSchema, 20),
    notes: listOf(text(600), 20),
    attention: z.enum(ATTENTION).catch("routine"),
    attentionReason: optionalText(600),
    /** The document itself: original first, then translations. */
    texts: listOf(DocTextSchema, 8),
    createdAt: optionalText(40),
    /**
     * What each placeholder sent to the model stood for (`[NAME-1]` → the
     * name). Written by the browser after the reading returns, read only by the
     * browser: it is how an anonymised export can be made again later. Never
     * sent to the server.
     */
    redactions: listOf(
      z.object({
        token: z.string().regex(/^\[[A-Z]+-\d+\]$/),
        value: text(500),
        kind: z.enum(["NAME", "ADDRESS", "POSTCODE", "EMAIL", "PHONE", "IBAN", "AHV", "REF", "BIRTHDATE"]),
      }),
      200,
    ),
  })
  .transform((r) => ({
    ...r,
    version: 1 as const,
    id: r.id ?? newId(),
    results: r.results.map((x, i) => ({ ...x, id: x.id ?? `r${i + 1}` })),
    followUps: r.followUps.map((x, i) => ({ ...x, id: x.id ?? `f${i + 1}` })),
    texts: r.texts.map(withLabel),
    // The model may ask for more care than the numbers imply; never for less.
    attention: atLeast(r.attention, attentionFloor(r.results)),
    createdAt: r.createdAt ?? new Date().toISOString(),
  }));

function withLabel<T extends { lang: string; label?: string }>(t: T): T & { label: string } {
  return { ...t, label: t.label ?? t.lang };
}

export type ReportFile = z.output<typeof ReportFileSchema>;
export type ReportResult = ReportFile["results"][number];
export type FollowUp = ReportFile["followUps"][number];

/** What the flagged values alone imply, whatever the model said. */
export function attentionFloor(results: { flag: Flag }[]): Attention {
  if (results.some((r) => r.flag === "critical")) return "urgent";
  if (results.some((r) => r.flag === "low" || r.flag === "high")) return "soon";
  return "routine";
}

function atLeast(a: Attention, b: Attention): Attention {
  return ATTENTION.indexOf(a) >= ATTENTION.indexOf(b) ? a : b;
}

export function newId(): string {
  return `r_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Turn anything — a model's JSON, an imported file — into a ReportFile, or null. */
export function parseReport(input: unknown): ReportFile | null {
  const parsed = ReportFileSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

/** A date in the reader's language, without shifting it across time zones. */
export function formatDate(iso: string, locale = "en"): string {
  const tag = { en: "en-GB", de: "de-CH", fr: "fr-CH", it: "it-CH", es: "es-ES" }[locale] ?? "en-GB";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(tag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The date a report is about: the sample's, else the report's, else when it was filed. */
export function reportDate(r: Pick<ReportFile, "collected" | "reported" | "createdAt">): string {
  return r.collected ?? r.reported ?? (r.createdAt ?? "").slice(0, 10);
}
