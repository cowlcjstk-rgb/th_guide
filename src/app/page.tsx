import Link from "next/link";

export default function Home() {
  return (
    <section className="w-full">
      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-12 text-white">
        <p className="text-sm font-medium">방콕 플레이스 정보 플랫폼</p>
        <h1 className="mt-2 text-3xl font-bold">직접 방문 기반 장소 큐레이션</h1>
        <p className="mt-3 text-sm text-cyan-100">
          한국인 여행자를 위한 최신 장소 정보를 0원 시작 MVP로 운영합니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/places"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700"
          >
            장소 보기
          </Link>
          <Link
            href="/map"
            className="rounded-lg border border-cyan-200 px-4 py-2 text-sm font-semibold text-white"
          >
            지도 탐색
          </Link>
        </div>
      </div>
    </section>
  );
}
