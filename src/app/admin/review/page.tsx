"use client";

import { useState } from "react";
import { Place, PlaceSubmissionImage, TripPlan } from "@/lib/types";

type QueueResponse = {
  places: Place[];
  plans: TripPlan[];
  imagesByPlace: Record<string, PlaceSubmissionImage[]>;
};

export default function AdminReviewPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [plans, setPlans] = useState<TripPlan[]>([]);
  const [imagesByPlace, setImagesByPlace] = useState<Record<string, PlaceSubmissionImage[]>>({});

  async function loadQueue() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/review");
    const data = (await res.json()) as QueueResponse | { error?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage((data as { error?: string })?.error ?? "Failed to load queue");
      return;
    }
    const queue = data as QueueResponse;
    setPlaces(queue.places ?? []);
    setPlans(queue.plans ?? []);
    setImagesByPlace(queue.imagesByPlace ?? {});
  }

  async function updateItem(type: "place" | "plan" | "image", id: string, action: "approve" | "reject", note?: string) {
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, action, note }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(data?.error ?? "Action failed");
      return;
    }
    await loadQueue();
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">승인 관리</h1>
        <p className="mt-2 text-sm text-slate-600">
          사용자 장소 등록, 이미지, 동선 등록을 검수하고 승인/반려합니다.
        </p>
      </header>

      <div className="panel p-5">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <p className="text-sm text-slate-600">관리자 계정 로그인 상태에서만 승인 처리가 가능합니다.</p>
          <button className="btn-primary" onClick={loadQueue} disabled={loading}>
            {loading ? "Loading..." : "대기 목록 불러오기"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-rose-600">{message}</p> : null}
      </div>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">장소 등록 대기</h2>
        <div className="mt-3 space-y-3">
          {places.map((place) => {
            const images = imagesByPlace[place.id] ?? [];
            return (
              <article key={place.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{place.name}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {place.city ?? "Unknown city"} · {place.district ?? "Unknown district"} · {place.category ?? "General"}
                </p>
                <p className="mt-1 text-xs text-slate-500">등록자: {place.submitted_by || "anonymous"}</p>
                {place.description ? <p className="mt-2 text-xs text-slate-600">{place.description}</p> : null}

                <div className="mt-2 flex gap-2">
                  <button className="btn-primary" onClick={() => updateItem("place", place.id, "approve")}>
                    장소 승인
                  </button>
                  <button className="btn-secondary" onClick={() => updateItem("place", place.id, "reject")}>
                    장소 반려
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    이미지 검수 ({images.length})
                  </p>
                  {images.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {images.map((image) => (
                        <div key={image.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                          <img
                            src={image.image_url}
                            alt="submission"
                            className="h-36 w-full rounded-lg object-cover"
                            loading="lazy"
                          />
                          <p className="mt-2 text-[11px] text-slate-500">상태: {image.moderation_status}</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              className="btn-primary !px-2 !py-1 !text-xs"
                              onClick={() => updateItem("image", image.id, "approve")}
                            >
                              이미지 승인
                            </button>
                            <button
                              className="btn-secondary !px-2 !py-1 !text-xs"
                              onClick={() => updateItem("image", image.id, "reject")}
                            >
                              이미지 반려
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">등록된 이미지가 없습니다.</p>
                  )}
                </div>
              </article>
            );
          })}
          {!places.length ? <p className="text-sm text-slate-500">대기 중인 장소 등록이 없습니다.</p> : null}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">동선 등록 대기</h2>
        <div className="mt-3 space-y-2">
          {plans.map((plan) => (
            <article key={plan.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">{plan.title || `Plan ${plan.id.slice(0, 6)}`}</p>
              <p className="mt-1 text-xs text-slate-600">
                stops: {(plan.place_ids || []).length} · by {plan.submitted_by || "anonymous"}
              </p>
              {plan.description ? <p className="mt-1 text-xs text-slate-600">{plan.description}</p> : null}
              {plan.extra_info ? <p className="mt-1 text-xs text-slate-500">{plan.extra_info}</p> : null}
              <div className="mt-2 flex gap-2">
                <button className="btn-primary" onClick={() => updateItem("plan", plan.id, "approve")}>
                  동선 승인
                </button>
                <button className="btn-secondary" onClick={() => updateItem("plan", plan.id, "reject")}>
                  동선 반려
                </button>
              </div>
            </article>
          ))}
          {!plans.length ? <p className="text-sm text-slate-500">대기 중인 동선 등록이 없습니다.</p> : null}
        </div>
      </section>
    </section>
  );
}
