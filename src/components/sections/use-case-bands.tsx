import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const useCases = [
  {
    title: "RevOps & CRM hygiene",
    description:
      "Standardize country, industry, and title data before records land in Salesforce or HubSpot so automation is reliable.",
    accent: "from-brand-soft/60 to-transparent",
  },
  {
    title: "ETL and warehouse quality",
    description:
      "Normalize high-volume batches during ingestion to avoid fragmented dimensions and downstream reporting drift.",
    accent: "from-brand/15 to-transparent",
  },
  {
    title: "Product onboarding and forms",
    description:
      "Parse and validate user-entered values in real time to reduce bad inputs and improve activation funnels.",
    accent: "from-brand-glow/20 to-transparent",
  },
];

export function UseCaseBands() {
  return (
    <section className="space-y-4">
      <div className="max-w-2xl">
        <h2 className="section-title text-3xl font-semibold text-foreground">Built for real production workflows</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          FeeldKit is designed for teams that care about data quality without adding custom field logic in every service.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {useCases.map((item) => (
          <Card key={item.title} variant="elevated" className="hover-lift overflow-hidden">
            <div className={`h-1.5 w-full bg-gradient-to-r ${item.accent}`} />
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
