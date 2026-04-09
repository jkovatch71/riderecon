"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ReportForm } from "@/components/ReportForm";

export function ReportAccess({ trailId, trailName }: { trailId: string; trailName: string }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data }) => {
            if (mounted) {
                setSession(data.session ?? null);
                setLoading(false);
            }
        });

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession ?? null);
            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <section className="card p-5">
                <h3 className="text-lg font-semibold">Report Condition</h3>
                <p className="mt-2 text-sm text-zinc-400">Checking sign-in status...</p>
            </section>
        );
    }

    if (!session) {
        return (
            <section className="card space-y-4 p-5">
                <div>
                    <h3 className="text-lg font-semibold">Report Condition</h3>
                    <p className="text-sm text-zinc-400">
                        Guests can browse trail conditions, but only signed-in riders can submit reports.
                    </p>
                </div>

                <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-300">
                    Sign in to report current conditions for <span className="font-medium">{trailName}</span>.
                </div>

                <Link href={`/auth/login?next=/trails/${trailId}`} className="btn-primary block text-center">
                    Sign in to report
                </Link>
            </section>
        );
    }

    return <ReportForm trailId={trailId} trailName={trailName} />;
}