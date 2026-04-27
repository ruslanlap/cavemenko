# 🦴 cavemenko

[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![Version](https://img.shields.io/github/v/release/ruslanlap/cavemenko?label=version&color=blue)](https://github.com/ruslanlap/cavemenko/releases)
[![Claude Code](https://img.shields.io/badge/Claude_Code-plugin-blueviolet?logo=anthropic&logoColor=white)](https://www.anthropic.com/claude-code)
[![Token Savings](https://img.shields.io/badge/токени_економія-−65..90%25-brightgreen)](https://github.com/ruslanlap/cavemenko#як-стискається)
[![Language](https://img.shields.io/badge/мова-🇺🇦_Українська-blue)](https://github.com/ruslanlap/cavemenko)
[![Node.js](https://img.shields.io/badge/runtime-Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/ruslanlap/cavemenko/pulls)

> **Вогонь. Код. Менше слів.**

Plugin для [Claude Code](https://www.anthropic.com/claude-code) що вмикає **печерний режим** — видаляє воду, зберігає суть. −65–90% токенів без втрати точності. Побудований для українських розробників, розуміє обидві мови.

```
$ /cavemenko
╔─────────────────────────────────────────────────╗
│  Режим: FULL  ·  Токени: ↓ ~78%  ·  🦴 Active  │
╚─────────────────────────────────────────────────╝
```


---

## Зміст

- [Навіщо це](#-навіщо-це)
- [До vs Після](#-до-vs-після)
- [Встановлення](#-встановлення)
- [Використання](#-використання)
- [Рівні стиснення](#-рівні-стиснення)
- [Як стискається](#-як-стискається)
- [Конфігурація](#%EF%B8%8F-конфігурація)
- [Архітектура](#-архітектура)
- [Ліцензія](#-ліцензія)

---

## 🎯 Навіщо це

Claude Code за замовчуванням відповідає як академічна стаття: вступ, розвиток, висновок, ввічливість і ще раз ввічливість. Досвідченому розробнику це шум.

Cavemenko перемикає стиль на **інженерний**: конкретно, стисло, по суті — так, як говорять між собою в команді. Ніяких «Звичайно, із задоволенням допоможу...».

Назва: *cave* (печерна людина говорила коротко) + *menko* (зменшувальний суфікс). Плагін використовує рідні механізми мови, а не жорстке обрізання — граматика і сенс зберігаються.

---

## ⚡ До vs Після

<details open>
<summary><strong>React rerender</strong></summary>

**Без cavemenko (~230 символів):**
> Звичайно! Із задоволенням допоможу вам з цією проблемою. Давайте розберемося, що відбувається з вашим React-компонентом. Проблема, з якою ви зіткнулися, скоріше за все, пов'язана з тим, що при кожному рендерингу компонента створюється нове посилання на об'єкт...

**`full` (~50 символів):**
> Inline obj = нове ref кожен render → rerender. Оберни в `useMemo`.

**Економія: ~78%**

</details>

<details>
<summary><strong>Connection pooling в БД</strong></summary>

| Рівень | Відповідь |
|--------|----------|
| *(без плагіна)* | Pool reuse open connections до бази даних замість створення нового з'єднання на кожен запит. Це дозволяє уникнути накладних витрат на встановлення з'єднання та TCP handshake... |
| `lite` | Pool reuse open connections до БД замість створення нового на кожен request. Skip handshake overhead. |
| `full` | Pool — reuse open conn до БД. Skip handshake per request. |
| `ultra` | Pool = reuse conn БД. Skip handshake → fast. |

</details>

<details>
<summary><strong>Fix token expiry bug</strong></summary>

| Рівень | Відповідь |
|--------|----------|
| `lite` | Перевірка expiry використовує strict `<`, через що tokens на межі expiry відхиляються. Заміни на `<=`. |
| `full` | Bug — token expiry check. `<` → `<=`. Межа відкидається. |
| `ultra` | Bug: token exp, `<` → `<=`. |

</details>

---

## 📦 Встановлення

### Quick start

```
/plugin marketplace add ruslanlap/cavemenko
/plugin install cavemenko@cavemenko
```

### Інші варіанти

<details>
<summary>Git URL (HTTPS / SSH)</summary>

```
/plugin marketplace add https://github.com/ruslanlap/cavemenko.git
/plugin install cavemenko@cavemenko
```

```
/plugin marketplace add git@github.com:ruslanlap/cavemenko.git
/plugin install cavemenko@cavemenko
```

</details>

<details>
<summary>CLI (поза сесією)</summary>

```bash
claude plugin marketplace add ruslanlap/cavemenko
claude plugin install cavemenko@cavemenko

# з scope:
claude plugin install cavemenko@cavemenko --scope user
```

</details>

<details>
<summary>Pin to version</summary>

```
/plugin marketplace add https://github.com/ruslanlap/cavemenko.git#v2.0.0
/plugin install cavemenko@cavemenko
```

</details>

<details>
<summary>Local dev / fork</summary>

```bash
git clone https://github.com/ruslanlap/cavemenko.git
```

```
/plugin marketplace add /path/to/cavemenko
/plugin install cavemenko@cavemenko
```

Або one-shot без install:

```bash
claude --plugin-dir /path/to/cavemenko
```

</details>

<details>
<summary>Team / repo (.claude/settings.json)</summary>

Додай до `.claude/settings.json` у репо:

```json
{
  "extraKnownMarketplaces": {
    "cavemenko": {
      "source": { "source": "github", "repo": "ruslanlap/cavemenko" }
    }
  },
  "enabledPlugins": { "cavemenko@cavemenko": true }
}
```

</details>

<details>
<summary>Pre-seed для containers / CI</summary>

```bash
CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed \
  claude plugin marketplace add ruslanlap/cavemenko

CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed \
  claude plugin install cavemenko@cavemenko

# runtime:
export CLAUDE_CODE_PLUGIN_SEED_DIR=/opt/claude-seed
```

Деталі: [pre-populate plugins](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces#pre-populate-plugins-for-containers)

</details>

### Оновлення / видалення

```
/plugin marketplace update cavemenko       # оновити список
/plugin update cavemenko@cavemenko         # оновити плагін
/plugin disable cavemenko@cavemenko        # вимкнути (зберегти)
/plugin uninstall cavemenko@cavemenko      # видалити
```

---

## 🕹️ Використання

### Активація / деактивація

| Команда | Дія |
|---------|-----|
| `/cavemenko` | Увімкнути (default: `full`) |
| `/cavemenko lite\|full\|ultra` | Вибрати рівень |
| `/cavemenko off` | Вимкнути |
| `увімкни печерний`, `менше токенів`, `будь коротким` | Активація українською |
| `cavemenko on`, `cavemenko mode` | Активація англійською |
| `стоп печерний`, `вимкни печерний`, `звичайний режим` | Деактивація |

### Спеціальні команди

| Команда | Дія |
|---------|-----|
| `/cavemenko-commit` | Короткий commit message у стилі [Conventional Commits](https://www.conventionalcommits.org/) |
| `/cavemenko-review` | One-line code review comment |
| `/cavemenko-compress` | Стиснення документа / нотаток / специфікацій (target ≤30%) |
| `/cavemenko-translate` | Переклад eng документації → стиснена Ukrainian |
| `/cavemenko-stats` | Статистика сесії: режим, зекономлені токени |

---

## 📊 Рівні стиснення

| Рівень | Стиль | Найкраще для |
|--------|-------|--------------|
| `lite` | Повні речення без води і hedging | Документація, пояснення для інших |
| `full` *(default)* | Фрагменти, наказовий спосіб, short forms | Щоденна розробка |
| `ultra` | Abbr, arrows (`X → Y`), max eng/ukr mix | Power users, code review, specs |

### Один запит на трьох рівнях

**«Чому React компонент rerender?»**

| Level | Response |
|-------|----------|
| `lite` | Компонент перерендерюється, бо при кожному render створюється нове ref на object. Оберніть в `useMemo`, щоб ref стабілізувалося. |
| `full` | Inline obj = нове ref кожен render. Оберни в `useMemo`. |
| `ultra` | Inline obj → new ref → rerender. `useMemo`. |

**«Поясни connection pooling в БД»**

| Level | Response |
|-------|----------|
| `lite` | Pool reuse open connections до БД замість створення нового на кожен request. Skip handshake overhead. |
| `full` | Pool — reuse open conn до БД. Skip handshake per request. |
| `ultra` | Pool = reuse conn БД. Skip handshake → fast. |

---

## 🔬 Як стискається

Cavemenko не обрізає текст — він використовує **рідні** механізми української мови та зрозумілі tech-скорочення. Граматика і точність зберігаються.

| Прийом | До → Після | Економія |
|--------|-----------|----------|
| Pro-drop | `я думаю` → `думаю` | −1 слово |
| Тире замість зв'язки | `це є баг` → `баг` | −2 слова |
| Short forms | `код зламаний` → `код зламано` | −2 символи |
| Наказовий спосіб | `потрібно обернути` → `оберни` | −1 слово |
| Орудний відмінок | `за допомогою команди` → `командою` | −2 слова |
| Drop «що» | `думаю, що баг` → `думаю: баг` | −1 слово |
| Eng terms | `автентифікація` → `auth` | −10 символів |
| Eng terms | `програмне забезпечення` → `software` | −14 символів |
| Abbreviations | `і так далі` → `etc` | −8 символів |
| Abbreviations | `наприклад` → `eg` | −7 символів |
| Mix slangs | `виконай` → `do` | −5 символів |

<details>
<summary><strong>Повна таблиця абревіатур (ultra mode)</strong></summary>

| Abbr | Повна форма |
|------|-------------|
| БД | база даних |
| ПЗ | software |
| ОС | operating system |
| ШІ | AI |
| фн | function |
| імпл | implementation |
| конф | config |
| auth | автентифікація |
| env | оточення |
| dep / deps | залежність / залежності |
| repo | репозиторій |
| PR | pull request |
| CI/CD | continuous integration/delivery |
| eg | наприклад |
| etc | і так далі |
| ASAP | якнайшвидше |
| API | програмний інтерфейс |
| UI/UX | user interface / user experience |
| ТЗ | технічне завдання |
| MVP | мінімально життєздатний продукт |
| ORM | object-relational mapping |
| CLI | command-line interface |
| SDK | software development kit |
| JWT | JSON web token |
| SSR/SSG | server-side rendering / static generation |
| DRY | don't repeat yourself |
| CRUD | create, read, update, delete |

</details>

### Авто-визначення мови

Cavemenko читає мову промпту і відповідає відповідно:

- Запит англійською → стиснена англійська відповідь
- Запит українською → стиснена українська відповідь

### Контекстне стиснення

| Контекст | Рівень стиснення |
|----------|------------------|
| Пояснення, документація | Максимальний |
| Архітектурні рішення | Середній |
| Помилки, security | Мінімальний (точність важлива) |

---

## ⚙️ Конфігурація

### Пріоритет налаштувань

```
CAVEMENKO_DEFAULT_MODE (env var)
  └── .cavemenko.json (root репо)
        └── ~/.config/cavemenko/config.json
              └── default: full
```

### Глобальний конфіг

```json
// ~/.config/cavemenko/config.json
{
  "defaultMode": "ultra"
}
```

Або через змінну оточення:

```bash
export CAVEMENKO_DEFAULT_MODE=ultra
```

### Per-project конфіг

Додай `.cavemenko.json` у корінь репо:

```json
{
  "defaultMode": "ultra",
  "abbreviations": {
    "ТСК": "таск-трекер",
    "СПР": "спринт"
  }
}
```

### Custom abbreviations (user-level)

Створи `~/.config/cavemenko/abbr.json`:

```json
{
  "КБ": "кодова база",
  "ФР": "фронтенд",
  "БР": "бекенд",
  "ТЛ": "техлід",
  "СР": "сервер"
}
```

Project-level abbr зливаються з user-level і перевизначають їх при конфліктах.

### Statusline

Показує активний режим і зекономлені токени прямо в UI Claude Code.

**macOS / Linux** — додай до `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/plugins/cavemenko/hooks/cavemenko-statusline.sh"
  }
}
```

**Windows:**

```json
{
  "statusLine": {
    "type": "command",
    "command": "powershell -File ~/.claude/plugins/cavemenko/hooks/cavemenko-statusline.ps1"
  }
}
```

Можливі значення: `[CAVEMENKO]` · `[CAVEMENKO:ULTRA]` · `[CAVEMENKO:ULTRA ↓2k]`

---

## 🏗️ Архітектура

```
SessionStart hook
  ├─ Записує .cavemenko-active (statusline читає)
  ├─ Завантажує SKILL.md → фільтрує по рівню → інджектить
  ├─ Завантажує custom abbr (user + project) → інджектить
  ├─ Визначає конфлікти з іншими плагінами → попереджає
  └─ Перевіряє statusline → пропонує налаштування

UserPromptSubmit hook
  ├─ Відстежує /cavemenko lite|full|ultra|off
  ├─ Відстежує /cavemenko-{commit,review,compress,translate,stats}
  ├─ Парсить фрази активації/деактивації (укр + eng)
  └─ Надсилає per-turn reinforcement (модель не дрейфує)

Statusline
  ├─ Читає mode flag → [CAVEMENKO:LEVEL]
  └─ Читає stats file → token savings counter
```

### Безпека

- **Flag file** — symlink-safe write/read, `O_NOFOLLOW`, whitelist validation
- **Statusline** — cap 64 bytes, strip non-`[a-z0-9-]`, whitelist before render
- **Zero secrets · zero network · zero external deps**

---

## 📄 Ліцензія

[MIT](LICENSE) © [ruslanlap](https://github.com/ruslanlap)

Натхнено [caveman](https://github.com/JuliusBrussee/caveman) by Julius Brussee — побудовано з нуля для Ukrainian dev workflow.
# cavemenko
