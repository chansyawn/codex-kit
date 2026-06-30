import type { ReactNode } from "react";

type PlaceholderPageProps = {
  description: string;
  icon: ReactNode;
  title: string;
};

export function PlaceholderPage({ description, icon, title }: PlaceholderPageProps) {
  return (
    <div className="border-border bg-card rounded-lg border p-5">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        {icon}
        {title}
      </div>
      <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{description}</p>
    </div>
  );
}
