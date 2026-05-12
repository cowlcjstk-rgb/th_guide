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
    <section className="w-full rounded-xl border border-slate-200 bg-white p-5">
      <h1 className="text-2xl font-bold">{place.name}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {place.district ?? "-"} · {place.category ?? "-"}
      </p>
      <p className="mt-4 text-sm leading-6 text-slate-800">{place.description ?? "설명 없음"}</p>

      <div className="mt-6 grid gap-3 text-sm">
        <p>
          <span className="font-semibold">주소:</span> {place.address ?? "-"}
        </p>
        <p>
          <span className="font-semibold">운영 팁:</span> {place.tips ?? "-"}
        </p>
        <p>
          <span className="font-semibold">태그:</span> {(place.tags ?? []).join(", ") || "-"}
        </p>
        {place.google_map_url ? (
          <a
            className="font-semibold text-blue-700 underline"
            href={place.google_map_url}
            target="_blank"
            rel="noreferrer"
          >
            구글맵으로 이동
          </a>
        ) : null}
      </div>
    </section>
  );
}
