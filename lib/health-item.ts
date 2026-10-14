import { z } from "zod";

/**
 * Everything in a health file that is not a report: the medicines someone
 * takes, the appointments ahead, a note about how they feel.
 *
 * A report is read by a model and keeps the reading with it (lib/report.ts).
 * These are written by the person, so each is small and has no model in it.
 * Like reports they are kept in this browser until there is a server it
 * should sit on (lib/store.ts), and like reports they are untrusted when read
 * back: everything goes through the schema.
 */
export const ITEM_KINDS = ["medication", "appointment", "note"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/** YYYY-MM-DD, optionally with a time: YYYY-MM-DDTHH:MM, no zone. */
const when = z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const base = {
  id: z.string().min(1).max(60),
  createdAt: z.string().max(40),
};

export const ItemSchema = z.discriminatedUnion("kind", [
  z.object({
    ...base,
    kind: z.literal("medication"),
    name: text(120),
    dose: optionalText(80),
    schedule: optionalText(120),
    started: day.optional(),
    notes: optionalText(1000),
  }),
  z.object({
    ...base,
    kind: z.literal("appointment"),
    title: text(160),
    when,
    who: optionalText(160),
    notes: optionalText(1000),
  }),
  z.object({
    ...base,
    kind: z.literal("note"),
    text: text(2000),
    date: day,
  }),
]);

export type HealthItem = z.output<typeof ItemSchema>;
export type Medication = Extract<HealthItem, { kind: "medication" }>;
export type Appointment = Extract<HealthItem, { kind: "appointment" }>;
export type Note = Extract<HealthItem, { kind: "note" }>;

export function parseItem(input: unknown): HealthItem | null {
  const parsed = ItemSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function newItemId(): string {
  return `i_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** The day an item belongs to, as YYYY-MM-DD. A medicine without a start has none. */
export function itemDate(item: HealthItem): string | undefined {
  if (item.kind === "appointment") return item.when.slice(0, 10);
  if (item.kind === "note") return item.date;
  return item.started;
}

/** The line that names an item in a list. */
export function itemTitle(item: HealthItem): string {
  if (item.kind === "medication") return item.name;
  if (item.kind === "appointment") return item.title;
  return item.text.split("\n")[0]!.slice(0, 120);
}

/** Appointments from today on, soonest first. `today` is YYYY-MM-DD. */
export function upcomingAppointments(items: HealthItem[], today: string): Appointment[] {
  return items
    .filter((i): i is Appointment => i.kind === "appointment" && i.when.slice(0, 10) >= today)
    .toSorted((a, b) => a.when.localeCompare(b.when));
}

/** The time part of an appointment, or null when only a day was given. */
export function appointmentTime(a: Pick<Appointment, "when">): string | null {
  return a.when.length > 10 ? a.when.slice(11, 16) : null;
}
