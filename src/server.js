/**
 * MCP Server (Application Layer / Composition Root)
 *
 * Wires together config, infrastructure, and tools into a running MCP server.
 * This is the only module that knows about all three layers.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import config, { validateConfig } from './config.js';
import { createJiraClient } from './infrastructure/jira-client.js';
import { getToolDefinitions, getToolHandler } from './tools/index.js';

export async function startServer() {
  validateConfig();

  const jiraClient = createJiraClient(config);

  const server = new Server(
    { name: config.server.name, version: config.server.version },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: getToolDefinitions() };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = getToolHandler(name);
    try {
      return await handler(jiraClient, args);
    } catch (err) {
      return {
        content: [{ type: 'text', text: err.message }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jira MCP Server is running');
}
