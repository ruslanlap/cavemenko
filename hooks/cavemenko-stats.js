#!/usr/bin/env node
// cavemenko — Stop hook: measure the assistant reply that just finished.
//
// Claude Code's Stop hook payload has no reply text, but the transcript holds it.
// We read the last assistant text message, estimate its tokens (~chars/3.6 for
// mixed ukr/code), and accumulate into ~/.claude/.cavemenko-stats as JSON:
//   { "turns": N, "chars": N, "tokens": N, "baselineTokens": N, "savedTokens": N }
//
// baselineTokens is the honest part: we cannot know what the same answer would
// have cost without the ruleset, so we only store a baseline the USER provides
// (write it into .cavemenko-stats manually, or run with CAVEMENKO_BASELINE=1 to
// record "this turn was uncavemenko" and use it as the per-turn reference).
// Without a baseline, savedTokens stays 0 — the statusline then shows tokens used,
// never a fabricated percentage.

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const statsPath = path.join(claudeDir, '.cavemenko-stats');
const flagPath = path.join(claudeDir, '.cavemenko-active');
const { readFlag } = require('./cavemenko-config');
const MAX_TRANSCRIPT_BYTES = 8 * 1024 * 1024; // read at most the last 8 MB
const CHARS_PER_TOKEN = 3.6; // mixed Ukrainian + code, measured-ish

function refuseSymlink(p) {
  try {
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) return true;
  } catch (e) {
    return false;
  }
  return false;
}

function readStats() {
  try {
    if (refuseSymlink(statsPath)) return null;
    const raw = fs.readFileSync(statsPath, 'utf8');
    if (raw.length > 64 * 1024) return null;
    const d = JSON.parse(raw);
    if (typeof d !== 'object' || d === null) return null;
    return d;
  } catch (e) {
    return null;
  }
}

function lastAssistantText(transcriptPath) {
  let content;
  try {
    const st = fs.statSync(transcriptPath);
    if (st.size > MAX_TRANSCRIPT_BYTES) return null;
    content = fs.readFileSync(transcriptPath, 'utf8');
  } catch (e) {
    return null;
  }
  const lines = content.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line || line[0] !== '{') continue;
    let entry;
    try { entry = JSON.parse(line); } catch (e) { continue; }
    if (entry.type !== 'assistant') continue;
    const msg = entry.message || {};
    if (!Array.isArray(msg.content)) continue;
    const text = msg.content
      .filter(b => b && b.type === 'text' && typeof b.text === 'string')
      .map(b => b.text)
      .join('');
    if (text) return text;
  }
  return null;
}

let input = '';
process.stdin.on('data', c => { input += c; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input || '{}');
    const stats = readStats() || { turns: 0, chars: 0, tokens: 0, baselineTokens: 0, savedTokens: 0 };
    const transcriptPath = data.transcript_path;

    if (typeof transcriptPath === 'string' && transcriptPath) {
      const text = lastAssistantText(transcriptPath);
      if (text) {
        const tokens = Math.round(text.length / CHARS_PER_TOKEN);
        stats.turns = (stats.turns || 0) + 1;
        stats.chars = (stats.chars || 0) + text.length;
        stats.tokens = (stats.tokens || 0) + tokens;

        // Baseline: a turn where cavemenko was OFF is the uncompressed reference.
        // No baseline turns yet -> savedTokens stays 0, never a fabricated number.
        if (readFlag(flagPath) === null) {
          stats.baselineTokens = (stats.baselineTokens || 0) + tokens;
          stats.baselineTurns = (stats.baselineTurns || 0) + 1;
        }
        if (stats.baselineTurns > 0) {
          const perTurn = stats.baselineTokens / stats.baselineTurns;
          const cavemanTurns = Math.max(0, stats.turns - stats.baselineTurns);
          // stats.tokens includes the baseline turns themselves — subtract them
          // before comparing, otherwise the baseline cancels its own savings.
          const cavemanTokens = Math.max(0, stats.tokens - stats.baselineTokens);
          stats.savedTokens = Math.max(0, Math.round(perTurn * cavemanTurns - cavemanTokens));
        }
      }
    }

    fs.mkdirSync(claudeDir, { recursive: true });
    if (!refuseSymlink(statsPath)) {
      const tmp = statsPath + '.' + process.pid + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(stats), { mode: 0o600 });
      fs.renameSync(tmp, statsPath);
    }
  } catch (e) {
    // Silent fail — stats are best-effort, never break the session
  }
  process.stdout.write('');
});
