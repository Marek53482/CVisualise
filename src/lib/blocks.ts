/* Podział treści sekcji na bloki: wpisy (###), akapity, listy, cytaty, separatory. */

export type Block =
  | { type: 'entry'; title: string; date: string }
  | { type: 'p'; text: string; subtle: boolean }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[]; start: number }
  | { type: 'quote'; text: string }
  | { type: 'hr' }
  | { type: 'pagebreak' };

export type ContentBlock = Exclude<Block, { type: 'entry' }>;

export type Item = { type: 'entry'; title: string; date: string; children: ContentBlock[] } | ContentBlock;

const DATE_ONLY = /^(?:[\d\s./–—-]|obecnie|nadal|teraz|dziś|present|current|now|today)+$/i;

export function splitEntryTitle(raw: string): { title: string; date: string } {
  const parts = raw.split(/\s+::\s*/);
  if (parts.length < 2) return { title: raw.trim(), date: '' };
  const date = parts.pop()!.trim();
  return { title: parts.join(' :: ').trim(), date };
}

export function parseBlocks(body: string): Block[] {
  const lines = body.split('\n');
  const out: Block[] = [];
  let para: string[] = [];
  let list: { type: 'ul'; items: string[] } | { type: 'ol'; items: string[]; start: number } | null = null;

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join('\n');
    out.push({ type: 'p', text, subtle: para.length === 1 && /^\*[^*\s][^*]*\*$/.test(text) });
    para = [];
  };
  const flushList = () => {
    if (list) out.push(list);
    list = null;
  };
  const flush = () => {
    flushPara();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    let m: RegExpExecArray | null;

    if (!line) {
      flush();
      continue;
    }
    if (/^<!--\s*page-?break\s*-->$/i.test(line)) {
      flush();
      out.push({ type: 'pagebreak' });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flush();
      out.push({ type: 'hr' });
      continue;
    }
    if ((m = /^#{3,6}\s+(.+)$/.exec(line))) {
      flush();
      const entry = splitEntryTitle(m[1]);
      if (!entry.date) {
        // Starszy zapis: data w osobnym wierszu pod nagłówkiem, np. *2025 - obecnie*.
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        const candidate = (lines[j] ?? '').trim().replace(/^\*{1,2}(.+?)\*{1,2}$/, '$1').trim();
        if (candidate && /\d{4}/.test(candidate) && DATE_ONLY.test(candidate)) {
          entry.date = candidate;
          i = j;
        }
      }
      out.push({ type: 'entry', ...entry });
      continue;
    }
    if ((m = /^[-*+•]\s+(.+)$/.exec(line))) {
      flushPara();
      if (list?.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(m[1]);
      continue;
    }
    if ((m = /^(\d+)[.)]\s+(.+)$/.exec(line))) {
      flushPara();
      if (list?.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [], start: Number(m[1]) };
      }
      list.items.push(m[2]);
      continue;
    }
    if ((m = /^>\s?(.*)$/.exec(line))) {
      flush();
      const prev = out[out.length - 1];
      if (prev?.type === 'quote' && i > 0 && lines[i - 1].trim().startsWith('>')) prev.text += '\n' + m[1];
      else out.push({ type: 'quote', text: m[1] });
      continue;
    }
    // Wcięta kontynuacja punktu listy.
    if (list && /^\s{2,}/.test(raw)) {
      list.items[list.items.length - 1] += ' ' + line;
      continue;
    }
    flushList();
    para.push(line);
  }
  flush();
  return out;
}

export function groupBlocks(blocks: Block[]): Item[] {
  const items: Item[] = [];
  let entry: Extract<Item, { type: 'entry' }> | null = null;
  for (const block of blocks) {
    if (block.type === 'entry') {
      entry = { ...block, children: [] };
      items.push(entry);
    } else if (block.type === 'pagebreak' || block.type === 'hr') {
      entry = null;
      items.push(block);
    } else if (entry) {
      entry.children.push(block);
    } else {
      items.push(block);
    }
  }
  return items;
}
