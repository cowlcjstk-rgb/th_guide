import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type EventPayload = {
  event_name: string;
  path?: string | null;
  referrer?: string | null;
  session_id?: string | null;
  user_id?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function trackEventServer(payload: EventPayload) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  try {
    await supabase.from("analytics_events").insert({
      event_name: payload.event_name,
      path: payload.path ?? null,
      referrer: payload.referrer ?? null,
      session_id: payload.session_id ?? null,
      user_id: payload.user_id ?? null,
      meta: payload.meta ?? {},
    });
  } catch {
    // Keep analytics non-blocking.
  }
}
