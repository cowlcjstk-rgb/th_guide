"use client";

import { FormEvent, useState } from "react";
import ContactBanners from "@/components/contact-banners";
import { useLanguage } from "@/components/language-provider";
import { PLACE_CATEGORIES, THAI_CITIES } from "@/lib/thai-options";

export default function RegisterPlacePage() {
  const { lang } = useLanguage();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Bangkok");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("Cafe");
  const [address, setAddress] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [tips, setTips] = useState("");
  const [nickname, setNickname] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");

  const t =
    lang === "ko"
      ? {
          title: "장소 등록",
          desc: "등록한 장소는 관리자 확인 후 공개됩니다.",
          sla: "등록 심사는 접수 후 최대 2일 이내 진행됩니다.",
          submit: "장소 등록 요청",
          sending: "등록 중...",
          ok: "등록 요청이 접수되었습니다. 승인 후 공개됩니다.",
          fail: "등록 실패",
          name: "장소명 (한글/영문)",
          district: "지역 (District)",
          category: "카테고리",
          city: "도시 (City)",
          address: "주소 (Address)",
          mapUrl: "구글맵 링크",
          description: "기본 정보 (Basic Info)",
          tags: "태그 (쉼표 구분)",
          tips: "운영 팁 (User Tip)",
          nickname: "작성자 닉네임 (선택)",
          exName: "예) 티추카 루프탑 / Tichuca Rooftop Bar",
          exDistrict: "예) Sukhumvit",
          exAddress: "예) T-One Building, Sukhumvit Rd, Bangkok 10110",
          exMap: "예) https://maps.app.goo.gl/xxxxx",
          exDesc: "예) 야경이 좋고 저녁 7시 이후 분위기가 좋습니다. / Great skyline view after 7 PM.",
          exTags: "예) 야경, 데이트, 루프탑",
          exTips: "예) 예약 후 방문 추천 / Reservation recommended",
          exNick: "예) 민지 / Minji",
        }
      : {
          title: "Place Registration",
          desc: "Your place will be published after admin approval.",
          sla: "Review SLA: your submission is reviewed within 2 days.",
          submit: "Submit Place Registration",
          sending: "Submitting...",
          ok: "Registration request submitted. It will be published after approval.",
          fail: "Submission failed",
          name: "Place Name (KO/EN)",
          district: "District",
          category: "Category",
          city: "City",
          address: "Address",
          mapUrl: "Google Maps URL",
          description: "Basic Info",
          tags: "Tags (comma separated)",
          tips: "User Tip",
          nickname: "Nickname (optional)",
          exName: "e.g. 티추카 루프탑 / Tichuca Rooftop Bar",
          exDistrict: "e.g. Sukhumvit",
          exAddress: "e.g. T-One Building, Sukhumvit Rd, Bangkok 10110",
          exMap: "e.g. https://maps.app.goo.gl/xxxxx",
          exDesc: "e.g. 야경이 좋고 저녁 7시 이후 분위기가 좋습니다. / Great skyline view after 7 PM.",
          exTags: "e.g. night view, date, rooftop",
          exTips: "e.g. Reservation recommended",
          exNick: "e.g. Minji",
        };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setResult("");
    const res = await fetch("/api/submissions/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        city,
        district,
        category,
        address,
        description,
        google_map_url: googleMapUrl,
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        tips,
        submitted_by: nickname,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setResult(`${t.fail}: ${data?.error ?? "unknown error"}`);
      return;
    }
    setName("");
    setDistrict("");
    setAddress("");
    setGoogleMapUrl("");
    setDescription("");
    setTags("");
    setTips("");
    setNickname("");
    setResult(t.ok);
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.desc}</p>
        <p className="mt-1 text-xs text-slate-500">{t.sla}</p>
      </header>

      <form onSubmit={onSubmit} className="panel grid gap-3 p-5 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-slate-500">{t.name}</p>
          <input className="input" placeholder={t.exName} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">{t.city}</p>
          <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
            {THAI_CITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.ko} / {item.en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">{t.district}</p>
          <input className="input" placeholder={t.exDistrict} value={district} onChange={(e) => setDistrict(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">{t.category}</p>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {PLACE_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.ko} / {item.en}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.address}</p>
          <input className="input" placeholder={t.exAddress} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.mapUrl}</p>
          <input className="input" placeholder={t.exMap} value={googleMapUrl} onChange={(e) => setGoogleMapUrl(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.description}</p>
          <textarea className="input min-h-24" placeholder={t.exDesc} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.tags}</p>
          <input className="input" placeholder={t.exTags} value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.tips}</p>
          <textarea className="input min-h-20" placeholder={t.exTips} value={tips} onChange={(e) => setTips(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.nickname}</p>
          <input className="input" placeholder={t.exNick} value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary md:col-span-2" disabled={pending}>
          {pending ? t.sending : t.submit}
        </button>
      </form>

      {result ? <p className="text-sm text-slate-700">{result}</p> : null}

      <ContactBanners />
    </section>
  );
}
