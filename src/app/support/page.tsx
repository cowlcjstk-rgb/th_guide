import ContactBanners from "@/components/contact-banners";

export default function SupportPage() {
  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">고객 문의</h1>
        <p className="mt-2 text-sm text-slate-600">
          문의는 카카오톡, 라인, 텔레그램 채널로 접수해주세요.
        </p>
      </header>
      <ContactBanners />
    </section>
  );
}
