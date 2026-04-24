import { AlertTriangle, PackageSearch, Wrench } from "lucide-react";

function HelpFeatureCard({
  icon: Icon,
  title,
  eyebrow,
  description,
  status,
}: {
  icon: React.ElementType;
  title: string;
  eyebrow: string;
  description: string;
  status: string;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-300">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            {eyebrow}
          </p>

          <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            {title}
          </h2>

          <p className="text-helper mt-2 text-zinc-400">{description}</p>

          <div className="mt-4 inline-flex rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {status}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <main className="space-y-3 pb-4">
      <section className="card p-6">
        <div className="space-y-1.5">
          <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
            Help
          </h1>

          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Rider Support
          </p>

          <p className="text-helper mt-2 max-w-2xl text-zinc-400">
            Tools for rider assist, mechanical issues, lost gear, and trail-side
            support are planned here.
          </p>
        </div>
      </section>

      <HelpFeatureCard
        icon={Wrench}
        eyebrow="Coming Soon"
        title="Rider Assist"
        description="Request help for a flat, mechanical issue, missing tool, tube, CO2, crash, or other trail-side problem."
        status="Planned Feature"
      />

      <HelpFeatureCard
        icon={PackageSearch}
        eyebrow="Coming Soon"
        title="Lost & Found"
        description="Report lost gear or post found items like keys, bottles, lights, tools, gloves, or bike parts."
        status="Planned Feature"
      />

      <HelpFeatureCard
        icon={AlertTriangle}
        eyebrow="Future Expansion"
        title="Trail Notices"
        description="A future place for high-visibility trail alerts like closures, flooding, bees, obstructions, or temporary hazards."
        status="Future Idea"
      />
    </main>
  );
}