const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'integrations', 'hermes', 'cavemenko-stats.py');

// Hermes integration: the stats script must exist, be executable Python, and
// never claim a savings percentage without a baseline.
describe('Hermes integration', () => {
  test('stats script exists and is valid Python', () => {
    expect(fs.existsSync(SCRIPT)).toBe(true);
    const src = fs.readFileSync(SCRIPT, 'utf8');
    // A syntax error here is the failure mode we care about: a broken script
    // that only fails at runtime on the user's machine.
    execFileSync('python3', ['-c', `compile(open(${JSON.stringify(SCRIPT)}).read(), 'x', 'exec')`]);
    expect(src).toContain('session_model_usage');
  });

  test('reads Hermes state db, not a transcript', () => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    expect(src).toContain('state.db');
    expect(src).toContain('output_tokens');
  });

  test('declines to invent a savings percentage', () => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    expect(src).toMatch(/не рахується|краще 0, ніж вигадка/);
  });

  test('has an integration README', () => {
    const readme = path.join(__dirname, '..', 'integrations', 'hermes', 'README.md');
    expect(fs.existsSync(readme)).toBe(true);
    const text = fs.readFileSync(readme, 'utf8');
    expect(text).toContain('auto_load');
    expect(text).toContain('cavemenko-stats.py');
  });
});
