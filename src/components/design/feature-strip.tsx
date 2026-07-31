import { FileText, Shield, Terminal, Focus } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Schön formatiert",
    body: "Markdown wird automatisch in ein sauberes, typografisch ansprechendes Layout verwandelt.",
  },
  {
    icon: Shield,
    title: "Sicher geteilt",
    body: "Öffentlich, geschützt mit Passwort oder privat - du entscheidest, wer Zugriff hat.",
  },
  {
    icon: Terminal,
    title: "Nahtloser Workflow",
    body: "Direkt aus VS Code oder dem Terminal veröffentlichen. Schnell, einfach, produktiver.",
  },
  {
    icon: Focus,
    title: "Fokussiert auf das Wesentliche",
    body: "Eine ruhige Oberfläche, die Inhalt und Lesbarkeit in den Mittelpunkt stellt.",
  },
];

export function FeatureStrip() {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {features.map(({ icon: Icon, title, body }) => (
        <div key={title} className="flex gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm ring-1 ring-black/[0.04] dark:bg-white/5 dark:ring-white/10">
            <Icon className="size-3.5 text-stone-500" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-medium tracking-tight text-stone-800 dark:text-stone-100">
              {title}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
              {body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
