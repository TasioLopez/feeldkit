import Link from "next/link";
import { env } from "@/lib/config/env";

export default function Home() {
  const showAdminLink = env.NEXT_PUBLIC_SHOW_ADMIN_LINK === true;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12">
        <p className="text-sm uppercase tracking-[0.2em] text-teal-300">feeldkit.dev</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          FeeldKit
          <span className="block text-teal-300">The field intelligence layer for modern apps.</span>
        </h1>
        <p className="mt-6 max-w-3xl text-slate-300">
          Standardize countries, industries, jobs, company bands, technologies, intent topics, events, and other recurring
          fields through one reusable API and TypeScript SDK.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-medium">Normalize</p>
            <p className="mt-2 text-sm text-slate-300">Messy inputs become canonical values with confidence and metadata.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-medium">Validate + Parse</p>
            <p className="mt-2 text-sm text-slate-300">Field-specific validation rules and parser interfaces stay reusable.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-medium">Crosswalk</p>
            <p className="mt-2 text-sm text-slate-300">Map values across standards and practical overlays without duplicate logic.</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          {showAdminLink ? (
            <Link className="rounded-lg bg-teal-400 px-4 py-2 font-medium text-slate-950" href="/dashboard">
              Open Dashboard
            </Link>
          ) : null}
          <Link className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200" href="/docs">
            API documentation
          </Link>
        </div>
      </main>
    </div>
  );
}
