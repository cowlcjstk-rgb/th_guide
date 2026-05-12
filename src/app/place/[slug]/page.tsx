import { notFound } from "next/navigation";
import { getPlaceBySlug } from "@/lib/supabase";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PlaceDetailPage({ params }: Props) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) notFound();

  return (
    <section className="w-full space-y-6">
      <header className="panel p-7">
        <div className="flex flex-wrap items-center gap-2">
          {place.category ? <span className="chip">{place.category}</span> : null}
          {place.district ? <span className="chip">{place.district}</span> : null}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{place.name}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          {place.description ?? "No description yet."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <article className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Local notes</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-semibold text-slate-800">Address</dt>
              <dd className="mt-1 text-slate-600">{place.address ?? "Not provided"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-800">Tips</dt>
              <dd className="mt-1 text-slate-600">{place.tips ?? "No tips yet"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-800">Last verified</dt>
              <dd className="mt-1 text-slate-600">
                {place.last_verified_at
                  ? new Date(place.last_verified_at).toLocaleDateString("ko-KR")
                  : "Not set"}
              </dd>
            </div>
          </dl>
        </article>

        <aside className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tags</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(place.tags ?? []).length > 0 ? (
              (place.tags ?? []).map((tag) => <span key={tag} className="chip">{tag}</span>)
            ) : (
              <p className="text-sm text-slate-500">No tags yet.</p>
            )}
          </div>

          {place.google_map_url ? (
            <a className="btn-primary mt-6 w-full" href={place.google_map_url} target="_blank" rel="noreferrer">
              Open in Google Maps
            </a>
          ) : (
            <p className="mt-6 text-sm text-slate-500">Google Maps link not provided.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
