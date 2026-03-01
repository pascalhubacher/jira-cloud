# Jira Cloud MCP Server — AI Reference Guide

This document is the single authoritative reference for this codebase. It is written for AI assistants and contains enough information to fully recreate the server, understand every architectural decision, and use all MCP tools correctly.

---

## What This Is

A **Model Context Protocol (MCP) server** that exposes Jira Cloud as a set of tools to AI assistants (e.g. Claude). It runs as a stdio process and communicates using the MCP protocol over stdin/stdout.

**Runtime:** Node.js (ES modules, `"type": "module"`)
**MCP SDK:** `@modelcontextprotocol/sdk` ^1.26.0
**Jira SDK:** `jira.js` ^5.3.0 (Version3Client)
**Test framework:** Vitest ^4.0.18

---

## Architecture — Domain-Driven Design

The project follows strict DDD layering. Dependencies flow **top-down only**. No layer imports from a layer above it.

```
index.js                      ← entry point (4 lines, loads .env, starts server)
  └── src/server.js            ← composition root (wires all layers together)
        ├── src/config.js      ← config layer (only module reading process.env)
        ├── src/infrastructure/
        │     └── jira-client.js  ← infrastructure layer (Jira SDK + HTTP auth)
        └── src/tools/
              ├── index.js     ← tool registry (aggregates all tools)
              ├── get-issues-by-jql.js
              ├── create-issue.js
              ├── add-comment.js
              ├── update-issue.js
              ├── get-comments.js
              ├── get-epics.js
              ├── create-epic.js
              ├── update-epic.js
              └── get-epic-issues.js
```

**Key constraint:** Tool files receive `jiraClient` via function parameter (dependency injection). They do NOT import from `src/infrastructure/` or `src/config.js` directly. This keeps tools independently testable with mock clients.

---

## Environment Variables

All four variables are **required**. The server throws on startup if any are missing.

| Variable | Description |
|----------|-------------|
| `JIRA_HOST` | Full Atlassian URL including protocol, e.g. `https://mycompany.atlassian.net` |
| `JIRA_EMAIL` | Atlassian account email for Basic Auth |
| `JIRA_API_TOKEN` | Atlassian API token (from id.atlassian.com/manage-profile/security/api-tokens) |
| `JIRA_PROJECT` | Project key to scope all operations, e.g. `SCRUM`. All tools reject requests targeting other projects. |

Source of truth: `src/config.js` — the only file that reads `process.env`.

---

## File-by-File Reference

### `index.js`
```javascript
import 'dotenv/config';
import { startServer } from './src/server.js';
startServer().catch((err) => console.error('Error:', err));
```
Entry point only. Loads `.env` file, delegates everything to `startServer()`.

---

### `src/config.js`
Exports two things:
- `validateConfig()` — throws if any required env var is missing
- `default config` — object with a getter `config.jira` that reads `process.env` live (not cached), and a static `config.server` object

The getter pattern (not a plain value) is critical for testability: tests manipulate `process.env` directly and need config to reflect changes without re-importing the module.

```javascript
const config = {
  get jira() {
    return {
      host: process.env.JIRA_HOST,
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
      project: process.env.JIRA_PROJECT,
    };
  },
  server: { name: 'jira-cloud', version: '1.0.0' },
};
```

---

### `src/infrastructure/jira-client.js`
The **only** file that knows about Jira authentication and the jira.js SDK. Exports one function:

```javascript
export function createJiraClient(config)
```

Returns an object `{ sdk, jiraFetch, jiraPost, project }`:

- **`sdk`** — `jira.js` `Version3Client` instance, for operations the library handles correctly
- **`jiraFetch(path)`** — GET requests to `JIRA_HOST + path` with Basic Auth header. Returns parsed JSON.
- **`jiraPost(path, data)`** — POST requests with JSON body. Returns parsed JSON.
- **`project`** — string, the configured project key (passed through from config for use by tool handlers)

**Auth:** Basic Auth using `Buffer.from(`${email}:${apiToken}`).toString('base64')`. The `Authorization: Basic <base64>` header is added to every `jiraFetch` and `jiraPost` call.

