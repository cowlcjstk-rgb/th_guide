import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContactBanners from "@/components/contact-banners";
import PlaceQuickActions from "@/components/place-quick-actions";
import PlaceReviews from "@/components/place-reviews";
import { getPlaceBySlug } from "@/lib/supabase";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) {
    return {
      title: "장소 정보 | Thailand Guide",
      description: "태국 여행자 커뮤니티 장소 정보",
    };
  }

  const title = `${place.name} | 태국 여행자 커뮤니티`;
  const description = place.description?.slice(0, 140) || `${place.name} 위치, 팁, 리뷰 정보`;
  const url = `/place/${place.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "article",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PlaceDetailPage({ params }: Props) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) notFound();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "이 장소는 언제 방문하면 좋은가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: place.tips || "운영 팁을 참고해 방문 시간대를 확인하세요.",
        },
      },
      {
        "@type": "Question",
        name: "구글맵에서 바로 이동할 수 있나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: place.google_map_url
            ? "네, 페이지의 Google Maps 버튼으로 바로 이동할 수 있습니다."
            : "현재 구글맵 링크가 등록되지 않았습니다.",
        },
      },
      {
        "@type": "Question",
        name: "정보가 다르면 어떻게 수정하나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "장소 수정 요청 버튼으로 변경안을 보내면 운영팀 검토 후 반영됩니다.",
        },
      },
    ],
  };

  return (
    <section className="w-full space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header className="panel p-7">
        <div className="flex flex-wrap items-center gap-2">
          {place.category ? <span className="chip">{place.category}</span> : null}
          {place.district ? <span className="chip">{place.district}</span> : null}
          {place.city ? <span className="chip">{place.city}</span> : null}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{place.name}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          {place.description ?? "No description yet."}
        </p>
        <PlaceQuickActions place={place} />
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

          <a
            className="btn-secondary mt-3 w-full"
            href={`/submit/place-edit?q=${encodeURIComponent(place.name)}`}
          >
            장소 수정 요청
          </a>
        </aside>
      </div>

      <PlaceReviews placeId={place.id} />
      <ContactBanners source="place_detail" />
    </section>
  );
}
