"use client";

import { useLocale, useTranslations } from "next-intl";
import { btnPrimary, btnQuiet, card, link, shell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { appointmentTime, upcomingAppointments, type Medication } from "@/lib/health-item";
import { formatDate, reportDate } from "@/lib/report";
import { useFileCopy } from "@/lib/file-sync";
import { ROUTES } from "@/lib/routes";
import { useHydrated, useItems, useReports, useToday } from "@/lib/store";

const UPCOMING = 5;
const LATEST = 3;
const MEDICINES = 6;

const addHref = (kind: string) => `${ROUTES.addRecord}?kind=${kind}`;

/**
 * The page a person returns to: what is next, what came back, what they take.
 *
 * It answers "what do I need to know today" and nothing else; everything with
 * depth lives in Records. Built from what is in this browser, so it works the
 * same signed in or not. An empty file shows the three ways to start instead
 * of three empty boxes.
 */
export default function TodayPage() {
  const t = useTranslations("Today");
  const r = useTranslations("Records");
  const locale = useLocale();
  const reports = useReports();
  const items = useItems();
  const hydrated = useHydrated();
  const today = useToday();
  const copy = useFileCopy();

  const upcoming = today ? upcomingAppointments(items, today).slice(0, UPCOMING) : [];
  const latest = reports
    .toSorted((a, b) => reportDate(b).localeCompare(reportDate(a)))
    .slice(0, LATEST);
  const medicines = items.filter((i): i is Medication => i.kind === "medication");
  const todo = reports.flatMap((rep) =>
    rep.followUps.filter((f) => !f.done).map((f) => ({ ...f, report: rep })),
  );
  const empty = hydrated && reports.length === 0 && items.length === 0;

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="headline text-4xl sm:text-5xl">{t("title")}</h1>
          <p className="mt-2 text-sm text-fg-secondary">{t(copy === "on" ? "synced" : "local")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={ROUTES.newReport} className={btnPrimary}>
            {t("add.report")}
          </Link>
          <Link href={addHref("medication")} className={btnQuiet}>
            {t("add.medication")}
          </Link>
          <Link href={addHref("appointment")} className={btnQuiet}>
            {t("add.appointment")}
          </Link>
        </div>
      </div>

      {empty && (
        <div className={`${card} mt-10 sm:p-8`}>
          <h2 className="text-2xl font-semibold tracking-tight">{t("start.title")}</h2>
          <p className="mt-2 max-w-prose text-fg-secondary">{t("start.body")}</p>
          <p className="mt-3">
            <Link
              href={ROUTES.sampleReport}
              className={`${link} inline-flex min-h-11 items-center`}
            >
              {t("start.example")}
            </Link>
          </p>
        </div>
      )}

      {hydrated && !empty && (
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="up">
            <h2 id="up" className="kicker">
              {t("upcoming")}
            </h2>
            {upcoming.length === 0 && todo.length === 0 ? (
              <p className="mt-3 text-fg-secondary">{t("nothingUpcoming")}</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {upcoming.map((a) => {
                  const time = appointmentTime(a);
                  return (
                    <li key={a.id}>
                      <Link
                        href={`${ROUTES.addRecord}?edit=${a.id}`}
                        className={`${card} block transition-colors hover:border-fg-muted`}
                      >
                        <span className="block font-semibold">{a.title}</span>
                        <span className="mt-1 block text-sm text-fg-secondary">
                          {[formatDate(a.when.slice(0, 10), locale), time, a.who]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {todo.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-fg-secondary">{t("todo")}</h3>
                <ul className="mt-2 grid gap-2">
                  {todo.slice(0, 5).map((f) => (
                    <li key={`${f.report.id}-${f.id}`}>
                      <Link
                        href={ROUTES.reportById(f.report.id)}
                        className={`${link} inline-flex min-h-11 items-center`}
                      >
                        {f.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section aria-labelledby="latest">
            <h2 id="latest" className="kicker">
              {t("latest")}
            </h2>
            {latest.length === 0 ? (
              <p className="mt-3 text-fg-secondary">{r("empty")}</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {latest.map((rep) => {
                  const outside = rep.results.filter((x) => x.flag !== "normal").length;
                  const date = reportDate(rep);
                  return (
                    <li key={rep.id}>
                      <Link
                        href={ROUTES.reportById(rep.id)}
                        className={`${card} block transition-colors hover:border-fg-muted`}
                      >
                        <span className="block font-semibold">{rep.title}</span>
                        <span className="mt-1 block text-sm text-fg-secondary">
                          {date ? formatDate(date, locale) : r("undated")}
                          {rep.results.length > 0 && (
                            <span
                              className={`ml-3 font-mono text-xs ${outside > 0 ? "text-status-warning" : ""}`}
                            >
                              {r("outside", { outside, total: rep.results.length })}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="meds">
            <h2 id="meds" className="kicker">
              {t("medicines")}
            </h2>
            {medicines.length === 0 ? (
              <p className="mt-3 text-fg-secondary">{t("noMedicines")}</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {medicines.slice(0, MEDICINES).map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`${ROUTES.addRecord}?edit=${m.id}`}
                      className={`${card} block transition-colors hover:border-fg-muted`}
                    >
                      <span className="block font-semibold">{m.name}</span>
                      {(m.dose || m.schedule) && (
                        <span className="mt-1 block text-sm text-fg-secondary">
                          {[m.dose, m.schedule].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3">
              <Link href={addHref("note")} className={`${link} inline-flex min-h-11 items-center`}>
                {t("add.note")}
              </Link>
            </p>
          </section>
        </div>
      )}

      <p className="mt-12">
        <Link href={ROUTES.records} className={`${link} inline-flex min-h-11 items-center`}>
          {t("all")}
        </Link>
      </p>
    </main>
  );
}
