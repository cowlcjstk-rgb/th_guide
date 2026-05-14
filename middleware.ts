import { NextRequest, NextResponse } from "next/server";

const AUTH_SECRET = process.env.AUTH_SECRET || "change-this-auth-secret";

function base64UrlToBytes(base64url: string) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "===".slice((base64.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verifyToken(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  const expected = bytesToBase64Url(new Uint8Array(signed));
  if (expected !== signature) return null;

  try {
    const payloadText = new TextDecoder().decode(base64UrlToBytes(encoded));
    const payload = JSON.parse(payloadText) as { role?: string; exp?: number };
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();
  const token = req.cookies.get("tg_auth")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

