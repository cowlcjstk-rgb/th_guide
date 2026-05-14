"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { PlaceReview } from "@/lib/types";

export default function PlaceReviews({ placeId }: { placeId: string }) {
  const { lang } = useLanguage();
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [nickname, setNickname] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);

  const average = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch(`/api/community/reviews?placeId=${placeId}`);
      const data = await res.json();
      if (active && res.ok) setReviews(data.reviews ?? []);
    })();
    return () => {
      active = false;
    };
  }, [placeId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    const res = await fetch("/api/community/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place_id: placeId,
        nickname,
        rating,
        comment,
      }),
    });
    setPending(false);
    if (!res.ok) return;
    setComment("");
    const refresh = await fetch(`/api/community/reviews?placeId=${placeId}`);
    const data = await refresh.json();
    if (refresh.ok) setReviews(data.reviews ?? []);
  };

  const t =
    lang === "ko"
      ? {
          title: "커뮤니티 별점",
          empty: "아직 리뷰가 없습니다",
          nick: "닉네임",
          comment: "짧은 리뷰를 남겨 주세요",
          submit: "리뷰 등록",
          saving: "저장 중...",
        }
      : {
          title: "Community rating",
          empty: "No reviews yet",
          nick: "Nickname",
          comment: "Leave a short comment",
          submit: "Submit review",
          saving: "Saving...",
        };

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.title}</h2>
        <p className="text-sm text-slate-700">
          {reviews.length ? `${average.toFixed(1)} / 5 (${reviews.length})` : t.empty}
        </p>
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-2">
        <input
          className="input"
          placeholder={t.nick}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)} ({n})
            </option>
          ))}
        </select>
        <textarea
          className="input min-h-20"
          placeholder={t.comment}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? t.saving : t.submit}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {reviews.slice(0, 8).map((r) => (
          <article key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-800">
              {r.nickname || "Guest"} · {"★".repeat(r.rating)}
            </p>
            <p className="mt-1 text-sm text-slate-600">{r.comment || "-"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

