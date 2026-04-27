import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Imports | FeeldKit",
  description: "Reference data sources and import status.",
};

const importSources = [
  { key: "iso_3166", name: "ISO 3166 country list", version: "sample-v1", status: "ready" },
  { key: "iso_4217", name: "ISO 4217 currencies", version: "sample-v1", status: "ready" },
  { key: "manual_practical", name: "Practical overlays", version: "v1", status: "ready" },
];

function statusVariant(status: string): "success" | "warning" | "muted" {
  const s = status.toLowerCase();
  if (s === "ready") return "success";
  if (s === "pending") return "warning";
  return "muted";
}

export default function DashboardImportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Imports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track standard lists and overlays loaded into FeeldKit.</p>
      </div>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importSources.map((entry) => (
                <TableRow key={entry.key}>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{entry.version}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(entry.status)}>{entry.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
