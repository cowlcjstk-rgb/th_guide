"use client";

import { FormEvent, useState } from "react";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function AdminPlacesPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [tags, setTags] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [result, setResult] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setResult("저장 중...");

    const res = await fetch("/api/admin/places", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        name,
        slug: slug || slugify(name),
        district,
        category,
        description,
        address,
        tags: tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        is_published: true,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setResult(`실패: ${data.error ?? "unknown error"}`);
      return;
    }
    setResult(`완료: ${data.place.name} (${data.place.slug})`);
  }

  return (
    <section className="w-full">
      <h1 className="text-2xl font-bold">관리자 장소 등록</h1>
      <p className="mt-2 text-sm text-slate-600">
        0원 MVP용 간단 등록 폼입니다. 태그는 콤마(,)로 구분하세요.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="관리자 토큰"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          required
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="장소명"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSlug(slugify(e.target.value));
          }}
          required
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="지역 (예: Sukhumvit)"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="카테고리 (예: 루프탑)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <textarea
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="설명"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="주소"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="태그 (예: 야경,데이트,BTS근처)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="위도"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="경도"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          저장
        </button>
      </form>
      <p className="mt-3 text-sm text-slate-700">{result}</p>
    </section>
  );
}
