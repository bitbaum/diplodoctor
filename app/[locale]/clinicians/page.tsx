import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { btnPrimary, card, eyebrow, link, shell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { EXTERNAL, ROUTES } from "@/lib/routes";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Clinicians" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * NOBODY IS LISTED HERE YET, AND THE PAGE SAYS SO.
 *
 * A health site that fills this space with invented doctors, ratings and
 * response times is not a demo, it is a person with a result they are afraid of
 * trying to book someone who does not exist. So: the rules, the roles, what a
 * clinic would get, and where to list yourself — and profiles only when there
 * are real ones.
 *
 * WHERE A CLINICIAN LIVES. Fleet STACK.md, "Identity": if an app needs
 * profiles, payments or a public presence, those live at OrangeCat, and
 * rebuilding them here is the same mistake in a different repo. A clinician is
 * an OrangeCat actor offering a service, paid there by the person they helped.
 * What Diplodoctor adds on top — the label, and checking a licence — is not
 * built yet, and the page says that too.
 */
const ROLES = ["clinician", "assistant"] as const;
const RULES = ["label", "pseudonym", "share", "place"] as const;
const DOES = ["does1", "does2", "does3"] as const;
const CLINIC = ["c1", "c2", "c3"] as const;

export default async function CliniciansPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(toLocale(locale));
  const t = await getTranslations("Clinicians");
  const inlineLink = `${link} inline-flex min-h-11 items-center`;

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <p className={eyebrow}>{t("eyebrow")}</p>
      <h1 className="mt-4 max-w-[22ch] headline text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-5 max-w-prose text-lg leading-relaxed text-fg-secondary">{t("lead")}</p>

      <div className="mt-8 rounded-control border border-accent px-5 py-4">
        <p className="font-medium">{t("noneTitle")}</p>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-fg-secondary">{t("noneBody")}</p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {ROLES.map((role) => (
          <article key={role} className={`${card} sm:p-8`}>
            <h2 className="text-2xl font-semibold tracking-tight">{t(`${role}.name`)}</h2>
            <p className="mt-1 font-mono text-xs uppercase tracking-caps text-fg-secondary">
              {t("listedUnder", { identity: t(`${role}.identity`) })}
            </p>
            <ul className="mt-5 grid list-disc gap-2 pl-5 text-sm leading-relaxed">
              {DOES.map((d) => (
                <li key={d}>{t(`${role}.${d}`)}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-fg-secondary">{t(`${role}.doesNot`)}</p>
            <p className="mt-4 border-t border-border-subtle pt-4 text-sm leading-relaxed text-fg-secondary">
              {t(`${role}.checks`)}
            </p>
          </article>
        ))}
      </div>

      <section className={`${card} mt-5 sm:p-8`}>
        <h2 className="text-2xl font-semibold tracking-tight">{t("wantTitle")}</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-secondary">{t("wantBody")}</p>
        <p className="mt-3 flex flex-wrap gap-x-8">
          <a href={EXTERNAL.orangecatOfferService} className={inlineLink}>
            {t("offer")}
          </a>
          <Link href={ROUTES.roadmap} className={inlineLink}>
            {t("seeRoadmap")}
          </Link>
        </p>
      </section>

      <section className="mt-16">
        <p className={eyebrow}>{t("clinic.eyebrow")}</p>
        <h2 className="mt-3 headline text-3xl">{t("clinic.title")}</h2>
        <p className="mt-4 max-w-prose leading-relaxed text-fg-secondary">{t("clinic.lead")}</p>
        <ul className="mt-6 grid max-w-prose list-disc gap-2 pl-5 text-sm leading-relaxed">
          {CLINIC.map((c) => (
            <li key={c}>{t(`clinic.${c}`)}</li>
          ))}
        </ul>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-secondary">{t("clinic.status")}</p>
      </section>

      <section className="mt-16">
        <h2 className="headline text-3xl">{t("rulesTitle")}</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {RULES.map((rule) => (
            <div key={rule}>
              <dt className="text-lg font-semibold tracking-tight">{t(`rules.${rule}.title`)}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-fg-secondary">{t(`rules.${rule}.body`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-14">
        <Link href={ROUTES.newReport} className={btnPrimary}>
          {t("start")} <span aria-hidden="true">&rarr;</span>
        </Link>
      </p>
    </main>
  );
}
