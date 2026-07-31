/**
 * Central branding — swap assets in /public/brand without code changes.
 */
export const brandConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Readlane",
  shortName: process.env.NEXT_PUBLIC_APP_NAME ?? "Readlane",
  tagline: "Publish beautifully",
  claimEn: "Files in. Beautiful pages out.",
  claimDe: "Aus Dateien werden schöne Seiten.",
  heroHeadlineDe: "Dokumente schön teilen.",
  heroSubDe:
    "Markdown, PDF, Text, Code und weitere Formate hochladen, professionell darstellen und sicher per Link teilen.",
  logoLight: "/brand/logo-symbol.png",
  logoDark: "/brand/logo-symbol.png",
  symbolLight: "/brand/logo-symbol.avif",
  symbolDark: "/brand/logo-symbol.avif",
  favicon: "/brand/favicon-32.png",
} as const;
