"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { btnPrimary, btnQuiet, card, link, shell } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate, parseReport, reportDate } from "@/lib/report";
import { ROUTES } from "@/lib/routes";
import { saveReport, useHydrated, useReports } from "@/lib/store";

export default function ReportsPage() {
  const t = useTranslations("Reports");
  const k = useTranslations("Report");
  const locale = useLocale();
  const reports = useReports();
  const hydrated = useHydrated();
  const router = useRouter();
  const [error, setError] = useState(false);

  async function onImport(file: File | undefined) {
    if (!file) return;
    setError(false);
    try {
      const parsed = parseReport(JSON.parse(await file.text()));
      if (!parsed) throw new Error("not a report");
      saveReport(parsed);
      router.push(ROUTES.reportById(parsed.id));
    } catch {
      setError(true);
    }
  }

  const sorted = reports.toSorted((a, b) => reportDate(b).localeCompare(reportDate(a)));

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="headline text-4xl sm:text-5xl">{t("title")}</h1>
          <p className="mt-2 text-sm text-fg-secondary">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className={`${btnQuiet} cursor-pointer focus-within:outline-2`}>
            {t("import")}
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                void onImport(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <Link href={ROUTES.newReport} className={btnPrimary}>
            {t("new")}
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-accent">
          {t("importError")}
        </p>
      )}

      {hydrated && reports.length === 0 && (
        <div className={`${card} mt-10 sm:p-8`}>
          <h2 className="text-2xl font-semibold tracking-tight">{t("emptyTitle")}</h2>
          <p className="mt-2 max-w-prose text-fg-secondary">{t("emptyBody")}</p>
          <p className="mt-3">
            <Link
              href={ROUTES.sampleReport}
              className={`${link} inline-flex min-h-11 items-center`}
            >
              {t("example")}
            </Link>
          </p>
        </div>
      )}

      <ul className="mt-10 grid gap-3">
        {sorted.map((r) => {
          const outside = r.results.filter((x) => x.flag !== "normal").length;
          const date = reportDate(r);
          return (
            <li key={r.id}>
              <Link
                href={ROUTES.reportById(r.id)}
                className={`${card} grid gap-2 transition-colors hover:border-fg-muted sm:grid-cols-[1fr_auto] sm:items-center`}
              >
                <span>
                  <span className="block text-xl font-semibold tracking-tight">{r.title}</span>
                  <span className="mt-1 block text-sm text-fg-secondary">
                    {[r.provider, k(`kind.${r.kind}`)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="text-sm sm:text-right">
                  {date && <span className="block">{formatDate(date, locale)}</span>}
                  {r.results.length > 0 && (
                    <span
                      className={`block font-mono text-xs ${outside > 0 ? "text-status-warning" : "text-fg-secondary"}`}
                    >
                      {t("outside", { outside, total: r.results.length })}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
