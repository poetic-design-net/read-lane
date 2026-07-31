"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteManagedDocumentAction } from "@/app/actions/documents";

export function DeleteDocumentButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onDelete() {
    setLoading(true);
    const res = await deleteManagedDocumentAction(token);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Dokument gelöscht");
    router.push("/");
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="destructive" size="sm" />}
      >
        Dokument löschen
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dokument endgültig löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Der Share-Link ist danach nicht mehr erreichbar. Diese Aktion kann
            nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={() => void onDelete()}
          >
            {loading ? "Löschen…" : "Ja, löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
