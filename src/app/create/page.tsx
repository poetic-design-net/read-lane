import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/service";
import { listProjectsForUser } from "@/lib/projects/service";
import { ProductShell } from "@/components/workspace/product-shell";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { CreateWorkspace } from "@/components/workspace/create-workspace";
import { appConfig } from "@/lib/config";
import { getUserPlan, countActiveDocuments } from "@/lib/plans/service";

/**
 * Create / publish — Free account required.
 * Free users with an existing slot use replace mode (keep share link).
 */
export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; replace?: string }>;
}) {
  const { project, replace } = await searchParams;
  const next = project
    ? `/create?project=${encodeURIComponent(project)}`
    : replace === "1"
      ? "/create?replace=1"
      : "/create";

  let user;
  try {
    user = await requireUser();
  } catch {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const plan = await getUserPlan(user.id);
  const activeCount =
    plan === "free" ? await countActiveDocuments(user.id) : 0;
  const forceReplace = plan === "free" && (activeCount > 0 || replace === "1");

  const projects =
    plan === "free" ? [] : await listProjectsForUser(user.id);

  return (
    <ProductShell
      userInitial={user.name || user.email}
      centerTitle={appConfig.name}
      showAccountAvatar
      sidebar={
        <WorkspaceSidebar
          projects={projects}
          user={user}
          activeProjectId={project}
          plan={plan}
        />
      }
    >
      <CreateWorkspace
        projectId={plan === "free" ? null : project ?? null}
        replaceActive={forceReplace}
        plan={plan}
      />
    </ProductShell>
  );
}
