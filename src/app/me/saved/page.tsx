"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlaceCard from "@/components/place-card";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";
import { useSavedPlaces } from "@/components/saved-places-provider";
import { Place } from "@/lib/types";

type SavedPlacesResponse = {
  saved_place_ids: string[];
  places: Place[];
};

export default function MySavedPlacesPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { refresh, isSaved, toggleSaved } = useSavedPlaces();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const t =
    lang === "ko"
      ? {
          title: "내 저장 장소",
          desc: "계정 기반으로 저장된 장소입니다. 다른 기기에서도 동일하게 확인할 수 있습니다.",
          needLogin: "로그인이 필요합니다.",
          login: "로그인 페이지로 이동",
          empty: "저장한 장소가 없습니다.",
          refresh: "새로고침",
          remove: "저장 해제",
        }
      : {
          title: "My Saved Places",
          desc: "These saved places are synced to your account and available on all devices.",
          needLogin: "Please login first.",
          login: "Go to login",
          empty: "No saved places yet.",
          refresh: "Refresh",
          remove: "Unsave",
        };

  async function load() {
    if (user?.role !== "member") {
      setLoading(false);
      setPlaces([]);
      return;
    }
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/me/saved-places?full=1", { cache: "no-store" });
    const data = (await res.json()) as SavedPlacesResponse | { error?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage((data as { error?: string })?.error ?? "Failed to load saved places");
      return;
    }
    setPlaces((data as SavedPlacesResponse).places ?? []);
  }

  useEffect(() => {
    void load();
  }, [user?.id, user?.role]);

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.desc}</p>
      </header>

      <section className="panel p-5">
        {loading ? (
          <p className="text-sm text-slate-600">Loading...</p>
        ) : user?.role !== "member" ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{t.needLogin}</p>
            <Link href="/auth/login" className="btn-secondary inline-flex">{t.login}</Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">{places.length} places</p>
              <button
                className="btn-secondary"
                onClick={async () => {
                  await refresh();
                  await load();
                }}
              >
                {t.refresh}
              </button>
            </div>

            {message ? <p className="mb-3 text-sm text-rose-600">{message}</p> : null}

            {places.length === 0 ? (
              <p className="text-sm text-slate-500">{t.empty}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {places.map((place) => (
                  <div key={place.id} className="space-y-2">
                    <PlaceCard place={place} />
                    {isSaved(place.id) ? (
                      <button
                        className="btn-secondary w-full"
                        onClick={async () => {
                          await toggleSaved(place.id);
                          await load();
                        }}
                      >
                        {t.remove}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </section>
  );
}
