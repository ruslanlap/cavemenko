const fs = require('fs');
const path = require('path');
const os = require('os');

// We need to isolate module state between tests
let configModule;

function loadConfig() {
  // Clear cached module
  const modulePath = require.resolve('../hooks/cavemenko-config');
  delete require.cache[modulePath];
  return require('../hooks/cavemenko-config');
}

describe('cavemenko-config', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cavemenko-test-'));
    configModule = loadConfig();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.CAVEMENKO_DEFAULT_MODE;
    delete process.env.XDG_CONFIG_HOME;
  });

  describe('VALID_MODES', () => {
    test('includes all expected modes', () => {
      expect(configModule.VALID_MODES).toContain('off');
      expect(configModule.VALID_MODES).toContain('lite');
      expect(configModule.VALID_MODES).toContain('full');
      expect(configModule.VALID_MODES).toContain('ultra');
      expect(configModule.VALID_MODES).toContain('commit');
      expect(configModule.VALID_MODES).toContain('review');
      expect(configModule.VALID_MODES).toContain('compress');
      expect(configModule.VALID_MODES).toContain('translate');
    });

    test('does not include invalid modes', () => {
      expect(configModule.VALID_MODES).not.toContain('invalid');
      expect(configModule.VALID_MODES).not.toContain('');
    });
  });

  describe('getDefaultMode', () => {
    test('returns full by default', () => {
      expect(configModule.getDefaultMode()).toBe('full');
    });

    test('returns env var mode when set', () => {
      process.env.CAVEMENKO_DEFAULT_MODE = 'ultra';
      configModule = loadConfig();
      expect(configModule.getDefaultMode()).toBe('ultra');
    });

    test('returns env var mode case-insensitively', () => {
      process.env.CAVEMENKO_DEFAULT_MODE = 'LITE';
      configModule = loadConfig();
      expect(configModule.getDefaultMode()).toBe('lite');
    });

    test('ignores invalid env var mode', () => {
      process.env.CAVEMENKO_DEFAULT_MODE = 'invalid_mode';
      configModule = loadConfig();
      expect(configModule.getDefaultMode()).toBe('full');
    });

    test('reads from config file when env var not set', () => {
      process.env.XDG_CONFIG_HOME = tmpDir;
      const configDir = path.join(tmpDir, 'cavemenko');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({ defaultMode: 'ultra' }));
      configModule = loadConfig();
      expect(configModule.getDefaultMode()).toBe('ultra');
    });
  });

  describe('safeWriteFlag', () => {
    test('writes flag file with correct content', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      configModule.safeWriteFlag(flagPath, 'ultra');
      expect(fs.readFileSync(flagPath, 'utf8')).toBe('ultra');
    });

    test('creates parent directory if needed', () => {
      const nestedDir = path.join(tmpDir, 'sub', 'dir');
      const flagPath = path.join(nestedDir, '.cavemenko-active');
      configModule.safeWriteFlag(flagPath, 'full');
      expect(fs.readFileSync(flagPath, 'utf8')).toBe('full');
    });

    test('refuses to write if flag path is a symlink', () => {
      const realFile = path.join(tmpDir, 'real-file');
      fs.writeFileSync(realFile, 'original');
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.symlinkSync(realFile, flagPath);
      configModule.safeWriteFlag(flagPath, 'ultra');
      // Original file should not be modified
      expect(fs.readFileSync(realFile, 'utf8')).toBe('original');
    });

    test('sets file permissions to 0600', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      configModule.safeWriteFlag(flagPath, 'full');
      const st = fs.statSync(flagPath);
      expect(st.mode & 0o777).toBe(0o600);
    });
  });

  describe('readFlag', () => {
    test('returns mode from valid flag file', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'ultra');
      expect(configModule.readFlag(flagPath)).toBe('ultra');
    });

    test('returns null for non-existent file', () => {
      const flagPath = path.join(tmpDir, 'nonexistent');
      expect(configModule.readFlag(flagPath)).toBeNull();
    });

    test('returns null for symlink', () => {
      const realFile = path.join(tmpDir, 'real-file');
      fs.writeFileSync(realFile, 'full');
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.symlinkSync(realFile, flagPath);
      expect(configModule.readFlag(flagPath)).toBeNull();
    });

    test('returns null for oversized file', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'x'.repeat(100));
      expect(configModule.readFlag(flagPath)).toBeNull();
    });

    test('returns null for invalid mode content', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'invalid_mode');
      expect(configModule.readFlag(flagPath)).toBeNull();
    });

    test('trims whitespace from mode', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, '  ultra  \n');
      expect(configModule.readFlag(flagPath)).toBe('ultra');
    });

    test('handles case insensitively', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'FULL');
      expect(configModule.readFlag(flagPath)).toBe('full');
    });
  });

  describe('loadCustomAbbreviations', () => {
    test('returns empty object when file does not exist', () => {
      expect(configModule.loadCustomAbbreviations()).toEqual({});
    });

    test('loads valid abbreviations', () => {
      process.env.XDG_CONFIG_HOME = tmpDir;
      const configDir = path.join(tmpDir, 'cavemenko');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'abbr.json'), JSON.stringify({
        'КБ': 'кодова база',
        'ФР': 'фронтенд'
      }));
      configModule = loadConfig();
      const abbr = configModule.loadCustomAbbreviations();
      expect(abbr).toEqual({ 'КБ': 'кодова база', 'ФР': 'фронтенд' });
    });

    test('ignores non-string values', () => {
      process.env.XDG_CONFIG_HOME = tmpDir;
      const configDir = path.join(tmpDir, 'cavemenko');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'abbr.json'), JSON.stringify({
        'КБ': 'кодова база',
        'bad': 123,
        'also_bad': null
      }));
      configModule = loadConfig();
      const abbr = configModule.loadCustomAbbreviations();
      expect(abbr).toEqual({ 'КБ': 'кодова база' });
    });

    test('returns empty for invalid JSON', () => {
      process.env.XDG_CONFIG_HOME = tmpDir;
      const configDir = path.join(tmpDir, 'cavemenko');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'abbr.json'), 'not json');
      configModule = loadConfig();
      expect(configModule.loadCustomAbbreviations()).toEqual({});
    });

    test('returns empty for array JSON', () => {
      process.env.XDG_CONFIG_HOME = tmpDir;
      const configDir = path.join(tmpDir, 'cavemenko');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'abbr.json'), '["a","b"]');
      configModule = loadConfig();
      expect(configModule.loadCustomAbbreviations()).toEqual({});
    });
  });

  describe('loadProjectConfig', () => {
    test('returns null when file does not exist', () => {
      expect(configModule.loadProjectConfig()).toBeNull();
    });

    test('loads valid project config from cwd', () => {
      const originalCwd = process.cwd();
      process.chdir(tmpDir);
      fs.writeFileSync(path.join(tmpDir, '.cavemenko.json'), JSON.stringify({
        defaultMode: 'ultra',
        abbreviations: { 'ТСК': 'таск' }
      }));
      configModule = loadConfig();
      const config = configModule.loadProjectConfig();
      expect(config).toEqual({ defaultMode: 'ultra', abbreviations: { 'ТСК': 'таск' } });
      process.chdir(originalCwd);
    });
  });

  describe('getEffectiveMode', () => {
    test('prefers env var over everything', () => {
      process.env.CAVEMENKO_DEFAULT_MODE = 'lite';
      configModule = loadConfig();
      expect(configModule.getEffectiveMode()).toBe('lite');
    });

    test('falls back to full when nothing configured', () => {
      configModule = loadConfig();
      expect(configModule.getEffectiveMode()).toBe('full');
    });

    test('uses project config over user config', () => {
      const originalCwd = process.cwd();
      process.chdir(tmpDir);
      fs.writeFileSync(path.join(tmpDir, '.cavemenko.json'), JSON.stringify({
        defaultMode: 'ultra'
      }));
      configModule = loadConfig();
      expect(configModule.getEffectiveMode()).toBe('ultra');
      process.chdir(originalCwd);
    });
  });
});
