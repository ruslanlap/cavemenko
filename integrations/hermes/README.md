# Hermes integration

Hermes loads cavemenko as a skill. Three parts:

## 1. Install the skill

```bash
# copy the ruleset into a Hermes skill
mkdir -p ~/.hermes/skills/productivity/cavemenko
cp skills/cavemenko/SKILL.md ~/.hermes/skills/productivity/cavemenko/
```

Or point Hermes at the repo directly — the skill is one `SKILL.md`, no build step.

## 2. Auto-load it

`~/.hermes/config.yaml`:

```yaml
skills:
  auto_load:
    - cavemenko
```

Loaded every session, so no `/cavemenko` needed. Levels: `/cavemenko lite|full|ultra`, off via `звичайний режим`.

## 3. Real stats

Hermes already bills every call into `state.db` (table `session_model_usage`), so token counts need no estimating:

```bash
python3 integrations/hermes/cavemenko-stats.py            # latest session
python3 integrations/hermes/cavemenko-stats.py --last 5   # per-session table
```

Prints output/input/cache-read tokens, API calls, average tokens per call — all provider-reported.

**It does not compute a savings percentage.** There is no baseline session to compare against, and a made-up ratio is worse than none. Compare two sessions with `--last 5` and read the ratio yourself.

Override the DB path with `HERMES_STATE_DB=/path/to/state.db` if it is not at `/opt/data/state.db`.

The Claude Code `Stop` hook (`hooks/cavemenko-stats.js`) is a separate path for that host; this script is the Hermes equivalent and reads the same underlying idea from Hermes' own accounting rather than counting transcript characters.
