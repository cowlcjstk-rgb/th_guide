import { NextRequest } from "next/server";
import { parseAuthToken } from "@/lib/auth";

export function isAdminRequest(req: NextRequest) {
  const tokenHeader = req.headers.get("x-admin-token");
  if (tokenHeader && tokenHeader === process.env.ADMIN_WRITE_TOKEN) return true;
  const cookieToken = req.cookies.get("tg_auth")?.value;
  const user = parseAuthToken(cookieToken);
  return user?.role === "admin";
}

