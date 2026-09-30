const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const README = path.join(ROOT, 'README.md');
const HERMES_README = path.join(ROOT, 'integrations', 'hermes', 'README.md');

function head(url) {
  return new Promise(resolve => {
    const req = https.request(url, { method: 'HEAD', timeout: 15000 }, res => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
    req.on('timeout', () => { req.destroy(); resolve(0); });
    req.end();
  });
}

describe('Hermes install path', () => {
  const text = fs.readFileSync(README, 'utf8');
  const hermes = fs.readFileSync(HERMES_README, 'utf8');

  test('README documents a real one-command install', () => {
    expect(text).toContain('hermes skills install');
    expect(text).toContain('https://raw.githubusercontent.com/ruslanlap/cavemenko/master/skills/cavemenko/SKILL.md');
  });

  test('no invented subcommand: hermes skill install does not exist', () => {
    expect(text).not.toMatch(/hermes skill install/);
    expect(hermes).not.toMatch(/hermes skill install/);
  });

  test('update and uninstall paths are documented', () => {
    for (const cmd of ['hermes skills check', 'hermes skills update', 'hermes skills uninstall']) {
      expect(text).toContain(cmd);
      expect(hermes).toContain(cmd);
    }
  });

  test('auto_load is documented, since installing alone does not activate it', () => {
    expect(text).toContain('auto_load');
    expect(hermes).toContain('auto_load');
  });

  // The regex captures the URL without the scheme (the docs wrap it in quotes
  // after a backslash continuation), so add https:// back for the request.
  const rawUrls = () => [...text.matchAll(/raw\.githubusercontent\.com\/[^"\s)]+/g)]
    .map(m => 'https://' + m[0]);

  test('raw URLs use the default branch (master, not main)', () => {
    const wrong = rawUrls().filter(u => u.includes('/main/'));
    expect(wrong).toEqual([]);
  });

  // A 404 here is the exact failure a user hits: the install command silently
  // finds nothing. Worth the network call in CI.
  test('raw URLs actually resolve', async () => {
    const urls = rawUrls();
    expect(urls.length).toBeGreaterThan(0);
    const codes = await Promise.all(urls.map(u => head(u)));
    const dead = urls.filter((_, i) => codes[i] !== 200);
    expect(dead).toEqual([]);
  }, 30000);
});
