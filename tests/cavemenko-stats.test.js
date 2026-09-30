const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const HOOK = path.join(__dirname, '..', 'hooks', 'cavemenko-stats.js');

function makeTranscript(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cav-tr-'));
  const p = path.join(dir, 'transcript.jsonl');
  fs.writeFileSync(p, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
  return p;
}

function assistantLine(text) {
  return { type: 'assistant', message: { content: [{ type: 'text', text }] } };
}

function runHook(payload, claudeDir) {
  return execFileSync('node', [HOOK], {
    input: JSON.stringify(payload),
    env: { ...process.env, CLAUDE_CONFIG_DIR: claudeDir },
    encoding: 'utf8',
  });
}

function readStats(claudeDir) {
  return JSON.parse(fs.readFileSync(path.join(claudeDir, '.cavemenko-stats'), 'utf8'));
}

describe('cavemenko-stats', () => {
  let claudeDir;

  beforeEach(() => {
    claudeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cav-stats-'));
  });

  afterEach(() => {
    fs.rmSync(claudeDir, { recursive: true, force: true });
  });

  test('accumulates tokens from the last assistant message', () => {
    const tr = makeTranscript([assistantLine('a'.repeat(360))]); // 360/3.6 = 100
    runHook({ transcript_path: tr }, claudeDir);
    const s = readStats(claudeDir);
    expect(s.turns).toBe(1);
    expect(s.tokens).toBe(100);
  });

  test('savedTokens stays 0 without a baseline turn — never a fabricated number', () => {
    const tr = makeTranscript([assistantLine('x'.repeat(360))]);
    fs.writeFileSync(path.join(claudeDir, '.cavemenko-active'), 'full');
    runHook({ transcript_path: tr }, claudeDir);
    expect(readStats(claudeDir).savedTokens).toBe(0);
  });

  test('computes savings against turns that ran with cavemenko off', () => {
    // baseline turn (no flag file): 3600 chars = 1000 tokens
    runHook({ transcript_path: makeTranscript([assistantLine('a'.repeat(3600))]) }, claudeDir);
    // cavemenko turn (flag present): 360 chars = 100 tokens
    fs.writeFileSync(path.join(claudeDir, '.cavemenko-active'), 'full');
    runHook({ transcript_path: makeTranscript([assistantLine('b'.repeat(360))]) }, claudeDir);

    const s = readStats(claudeDir);
    expect(s.baselineTurns).toBe(1);
    expect(s.tokens).toBe(1100);
    expect(s.savedTokens).toBe(900); // 1000 baseline - 100 actual
  });

  test('survives a missing transcript without throwing', () => {
    runHook({ transcript_path: '/nonexistent/transcript.jsonl' }, claudeDir);
    runHook({}, claudeDir);
    expect(readStats(claudeDir).turns).toBe(0);
  });

  test('ignores a corrupt stats file instead of crashing', () => {
    fs.writeFileSync(path.join(claudeDir, '.cavemenko-stats'), 'not json');
    const tr = makeTranscript([assistantLine('z'.repeat(360))]);
    runHook({ transcript_path: tr }, claudeDir);
    expect(readStats(claudeDir).turns).toBe(1);
  });
});
