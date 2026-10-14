"use client";

import { useLocale, useTranslations } from "next-intl";
import { use } from "react";
import { ReportView } from "@/components/ReportView";
import { link, shell } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { newId } from "@/lib/report";
import { ROUTES } from "@/lib/routes";
import { sampleReport } from "@/lib/sample";
import { deleteReport, saveReport, useHydrated, useReports } from "@/lib/store";

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("Report");
  const locale = toLocale(useLocale());
  const router = useRouter();
  const reports = useReports();
  const hydrated = useHydrated();

  if (id === "sample") {
    const sample = sampleReport(locale);
    return (
      <main className={`${shell} py-10 sm:py-14`}>
        <p className="mb-8 rounded-control border border-border-subtle px-4 py-3 text-sm text-fg-secondary">
          {t("sampleBanner")}
        </p>
        <ReportView
          data={sample}
          others={reports}
          onSaveCopy={() => {
            const copy = { ...sample, id: newId(), createdAt: new Date().toISOString() };
            saveReport(copy);
            router.push(ROUTES.reportById(copy.id));
          }}
        />
      </main>
    );
  }

  const data = reports.find((r) => r.id === id);
  return (
    <main className={`${shell} py-10 sm:py-14`}>
      {data ? (
        <ReportView
          data={data}
          others={reports}
          onChange={saveReport}
          onDelete={() => {
            deleteReport(data.id);
            router.push(ROUTES.reports);
          }}
        />
      ) : hydrated ? (
        <div className="py-16">
          <h1 className="text-3xl font-semibold tracking-tight">{t("notHereTitle")}</h1>
          <p className="mt-3 max-w-prose text-fg-secondary">{t("notHereBody")}</p>
          <p className="mt-4">
            <Link href={ROUTES.reports} className={`${link} inline-flex min-h-11 items-center`}>
              {t("goReports")}
            </Link>
          </p>
        </div>
      ) : null}
    </main>
  );
}
