# Jira Cloud MCP Server

A Model Context Protocol (MCP) server that provides tools to interact with Jira Cloud. This server allows AI assistants like Claude to search for issues, create new issues, and manage your Jira projects.

## Features

- **Search Issues**: Query Jira issues using JQL (Jira Query Language)
- **Create Issues**: Create new Jira issues with customizable fields
- **Update Issues**: Modify issue fields and transition status
- **Comments**: Add and retrieve comments on issues
- **Epics**: List, create, update epics and retrieve all child issues of an epic

## Project Structure

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
│       ├── get-comments.js
│       ├── get-epics.js
│       ├── create-epic.js
│       ├── update-epic.js
│       └── get-epic-issues.js
└── tests/
    ├── unit/                       # Unit tests (no API calls)
    └── integration/                # Integration tests (real Jira)
```

## Prerequisites

- Node.js v18 or higher
- A Jira Cloud account
- A Jira API token

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd jira-cloud
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment configuration (see below)

## Environment Configuration

Create a `.env` file in the project root directory with your Jira credentials:

```env
JIRA_HOST="https://your-domain.atlassian.net"
JIRA_EMAIL="your-email@example.com"
JIRA_API_TOKEN="your-api-token-here"
JIRA_PROJECT="YOUR-PROJECT-KEY"
```

### How to get your Jira API Token

1. Go to [Atlassian API Token Management](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Give your token a descriptive label (e.g., "MCP Server")
4. Click **Create**
5. Copy the generated token and paste it into your `.env` file

**Important:**
- The `JIRA_HOST` must include the protocol (`https://`)
- The `JIRA_EMAIL` must match your Atlassian account email
- The `JIRA_PROJECT` scopes all commands to a single project — operations on other projects are rejected
- Keep your `.env` file secure and never commit it to version control

### Example `.env` file

```env
JIRA_HOST="https://mycompany.atlassian.net"
JIRA_EMAIL="john.doe@mycompany.com"
JIRA_API_TOKEN="ATATT3xFfGF0..."
JIRA_PROJECT="SCRUM"
```

## Running the Server

### Locally (for testing)

```bash
node index.js
```

The server communicates via stdio, so you won't see output unless there's an error.

### With Claude Desktop

Add the following configuration to your Claude Desktop config file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Windows with WSL

If the server runs in WSL (Windows Subsystem for Linux), use this configuration:

```json
{
  "mcpServers": {
    "jira-cloud": {
      "command": "wsl.exe",
      "args": [
        "-d",
        "Ubuntu-24.04",
        "--cd",
        "/home/<username>/git/jira-cloud",
        "/home/<username>/.nvm/versions/node/<version>/bin/node",
        "index.js"
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

Replace:
- `<username>` with your WSL username
- `<version>` with your Node.js version (e.g., `v24.13.1`)
- `Ubuntu-24.04` with your WSL distribution name if different

To find your Node.js path in WSL, run: `which node`

**Note:** You can either use the `env` section in the config (as shown above) or create a `.env` file in the project directory. If both are present, the `env` section takes precedence.

#### Native macOS/Linux

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

After updating the configuration, restart Claude Desktop.

## Available Tools

### getIssuesByJQL

Fetch Jira issues using a JQL query.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jql` | string | Yes | JQL string (e.g., `project = TEST`) |
| `maxResults` | number | No | Limit results (default: 50) |

**Note:** If the JQL does not already contain a `project` filter, the server automatically prepends `project = <JIRA_PROJECT> AND` to scope results to the configured project.

**Example queries:**
- `assignee = currentUser()` - Issues assigned to you
- `status = "In Progress"` - Issues in progress
- `created >= -7d` - Issues created in the last 7 days
- `status != Done ORDER BY priority DESC` - Complex query

### createIssue

Create a new Jira issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | No | Project key (e.g., `TEST`). Defaults to the configured project if omitted. |
| `summary` | string | Yes | Issue title |
| `description` | string | No | Issue details |
| `issueType` | string | No | Type (Task, Bug, etc.) (default: `Task`) |

**Note:** Only issues in the configured `JIRA_PROJECT` can be created. Specifying a different project key returns an error.

**Supported issue types:** Task, Bug, Story, Epic (depends on your project configuration)

### addComment

Add a comment to an existing Jira issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issueKey` | string | Yes | Issue key (e.g., `TEST-123`) |
| `comment` | string | Yes | Comment text to add |

### updateIssue

Update fields of an existing Jira issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issueKey` | string | Yes | Issue key (e.g., `TEST-123`) |
| `summary` | string | No | New issue title |
| `description` | string | No | New issue description |
| `status` | string | No | New status (e.g., `In Progress`, `Done`) |

**Note:** Status transitions depend on your project's workflow configuration.

### getComments

