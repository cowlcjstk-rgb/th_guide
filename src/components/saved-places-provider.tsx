"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type SavedPlacesContextValue = {
  savedIds: string[];
  loading: boolean;
  isSaved: (placeId: string) => boolean;
  toggleSaved: (placeId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const SavedPlacesContext = createContext<SavedPlacesContextValue | null>(null);

export function SavedPlacesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isMember = user?.role === "member";

  const refresh = async () => {
    if (!isMember) {
      setSavedIds([]);
      return;
    }
    setLoading(true);
    const res = await fetch("/api/me/saved-places", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      setSavedIds(Array.isArray(data?.saved_place_ids) ? data.saved_place_ids.map((x: unknown) => String(x)) : []);
    } else {
      setSavedIds([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, [isMember]);

  const isSaved = (placeId: string) => savedIds.includes(placeId);

  const toggleSaved = async (placeId: string) => {
    if (!isMember || !placeId) return;
    const currentlySaved = savedIds.includes(placeId);
    setSavedIds((prev) => (currentlySaved ? prev.filter((id) => id !== placeId) : [placeId, ...prev]));

    const res = await fetch("/api/me/saved-places", {
      method: currentlySaved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id: placeId }),
    });
    if (!res.ok) {
      await refresh();
    }
  };

  const value = useMemo(
    () => ({
      savedIds,
      loading,
      isSaved,
      toggleSaved,
      refresh,
    }),
    [savedIds, loading]
  );

  return <SavedPlacesContext.Provider value={value}>{children}</SavedPlacesContext.Provider>;
}

export function useSavedPlaces() {
  const ctx = useContext(SavedPlacesContext);
  if (!ctx) throw new Error("useSavedPlaces must be used inside SavedPlacesProvider");
  return ctx;
}
