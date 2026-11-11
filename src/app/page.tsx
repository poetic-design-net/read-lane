import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: `${appConfig.name} · ${appConfig.tagline}`,
  description: appConfig.description,
  openGraph: {
    title: `${appConfig.name} · ${appConfig.tagline}`,
    description: appConfig.description,
  },
};

/** Landing page of the app host and of branded custom domains. */
export default function HomePage() {
  return <LandingPage />;
}
