import { redirect } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { ROUTES } from "@/lib/routes";

/** The list of reports moved into Records, which holds everything in the file. */
export default async function ReportsRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale);
  return redirect({ href: `${ROUTES.records}?kind=report`, locale });
}