**Why direct fetch helpers exist:** The `jira.js` library has a bug where `issueComments.addComment()` does not correctly serialize the `body` parameter, causing Jira to reject it with "Comment body can not be empty". `jiraPost` bypasses the library for that endpoint.

---

### `src/tools/index.js` — Tool Registry
Imports all tool modules and exports two functions:

```javascript
export function getToolDefinitions()  // returns array of all tool definition objects
export function getToolHandler(name)  // returns the handler function for a named tool, throws if not found
```

Registry order (also the order tools are listed to clients):
1. `getIssuesByJQL`
2. `createIssue`
3. `addComment`
4. `updateIssue`
5. `getComments`
6. `getEpics`
7. `createEpic`
8. `updateEpic`
9. `getEpicIssues`

---

### `src/server.js` — Composition Root
Wires config + infrastructure + tools into a running MCP server.

```javascript
export async function startServer() {
  validateConfig();                              // throws if env vars missing
  const jiraClient = createJiraClient(config);  // creates infrastructure
  const server = new Server(
    { name: 'jira-cloud', version: '1.0.0' },
    { capabilities: { tools: {} } }             // declares tool capability to clients
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getToolDefinitions(),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = getToolHandler(name);        // throws Error if tool not found (protocol error)
    try {
      return await handler(jiraClient, args);    // passes jiraClient via DI
    } catch (err) {
      return { content: [{ type: 'text', text: err.message }], isError: true };
    }
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jira MCP Server is running');   // stderr only — stdout is reserved for MCP protocol
}
```

**Error handling strategy:**
- `getToolHandler` throwing (unknown tool name) → propagates as MCP protocol error (correct per spec)
- Tool handler throwing (runtime/API error) → caught, returned as `{ isError: true }` tool result (correct per spec)
- Tool returning `{ isError: true }` directly (business logic error) → passes through unchanged

---

## Tool Specifications

Each tool file exports:
- `definition` — MCP tool definition object (`name`, `description`, `inputSchema`)
- `handler(jiraClient, args)` — async function returning `{ content: [{ type: 'text', text: string }] }` on success or `{ content: [...], isError: true }` on error

### Tool: `getIssuesByJQL`

**Purpose:** Search Jira issues using JQL.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "jql": { "type": "string", "description": "JQL string (e.g., project = TEST)" },
    "maxResults": { "type": "number", "description": "Limit results", "default": 50 }
  },
  "required": ["jql"]
}
```

**Behaviour:**
1. If `jql` does not contain the word `project` (case-insensitive, word boundary), prepends `project = <JIRA_PROJECT> AND ` to automatically scope results.
2. Calls `GET /rest/api/3/search/jql?jql=<encoded>&maxResults=<n>` — this is the **new** endpoint (old `/rest/api/2/search` returns 410 Gone).
3. The new endpoint returns only issue stubs. For each stub, fetches full details via `GET /rest/api/3/issue/<id>`.
4. Returns all full issue objects as a JSON array.

**Auto-scoping regex:** `/\bproject\b/i` — matches the word `project` with word boundaries, so `projectRoles()` does NOT trigger it.

---

### Tool: `createIssue`

**Purpose:** Create a new Jira issue.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "projectKey": { "type": "string", "description": "Project key (e.g., TEST). Defaults to the configured project if omitted." },
    "summary": { "type": "string", "description": "Issue title" },
    "description": { "type": "string", "description": "Issue details" },
    "issueType": { "type": "string", "description": "Type (Task, Bug, etc.)" }
  },
  "required": ["summary"]
}
```

**Behaviour:**
1. `projectKey` defaults to `jiraClient.project` if omitted.
2. If `projectKey` (case-insensitive) does not match `jiraClient.project`, returns `isError: true` — no cross-project creation allowed.
3. `issueType` defaults to `"Task"`.
4. Uses `jiraClient.sdk.issues.createIssue({ fields: { project, summary, description, issuetype } })`.
5. Returns the created issue object (includes `key`, `id`, `self`).

---

### Tool: `addComment`

