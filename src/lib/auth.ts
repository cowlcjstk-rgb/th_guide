import crypto from "node:crypto";

export type AuthUser = {
  id: string;
  role: "admin" | "member";
  name: string;
  email: string;
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const AUTH_SECRET = process.env.AUTH_SECRET || "change-this-auth-secret";

function b64(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromB64(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

export function createAuthToken(user: AuthUser) {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + SESSION_TTL_MS,
  });
  const encoded = b64(payload);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function parseAuthToken(token?: string | null): AuthUser | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;
  try {
    const parsed = JSON.parse(fromB64(encoded)) as AuthUser & { exp: number };
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return {
      id: parsed.id,
      role: parsed.role,
      name: parsed.name,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeLoginId(loginId: string) {
  return loginId.trim().toLowerCase();
}

export function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}
