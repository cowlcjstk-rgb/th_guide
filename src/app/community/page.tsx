import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const places = await getPublishedPlaces();
  const placeMap = new Map(places.map((p) => [p.id, p]));
  const supabase = getSupabaseAdminClient();

  const { data: reviews } = supabase
    ? await supabase.from("place_reviews").select("*").order("created_at", { ascending: false }).limit(80)
    : { data: [] };

  const byPlace = new Map<string, { count: number; sum: number }>();
  for (const r of reviews ?? []) {
    const current = byPlace.get(r.place_id) ?? { count: 0, sum: 0 };
    current.count += 1;
    current.sum += Number(r.rating || 0);
    byPlace.set(r.place_id, current);
  }

  const topRated = Array.from(byPlace.entries())
    .map(([id, v]) => ({
      id,
      avg: v.sum / v.count,
      count: v.count,
      place: placeMap.get(id),
    }))
    .filter((x) => x.place)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  return (
    <section className="w-full">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="panel h-fit p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Community Menu</p>
          <nav className="mt-3 grid gap-1 text-sm">
            <a href="#top-rated" className="rounded-lg px-3 py-2 hover:bg-slate-100">Top Rated</a>
            <a href="#latest-reviews" className="rounded-lg px-3 py-2 hover:bg-slate-100">Latest Reviews</a>
            <Link href="/map" className="rounded-lg px-3 py-2 hover:bg-slate-100">Route Planner</Link>
          </nav>
        </aside>

        <div className="space-y-6">
          <header className="panel p-6">
            <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
            <p className="mt-2 text-sm text-slate-600">
              Share quick reviews and discover top-rated places from other travelers.
            </p>
          </header>

          <article id="top-rated" className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Top Rated</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {topRated.map((item) => (
                <Link
                  key={item.id}
                  href={`/place/${item.place!.slug}`}
                  className="block rounded-xl border border-slate-200 bg-white p-3"
                >
                  <p className="text-sm font-semibold text-slate-800">{item.place!.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.avg.toFixed(1)} / 5 · {item.count} reviews
                  </p>
                </Link>
              ))}
            </div>
          </article>

          <article id="latest-reviews" className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Latest Reviews</h2>
            <div className="mt-3 space-y-2">
              {(reviews ?? []).slice(0, 16).map((r) => {
                const place = placeMap.get(r.place_id);
                return (
                  <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-800">
                      {r.nickname || "Guest"} · {"★".repeat(Number(r.rating))}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{place?.name ?? "Unknown place"}</p>
                    <p className="mt-2 text-sm text-slate-700">{r.comment || "No comment"}</p>
                  </div>
                );
              })}
            </div>
          </article>

          <article id="guide" className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Community Guide
            </h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p>1. Leave short, specific reviews based on real visits.</p>
              <p>2. Use route planner and share your multi-stop path.</p>
              <p>3. Tag useful context like best time and vibe.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
