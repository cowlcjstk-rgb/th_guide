import { Lang } from "@/components/language-provider";
import { Place } from "@/lib/types";

function hasHangul(text: string) {
  return /[\u3131-\u318E\uAC00-\uD7A3]/.test(text);
}

export function localizePlaceName(place: Place, lang: Lang) {
  const name = (place.name ?? "").trim();
  const description = (place.description ?? "").trim();
  const [left, right] = description.split(" / ").map((v) => v.trim());

  if (lang === "ko") {
    if (left && hasHangul(left)) return name === left ? left : `${left} (${name})`;
    if (right && hasHangul(right)) return name === right ? right : `${right} (${name})`;
    return name;
  }

  if (!hasHangul(name)) return name;
  if (left && !hasHangul(left)) return left;
  if (right && !hasHangul(right)) return right;
  return name;
}

