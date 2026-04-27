const fs = require('fs');
const path = require('path');

describe('plugin.json', () => {
  let pluginConfig;

  beforeAll(() => {
    pluginConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '.claude-plugin', 'plugin.json'), 'utf8')
    );
  });

  test('is valid JSON', () => {
    expect(pluginConfig).toBeDefined();
  });

  test('has required fields', () => {
    expect(pluginConfig.name).toBe('cavemenko');
    expect(pluginConfig.version).toBeDefined();
    expect(pluginConfig.description).toBeDefined();
    expect(pluginConfig.author).toBeDefined();
    expect(pluginConfig.license).toBe('MIT');
  });

  test('has SessionStart hook', () => {
    expect(pluginConfig.hooks).toBeDefined();
    expect(pluginConfig.hooks.SessionStart).toBeDefined();
    expect(pluginConfig.hooks.SessionStart.length).toBeGreaterThan(0);
  });

  test('has UserPromptSubmit hook', () => {
    expect(pluginConfig.hooks.UserPromptSubmit).toBeDefined();
    expect(pluginConfig.hooks.UserPromptSubmit.length).toBeGreaterThan(0);
  });

  test('hook commands reference existing files', () => {
    const hooksDir = path.join(__dirname, '..', 'hooks');
    const sessionHook = pluginConfig.hooks.SessionStart[0].hooks[0];
    const promptHook = pluginConfig.hooks.UserPromptSubmit[0].hooks[0];

    // Extract filename from command
    const sessionFile = sessionHook.command.match(/hooks\/([^"]+)/)[1];
    const promptFile = promptHook.command.match(/hooks\/([^"]+)/)[1];

    expect(fs.existsSync(path.join(hooksDir, sessionFile))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, promptFile))).toBe(true);
  });

  test('author is ruslanlap', () => {
    expect(pluginConfig.author.name).toBe('ruslanlap');
  });

  test('version is 2.0.0', () => {
    expect(pluginConfig.version).toBe('2.0.0');
  });
});

describe('marketplace.json', () => {
  let marketplaceConfig;

  beforeAll(() => {
    marketplaceConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '.claude-plugin', 'marketplace.json'), 'utf8')
    );
  });

  test('is valid JSON', () => {
    expect(marketplaceConfig).toBeDefined();
  });

  test('has correct name', () => {
    expect(marketplaceConfig.name).toBe('cavemenko');
  });

  test('owner is ruslanlap', () => {
    expect(marketplaceConfig.owner.name).toBe('ruslanlap');
  });

  test('has plugins array', () => {
    expect(marketplaceConfig.plugins).toBeDefined();
    expect(marketplaceConfig.plugins.length).toBeGreaterThan(0);
  });

  test('plugin version matches plugin.json', () => {
    const pluginConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '.claude-plugin', 'plugin.json'), 'utf8')
    );
    expect(marketplaceConfig.metadata.version).toBe(pluginConfig.version);
  });
});
