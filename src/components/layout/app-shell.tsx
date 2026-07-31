import { ProductShell } from "@/components/workspace/product-shell";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import type { ProjectSummary } from "@/types/document";
import { appConfig } from "@/lib/config";

/**
 * Thin wrapper for project/settings pages that need the product chrome.
 */
export function AppShell({
  children,
  projects,
  user,
  activeProjectId,
  title,
}: {
  children: React.ReactNode;
  projects: ProjectSummary[];
  user: { name: string | null; email: string };
  activeProjectId?: string;
  title?: string;
}) {
  return (
    <ProductShell
      userInitial={user.name || user.email}
      centerTitle={title || appConfig.name}
      sidebar={
        <WorkspaceSidebar
          projects={projects}
          user={user}
          activeProjectId={activeProjectId}
        />
      }
    >
      <div className="h-full min-h-0 overflow-hidden">{children}</div>
    </ProductShell>
  );
}

