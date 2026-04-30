export default function AboutPage() {
  return (
    <main className="space-y-3 pb-4">
      <section className="card p-6">
        <div className="space-y-1.5">
          <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
            About Ride Recon
          </h1>

          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Real-time trail decisions
          </p>

          <p className="text-helper mt-2 max-w-2xl text-zinc-400">
            Ride Recon helps riders make smarter trail decisions using real-time
            data.
          </p>

          <p className="text-helper mt-2 max-w-2xl text-zinc-400">
            By combining rider reports, weather conditions, and trail recovery
            patterns, Ride Recon gives you a clear picture of what to expect
            before you ride.
          </p>

          <p className="text-helper mt-2 max-w-2xl text-zinc-400">
            No guesswork. No wasted trips.
          </p>
        </div>

        <div className="my-4 h-px bg-zinc-800" />

        <div className="space-y-2 text-sm text-zinc-300">
          <p>• Real-time trail conditions</p>
          <p>• Rider-submitted reports</p>
          <p>• Weather-aware trail recovery logic</p>
          <p>• Hazard alerts and confirmations</p>
        </div>

        <div className="my-4 h-px bg-zinc-800" />

        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Built by riders, for riders.
        </p>
      </section>
    </main>
  );
}