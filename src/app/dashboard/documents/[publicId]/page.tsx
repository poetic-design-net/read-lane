import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { requireUser } from "@/lib/auth/service";
import {
  getDocumentByPublicId,
  listVersions,
} from "@/lib/documents/service";
import { listProjectsForUser } from "@/lib/projects/service";
import { DocumentEditor } from "@/components/editor/document-editor";
import { AppShell } from "@/components/layout/app-shell";
import { shareUrl } from "@/lib/utils/urls";
import { VersionHistory } from "@/components/dashboard/version-history";
import { StatusPill, statusFromDocument } from "@/components/design/status-pill";
import { CopyButton } from "@/components/editor/copy-button";

interface PageProps {
  params: Promise<{ publicId: string }>;
}

export default async function DashboardDocumentPage({ params }: PageProps) {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const { publicId } = await params;
  const doc = await getDocumentByPublicId(publicId);
  if (!doc || doc.createdBy !== user.id) notFound();

  const [versions, projects] = await Promise.all([
    listVersions(doc.id),
    listProjectsForUser(user.id),
  ]);

  return (
    <AppShell projects={projects} user={user} title={doc.title}>
      <div className="p-6 sm:p-8 lg:p-10">
        <p className="mb-2 text-[12px] text-stone-400">
          <Link href="/dashboard" className="hover:text-stone-600">
            Dashboard
          </Link>{" "}
          / Dokument
        </p>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-stone-900 dark:text-stone-50 sm:text-[32px]">
                {doc.title}
              </h1>
              <StatusPill
                kind={statusFromDocument({
                  status: doc.status,
                  visibility: doc.visibility,
                  isPasswordProtected: Boolean(doc.passwordHash),
                })}
              />
            </div>
            <p className="mt-1 text-[13px] text-stone-400">
              Version {doc.version} · aktualisiert{" "}
              {format(doc.updatedAt, "dd.MM.yyyy HH:mm", { locale: de })}
            </p>
          </div>
          {doc.status === "published" && (
            <CopyButton value={shareUrl(doc.publicId)} label="Share-Link" />
          )}
        </div>

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

        <div className="mt-10">
          <VersionHistory publicId={doc.publicId} versions={versions} />
        </div>
      </div>
    </AppShell>
  );
}
