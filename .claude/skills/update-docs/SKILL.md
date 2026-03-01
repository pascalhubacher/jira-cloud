---
name: update-docs
description: Update README.md to reflect the current state of the project. Use after adding tools, changing parameters, restructuring tests, or updating dependencies.
allowed-tools: Read, Glob, Grep, Edit, Write
---

Update `README.md` so it accurately reflects the current state of the codebase. Do not invent or assume — derive every piece of information from the source files directly.

---

## Step 1 — Read the source of truth

Read these files to gather the current state:

1. `package.json` — version, npm scripts, dependencies, Node.js engine if set
2. `src/config.js` — which environment variables are required (`JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and any others)
3. All tool files in `src/tools/` except `index.js` — for each file read:
   - `definition.name`
   - `definition.description`
   - `definition.inputSchema.properties` (each param: type, description, default)
   - `definition.inputSchema.required` (which params are required)
4. `src/tools/index.js` — to get the canonical order tools are registered in
5. `tests/unit/` — glob all `*.test.js` files to list what is tested
6. `tests/integration/` — glob all `*.test.js` files
7. `vitest.config.js` and `vitest.integration.config.js` — test include patterns

---

## Step 2 — Read the current README.md

Read the entire `README.md` to understand its current structure and content.

---

## Step 3 — Identify what is outdated

Compare what you found in Step 1 against the current README. Look for:

- **Tools section**: Are all tools listed? Are parameter names, types, required flags, and descriptions accurate? Are there tools in the README that no longer exist? Are there tools in `src/tools/` not yet in the README?
- **Test structure**: Does the directory tree match the actual test files on disk?
- **npm scripts**: Do the documented scripts match `package.json`?
- **Environment variables**: Do the documented env vars match what `src/config.js` requires?
- **Project structure section**: If a project structure diagram exists, does it match reality? If it doesn't exist, should one be added?

---

## Step 4 — Update README.md

Apply only the changes needed. Do not rewrite sections that are already accurate.

### Rules for the Available Tools section

For each tool (in registry order from `src/tools/index.js`):

1. Use `definition.name` as the section heading
2. Use `definition.description` as the opening sentence
3. Build the parameters table from `definition.inputSchema.properties`:
   - **Parameter**: property name in backticks
   - **Type**: the JSON Schema type
   - **Required**: `Yes` if in `required` array, `No` otherwise
   - **Description**: the property's `description` field, plus `(default: X)` if a `default` is set
4. Keep any hand-written example queries or notes that are still accurate; remove ones that reference removed parameters

### Rules for the Test Structure section

Regenerate the directory tree from the actual files on disk:
- `tests/unit/` contents
- `tests/integration/` contents

Do not list files that don't exist. Do not omit files that do exist.

### Rules for the Project Structure section

If a project structure / architecture section exists in the README, update it to match the actual folder layout. If it doesn't exist, add one after the Features section showing the DDD layer structure:

```
jira-cloud/
├── index.js                        # Entry point
├── src/
│   ├── server.js                   # Composition root (MCP server wiring)
│   ├── config.js                   # Environment configuration
│   ├── infrastructure/
│   │   └── jira-client.js          # Jira REST API + SDK client
│   └── tools/
│       ├── index.js                # Tool registry
│       ├── get-issues-by-jql.js
│       ├── create-issue.js
│       ├── add-comment.js
│       ├── update-issue.js
│       └── get-comments.js
└── tests/
    ├── unit/                       # Unit tests (no API calls)
    └── integration/                # Integration tests (real Jira)
```

Adjust the tree to match what actually exists on disk.

---

## Step 5 — Report what changed

After updating `README.md`, output a short summary:

```
## Documentation Update Report

### Changes made:
- <section>: <what changed>
- <section>: <what changed>

### No changes needed:
- <section>: already accurate

### Sections not found in README (consider adding):
- <section name>
```

If the README was already fully up to date, say so explicitly and make no changes.
