"use client";

import { FormEvent, useState } from "react";
import { slugify } from "@/lib/utils";

export default function AdminPlacesPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [tags, setTags] = useState("");
  const [tips, setTips] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(true);
  const [adminToken, setAdminToken] = useState("");
  const [result, setResult] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setResult("Saving...");

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
        tips,
        google_map_url: googleMapUrl || null,
        tags: tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        is_featured: featured,
        is_published: published,
      }),
    });

    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setResult(`Failed: ${data.error ?? "unknown error"}`);
      return;
    }
    setResult(`Saved: ${data.place.name} (${data.place.slug})`);
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin · New Place</h1>
        <p className="mt-2 text-sm text-slate-600">
          Minimal content operation form for fast publishing.
        </p>
      </header>

      <form onSubmit={onSubmit} className="panel grid gap-4 p-5 md:grid-cols-2">
        <input
          className="input md:col-span-2"
          placeholder="Admin write token"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder="Place name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSlug(slugify(e.target.value));
          }}
          required
        />
        <input
          className="input"
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder="District (ex. Sukhumvit)"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        />
        <input
          className="input"
          placeholder="Category (ex. Rooftop)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <textarea
          className="input min-h-24 md:col-span-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="input md:col-span-2"
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <input
          className="input md:col-span-2"
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <textarea
          className="input min-h-20 md:col-span-2"
          placeholder="Tips"
          value={tips}
          onChange={(e) => setTips(e.target.value)}
        />
        <input
          className="input md:col-span-2"
          placeholder="Google Maps URL"
          value={googleMapUrl}
          onChange={(e) => setGoogleMapUrl(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2 md:col-span-2">
          <input
            className="input"
            placeholder="Latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
          <input
            className="input"
            placeholder="Longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Published
        </label>
        <button
          type="submit"
          className="btn-primary md:col-span-2"
          disabled={pending}
        >
          {pending ? "Saving..." : "Save place"}
        </button>
      </form>
      <p className="text-sm text-slate-700">{result}</p>
    </section>
  );
}
