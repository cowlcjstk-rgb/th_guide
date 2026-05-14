import { redirect } from "next/navigation";
import { buildNightlifeUrl, getNightlifePlatformUrl } from "@/lib/nightlife-platform";

export const dynamic = "force-dynamic";

export default function ProductsPage() {
  const base = getNightlifePlatformUrl();
  if (base) {
    redirect(buildNightlifeUrl("/"));
  }

  return (
    <section className="panel p-6">
      <h1 className="text-2xl font-semibold tracking-tight">밤문화 플랫폼 분리 안내</h1>
      <p className="mt-2 text-sm text-slate-600">
        밤문화 서비스는 별도 도메인으로 분리되었습니다. 환경변수 `NIGHTLIFE_PLATFORM_URL` 또는 `NEXT_PUBLIC_NIGHTLIFE_PLATFORM_URL`을 설정해 주세요.
      </p>
    </section>
  );
}

