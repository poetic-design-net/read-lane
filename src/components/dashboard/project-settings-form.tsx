"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  updateProjectAction,
  deleteProjectAction,
} from "@/app/actions/projects";
import type { Visibility, Theme, ContentWidth, FontStyle } from "@/types/document";

export function ProjectSettingsForm({
  publicId,
  initial,
}: {
  publicId: string;
  initial: {
    name: string;
    description: string;
    slug: string;
    defaultVisibility: Visibility;
    defaultTheme: Theme;
    defaultContentWidth: ContentWidth;
    defaultFontStyle: FontStyle;
  };
}) {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function save() {
    setLoading(true);
    const res = await updateProjectAction(publicId, form);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Projekt gespeichert");
    router.refresh();
  }

  async function archive() {
    if (!confirm("Projekt archivieren und Dokumente entfernen?")) return;
    setLoading(true);
    const res = await deleteProjectAction(publicId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Projekt archiviert");
    router.push("/dashboard");
  }

  return (
    <section className="rounded-xl border border-border p-4">
      <h2 className="mb-4 text-lg font-medium">Projekteinstellungen</h2>
      <FieldGroup>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel>Slug</FieldLabel>
          <Input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel>Beschreibung</FieldLabel>
          <Textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={2}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button disabled={loading} onClick={() => void save()}>
            Speichern
          </Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={() => void archive()}
          >
            Projekt archivieren
          </Button>
        </div>
      </FieldGroup>
    </section>
  );
}
