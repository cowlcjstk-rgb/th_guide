export default function PrivacyPage() {
  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-slate-600">최종 업데이트: 2026-05-14</p>
      </header>
      <article className="panel space-y-4 p-6 text-sm leading-7 text-slate-700">
        <p>수집 항목: 이름, 전화번호, 이메일(필수), 카카오/라인/텔레그램 아이디(선택).</p>
        <p>이용 목적: 회원 식별, 문의 응대, 장소/동선 등록 심사 및 운영 공지.</p>
        <p>보관 기간: 회원 탈퇴 요청 또는 법령상 보관 의무 기간 종료 시까지.</p>
        <p>문의: /support 페이지에 제공된 공식 채널을 통해 요청할 수 있습니다.</p>
      </article>
    </section>
  );
}
