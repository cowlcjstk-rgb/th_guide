import { NextRequest } from "next/server";
import { parseAuthToken } from "@/lib/auth";

export const AUTH_COOKIE = "tg_auth";

export type MemberSession = {
  id: string;
  role: "member";
  name: string;
  email: string;
};

export function getMemberSession(req: NextRequest): MemberSession | null {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const user = parseAuthToken(token);
  if (!user || user.role !== "member") return null;
  return {
    id: user.id,
    role: "member",
    name: user.name,
    email: user.email,
  };
}
