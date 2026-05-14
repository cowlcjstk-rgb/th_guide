import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function getCount(table: string, apply?: (q: any) => any) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return 0;
  let query: any = supabase.from(table).select("*", { count: "exact", head: true });
  if (apply) query = apply(query);
  const { count } = await query;
  return count ?? 0;
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export default async function AdminDashboardPage() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return <section className="panel p-6">서버 환경변수(Supabase service role)가 필요합니다.</section>;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalPlaces,
    publishedPlaces,
    pendingPlaces,
    withCoords,
    totalMembers,
    newMembers30d,
    totalReviews,
    approvedPlans,
    pendingPlans,
    views7d,
    placeSubmitPageViews7d,
    placeSubmitComplete7d,
    mapPageViews7d,
    routeSubmitComplete7d,
    signupPageViews7d,
    signupComplete7d,
    placesLiteRes,
    reviewsLiteRes,
    plansTopRes,
    pageViewRowsRes,
  ] = await Promise.all([
    getCount("places"),
    getCount("places", (q) => q.eq("is_published", true)),
    getCount("places", (q) => q.eq("submission_status", "pending")),
    getCount("places", (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    getCount("members"),
    getCount("members", (q) => q.gte("created_at", thirtyDaysAgo)),
    getCount("place_reviews"),
    getCount("trip_plans", (q) => q.eq("status", "approved")),
    getCount("trip_plans", (q) => q.eq("status", "pending")),
    getCount("analytics_events", (q) => q.eq("event_name", "page_view").gte("created_at", sevenDaysAgo)),
    getCount("analytics_events", (q) => q.eq("event_name", "page_view").gte("created_at", sevenDaysAgo).ilike("path", "/submit/place%")),
    getCount("analytics_events", (q) => q.eq("event_name", "place_submit_complete").gte("created_at", sevenDaysAgo)),
    getCount("analytics_events", (q) => q.eq("event_name", "page_view").gte("created_at", sevenDaysAgo).ilike("path", "/map%")),
    getCount("analytics_events", (q) => q.eq("event_name", "trip_plan_submit_complete").gte("created_at", sevenDaysAgo)),
    getCount("analytics_events", (q) => q.eq("event_name", "page_view").gte("created_at", sevenDaysAgo).ilike("path", "/signup%")),
    getCount("analytics_events", (q) => q.eq("event_name", "signup_complete").gte("created_at", sevenDaysAgo)),
    supabase.from("places").select("id,name,city,category,is_published,created_at").order("created_at", { ascending: false }).limit(5000),
    supabase.from("place_reviews").select("place_id,rating").limit(5000),
    supabase.from("trip_plans").select("id,title,place_ids,created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(5),
    supabase.from("analytics_events").select("path").eq("event_name", "page_view").gte("created_at", sevenDaysAgo).limit(5000),
  ]);

  const placesLite = placesLiteRes.data ?? [];
  const reviewsLite = reviewsLiteRes.data ?? [];
  const plansTop = plansTopRes.data ?? [];
  const pageViewRows = pageViewRowsRes.data ?? [];

  const cityMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  let createdLast7d = 0;
  placesLite.forEach((place) => {
    if (place.is_published) {
      cityMap.set(place.city || "Unknown", (cityMap.get(place.city || "Unknown") ?? 0) + 1);
      categoryMap.set(place.category || "General", (categoryMap.get(place.category || "General") ?? 0) + 1);
    }
    if (place.created_at && place.created_at >= sevenDaysAgo) createdLast7d += 1;
  });
  const topCities = Array.from(cityMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topCategories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const avgRating =
    reviewsLite.length > 0
      ? (reviewsLite.reduce((sum, row) => sum + Number(row.rating || 0), 0) / reviewsLite.length).toFixed(2)
      : "0.00";

  const pathMap = new Map<string, number>();
  pageViewRows.forEach((row) => {
    const path = typeof row.path === "string" && row.path.length > 0 ? row.path : "/";
    pathMap.set(path, (pathMap.get(path) ?? 0) + 1);
  });
  const topPaths = Array.from(pathMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">관리자 대시보드</h1>
        <p className="mt-2 text-sm text-slate-600">운영 지표와 유입/전환 지표를 함께 확인합니다.</p>
        <p className="mt-1 text-xs text-slate-500">등록 심사 SLA: 요청 후 최대 2일 이내 1차 결과 처리</p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4"><p className="text-xs text-slate-500">전체 장소</p><p className="mt-1 text-3xl font-semibold">{totalPlaces}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">공개 장소</p><p className="mt-1 text-3xl font-semibold">{publishedPlaces}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">승인 대기 장소</p><p className="mt-1 text-3xl font-semibold">{pendingPlaces}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">좌표 등록률</p><p className="mt-1 text-3xl font-semibold">{totalPlaces > 0 ? Math.round((withCoords / totalPlaces) * 100) : 0}%</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">회원 수</p><p className="mt-1 text-3xl font-semibold">{totalMembers}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">최근 30일 신규 회원</p><p className="mt-1 text-3xl font-semibold">{newMembers30d}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">리뷰 수 / 평균 별점</p><p className="mt-1 text-3xl font-semibold">{totalReviews} / {avgRating}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">동선 승인/대기</p><p className="mt-1 text-3xl font-semibold">{approvedPlans}/{pendingPlans}</p></div>
      </div>

      <div className="panel p-5">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-base font-semibold">분석 이벤트 대시보드 (최근 7일)</h2>
          <Link href="/admin/review" className="text-xs text-slate-500 hover:text-slate-900">승인 관리로 이동</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="card p-4"><p className="text-xs text-slate-500">총 페이지뷰</p><p className="mt-1 text-2xl font-semibold">{views7d}</p></div>
          <div className="card p-4"><p className="text-xs text-slate-500">장소 등록 전환율</p><p className="mt-1 text-2xl font-semibold">{percent(placeSubmitComplete7d, placeSubmitPageViews7d)}%</p><p className="mt-1 text-xs text-slate-500">{placeSubmitComplete7d}/{placeSubmitPageViews7d}</p></div>
          <div className="card p-4"><p className="text-xs text-slate-500">동선 등록 전환율</p><p className="mt-1 text-2xl font-semibold">{percent(routeSubmitComplete7d, mapPageViews7d)}%</p><p className="mt-1 text-xs text-slate-500">{routeSubmitComplete7d}/{mapPageViews7d}</p></div>
          <div className="card p-4"><p className="text-xs text-slate-500">회원가입 전환율</p><p className="mt-1 text-2xl font-semibold">{percent(signupComplete7d, signupPageViews7d)}%</p><p className="mt-1 text-xs text-slate-500">{signupComplete7d}/{signupPageViews7d}</p></div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">상위 유입 페이지</p>
          <div className="mt-2 grid gap-1 text-sm text-slate-700">
            {topPaths.map(([path, count]) => <p key={path}>{path}: {count}</p>)}
            {topPaths.length === 0 ? <p className="text-slate-500">데이터가 아직 없습니다.</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-4">
          <p className="text-sm font-semibold text-slate-900">도시별 공개 장소</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            {topCities.map(([city, count]) => <p key={city}>{city}: {count}</p>)}
          </div>
        </div>
        <div className="panel p-4">
          <p className="text-sm font-semibold text-slate-900">카테고리별 공개 장소</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            {topCategories.map(([cat, count]) => <p key={cat}>{cat}: {count}</p>)}
          </div>
        </div>
        <div className="panel p-4">
          <p className="text-sm font-semibold text-slate-900">운영 요약</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p>최근 7일 신규 장소: {createdLast7d}</p>
            <p>장소 승인 대기: {pendingPlaces}</p>
            <p>동선 승인 대기: {pendingPlans}</p>
          </div>
        </div>
      </div>

      <section className="panel p-5">
        <h2 className="text-base font-semibold">최근 인기 동선 TOP5</h2>
        <div className="mt-3 grid gap-2">
          {plansTop.length > 0 ? plansTop.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">{plan.title ?? "제목 없는 동선"}</p>
              <p className="mt-1 text-xs text-slate-600">
                장소 {Array.isArray(plan.place_ids) ? plan.place_ids.length : 0}개 ·{" "}
                {plan.created_at ? new Date(plan.created_at).toLocaleDateString("ko-KR") : "-"}
              </p>
            </div>
          )) : <p className="text-sm text-slate-500">승인된 동선이 아직 없습니다.</p>}
        </div>
      </section>
    </section>
  );
}