**Purpose:** Add a comment to an existing Jira issue.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "issueKey": { "type": "string", "description": "Issue key (e.g., TEST-123)" },
    "comment": { "type": "string", "description": "Comment text to add" }
  },
  "required": ["issueKey", "comment"]
}
```

**Behaviour:**
1. Validates `issueKey` starts with `<JIRA_PROJECT>-` (case-insensitive). Returns `isError: true` otherwise.
2. Uses `jiraClient.jiraPost` (NOT `jira.js` SDK) to `POST /rest/api/3/issue/<issueKey>/comment`.
3. Comment body must use **Atlassian Document Format (ADF)**:
   ```json
   {
     "body": {
       "type": "doc",
       "version": 1,
       "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "<comment>" }] }]
     }
   }
   ```
4. Returns the created comment object from Jira.

**Why jiraPost and not SDK:** `jira.js` v5.3.0 has a bug where `issueComments.addComment()` drops the `body` field, causing Jira to return "Comment body can not be empty".

---

### Tool: `updateIssue`

**Purpose:** Update fields and/or status of an existing Jira issue.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "issueKey": { "type": "string", "description": "Issue key (e.g., TEST-123)" },
    "summary": { "type": "string", "description": "New issue title" },
    "description": { "type": "string", "description": "New issue description" },
    "status": { "type": "string", "description": "New status (e.g., \"In Progress\", \"Done\")" },
    "assigneeAccountId": { "type": "string", "description": "Atlassian account ID of the assignee" }
  },
  "required": ["issueKey"]
}
```

**Behaviour:**
1. Validates `issueKey` belongs to `JIRA_PROJECT`. Returns `isError: true` otherwise.
2. If `summary`, `description`, or `assigneeAccountId` provided → calls `sdk.issues.editIssue({ issueIdOrKey, fields })`. `assigneeAccountId` maps to `fields.assignee = { accountId: assigneeAccountId }`.
3. If `status` provided → calls `sdk.issues.getTransitions({ issueIdOrKey })`, finds a matching transition (case-insensitive match on `transition.name` OR `transition.to.name`), calls `sdk.issues.doTransition({ issueIdOrKey, transition: { id } })`.
4. If no matching transition found → returns `isError: true` with list of available status names.
5. Fetches and returns the full updated issue via `jiraFetch`.

---

### Tool: `getComments`

**Purpose:** Retrieve all comments from a Jira issue.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "issueKey": { "type": "string", "description": "Issue key (e.g., TEST-123)" }
  },
  "required": ["issueKey"]
}
```

**Behaviour:**
1. Validates `issueKey` belongs to `JIRA_PROJECT`. Returns `isError: true` otherwise.
2. Calls `jiraClient.sdk.issueComments.getComments({ issueIdOrKey })`.
3. Returns the full response object (includes `total`, `comments` array).

---

### Tool: `getEpics`

**Purpose:** List all epics in the configured Jira project.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "maxResults": { "type": "number", "description": "Maximum number of epics to return", "default": 50 }
  },
  "required": []
}
```

**Behaviour:**
1. Builds JQL: `issuetype = Epic AND project = <JIRA_PROJECT> ORDER BY created DESC`.
2. Calls `GET /rest/api/3/search/jql?jql=<encoded>&maxResults=<n>` — returns issue stubs.
3. For each stub, fetches full details via `GET /rest/api/3/issue/<id>`.
4. Returns all full epic objects as a JSON array.

---

### Tool: `createEpic`

