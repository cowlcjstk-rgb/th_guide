"use client";

import { FormEvent, useEffect, useState } from "react";
import ContactBanners from "@/components/contact-banners";
import { trackClientEvent } from "@/components/analytics-tracker";
import { useLanguage } from "@/components/language-provider";
import { PLACE_CATEGORIES, THAI_CITIES } from "@/lib/thai-options";

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

export default function RegisterPlacePage() {
  const { lang } = useLanguage();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Bangkok");
  const [category, setCategory] = useState("Cafe");
  const [address, setAddress] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [tips, setTips] = useState("");
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
          title: "장소 등록",
          desc: "등록한 장소는 관리자 검수 후 공개됩니다.",
          sla: "요청 후 최대 2일 이내 등록 심사가 진행됩니다.",
          submit: "장소 등록 요청",
          sending: "등록 중...",
          ok: "등록 요청이 접수되었습니다. 검수 후 공개됩니다.",
          fail: "등록 실패",
          name: "장소명 (한국어/영어)",
          category: "카테고리",
          city: "도시 (City)",
          address: "주소",
          mapUrl: "Google Maps URL",
          description: "기본 정보",
          tags: "태그 (콤마 구분)",
          tips: "운영 팁",
          nickname: "작성자 닉네임 (선택)",
          imageTitle: "이미지 첨부 (1장)",
          imageHint: "JPG, PNG, WEBP, GIF / 최대 6MB",
          imageUpload: "이미지 업로드",
          imageUploading: "업로드 중...",
          imageUploaded: "업로드 완료",
          imageUploadNeedFile: "업로드할 이미지를 먼저 선택해 주세요.",
        }
      : {
          title: "Place Registration",
          desc: "Your place will be published after admin review.",
          sla: "Review SLA: within 2 days.",
          submit: "Submit Place Registration",
          sending: "Submitting...",
          ok: "Your request has been submitted.",
          fail: "Submission failed",
          name: "Place Name (KO/EN)",
          category: "Category",
          city: "City",
          address: "Address",
          mapUrl: "Google Maps URL",
          description: "Basic Info",
          tags: "Tags (comma separated)",
          tips: "User Tip",
          nickname: "Nickname (optional)",
          imageTitle: "Image Attachment (1 file)",
          imageHint: "JPG, PNG, WEBP, GIF / Max 6MB",
          imageUpload: "Upload Image",
          imageUploading: "Uploading...",
          imageUploaded: "Uploaded",
          imageUploadNeedFile: "Please choose an image first.",
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
    trackClientEvent("place_image_upload_start", { page: "/submit/place", size: target.size });

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
      trackClientEvent("place_image_upload_fail", { page: "/submit/place", error: msg });
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
    trackClientEvent("place_image_upload_complete", { page: "/submit/place" });
    return data.url;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setResult("");
    trackClientEvent("place_submit_start", { page: "/submit/place" });

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

    const res = await fetch("/api/submissions/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        city,
        category,
        address,
        description,
        google_map_url: googleMapUrl,
        tags: tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tips,
        image_urls: finalImageUrl ? [finalImageUrl] : [],
        image_upload:
          uploadedImageMeta && uploadedImageMeta.url === finalImageUrl
            ? uploadedImageMeta
            : null,
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
    setAddress("");
    setGoogleMapUrl("");
    setDescription("");
    setTags("");
    setTips("");
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
        <p className="mt-1 text-xs text-slate-500">{t.sla}</p>
      </header>

      <form onSubmit={onSubmit} className="panel grid gap-3 p-5 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-slate-500">{t.name}</p>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
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
              <img src={imagePreviewUrl} alt="preview" className="h-44 w-full rounded-lg object-cover sm:h-52" />
            </div>
          ) : null}

          {uploadedImageUrl ? (
            <p className="mt-2 text-xs text-emerald-700">{t.imageUploaded}</p>
          ) : null}
          {uploadedImageMeta ? (
            <p className="mt-1 text-xs text-slate-500">
              File: {uploadedImageMeta.file_name} ({formatBytes(uploadedImageMeta.file_size_bytes)})
            </p>
          ) : null}
          {imageUsageText ? (
            <p className="mt-1 text-xs text-slate-500">Storage usage: {imageUsageText}</p>
          ) : null}
          {imageUploadError ? (
            <p className="mt-2 text-xs text-rose-600">{imageUploadError}</p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.nickname}</p>
          <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary md:col-span-2" disabled={pending || imageUploadPending}>
          {pending ? t.sending : t.submit}
        </button>
      </form>

      {result ? <p className="text-sm text-slate-700">{result}</p> : null}

      <ContactBanners />
    </section>
  );
}
