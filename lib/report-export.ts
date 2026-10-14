import type { ReportFile } from "./report";
import { applyRedactions, assignTokens, findPersonalData, mapStrings } from "./redact";

/**
 * The report as a person you choose should get it: every personal detail replaced by
 * its placeholder again, and the table of what the placeholders mean left out.
 * A person can read the values, the ranges and the document without
 * learning who it is about until the reader decides to tell them.
 *
 * Uses the table from the original reading; a report without one (filed by
 * hand, or imported) is searched afresh.
 */
export function anonymisedReport(data: ReportFile): ReportFile {
  const table = data.redactions.length
    ? data.redactions
    : assignTokens(findPersonalData(data.texts.map((t) => t.text).join("\n")));
  const { redactions: _omit, ...rest } = data;
  void _omit;
  return { ...mapStrings(rest, (s) => applyRedactions(s, table)), id: data.id, redactions: [] };
}
