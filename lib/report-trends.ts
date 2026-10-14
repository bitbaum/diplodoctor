import { reportDate, type ReportFile, type ReportResult } from "./report";

/**
 * The same measurement in an earlier report of this browser, for a trend.
 *
 * Matched on the measurement's English name and its unit, both normalised. A
 * different unit is NOT converted — mmol/L against mg/dL is a different number
 * for the same thing, and guessing the factor is how a trend lies. No match
 * means no trend is shown, not a guessed one.
 */
function key(r: Pick<ReportResult, "name" | "analyte" | "unit">): string {
  const fold = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}%]+/gu, "");
  return `${fold(r.analyte ?? r.name)}|${fold(r.unit ?? "")}`;
}

export interface Previous {
  value: string;
  date: string;
  reportId: string;
  /** Rising or falling, only when both values are plain numbers. */
  direction: "up" | "down" | "same" | null;
}

export function previousValue(
  result: ReportResult,
  current: ReportFile,
  others: readonly ReportFile[],
): Previous | null {
  const wanted = key(result);
  const now = reportDate(current);
  let best: { report: ReportFile; match: ReportResult } | null = null;
  for (const report of others) {
    if (report.id === current.id || reportDate(report) >= now) continue;
    const match = report.results.find((r) => key(r) === wanted);
    if (match && (!best || reportDate(report) > reportDate(best.report))) best = { report, match };
  }
  if (!best) return null;
  const a = Number(best.match.value.replace(",", "."));
  const b = Number(result.value.replace(",", "."));
  const numeric = Number.isFinite(a) && Number.isFinite(b);
  return {
    value: best.match.value,
    date: reportDate(best.report),
    reportId: best.report.id,
    direction: numeric ? (b > a ? "up" : b < a ? "down" : "same") : null,
  };
}
