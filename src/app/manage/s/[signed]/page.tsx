import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySignedManagementToken } from "@/lib/security/auth-session";
import { getDocumentByPublicId } from "@/lib/documents/service";
import { DocumentEditor } from "@/components/editor/document-editor";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { shareUrl } from "@/lib/utils/urls";

export const metadata: Metadata = {
  title: "Dokument verwalten",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ signed: string }>;
}

export default async function SignedManagePage({ params }: PageProps) {
  const { signed } = await params;
  const payload = await verifySignedManagementToken(signed);
  if (!payload) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-lg flex-1 px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Link abgelaufen</h1>
          <p className="mt-2 text-muted-foreground">
            Diese kurzlebige Verwaltungs-URL ist ungültig oder abgelaufen.
          </p>
          <Link href="/dashboard" className="mt-6 inline-block text-sm underline">
            Zum Dashboard
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  const doc = await getDocumentByPublicId(payload.publicId);
  if (!doc || doc.createdBy !== payload.userId) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          {doc.title}
        </h1>
        <DocumentEditor
          mode="dashboard"
          publicId={doc.publicId}
          shareUrl={shareUrl(doc.publicId)}
          lastSavedAt={doc.updatedAt}
          initial={{
            title: doc.title,
            description: doc.description ?? "",
            markdownContent: doc.markdownContent,
            visibility: doc.visibility,
            status: doc.status,
            theme: doc.theme,
            contentWidth: doc.contentWidth,
            fontStyle: doc.fontStyle,
            showTableOfContents: doc.showTableOfContents,
            showCodeLineNumbers: doc.showCodeLineNumbers,
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
