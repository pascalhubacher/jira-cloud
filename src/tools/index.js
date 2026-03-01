/**
 * Tool Registry
 *
 * Aggregates all tool definitions and handlers.
 * To add a new tool: create a new file in src/tools/ and add it to the list below.
 */

import * as getIssuesByJQL from './get-issues-by-jql.js';
import * as createIssue from './create-issue.js';
import * as addComment from './add-comment.js';
import * as updateIssue from './update-issue.js';
import * as getComments from './get-comments.js';

const tools = [getIssuesByJQL, createIssue, addComment, updateIssue, getComments];

export function getToolDefinitions() {
  return tools.map((t) => t.definition);
}

export function getToolHandler(name) {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.handler;
}
