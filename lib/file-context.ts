import { itemDate, type HealthItem } from "./health-item";
import { reportDate, type ReportFile } from "./report";

/**
 * A person's file as plain text for a model to answer from. It is built in the
 * browser and passed through the same redaction as a report before it leaves
 * (names, numbers, addresses become placeholders), so what the model reads is
 * what the person could read aloud to a stranger.
 *
 * Bounded on purpose: the newest reports first, and a hard cap, so a long
 * history cannot push the question out of the model's window or turn into a
 * large upload. The model is told the file is partial when it is cut.
 */
export const CONTEXT_MAX_CHARS = 18_000;
const MAX_REPORTS = 10;

function reportBlock(r: ReportFile): string {
  const date = reportDate(r);
  const head = `REPORT: ${r.title}${date ? ` (${date})` : ""}${r.provider ? `, ${r.provider}` : ""}; attention: ${r.attention}`;
  const values = r.results.map((x) => {
    const range =
      x.range ??
      (x.low !== undefined || x.high !== undefined ? `${x.low ?? ""}–${x.high ?? ""}` : "");
    const flag = x.flag === "normal" || x.flag === "unknown" ? "" : ` [${x.flag.toUpperCase()}]`;
    return `- ${x.analyte ?? x.name}: ${x.value}${x.unit ? ` ${x.unit}` : ""}${range ? ` (range ${range})` : ""}${flag}`;
  });
  const lines = [head, ...values];
  if (r.summary) lines.push(`Summary: ${r.summary}`);
  return lines.join("\n");
}

function itemLine(i: HealthItem): string {
  if (i.kind === "medication")
    return `- ${[i.name, i.dose, i.schedule, i.started && `since ${i.started}`].filter(Boolean).join(", ")}`;
  if (i.kind === "appointment")
    return `- ${i.when.replace("T", " ")}: ${i.title}${i.who ? ` (${i.who})` : ""}`;
  return `- ${itemDate(i) ?? ""}: ${i.text.replace(/\s+/g, " ")}`;
}

export function buildFileContext(reports: ReportFile[], items: HealthItem[]): string {
  const newest = reports.toSorted((a, b) => reportDate(b).localeCompare(reportDate(a)));
  const sections: string[] = [];
  const meds = items.filter((i) => i.kind === "medication");
  const appts = items.filter((i) => i.kind === "appointment");
  const notes = items.filter((i) => i.kind === "note");
  if (meds.length) sections.push(["MEDICINES", ...meds.map(itemLine)].join("\n"));
  if (appts.length) sections.push(["APPOINTMENTS", ...appts.map(itemLine)].join("\n"));
  if (notes.length) sections.push(["NOTES", ...notes.map(itemLine)].join("\n"));
  for (const r of newest.slice(0, MAX_REPORTS)) sections.push(reportBlock(r));

  let text = sections.join("\n\n");
  const cut = newest.length > MAX_REPORTS || text.length > CONTEXT_MAX_CHARS;
  if (text.length > CONTEXT_MAX_CHARS) text = text.slice(0, CONTEXT_MAX_CHARS);
  return cut ? `${text}\n\n(The file is longer than this; only the newest part is shown.)` : text;
}
