import Link from "next/link";
import PlaceCard from "@/components/place-card";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const places = await getPublishedPlaces();
  const featured = places.filter((item) => item.is_featured).slice(0, 3);
  const latest = places.slice(0, 4);

  return (
    <section className="w-full space-y-8">
      <div className="panel overflow-hidden p-7 md:p-10">
        <div className="max-w-3xl">
          <p className="chip">Bangkok local curation</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
            Minimal place platform with real local updates
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600 md:text-base">
            Built for Korean travelers who want save-worthy spots, not noisy lists.
            Start lean, ship fast, and keep every place trustworthy.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/places" className="btn-primary">
              Explore places
            </Link>
            <Link href="/map" className="btn-secondary">
              Open map
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Platform focus</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Direct-visit based recommendations</li>
            <li>Fast mobile-first browsing</li>
            <li>Map and tags for quick discovery</li>
          </ul>
        </div>
        <div className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">MVP health check</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Total published places: {places.length}</li>
            <li>Featured picks: {featured.length}</li>
            <li>Status: ready for content ops</li>
          </ul>
        </div>
      </div>

      {featured.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Featured picks</h2>
            <Link href="/places" className="text-sm text-slate-500 hover:text-slate-900">
              See all
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Latest additions</h2>
          <Link href="/places" className="text-sm text-slate-500 hover:text-slate-900">
            Browse catalog
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {latest.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      </section>
    </section>
  );
}
