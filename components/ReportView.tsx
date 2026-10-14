"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { formatDate, type Flag, type ReportFile, type ReportResult } from "@/lib/report";
import { anonymisedReport } from "@/lib/report-export";
import { previousValue } from "@/lib/report-trends";
import { ROUTES } from "@/lib/routes";
import { btnQuiet, card, eyebrow, link } from "./ui";

interface Props {
  data: ReportFile;
  /** The reader's other reports, for trends. */
  others?: readonly ReportFile[];
  /** Absent for the read-only sample. */
  onChange?: (next: ReportFile) => void;
  onDelete?: () => void;
  onSaveCopy?: () => void;
}

/**
 * How each flag is drawn. Colour is never the only carrier: every flag is a
 * word and a mark, so a reader who cannot tell the colours apart loses nothing.
 */
const FLAG_STYLE: Record<Flag, { mark: string; text: string }> = {
  normal: { mark: "•", text: "text-fg-secondary" },
  low: { mark: "↓", text: "text-status-warning" },
  high: { mark: "↑", text: "text-status-warning" },
  critical: { mark: "!", text: "text-status-negative" },
  unknown: { mark: "?", text: "text-fg-secondary" },
};

const ATTENTION_BORDER = {
  routine: "border-border-subtle",
  soon: "border-status-warning",
  urgent: "border-status-negative",
} as const;

function download(data: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations("Report");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={btnQuiet}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked: the text is on screen and can be selected.
        }
      }}
    >
      <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
    </button>
  );
}

/**
 * One measurement. The value is shown with the exact line of the report it was
 * read from, one tap away, because a misread number is the worst thing this
 * product can show and the reader is the only one who can catch it.
 */
