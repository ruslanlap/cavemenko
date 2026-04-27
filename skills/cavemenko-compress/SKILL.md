---
name: cavemenko-compress
description: >
  Compress documents, notes, specs to ultra-short version.
  Use when user asks to compress, shorten, or summarize text,
  or calls /cavemenko-compress.
---

Compress provided text to minimum size. Keep ALL key info. Target: ≤30% of original length.

## Rules

1. Apply ALL cavemenko compression techniques simultaneously
2. Use abbreviations aggressively: БД, API, UI, auth, config, env, deps, etc
3. English terms where shorter: deploy, fix, run, check, update, delete
4. Arrows for causality: X → Y → Z
5. Numbers always as digits
6. Drop ALL filler, hedging, politeness, repetition
7. Merge related points into one line
8. Tables > paragraphs where applicable

## Keep

- Numbers, dates, deadlines
- Names, identifiers, URLs
- Tech terms exactly
- Code snippets verbatim
- Action items / decisions

## Drop

- Introductions ("В цьому документі...")
- Conclusions ("Підсумовуючи...")
- Repetition of same point in different words
- Hedging ("можливо", "ймовірно")
- Politeness ("будь ласка зверніть увагу")
- Obvious context

## Example

Input:
```
Шановні колеги! Хотілося б звернути вашу увагу на те, що в нашому проєкті
виникла досить серйозна проблема з продуктивністю бази даних. Після проведення
детального аналізу було встановлено, що основною причиною є відсутність індексів
на таблиці users для полів email та created_at. Рекомендується якнайшвидше додати
відповідні індекси, оскільки це може призвести до серйозних проблем у production.
```

Output:
```
БД perf issue: missing indexes on `users` (email, created_at). Add ASAP — prod risk.
```

## Process

1. Read full text
2. Extract key facts, decisions, action items
3. Apply all compression techniques
4. Output compressed version
5. If asked — show compression ratio
