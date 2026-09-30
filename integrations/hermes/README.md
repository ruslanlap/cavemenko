# Hermes integration

## Install

```bash
hermes skills install \
  "https://raw.githubusercontent.com/ruslanlap/cavemenko/master/skills/cavemenko/SKILL.md" \
  --category productivity
```

Hermes fetches the file, runs its security scan (verdict for this repo: `SAFE`), and installs it as `productivity/cavemenko`. No build step, no dependencies — the skill is one `SKILL.md`.

Add `--yes` for non-interactive use.

## Updates

The install is source-tracked, so Hermes knows where it came from:

```bash
hermes skills check       # is a newer version available
hermes skills update      # pull it
hermes skills uninstall productivity/cavemenko
```

`hermes skills list` shows the source as `url` / `community`.

## Auto-load

Installing makes the skill *available*; it does not make it *active every turn*. For that, add to `~/.hermes/config.yaml`:

```yaml
skills:
  auto_load:
    - cavemenko
```

Without it, activate per session with `/cavemenko`. Levels: `/cavemenko lite|full|ultra`, off via `звичайний режим`.

## Offline install

```bash
mkdir -p ~/.hermes/skills/productivity/cavemenko
cp skills/cavemenko/SKILL.md ~/.hermes/skills/productivity/cavemenko/
```

Local installs are not source-tracked, so `hermes skills check` will not report updates for them.

## Real stats

Hermes bills every call into `state.db` (table `session_model_usage`) with provider-reported token counts, so nothing needs estimating:

```bash
curl -sL "https://raw.githubusercontent.com/ruslanlap/cavemenko/master/integrations/hermes/cavemenko-stats.py" \
  -o ~/.local/bin/cavemenko-stats
chmod +x ~/.local/bin/cavemenko-stats
cavemenko-stats            # latest session
cavemenko-stats --last 5   # per-session table
```

Output/input/cache-read tokens, API calls, average tokens per call.

**It does not compute a savings percentage.** There is no baseline session to compare against, and a made-up ratio is worse than none. Compare two sessions with `--last 5` and read the ratio yourself.

Override the DB path with `HERMES_STATE_DB=/path/to/state.db` if it is not at `/opt/data/state.db`.

The Claude Code `Stop` hook (`hooks/cavemenko-stats.js`) is the equivalent path for that host; this script is the Hermes counterpart and reads Hermes' own accounting rather than counting transcript characters.
