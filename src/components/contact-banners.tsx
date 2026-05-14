"use client";

import { trackClientEvent } from "@/components/analytics-tracker";

export default function ContactBanners({ source = "general" }: { source?: string }) {
  const channels = [
    {
      key: "kakao",
      title: "카카오톡 오픈채팅",
      href: "https://open.kakao.com/o/sW9C8Rui",
      image: "/banners/kakao-openchat.svg",
      alt: "카카오톡 오픈채팅 문의 배너",
    },
    {
      key: "line",
      title: "라인 오픈챗",
      href: "https://line.me/ti/g2/Qtxu4_Yt8Ii2PYERHPrxobMY-UzAjH91Lwy4Ug?utm_source=invitation&utm_medium=link_copy&utm_campaign=default",
      image: "/banners/line-openchat.svg",
      alt: "라인 오픈챗 문의 배너",
    },
    {
      key: "telegram",
      title: "텔레그램",
      href: "https://t.me/th_aapp",
      image: "/banners/telegram-contact.svg",
      alt: "텔레그램 문의 배너",
    },
  ];

  return (
    <section className="panel p-5 md:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">문의 채널</h2>
      <p className="mt-2 text-sm text-slate-600">등록/수정 문의는 아래 채널로 가능합니다.</p>
      <div className="mt-4 grid gap-3">
        {channels.map((channel) => (
          <a
            key={channel.key}
            href={channel.href}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            onClick={() =>
              trackClientEvent("support_channel_click", {
                source,
                channel: channel.key,
              })
            }
          >
            <img src={channel.image} alt={channel.alt} className="h-auto w-full" />
          </a>
        ))}
      </div>
    </section>
  );
}
