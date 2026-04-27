---
name: cavemenko-translate
description: >
  Translate English tech docs to compressed Ukrainian.
  Use when user asks to translate docs, README, or technical text,
  or calls /cavemenko-translate.
---

Translate English tech text → compressed Ukrainian. Don't translate then compress — do both at once.

## Rules

1. Translate meaning, not words
2. Keep English terms where shorter: auth, deploy, config, cache, middleware, callback, handler, endpoint, payload, runtime
3. Use all cavemenko compression techniques during translation
4. Result should be SHORTER than original English
5. Don't translate code, CLI commands, file paths, URLs
6. Don't translate well-known abbreviations: API, UI, UX, CI/CD, JWT, ORM, SDK, CLI

## Keep in English

- Tech terms shorter in English (see abbreviation table in main SKILL.md)
- Brand names: React, Docker, Kubernetes, PostgreSQL
- Code identifiers: function names, variable names, class names
- CLI commands and flags
- File extensions and paths

## Translate to Ukrainian

- Explanatory text
- Instructions (use imperative: "зроби", "додай", "запусти")
- Descriptions of behavior
- Error explanations

## Example

Input:
```
## Authentication

The application uses JWT-based authentication. When a user logs in,
the server generates a token that includes the user's ID and role.
This token must be included in the Authorization header of all
subsequent API requests.

To configure authentication, set the following environment variables:
- `AUTH_SECRET` — the secret key used to sign tokens
- `AUTH_EXPIRY` — token expiration time in seconds (default: 3600)
```

Output:
```
## Auth

JWT-based auth. При login server генерує token з user ID + role.
Token додавати в `Authorization` header всіх API requests.

Config env vars:
- `AUTH_SECRET` — secret key для signing tokens
- `AUTH_EXPIRY` — token expiry в seconds (default: 3600)
```

## Process

1. Read full English text
2. Identify terms to keep in English
3. Translate + compress simultaneously
4. Verify result is shorter than original
5. Output translated text
