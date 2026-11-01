"use client";

import {
  ChatScreen,
  ChatStarters,
  ChatThread,
  Composer,
  type ChatMessageData,
} from "@bitbaum/chatkit/react";
import "@bitbaum/chatkit/styles.css";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { btnPrimary, card, shell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { buildFileContext } from "@/lib/file-context";
import { applyRedactions, assignTokens, findPersonalData, restore } from "@/lib/redact";
import { API, ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import { useHydrated, useItems, useOwnModel, useOwnWords, useReports } from "@/lib/store";

const ERRORS = new Set(["not_configured", "busy"]);

/**
 * Ask about your own file, in the fleet's one chat (chatkit), as the whole
 * display: the conversation fills the screen under the site header, the title
 * and the composer float over it (ChatScreen, as Loki and Solon do). The file
 * is turned into text here, run through the same redaction as a report, and
 * sent with the conversation; the answer comes back with the placeholders put
 * back so it reads as it should. Nothing is kept on the server, and the thread
 * itself lives only in this tab: leave and it is gone, which for health
 * questions is the right default.
 */
export default function AskPage() {
  const t = useTranslations("Ask");
  const locale = useLocale();
  const reports = useReports();
  const items = useItems();
  const ownModel = useOwnModel();
  const ownWords = useOwnWords();
  const hydrated = useHydrated();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [sending, setSending] = useState(false);
  const counter = useRef(0);
  const abort = useRef<AbortController | null>(null);

  const empty = reports.length === 0 && items.length === 0;

  async function ask(history: ChatMessageData[]): Promise<ChatMessageData> {
    const id = `a${++counter.current}`;
    const raw = buildFileContext(reports, items);
    const typed = history.map((m) => m.content).join("\n");
    // One set of placeholders for the file AND the questions, so a name typed
    // in a question is hidden the same way as the one in a report.
    const redactions = assignTokens(findPersonalData(`${raw}\n${typed}`, ownWords));
    abort.current = new AbortController();
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.current.signal,
        body: JSON.stringify({
          messages: history.map((m) => ({
            role: m.role,
            content: applyRedactions(m.content, redactions),
          })),
          context: applyRedactions(raw, redactions),
          locale,
          byok: ownModel ?? undefined,
        }),
      });
      if (!res.ok) {
        const code = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "";
        const key = res.status === 429 ? "rate" : ERRORS.has(code) ? code : "generic";
        return { id, role: "assistant", content: t(`errors.${key}`), failed: true };
      }
      // The server has already taken the replies block out of the text; a
      // reply is a thing the person may send next, so it gets its names back too.
      const { text, replies } = (await res.json()) as { text: string; replies?: string[] };
      return {
        id,
        role: "assistant",
        content: restore(text, redactions),
        replies: (replies ?? []).map((r) => restore(r, redactions)),
      };
    } catch (error) {
      if ((error as Error).name === "AbortError")
        return { id, role: "assistant", content: "", failed: true };
      return { id, role: "assistant", content: t("errors.generic"), failed: true };
    }
  }

  async function run(history: ChatMessageData[]) {
    setMessages(history);
    setSending(true);
    const answer = await ask(history);
    setSending(false);
    setMessages([...history, answer]);
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || sending) return false;
    const base = messages.filter((m) => !m.failed);
    void run([...base, { id: `u${++counter.current}`, role: "user", content: clean }]);
    return true;
  }

  function retry() {
    const base = messages.filter((m) => !m.failed);
    if (base.length) void run(base);
  }

  if (hydrated && empty) {
    return (
      <main className={`${shell} py-10 sm:py-14`}>
        <h1 className="headline text-4xl sm:text-5xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-fg-secondary">{t("subtitle")}</p>
        <div className={`${card} mt-10 sm:p-8`}>
          <h2 className="text-2xl font-semibold tracking-tight">{t("empty.title")}</h2>
          <p className="mt-2 max-w-prose text-fg-secondary">{t("empty.body")}</p>
          <p className="mt-4">
            <Link href={ROUTES.addRecord} className={btnPrimary}>
              {t("empty.cta")}
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <ChatScreen
        fill="viewport"
        className="ask-screen"
        // The site header already holds the way home, so the floating row is
        // the page's name alone, as one frosted pill over the words.
        header={<h1 className="ck-glass ask-title">{t("title")}</h1>}
        composer={
          <Composer
            onSend={(text) => send(text)}
            placeholder={t("placeholder")}
            sending={sending}
            onStop={() => abort.current?.abort()}
            // Records until the person presses done; /api/transcribe writes
            // it down, and the words land in the box to edit before sending.
            voice={{ transcribeUrl: API.transcribe, prefer: "server" }}
            labels={{ ...t.raw("composer") }}
          />
        }
        footnote={t("disclaimer")}
      >
        <ChatThread
          messages={messages}
          live={sending ? { status: t("thread.working") } : null}
          onStop={() => abort.current?.abort()}
          onRetry={retry}
          onReply={send}
          share={{ title: SITE.title }}
          labels={{ ...t.raw("thread") }}
          empty={
            <ChatStarters
              starters={[t("starters.s1"), t("starters.s2"), t("starters.s3")]}
              onPick={send}
            />
          }
        />
      </ChatScreen>
    </main>
  );
}
