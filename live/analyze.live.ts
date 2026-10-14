import { describe, expect, it } from "vitest";
import { AnalyzeRequestSchema, analyzeReport, freeAvailability } from "../lib/analyze";
import { SAMPLE_FLAGGED, SAMPLE_REPORT } from "../lib/sample";

/**
 * `pnpm run check:analyze` — the invented sample report through a REAL model.
 *
 * Not part of `verify` or CI: it needs a vendor key and the network, and a
 * gate that goes red for want of a secret trains you to ignore red. Run it on
 * the host after setting a key, and whenever the prompt or the chain changes.
 *
 * It asserts the things a wrong answer would hurt most: that every value is
 * found with the line it came from, that the four values outside their range
 * are flagged and the others are not, and that nothing is called critical or
 * urgent that the report does not. Everything else is printed for a person to
 * read.
 *
 * Uses the shared free chain from the environment (GROQ_API_KEY,
 * GEMINI_API_KEY, OPENROUTER_API_KEY). Costs one free-tier completion per
 * language.
 */
const available = freeAvailability(process.env).text;

describe.skipIf(!available)("a real model reads the sample report", () => {
  it.each(["en", "de", "fr", "it", "es"] as const)(
    "flags the four values outside their range, answering in %s",
    async (locale) => {
      const outcome = await analyzeReport(
        AnalyzeRequestSchema.parse({ text: SAMPLE_REPORT, locale, languages: ["English"] }),
        { env: process.env },
      );
      if (!outcome.ok) throw new Error(`reading failed: ${outcome.error}`);
      const r = outcome.report;
      const outside = r.results.filter((x) => x.flag !== "normal" && x.flag !== "unknown");
      console.info(
        `\n[${locale}] served by ${outcome.servedBy}\n  title: ${r.title}\n  values: ${r.results.length}, outside: ${outside.map((x) => `${x.name} ${x.value}`).join(", ")}\n  attention: ${r.attention}\n  questions: ${r.questions.length}\n  summary: ${r.summary}`,
      );
      // Eleven values are printed; a model may merge or skip one, but not many.
      expect(r.results.length).toBeGreaterThanOrEqual(9);
      for (const name of SAMPLE_FLAGGED) {
        expect(outside.map((x) => x.name.toLowerCase())).toContain(name.toLowerCase());
      }
      expect(outside.length).toBe(SAMPLE_FLAGGED.length);
      // Nothing in the report is marked critical, so nothing may be urgent.
      expect(r.results.some((x) => x.flag === "critical")).toBe(false);
      expect(r.attention).toBe("soon");
      // Each value carries the line it was read from, and the flag was checked against a range.
      expect(r.results.filter((x) => x.quote).length).toBeGreaterThanOrEqual(r.results.length - 2);
      expect(r.results.filter((x) => x.checked).length).toBeGreaterThanOrEqual(r.results.length - 2);
      expect(r.questions.length).toBeGreaterThan(0);
      expect(r.texts.length).toBeGreaterThanOrEqual(1);
    },
    180_000,
  );
});

describe.skipIf(available)("no vendor key in the environment", () => {
  it("has nothing to check — set GROQ_API_KEY, GEMINI_API_KEY or OPENROUTER_API_KEY", () => {
    console.info("check:analyze skipped: no shared vendor key is set.");
  });
});
