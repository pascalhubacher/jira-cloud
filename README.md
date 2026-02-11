# Jira Cloud MCP Server

A Model Context Protocol (MCP) server that provides tools to interact with Jira Cloud. This server allows AI assistants like Claude to search for issues, create new issues, and manage your Jira projects.

## Features

- **Search Issues**: Query Jira issues using JQL (Jira Query Language)
- **Create Issues**: Create new Jira issues with customizable fields

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
- Keep your `.env` file secure and never commit it to version control

### Example `.env` file

```env
JIRA_HOST="https://mycompany.atlassian.net"
JIRA_EMAIL="john.doe@mycompany.com"
JIRA_API_TOKEN="ATATT3xFfGF0..."
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
        "-d", "Ubuntu-24.04",
        "--cd", "/home/<username>/git/jira-cloud",
        "/home/<username>/.nvm/versions/node/<version>/bin/node", "index.js"
      ],
      "env": {
        "JIRA_HOST": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
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
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

After updating the configuration, restart Claude Desktop.

## Available Tools

### getIssuesByJQL

Search for Jira issues using JQL queries.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jql` | string | Yes | JQL query string (e.g., `project = TEST`) |
| `maxResults` | number | No | Maximum number of results (default: 50) |

**Example queries:**
- `project = MYPROJECT` - All issues in a project
- `assignee = currentUser()` - Issues assigned to you
- `status = "In Progress"` - Issues in progress
- `created >= -7d` - Issues created in the last 7 days
- `project = TEST AND status != Done ORDER BY priority DESC` - Complex query

### createIssue

Create a new Jira issue.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | Project key (e.g., `TEST`) |
| `summary` | string | Yes | Issue title |
| `description` | string | No | Issue description |
| `issueType` | string | No | Issue type (default: `Task`) |

**Supported issue types:** Task, Bug, Story, Epic (depends on your project configuration)

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
