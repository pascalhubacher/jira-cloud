---
name: update-docs
description: Update README.md and CLAUDE.md to reflect the current state of the project. Use after adding tools, changing parameters, restructuring tests, or updating dependencies.
allowed-tools: Read, Glob, Grep, Edit, Write
---

Update both `README.md` and `CLAUDE.md` so they accurately reflect the current state of the codebase. Do not invent or assume — derive every piece of information from the source files directly.

---

## Step 1 — Read the source of truth

Read these files to gather the current state:

1. `package.json` — version, npm scripts, dependencies, Node.js engine if set
2. `src/config.js` — which environment variables are required and their names
3. All tool files in `src/tools/` except `index.js` — for each file read:
   - `definition.name`
   - `definition.description`
   - `definition.inputSchema.properties` (each param: type, description, default)
   - `definition.inputSchema.required` (which params are required)
   - `handler` body — to understand the exact behaviour, project scoping logic, and error cases
4. `src/tools/index.js` — canonical tool registry order
5. `src/infrastructure/jira-client.js` — what the client object exposes (`sdk`, `jiraFetch`, `jiraPost`, `project`)
6. `src/server.js` — how the MCP server is wired, error handling strategy
7. `tests/unit/` — glob all `*.test.js` files
8. `tests/integration/` — glob all `*.test.js` files
9. `vitest.config.js` and `vitest.integration.config.js` — test include patterns

---

## Step 2 — Read the current documents

Read both files in full:
- `README.md`
- `CLAUDE.md`

---

## Step 3 — Update README.md

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
4. Keep hand-written notes and examples that are still accurate; remove any that reference removed parameters

### Rules for the Test Structure section

Regenerate the directory tree from the actual files on disk. Do not list files that don't exist. Do not omit files that do exist.

### Rules for the Project Structure section

If the section exists, update it to match the actual folder layout. If it doesn't exist, add it after the Features section.

### Rules for the Environment Configuration section

The `.env` block, the Important notes list, and both Claude Desktop `env` blocks (WSL and macOS/Linux) must all list exactly the variables required by `src/config.js` — no more, no less.

---

## Step 4 — Update CLAUDE.md

`CLAUDE.md` is the AI-readable deep reference that must be detailed enough to fully recreate the server. Apply only the changes needed. Do not rewrite sections that are already accurate.

### Sections to keep in sync

**Environment Variables table** — must match exactly what `src/config.js` validates. Update variable names, descriptions, or examples if they have changed.

**Tool Specifications** — for each tool, the following must reflect the source file exactly:
- Input schema (property names, types, `required` array, defaults)
- Behaviour steps (in order, including project scoping checks, which Jira endpoints are called, and what is returned)
- Any noted bugs or workarounds (e.g. jira.js `addComment` body bug)

When a tool's behaviour changes (new validation, different endpoint, new parameter), update the corresponding specification under `## Tool Specifications`.

**Infrastructure details** — if `src/infrastructure/jira-client.js` changes (new helper method, new returned property), update the `### src/infrastructure/jira-client.js` section and the `{ sdk, jiraFetch, jiraPost, project }` return value description.

**Config section** — if `src/config.js` changes (new env var, changed validation), update the `## Environment Variables` table and the `### src/config.js` section.

**Error Handling table** — if new error cases are introduced in any tool or in `server.js`, add them to the table.

**How to Add a New Tool** — update the code template if the tool file pattern or handler signature changes.

**Testing section** — update command examples and test file counts if they change.

### What NOT to change in CLAUDE.md

- Do not remove the MCP protocol usage section (JSON-RPC examples)
- Do not remove the Known Jira API Details section
- Do not remove the Claude Desktop configuration section
- Do not shorten or summarise existing accurate content — CLAUDE.md is intentionally verbose for AI consumption

---

## Step 5 — Report what changed

After updating both files, output a combined summary:

```
## Documentation Update Report

### README.md
#### Changes made:
- <section>: <what changed>

#### No changes needed:
- <section>: already accurate

### CLAUDE.md
#### Changes made:
- <section>: <what changed>

#### No changes needed:
- <section>: already accurate
```

If a document was already fully up to date, say so explicitly and make no changes to it.
