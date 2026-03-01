/**
 * Unit Tests: addComment
 */

import { describe, it, expect, vi } from 'vitest';
import { definition, handler } from '../../../src/tools/add-comment.js';

describe('addComment Schema', () => {
  it('should have the correct tool name', () => {
    expect(definition.name).toBe('addComment');
  });

  it('should have an issueKey property of type string', () => {
    expect(definition.inputSchema.properties.issueKey.type).toBe('string');
  });

  it('should have a comment property of type string', () => {
    expect(definition.inputSchema.properties.comment.type).toBe('string');
  });

  it('should require issueKey and comment', () => {
    expect(definition.inputSchema.required).toContain('issueKey');
    expect(definition.inputSchema.required).toContain('comment');
    expect(definition.inputSchema.required).toHaveLength(2);
  });
});

describe('addComment Handler', () => {
  it('should call jiraPost with correct ADF body format', async () => {
    const mockJiraPost = vi.fn().mockResolvedValue({ id: '123' });
    const mockClient = { jiraPost: mockJiraPost };

    await handler(mockClient, { issueKey: 'TEST-1', comment: 'Hello' });

    expect(mockJiraPost).toHaveBeenCalledWith('/rest/api/3/issue/TEST-1/comment', {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello' }],
          },
        ],
      },
    });
  });

  it('should return the comment result as JSON content', async () => {
    const mockResult = { id: '456', body: 'Hello' };
    const mockClient = { jiraPost: vi.fn().mockResolvedValue(mockResult) };

    const response = await handler(mockClient, { issueKey: 'TEST-1', comment: 'Hello' });

    expect(response.content[0].type).toBe('text');
    expect(JSON.parse(response.content[0].text)).toEqual(mockResult);
  });
});
