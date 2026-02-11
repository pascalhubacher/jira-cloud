/**
 * Jira Cloud MCP Server
 *
 * A Model Context Protocol (MCP) server that provides tools to interact with Jira Cloud.
 * This server enables AI assistants to search, create, and manage Jira issues.
 *
 * Environment Variables Required:
 *   - JIRA_HOST: Your Jira Cloud URL (e.g., https://your-domain.atlassian.net)
 *   - JIRA_EMAIL: Your Atlassian account email
 *   - JIRA_API_TOKEN: Your Jira API token (create at https://id.atlassian.com/manage-profile/security/api-tokens)
 *
 * Available Tools:
 * ================
 *
 * 1. getIssuesByJQL
 *    - Description: Search for Jira issues using JQL (Jira Query Language)
 *    - Parameters:
 *      - jql (string, required): JQL query string
 *      - maxResults (number, optional): Maximum results to return (default: 50)
 *    - Example JQL queries:
 *      - "project = TEST" - All issues in project TEST
 *      - "assignee = currentUser()" - Issues assigned to you
 *      - "status = 'In Progress'" - Issues in progress
 *      - "created >= -7d" - Issues created in the last 7 days
 *
 * 2. createIssue
 *    - Description: Create a new Jira issue
 *    - Parameters:
 *      - projectKey (string, required): Project key (e.g., "TEST")
 *      - summary (string, required): Issue title
 *      - description (string, optional): Issue description
 *      - issueType (string, optional): Issue type (default: "Task")
 *    - Supported issue types: Task, Bug, Story, Epic (depends on project configuration)
 *
 * 3. addComment
 *    - Description: Add a comment to an existing Jira issue
 *    - Parameters:
 *      - issueKey (string, required): Issue key (e.g., "TEST-123")
 *      - comment (string, required): Comment text to add
 *
 * 4. updateIssue
 *    - Description: Update fields of an existing Jira issue
 *    - Parameters:
 *      - issueKey (string, required): Issue key (e.g., "TEST-123")
 *      - summary (string, optional): New issue title
 *      - description (string, optional): New issue description
 *      - status (string, optional): New status (e.g., "In Progress", "Done")
 *
 * 5. getComments
 *    - Description: Get all comments from a Jira issue
 *    - Parameters:
 *      - issueKey (string, required): Issue key (e.g., "TEST-123")
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Version3Client } from 'jira.js';

// =============================================================================
// JIRA CLIENT SETUP
// =============================================================================

/**
 * Jira API client using jira.js library
 * Used for operations that work with the jira.js library (e.g., createIssue)
 */
const jira = new Version3Client({
  host: process.env.JIRA_HOST,
  authentication: {
    basic: {
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
    },
  },
});

/**
 * Direct Jira API fetch helper (GET requests)
 * Used for API endpoints that require the new Jira REST API v3 format
 * (e.g., /rest/api/3/search/jql which replaced the deprecated search endpoint)
 *
 * @param {string} path - API path (e.g., "/rest/api/3/search/jql?jql=...")
 * @returns {Promise<object>} - JSON response from Jira API
 */
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

/**
 * Direct Jira API POST helper
 * Used for API endpoints where jira.js library has issues
 *
 * @param {string} path - API path (e.g., "/rest/api/3/issue/TEST-1/comment")
 * @param {object} data - Request body
 * @returns {Promise<object>} - JSON response from Jira API
 */
