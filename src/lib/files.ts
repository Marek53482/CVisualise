const STORAGE_KEY = 'cvisualise:draft:v1';

export interface Draft {
  source: string;
  fileName: string;
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Draft>;
    return typeof data.source === 'string' ? { source: data.source, fileName: String(data.fileName ?? '') } : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function downloadText(text: string, fileName: string, type = 'text/markdown;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

export function isMarkdownFile(file: File): boolean {
  return /\.(md|markdown|txt)$/i.test(file.name) || file.type === 'text/markdown' || file.type === 'text/plain';
}

export function withMdExtension(name: string): string {
  return /\.(md|markdown)$/i.test(name) ? name : `${name.replace(/\.[^.]+$/, '')}.md`;
}
