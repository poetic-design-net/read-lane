/**
 * Central application configuration.
 * Brand: Readlane (CI: Publish beautifully)
 *
 * Palette: #F7F7F5 · #E5E7EB · #6B7C93 · #2B313B · #121417
 * Assets: /public/brand/ · src/components/brand/logo.tsx
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Readlane",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ??
    "Markdown schön teilen. Datei hochladen, Darstellung auswählen und einen öffentlichen oder passwortgeschützten Link versenden.",
  tagline: "Publish beautifully",
  claim: "Files in. Beautiful pages out.",
  brandClaim: "Publish beautifully",
  /** App host — dashboard, create, share links (e.g. https://app.readlane.io) */
  url: stripTrailingSlash(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  /** Marketing site (e.g. https://readlane.io). Defaults to app URL in local dev. */
  marketingUrl: stripTrailingSlash(
    process.env.NEXT_PUBLIC_MARKETING_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000"
  ),
  cliName: process.env.NEXT_PUBLIC_CLI_NAME ?? "readlane",
  cliPackage: process.env.NEXT_PUBLIC_CLI_PACKAGE ?? "@readlane/cli",


  maxFileSizeBytes: 2 * 1024 * 1024,
  allowedExtensions: [".md", ".markdown", ".txt"] as const,
  allowedMimeTypes: [
    "text/markdown",
    "text/plain",
    "text/x-markdown",
    "application/octet-stream",
  ] as const,

  publicIdLength: 12,
  managementTokenLength: 32,
  projectPublicIdLength: 10,
  cliTokenLength: 40,

  bcryptRounds: 12,

  unlockSessionTtlSeconds: 60 * 60 * 4,
  sessionTtlSeconds: 60 * 60 * 24 * 14,
  magicLinkTtlSeconds: 60 * 15,
  passwordResetTtlSeconds: 60 * 60,
  deviceCodeTtlSeconds: 60 * 15,
  managementUrlTtlSeconds: 60 * 15,
  cliTokenDefaultTtlDays: 365,

  maxVersionsPerDocument: Number(process.env.MAX_VERSIONS_PER_DOCUMENT ?? 50),

  rateLimit: {
    publish: { windowMs: 60_000, max: 10 },
    password: { windowMs: 15 * 60_000, max: 10 },
    manage: { windowMs: 60_000, max: 30 },
    auth: { windowMs: 15 * 60_000, max: 20 },
    api: { windowMs: 60_000, max: 120 },
    cliDevice: { windowMs: 60_000, max: 10 },
  },

  limits: {
    titleMax: 200,
    descriptionMax: 500,
    markdownMax: 2 * 1024 * 1024,
    passwordMin: 4,
    passwordMax: 128,
    projectNameMax: 100,
    emailMax: 254,
  },

  legal: {
    privacy: {
      title: "Datenschutz",
      lastUpdated: "2026-01-01",
      sections: [
        {
          heading: "Verantwortlicher",
          body: "Platzhalter: Bitte Name und Kontaktdaten des Verantwortlichen hier eintragen.",
        },
        {
          heading: "Erhobene Daten",
          body: "Readlane speichert Kontodaten (E-Mail, Passwort-Hash), Projekte, Dokumentinhalte und CLI-Token-Metadaten. Es werden keine Tracking-Cookies und kein Analytics eingesetzt.",

        },
        {
          heading: "Speicherdauer",
          body: "Dokumente und Konten werden bis zur Löschung durch den Benutzer oder bis zum Ablauf einer optionalen Dokument-Ablaufzeit gespeichert.",
        },
        {
          heading: "Ihre Rechte",
          body: "Sie können Ihre Dokumente, Projekte und Ihr Konto jederzeit in der Web-App verwalten oder löschen.",
        },
      ],
    },
    imprint: {
      title: "Impressum",
      sections: [
        {
          heading: "Angaben gemäß § 5 TMG",
          body: "Platzhalter: Name / Firma\nStraße Hausnummer\nPLZ Ort\nDeutschland",
        },
        {
          heading: "Kontakt",
          body: "E-Mail: kontakt@example.com",
        },
        {
          heading: "Haftung für Inhalte",
          body: "Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.",
        },
      ],
    },
  },
} as const;

export type AppConfig = typeof appConfig;
