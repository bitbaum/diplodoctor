"use client";

import { useSyncExternalStore } from "react";
import { isByokConfig, type ByokConfig } from "@bitbaum/ai-kit/byok";
import { parseReport, type ReportFile } from "./report";

/**
 * Things kept in THIS BROWSER and nowhere else: the reports, and the reader's
 * own model key.
 *
 * That is a limitation and also the honest privacy story for a first version:
 * a medical record is about as sensitive as data gets, and until there are
 * accounts there is no server of ours it should sit on. Export/import is how a
 * report moves between devices or to a clinician.
 *
 * One store factory because both need the same four non-obvious things: a
 * cached snapshot (useSyncExternalStore loops without one), writes that
 * announce themselves in the same tab, a localStorage that may throw in
 * private mode, and a parser that treats what it reads back as untrusted.
 */
function createBrowserStore<T>(key: string, empty: T, parse: (raw: unknown) => T) {
  let cachedRaw: string | null | undefined;
  let cached: T = empty;
  const listeners = new Set<() => void>();

  function read(): T {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return cached; // storage blocked: keep the in-memory copy
    }
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    try {
      cached = raw ? parse(JSON.parse(raw)) : empty;
    } catch {
      cached = empty;
    }
    return cached;
  }

  function write(next: T) {
    cached = next;
    try {
      if (next === empty) {
        cachedRaw = null;
        window.localStorage.removeItem(key);
      } else {
        cachedRaw = JSON.stringify(next);
        window.localStorage.setItem(key, cachedRaw);
      }
    } catch {
      // Still usable for this visit; it just will not survive a reload.
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  }

  return { read, write, use: () => useSyncExternalStore(subscribe, read, () => empty) };
}

const NO_REPORTS: ReportFile[] = [];
const reports = createBrowserStore<ReportFile[]>("diplodoctor.reports.v1", NO_REPORTS, (raw) =>
  Array.isArray(raw) ? raw.flatMap((r) => parseReport(r) ?? []) : NO_REPORTS,
);

export const useReports = reports.use;

export function saveReport(r: ReportFile) {
  const list = reports.read();
  reports.write(
    list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [r, ...list],
  );
}

export function deleteReport(id: string) {
  const next = reports.read().filter((x) => x.id !== id);
  reports.write(next.length ? next : NO_REPORTS);
}

/**
 * The reader's own model key. `isByokConfig` checks the vendor against
 * ai-kit's CLOSED list on every read, so a vendor since removed from that list
 * cannot be resurrected out of an old browser's storage — the list is the
 * SSRF defence, and it would be worth nothing if storage could reopen a host.
 */
const ownModel = createBrowserStore<ByokConfig | null>("diplodoctor.model.v1", null, (raw) =>
  isByokConfig(raw) ? raw : null,
);

export const useOwnModel = ownModel.use;

/**
 * Which model answers: "" lets Diplodoctor walk its free chain, a model id starts
 * the chain there, and "own" uses the reader's own key. Only a preference; the
 * server checks the id against what it offers.
 */
const modelPick = createBrowserStore<string>("diplodoctor.model.pick.v1", "", (raw) =>
  typeof raw === "string" && raw.length <= 120 ? raw : "",
);
export const useModelPick = modelPick.use;
export const saveModelPick = (pick: string) => modelPick.write(pick);
export const saveOwnModel = (config: ByokConfig) => ownModel.write(config);
export const clearOwnModel = () => ownModel.write(null);

/**
 * Words the reader always wants hidden from the model — their own name, their
 * employer. Kept in this browser so they need typing once, not per report.
 */
const NO_WORDS: string[] = [];
const ownWords = createBrowserStore<string[]>("diplodoctor.hide.v1", NO_WORDS, (raw) =>
  Array.isArray(raw)
    ? raw.filter((w): w is string => typeof w === "string" && w.trim() !== "").slice(0, 50)
    : NO_WORDS,
);

export const useOwnWords = ownWords.use;
export const saveOwnWords = (words: string[]) => ownWords.write(words.length ? words : NO_WORDS);

/** Today as YYYY-MM-DD on the client, null while server-rendering. */
export function useToday(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => new Date().toISOString().slice(0, 10),
    () => null,
  );
}

/** False during server render and hydration, true after — for storage-backed UI. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
