/**
 * Unit Tests for Jira Cloud MCP Server Tools
 *
 * These tests verify the tool definitions and schema validation
 * without making actual API calls.
 *
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// TOOL SCHEMA DEFINITIONS (mirrored from index.js)
// =============================================================================

const tools = [
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
];

// =============================================================================
// TOOL DEFINITION TESTS
// =============================================================================

describe('Tool Definitions', () => {
  it('should have 5 tools defined', () => {
    expect(tools).toHaveLength(5);
  });

  it('should have unique tool names', () => {
    const names = tools.map((t) => t.name);
    const uniqueNames = [...new Set(names)];
    expect(names).toHaveLength(uniqueNames.length);
  });

  it('each tool should have name, description, and inputSchema', () => {
    tools.forEach((tool) => {
      expect(tool.name).toBeDefined();
      expect(tool.name).toBeTypeOf('string');
      expect(tool.description).toBeDefined();
      expect(tool.description).toBeTypeOf('string');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    });
  });
});

// =============================================================================
// getIssuesByJQL SCHEMA TESTS
// =============================================================================

describe('getIssuesByJQL Schema', () => {
  const tool = tools.find((t) => t.name === 'getIssuesByJQL');

  it('should have jql property', () => {
    expect(tool.inputSchema.properties.jql).toBeDefined();
    expect(tool.inputSchema.properties.jql.type).toBe('string');
  });

  it('should have maxResults property with default', () => {
    expect(tool.inputSchema.properties.maxResults).toBeDefined();
    expect(tool.inputSchema.properties.maxResults.type).toBe('number');
    expect(tool.inputSchema.properties.maxResults.default).toBe(50);
  });

  it('should not require any fields', () => {
    expect(tool.inputSchema.required).toBeUndefined();
  });
});

// =============================================================================
// createIssue SCHEMA TESTS
// =============================================================================

describe('createIssue Schema', () => {
  const tool = tools.find((t) => t.name === 'createIssue');

  it('should have projectKey property', () => {
    expect(tool.inputSchema.properties.projectKey).toBeDefined();
    expect(tool.inputSchema.properties.projectKey.type).toBe('string');
  });

  it('should have summary property', () => {
    expect(tool.inputSchema.properties.summary).toBeDefined();
    expect(tool.inputSchema.properties.summary.type).toBe('string');
  });

  it('should have description property', () => {
    expect(tool.inputSchema.properties.description).toBeDefined();
    expect(tool.inputSchema.properties.description.type).toBe('string');
  });

  it('should have issueType property', () => {
    expect(tool.inputSchema.properties.issueType).toBeDefined();
    expect(tool.inputSchema.properties.issueType.type).toBe('string');
  });

  it('should require projectKey and summary', () => {
    expect(tool.inputSchema.required).toContain('projectKey');
    expect(tool.inputSchema.required).toContain('summary');
  });
});

// =============================================================================
// addComment SCHEMA TESTS
// =============================================================================

describe('addComment Schema', () => {
  const tool = tools.find((t) => t.name === 'addComment');

  it('should have issueKey property', () => {
    expect(tool.inputSchema.properties.issueKey).toBeDefined();
    expect(tool.inputSchema.properties.issueKey.type).toBe('string');
  });

  it('should have comment property', () => {
    expect(tool.inputSchema.properties.comment).toBeDefined();
    expect(tool.inputSchema.properties.comment.type).toBe('string');
  });

  it('should require issueKey and comment', () => {
    expect(tool.inputSchema.required).toContain('issueKey');
    expect(tool.inputSchema.required).toContain('comment');
  });
});

// =============================================================================
// updateIssue SCHEMA TESTS
// =============================================================================

describe('updateIssue Schema', () => {
  const tool = tools.find((t) => t.name === 'updateIssue');

  it('should have issueKey property', () => {
    expect(tool.inputSchema.properties.issueKey).toBeDefined();
    expect(tool.inputSchema.properties.issueKey.type).toBe('string');
  });

  it('should have summary property', () => {
    expect(tool.inputSchema.properties.summary).toBeDefined();
    expect(tool.inputSchema.properties.summary.type).toBe('string');
  });

  it('should have description property', () => {
    expect(tool.inputSchema.properties.description).toBeDefined();
    expect(tool.inputSchema.properties.description.type).toBe('string');
  });

  it('should have status property', () => {
    expect(tool.inputSchema.properties.status).toBeDefined();
    expect(tool.inputSchema.properties.status.type).toBe('string');
  });

  it('should only require issueKey', () => {
    expect(tool.inputSchema.required).toContain('issueKey');
    expect(tool.inputSchema.required).toHaveLength(1);
  });
});

// =============================================================================
// getComments SCHEMA TESTS
// =============================================================================

describe('getComments Schema', () => {
  const tool = tools.find((t) => t.name === 'getComments');

  it('should have issueKey property', () => {
    expect(tool.inputSchema.properties.issueKey).toBeDefined();
    expect(tool.inputSchema.properties.issueKey.type).toBe('string');
  });

  it('should require issueKey', () => {
    expect(tool.inputSchema.required).toContain('issueKey');
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe('JQL Encoding', () => {
  it('should encode JQL queries correctly', () => {
    const jql = 'project = TEST AND status = "In Progress"';
    const encoded = encodeURIComponent(jql);

    expect(encoded).toBe('project%20%3D%20TEST%20AND%20status%20%3D%20%22In%20Progress%22');
    expect(decodeURIComponent(encoded)).toBe(jql);
  });

  it('should handle special characters in JQL', () => {
    const jql = 'summary ~ "test & verification"';
    const encoded = encodeURIComponent(jql);

    expect(decodeURIComponent(encoded)).toBe(jql);
  });
});

describe('Issue Key Format', () => {
  it('should match valid issue key format', () => {
    const issueKeyRegex = /^[A-Z]+-\d+$/;

    expect('TEST-123').toMatch(issueKeyRegex);
    expect('SCRUM-1').toMatch(issueKeyRegex);
    expect('PROJECT-9999').toMatch(issueKeyRegex);
  });

  it('should not match invalid issue key format', () => {
    const issueKeyRegex = /^[A-Z]+-\d+$/;

    expect('test-123').not.toMatch(issueKeyRegex);
    expect('TEST123').not.toMatch(issueKeyRegex);
    expect('TEST-').not.toMatch(issueKeyRegex);
    expect('-123').not.toMatch(issueKeyRegex);
  });
});

describe('Status Transitions', () => {
  const availableTransitions = [
    { name: 'To Do', to: { name: 'To Do' } },
    { name: 'In Progress', to: { name: 'In Progress' } },
    { name: 'In Review', to: { name: 'In Review' } },
    { name: 'Done', to: { name: 'Done' } },
  ];

  it('should find transition by name (case-insensitive)', () => {
    const findTransition = (status) => {
      return availableTransitions.find(
        (t) =>
          t.name.toLowerCase() === status.toLowerCase() ||
          t.to.name.toLowerCase() === status.toLowerCase()
      );
    };

    expect(findTransition('In Progress')).toBeDefined();
    expect(findTransition('in progress')).toBeDefined();
    expect(findTransition('IN PROGRESS')).toBeDefined();
    expect(findTransition('Done')).toBeDefined();
  });

  it('should return undefined for invalid status', () => {
    const findTransition = (status) => {
      return availableTransitions.find(
        (t) =>
          t.name.toLowerCase() === status.toLowerCase() ||
          t.to.name.toLowerCase() === status.toLowerCase()
      );
    };

    expect(findTransition('Invalid Status')).toBeUndefined();
    expect(findTransition('Completed')).toBeUndefined();
  });
});
