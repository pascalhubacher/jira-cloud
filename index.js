import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Version3Client } from 'jira.js';

// Initialize Jira client
const jira = new Version3Client({
  host: process.env.JIRA_HOST,
  authentication: {
    basic: {
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
    },
  },
});

// Helper for direct API calls
const jiraFetch = async (path) => {
  const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
  const response = await fetch(`${process.env.JIRA_HOST}${path}`, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    },
  });
  return response.json();
};

// Create the MCP server
const server = new Server(
  {
    name: 'jira-cloud',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'getIssuesByJQL',
        description: 'Fetch Jira issues using a JQL query',
        inputSchema: {
          type: 'object',
          properties: {
            jql: {
              type: 'string',
              description: 'JQL string (e.g., project = TEST)',
            },
            maxResults: {
              type: 'number',
              description: 'Limit results',
              default: 50,
            },
          },
        },
      },
      {
        name: 'createIssue',
        description: 'Create a new Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key (e.g., TEST)',
            },
            summary: {
              type: 'string',
              description: 'Issue title',
            },
            description: {
              type: 'string',
              description: 'Issue details',
            },
            issueType: {
              type: 'string',
              description: 'Type (Task, Bug, etc.)',
            },
          },
          required: ['projectKey', 'summary'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'getIssuesByJQL': {
      const { jql, maxResults = 50 } = args;
      console.error(`Running JQL: ${jql}`);

      const encodedJql = encodeURIComponent(jql);
      const searchResult = await jiraFetch(
        `/rest/api/3/search/jql?jql=${encodedJql}&maxResults=${maxResults}`
      );

      // Fetch full issue details for each result
      const issues = await Promise.all(
        (searchResult.issues || []).map(async (issue) => {
          return jiraFetch(`/rest/api/3/issue/${issue.id}`);
        })
      );

      console.error(`Found ${issues.length} issues`);
      return {
        content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }],
      };
    }

    case 'createIssue': {
      const { projectKey, summary, description, issueType = 'Task' } = args;
      console.error(`Creating issue in ${projectKey}`);

      const issue = await jira.issues.createIssue({
        fields: {
          project: { key: projectKey },
          summary,
          description,
          issuetype: { name: issueType },
        },
      });

      console.error(`Created issue: ${issue.key}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jira MCP Server is running');
}

main().catch((err) => console.error('Error:', err));