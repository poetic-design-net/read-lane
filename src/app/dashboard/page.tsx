import { redirect } from "next/navigation";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { requireUser } from "@/lib/auth/service";
import { listProjectsForUser } from "@/lib/projects/service";
import { listDocumentsForUser } from "@/lib/documents/service";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { ProductShell } from "@/components/workspace/product-shell";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { ProjectWorkspace } from "@/components/workspace/project-workspace";
import { FreeSlotDashboard } from "@/components/dashboard/free-slot-dashboard";
import { getUserPlan, getActiveDocument } from "@/lib/plans/service";
import { previewExcerpt, toListItem } from "@/lib/documents/mappers";
import { appConfig } from "@/lib/config";

export default async function DashboardPage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login?next=/dashboard");
  }

  const plan = await getUserPlan(user.id);

  // Free: simple one-slot dashboard
  if (plan === "free") {
    const active = await getActiveDocument(user.id);
    const item = active ? toListItem(active) : null;
    return (
      <ProductShell
        userInitial={user.name || user.email}
        centerTitle={appConfig.name}
        sidebar={
          <WorkspaceSidebar projects={[]} user={user} plan="free" />
        }
      >
        <FreeSlotDashboard
          document={item}
          previewMarkdown={active?.markdownContent}
        />
      </ProductShell>
    );
  }

  // Pro / Business: full multi-doc workspace
  const [projects, documentList] = await Promise.all([
    listProjectsForUser(user.id),
    listDocumentsForUser(user.id, { limit: 40 }),
  ]);

  const previews: Record<string, string> = {};
  if (documentList.length > 0) {
    const ids = documentList.map((d) => d.publicId);
    const db = getDb();
    const rows = await db
      .select({
        publicId: documents.publicId,
        markdownContent: documents.markdownContent,
      })
      .from(documents)
      .where(
        and(
          inArray(documents.publicId, ids),
          isNull(documents.deletedAt),
          eq(documents.createdBy, user.id)
        )
      )
      .orderBy(desc(documents.updatedAt))
      .limit(40);

    for (const row of rows) {
      previews[row.publicId] = previewExcerpt(row.markdownContent);
    }
  }

  return (
    <ProductShell
      userInitial={user.name || user.email}
      centerTitle={appConfig.name}
      sidebar={
        <WorkspaceSidebar projects={projects} user={user} plan={plan} />
      }
    >
      <ProjectWorkspace
        documents={documentList}
        projects={projects}
        previews={previews}
        mode="dashboard"
      />
    </ProductShell>
  );
}
