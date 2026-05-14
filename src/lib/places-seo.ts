export function toFilterSlug(value: string) {
  return value.toLowerCase().replaceAll(/\s+/g, "-").replaceAll("/", "-");
}

export function fromFilterSlug(slug: string) {
  return decodeURIComponent(slug).replaceAll("-", " ");
}