**Purpose:** Create a new Epic in the configured Jira project.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "summary": { "type": "string", "description": "Epic title" },
    "epicName": { "type": "string", "description": "Short Epic name label (defaults to summary if omitted)" },
    "description": { "type": "string", "description": "Epic details" }
  },
  "required": ["summary"]
}
```

**Behaviour:**
1. `epicName` defaults to `summary` if omitted.
2. Builds `fields` object: `project: { key: jiraClient.project }`, `summary`, `issuetype: { name: 'Epic' }`, `customfield_10011: epicName`.
3. Adds `description` to fields only if provided (omitting the key entirely when absent).
4. Uses `jiraClient.sdk.issues.createIssue({ fields })`.
5. Returns the created epic object (includes `key`, `id`, `self`).

**Note:** `customfield_10011` is the Epic Name field required by many Jira Cloud instances. Creating an epic without it may result in a 400 error depending on the project's field configuration.

---

### Tool: `updateEpic`

**Purpose:** Update fields and/or status of an existing Epic.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "issueKey": { "type": "string", "description": "Epic key (e.g., TEST-42)" },
    "summary": { "type": "string", "description": "New epic title" },
    "epicName": { "type": "string", "description": "New short Epic name label (customfield_10011)" },
    "description": { "type": "string", "description": "New epic description" },
    "status": { "type": "string", "description": "New status (e.g., \"In Progress\", \"Done\")" },
    "assigneeAccountId": { "type": "string", "description": "Atlassian account ID of the assignee" }
  },
  "required": ["issueKey"]
}
```

**Behaviour:**
1. Validates `issueKey` belongs to `JIRA_PROJECT`. Returns `isError: true` otherwise.
2. If `summary`, `description`, `epicName`, or `assigneeAccountId` provided → calls `sdk.issues.editIssue({ issueIdOrKey, fields })` where `epicName` maps to `customfield_10011` and `assigneeAccountId` maps to `fields.assignee = { accountId: assigneeAccountId }`.
3. If `status` provided → calls `sdk.issues.getTransitions({ issueIdOrKey })`, finds a matching transition (case-insensitive match on `transition.name` OR `transition.to.name`), calls `sdk.issues.doTransition({ issueIdOrKey, transition: { id } })`.
4. If no matching transition found → returns `isError: true` with list of available status names.
5. Fetches and returns the full updated epic via `jiraFetch`.

---

### Tool: `getEpicIssues`

**Purpose:** Get all child issues (Stories, Tasks, Bugs, etc.) belonging to an Epic.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "epicKey": { "type": "string", "description": "Epic key (e.g., TEST-42)" },
    "maxResults": { "type": "number", "description": "Maximum number of issues to return", "default": 50 }
  },
  "required": ["epicKey"]
}
```

**Behaviour:**
1. Validates `epicKey` belongs to `JIRA_PROJECT`. Returns `isError: true` otherwise.
2. Builds JQL: `parent = <epicKey> ORDER BY created ASC`.
3. Calls `GET /rest/api/3/search/jql?jql=<encoded>&maxResults=<n>` — returns issue stubs.
4. For each stub, fetches full details via `GET /rest/api/3/issue/<id>`.
5. Returns all full child issue objects as a JSON array.

**Note:** Uses the `parent =` JQL operator which works for both classic (company-managed) and next-gen (team-managed) Jira Cloud projects using API v3.

---

## MCP Protocol Usage

The server communicates over stdio using JSON-RPC 2.0. Clients discover tools with `tools/list` and invoke them with `tools/call`.

**Listing tools** — clients send:
```json
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }
```

**Calling a tool** — clients send:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "getIssuesByJQL",
    "arguments": { "jql": "status = 'In Progress'", "maxResults": 10 }
  }
}
```

**Successful response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{ "type": "text", "text": "[ ... JSON array of issues ... ]" }]
  }
}
```

**Error response (tool execution error):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{ "type": "text", "text": "Issue \"OTHER-1\" does not belong to project \"SCRUM\"." }],
    "isError": true
  }
}
```

All tool results are JSON strings inside the `text` field of a text content block.

---

## Error Handling Rules

| Situation | How handled |
|-----------|-------------|
| Unknown tool name in `tools/call` | `getToolHandler` throws → MCP protocol-level error |
| Wrong project in issue key | Tool returns `{ isError: true }` directly |
| Invalid status transition | Tool returns `{ isError: true }` with available statuses |
| Jira API throws (network, 401, 500) | Caught in `server.js` try/catch → returned as `{ isError: true }` |
| Missing env vars at startup | `validateConfig()` throws → process exits before accepting connections |

---

## How to Add a New Tool

