"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import ContactBanners from "@/components/contact-banners";
import { trackClientEvent } from "@/components/analytics-tracker";
import { useLanguage } from "@/components/language-provider";
import { Place } from "@/lib/types";

type UploadResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
  bucket?: string;
  path?: string;
  file_name?: string;
  mime_type?: string;
  file_size_bytes?: number;
  max_file_size_bytes?: number;
  usage_before_bytes?: number;
  usage_after_bytes?: number;
  quota_bytes?: number;
};

type UploadedImageMeta = {
  url: string;
  bucket: string;
  path: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
};

type SearchResponse = {
  places: Place[];
  page: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
};

export default function PlaceEditRequestPage() {
  const { lang } = useLanguage();
  const [keyword, setKeyword] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URL(window.location.href).searchParams.get("q")?.trim() ?? "";
  });
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [tips, setTips] = useState("");
  const [reason, setReason] = useState("");
  const [nickname, setNickname] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadedImageMeta, setUploadedImageMeta] = useState<UploadedImageMeta | null>(null);
  const [imageUsageText, setImageUsageText] = useState("");
  const [imageUploadPending, setImageUploadPending] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  function formatBytes(bytes?: number) {
    if (!bytes || !Number.isFinite(bytes)) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024;
      idx += 1;
    }
    return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  }

  const t =
    lang === "ko"
      ? {
          title: "장소 수정 요청",
          desc: "기존 장소를 선택하고 수정이 필요한 내용을 요청해 주세요.",
          submit: "수정 요청 등록",
          sending: "등록 중...",
          searchLabel: "기존 장소 검색",
          searchPh: "장소명 또는 태그 검색",
          searchBtn: "검색",
          selectHint: "검색 결과에서 1개 장소를 선택하세요.",
          selected: "선택 장소",
          noResult: "검색 결과가 없습니다.",
          reason: "수정 사유",
          nickname: "작성자 닉네임 (선택)",
          name: "장소명 수정",
          city: "도시 수정",
          category: "카테고리 수정",
          address: "주소 수정",
          mapUrl: "Google Maps URL 수정",
          description: "설명 수정",
          tags: "태그 수정 (콤마 구분)",
          tips: "운영 팁 수정",
          imageTitle: "이미지 수정 (1장)",
          imageHint: "JPG, PNG, WEBP, GIF / 최대 6MB",
          imageUpload: "이미지 업로드",
          imageUploading: "업로드 중...",
          imageUploaded: "업로드 완료",
          imageUploadNeedFile: "업로드할 이미지를 먼저 선택해 주세요.",
          ok: "수정 요청이 접수되었습니다. 관리자 검토 후 반영됩니다.",
          fail: "요청 등록 실패",
        }
      : {
          title: "Place Edit Request",
          desc: "Select an existing place and submit your correction request.",
          submit: "Submit edit request",
          sending: "Submitting...",
          searchLabel: "Search existing place",
          searchPh: "Search by place name or tag",
          searchBtn: "Search",
          selectHint: "Select one place from the results.",
          selected: "Selected place",
          noResult: "No results found.",
          reason: "Reason",
          nickname: "Nickname (optional)",
          name: "Name update",
          city: "City update",
          category: "Category update",
          address: "Address update",
          mapUrl: "Google Maps URL update",
          description: "Description update",
          tags: "Tags update (comma separated)",
          tips: "Tips update",
          imageTitle: "Image update (1 file)",
          imageHint: "JPG, PNG, WEBP, GIF / Max 6MB",
          imageUpload: "Upload Image",
          imageUploading: "Uploading...",
          imageUploaded: "Uploaded",
          imageUploadNeedFile: "Please choose an image first.",
          ok: "Edit request submitted. It will be reviewed by admin.",
          fail: "Failed to submit request",
        };

  function handleImageFileChange(file: File | null) {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setUploadedImageUrl("");
    setUploadedImageMeta(null);
    setImageUsageText("");
    setImageUploadError("");
    if (!file) {
      setImagePreviewUrl("");
      return;
    }
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function uploadSelectedImage(file?: File | null) {
    const target = file ?? imageFile;
    if (!target) {
      setImageUploadError(t.imageUploadNeedFile);
      return null;
    }

    setImageUploadPending(true);
    setImageUploadError("");
    trackClientEvent("place_edit_image_upload_start", { page: "/submit/place-edit", size: target.size });

    const form = new FormData();
    form.append("file", target);

    const res = await fetch("/api/uploads/place-image", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as UploadResponse;

    setImageUploadPending(false);
    if (!res.ok || !data.url) {
      const msg = data.error ?? "upload failed";
      setImageUploadError(msg);
      trackClientEvent("place_edit_image_upload_fail", { page: "/submit/place-edit", error: msg });
      return null;
    }

    setUploadedImageUrl(data.url);
    setUploadedImageMeta({
      url: data.url,
      bucket: data.bucket ?? "place-submissions",
      path: data.path ?? "",
      file_name: data.file_name ?? target.name,
      mime_type: data.mime_type ?? target.type,
      file_size_bytes: Number(data.file_size_bytes ?? target.size),
    });

    if (data.usage_after_bytes && data.quota_bytes) {
      setImageUsageText(`${formatBytes(data.usage_after_bytes)} / ${formatBytes(data.quota_bytes)}`);
    } else if (data.file_size_bytes) {
      setImageUsageText(formatBytes(data.file_size_bytes));
    }

    trackClientEvent("place_edit_image_upload_complete", { page: "/submit/place-edit" });
    return data.url;
  }

  const hasAnyChanges = useMemo(
    () =>
      [name, city, category, address, googleMapUrl, description, tags, tips, uploadedImageUrl].some((v) => v.trim().length > 0) ||
      Boolean(imageFile),
    [name, city, category, address, googleMapUrl, description, tags, tips, uploadedImageUrl, imageFile]
  );
  const visibleResults = keyword.trim() ? results : [];

  const runSearch = useCallback(async (forcedKeyword?: string) => {
    const searchKeyword = (forcedKeyword ?? keyword).trim();
    if (!searchKeyword) {
      setResults([]);
      return;
    }
    setSearching(true);
    const params = new URLSearchParams({
      q: searchKeyword,
      category: "all",
      limit: "30",
      offset: "0",
    });
    const res = await fetch(`/api/places/search?${params.toString()}`);
    const data = (await res.json()) as SearchResponse | { error?: string };
    setSearching(false);
    if (!res.ok) {
      setResult((data as { error?: string })?.error ?? "Search failed");
      return;
    }
    setResults((data as SearchResponse).places ?? []);
  }, [keyword]);

  useEffect(() => {
    const q = keyword.trim();
    if (!q) return;
    const timer = setTimeout(() => {
      void runSearch(q);
    }, 220);
    return () => clearTimeout(timer);
  }, [keyword, runSearch]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlace || !hasAnyChanges) return;
    setPending(true);
    setResult("");
    trackClientEvent("place_edit_request_submit_start", { page: "/submit/place-edit" });

    let finalImageUrl = uploadedImageUrl.trim();
    if (!finalImageUrl && imageFile) {
      const uploaded = await uploadSelectedImage(imageFile);
      if (!uploaded) {
        setPending(false);
        setResult(`${t.fail}: ${imageUploadError || "image upload failed"}`);
        return;
      }
      finalImageUrl = uploaded;
    }

    const requestedChanges: Record<string, unknown> = {};
    if (name.trim()) requestedChanges.name = name.trim();
    if (city.trim()) requestedChanges.city = city.trim();
    if (category.trim()) requestedChanges.category = category.trim();
    if (address.trim()) requestedChanges.address = address.trim();
    if (googleMapUrl.trim()) requestedChanges.google_map_url = googleMapUrl.trim();
    if (description.trim()) requestedChanges.description = description.trim();
    if (tips.trim()) requestedChanges.tips = tips.trim();
    if (tags.trim()) {
      requestedChanges.tags = tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (finalImageUrl) {
      requestedChanges.image_url = finalImageUrl;
      if (uploadedImageMeta && uploadedImageMeta.url === finalImageUrl) {
        requestedChanges.image_upload = uploadedImageMeta;
      }
    }

    const res = await fetch("/api/submissions/place-edits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place_id: selectedPlace.id,
        requested_changes: requestedChanges,
        reason,
        submitted_by: nickname,
      }),
    });

    const data = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setResult(`${t.fail}: ${data?.error ?? "unknown error"}`);
      return;
    }

    setName("");
    setCity("");
    setCategory("");
    setAddress("");
    setGoogleMapUrl("");
    setDescription("");
    setTags("");
    setTips("");
    setReason("");
    setNickname("");
    handleImageFileChange(null);
    setUploadedImageUrl("");
    setUploadedImageMeta(null);
    setImageUsageText("");
    setResult(t.ok);
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.desc}</p>
      </header>

      <section className="panel p-5">
        <p className="mb-2 text-xs text-slate-500">{t.searchLabel}</p>
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input
            className="input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t.searchPh}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
          />
          <button className="btn-secondary" onClick={() => void runSearch()} disabled={searching}>
            {searching ? "..." : t.searchBtn}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t.selectHint}</p>

        <div className="mt-3 grid gap-2">
          {visibleResults.map((place) => (
            <button
              key={place.id}
              className={`rounded-xl border p-3 text-left ${selectedPlace?.id === place.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-800"}`}
              onClick={() => setSelectedPlace(place)}
            >
              <p className="text-sm font-semibold">{place.name}</p>
              <p className={`mt-1 text-xs ${selectedPlace?.id === place.id ? "text-slate-200" : "text-slate-500"}`}>
                {(place.city ?? "Unknown city")} · {(place.category ?? "General")}
              </p>
            </button>
          ))}
          {!searching && keyword.trim() && visibleResults.length === 0 ? <p className="text-sm text-slate-500">{t.noResult}</p> : null}
        </div>
      </section>

      <form onSubmit={onSubmit} className="panel grid gap-3 p-5 md:grid-cols-2">
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <p className="text-xs text-slate-500">{t.selected}</p>
          <p className="mt-1 font-semibold text-slate-900">{selectedPlace ? selectedPlace.name : "-"}</p>
        </div>

        <div>
          <p className="mb-1 text-xs text-slate-500">{t.name}</p>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">{t.city}</p>
          <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">{t.category}</p>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">{t.address}</p>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.mapUrl}</p>
          <input className="input" value={googleMapUrl} onChange={(e) => setGoogleMapUrl(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.description}</p>
          <textarea className="input min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.tags}</p>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.tips}</p>
          <textarea className="input min-h-20" value={tips} onChange={(e) => setTips(e.target.value)} />
        </div>

        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.imageTitle}</p>
          <p className="mb-2 text-[11px] text-slate-500">{t.imageHint}</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="input file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-1 file:text-xs file:font-semibold"
              onChange={(e) => handleImageFileChange(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void uploadSelectedImage()}
              disabled={imageUploadPending}
            >
              {imageUploadPending ? t.imageUploading : t.imageUpload}
            </button>
          </div>

          {imagePreviewUrl ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
              <img src={imagePreviewUrl} alt="edit preview" className="h-44 w-full rounded-lg object-cover sm:h-52" />
            </div>
          ) : null}

          {uploadedImageUrl ? <p className="mt-2 text-xs text-emerald-700">{t.imageUploaded}</p> : null}
          {uploadedImageMeta ? (
            <p className="mt-1 text-xs text-slate-500">
              File: {uploadedImageMeta.file_name} ({formatBytes(uploadedImageMeta.file_size_bytes)})
            </p>
          ) : null}
          {imageUsageText ? <p className="mt-1 text-xs text-slate-500">Storage usage: {imageUsageText}</p> : null}
          {imageUploadError ? <p className="mt-2 text-xs text-rose-600">{imageUploadError}</p> : null}
        </div>

        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.reason}</p>
          <textarea className="input min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.nickname}</p>
          <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>

        <button
          type="submit"
          className="btn-primary md:col-span-2"
          disabled={pending || imageUploadPending || !selectedPlace || !hasAnyChanges}
        >
          {pending ? t.sending : t.submit}
        </button>
      </form>

      {result ? <p className="text-sm text-slate-700">{result}</p> : null}
      <ContactBanners />
    </section>
  );
}
