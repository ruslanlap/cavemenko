---
name: cavemenko-review
description: >
  One-line code review comments. Use when user asks to review code,
  check changes, or calls /cavemenko-review.
---

Review current code changes. Format — one-line comments.

## Format

One line per issue:
```
L<line_number>: <severity> <problem>. <fix>.
```

Severity:
- `bug` — broken, doesn't work as intended
- `risk` — works but dangerous (race, leak, security)
- `nit` — style, minor
- `q` — question, needs clarification

## Rules

- Skip praise — "nicely written", "great idea" not needed
- Skip obvious — `missing semicolon`, `trailing whitespace` — linter's job
- If code ok — say `LGTM` and stop
- Max one line per issue; if more needed — split into multiple
- Line reference required

## Examples

Good:
```
L42: bug off-by-one in loop, `i <= arr.length` → IndexError. Use `<`.
L78: risk `JSON.parse` without try/catch — crash on invalid input.
L104: nit magic constant `86400`, replace with `SECONDS_PER_DAY`.
L130: q why retry with delay=0? This is a busy loop.
```

If all clean:
```
LGTM
```

Bad:
```
L42: Nice function, but could be improved. Maybe worth thinking about...
```

## Process

1. Read diff (`git diff` or specified file)
2. For each issue — one line in format above
3. Sort by severity: bug → risk → nit → q
4. If no issues — `LGTM` and stop
