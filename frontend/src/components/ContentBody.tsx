import type { ReactNode } from 'react';

/** Escape HTML entities for safe inline rendering of simple marks. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Apply **bold** and *italic* inside a line (already escaped). */
function inlineFormat(raw: string): string {
  let s = escapeHtml(raw);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*(?!\s)(.+?)(?!\s)\*(?!\*)/g, '$1<em>$2</em>');
  return s;
}

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string };

function parseBlocks(body: string): Block[] {
  const lines = (body || '').replace(/\r\n/g, '\n').split('\n');
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
    if (trimmed.startsWith('### ')) {
      flushList();
      flushPara();
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
      continue;
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList();
      flushPara();
      const text = trimmed.startsWith('## ') ? trimmed.slice(3) : trimmed.slice(2);
      blocks.push({ type: 'h2', text });
      continue;
    }
    if (trimmed.startsWith('> ')) {
      flushList();
      flushPara();
      blocks.push({ type: 'quote', text: trimmed.slice(2) });
      continue;
    }
    if (/^[-•*]\s+/.test(trimmed)) {
      flushPara();
      listBuf.push(trimmed.replace(/^[-•*]\s+/, ''));
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
    return <div className={`content-body ${className}`.trim()}><p>محتوایی ثبت نشده است.</p></div>;
  }

  const nodes: ReactNode[] = blocks.map((b, i) => {
    if (b.type === 'h2') {
      return <h2 key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(b.text) }} />;
    }
    if (b.type === 'h3') {
      return <h3 key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(b.text) }} />;
    }
    if (b.type === 'quote') {
      return (
        <blockquote key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(b.text) }} />
      );
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
