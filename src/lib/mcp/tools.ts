import {
  assertScopeAllowsMethod,
  assertScopeAllowsProject,
  CliAuthError,
  type authenticateCliToken,
} from "@/lib/cli/tokens";
import {
  assertProjectAccess,
  listProjectsForUser,
  ProjectError,
} from "@/lib/projects/service";
import {
  createDocument,
  DocumentError,
  getDocumentByPublicId,
  updateDocumentById,
} from "@/lib/documents/service";
import { getDomainForDocument } from "@/lib/domains/service";
import {
  publishDocumentSchema,
  updateDocumentSchema,
} from "@/lib/validation/document";
import { shareUrlOn } from "@/lib/utils/urls";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ToolError, type McpTool } from "./protocol";

type Auth = Awaited<ReturnType<typeof authenticateCliToken>>;

function str(args: Record<string, unknown>, key: string, required = false) {
  const value = args[key];
  if (typeof value === "string" && value.trim()) return value;
  if (required) throw new ToolError(`Feld "${key}" fehlt.`);
  return undefined;
}

/** Projects this token may see: all of the user's, or the one it is bound to. */
async function visibleProjects(auth: Auth) {
  const all = await listProjectsForUser(auth.userId);
  if (!auth.projectId || auth.scope === "full") return all;
  // Token rows hold the internal project id; the list only has public ids.
  const [bound] = await getDb()
    .select({ publicId: projects.publicId })
    .from(projects)
    .where(eq(projects.id, auth.projectId))
    .limit(1);
  return all.filter((p) => p.publicId === bound?.publicId);
}

/** Domain errors carry messages written for users; pass them to the agent. */
function exposeErrors(tool: McpTool): McpTool {
  return {
    ...tool,
    run: async (args) => {
      try {
        return await tool.run(args);
      } catch (e) {
        if (
          e instanceof CliAuthError ||
          e instanceof ProjectError ||
          e instanceof DocumentError
        ) {
          throw new ToolError(e.message);
        }
        throw e;
      }
    },
  };
}

export function readlaneTools(auth: Auth): McpTool[] {
  const tools: McpTool[] = [
    {
      name: "list_projects",
      description:
        "Listet die Projekte (Kunden) mit ID, Slug, Anzahl Dokumente und hinterlegten Empfänger-Adressen.",
      inputSchema: { type: "object", properties: {} },
      async run() {
        const projects = await visibleProjects(auth);
        if (projects.length === 0) {
          return "Keine Projekte. Lege im Dashboard ein Projekt pro Kunde an.";
        }
        return projects
          .map(
            (p) =>
              `- ${p.name} (id: ${p.publicId}, slug: ${p.slug}, ${p.documentCount} Dokumente)\n` +
              `  Empfänger: ${p.recipients?.length ? p.recipients.join(", ") : "keine hinterlegt"}`
          )
          .join("\n");
      },
    },
    {
      name: "publish_document",
      description:
        "Veröffentlicht Markdown als gestaltete Seite im Projekt eines Kunden und gibt den Link sowie die " +
        "Empfänger zurück. Mit document_id wird ein bestehendes Dokument aktualisiert; der Link bleibt gleich.",
      inputSchema: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: "Projekt-ID, Slug oder Name (aus list_projects)",
          },
          title: { type: "string", description: "Titel der Seite" },
          markdown: { type: "string", description: "Inhalt als Markdown" },
          description: {
            type: "string",
            description: "Optionale Kurzbeschreibung unter dem Titel",
          },
          document_id: {
            type: "string",
            description: "Nur zum Aktualisieren: ID eines früher veröffentlichten Dokuments",
          },
        },
        required: ["project", "title", "markdown"],
      },
      async run(args) {
        const wanted = str(args, "project", true)!.trim().toLowerCase();
        const title = str(args, "title", true)!;
        const markdown = str(args, "markdown", true)!;
        const description = str(args, "description");
        const documentId = str(args, "document_id");

        assertScopeAllowsMethod(auth.scope, "POST");
        const match = (await visibleProjects(auth)).find(
          (p) =>
            p.publicId.toLowerCase() === wanted ||
            p.slug === wanted ||
            p.name.toLowerCase() === wanted
        );
        if (!match) {
          throw new ToolError(
            `Projekt "${wanted}" nicht gefunden. Rufe list_projects auf und nimm die ID.`
          );
        }
        const project = await assertProjectAccess(match.publicId, auth.userId, "editor");
        assertScopeAllowsProject(auth.scope, auth.projectId, project.id);

        let publicId: string;
        let version: number;
        if (documentId) {
          const doc = await getDocumentByPublicId(documentId);
          if (!doc || doc.projectId !== project.id) {
            throw new ToolError(
              `Dokument "${documentId}" gehört nicht zum Projekt ${project.name}.`
            );
          }
          const input = updateDocumentSchema.parse({
            title,
            description,
            markdownContent: markdown,
            status: "published",
          });
          const updated = await updateDocumentById(doc, input, {
            userId: auth.userId,
            source: "api",
            deviceName: auth.deviceName,
          });
          publicId = updated.publicId;
          version = updated.version;
        } else {
          const parsed = publishDocumentSchema.safeParse({
            title,
            description,
            markdownContent: markdown,
            visibility: project.defaultVisibility,
            status: "published",
            theme: project.defaultTheme,
            contentWidth: project.defaultContentWidth,
            fontStyle: project.defaultFontStyle,
            projectId: project.id,
            expiryPreset: "never",
          });
          if (!parsed.success) {
            throw new ToolError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe");
          }
          parsed.data.projectId = project.id;
          const created = await createDocument(parsed.data, {
            userId: auth.userId,
            source: "api",
            deviceName: auth.deviceName,
          });
          publicId = created.document.publicId;
          version = created.document.version;
        }

        const domain = await getDomainForDocument({
          createdBy: project.ownerId,
          projectId: project.id,
        });
        const url = shareUrlOn(domain?.host, publicId);
        const recipients = project.recipients;

        return [
          `${documentId ? "Aktualisiert" : "Veröffentlicht"}: ${title} (Version ${version})`,
          `Link: ${url}`,
          `document_id: ${publicId} (für spätere Aktualisierungen)`,
          recipients.length
            ? `Empfänger: ${recipients.join(", ")}`
            : `Empfänger: keine hinterlegt – im Dashboard unter Projekteinstellungen eintragen oder den Nutzer fragen.`,
          "Nächster Schritt: Mail mit kurzem Anschreiben und dem Link als Entwurf anlegen, nicht selbst senden.",
        ].join("\n");
      },
    },
  ];
  return tools.map(exposeErrors);
}
