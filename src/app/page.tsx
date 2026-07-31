import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";
import { appConfig } from "@/lib/config";

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
 */
export default function HomePage() {
  return <LandingPage />;
}
