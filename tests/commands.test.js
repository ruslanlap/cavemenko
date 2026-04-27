const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const commandsDir = path.join(__dirname, '..', 'commands');

describe('command files', () => {
  const expectedCommands = [
    'cavemenko.toml',
    'cavemenko-commit.toml',
    'cavemenko-review.toml',
    'cavemenko-compress.toml',
    'cavemenko-translate.toml',
    'cavemenko-stats.toml'
  ];

  expectedCommands.forEach(cmdFile => {
    describe(cmdFile, () => {
      const cmdPath = path.join(commandsDir, cmdFile);

      test('file exists', () => {
        expect(fs.existsSync(cmdPath)).toBe(true);
      });

      test('has description field', () => {
        const content = fs.readFileSync(cmdPath, 'utf8');
        expect(content).toContain('description = ');
      });

      test('has prompt field', () => {
        const content = fs.readFileSync(cmdPath, 'utf8');
        expect(content).toContain('prompt = ');
      });

      test('description is non-empty', () => {
        const content = fs.readFileSync(cmdPath, 'utf8');
        const match = content.match(/description\s*=\s*"([^"]+)"/);
        expect(match).not.toBeNull();
        expect(match[1].length).toBeGreaterThan(5);
      });
    });
  });
});

describe('no Russian references in commands', () => {
  test('command files do not reference Russian version', () => {
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.toml'));
    files.forEach(file => {
      const content = fs.readFileSync(path.join(commandsDir, file), 'utf8').toLowerCase();
      expect(content).not.toContain('cavemanov');
      expect(content).not.toContain('російськ');
      expect(content).not.toContain('russian');
    });
  });
});
