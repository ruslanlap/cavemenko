#!/usr/bin/env node
// Simple lint script for cavemenko
// Checks: valid JSON, valid TOML structure, no Russian references, required files exist

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
let errors = 0;

function error(msg) {
  console.error(`ERROR: ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`WARN: ${msg}`);
}

// 1. Check JSON files
const jsonFiles = [
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  'package.json'
];

jsonFiles.forEach(file => {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath)) {
    error(`Missing required file: ${file}`);
    return;
  }
  try {
    JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`OK: ${file} (valid JSON)`);
  } catch (e) {
    error(`Invalid JSON in ${file}: ${e.message}`);
  }
});

// 2. Check TOML files (basic structure)
const commandsDir = path.join(rootDir, 'commands');
if (fs.existsSync(commandsDir)) {
  fs.readdirSync(commandsDir).filter(f => f.endsWith('.toml')).forEach(file => {
    const content = fs.readFileSync(path.join(commandsDir, file), 'utf8');
    if (!content.includes('description = ')) {
      error(`${file}: missing 'description' field`);
    }
    if (!content.includes('prompt = ')) {
      error(`${file}: missing 'prompt' field`);
    }
    console.log(`OK: commands/${file} (valid TOML structure)`);
  });
}

// 3. Check SKILL.md files
const skillsDir = path.join(rootDir, 'skills');
if (fs.existsSync(skillsDir)) {
  fs.readdirSync(skillsDir).forEach(dir => {
    const skillPath = path.join(skillsDir, dir, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      error(`Missing SKILL.md in skills/${dir}/`);
      return;
    }
    const content = fs.readFileSync(skillPath, 'utf8');
    if (!content.startsWith('---')) {
      error(`skills/${dir}/SKILL.md: missing YAML frontmatter`);
    }
    if (!content.includes('name:')) {
      error(`skills/${dir}/SKILL.md: missing 'name' in frontmatter`);
    }
    console.log(`OK: skills/${dir}/SKILL.md (valid structure)`);
  });
}

// 4. Check for Russian references
const filesToCheck = [];
function collectFiles(dir, exts) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      collectFiles(fullPath, exts);
    } else if (entry.isFile() && exts.some(ext => entry.name.endsWith(ext))) {
      filesToCheck.push(fullPath);
    }
  });
}

collectFiles(rootDir, ['.md', '.json', '.js', '.toml', '.sh', '.ps1']);

const russianPatterns = ['cavemanov', 'російськ', 'русськ', 'русск'];
const excludeDirs = ['tests', 'scripts', 'node_modules'];
filesToCheck
  .filter(file => !excludeDirs.some(d => file.includes(path.sep + d + path.sep) || file.includes('/' + d + '/')))
  .forEach(file => {
    const content = fs.readFileSync(file, 'utf8').toLowerCase();
    russianPatterns.forEach(pattern => {
      if (content.includes(pattern)) {
        error(`${path.relative(rootDir, file)}: contains Russian reference '${pattern}'`);
      }
    });
  });

// 5. Check JS files for syntax errors
const hooksDir = path.join(rootDir, 'hooks');
if (fs.existsSync(hooksDir)) {
  fs.readdirSync(hooksDir).filter(f => f.endsWith('.js')).forEach(file => {
    try {
      require(path.join(hooksDir, file));
      console.log(`OK: hooks/${file} (loads without error)`);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        error(`hooks/${file}: load error: ${e.message}`);
      } else {
        console.log(`OK: hooks/${file} (syntax valid, deps may differ at runtime)`);
      }
    }
  });
}

// 6. Version consistency
try {
  const pluginVersion = JSON.parse(fs.readFileSync(path.join(rootDir, '.claude-plugin', 'plugin.json'), 'utf8')).version;
  const marketplaceVersion = JSON.parse(fs.readFileSync(path.join(rootDir, '.claude-plugin', 'marketplace.json'), 'utf8')).metadata.version;
  const packageVersion = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version;

  if (pluginVersion !== marketplaceVersion) {
    error(`Version mismatch: plugin.json (${pluginVersion}) vs marketplace.json (${marketplaceVersion})`);
  }
  if (pluginVersion !== packageVersion) {
    error(`Version mismatch: plugin.json (${pluginVersion}) vs package.json (${packageVersion})`);
  }
  if (pluginVersion === marketplaceVersion && pluginVersion === packageVersion) {
    console.log(`OK: version ${pluginVersion} consistent across all files`);
  }
} catch (e) {
  error(`Version check failed: ${e.message}`);
}

console.log(`\n${errors === 0 ? 'All checks passed!' : `${errors} error(s) found.`}`);
process.exit(errors > 0 ? 1 : 0);
