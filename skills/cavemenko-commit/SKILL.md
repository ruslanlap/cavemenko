---
name: cavemenko-commit
description: >
  Generate short commit messages in Conventional Commits format.
  Use when user asks to generate commit, describe changes for git,
  or calls /cavemenko-commit.
---

Generate short commit msg for current staged changes.

## Format

Conventional Commits. Structure: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`

## Rules

- Subject: ≤50 chars, imperative, lowercase after type
- No period at end of subject
- Body: only when "why" is not obvious from subject
- Explain **why**, not **what** — `git diff` already shows what
- Empty line between subject and body
- Body: wrap at 72 chars

## Examples

Good:
```
fix(auth): check token expiry with strict inequality

Previous check used `<=` which accepted tokens at exact expiry time.
Clock skew between services caused intermittent 401s.
```

Good (self-sufficient subject):
```
docs: fix typo in README install instructions
```

Bad:
```
Updated some files.
```

Bad (repeating what diff shows):
```
feat: add new function called validateInput to utils.js
```

## Process

1. Read `git diff --cached`
2. Determine type and scope
3. Write subject (≤50 chars, imperative)
4. Decide if body needed — only if "why" not obvious
5. Output ready message in one block, no explanations
