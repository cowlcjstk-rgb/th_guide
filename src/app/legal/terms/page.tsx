export default function TermsPage() {
  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">이용약관</h1>
        <p className="mt-2 text-sm text-slate-600">최종 업데이트: 2026-05-14</p>
      </header>
      <article className="panel space-y-4 p-6 text-sm leading-7 text-slate-700">
        <p>본 서비스는 태국 여행 장소 정보와 커뮤니티 리뷰 제공을 목적으로 운영됩니다.</p>
        <p>사용자 등록 콘텐츠는 운영 정책에 따라 심사 후 공개/보류/삭제될 수 있습니다.</p>
        <p>등록 심사 SLA: 접수 후 최대 2일 이내 1차 심사 결과를 제공합니다.</p>
        <p>허위, 광고성 스팸, 불법 콘텐츠 등록 시 계정 제한이 적용될 수 있습니다.</p>
      </article>
    </section>
  );
}