const jiraPost = async (path, data) => {
  const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
  const response = await fetch(`${process.env.JIRA_HOST}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

// =============================================================================
// MCP SERVER SETUP
// =============================================================================

/**
 * Create the MCP server instance
 */
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

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

/**
 * Register available tools with the MCP server
 * This handler responds to ListTools requests from MCP clients
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // -----------------------------------------------------------------------
      // Tool: getIssuesByJQL
      // -----------------------------------------------------------------------
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
      // -----------------------------------------------------------------------
      // Tool: createIssue
      // -----------------------------------------------------------------------
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
      // -----------------------------------------------------------------------
      // Tool: addComment
      // -----------------------------------------------------------------------
      {
        name: 'addComment',
        description: 'Add a comment to an existing Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'Issue key (e.g., TEST-123)',
            },
            comment: {
              type: 'string',
              description: 'Comment text to add',
            },
          },
          required: ['issueKey', 'comment'],
        },
      },
      // -----------------------------------------------------------------------
      // Tool: updateIssue
      // -----------------------------------------------------------------------
      {
        name: 'updateIssue',
        description: 'Update fields of an existing Jira issue (summary, description, status)',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'Issue key (e.g., TEST-123)',
            },
            summary: {
              type: 'string',
              description: 'New issue title',
            },
            description: {
              type: 'string',
              description: 'New issue description',
            },
            status: {
              type: 'string',
              description: 'New status (e.g., "In Progress", "Done")',
            },
          },
          required: ['issueKey'],
        },
      },
      // -----------------------------------------------------------------------
      // Tool: getComments
      // -----------------------------------------------------------------------
      {
        name: 'getComments',
        description: 'Get all comments from a Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'Issue key (e.g., TEST-123)',
            },
          },
          required: ['issueKey'],
        },
      },
    ],
  };
});

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

/**
 * Handle tool execution requests from MCP clients
 * Routes to the appropriate tool implementation based on the tool name
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // -------------------------------------------------------------------------
    // Tool: getIssuesByJQL
    // Searches for Jira issues using JQL and returns full issue details
    // -------------------------------------------------------------------------
    case 'getIssuesByJQL': {
      const { jql, maxResults = 50 } = args;
      console.error(`Running JQL: ${jql}`);

      // Use the new /rest/api/3/search/jql endpoint (old endpoint deprecated)
      const encodedJql = encodeURIComponent(jql);
      const searchResult = await jiraFetch(
        `/rest/api/3/search/jql?jql=${encodedJql}&maxResults=${maxResults}`
      );

      // The new search endpoint only returns issue IDs, so we fetch full details
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

    // -------------------------------------------------------------------------
    // Tool: createIssue
    // Creates a new Jira issue with the specified fields
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // Tool: addComment
    // Adds a comment to an existing Jira issue
    // Note: Using direct API instead of jira.js due to library bug with body parameter
    // -------------------------------------------------------------------------
    case 'addComment': {
      const { issueKey, comment } = args;
      console.error(`Adding comment to ${issueKey}`);

      const result = await jiraPost(`/rest/api/3/issue/${issueKey}/comment`, {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment,
                },
              ],
            },
          ],
        },
      });

      console.error(`Comment added to ${issueKey}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    // -------------------------------------------------------------------------
    // Tool: updateIssue
    // Updates fields of an existing Jira issue
    // -------------------------------------------------------------------------
    case 'updateIssue': {
      const { issueKey, summary, description, status } = args;
      console.error(`Updating issue ${issueKey}`);

      // Build the fields object with only provided values
      const fields = {};
      if (summary) fields.summary = summary;
      if (description) fields.description = description;

      // Update fields if any were provided
      if (Object.keys(fields).length > 0) {
        await jira.issues.editIssue({
          issueIdOrKey: issueKey,
          fields,
        });
        console.error(`Updated fields for ${issueKey}`);
      }

      // Handle status transition separately (requires workflow transition)
      if (status) {
        // Get available transitions for this issue
        const transitions = await jira.issues.getTransitions({
          issueIdOrKey: issueKey,
        });

        // Find the transition that matches the desired status
        const transition = transitions.transitions.find(
          (t) => t.name.toLowerCase() === status.toLowerCase() ||
                 t.to.name.toLowerCase() === status.toLowerCase()
        );

        if (transition) {
          await jira.issues.doTransition({
            issueIdOrKey: issueKey,
            transition: { id: transition.id },
          });
          console.error(`Transitioned ${issueKey} to ${status}`);
        } else {
          const availableStatuses = transitions.transitions.map((t) => t.to.name).join(', ');
          throw new Error(`Status "${status}" not available. Available: ${availableStatuses}`);
        }
      }

      // Fetch and return the updated issue
      const updatedIssue = await jiraFetch(`/rest/api/3/issue/${issueKey}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(updatedIssue, null, 2) }],
      };
    }

    // -------------------------------------------------------------------------
    // Tool: getComments
    // Gets all comments from a Jira issue
    // -------------------------------------------------------------------------
    case 'getComments': {
      const { issueKey } = args;
      console.error(`Getting comments for ${issueKey}`);

      const comments = await jira.issueComments.getComments({
        issueIdOrKey: issueKey,
      });

      console.error(`Found ${comments.total} comments for ${issueKey}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(comments, null, 2) }],
      };
    }

    // -------------------------------------------------------------------------
    // Unknown tool
    // -------------------------------------------------------------------------
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

/**
 * Start the MCP server using stdio transport
 * The server communicates via stdin/stdout with the MCP client (e.g., Claude Desktop)
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jira MCP Server is running');
}

main().catch((err) => console.error('Error:', err));
