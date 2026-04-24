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
          <div className="space-y-0.5">
            <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
              {title}
            </h2>

            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              {eyebrow}
            </p>
          </div>

          <div className="my-3 h-px bg-zinc-800" />

          <p className="text-helper text-zinc-400">{description}</p>

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
        <div className="space-y-1">
          <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
            Support
          </h1>

          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Help, gear, tools, parts
          </p>
        </div>

      </section>

      <HelpFeatureCard
        icon={Wrench}
        eyebrow="Coming Soon"
        title="Rider Assist"
        description="Request help with a flat, mechanical issue, missing tool, crash, or other trail-side problem."
        status="Planned Feature"
      />

      <HelpFeatureCard
        icon={PackageSearch}
        eyebrow="Coming Soon"
        title="Lost & Found"
        description="Did you find/lose sunglasses, water bottle, bike part or other gear?"
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