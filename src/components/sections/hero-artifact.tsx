export function HeroArtifact() {
  const nodes = [
    { id: "in1", label: "Messy Input", x: "left-6", y: "top-8" },
    { id: "in2", label: "Aliases", x: "left-8", y: "top-28" },
    { id: "core", label: "Normalize Engine", x: "left-1/2", y: "top-1/2 -translate-x-1/2 -translate-y-1/2" },
    { id: "out1", label: "Canonical Value", x: "right-6", y: "top-14" },
    { id: "out2", label: "Confidence + Meta", x: "right-8", y: "top-34" },
  ];

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-2xl border border-stroke-soft bg-surface-section shadow-xl">
      <div className="noise-overlay absolute inset-0" />
      <div className="artifact-ring pulse-soft absolute inset-0" />

      <div className="absolute left-1/2 top-16 h-[2px] w-28 -translate-x-1/2 bg-linear-to-r from-transparent via-brand/70 to-transparent" />
      <div className="absolute left-1/2 top-[170px] h-[2px] w-40 -translate-x-1/2 bg-linear-to-r from-brand/10 via-brand/70 to-brand/10" />
      <div className="absolute left-1/2 top-[252px] h-[2px] w-30 -translate-x-1/2 bg-linear-to-r from-transparent via-brand/70 to-transparent" />
      <div className="absolute left-[27%] top-[157px] h-[2px] w-20 -rotate-12 bg-linear-to-r from-brand/15 via-brand/75 to-brand/15" />
      <div className="absolute right-[27%] top-[156px] h-[2px] w-20 rotate-12 bg-linear-to-r from-brand/15 via-brand/75 to-brand/15" />

      {nodes.map((node) => (
        <div
          key={node.id}
          className={`fade-up absolute ${node.x} ${node.y} rounded-lg border border-stroke-soft bg-surface-panel/90 px-3 py-2 text-xs font-medium text-foreground shadow-md backdrop-blur-sm`}
        >
          {node.label}
        </div>
      ))}

      <div className="fade-up-delay absolute bottom-5 left-5 right-5 rounded-xl border border-brand/20 bg-brand-soft/55 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-strong">Live transformation</p>
        <pre className="mt-2 overflow-x-auto text-[11px] text-foreground/85">
          {`"Netherland" -> "Netherlands"  | confidence: 0.94`}
        </pre>
      </div>
    </div>
  );
}