function ResultRow({ result, previous }: { result: ReportResult; previous: ReturnType<typeof previousValue> }) {
  const t = useTranslations("Report");
  const locale = useLocale();
  const style = FLAG_STYLE[result.flag];
  return (
    <li className="py-4">
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-[1fr_11rem_9rem] sm:items-baseline">
        <div>
          <span className="font-semibold text-fg-primary">{result.name}</span>
          {result.analyte && result.analyte.toLowerCase() !== result.name.toLowerCase() && (
            <span className="ml-2 text-sm text-fg-tertiary">{result.analyte}</span>
          )}
        </div>
        <div className={`tabular font-mono text-lg ${style.text}`}>
          <span aria-hidden="true" className="mr-1.5">
            {style.mark}
          </span>
          {result.value}
          {result.unit && <span className="ml-1 text-sm text-fg-secondary">{result.unit}</span>}
          <span className="ml-2 font-sans text-xs font-bold uppercase tracking-caps">{t(`flag.${result.flag}`)}</span>
        </div>
        <div className="text-sm text-fg-secondary">
          {result.range ? t("range", { range: result.range }) : t("noRange")}
        </div>
      </div>
      {previous && (
        <p className="mt-1 text-sm text-fg-secondary">
          {t("before", {
            value: `${previous.value}${result.unit ? ` ${result.unit}` : ""}`,
            date: formatDate(previous.date, locale),
          })}
          {previous.direction && previous.direction !== "same" && (
            <span className="ml-2" aria-label={t(previous.direction === "up" ? "rising" : "falling")}>
              {previous.direction === "up" ? "↗" : "↘"} {t(previous.direction === "up" ? "rising" : "falling")}
            </span>
          )}
        </p>
      )}
      {result.note && <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-secondary">{result.note}</p>}
      <details className="mt-1 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-fg-secondary">{t("source")}</summary>
        {result.quote && (
          <blockquote lang="de" className="border-l-2 border-border pl-3 font-mono text-xs italic">
            {result.quote}
          </blockquote>
        )}
        <p className="mt-2 text-xs text-fg-secondary">{result.checked ? t("checked") : t("notChecked")}</p>
      </details>
    </li>
  );
}

export function ReportView({ data, others = [], onChange, onDelete, onSaveCopy }: Props) {
  const t = useTranslations("Report");
  const locale = useLocale();
  const [lang, setLang] = useState(0);
  const shown = data.texts[Math.min(lang, data.texts.length - 1)];
  const doneCount = data.followUps.filter((f) => f.done).length;
  // A report with no reading at all (filed by hand) has nothing an AI wrote.
  const analysed = Boolean(data.summary || data.results.length || data.questions.length || data.terms.length);
  const outside = data.results.filter((r) => r.flag !== "normal");
  const inside = data.results.filter((r) => r.flag === "normal");
  const previousOf = (r: ReportResult) => previousValue(r, data, others);

  const facts = (
    [
      ["provider", data.provider],
      ["kind", t(`kind.${data.kind}`)],
      ["reference", data.reference],
      ["collected", data.collected && formatDate(data.collected, locale)],
      ["reported", data.reported && formatDate(data.reported, locale)],
    ] as const
  ).filter((fact): fact is readonly [(typeof fact)[0], string] => Boolean(fact[1]));

  return (
    <article className="grid gap-10">
      <header className="grid gap-6 lg:grid-cols-[1fr_21rem] lg:items-start">
        <div>
          <h1 className="headline text-3xl sm:text-4xl">{data.title}</h1>
          {data.summary && <p className="mt-4 max-w-prose leading-relaxed text-fg-secondary">{data.summary}</p>}
          {facts.length > 0 && (
            <dl className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
              {facts.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-fg-secondary">{t(`facts.${key}`)}</dt>
                  <dd className="mb-2 sm:mb-0">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {analysed && (
            <p className="mt-6 max-w-prose rounded-control border border-border-subtle px-4 py-3 text-sm text-fg-secondary">
              {t("aiNotice")}
            </p>
          )}
        </div>

        {analysed && (
          <aside
            aria-labelledby="attention"
            className={`rounded-control border-2 px-5 py-4 ${ATTENTION_BORDER[data.attention]}`}
          >
            <p className={eyebrow}>{t("attentionEyebrow")}</p>
            <h2 id="attention" className="mt-1.5 text-xl font-semibold tracking-tight">
              {t(`attention.${data.attention}.title`)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{t(`attention.${data.attention}.body`)}</p>
            {data.attentionReason && <p className="mt-2 text-sm leading-relaxed">{data.attentionReason}</p>}
            <p className="mt-3 border-t border-border-subtle pt-3 text-xs leading-relaxed text-fg-secondary">
              {t("emergency")}
            </p>
          </aside>
        )}
      </header>

      {data.results.length > 0 && (
        <section aria-labelledby="results">
          <h2 id="results" className="text-2xl font-semibold tracking-tight">
            {outside.length > 0 ? t("outsideTitle", { count: outside.length }) : t("allInRange")}
          </h2>
          {outside.length > 0 && (
            <ul className="mt-3 divide-y divide-border-subtle border-y border-border-subtle">
              {outside.map((r) => (
                <ResultRow key={r.id} result={r} previous={previousOf(r)} />
              ))}
            </ul>
          )}
          {inside.length > 0 && (
            <details className="mt-6" open={outside.length === 0}>
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-lg font-semibold tracking-tight">
                {t("insideTitle", { count: inside.length })}
              </summary>
              <ul className="mt-2 divide-y divide-border-subtle border-y border-border-subtle">
                {inside.map((r) => (
                  <ResultRow key={r.id} result={r} previous={previousOf(r)} />
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {data.questions.length > 0 && (
        <section aria-labelledby="questions">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="questions" className="text-2xl font-semibold tracking-tight">
              {t("questionsTitle")}
            </h2>
            <CopyButton text={data.questions.map((q) => `- ${q}`).join("\n")} />
          </div>
          <p className="mt-2 max-w-prose text-sm text-fg-secondary">{t("questionsHint")}</p>
          <ul className="mt-4 grid max-w-prose list-disc gap-2.5 pl-5 leading-relaxed">
            {data.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      {data.terms.length > 0 && (
        <section aria-labelledby="terms">
          <h2 id="terms" className="text-2xl font-semibold tracking-tight">
            {t("termsTitle")}
          </h2>
          <dl className="mt-4 grid max-w-prose gap-4">
            {data.terms.map((term) => (
              <div key={term.term}>
                <dt className="font-semibold">{term.term}</dt>
                <dd className="mt-1 leading-relaxed text-fg-secondary">{term.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {data.followUps.length > 0 && (
        <section aria-labelledby="followups">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="followups" className="text-2xl font-semibold tracking-tight">
              {t("followUpsTitle")}
            </h2>
            {onChange && (
              <p className="font-mono text-xs text-fg-secondary">
                {t("followUpsDone", { done: doneCount, total: data.followUps.length })}
              </p>
            )}
          </div>
          <p className="mt-2 max-w-prose text-sm text-fg-secondary">{t("followUpsHint")}</p>
          <ul className="mt-5 grid gap-3">
            {data.followUps.map((f) => (
              <li key={f.id} className={card}>
                <label className="flex min-h-11 items-start gap-3.5">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                    checked={f.done}
                    disabled={!onChange}
                    onChange={(e) =>
                      onChange?.({
                        ...data,
                        followUps: data.followUps.map((x) => (x.id === f.id ? { ...x, done: e.target.checked } : x)),
                      })
                    }
                  />
                  <span className={f.done ? "text-fg-secondary line-through" : ""}>{f.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.notes.length > 0 && (
        <section aria-labelledby="notes">
          <h2 id="notes" className="text-2xl font-semibold tracking-tight">
            {t("notesTitle")}
          </h2>
          <ul className="mt-4 grid max-w-prose list-disc gap-2.5 pl-5 leading-relaxed text-fg-secondary">
            {data.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      {shown && (
        <section aria-labelledby="doc">
          <h2 id="doc" className="text-2xl font-semibold tracking-tight">
            {t("docTitle")}
          </h2>
          {data.texts.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("language")}>
              {data.texts.map((text, i) => (
                <button
                  key={`${text.lang}-${i}`}
                  type="button"
                  aria-pressed={shown === text}
                  onClick={() => setLang(i)}
                  className={
                    shown === text
                      ? "min-h-11 rounded-control bg-accent px-4 text-sm font-medium text-on-accent"
                      : btnQuiet
                  }
                >
                  {text.label}
                </button>
              ))}
            </div>
          )}
          <div lang={shown.lang} className={`${card} mt-4 whitespace-pre-wrap font-mono text-sm leading-relaxed`}>
            {shown.text}
          </div>
        </section>
      )}

      {analysed && (
        <section aria-labelledby="who" className={`${card} sm:p-8`}>
          <p className={eyebrow}>{t("whoEyebrow")}</p>
          <h2 id="who" className="mt-2 text-2xl font-semibold tracking-tight">
            {t("whoTitle")}
          </h2>
          <p className="mt-2 max-w-prose leading-relaxed text-fg-secondary">{t("whoBody")}</p>
          <p className="mt-2">
            <Link href={ROUTES.clinicians} className={`${link} inline-flex min-h-11 items-center`}>
              {t("findClinician")}
            </Link>
          </p>
        </section>
      )}

      <footer className="flex flex-wrap gap-3 border-t border-border-subtle pt-6">
        <button
          type="button"
          className={btnQuiet}
          onClick={() => download(anonymisedReport(data), `diplodoctor-${data.id}-anonymised.json`)}
        >
          {t("exportAnon")}
        </button>
        <button type="button" className={btnQuiet} onClick={() => download(data, `diplodoctor-${data.id}.json`)}>
          {t("export")}
        </button>
        {onSaveCopy && (
          <button type="button" className={btnQuiet} onClick={onSaveCopy}>
            {t("saveCopy")}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className={btnQuiet}
            onClick={() => {
              if (window.confirm(t("deleteConfirm"))) onDelete();
            }}
          >
            {t("delete")}
          </button>
        )}
      </footer>
    </article>
  );
}
