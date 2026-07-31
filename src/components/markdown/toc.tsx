"use client";

import { useState } from "react";
import type { TocItem } from "@/lib/markdown/render";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { List } from "lucide-react";

interface TocProps {
  items: TocItem[];
  className?: string;
}

export function TableOfContents({ items, className }: TocProps) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <nav aria-label="Inhaltsverzeichnis" className={cn("text-sm", className)}>
      <div className="mb-4 lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <List data-icon="inline-start" />
          Inhaltsverzeichnis
        </Button>
      </div>
      <div className={cn("lg:block", open ? "block" : "hidden")}>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
          Inhalt
        </p>
        <ul className="flex flex-col gap-1.5 border-l border-stone-200 pl-3 dark:border-stone-700">
          {items.map((item, index) => (
            <li
              key={item.id}
              style={{ paddingLeft: `${(item.level - 1) * 0.7}rem` }}
            >
              <a
                href={`#${item.id}`}
                className={cn(
                  "text-[12.5px] transition-colors",
                  index === 0
                    ? "font-medium text-sky-600 dark:text-sky-400"
                    : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                )}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
