"use client";

import { DateInput } from "@bitbaum/whenkit/react";
import "@bitbaum/whenkit/styles.css";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnQuiet, field, label, link, shell } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ITEM_KINDS,
  newItemId,
  parseItem,
  type HealthItem,
  type ItemKind,
} from "@/lib/health-item";
import { ROUTES } from "@/lib/routes";
import { deleteItem, saveItem, useHydrated, useItems, useToday } from "@/lib/store";

/**
 * Add or change a medicine, an appointment or a note. One form whose fields
 * follow the kind, so there is one place to learn and one to fix. Dates use
 * whenkit's picker: nobody types a date or sees the browser's placeholder.
 */
export default function AddRecordPage() {
  const params = useSearchParams();
  const items = useItems();
  const hydrated = useHydrated();
  const editId = params.get("edit");
  const existing = editId ? items.find((i) => i.id === editId) : undefined;

  if (editId && hydrated && !existing) return <NotFound />;
  // Keyed so switching between records resets the form rather than mixing state.
  return (
    <Form
      key={existing?.id ?? params.get("kind") ?? "new"}
      existing={existing}
      initialKind={kindFrom(params.get("kind"))}
    />
  );
}

function kindFrom(value: string | null): ItemKind {
  return (ITEM_KINDS as readonly string[]).includes(value ?? "")
    ? (value as ItemKind)
    : "medication";
}

function NotFound() {
  const t = useTranslations("Add");
  return (
    <main className={`${shell} py-16`}>
      <p className="text-fg-secondary">{t("notFound")}</p>
      <p className="mt-4">
        <Link href={ROUTES.records} className={`${link} inline-flex min-h-11 items-center`}>
          {t("cancel")}
        </Link>
      </p>
    </main>
  );
}

function Form({ existing, initialKind }: { existing?: HealthItem; initialKind: ItemKind }) {
  const t = useTranslations("Add");
  const router = useRouter();
  const today = useToday() ?? "";
  const [kind, setKind] = useState<ItemKind>(existing?.kind ?? initialKind);
  const [error, setError] = useState(false);
  // Every field as text; the schema decides what is valid when saving.
  const [v, setV] = useState<Record<string, string>>(() => ({
    name: existing?.kind === "medication" ? existing.name : "",
    dose: existing?.kind === "medication" ? (existing.dose ?? "") : "",
    schedule: existing?.kind === "medication" ? (existing.schedule ?? "") : "",
    started: existing?.kind === "medication" ? (existing.started ?? "") : "",
    title: existing?.kind === "appointment" ? existing.title : "",
    when: existing?.kind === "appointment" ? existing.when : "",
    who: existing?.kind === "appointment" ? (existing.who ?? "") : "",
    text: existing?.kind === "note" ? existing.text : "",
    date: existing?.kind === "note" ? existing.date : "",
    notes: existing && existing.kind !== "note" ? (existing.notes ?? "") : "",
  }));
  const set = (k: string) => (e: { target: { value: string } }) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const common = {
      id: existing?.id ?? newItemId(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    const draft =
      kind === "medication"
        ? {
            ...common,
            kind,
            name: v.name,
            dose: v.dose,
            schedule: v.schedule,
            started: v.started || undefined,
            notes: v.notes,
          }
        : kind === "appointment"
          ? { ...common, kind, title: v.title, when: v.when, who: v.who, notes: v.notes }
          : { ...common, kind, text: v.text, date: v.date || today };
    const item = parseItem(draft);
    if (!item) {
      setError(true);
      return;
    }
    saveItem(item);
    router.push(ROUTES.today);
  }

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <h1 className="headline text-4xl sm:text-5xl">
        {t(existing ? `edit.${kind}` : `title.${kind}`)}
      </h1>

      {!existing && (
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label={t("kind")}>
          {ITEM_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`inline-flex min-h-11 items-center rounded-control border px-3 text-sm transition-colors ${kind === k ? "border-accent bg-accent/10" : "border-border hover:border-fg-muted"}`}
            >
              {t(`kinds.${k}`)}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-8 grid max-w-xl gap-5">
        {kind === "medication" && (
          <>
            <Field id="name" label={t("fields.name")}>
              <input
                id="name"
                required
                maxLength={120}
                value={v.name}
                onChange={set("name")}
                className={field}
              />
            </Field>
            <Field id="dose" label={t("fields.dose")}>
              <input
                id="dose"
                maxLength={80}
                value={v.dose}
                onChange={set("dose")}
                className={field}
              />
            </Field>
            <Field id="schedule" label={t("fields.schedule")} hint={t("hints.schedule")}>
              <input
                id="schedule"
                maxLength={120}
                value={v.schedule}
                onChange={set("schedule")}
                className={field}
              />
            </Field>
            <Field id="started" label={t("fields.started")}>
              <DateInput
                id="started"
                type="date"
                value={v.started}
                onChange={set("started")}
                className={field}
              />
            </Field>
          </>
        )}
        {kind === "appointment" && (
          <>
            <Field id="title" label={t("fields.title")}>
              <input
                id="title"
                required
                maxLength={160}
                value={v.title}
                onChange={set("title")}
                className={field}
              />
            </Field>
            <Field id="when" label={t("fields.when")}>
              <DateInput
                id="when"
                type="datetime-local"
                required
                value={v.when}
                onChange={set("when")}
                className={field}
              />
            </Field>
            <Field id="who" label={t("fields.who")} hint={t("hints.who")}>
              <input
                id="who"
                maxLength={160}
                value={v.who}
                onChange={set("who")}
                className={field}
              />
            </Field>
          </>
        )}
        {kind === "note" && (
          <>
            <Field id="text" label={t("fields.text")}>
              <textarea
                id="text"
                required
                rows={5}
                maxLength={2000}
                value={v.text}
                onChange={set("text")}
                className={field}
              />
            </Field>
            <Field id="date" label={t("fields.date")}>
              <DateInput
                id="date"
                type="date"
                value={v.date || today}
                onChange={set("date")}
                className={field}
              />
            </Field>
          </>
        )}
        {kind !== "note" && (
          <Field id="notes" label={t("fields.notes")}>
            <textarea
              id="notes"
              rows={3}
              maxLength={1000}
              value={v.notes}
              onChange={set("notes")}
              className={field}
            />
          </Field>
        )}

        {error && (
          <p role="alert" className="text-sm text-status-negative">
            {t("error")}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={btnPrimary}>
            {t("save")}
          </button>
          <Link href={ROUTES.today} className={btnQuiet}>
            {t("cancel")}
          </Link>
          {existing && (
            <button
              type="button"
              onClick={() => {
                deleteItem(existing.id);
                router.push(ROUTES.today);
              }}
              className={`${link} ml-auto min-h-11 px-2`}
            >
              {t("delete")}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

function Field({
  id,
  label: text,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-fg-tertiary">{hint}</p>}
    </div>
  );
}
