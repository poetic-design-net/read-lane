import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/lib/auth/service";
import { assertProjectAccess, ProjectError } from "@/lib/projects/service";
import { listProjectsForUser } from "@/lib/projects/service";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { toListItem } from "@/lib/documents/mappers";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectWorkspace } from "@/components/workspace/project-workspace";
import { ProjectSettingsForm } from "@/components/dashboard/project-settings-form";
import { ProjectMembersPanel } from "@/components/dashboard/project-members-panel";
import { listProjectMembers } from "@/lib/projects/members";
import { getEntitlements } from "@/lib/plans/service";

interface PageProps {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ q?: string; status?: string; settings?: string }>;
}

export default async function ProjectPage({ params, searchParams }: PageProps) {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const { publicId } = await params;
  const { q, status, settings } = await searchParams;
  const projects = await listProjectsForUser(user.id);

  let project;
  try {
    project = await assertProjectAccess(publicId, user.id, "viewer");
  } catch (e) {
    if (e instanceof ProjectError) notFound();
    throw e;
  }

  const db = getDb();
  const conditions = [
    eq(documents.projectId, project.id),
    isNull(documents.deletedAt),
  ];
  if (status) {
    conditions.push(
      eq(documents.status, status as "draft" | "published" | "archived")
    );
  }

  let rows = await db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.updatedAt))
    .limit(200);

  if (q) {
    const qq = q.toLowerCase();
    rows = rows.filter(
      (d) =>
        d.title.toLowerCase().includes(qq) ||
        (d.description ?? "").toLowerCase().includes(qq) ||
        (d.sourceFilename ?? "").toLowerCase().includes(qq) ||
        (d.sourcePath ?? "").toLowerCase().includes(qq) ||
        (d.slug ?? "").toLowerCase().includes(qq)
    );
  }

  const items = rows.map(toListItem);
  const previews: Record<string, string> = {};
  for (const row of rows) {
    previews[row.publicId] = row.markdownContent;
  }

  const summary = {
    publicId: project.publicId,
    name: project.name,
    slug: project.slug,
    description: project.description,
    documentCount: items.length,
    updatedAt: project.updatedAt,
    archivedAt: project.archivedAt,
    defaultVisibility: project.defaultVisibility,
    defaultTheme: project.defaultTheme,
    defaultContentWidth: project.defaultContentWidth,
    defaultFontStyle: project.defaultFontStyle,
  };

  const showSettings = settings === "1";
  // The owner's plan decides whether this project can have members at all.
  const [members, { entitlements: ownerEntitlements }] = showSettings
    ? await Promise.all([
        listProjectMembers(project.publicId, user.id),
        getEntitlements(project.ownerId),
      ])
    : [[], { entitlements: { teamMembers: false } }];

  return (
    <AppShell
      projects={projects}
      user={user}
      activeProjectId={project.publicId}
      title={project.name}
    >
      {showSettings ? (
        <div className="h-full overflow-y-auto p-6 sm:p-8 lg:p-10">
          <p className="mb-4 text-[12px] text-stone-400">
            <Link
              href={`/dashboard/projects/${project.publicId}`}
              className="hover:text-stone-600"
            >
              ← {project.name}
            </Link>
          </p>
          <ProjectSettingsForm
            publicId={project.publicId}
            initial={{
              name: project.name,
              description: project.description ?? "",
              slug: project.slug,
              defaultVisibility: project.defaultVisibility,
              defaultTheme: project.defaultTheme,
              defaultContentWidth: project.defaultContentWidth,
              defaultFontStyle: project.defaultFontStyle,
            }}
          />
          <ProjectMembersPanel
            publicId={project.publicId}
            members={members}
            canManage={project.ownerId === user.id}
            teamsEnabled={ownerEntitlements.teamMembers}
          />
        </div>
      ) : (
        <div className="relative h-full min-h-0">
          <ProjectWorkspace
            project={summary}
            projects={projects}
            documents={items}
            previews={previews}
            mode="project"
          />
          <Link
            href={`/dashboard/projects/${project.publicId}?settings=1`}
            className="absolute bottom-4 left-6 z-10 text-[11px] text-stone-400 underline-offset-2 hover:text-stone-600 hover:underline sm:left-8 lg:left-10"
          >
            Projekteinstellungen
          </Link>
        </div>
      )}
    </AppShell>
  );
}
