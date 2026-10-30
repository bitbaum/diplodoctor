#!/usr/bin/env node
// The unconfigured half of account recovery, in a real browser against the
// built app: with no mail env, the sign-in page must not offer "Forgot your
// password?" or a sign-in link, and the sign-up page no link either. Mail that
// can never arrive is a promise the page cannot keep.
//
// The configured half (a reset mail is sent, its link resets the password) is
// the fleet's shared account journey in browser-smoke.yml, which runs with a
// captured mail transport, and lib/auth/auth.integration.test.ts.
//
//   pnpm run build && DATABASE_URL=… node scripts/check-recovery-hidden.mjs
//
// BROWSER_EXECUTABLE picks a Chrome; without it Playwright's own is used.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { authLabelsFor } from "@bitbaum/accountkit/auth";
import { chromium } from "playwright";

// A free port, so a dev server already running here cannot answer for this one.
const port = await new Promise((done) => {
  const probe = createServer().listen(0, "127.0.0.1", () => {
    const { port: free } = probe.address();
    probe.close(() => done(String(free)));
  });
});
const base = `http://127.0.0.1:${port}`;
assert.ok(process.env.DATABASE_URL, "DATABASE_URL must point at a test database");

const env = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_PUBLIC_SITE_URL: base,
  BETTER_AUTH_SECRET: randomBytes(48).toString("base64"),
};
// The state under test: no mail env at all.
for (const key of Object.keys(env)) if (/^(RESEND_|MAIL_)/.test(key)) delete env[key];

const server = spawn("pnpm", ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", port], {
  env,
  detached: true,
  stdio: ["ignore", "inherit", "inherit"],
});

let browser;
try {
  let ready = false;
  for (let i = 0; i < 120 && !ready; i += 1) {
    if (server.exitCode !== null) throw new Error("the app exited before it was ready");
    ready = await fetch(`${base}/api/health`).then(
      (r) => r.status < 500,
      () => false,
    );
    if (!ready) await new Promise((done) => setTimeout(done, 500));
  }
  assert.ok(ready, "the app must start");

  const health = await (await fetch(`${base}/api/health`)).json();
  assert.equal(health.mail, false, "health reports mail as not configured");

  browser = await chromium.launch({
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  for (const locale of ["de", "en"]) {
    const labels = authLabelsFor(locale);

    await page.goto(`${base}/${locale}/sign-in`, { waitUntil: "networkidle" });
    // The form itself is there (accounts are up), so an absent link means hidden, not broken.
    await page.locator('input[autocomplete="current-password"]').waitFor();
    await page.getByRole("button", { name: labels.signIn, exact: true }).waitFor();
    assert.equal(
      await page.getByText(labels.recovery.forgot, { exact: true }).count(),
      0,
      `/${locale}/sign-in offers no "${labels.recovery.forgot}" without mail`,
    );
    assert.equal(
      await page.getByText(labels.withLink, { exact: true }).count(),
      0,
      `/${locale}/sign-in offers no sign-in link without mail`,
    );

    await page.goto(`${base}/${locale}/sign-up`, { waitUntil: "networkidle" });
    await page.locator('input[type="password"]').first().waitFor();
    assert.equal(
      await page.getByText(labels.signUpWithLink, { exact: true }).count(),
      0,
      `/${locale}/sign-up offers no sign-in link without mail`,
    );
  }

  // And the endpoints behind them are off, not merely unadvertised.
  const reset = await fetch(`${base}/api/auth/request-password-reset`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ email: "nobody@example.test", redirectTo: "/de/sign-in" }),
  });
  assert.notEqual(reset.status, 200, "a reset cannot be requested without mail");
  const link = await fetch(`${base}/api/auth/sign-in/magic-link`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ email: "nobody@example.test", callbackURL: "/de/account" }),
  });
  assert.equal(link.status, 404, "the sign-in link endpoint does not exist without mail");

  process.stdout.write("PASS no mail env: no forgot-password, no sign-in link, endpoints off\n");
} finally {
  if (browser) await browser.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* already gone */
  }
}
