import { createAuthRuntime } from "@bitbaum/accountkit/auth/next";
import { getDb, isDatabaseConfigured, schema } from "@/lib/db/client";
import { mailConfigured, sendAuthMail } from "@/lib/mail";
import { SITE } from "@/lib/site";

/** Shared account lifecycle over the existing tables; no identity or data migration. */
export const { GET, POST, getAuth, authStatus, getSession, requireUser } = createAuthRuntime({
  site: SITE,
  getDatabase: getDb,
  isDatabaseConfigured,
  schema: {
    user: schema.user,
    session: schema.session,
    account: schema.account,
    verification: schema.verification,
    passkey: schema.passkey,
    twoFactor: schema.twoFactor,
  },
  mail: {
    get configured() {
      return mailConfigured();
    },
    send: sendAuthMail,
  },
});

export type Auth = ReturnType<typeof getAuth>;
export type { AuthStatus } from "@bitbaum/accountkit/auth/server";
export { oidcProvider } from "@bitbaum/accountkit/auth/server";
