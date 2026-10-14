"use client";

import { useEffect } from "react";
import { startFileSync } from "@/lib/file-sync";

/**
 * Mounted only for a signed-in person. If they turned the server copy of their
 * file on (in Account), this keeps it and the browser's copy together; if not,
 * it finds that out and does nothing else.
 */
export function FileSync() {
  useEffect(() => {
    startFileSync();
  }, []);
  return null;
}
