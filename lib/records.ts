import { itemDate, itemTitle, type HealthItem } from "./health-item";
import { reportDate, type ReportFile } from "./report";
import { ROUTES } from "./routes";

/**
 * One row for anything in a health file, so a single list can show, filter and
 * search reports, medicines, appointments and notes together.
 */
export type RecordKind = "report" | HealthItem["kind"];
export const RECORD_KINDS: readonly RecordKind[] = ["report", "medication", "appointment", "note"];

export type RecordRow = {
  id: string;
  kind: RecordKind;
  title: string;
  /** Who or where: the lab, the doctor, the dose. */
  detail: string;
  date: string | null;
  /** Values outside their range, for a report; 0 for everything else. */
  flagged: number;
  href: string;
  /** Appointments are opened in the add form, so their edit target differs. */
  itemId?: string;
};

export function toRows(reports: ReportFile[], items: HealthItem[]): RecordRow[] {
  const fromReports = reports.map<RecordRow>((r) => ({
    id: r.id,
    kind: "report",
    title: r.title,
    detail: [r.provider, r.reference].filter(Boolean).join(" · "),
    date: reportDate(r) || null,
    flagged: r.results.filter((x) => x.flag !== "normal").length,
    href: ROUTES.reportById(r.id),
  }));
  const fromItems = items.map<RecordRow>((i) => ({
    id: i.id,
    kind: i.kind,
    title: itemTitle(i),
    detail:
      i.kind === "medication"
        ? [i.dose, i.schedule].filter(Boolean).join(" · ")
        : i.kind === "appointment"
          ? (i.who ?? "")
          : "",
    date: itemDate(i) ?? null,
    flagged: 0,
    href: `${ROUTES.addRecord}?edit=${i.id}`,
    itemId: i.id,
  }));
  return [...fromReports, ...fromItems];
}
