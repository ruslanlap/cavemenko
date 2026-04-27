const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const trackerPath = path.join(__dirname, '..', 'hooks', 'cavemenko-mode-tracker.js');

function runTracker(prompt, env = {}) {
  const input = JSON.stringify({ prompt });
  const baseEnv = {
    ...process.env,
    CLAUDE_CONFIG_DIR: env.CLAUDE_CONFIG_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'cavemenko-test-')),
    ...env
  };
  try {
    const output = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${trackerPath}"`, {
      env: baseEnv,
      timeout: 5000,
      encoding: 'utf8'
    });
    return { output, claudeDir: baseEnv.CLAUDE_CONFIG_DIR };
  } catch (e) {
    return { output: e.stdout || '', claudeDir: baseEnv.CLAUDE_CONFIG_DIR, error: e };
  }
}

describe('cavemenko-mode-tracker', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cavemenko-tracker-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.CAVEMENKO_DEFAULT_MODE;
  });

  describe('slash command activation', () => {
    test('/cavemenko writes flag file', () => {
      const { claudeDir } = runTracker('/cavemenko', { CLAUDE_CONFIG_DIR: tmpDir });
      const flagPath = path.join(claudeDir, '.cavemenko-active');
      expect(fs.existsSync(flagPath)).toBe(true);
      expect(fs.readFileSync(flagPath, 'utf8')).toBe('full');
    });

    test('/cavemenko ultra sets ultra mode', () => {
      runTracker('/cavemenko ultra', { CLAUDE_CONFIG_DIR: tmpDir });
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      expect(fs.readFileSync(flagPath, 'utf8')).toBe('ultra');
    });

    test('/cavemenko lite sets lite mode', () => {
      runTracker('/cavemenko lite', { CLAUDE_CONFIG_DIR: tmpDir });
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      expect(fs.readFileSync(flagPath, 'utf8')).toBe('lite');
    });

    test('/cavemenko off removes flag file', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'full');
      runTracker('/cavemenko off', { CLAUDE_CONFIG_DIR: tmpDir });
      expect(fs.existsSync(flagPath)).toBe(false);
    });

    test('/cavemenko-commit sets commit mode', () => {
      runTracker('/cavemenko-commit', { CLAUDE_CONFIG_DIR: tmpDir });
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      expect(fs.readFileSync(flagPath, 'utf8')).toBe('commit');
    });

    test('/cavemenko-review sets review mode', () => {
      runTracker('/cavemenko-review', { CLAUDE_CONFIG_DIR: tmpDir });
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      expect(fs.readFileSync(flagPath, 'utf8')).toBe('review');
    });

    test('/cavemenko-compress sets compress mode', () => {
      runTracker('/cavemenko-compress', { CLAUDE_CONFIG_DIR: tmpDir });
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      expect(fs.readFileSync(flagPath, 'utf8')).toBe('compress');
    });

    test('/cavemenko-translate sets translate mode', () => {
      runTracker('/cavemenko-translate', { CLAUDE_CONFIG_DIR: tmpDir });
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      expect(fs.readFileSync(flagPath, 'utf8')).toBe('translate');
    });

    test('/cavemenko-stats does not change mode', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'ultra');
      runTracker('/cavemenko-stats', { CLAUDE_CONFIG_DIR: tmpDir });
      expect(fs.readFileSync(flagPath, 'utf8')).toBe('ultra');
    });
  });

  describe('Ukrainian activation phrases', () => {
    test('увімкни печерний activates', () => {
      runTracker('увімкни печерний', { CLAUDE_CONFIG_DIR: tmpDir });
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      expect(fs.existsSync(flagPath)).toBe(true);
    });

    test('печерний режим activates', () => {
      runTracker('печерний режим', { CLAUDE_CONFIG_DIR: tmpDir });
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      expect(fs.existsSync(flagPath)).toBe(true);
    });

    test('менше токенів activates', () => {
      runTracker('менше токенів', { CLAUDE_CONFIG_DIR: tmpDir });
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      expect(fs.existsSync(flagPath)).toBe(true);
    });

    test('cavemenko on activates (English)', () => {
      runTracker('cavemenko on', { CLAUDE_CONFIG_DIR: tmpDir });
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      expect(fs.existsSync(flagPath)).toBe(true);
    });
  });

  describe('Ukrainian deactivation phrases', () => {
    test('стоп печерний deactivates', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'full');
      runTracker('стоп печерний', { CLAUDE_CONFIG_DIR: tmpDir });
      expect(fs.existsSync(flagPath)).toBe(false);
    });

    test('вимкни печерний deactivates', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'ultra');
      runTracker('вимкни печерний', { CLAUDE_CONFIG_DIR: tmpDir });
      expect(fs.existsSync(flagPath)).toBe(false);
    });

    test('звичайний режим deactivates', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'full');
      runTracker('звичайний режим', { CLAUDE_CONFIG_DIR: tmpDir });
      expect(fs.existsSync(flagPath)).toBe(false);
    });

    test('stop cavemenko deactivates (English)', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'full');
      runTracker('stop cavemenko', { CLAUDE_CONFIG_DIR: tmpDir });
      expect(fs.existsSync(flagPath)).toBe(false);
    });
  });

  describe('per-turn reinforcement', () => {
    test('emits reinforcement when active', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'full');
      const { output } = runTracker('some normal prompt', { CLAUDE_CONFIG_DIR: tmpDir });
      expect(output).toContain('CAVEMENKO MODE ACTIVE');
      expect(output).toContain('hookSpecificOutput');
    });

    test('does not emit reinforcement for independent modes', () => {
      const flagPath = path.join(tmpDir, '.cavemenko-active');
      fs.writeFileSync(flagPath, 'commit');
      const { output } = runTracker('some prompt', { CLAUDE_CONFIG_DIR: tmpDir });
      expect(output).not.toContain('CAVEMENKO MODE ACTIVE');
    });

    test('does not emit reinforcement when inactive', () => {
      const { output } = runTracker('some prompt', { CLAUDE_CONFIG_DIR: tmpDir });
      expect(output).not.toContain('CAVEMENKO MODE ACTIVE');
    });
  });
});
