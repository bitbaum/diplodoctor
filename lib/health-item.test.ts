import { describe, expect, it } from "vitest";
import {
  appointmentTime,
  itemDate,
  itemTitle,
  parseItem,
  upcomingAppointments,
  type HealthItem,
} from "./health-item";
import { toRows } from "./records";

const base = { id: "i_1", createdAt: "2026-10-01T10:00:00Z" };
const appt = (id: string, when: string): HealthItem =>
  parseItem({ ...base, id, kind: "appointment", title: "Check-up", when })!;

describe("a health item", () => {
  it("accepts a medicine with only a name", () => {
    const m = parseItem({ ...base, kind: "medication", name: "Metformin" });
    expect(m).toMatchObject({ kind: "medication", name: "Metformin" });
  });

  it("drops empty optional text rather than keeping an empty string", () => {
    const m = parseItem({ ...base, kind: "medication", name: "Metformin", dose: "  " });
    expect(m && "dose" in m ? m.dose : "absent").toBeUndefined();
  });

  it("refuses a medicine without a name, an appointment without a real date, an unknown kind", () => {
    expect(parseItem({ ...base, kind: "medication", name: " " })).toBeNull();
    expect(parseItem({ ...base, kind: "appointment", title: "x", when: "next week" })).toBeNull();
    expect(parseItem({ ...base, kind: "prescription", name: "x" })).toBeNull();
    expect(parseItem(null)).toBeNull();
  });

  it("reads the day an item belongs to and a title for a list", () => {
    const a = appt("a", "2026-11-03T09:30");
    expect(itemDate(a)).toBe("2026-11-03");
    expect(appointmentTime(a as never)).toBe("09:30");
    expect(appointmentTime(appt("b", "2026-11-03") as never)).toBeNull();
    const n = parseItem({
      ...base,
      kind: "note",
      text: "Dizzy after lunch\nsecond line",
      date: "2026-10-02",
    })!;
    expect(itemTitle(n)).toBe("Dizzy after lunch");
  });

  it("lists appointments from today on, soonest first", () => {
    const items = [
      appt("late", "2026-12-01T10:00"),
      appt("past", "2026-09-01"),
      appt("soon", "2026-11-02T08:00"),
    ];
    expect(upcomingAppointments(items, "2026-10-14").map((a) => a.id)).toEqual(["soon", "late"]);
  });
});

describe("rows for the records list", () => {
  it("turns reports and items into one shape", () => {
    const rows = toRows([], [appt("a", "2026-11-03T09:30")]);
    expect(rows).toEqual([
      expect.objectContaining({
        id: "a",
        kind: "appointment",
        title: "Check-up",
        date: "2026-11-03",
        flagged: 0,
      }),
    ]);
  });
});
