import Link from "next/link";
import { LifeBuoy, Mail, ShieldAlert } from "lucide-react";
import { PageBackLink } from "@/components/PageBackLink";

function SupportCard({
  icon: Icon,
  title,
  eyebrow,
  children,
}: {
  icon: React.ElementType;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-300">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            {title}
          </h2>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            {eyebrow}
          </p>
        </div>
      </div>

      <div className="my-3 h-px bg-zinc-800" />

      <div className="text-helper text-zinc-400">{children}</div>
    </section>
  );
}

export default function SupportPage() {
  return (
    <main className="space-y-3 pb-28">
        <section className="card p-6">
            <PageBackLink fallback="/preferences" />
            <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
            Support
            </h1>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Help | Safety | App Info
            </p>
        </section>

      <SupportCard icon={LifeBuoy} title="Need Help?" eyebrow="Trail-side help">
        <p>
          Use the Help page for rider assist, trail add requests, and upcoming
          support features.
        </p>

        <Link
          href="/help"
          className="mt-3 inline-flex font-semibold text-emerald-300 underline-offset-4 hover:underline"
        >
          Open Help
        </Link>
      </SupportCard>

      <SupportCard icon={ShieldAlert} title="Emergency" eyebrow="Important">
        <p>
          Ride Recon is not an emergency service. If you are hurt, in danger, or
          need urgent help, call 911 or local emergency services directly.
        </p>
      </SupportCard>

      <SupportCard icon={Mail} title="Contact" eyebrow="Ride Recon">
        <div className="space-y-3">
          <p>
            For general support, app questions, trail coverage questions, or issue
            reports, email{" "}
            <a
              href="mailto:support@riderecon.app"
              className="text-emerald-300 underline-offset-4 hover:underline"
            >
              support@riderecon.app
            </a>
            .
          </p>

          <p>
            For privacy questions or account and data deletion requests, email{" "}
            <a
              href="mailto:privacy@riderecon.app"
              className="text-emerald-300 underline-offset-4 hover:underline"
            >
              privacy@riderecon.app
            </a>
            .
          </p>
        </div>
      </SupportCard>

      <section className="card p-5">
        <Link
          href="/privacy"
          className="font-semibold text-emerald-300 underline-offset-4 hover:underline"
        >
          Privacy Policy
        </Link>
      </section>
    </main>
  );
}