"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { button, buttonQuiet, card, errorText } from "@/components/ui";
import { checkFileCopy, disableFileCopy, enableFileCopy, useFileCopy } from "@/lib/file-sync";

/**
 * The one switch for keeping the health file in the account. Off by default,
 * and the words say what turning it on means, including that until keys only
 * the owner holds exist, we could technically read it.
 */
export function FilePanel() {
  const t = useTranslations("Account.file");
  const status = useFileCopy();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void checkFileCopy();
  }, []);

  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    setFailed(false);
    const ok = await action();
    setFailed(!ok);
    setBusy(false);
  }

  return (
    <section className={`${card} grid gap-3`} aria-labelledby="file-title">
      <h2 id="file-title" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <p className="text-sm text-fg-secondary">{t("body")}</p>
      {status === "on" ? (
        <>
          <p className="text-sm">{t("on")}</p>
          <div>
            <button className={buttonQuiet} disabled={busy} onClick={() => run(disableFileCopy)}>
              {t("turnOff")}
            </button>
          </div>
        </>
      ) : (
        <div>
          <button
            className={button}
            disabled={busy || status === "unknown"}
            onClick={() => run(enableFileCopy)}
          >
            {t("turnOn")}
          </button>
        </div>
      )}
      {(failed || status === "error") && (
        <p role="alert" className={errorText}>
          {t("error")}
        </p>
      )}
    </section>
  );
}
