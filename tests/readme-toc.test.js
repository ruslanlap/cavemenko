const fs = require('fs');
const path = require('path');

const README = path.join(__dirname, '..', 'README.md');

// Transcribed from github-slugger (the library GitHub's renderer uses).
// The trap: GitHub strips the emoji AND the whitespace before it, so
// '## 📏 Виміряно' anchors to '#виміряно' — no leading hyphen. Adding one
// produces a link that looks right and 404s in the browser.
function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\- ]/gu, '')
    .trim()
    .replace(/ /g, '-');
}

describe('README table of contents', () => {
  const text = fs.readFileSync(README, 'utf8');
  const lines = text.split('\n');

  const headings = lines
    .filter(l => l.startsWith('## '))
    .map(l => l.replace(/^##\s+/, '').trim())
    .filter(h => h !== 'Зміст');

  const toc = text.slice(text.indexOf('## Зміст'));
  const links = [...toc.matchAll(/^- \[([^\]]+)\]\(#([^)]+)\)/gm)];

  test('has a TOC section', () => {
    expect(text).toContain('## Зміст');
  });

  // TOC labels are plain text; headings carry a leading emoji. Compare the
  // slug of both, which is what the browser actually resolves.
  const slugs = new Set(headings.map(slug));
  const tocSlugs = new Set(links.map(m => m[2]));

  test('every H2 heading has a TOC link', () => {
    const missing = [...slugs].filter(s => !tocSlugs.has(s));
    expect(missing).toEqual([]);
  });

  test('no orphan TOC entries', () => {
    const orphans = [...tocSlugs].filter(s => !slugs.has(s));
    expect(orphans).toEqual([]);
  });

  test('every anchor matches the real GitHub slug of its heading', () => {
    const wrong = links
      .filter(([, label, anchor]) => slug(label) !== anchor)
      .map(([, label, anchor]) => `${label} -> #${anchor} (expected #${slug(label)})`);
    expect(wrong).toEqual([]);
  });

  test('no leading-hyphen anchors (GitHub drops emoji and the space before it)', () => {
    const bad = links.filter(([, , a]) => a.startsWith('-')).map(([, , a]) => a);
    expect(bad).toEqual([]);
  });

  test('other in-page anchor links resolve too', () => {
    const inline = [...text.matchAll(/\]\(#([^)]+)\)/g)]
      .map(m => m[1])
      .filter(a => links.every(l => l[2] !== a));
    const slugs = new Set(headings.map(slug));
    const broken = inline.filter(a => !slugs.has(a));
    expect(broken).toEqual([]);
  });
});
