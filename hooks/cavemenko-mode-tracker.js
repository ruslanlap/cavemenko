#!/usr/bin/env node
// cavemenko — UserPromptSubmit hook to track which cavemenko mode is active.
// Inspects user input for Ukrainian/English triggers and /cavemenko commands,
// writes mode to flag file, emits per-turn reinforcement.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDefaultMode, getEffectiveMode, safeWriteFlag, readFlag } = require('./cavemenko-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.cavemenko-active');

// Ukrainian word stem matching via substring — simpler and safer than Cyrillic regex.
// We lowercase the prompt and check known stems.
function hasAny(text, patterns) {
  return patterns.some(p => text.includes(p));
}

// Stems instead of full words to tolerate case endings (печерний/печерного/печерним).
const ACTIVATE_PATTERNS = [
  // Ukrainian natural-language activation
  'увімкни печер', 'увімкнути печер',
  'активуй печер', 'активувати печер',
  'запусти печер', 'запустити печер',
  'говори як печер', 'говорити як печер',
  'печерний режим', 'печерного режиму', 'печерний реж',
  'менше токенів', 'будь коротк', 'будь стисл',
  'короткий режим', 'стислий режим',
  'економ токени', 'економія токенів',
  // English fallback
  'activate cavemenko', 'enable cavemenko', 'turn on cavemenko',
  'cavemenko mode', 'cavemenko on', 'start cavemenko'
];

const DEACTIVATE_PATTERNS = [
  // Ukrainian
  'стоп печер', 'вимкни печер', 'вимкнути печер',
  'відключи печер', 'відключити печер', 'зупини печер',
  'звичайний режим', 'нормальний режим', 'звичайний реж',
  // English fallback
  'stop cavemenko', 'disable cavemenko', 'turn off cavemenko',
  'deactivate cavemenko', 'normal mode'
];

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = (data.prompt || '').trim().toLowerCase();

    // Natural-language activation — but only if no deactivation pattern present.
    if (hasAny(prompt, ACTIVATE_PATTERNS) && !hasAny(prompt, DEACTIVATE_PATTERNS)) {
      const mode = getEffectiveMode();
      if (mode !== 'off') {
        safeWriteFlag(flagPath, mode);
      }
    }

    // Slash-command activation
    if (prompt.startsWith('/cavemenko')) {
      const parts = prompt.split(/\s+/);
      const cmd = parts[0];
      const arg = parts[1] || '';

      let mode = null;

      if (cmd === '/cavemenko-commit') {
        mode = 'commit';
      } else if (cmd === '/cavemenko-review') {
        mode = 'review';
      } else if (cmd === '/cavemenko-compress' || cmd === '/cavemenko:cavemenko-compress') {
        mode = 'compress';
      } else if (cmd === '/cavemenko-translate' || cmd === '/cavemenko:cavemenko-translate') {
        mode = 'translate';
      } else if (cmd === '/cavemenko-stats' || cmd === '/cavemenko:cavemenko-stats') {
        // Stats command — don't change mode, just let it through
        mode = null;
      } else if (cmd === '/cavemenko' || cmd === '/cavemenko:cavemenko') {
        if (arg === 'lite') mode = 'lite';
        else if (arg === 'ultra') mode = 'ultra';
        else if (arg === 'full') mode = 'full';
        else if (arg === 'off') mode = 'off';
        else mode = getEffectiveMode();
      }

      if (mode && mode !== 'off') {
        safeWriteFlag(flagPath, mode);
      } else if (mode === 'off') {
        try { fs.unlinkSync(flagPath); } catch (e) {}
      }
    }

    // Deactivation — natural language
    if (hasAny(prompt, DEACTIVATE_PATTERNS)) {
      try { fs.unlinkSync(flagPath); } catch (e) {}
    }

    // Per-turn reinforcement: emit a short reminder when cavemenko is active.
    // The SessionStart hook injects the full ruleset once, but models lose it
    // when other plugins inject competing style instructions every turn.
    // Skip independent modes — they have their own skill behavior.
    const INDEPENDENT_MODES = new Set(['commit', 'review', 'compress', 'translate']);
    const activeMode = readFlag(flagPath);
    if (activeMode && !INDEPENDENT_MODES.has(activeMode)) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: "CAVEMENKO MODE ACTIVE (" + activeMode + "). " +
            "Cut воду/ввічливість/hedging. " +
            "Прийоми: pro-drop (думаю, не 'я думаю'); тире замість зв'язки (X — Y); " +
            "short forms (зламано, not 'є зламаним'); imperative (do/run/check або оберни, not 'потрібно обернути'); " +
            "English terms де коротші (auth, fix, run, deploy, config, etc). " +
            "Fragments ok. Code/commits/security — normal."
        }
      }));
    }
  } catch (e) {
    // Silent fail
  }
});
