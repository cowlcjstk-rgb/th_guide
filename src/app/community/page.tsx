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
    .slice(0, 8);

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
        <p className="mt-2 text-sm text-slate-600">
          Traveler feedback, star ratings, and top places by real user reviews.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Top Rated</h2>
          <div className="mt-3 space-y-2">
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

        <article className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Latest Reviews</h2>
          <div className="mt-3 space-y-2">
            {(reviews ?? []).slice(0, 12).map((r) => {
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
      </div>
    </section>
  );
}
