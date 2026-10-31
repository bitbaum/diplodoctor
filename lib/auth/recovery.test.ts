import { authLabelsFor } from "@bitbaum/accountkit/auth";
import { SignInForm, SignUpForm } from "@bitbaum/accountkit/auth/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signInMethods } from "@/lib/auth/methods";
import { mailConfigured, sendAuthMail } from "@/lib/mail";

/**
 * Password recovery and the sign-in link exist only when mail can reach the
 * person. Both states, as the sign-in and sign-up pages compute them in
 * production: no mail env, nothing advertised; RESEND_API_KEY set, both shown.
 */
const labels = authLabelsFor("de");
const forgot = labels.recovery!.forgot;
const stubClient = {
  signIn: { email: vi.fn(), magicLink: vi.fn(), passkey: vi.fn() },
  signUp: { email: vi.fn() },
  resetPassword: vi.fn(),
  requestPasswordReset: vi.fn(),
} as never;

function pages() {
  const methods = signInMethods(process.env, mailConfigured());
  const signIn = renderToStaticMarkup(
    createElement(SignInForm, {
      client: stubClient,
      methods,
      labels,
      next: "/de/account",
      signInPath: "/de/sign-in",
      signUpLink: null,
    }),
  );
  const signUp = renderToStaticMarkup(
    createElement(SignUpForm, {
      client: stubClient,
      methods,
      labels,
      next: "/de/account",
      signUpPath: "/de/sign-up",
      signInLink: null,
    }),
  );
  return { methods, signIn, signUp };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("account mail not configured (no mail env on the box)", () => {
  it("offers no recovery and no sign-in link", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM", "");
    const { methods, signIn, signUp } = pages();
    expect(mailConfigured()).toBe(false);
    expect(methods).toMatchObject({ passwordReset: false, magicLink: false, verifyEmail: false });
    expect(signIn).toContain(labels.signIn);
    expect(signIn).not.toContain(forgot);
    expect(signIn).not.toContain(labels.withLink);
    expect(signUp).not.toContain(labels.signUpWithLink);
  });

  it("treats a placeholder key as not configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_placeholder");
    expect(mailConfigured()).toBe(false);
    expect(pages().signIn).not.toContain(forgot);
  });

  it("sends nothing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await sendAuthMail("reset", "person@example.ch", "https://diplodoctor.orangecat.ch/x");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("account mail configured (RESEND_API_KEY on the box)", () => {
  it("offers forgot password and the sign-in link", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_unit_test_not_a_key");
    const { methods, signIn, signUp } = pages();
    expect(mailConfigured()).toBe(true);
    expect(methods).toMatchObject({ passwordReset: true, magicLink: true, verifyEmail: true });
    expect(signIn).toContain(forgot);
    expect(signIn).toContain(labels.withLink);
    expect(signUp).toContain(labels.signUpWithLink);
  });

  it("sends the reset link through mail-kit, in the language of the page", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_unit_test_not_a_key");
    vi.stubEnv("RESEND_FROM", "");
    const fetch = vi.fn(async () => Response.json({ id: "m_1" }));
    vi.stubGlobal("fetch", fetch);
    const link =
      "https://diplodoctor.orangecat.ch/api/auth/reset-password/tok?callbackURL=%2Fde%2Fsign-in";
    await sendAuthMail("reset", "person@example.ch", link);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(String(init.body)) as { to: unknown; from: string; text: string };
    expect(body.to).toEqual(expect.arrayContaining(["person@example.ch"]));
    expect(body.from).toBe("Diplodoctor <diplodoctor@fleetcrown.orangecat.ch>");
    expect(body.text).toContain(link);
  });

  it("never mails an address that cannot receive mail", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_unit_test_not_a_key");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await sendAuthMail("reset", "abc@orangecat.invalid", "https://diplodoctor.orangecat.ch/x");
    expect(fetch).not.toHaveBeenCalled();
  });
});
