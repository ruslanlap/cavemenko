const fs = require('fs');
const path = require('path');

const README = path.join(__dirname, '..', 'README.md');

// Transcribed from github-slugger (the library GitHub's renderer uses).
// The trap: GitHub strips the emoji but NOT the space in front of it, so
// '## 📏 Виміряно' anchors to '#-виміряно' — with a leading hyphen. Verified
// against the live page: <h2 id="user-content--виміряно">. Dropping the hyphen
// produces a link that looks right and 404s in the browser.
function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\- ]/gu, '')
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

  test('every TOC anchor is a real heading slug', () => {
    // The TOC label is plain text while the heading carries an emoji, so the
    // anchor cannot be derived from the label. Membership is the real check:
    // it is the set of slugs the browser can actually resolve.
    const orphan = [...tocSlugs].filter(a => !slugs.has(a));
    expect(orphan).toEqual([]);
  });

  test('in-page anchors keep the hyphen the emoji leaves behind', () => {
    // '## 📏 Виміряно' -> '#-виміряно'. A TOC without the hyphen is a 404.
    const emojiHeadings = lines
      .filter(l => l.startsWith('## '))
      .map(l => l.replace(/^##\s+/, '').trim())
      .filter(h => /^[^A-Za-z0-9\s]/.test(h) && h !== 'Зміст');
    expect(emojiHeadings.length).toBeGreaterThan(0);
    const bad = emojiHeadings.map(slug).filter(s => !s.startsWith('-'));
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
