"use client";

import { useState } from "react";
import { Place, TripPlan } from "@/lib/types";

export default function AdminReviewPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [plans, setPlans] = useState<TripPlan[]>([]);

  async function loadQueue() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/review", {
      headers: {},
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error ?? "Failed to load queue");
      return;
    }
    setPlaces(data.places ?? []);
    setPlans(data.plans ?? []);
  }

  async function updateItem(type: "place" | "plan", id: string, action: "approve" | "reject") {
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, id, action }),
    });
    const data = await res.json();
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
          유저 장소 등록 요청과 동선 등록 요청을 승인/반려합니다.
        </p>
      </header>

      <div className="panel p-5">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <p className="text-sm text-slate-600">관리자 로그인 상태에서만 승인/반려 가능합니다.</p>
          <button className="btn-primary" onClick={loadQueue} disabled={loading}>
            {loading ? "Loading..." : "대기 목록 불러오기"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-rose-600">{message}</p> : null}
      </div>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">장소 등록 대기</h2>
        <div className="mt-3 space-y-2">
          {places.map((place) => (
            <article key={place.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">{place.name}</p>
              <p className="mt-1 text-xs text-slate-600">
                {place.city ?? "Unknown city"} · {place.district ?? "Unknown district"} · {place.category ?? "General"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{place.submitted_by || "anonymous"}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn-primary" onClick={() => updateItem("place", place.id, "approve")}>
                  승인
                </button>
                <button className="btn-secondary" onClick={() => updateItem("place", place.id, "reject")}>
                  반려
                </button>
              </div>
            </article>
          ))}
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
                  승인
                </button>
                <button className="btn-secondary" onClick={() => updateItem("plan", plan.id, "reject")}>
                  반려
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
