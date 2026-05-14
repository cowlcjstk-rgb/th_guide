export function getNightlifePlatformUrl() {
  return (
    process.env.NIGHTLIFE_PLATFORM_URL ||
    process.env.NEXT_PUBLIC_NIGHTLIFE_PLATFORM_URL ||
    ""
  ).trim();
}

export function buildNightlifeUrl(path = "") {
  const base = getNightlifePlatformUrl();
  if (!base) return "";
  if (!path) return base;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/+$/, "")}${normalized}`;
}

