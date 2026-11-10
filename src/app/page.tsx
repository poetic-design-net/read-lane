import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";
import { appConfig } from "@/lib/config";
import { getVerifiedDomainByHost } from "@/lib/domains/service";

export const metadata: Metadata = {
  title: `${appConfig.name} · ${appConfig.tagline}`,
  description: appConfig.description,
  openGraph: {
    title: `${appConfig.name} · ${appConfig.tagline}`,
    description: appConfig.description,
    images: [{ url: "/marketing/product-hero.jpg" }],
  },
};

/**
 * Marketing landing — readlane.io
 * Product app lives on app.readlane.io (/create, /dashboard, …).
 * On a verified custom domain the bare host goes to the owner's website.
 */
export default async function HomePage() {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  if (host && host !== new URL(appConfig.url).hostname && host.includes(".")) {
    const domain = await getVerifiedDomainByHost(host);
    if (domain?.brandWebsiteUrl) redirect(domain.brandWebsiteUrl);
  }
  return <LandingPage />;
}
