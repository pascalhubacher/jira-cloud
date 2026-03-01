---
name: ddd-check
description: Check compliance with the DDD architecture AND MCP SDK specification of this Jira Cloud MCP Server project. Use when adding new files, refactoring, or reviewing code changes.
allowed-tools: Read, Glob, Grep
---

Perform a full compliance check for the Jira Cloud MCP Server project covering both DDD architecture rules and MCP SDK specification requirements (protocol revision 2025-06-18).

## Architecture rules to verify

The project follows this strict layered architecture:

```
index.js  (entry point only)
    └── src/server.js  (composition root)
            ├── src/config.js
            ├── src/infrastructure/jira-client.js
            └── src/tools/index.js
                    └── src/tools/*.js  (one file per tool)
```

**Dependency direction is strictly top-down. Tool files must not import from infrastructure or config — they receive `jiraClient` via function parameter (dependency injection).**

---

## Check 1 — Folder structure

Verify these files exist:

- `index.js`
- `src/config.js`
- `src/server.js`
- `src/infrastructure/jira-client.js`
- `src/tools/index.js`
- At least one tool file in `src/tools/` besides `index.js`
- `tests/unit/` directory with test files
- `tests/integration/` directory with test files

Report any missing required files as violations.

---

## Check 2 — Thin entry point

Read `index.js` and check:
- It should be ≤ 10 lines
- It should import `dotenv/config`
- It should call `startServer()` from `./src/server.js`
- It must NOT contain any business logic, tool definitions, or Jira API calls

---

## Check 3 — Config isolation

Read `src/config.js` and check:
- It exports `validateConfig()` function
- It exports a `config` object (default export)
- It must NOT import from anywhere inside `src/` (no cross-dependencies)
- All `process.env` access is centralised here

Then grep for `process.env` usage across all files in `src/` except `src/config.js`:
```
pattern: process\.env
path: src/
```
Any `process.env` reference outside `src/config.js` is a violation.

---

## Check 4 — Infrastructure encapsulation

Read `src/infrastructure/jira-client.js` and check:
- It exports a `createJiraClient(config)` factory function
- It is the only file that imports from `jira.js` or uses Basic Auth encoding
- It must NOT import any tool files

Grep for `from 'jira.js'` and `Version3Client` across all files except `src/infrastructure/jira-client.js`:
```
pattern: from ['"]jira\.js['"]
```
Any match outside `jira-client.js` is a violation.

---

## Check 5 — Tool file contracts

For each `.js` file in `src/tools/` except `index.js`:

Read the file and verify:
- It exports a `definition` object with `name`, `description`, and `inputSchema` fields
- It exports a `handler` function
- The `handler` function signature accepts `(jiraClient, args)` as parameters (dependency injection)
- It does NOT import from `src/infrastructure/`, `src/config.js`, or `src/server.js`
- It does NOT read `process.env` directly

---

## Check 6 — Tool registry

Read `src/tools/index.js` and check:
- It imports every tool file from `./` (no missing tools)
- It exports `getToolDefinitions()` function
- It exports `getToolHandler(name)` function
- It does NOT contain any inline tool logic (no `async function` that does Jira API calls)

Cross-check: every `src/tools/*.js` file (except `index.js`) must be imported in `src/tools/index.js`.

---

## Check 7 — Composition root

Read `src/server.js` and check:
- It imports from `src/config.js`, `src/infrastructure/jira-client.js`, and `src/tools/index.js`
- It exports a `startServer()` function
- It creates the MCP Server and wires `ListToolsRequestSchema` and `CallToolRequestSchema` handlers
- It calls `validateConfig()` before creating the Jira client
- It does NOT contain inline tool logic or direct Jira API calls

---

## Check 8 — Test structure

Verify:
- Unit tests exist under `tests/unit/` (not at top level `tests/`)
- Integration tests exist under `tests/integration/` (not at top level `tests/`)
- No test files exist directly under `tests/` (old structure)
- `vitest.config.js` includes `tests/unit/**/*.test.js`
- `vitest.integration.config.js` includes `tests/integration/**/*.test.js`

---

---

## MCP SDK Compliance Checks (protocol revision 2025-06-18)

### Check 9 — Server capabilities declaration

Read `src/server.js` and check:
- The `Server` constructor is called with `{ capabilities: { tools: {} } }`
- The `tools` capability must be declared (required by the spec for tool-serving servers)
- Both `ListToolsRequestSchema` and `CallToolRequestSchema` handlers are registered

---

### Check 10 — Tool definition fields

For each tool file in `src/tools/` (except `index.js`), read the `definition` export and check:

**Required fields (spec MUST):**
- `name`: unique string identifier for the tool
- `description`: human-readable description of functionality
- `inputSchema`: a valid JSON Schema object with `type: "object"`

**`inputSchema` correctness:**
- `type` must be `"object"`
- All parameters that the `handler` actually requires without a default value must be listed in `required`
- Each property must have a `type` and a `description`

**Optional but recommended:**
- `title`: human-readable display name (distinct from `name`)

Report any missing required fields or parameters that are used without a default but not listed in `required`.

---

### Check 11 — Tool result format

For each tool file in `src/tools/` (except `index.js`), read the `handler` function and check:

**Success responses (spec MUST):**
- Return an object with a `content` array
- Each item in `content` must have a `type` field (`"text"`, `"image"`, `"audio"`, `"resource"`, `"resource_link"`)
- For `type: "text"`, a `text` field (string) is required
- No `isError` field, or `isError: false`

**Error responses (spec requirement):**
- Tool execution errors (API failures, invalid business input) MUST be returned as `{ content: [...], isError: true }`, NOT thrown as uncaught exceptions
- Check that the handler does not use bare `throw` for business/API errors — these should return `isError: true` instead

---

### Check 12 — Protocol-level error handling in server

Read `src/server.js` and check:
- The `CallToolRequestSchema` handler wraps tool execution in a `try/catch`
- Any caught exception is converted to `{ content: [{ type: 'text', text: err.message }], isError: true }`
- This ensures that even if a tool throws unexpectedly, the client receives a tool execution error result rather than a JSON-RPC protocol error

---

## Output format

After completing all 12 checks, produce a structured report:

```
## Compliance Report (DDD + MCP SDK)

### Summary
- DDD checks: 8 (Checks 1–8)
- MCP SDK checks: 4 (Checks 9–12)
- Total: 12
- Passed: X
- Violations: Y

### DDD Results

✅ Check 1 — Folder structure: PASSED
✅ Check 2 — Thin entry point: PASSED
...
❌ Check N — <name>: FAILED
   Violation: <description of the problem>
   File: <path>
   Fix: <suggested fix>

### MCP SDK Results

✅ Check 9  — Server capabilities: PASSED
✅ Check 10 — Tool definition fields: PASSED
...
❌ Check N  — <name>: FAILED
   Violation: <description of the problem>
   File: <path>
   Fix: <suggested fix>

### Overall: COMPLIANT / NON-COMPLIANT
```

If all checks pass, confirm the project is fully compliant with both DDD and MCP SDK rules.
If any check fails, list each violation with the file path and a concrete suggestion to fix it.
