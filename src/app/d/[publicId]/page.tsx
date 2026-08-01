import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  DocumentError,
  getPublicDocumentView,
} from "@/lib/documents/service";
import { hasUnlockSession } from "@/lib/security/session";
import { renderMarkdown } from "@/lib/markdown/render";
import { TableOfContents } from "@/components/markdown/toc";
import { PasswordForm } from "@/components/document/password-form";
import { DocumentToolbar } from "@/components/document/document-toolbar";
import { FormatView } from "@/components/document/format-view";
import { StatusPill, statusFromDocument } from "@/components/design/status-pill";
import { Logo } from "@/components/brand/logo";
import { appConfig } from "@/lib/config";
import { brandConfig } from "@/lib/brand/config";
import { shareUrl } from "@/lib/utils/urls";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { getStorage } from "@/lib/storage";

/** Password sessions and visibility checks must never be statically cached. */
export const dynamic = "force-dynamic";

/** Signed file links stay valid only for the duration of a visit. */
const FILE_URL_TTL_SECONDS = 900;

interface PageProps {
  params: Promise<{ publicId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  try {
    const { document, requiresPassword } =
      await getPublicDocumentView(publicId);

    if (requiresPassword || document.visibility === "unlisted") {
      return {
        title: "Geschütztes Dokument",
        description: "Dieses Dokument ist nicht öffentlich indexierbar.",
        robots: { index: false, follow: false },
      };
    }

    return {
      title: document.title,
      description: document.description ?? undefined,
      alternates: { canonical: shareUrl(publicId) },
      openGraph: {
        title: document.title,
        description: document.description ?? appConfig.description,
        url: shareUrl(publicId),
        type: "article",
      },
      robots:
        document.visibility === "public"
          ? { index: true, follow: true }
          : { index: false, follow: false },
    };
  } catch {
    return {
      title: "Dokument nicht gefunden",
      robots: { index: false, follow: false },
    };
  }
}

export default async function DocumentPage({ params }: PageProps) {
  const { publicId } = await params;

  let view;
  try {
    view = await getPublicDocumentView(publicId);
  } catch (e) {
    if (e instanceof DocumentError) {
      if (e.code === "EXPIRED") {
        return (
          <DocShell>
            <ErrorState
              title="Dokument abgelaufen"
              message="Dieses Dokument ist nicht mehr verfügbar."
            />
          </DocShell>
        );
      }
      if (e.code === "ARCHIVED") {
        return (
          <DocShell>
            <ErrorState
              title="Dokument archiviert"
              message="Dieses Dokument ist nicht mehr öffentlich erreichbar."
            />
          </DocShell>
        );
      }
    }
    notFound();
  }

  const { document, requiresPassword } = view;
  const unlocked = requiresPassword
    ? await hasUnlockSession(publicId)
    : true;

  if (requiresPassword && !unlocked) {
    return (
      <DocShell theme={document.theme}>
        <DocChrome shareUrl={shareUrl(publicId)} minimal />
        <div className="flex flex-1 items-center justify-center bg-[#f6f5f3] px-4 dark:bg-stone-900/40">
          <PasswordForm publicId={publicId} title={document.title} />
        </div>
      </DocShell>
    );
  }

  const isMarkdown = document.rendererType === "markdown";
  const { html, toc } = isMarkdown
    ? await renderMarkdown(document.markdownContent, {
        showLineNumbers: document.showCodeLineNumbers,
      })
    : { html: "", toc: [] as { id: string; text: string; level: number }[] };

  // Binary formats live in object storage. The page is force-dynamic, so every
  // visit mints a fresh short-lived URL instead of exposing a permanent one.
  const fileUrl = view.raw.originalFileKey
    ? await getStorage().getSignedReadUrl(
        view.raw.originalFileKey,
        FILE_URL_TTL_SECONDS
      )
    : null;
  const downloadUrl =
    fileUrl && document.allowDownload ? `${fileUrl}&download=1` : null;

  const statusKind = statusFromDocument({
    status: document.status,
    visibility: document.visibility,
    isPasswordProtected: document.isPasswordProtected,
  });

  return (
    <DocShell theme={document.theme}>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-stone-200/80 bg-white px-4 sm:px-6 dark:border-stone-800 dark:bg-stone-950">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Logo variant="mark" size="md" />
            <span className="hidden text-[13px] font-medium text-stone-500 sm:inline">
              {appConfig.name}
            </span>
          </Link>

          <span className="hidden h-4 w-px bg-stone-200 sm:block dark:bg-stone-700" />
          <span className="truncate text-[13px] font-medium text-stone-700 dark:text-stone-200">
            {document.title}
          </span>
          <StatusPill kind={statusKind} />
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-[12px] text-stone-400 md:block">
            {format(document.updatedAt, "d. MMMM yyyy", { locale: de })}
          </p>
          <DocumentToolbar shareUrl={shareUrl(publicId)} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {document.showTableOfContents && toc.length > 0 && (
          <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-stone-200/80 bg-[#fafaf9] p-5 dark:border-stone-800 dark:bg-stone-900/40 lg:block xl:w-64">
            <div className="sticky top-4">
              <TableOfContents items={toc} />
            </div>
          </aside>
        )}

        <article className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10 sm:py-12 lg:max-w-4xl lg:px-14">
            {document.showTableOfContents && toc.length > 0 && (
              <TableOfContents items={toc} className="mb-8 lg:hidden" />
            )}

            <header className="mb-8">
              <h1 className="text-[2.25rem] font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-50 sm:text-[2.5rem]">
                {document.title}
              </h1>
              {document.description && (
                <p className="mt-3 text-[17px] leading-relaxed text-stone-500">
                  {document.description}
                </p>
              )}
              <p className="mt-4 text-[13px] text-stone-400 md:hidden">
                Aktualisiert{" "}
                {format(document.updatedAt, "d. MMMM yyyy", { locale: de })}
              </p>
            </header>

            <FormatView
              content={document.markdownContent}
              rendererType={document.rendererType}
              fileExtension={document.fileExtension}
              sourceFilename={document.sourceFilename}
              html={isMarkdown ? html : undefined}
              showLineNumbers={document.showCodeLineNumbers}
              fileUrl={fileUrl}
              downloadUrl={downloadUrl}
              allowDownload={document.allowDownload}
            />

            <footer className="mt-16 border-t border-stone-100 pt-6 text-[12px] text-stone-400 dark:border-stone-800">
              Geteilt mit{" "}
              <Link
                href="/"
                className="font-medium text-stone-500 hover:text-stone-700"
              >
                {brandConfig.name}
              </Link>
              {" · "}
              {brandConfig.tagline}
            </footer>
          </div>
        </article>
      </div>
    </DocShell>
  );
}

function DocChrome({
  shareUrl: url,
  minimal = false,
}: {
  shareUrl: string;
  minimal?: boolean;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-stone-200/80 bg-white px-4 sm:px-6 dark:border-stone-800">
      <Link href="/" className="inline-flex items-center gap-2.5">
        <Logo variant="full" size="sm" />
      </Link>

      {!minimal && <DocumentToolbar shareUrl={url} />}
    </header>
  );
}

function DocShell({
  children,
  theme = "system",
}: {
  children: React.ReactNode;
  theme?: "light" | "dark" | "system";
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={theme}
      enableSystem={theme === "system"}
      forcedTheme={theme === "system" ? undefined : theme}
    >
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        {children}
      </div>
    </ThemeProvider>
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <>
      <DocChrome shareUrl={appConfig.url} minimal />
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-[24px] font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {title}
        </h1>
        <p className="mt-2 max-w-md text-[15px] text-stone-500">{message}</p>
        <Link
          href="/register"
          className="mt-6 inline-flex h-10 items-center rounded-full bg-stone-900 px-5 text-[13px] font-medium text-white dark:bg-stone-100 dark:text-stone-900"
        >
          Free-Konto erstellen
        </Link>
      </div>
    </>
  );
}
