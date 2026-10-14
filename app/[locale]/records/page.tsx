"use client";

import { applyQuery, emptyQuery, isNarrowed, parseQuery, writeQuery, type ListSpec } from "listkit";
import { createSearch } from "@bitbaum/searchkit";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { btnPrimary, btnQuiet, card, field, link, shell } from "@/components/ui";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { formatDate, parseReport } from "@/lib/report";
import { RECORD_KINDS, toRows, type RecordRow } from "@/lib/records";
import { ROUTES } from "@/lib/routes";
import { saveReport, useHydrated, useItems, useReports } from "@/lib/store";

/**
 * Everything in the file as one list. listkit owns what a list IS (filters,
 * order, pages and how they live in the URL, so a filtered view can be copied
 * or bookmarked); searchkit owns finding what was meant, so "ferrtin" still
 * finds the ferritin report. This page only draws.
 */
const SPEC: ListSpec<RecordRow> = {
  facets: [
    { key: "kind", kind: "many", value: (r) => r.kind, options: RECORD_KINDS },
    { key: "flagged", kind: "flag", value: (r) => r.flagged > 0 },
  ],
  sorts: [{ key: "date", by: [(r) => r.date, (r) => r.title] }],
  defaultSort: "date",
  defaultDir: "desc",
  defaultPageSize: 20,
};

const SEARCH_FIELDS = [
  { name: "title", get: (r: RecordRow) => r.title },
  { name: "detail", get: (r: RecordRow) => r.detail },
];

export default function RecordsPage() {
  const t = useTranslations("Records");
  const locale = useLocale();
  const reports = useReports();
  const items = useItems();
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [error, setError] = useState(false);

  const rows = useMemo(() => toRows(reports, items), [reports, items]);
  const query = parseQuery(params, SPEC);
  const narrowed = isNarrowed(query);

  const result = useMemo(() => {
    let pool = rows;
    if (query.q) {
      const hits = createSearch(rows, { fields: SEARCH_FIELDS }).search(query.q);
      const order = new Map(hits.map((h, i) => [h.item.id, i]));
      pool = rows.filter((r) => order.has(r.id));
    }
    return applyQuery(pool, { ...SPEC, search: undefined }, { ...query, q: "" });
  }, [rows, query]);

  function go(next: typeof query) {
    const qs = writeQuery(params, next, SPEC, query).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggleKind(kind: string) {
    const on = query.facets.kind ?? [];
    go({
      ...query,
      facets: {
        ...query.facets,
        kind: on.includes(kind) ? on.filter((k) => k !== kind) : [...on, kind],
      },
    });
  }

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

  const kindsOn = query.facets.kind ?? [];
  const flaggedOn = (query.facets.flagged ?? []).length > 0;

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="headline text-4xl sm:text-5xl">{t("title")}</h1>
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
          <Link href={ROUTES.addRecord} className={btnPrimary}>
            {t("add")}
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-accent">
          {t("importError")}
        </p>
      )}

      <div className="mt-8 grid gap-4">
        <input
          type="search"
          aria-label={t("search")}
          placeholder={t("search")}
          defaultValue={query.q}
          onChange={(e) => go({ ...query, q: e.target.value })}
          className={field}
        />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("kind")}>
          {RECORD_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kindsOn.includes(k)}
              onClick={() => toggleKind(k)}
              className={`${chip} ${kindsOn.includes(k) ? chipOn : ""}`}
            >
              {t(`kinds.${k}`)}
              <span className="ml-1.5 font-mono text-xs text-fg-tertiary">
                {result.counts.kind?.[k] ?? 0}
              </span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={flaggedOn}
            onClick={() =>
              go({ ...query, facets: { ...query.facets, flagged: flaggedOn ? [] : ["true"] } })
            }
            className={`${chip} ${flaggedOn ? chipOn : ""}`}
          >
            {t("flagged")}
          </button>
          {narrowed && (
            <button
              type="button"
              onClick={() => go(emptyQuery(SPEC))}
              className={`${link} min-h-11 px-2`}
            >
              {t("clear")}
            </button>
          )}
          <button
            type="button"
            onClick={() => go({ ...query, dir: query.dir === "desc" ? "asc" : "desc" })}
            className={`${link} ml-auto min-h-11 px-2`}
          >
            {t("sort.label")}: {t(query.dir === "desc" ? "sort.newest" : "sort.oldest")}
          </button>
        </div>
      </div>

      {hydrated && rows.length === 0 && <p className="mt-10 text-fg-secondary">{t("empty")}</p>}
      {hydrated && rows.length > 0 && result.matched === 0 && (
        <p className="mt-10 text-fg-secondary">{t("noMatch")}</p>
      )}

      <p className="mt-8 text-sm text-fg-secondary">{t("count", { count: result.matched })}</p>
      <ul className="mt-3 grid gap-3">
        {result.rows.map((r) => (
          <li key={`${r.kind}-${r.id}`}>
            <Link
              href={r.href}
              className={`${card} grid gap-2 transition-colors hover:border-fg-muted sm:grid-cols-[1fr_auto] sm:items-center`}
            >
              <span>
                <span className="kicker block">{t(`kinds.${r.kind}`)}</span>
                <span className="mt-1 block text-xl font-semibold tracking-tight">{r.title}</span>
                {r.detail && (
                  <span className="mt-1 block text-sm text-fg-secondary">{r.detail}</span>
                )}
              </span>
              <span className="text-sm sm:text-right">
                <span className="block">{r.date ? formatDate(r.date, locale) : t("undated")}</span>
                {r.kind === "report" && r.flagged > 0 && (
                  <span className="block font-mono text-xs text-status-warning">
                    {t("outside", {
                      outside: r.flagged,
                      total: reports.find((x) => x.id === r.id)?.results.length ?? r.flagged,
                    })}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {result.page.totalPages > 1 && (
        <nav
          className="mt-8 flex items-center justify-between"
          aria-label={t("page", { page: result.page.page, pages: result.page.totalPages })}
        >
          <button
            type="button"
            disabled={!result.page.hasPrev}
            onClick={() => go({ ...query, page: query.page - 1 })}
            className={`${btnQuiet} disabled:opacity-40`}
          >
            {t("prev")}
          </button>
          <span className="text-sm text-fg-secondary">
            {t("page", { page: result.page.page, pages: result.page.totalPages })}
          </span>
          <button
            type="button"
            disabled={!result.page.hasNext}
            onClick={() => go({ ...query, page: query.page + 1 })}
            className={`${btnQuiet} disabled:opacity-40`}
          >
            {t("next")}
          </button>
        </nav>
      )}
    </main>
  );
}

const chip =
  "inline-flex min-h-11 items-center rounded-control border border-border px-3 text-sm text-fg-primary transition-colors hover:border-fg-muted";
const chipOn = "border-accent bg-accent/10";
