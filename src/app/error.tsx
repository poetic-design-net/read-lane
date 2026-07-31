"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Etwas ist schiefgelaufen
      </h1>
      <p className="mt-2 text-muted-foreground">
        Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>Erneut versuchen</Button>
        <Button variant="outline" render={<Link href="/" />}>
          Zur Startseite
        </Button>
      </div>
    </main>
  );
}
