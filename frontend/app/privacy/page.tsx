import { PageBackLink } from "@/components/PageBackLink";

export default function PrivacyPage() {
  return (
    <main className="space-y-3 pb-28">
      <section className="card p-6">
        <PageBackLink fallback="/preferences" />
        <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
          Privacy Policy
        </h1>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Ride Recon | Real-time decisions
        </p>

        <div className="my-4 h-px bg-zinc-800" />

        <div className="space-y-4 text-body text-zinc-300">
          <p>
            Ride Recon helps riders view trail conditions, submit trail reports,
            request rider assist, save favorites, and suggest trails for future
            coverage.
          </p>

          <section className="space-y-2">
            <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
              Information We Collect
            </h2>
            <p>
              We may collect account information such as your email address,
              username, saved favorites, rider profile details, trail reports,
              trail suggestions, and rider assist requests.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
              Location Data
            </h2>
            <p>
              Ride Recon may request your location to place trail reports,
              hazard reports, rider assist requests, trail add requests, and to
              support map features such as Locate Me.
            </p>
            <p>
              Location data is used to support trail condition awareness and
              rider safety features. Do not submit precise location details you
              do not want associated with a report or request.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
              How We Use Information
            </h2>
            <p>
              We use submitted information to display trail conditions, show
              recent rider activity, support admin review, improve trail data,
              and help riders make better decisions before heading out.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
              Emergency Disclaimer
            </h2>
            <p>
              Ride Recon is not an emergency service. If there is an emergency,
              call 911 or local emergency services directly.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
              Contact
            </h2>
            <p>
              For privacy or support questions, contact Ride Recon support
              through the Support page.
            </p>
          </section>

          <p className="text-helper text-zinc-500">
            Last updated: May 2026
          </p>
        </div>
      </section>
    </main>
  );
}