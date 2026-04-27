#!/usr/bin/env node
// cavemenko — Claude Code SessionStart activation hook
//
// Runs on every session start:
//   1. Writes flag file at $CLAUDE_CONFIG_DIR/.cavemenko-active (statusline reads this)
//   2. Emits cavemenko ruleset as hidden SessionStart context
//   3. Detects missing statusline config and emits setup nudge

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getEffectiveMode, safeWriteFlag, loadCustomAbbreviations, loadProjectConfig } = require('./cavemenko-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.cavemenko-active');
const settingsPath = path.join(claudeDir, 'settings.json');

const mode = getEffectiveMode();

// "off" mode — skip activation entirely
if (mode === 'off') {
  try { fs.unlinkSync(flagPath); } catch (e) {}
  process.stdout.write('OK');
  process.exit(0);
}

// 1. Write flag file (symlink-safe)
safeWriteFlag(flagPath, mode);

// Independent-mode skills handle their own behavior — don't inject base rules.
const INDEPENDENT_MODES = new Set(['commit', 'review', 'compress', 'translate']);

if (INDEPENDENT_MODES.has(mode)) {
  process.stdout.write('CAVEMENKO MODE ACTIVE — рівень: ' + mode + '. Поведінка визначається навичкою /cavemenko-' + mode + '.');
  process.exit(0);
}

// 2. Read SKILL.md — single source of truth for cavemenko behavior.
let skillContent = '';
try {
  skillContent = fs.readFileSync(
    path.join(__dirname, '..', 'skills', 'cavemenko', 'SKILL.md'), 'utf8'
  );
} catch (e) { /* standalone install — use fallback below */ }

let output;

if (skillContent) {
  // Strip YAML frontmatter
  const body = skillContent.replace(/^---[\s\S]*?---\s*/, '');

  // Filter intensity table: keep header + separator + only active level's row.
  // Filter example lines: keep only the active level's example line.
  const filtered = body.split('\n').reduce((acc, line) => {
    const tableRowMatch = line.match(/^\|\s*\*\*(\S+?)\*\*\s*\|/);
    if (tableRowMatch) {
      if (tableRowMatch[1] === mode) {
        acc.push(line);
      }
      return acc;
    }

    const exampleMatch = line.match(/^- (\S+?):\s/);
    if (exampleMatch) {
      if (exampleMatch[1] === mode) {
        acc.push(line);
      }
      return acc;
    }

    acc.push(line);
    return acc;
  }, []);

  output = 'CAVEMENKO MODE ACTIVE — рівень: ' + mode + '\n\n' + filtered.join('\n');
} else {
  // Fallback when SKILL.md is not found — minimum viable ruleset.
  output =
    'CAVEMENKO MODE ACTIVE — level: ' + mode + '\n\n' +
    'Відповідай стисло як розумна печерна людина. Use English terms де вони коротші (auth, fix, run, do, etc).\n\n' +
    '## Постійність\n\n' +
    'ACTIVE КОЖНУ ВІДПОВІДЬ. Не повертайся до звичайного mode. Не дрейфуй до води. ' +
    'Off тільки: "стоп печерний" / "звичайний режим".\n\n' +
    'Current level: **' + mode + '**. Switch: `/cavemenko lite|full|ultra`.\n\n' +
    '## Прийоми стиснення\n\n' +
    '1. Pro-drop: "я думаю" → "думаю". Закінчення дієслова вже несе особу.\n' +
    '2. Тире замість зв\'язки: "це — баг", "React — UI lib". Drop "є"/"являється".\n' +
    '3. Short forms: "код зламано" (not "код є зламаним"), "done", "треба".\n' +
    '4. Imperative: "wrap" / "оберни" < "обернути" < "потрібно обернути". Use English imperatives де коротше: do, run, check, fix.\n' +
    '5. Орудний відмінок: "fix командою" (not "за допомогою команди").\n' +
    '6. Drop "що": "думаю: баг" замість "думаю, що це баг".\n' +
    '7. English terms де коротші: auth < автентифікація, fix < виправлення, run < запустити, deploy < розгортання, config < конфігурація, etc < і так далі.\n' +
    '8. Numbers цифрами: "2-й виклик" not "другий виклик".\n\n' +
    '## Cut\n\n' +
    'Воду: взагалі-то/в принципі/власне/просто/насправді. ' +
    'Ввічливість: звичайно/безумовно/радий допомогти. ' +
    'Hedging: можливо/напевно/здається (крім real uncertainty). ' +
    'Tech terms — exact. Code — don\'t change. Errors — quote verbatim.\n\n' +
    'Pattern: `[object] [state/action]. [reason]. [fix].`\n\n' +
    'No: "Звичайно! Із задоволенням допоможу вам..."\n' +
    'Yes: "Bug в auth middleware. Token expiry check — `<`, треба `<=`. Fix:"\n\n' +
    '## Auto-clarity\n\n' +
    'Off печерний для: security warnings, confirm незворотних дій, ' +
    'multi-step sequences де порядок unclear, ' +
    'коли user просить уточнити або repeats question. Resume після clear частини.\n\n' +
    '## Межі\n\n' +
    'Code/commits/PR: write normally. "стоп печерний" / "звичайний режим": return. ' +
    'Level зберігається до зміни або end session.';
}

// 3. Statusline nudge — check if user has configured statusLine in settings.json.
let nudge = '';
try {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  if (!settings.statusLine) {
    nudge =
      '\n\n---\n' +
      '💡 **Статусрядок**: щоб бачити `[CAVEMENKO]` у промпті — додай до `' + settingsPath + '`:\n' +
      '```json\n"statusLine": { "type": "command", "command": "bash ' +
      path.join(__dirname, 'cavemenko-statusline.sh') + '" }\n```';
  }
} catch (e) {
  // No settings.json yet — emit nudge
  nudge =
    '\n\n---\n' +
    '💡 **Статусрядок**: щоб бачити `[CAVEMENKO]` у промпті — додай до `' + settingsPath + '`:\n' +
    '```json\n"statusLine": { "type": "command", "command": "bash ' +
    path.join(__dirname, 'cavemenko-statusline.sh') + '" }\n```';
}

// 4. Custom abbreviations — inject if present.
let abbrSection = '';
const customAbbr = loadCustomAbbreviations();
const projectConfig = loadProjectConfig();
const projectAbbr = (projectConfig && typeof projectConfig.abbreviations === 'object') ? projectConfig.abbreviations : {};
const mergedAbbr = { ...customAbbr, ...projectAbbr };

if (Object.keys(mergedAbbr).length > 0) {
  const rows = Object.entries(mergedAbbr)
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join('\n');
  abbrSection = '\n\n## Custom abbreviations\n\n| Abbr | Full |\n|------|------|\n' + rows;
}

// 5. Plugin conflict detection
let conflictWarn = '';
try {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const enabled = settings.enabledPlugins || {};
  const conflicting = Object.keys(enabled).filter(p =>
    enabled[p] === true && !p.startsWith('cavemenko') &&
    (p.includes('style') || p.includes('terse') || p.includes('caveman') || p.includes('compress'))
  );
  if (conflicting.length > 0) {
    conflictWarn = '\n\n⚠️ **Plugin conflict**: detected style plugins that may override cavemenko: ' +
      conflicting.join(', ') + '. Consider disabling them for best results.';
  }
} catch (e) {
  // No settings or parse error — skip
}

process.stdout.write(output + abbrSection + nudge + conflictWarn);
