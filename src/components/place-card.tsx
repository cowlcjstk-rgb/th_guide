import Link from "next/link";
import { Place } from "@/lib/types";

type Props = {
  place: Place;
};

export default function PlaceCard({ place }: Props) {
  return (
    <Link href={`/place/${place.slug}`} className="card block p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-slate-900">{place.name}</h3>
        {place.is_featured ? <span className="chip">Featured</span> : null}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {place.district ?? "Unknown district"} · {place.category ?? "General"}
      </p>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">
        {place.description ?? "No description yet."}
      </p>
      {(place.tags ?? []).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(place.tags ?? []).slice(0, 4).map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
