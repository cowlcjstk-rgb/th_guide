"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "tg_session_id";

function getSessionId() {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const generated = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(SESSION_KEY, generated);
  return generated;
}

export function trackClientEvent(eventName: string, meta: Record<string, unknown> = {}) {
  const payload = {
    event_name: eventName,
    path: typeof window !== "undefined" ? window.location.pathname : "/",
    referrer: typeof document !== "undefined" ? document.referrer : "",
    session_id: getSessionId(),
    meta,
  };
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const fullPath = useMemo(() => pathname, [pathname]);
  const lastTrackedRef = useRef<string>("");

  useEffect(() => {
    if (!fullPath || lastTrackedRef.current === fullPath) return;
    lastTrackedRef.current = fullPath;
    trackClientEvent("page_view", {
      full_path: fullPath,
      language: typeof navigator !== "undefined" ? navigator.language : null,
    });
  }, [fullPath]);

  return null;
}
