/**
 * Unit Tests: getComments
 */

import { describe, it, expect, vi } from 'vitest';
import { definition, handler } from '../../../src/tools/get-comments.js';

describe('getComments Schema', () => {
  it('should have the correct tool name', () => {
    expect(definition.name).toBe('getComments');
  });

  it('should have an issueKey property of type string', () => {
    expect(definition.inputSchema.properties.issueKey.type).toBe('string');
  });

  it('should require issueKey', () => {
    expect(definition.inputSchema.required).toContain('issueKey');
    expect(definition.inputSchema.required).toHaveLength(1);
  });
});

describe('getComments Handler', () => {
  it('should call getComments with the correct issue key', async () => {
    const mockGetComments = vi.fn().mockResolvedValue({ total: 2, comments: [] });
    const mockClient = {
      sdk: { issueComments: { getComments: mockGetComments } },
    };

    await handler(mockClient, { issueKey: 'TEST-1' });

    expect(mockGetComments).toHaveBeenCalledWith({ issueIdOrKey: 'TEST-1' });
  });

  it('should return comments as JSON content', async () => {
    const mockResult = { total: 1, comments: [{ id: '1', body: 'Hello' }] };
    const mockClient = {
      sdk: { issueComments: { getComments: vi.fn().mockResolvedValue(mockResult) } },
    };

    const response = await handler(mockClient, { issueKey: 'TEST-1' });

    expect(response.content[0].type).toBe('text');
    expect(JSON.parse(response.content[0].text)).toEqual(mockResult);
  });
});
