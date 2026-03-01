/**
 * Unit Tests: getComments
 */

import { describe, it, expect, vi } from 'vitest';
import { definition, handler } from '../../../src/tools/get-comments.js';

const mockClient = (project = 'TEST') => ({
  project,
  sdk: {
    issueComments: {
      getComments: vi.fn().mockResolvedValue({ total: 2, comments: [] }),
    },
  },
});

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
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-1' });
    expect(client.sdk.issueComments.getComments).toHaveBeenCalledWith({ issueIdOrKey: 'TEST-1' });
  });

  it('should return comments as JSON content', async () => {
    const mockResult = { total: 1, comments: [{ id: '1', body: 'Hello' }] };
    const client = {
      project: 'TEST',
      sdk: { issueComments: { getComments: vi.fn().mockResolvedValue(mockResult) } },
    };

    const response = await handler(client, { issueKey: 'TEST-1' });

    expect(response.content[0].type).toBe('text');
    expect(JSON.parse(response.content[0].text)).toEqual(mockResult);
  });

  it('should return isError: true when issue does not belong to configured project', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { issueKey: 'OTHER-1' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('"OTHER-1" does not belong to project "TEST"');
    expect(client.sdk.issueComments.getComments).not.toHaveBeenCalled();
  });

  it('should be case-insensitive when validating the project prefix', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { issueKey: 'test-1' });
    expect(result.isError).toBeUndefined();
  });
});
