"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { createProjectAction } from "@/app/actions/projects";
import { Plus } from "lucide-react";

export function CreateProjectButton({
  variant = "default",
}: {
  variant?: "default" | "sidebar" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onCreate() {
    setLoading(true);
    const res = await createProjectAction({ name, description });
    setLoading(false);
    if (!res.ok || !res.data) {
      toast.error(res.ok === false ? res.error : "Fehler");
      return;
    }
    toast.success("Projekt erstellt");
    setOpen(false);
    setName("");
    setDescription("");
    router.push(`/dashboard/projects/${res.data.publicId}`);
    router.refresh();
  }

  const triggerClass =
    variant === "sidebar"
      ? "mb-0 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-white text-[13px] font-medium text-stone-800 shadow-sm ring-1 ring-black/[0.05] hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-100 dark:ring-white/10"
      : variant === "outline"
        ? "rounded-full"
        : "rounded-full";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={variant === "outline" || variant === "sidebar" ? "outline" : "default"}
            className={triggerClass}
          />
        }
      >
        <Plus data-icon="inline-start" />
        Neues Projekt
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Projekt erstellen</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="project-name">Name</FieldLabel>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Antya"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="project-desc">Beschreibung</FieldLabel>
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button disabled={!name.trim() || loading} onClick={() => void onCreate()}>
            {loading ? "Erstellen…" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
