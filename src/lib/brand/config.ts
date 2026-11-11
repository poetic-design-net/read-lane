/**
 * Central branding — swap assets in /public/brand without code changes.
 */
export const brandConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Poetic Design Notes",
  shortName: process.env.NEXT_PUBLIC_APP_NAME ?? "Poetic Design Notes",
  tagline: "Notizen, die man gern liest",
  claimEn: "Notes · Poetic Design",
  claimDe: "Aus Dateien werden schöne Seiten.",
  heroHeadlineDe: "Statt langer Mails: eine Seite, die man gern liest.",
  heroSubDe:
    "Updates, Konzepte und Angebote als ruhig gesetzte Seite, verschickt mit einem einzigen Link.",
  logoLight: "/brand/poetic-feather.png",
  logoDark: "/brand/poetic-feather.png",
  symbolLight: "/brand/poetic-feather.png",
  symbolDark: "/brand/poetic-feather.png",
  favicon: "/brand/favicon-32.png",
} as const;
