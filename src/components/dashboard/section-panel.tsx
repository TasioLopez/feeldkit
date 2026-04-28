import type { ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SectionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children}
    </Card>
  );
}
