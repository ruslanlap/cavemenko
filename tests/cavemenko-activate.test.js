const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const activatePath = path.join(__dirname, '..', 'hooks', 'cavemenko-activate.js');

function runActivate(env = {}) {
  const tmpDir = env.CLAUDE_CONFIG_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'cavemenko-act-'));
  const baseEnv = {
    ...process.env,
    CLAUDE_CONFIG_DIR: tmpDir,
    ...env
  };
  try {
    const output = execSync(`node "${activatePath}"`, {
      env: baseEnv,
      timeout: 5000,
      encoding: 'utf8'
    });
    return { output, claudeDir: tmpDir };
  } catch (e) {
    return { output: e.stdout || '', claudeDir: tmpDir, error: e };
  }
}

describe('cavemenko-activate', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cavemenko-activate-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.CAVEMENKO_DEFAULT_MODE;
  });

  test('writes flag file on activation', () => {
    const { claudeDir } = runActivate({ CLAUDE_CONFIG_DIR: tmpDir });
    const flagPath = path.join(claudeDir, '.cavemenko-active');
    expect(fs.existsSync(flagPath)).toBe(true);
    expect(fs.readFileSync(flagPath, 'utf8')).toBe('full');
  });

  test('outputs CAVEMENKO MODE ACTIVE', () => {
    const { output } = runActivate({ CLAUDE_CONFIG_DIR: tmpDir });
    expect(output).toContain('CAVEMENKO MODE ACTIVE');
  });

  test('off mode skips activation', () => {
    const { output, claudeDir } = runActivate({
      CLAUDE_CONFIG_DIR: tmpDir,
      CAVEMENKO_DEFAULT_MODE: 'off'
    });
    const flagPath = path.join(claudeDir, '.cavemenko-active');
    expect(fs.existsSync(flagPath)).toBe(false);
    expect(output).toBe('OK');
  });

  test('ultra mode writes ultra to flag', () => {
    const { claudeDir } = runActivate({
      CLAUDE_CONFIG_DIR: tmpDir,
      CAVEMENKO_DEFAULT_MODE: 'ultra'
    });
    const flagPath = path.join(claudeDir, '.cavemenko-active');
    expect(fs.readFileSync(flagPath, 'utf8')).toBe('ultra');
  });

  test('independent mode (commit) outputs mode-specific message', () => {
    const { output } = runActivate({
      CLAUDE_CONFIG_DIR: tmpDir,
      CAVEMENKO_DEFAULT_MODE: 'commit'
    });
    expect(output).toContain('commit');
  });

  test('includes statusline nudge when settings.json missing', () => {
    const { output } = runActivate({ CLAUDE_CONFIG_DIR: tmpDir });
    expect(output).toContain('statusLine');
  });

  test('no statusline nudge when already configured', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'settings.json'),
      JSON.stringify({ statusLine: { type: 'command', command: 'echo test' } })
    );
    const { output } = runActivate({ CLAUDE_CONFIG_DIR: tmpDir });
    expect(output).not.toContain('Статусрядок');
  });
});
