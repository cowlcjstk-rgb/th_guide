import { Lang } from "@/components/language-provider";
import { Place } from "@/lib/types";

function hasHangul(text: string) {
  return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
}

export function localizePlaceName(place: Place, lang: Lang) {
  const name = place.name ?? "";
  const desc = place.description ?? "";
  const [a, b] = desc.split(" / ").map((v) => v.trim());

  if (lang === "ko") {
    if (a && hasHangul(a)) return `${a}${name && name !== a ? ` (${name})` : ""}`;
    if (b && hasHangul(b)) return `${b}${name && name !== b ? ` (${name})` : ""}`;
    return name;
  }

  if (lang === "en") {
    if (!hasHangul(name)) return name;
    if (a && !hasHangul(a)) return a;
    if (b && !hasHangul(b)) return b;
    return name;
  }
  return name;
}
