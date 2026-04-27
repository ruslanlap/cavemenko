const fs = require('fs');
const path = require('path');

const skillsDir = path.join(__dirname, '..', 'skills');

describe('skill files', () => {
  const expectedSkills = [
    'cavemenko',
    'cavemenko-commit',
    'cavemenko-review',
    'cavemenko-compress',
    'cavemenko-translate'
  ];

  expectedSkills.forEach(skillName => {
    describe(skillName, () => {
      const skillPath = path.join(skillsDir, skillName, 'SKILL.md');

      test('SKILL.md exists', () => {
        expect(fs.existsSync(skillPath)).toBe(true);
      });

      test('has YAML frontmatter', () => {
        const content = fs.readFileSync(skillPath, 'utf8');
        expect(content.startsWith('---')).toBe(true);
        expect(content.indexOf('---', 3)).toBeGreaterThan(3);
      });

      test('has name in frontmatter', () => {
        const content = fs.readFileSync(skillPath, 'utf8');
        const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
        expect(frontmatter).not.toBeNull();
        expect(frontmatter[1]).toContain('name:');
      });

      test('has description in frontmatter', () => {
        const content = fs.readFileSync(skillPath, 'utf8');
        const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
        expect(frontmatter[1]).toContain('description:');
      });

      test('has content after frontmatter', () => {
        const content = fs.readFileSync(skillPath, 'utf8');
        const body = content.replace(/^---[\s\S]*?---\s*/, '');
        expect(body.trim().length).toBeGreaterThan(50);
      });
    });
  });
});

describe('main cavemenko SKILL.md content', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(path.join(skillsDir, 'cavemenko', 'SKILL.md'), 'utf8');
  });

  test('contains compression techniques', () => {
    expect(content).toContain('Pro-drop');
    expect(content).toContain('Тире');
    expect(content).toContain('Short forms');
    expect(content).toContain('Наказовий');
    expect(content).toContain('Орудний');
  });

  test('contains abbreviation table', () => {
    expect(content).toContain('БД');
    expect(content).toContain('auth');
    expect(content).toContain('API');
    expect(content).toContain('ПДР');
    expect(content).toContain('CLI');
  });

  test('contains auto-detect language section', () => {
    expect(content).toContain('Auto-detect language');
  });

  test('contains context-aware compression section', () => {
    expect(content).toContain('Context-aware compression');
  });

  test('contains Ukrainian dev slangs section', () => {
    expect(content).toContain('Ukrainian dev slangs');
    expect(content).toContain('закоміть');
    expect(content).toContain('задеплой');
    expect(content).toContain('зарев\'юй');
  });

  test('contains intensity level examples', () => {
    expect(content).toContain('lite');
    expect(content).toContain('full');
    expect(content).toContain('ultra');
  });

  test('does not reference Russian version', () => {
    expect(content.toLowerCase()).not.toContain('cavemanov');
    expect(content.toLowerCase()).not.toContain('російськ');
    expect(content.toLowerCase()).not.toContain('russian');
  });
});
