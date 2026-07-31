import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import {
  DocumentError,
  getDocumentByManagementToken,
} from "@/lib/documents/service";
import { DocumentEditor } from "@/components/editor/document-editor";
import { DeleteDocumentButton } from "@/components/manage/delete-document-button";
import {
  MarketingBackdrop,
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { shareUrl } from "@/lib/utils/urls";

export const metadata: Metadata = {
  title: "Dokument verwalten",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ManagePage({ params }: PageProps) {
  const { token } = await params;

  let doc;
  try {
    doc = await getDocumentByManagementToken(token);
  } catch (e) {
    if (e instanceof DocumentError) {
      return (
        <MarketingBackdrop>
          <MarketingHeader />
          <main className="relative z-10 mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
            <div className="rounded-[22px] border border-white/80 bg-white/95 px-8 py-10 shadow-[0_20px_50px_-20px_rgba(15,15,15,0.14)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-stone-900">
              <h1 className="text-[22px] font-semibold tracking-tight">
                Ungültiger Verwaltungslink
              </h1>
              <p className="mt-2 text-[14px] text-stone-500">
                Dieser Link ist ungültig oder das Dokument wurde gelöscht.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex h-9 items-center rounded-full bg-stone-900 px-4 text-[13px] font-medium text-white dark:bg-stone-100 dark:text-stone-900"
              >
                Zur Startseite
              </Link>
            </div>
          </main>
          <MarketingFooter />
        </MarketingBackdrop>
      );
    }
    notFound();
  }

  return (
    <MarketingBackdrop>
      <MarketingHeader />
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Dokument verwalten
            </h1>
            <p className="mt-1 text-[14px] text-stone-500">
              Änderungen speichern, ohne den Share-Link zu ändern.
            </p>
          </div>
          <DeleteDocumentButton token={token} />
        </div>

        <Alert className="mb-6 rounded-2xl border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30">
          <ShieldAlert />
          <AlertTitle>Vertrauliche Seite</AlertTitle>
          <AlertDescription>
            Teilen Sie diesen Verwaltungslink nicht. Wer ihn besitzt, kann das
            Dokument bearbeiten oder löschen.
          </AlertDescription>
        </Alert>

        <div className="rounded-[20px] border border-white/80 bg-white/90 p-4 shadow-[0_12px_40px_-20px_rgba(15,15,15,0.12)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-stone-900/80 sm:p-6">
          <DocumentEditor
            mode="manage"
            managementToken={token}
            publicId={doc.publicId}
            shareUrl={shareUrl(doc.publicId)}
            lastSavedAt={doc.updatedAt}
            initial={{
              title: doc.title,
              description: doc.description ?? "",
              markdownContent: doc.markdownContent,
              visibility: doc.visibility,
              status: doc.status,
              password: "",
              theme: doc.theme,
              contentWidth: doc.contentWidth,
              fontStyle: doc.fontStyle,
              showTableOfContents: doc.showTableOfContents,
              showCodeLineNumbers: doc.showCodeLineNumbers,
            }}
          />
        </div>
      </main>
      <MarketingFooter />
    </MarketingBackdrop>
  );
}
