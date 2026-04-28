import { Badge } from "@/components/ui/badge";

export function TrustStrip() {
  const items = [
    "Typed SDK + HTTP API",
    "Reusable field intelligence",
    "Built for CRMs, ETL, and RevOps",
    "Production-ready schema packs",
  ];

  return (
    <section className="rounded-2xl border border-border/70 bg-card px-6 py-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="brand">Why teams use FeeldKit</Badge>
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border bg-subtle px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
