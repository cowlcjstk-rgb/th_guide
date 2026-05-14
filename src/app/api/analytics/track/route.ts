import { NextRequest, NextResponse } from "next/server";
import { trackEventServer } from "@/lib/analytics";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "place_submit_start",
  "place_submit_complete",
  "trip_plan_submit_start",
  "trip_plan_submit_complete",
  "review_submit_complete",
  "signup_complete",
  "route_mode_change",
  "place_edit_request_submit_start",
  "place_share_click",
  "place_save_click",
  "support_channel_click",
]);

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    event_name?: string;
    path?: string;
    referrer?: string;
    session_id?: string;
    meta?: Record<string, unknown>;
  };
  const eventName = body.event_name?.trim();
  if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json({ error: "Invalid event name." }, { status: 400 });
  }

  await trackEventServer({
    event_name: eventName,
    path: body.path?.slice(0, 300) ?? req.nextUrl.pathname,
    referrer: body.referrer?.slice(0, 800) ?? req.headers.get("referer"),
    session_id: body.session_id?.slice(0, 120) ?? null,
    meta: body.meta ?? {},
  });

  return NextResponse.json({ ok: true });
}