1. Create `src/tools/<tool-name>.js` with this exact structure:
   ```javascript
   export const definition = {
     name: 'toolName',              // camelCase, unique
     description: 'What it does',
     inputSchema: {
       type: 'object',
       properties: {
         paramName: { type: 'string', description: '...' },
       },
       required: ['paramName'],     // list all params without defaults
     },
   };

   export async function handler(jiraClient, args) {
     const { paramName } = args;

     // Project validation (for issue-key-based tools):
     if (!issueKey.toUpperCase().startsWith(`${jiraClient.project.toUpperCase()}-`)) {
       return {
         content: [{ type: 'text', text: `Issue "${issueKey}" does not belong to project "${jiraClient.project}".` }],
         isError: true,
       };
     }

     const result = await jiraClient.jiraFetch('/rest/api/3/...');
     return {
       content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
     };
   }
   ```

2. Register it in `src/tools/index.js`:
   ```javascript
   import * as myNewTool from './my-new-tool.js';
   const tools = [...existingTools, myNewTool];
   ```

3. Add unit tests in `tests/unit/tools/<tool-name>.test.js` — mock `jiraClient` with `vi.fn()`, never make real API calls.

---

## Testing

```bash
npm test                          # unit tests (99 tests, no API calls)
npm run test:watch                # unit tests in watch mode
npm run test:integration          # all integration tests (requires valid .env)
npm run test:integration:issues   # only issue integration tests
npm run test:integration:epics    # only epic integration tests
npm run test:all                  # unit tests + all integration tests
```

**Unit test location:** `tests/unit/` — includes `config.test.js`, `tool-registry.test.js`, and one file per tool in `tests/unit/tools/`.

**Integration test locations:**
- `tests/integration/issues.integration.test.js` — tests for getIssuesByJQL, createIssue, addComment, getComments, updateIssue, and error handling. Creates and deletes real issues (`afterAll`).
- `tests/integration/epics.integration.test.js` — tests for getEpics, createEpic, updateEpic, getEpicIssues. Creates and deletes real epics and child issues (`afterAll`).

Both files use `TEST_PROJECT_KEY = 'SCRUM'` and `TEST_ISSUE_TYPE_ID = '10003'` (Story — adjust for your project).

**Vitest configs:**
- `vitest.config.js` → includes `tests/unit/**/*.test.js`
- `vitest.integration.config.js` → includes `tests/integration/**/*.test.js`, timeout 30s

---

## Claude Desktop Configuration

### Windows with WSL
```json
{
  "mcpServers": {
    "jira-cloud": {
      "command": "wsl.exe",
      "args": [
        "-d", "Ubuntu-24.04",
        "--cd", "/home/<username>/git/jira-cloud",
        "/home/<username>/.nvm/versions/node/<version>/bin/node", "index.js"
      ],
      "env": {
        "JIRA_HOST": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token",
        "JIRA_PROJECT": "YOUR-PROJECT-KEY"
      }
    }
  }
}
```

Use the **full path to node** (not just `node`) because WSL launched from Windows does not source the shell profile, so NVM-managed binaries are not on `PATH`. Find it with `which node` inside WSL.

### macOS / Linux
```json
{
  "mcpServers": {
    "jira-cloud": {
      "command": "node",
      "args": ["/path/to/jira-cloud/index.js"],
      "env": {
        "JIRA_HOST": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token",
        "JIRA_PROJECT": "YOUR-PROJECT-KEY"
      }
    }
  }
}
```

Config file locations:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

---

## Known Jira API Details

- **Search endpoint:** `GET /rest/api/3/search/jql?jql=<encoded>&maxResults=<n>` — the old `/rest/api/2/search` returns `410 Gone`
- **Comment body format:** Must use Atlassian Document Format (ADF), not plain text
- **Status transitions:** Cannot set status directly — must look up available transitions first and apply the transition ID
- **Issue type by name:** When creating issues, use `issuetype: { name: 'Task' }`. If the project doesn't have that type, Jira returns a 400 error. Use `issuetype: { id: '10003' }` for Story as a safer alternative for the SCRUM project.
- **Auth:** Basic Auth with base64-encoded `email:apiToken` — the standard Atlassian Cloud authentication method