Get all comments from a Jira issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issueKey` | string | Yes | Issue key (e.g., `TEST-123`) |

### getEpics

List all epics in the configured Jira project.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `maxResults` | number | No | Maximum number of epics to return (default: 50) |

### createEpic

Create a new Epic in the configured Jira project.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `summary` | string | Yes | Epic title |
| `epicName` | string | No | Short Epic name label (defaults to summary if omitted) |
| `description` | string | No | Epic details |

**Note:** Epics require an Epic Name field (`customfield_10011`) in Jira. When `epicName` is omitted it defaults to the value of `summary`.

### updateEpic

Update fields of an existing Epic (summary, epicName, description, status).

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issueKey` | string | Yes | Epic key (e.g., `TEST-42`) |
| `summary` | string | No | New epic title |
| `epicName` | string | No | New short Epic name label (customfield_10011) |
| `description` | string | No | New epic description |
| `status` | string | No | New status (e.g., `In Progress`, `Done`) |

**Note:** Status transitions depend on your project's workflow configuration.

### getEpicIssues

Get all child issues (Stories, Tasks, Bugs, etc.) belonging to an Epic.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `epicKey` | string | Yes | Epic key (e.g., `TEST-42`) |
| `maxResults` | number | No | Maximum number of issues to return (default: 50) |

## Testing

The project includes both unit tests and integration tests using [Vitest](https://vitest.dev/).

### Running Unit Tests

Unit tests validate tool definitions, schemas, and helper functions without making API calls.

```bash
npm test
```

Or run in watch mode for development:

```bash
npm run test:watch
```

### Running Integration Tests

Integration tests run against a real Jira Cloud instance. Make sure your `.env` file is configured correctly before running.

```bash
npm run test:integration          # all integration tests (issues + epics)
npm run test:integration:issues   # only issue-related integration tests
npm run test:integration:epics    # only epic-related integration tests
npm run test:all                  # unit tests + all integration tests
```

**Warning:** Integration tests will create, modify, and delete real Jira issues in your project. Test issues are automatically cleaned up after each test.

### Test Structure

```
tests/
├── unit/
│   ├── config.test.js              # Config validation tests
│   ├── tool-registry.test.js       # Registry structure and lookup tests
│   └── tools/
│       ├── get-issues-by-jql.test.js
│       ├── create-issue.test.js
│       ├── add-comment.test.js
│       ├── update-issue.test.js
│       ├── get-comments.test.js
│       ├── get-epics.test.js
│       ├── create-epic.test.js
│       ├── update-epic.test.js
│       └── get-epic-issues.test.js
└── integration/
    ├── issues.integration.test.js  # Integration tests for issue tools
    └── epics.integration.test.js   # Integration tests for epic tools
```

### Test Coverage

| Test Suite | Description |
|------------|-------------|
| **Tool Definitions** | Validates all 9 tools have correct schemas |
| **getIssuesByJQL** | Tests JQL search, pagination, error handling |
| **createIssue** | Tests issue creation and validation |
| **addComment** | Tests adding comments to issues |
| **getComments** | Tests retrieving comments |
| **updateIssue** | Tests field updates and status transitions |
| **getEpics** | Tests listing epics by JQL |
| **createEpic** | Tests epic creation with Epic Name field |
| **updateEpic** | Tests epic field updates and status transitions |
| **getEpicIssues** | Tests retrieving child issues of an epic |
| **Error Handling** | Tests graceful handling of invalid inputs |

### Customizing Integration Tests

The integration tests use constants that you may need to adjust for your Jira project:

```javascript
// tests/integration/issues.integration.test.js
// tests/integration/epics.integration.test.js
const TEST_PROJECT_KEY = 'SCRUM';      // Your project key
const TEST_ISSUE_TYPE_ID = '10003';    // Issue type ID (e.g., Story)
```

To find your issue type IDs, run:

```bash
curl -u your-email:your-api-token \
  https://your-domain.atlassian.net/rest/api/3/issue/createmeta/YOUR_PROJECT/issuetypes
```

## Troubleshooting

### "node: command not found" in WSL

When running from Windows, WSL doesn't load your shell profile. Use the full path to Node.js:

```bash
# Find your Node.js path
which node
# Output: /home/username/.nvm/versions/node/v24.13.1/bin/node
```

Use this full path in your Claude Desktop configuration.

### "401 Unauthorized" error

- Verify your API token is correct and not expired
- Ensure your email matches your Atlassian account
- Create a new API token if needed

### "410 Gone" error on search

This means the Jira API has changed. The server uses the new `/rest/api/3/search/jql` endpoint. Make sure you're using the latest version of this server.

### Connection issues

- Verify your `JIRA_HOST` includes `https://`
- Check your internet connection
- Ensure your Jira Cloud instance is accessible

## License

ISC
