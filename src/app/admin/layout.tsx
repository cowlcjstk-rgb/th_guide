import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseAuthToken } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("tg_auth")?.value;
  const user = parseAuthToken(token);
  if (!user || user.role !== "admin") {
    redirect("/auth/login");
  }
  return <>{children}</>;
}
