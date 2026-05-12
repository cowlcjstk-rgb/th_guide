import Link from "next/link";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const places = await getPublishedPlaces();

  return (
    <section className="w-full">
      <h1 className="text-2xl font-bold">장소 리스트</h1>
      <p className="mt-2 text-sm text-slate-600">공개된 장소만 보여줍니다.</p>

      <div className="mt-6 grid gap-4">
        {places.map((place) => (
          <Link
            key={place.id}
            href={`/place/${place.slug}`}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
          >
            <p className="text-lg font-semibold">{place.name}</p>
            <p className="mt-1 text-sm text-slate-600">
              {place.district ?? "-"} · {place.category ?? "-"}
            </p>
            <p className="mt-2 text-sm text-slate-700">{place.description ?? "설명 없음"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
