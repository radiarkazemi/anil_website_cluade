import type { ReactNode } from 'react';

/** Normalize odd spaces / BOM so markdown markers match reliably (esp. mobile paste). */
function normalizeBody(body: string): string {
  return (body || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u00A0\u202F\u2007]/g, ' ')
    // zero-width space / word joiner only — keep ZWNJ (U+200C) for Persian orthography
    .replace(/[\u200B\u2060]/g, '');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Apply **bold** and *italic* — tolerant of Persian text and missing closers. */
function inlineFormat(raw: string): string {
  let s = escapeHtml(raw);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // leftover ** pairs → strip markers so mobile never shows raw stars
  s = s.replace(/\*\*/g, '');
  s = s.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  return s;
}

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string };

const HEADING_RE = /^(#{1,3})[\s\u00A0\u200C]+(.+?)\s*$/;
const LIST_RE = /^[-•*][\s\u00A0]+(.+)$/;
const QUOTE_RE = /^>[\s\u00A0]+(.+)$/;

function parseBlocks(body: string): Block[] {
  const lines = normalizeBody(body).split('\n');
  const blocks: Block[] = [];
  let listBuf: string[] = [];
  let paraBuf: string[] = [];

  const flushList = () => {
    if (listBuf.length) {
      blocks.push({ type: 'ul', items: [...listBuf] });
      listBuf = [];
    }
  };
  const flushPara = () => {
    if (paraBuf.length) {
      blocks.push({ type: 'p', text: paraBuf.join(' ').trim() });
      paraBuf = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushPara();
      continue;
    }

    const heading = trimmed.match(HEADING_RE);
    if (heading) {
      flushList();
      flushPara();
      const level = heading[1].length;
      const text = heading[2].trim();
      blocks.push({ type: level >= 3 ? 'h3' : 'h2', text });
      continue;
    }

    const quote = trimmed.match(QUOTE_RE);
    if (quote) {
      flushList();
      flushPara();
      blocks.push({ type: 'quote', text: quote[1].trim() });
      continue;
    }

    const list = trimmed.match(LIST_RE);
    // Avoid treating **bold** lines as list items
    if (list && !trimmed.startsWith('**')) {
      flushPara();
      listBuf.push(list[1].trim());
      continue;
    }

    flushList();
    paraBuf.push(trimmed);
  }
  flushList();
  flushPara();
  return blocks;
}

export function ContentBody({ body, className = '' }: { body?: string | null; className?: string }) {
  const blocks = parseBlocks(body || '');
  if (!blocks.length) {
    return (
      <div className={`content-body ${className}`.trim()}>
        <p>محتوایی ثبت نشده است.</p>
      </div>
    );
  }

  const nodes: ReactNode[] = blocks.map((b, i) => {
    if (b.type === 'h2') {
      return <h2 key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(b.text) }} />;
    }
    if (b.type === 'h3') {
      return <h3 key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(b.text) }} />;
    }
    if (b.type === 'quote') {
      return <blockquote key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(b.text) }} />;
    }
    if (b.type === 'ul') {
      return (
        <ul key={i}>
          {b.items.map((item, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          ))}
        </ul>
      );
    }
    return <p key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(b.text) }} />;
  });

  return <div className={`content-body ${className}`.trim()}>{nodes}</div>;
}

/** Pure helper for tests / admin preview sanity checks. */
export function renderContentPreviewText(body: string): string {
  return parseBlocks(body)
    .map((b) => {
      if (b.type === 'h2' || b.type === 'h3') return b.text;
      if (b.type === 'ul') return b.items.join(' · ');
      if (b.type === 'quote') return b.text;
      return b.text.replace(/\*\*/g, '');
    })
    .join('\n');
}
