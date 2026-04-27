#!/usr/bin/env node
// cavemenko — shared configuration resolver
//
// Resolution order for default mode:
//   1. CAVEMENKO_DEFAULT_MODE environment variable
//   2. Config file defaultMode field:
//      - $XDG_CONFIG_HOME/cavemenko/config.json (any platform, if set)
//      - ~/.config/cavemenko/config.json (macOS / Linux fallback)
//      - %APPDATA%\cavemenko\config.json (Windows fallback)
//   3. 'full'

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_MODES = [
  'off', 'lite', 'full', 'ultra',
  'commit', 'review', 'compress', 'translate'
];

function getConfigDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'cavemenko');
  }
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'cavemenko'
    );
  }
  return path.join(os.homedir(), '.config', 'cavemenko');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

function getDefaultMode() {
  const envMode = process.env.CAVEMENKO_DEFAULT_MODE;
  if (envMode && VALID_MODES.includes(envMode.toLowerCase())) {
    return envMode.toLowerCase();
  }

  try {
    const configPath = getConfigPath();
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.defaultMode && VALID_MODES.includes(config.defaultMode.toLowerCase())) {
      return config.defaultMode.toLowerCase();
    }
  } catch (e) {
    // Config file doesn't exist or is invalid — fall through
  }

  return 'full';
}

// Symlink-safe flag file write.
// Refuses symlinks at the target file and at the immediate parent directory,
// uses O_NOFOLLOW where available, writes atomically via temp + rename with
// 0600 permissions. Protects against local attackers replacing the predictable
// flag path (~/.claude/.cavemenko-active) with a symlink to clobber other files.
function safeWriteFlag(flagPath, content) {
  try {
    const flagDir = path.dirname(flagPath);
    fs.mkdirSync(flagDir, { recursive: true });

    try {
      if (fs.lstatSync(flagDir).isSymbolicLink()) return;
    } catch (e) {
      return;
    }

    try {
      if (fs.lstatSync(flagPath).isSymbolicLink()) return;
    } catch (e) {
      if (e.code !== 'ENOENT') return;
    }

    const tempPath = path.join(flagDir, `.cavemenko-active.${process.pid}.${Date.now()}`);
    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW;
    let fd;
    try {
      fd = fs.openSync(tempPath, flags, 0o600);
      fs.writeSync(fd, String(content));
      try { fs.fchmodSync(fd, 0o600); } catch (e) { /* best-effort on Windows */ }
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
    fs.renameSync(tempPath, flagPath);
  } catch (e) {
    // Silent fail — flag is best-effort
  }
}

// Symlink-safe, size-capped, whitelist-validated flag file read.
// Symmetric with safeWriteFlag: refuses symlinks at the target, caps the read,
// and rejects anything that isn't a known mode. Returns null on any anomaly.
const MAX_FLAG_BYTES = 64;

function readFlag(flagPath) {
  try {
    let st;
    try {
      st = fs.lstatSync(flagPath);
    } catch (e) {
      return null;
    }
    if (st.isSymbolicLink() || !st.isFile()) return null;
    if (st.size > MAX_FLAG_BYTES) return null;

    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const flags = fs.constants.O_RDONLY | O_NOFOLLOW;
    let fd;
    let out;
    try {
      fd = fs.openSync(flagPath, flags);
      const buf = Buffer.alloc(MAX_FLAG_BYTES);
      const n = fs.readSync(fd, buf, 0, MAX_FLAG_BYTES, 0);
      out = buf.slice(0, n).toString('utf8');
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }

    const raw = out.trim().toLowerCase();
    if (!VALID_MODES.includes(raw)) return null;
    return raw;
  } catch (e) {
    return null;
  }
}

// Load custom abbreviations from config dir.
// File: ~/.config/cavemenko/abbr.json
// Format: { "КБ": "кодова база", "ФР": "фронтенд", ... }
// Returns empty object if file doesn't exist or is invalid.
const MAX_ABBR_BYTES = 64 * 1024; // 64 KB cap

function loadCustomAbbreviations() {
  try {
    const abbrPath = path.join(getConfigDir(), 'abbr.json');
    const st = fs.statSync(abbrPath);
    if (st.size > MAX_ABBR_BYTES) return {};
    const data = JSON.parse(fs.readFileSync(abbrPath, 'utf8'));
    if (typeof data !== 'object' || Array.isArray(data)) return {};
    // Validate: all keys and values must be strings
    const result = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof k === 'string' && typeof v === 'string' && k.length > 0 && v.length > 0) {
        result[k] = v;
      }
    }
    return result;
  } catch (e) {
    return {};
  }
}

// Load per-project config from .cavemenko.json in working directory.
// Format: { "defaultMode": "ultra", "abbreviations": { ... } }
// Returns null if file doesn't exist.
function loadProjectConfig() {
  try {
    const cwd = process.cwd();
    const projectConfigPath = path.join(cwd, '.cavemenko.json');
    const st = fs.statSync(projectConfigPath);
    if (st.size > MAX_ABBR_BYTES) return null;
    return JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

// Get effective mode considering project config override.
// Priority: env var > project config > user config > 'full'
function getEffectiveMode() {
  const envMode = process.env.CAVEMENKO_DEFAULT_MODE;
  if (envMode && VALID_MODES.includes(envMode.toLowerCase())) {
    return envMode.toLowerCase();
  }

  const projectConfig = loadProjectConfig();
  if (projectConfig && projectConfig.defaultMode && VALID_MODES.includes(projectConfig.defaultMode.toLowerCase())) {
    return projectConfig.defaultMode.toLowerCase();
  }

  return getDefaultMode();
}

module.exports = {
  getDefaultMode, getEffectiveMode, getConfigDir, getConfigPath,
  VALID_MODES, safeWriteFlag, readFlag,
  loadCustomAbbreviations, loadProjectConfig
};
