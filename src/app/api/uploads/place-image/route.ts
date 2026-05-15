import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const BUCKET_NAME = "place-submissions";
const MB = 1024 * 1024;
const DEFAULT_MAX_FILE_SIZE_MB = 6;
const DEFAULT_TOTAL_QUOTA_MB = 2048;
const MAX_FILE_SIZE_MB = Number.parseInt(process.env.PLACE_IMAGE_MAX_FILE_MB ?? `${DEFAULT_MAX_FILE_SIZE_MB}`, 10);
const TOTAL_QUOTA_MB = Number.parseInt(process.env.PLACE_IMAGE_TOTAL_QUOTA_MB ?? `${DEFAULT_TOTAL_QUOTA_MB}`, 10);
const MAX_FILE_SIZE = Math.max(1, Number.isFinite(MAX_FILE_SIZE_MB) ? MAX_FILE_SIZE_MB : DEFAULT_MAX_FILE_SIZE_MB) * MB;
const TOTAL_QUOTA_BYTES = Math.max(1, Number.isFinite(TOTAL_QUOTA_MB) ? TOTAL_QUOTA_MB : DEFAULT_TOTAL_QUOTA_MB) * MB;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getExtension(fileName: string, mimeType: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".gif")) return "gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

async function ensurePublicBucket(supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>) {
  const listRes = await supabase.storage.listBuckets();
  if (listRes.error) return listRes.error.message;

  const hasBucket = (listRes.data ?? []).some((bucket) => bucket.name === BUCKET_NAME);
  if (hasBucket) return null;

  const createRes = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
  });
  if (createRes.error && !createRes.error.message.toLowerCase().includes("already exists")) {
    return createRes.error.message;
  }
  return null;
}

function parseNumericLike(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

async function getCurrentUsageBytes(supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>) {
  const rpcRes = await supabase.rpc("get_place_submission_image_usage_bytes");
  if (!rpcRes.error) {
    return Math.max(0, Math.round(parseNumericLike(rpcRes.data)));
  }

  // Fallback for projects that have not run the usage RPC migration yet.
  const rowsRes = await supabase.from("place_submission_images").select("file_size_bytes").limit(5000);
  if (rowsRes.error) return 0;
  const total = (rowsRes.data ?? []).reduce((sum, row) => {
    return sum + Math.max(0, Math.round(parseNumericLike((row as { file_size_bytes?: unknown }).file_size_bytes)));
  }, 0);
  return total;
}

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, "uploads:place-image", { max: 12, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const bucketError = await ensurePublicBucket(supabase);
  if (bucketError) return NextResponse.json({ error: bucketError }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "only image files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `max file size is ${MAX_FILE_SIZE / MB}MB` }, { status: 400 });
  }

  const usageBeforeBytes = await getCurrentUsageBytes(supabase);
  if (usageBeforeBytes + file.size > TOTAL_QUOTA_BYTES) {
    return NextResponse.json(
      {
        error: "image storage quota exceeded",
        quota_bytes: TOTAL_QUOTA_BYTES,
        used_bytes: usageBeforeBytes,
      },
      { status: 400 }
    );
  }

  const extension = getExtension(file.name, file.type);
  const now = new Date();
  const path = `submit-place/${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadRes = await supabase.storage.from(BUCKET_NAME).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadRes.error) return NextResponse.json({ error: uploadRes.error.message }, { status: 400 });

  const publicRes = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  const url = publicRes.data.publicUrl;
  if (!url) return NextResponse.json({ error: "failed to build public url" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    url,
    path,
    bucket: BUCKET_NAME,
    file_name: file.name,
    mime_type: file.type,
    file_size_bytes: file.size,
    max_file_size_bytes: MAX_FILE_SIZE,
    usage_before_bytes: usageBeforeBytes,
    usage_after_bytes: usageBeforeBytes + file.size,
    quota_bytes: TOTAL_QUOTA_BYTES,
  });
}
