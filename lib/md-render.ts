function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Inline-only markdown: cloze tokens, images, links, bold/italic/code, with
 * no paragraph wrapping. Use for short labels and headings that live inside
 * an element where a nested <p> would be invalid.
 * Content is escaped first, so it is safe for single-user authored decks.
 */
export function mdInline(src: string): string {
  let s = escapeHtml(src);

  // Cloze tokens (emitted by renderCard) — process before other brackets.
  s = s.replace(/\[\[B:(.*?)\]\]/g, (_all, hint) =>
    hint ? `<span class="cz-blank">${hint}</span>` : `<span class="cz-blank">&nbsp;</span>`,
  );
  s = s.replace(/\[\[C:([\s\S]*?)\]\]/g, '<mark class="cz-mark">$1</mark>');

  // Images then links.
  s = s.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    '<img alt="$1" src="$2" loading="lazy" />',
  );
  s = s.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );

  // Inline emphasis.
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");

  return s;
}

/**
 * Drop markdown syntax and keep the words — for one-line text previews
 * (browse lists) where styled markup would be noise.
 */
export function stripMd(src: string): string {
  return src
    .replace(/!\[([^\]]*)\]\([^)\s]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Minimal, dependency-free markdown for card content. Handles the subset
 * we author: cloze tokens, images, links, bold/italic/code, and paragraphs.
 */
export function mdToHtml(src: string): string {
  return mdInline(src)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}
