/** Turn a deck title into a safe file name (keeps unicode letters/numbers,
 *  so Russian titles survive). Falls back to "deck" if nothing is left. */
export function deckSlug(title: string): string {
  const s = title
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s._-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return s || "deck";
}

/** A Content-Disposition value that downloads as `name`, with an ASCII
 *  fallback plus an RFC 5987 UTF-8 form so non-ASCII names survive. */
export function attachment(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
