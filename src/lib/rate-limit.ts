import { NextRequest, NextResponse } from "next/server";

type LimitConfig = {
  max: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Bucket>();

function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function applyRateLimit(
  req: NextRequest,
  key: string,
  { max, windowMs }: LimitConfig
) {
  const ip = getClientIp(req);
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const bucket = store.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    store.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return NextResponse.json(
      { error: "too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)),
        },
      }
    );
  }

  return null;
}
