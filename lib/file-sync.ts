"use client";

import { useSyncExternalStore } from "react";
import { parseItem } from "./health-item";
import { parseReport } from "./report";
import { onFileDataChange, readFileData, replaceFileData } from "./store";

/**
 * Keeps the browser's health file and the server's copy together, for a
 * signed-in person who turned the copy on. The browser stays the working copy:
 * nothing here blocks a page, and a failed save just tries again on the next
 * change.
 *
 * Rules, each one a way this could lose someone's records:
 *  - The server copy is replaced as a whole under a version. If another device
 *    got there first the save is refused (409), and the two are MERGED (union by
 *    id, this device wins on the same id) before saving again — never
 *    overwritten.
 *  - A save is skipped when nothing differs from what was last synced, so a
 *    merge that wrote into the browser does not echo back as a save.
 *  - Deleting a record here removes it from the server copy at the next save.
 *    Another device that still has it will bring it back on its next merge. The
 *    file has no tombstones yet; that is the cost of keeping it simple, and the
 *    safe direction (a record reappears rather than vanishes).
 */
type Status = "unknown" | "off" | "on" | "error";

let status: Status = "unknown";
let version = 0;
let lastSynced = "";
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
let running = false;
const listeners = new Set<() => void>();

function setStatus(next: Status) {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l());
}

type Data = ReturnType<typeof readFileData>;
const snapshot = (d: Data) => JSON.stringify(d);

function union<T extends { id: string }>(mine: T[], theirs: T[]): T[] {
  const have = new Set(mine.map((x) => x.id));
  return [...mine, ...theirs.filter((x) => !have.has(x.id))];
}

function clean(raw: { reports?: unknown[]; items?: unknown[] }): Data {
  return {
    reports: (raw.reports ?? []).flatMap((r) => parseReport(r) ?? []),
    items: (raw.items ?? []).flatMap((i) => parseItem(i) ?? []),
  };
}

type Read =
  | { enabled: false }
  | { enabled: true; version: number; data: { reports?: unknown[]; items?: unknown[] } };

async function fetchFile(): Promise<Read | null> {
  try {
    const res = await fetch("/api/file", { cache: "no-store" });
    return res.ok ? ((await res.json()) as Read) : null;
  } catch {
    return null;
  }
}

async function put(data: Data): Promise<"ok" | "conflict" | "error"> {
  try {
    const res = await fetch("/api/file", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version, data }),
    });
    if (res.ok) {
      version = ((await res.json()) as { version: number }).version;
      lastSynced = snapshot(data);
      return "ok";
    }
    return res.status === 409 ? "conflict" : "error";
  } catch {
    return "error";
  }
}

/** Pull the server copy, merge it with this browser's, and save the result. */
async function reconcile() {
  const remote = await fetchFile();
  if (!remote) return setStatus("error");
  if (!remote.enabled) return setStatus("off");
  version = remote.version;
  const mine = readFileData();
  const theirs = clean(remote.data);
  const merged: Data = {
    reports: union(mine.reports, theirs.reports),
    items: union(mine.items, theirs.items),
  };
  if (snapshot(merged) !== snapshot(mine)) replaceFileData(merged);
  const outcome = snapshot(merged) === snapshot(theirs) ? "ok" : await put(merged);
  if (outcome === "ok") {
    lastSynced = snapshot(merged);
    setStatus("on");
  } else if (outcome === "conflict") {
    setStatus("on");
    void reconcile();
  } else setStatus("error");
}

function scheduleSave() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    const now = readFileData();
    if (snapshot(now) === lastSynced) return;
    const outcome = await put(now);
    if (outcome === "conflict") void reconcile();
    else if (outcome === "error") setStatus("error");
  }, 1500);
}

/** Begin syncing for a signed-in person. Safe to call again; it runs once. */
export function startFileSync() {
  if (running) return;
  running = true;
  void reconcile().then(() => {
    unsubscribe = onFileDataChange(() => {
      if (status === "on" || status === "error") scheduleSave();
    });
  });
}

export function stopFileSync() {
  running = false;
  unsubscribe?.();
  unsubscribe = null;
  if (timer) clearTimeout(timer);
  status = "unknown";
  version = 0;
  lastSynced = "";
}

/** Turn the server copy on with what is in this browser. */
export async function enableFileCopy(): Promise<boolean> {
  version = 0;
  const outcome = await put(readFileData());
  if (outcome === "conflict") await reconcile();
  else if (outcome === "ok") setStatus("on");
  else {
    setStatus("error");
    return false;
  }
  startFileSync();
  return status === "on";
}

/** Turn it off and delete the server copy. The browser keeps its own. */
export async function disableFileCopy(): Promise<boolean> {
  try {
    const res = await fetch("/api/file", { method: "DELETE" });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  setStatus("off");
  version = 0;
  lastSynced = "";
  return true;
}

export function useFileCopy(): Status {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => "unknown" as const,
  );
}

/** Ask the server whether the copy is on, without starting a sync. */
export async function checkFileCopy(): Promise<void> {
  if (status !== "unknown") return;
  const remote = await fetchFile();
  setStatus(!remote ? "error" : remote.enabled ? "on" : "off");
}
