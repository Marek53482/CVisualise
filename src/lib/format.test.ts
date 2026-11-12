import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CvParseError, parseCv, sectionKind, serializeCv, suggestedBaseName } from './format';
import { groupBlocks, parseBlocks } from './blocks';
import { autoLabels, safeUrl } from './inline';

const example = readFileSync(new URL('../../examples/przyklad.md', import.meta.url), 'utf8');

describe('parseCv', () => {
  it('reads the example file', () => {
    const { doc, warnings } = parseCv(example);
    expect(warnings).toEqual([]);
    expect(doc.name).toBe('Aleksandra Zielińska');
    expect(doc.meta.role).toBe('Młodsza analityczka danych');
    expect(doc.meta['font-size']).toBe(10);
    expect(doc.meta.cvisualise).toBe(1);
    expect(doc.sections.map((s) => s.title)).toEqual([
      'Profil',
      'Umiejętności',
      'Doświadczenie',
      'Wykształcenie',
      'Języki i certyfikaty',
      'Klauzula',
    ]);
  });

  it('accepts the legacy cv-studio version key', () => {
    const { doc, warnings } = parseCv('---\ncv-studio: 1\nrole: "Rola"\n---\n# A');
    expect(warnings).toEqual([]);
    expect(doc.meta.cvisualise).toBe(1);
    expect(doc.meta['cv-studio']).toBeUndefined();
    expect(serializeCv(doc)).not.toContain('cv-studio');
  });

  it('round-trips through serialize without losing content', () => {
    const first = parseCv(example).doc;
    const again = parseCv(serializeCv(first)).doc;
    expect(again).toEqual(first);
    expect(serializeCv(again)).toBe(serializeCv(first));
  });

  it('works without a settings block and fills defaults', () => {
    const { doc } = parseCv('# Jan Kowalski\n\n## Profil\n\nTekst.');
    expect(doc.meta.accent).toBe('#173247');
    expect(doc.meta.font).toBe('arial');
    expect(doc.sections[0].body).toBe('Tekst.');
  });

  it('clamps out-of-range numbers with a warning instead of failing', () => {
    const { doc, warnings } = parseCv('---\nfont-size: 20\naccent: "#abc"\nfont: "comic"\n---\n# A');
    expect(doc.meta['font-size']).toBe(12);
    expect(doc.meta.accent).toBe('#aabbcc');
    expect(doc.meta.font).toBe('arial');
    expect(warnings).toHaveLength(2);
  });

  it('keeps unknown settings', () => {
    const { doc } = parseCv('---\nmy-key: "x"\n---\n# A');
    expect(serializeCv(doc)).toContain('my-key: "x"');
  });

  it('reports a missing closing --- with the line number', () => {
    try {
      parseCv('---\nrole: "x"\n# A');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CvParseError);
      expect((e as CvParseError).line).toBe(1);
    }
  });

  it('handles Windows line endings and BOM', () => {
    const { doc } = parseCv('﻿---\r\nrole: "Rola"\r\n---\r\n# Ąę Łódź\r\n## Sekcja\r\ntekst');
    expect(doc.name).toBe('Ąę Łódź');
    expect(doc.sections[0].body).toBe('tekst');
  });
});

describe('parseBlocks', () => {
  it('splits entry title and date on ::', () => {
    const blocks = parseBlocks('### IBM Polska | Praktykant :: 04.2024\n- Punkt 1\n- Punkt 2');
    expect(blocks[0]).toEqual({ type: 'entry', title: 'IBM Polska | Praktykant', date: '04.2024' });
    expect(blocks[1]).toEqual({ type: 'ul', items: ['Punkt 1', 'Punkt 2'] });
  });

  it('moves a legacy italic date line to the right', () => {
    const blocks = parseBlocks('### Politechnika\n\n*2025 - obecnie*\nOpis');
    expect(blocks[0]).toMatchObject({ date: '2025 - obecnie' });
    expect(blocks[1]).toMatchObject({ type: 'p', text: 'Opis' });
  });

  it('keeps an italic role line as a subtle paragraph', () => {
    const blocks = parseBlocks('### Firma\n*Praktyki — programowanie*');
    expect(blocks[0]).toMatchObject({ date: '' });
    expect(blocks[1]).toMatchObject({ type: 'p', subtle: true });
  });

  it('groups content under entries', () => {
    const items = groupBlocks(parseBlocks('Wstęp\n\n### A :: 2020\n- x\n### B\ny'));
    expect(items.map((i) => i.type)).toEqual(['p', 'entry', 'entry']);
  });
});

describe('helpers', () => {
  it('recognises special sections', () => {
    expect(sectionKind('Profil')).toBe('profile');
    expect(sectionKind('Klauzula')).toBe('footer');
    expect(sectionKind('Doświadczenie zawodowe')).toBe('experience');
    expect(sectionKind('Języki i dodatkowe kwalifikacje')).toBe('languages');
    expect(sectionKind('Umiejętności i narzędzia')).toBe('skills');
  });

  it('bolds labels automatically', () => {
    expect(autoLabels('Sieci: VLAN', 'skills')).toBe('**Sieci:** VLAN');
    expect(autoLabels('**Sieci:** VLAN', 'skills')).toBe('**Sieci:** VLAN');
    expect(autoLabels('Polski: ojczysty. Angielski: C1', 'languages')).toBe('**Polski:** ojczysty. **Angielski:** C1');
  });

  it('rejects unsafe links', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('https://example.com')).toBe('https://example.com');
  });

  it('builds a PDF file name without Polish characters', () => {
    const { doc } = parseCv(example);
    expect(suggestedBaseName(doc)).toBe('Aleksandra_Zielinska_CV_Mlodsza_analityczka_danych');
  });
});
