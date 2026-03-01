/**
 * Unit Tests: createIssue
 */

import { describe, it, expect, vi } from 'vitest';
import { definition, handler } from '../../../src/tools/create-issue.js';

const mockClient = (project = 'TEST') => ({
  project,
  sdk: {
    issues: {
      createIssue: vi.fn().mockResolvedValue({ key: `${project}-1`, id: '10000' }),
    },
  },
});

describe('createIssue Schema', () => {
  it('should have the correct tool name', () => {
    expect(definition.name).toBe('createIssue');
  });

  it('should have a projectKey property of type string', () => {
    expect(definition.inputSchema.properties.projectKey.type).toBe('string');
  });

  it('should have a summary property of type string', () => {
    expect(definition.inputSchema.properties.summary.type).toBe('string');
  });

  it('should have a description property of type string', () => {
    expect(definition.inputSchema.properties.description.type).toBe('string');
  });

  it('should have an issueType property of type string', () => {
    expect(definition.inputSchema.properties.issueType.type).toBe('string');
  });

  it('should only require summary (projectKey defaults to configured project)', () => {
    expect(definition.inputSchema.required).toContain('summary');
    expect(definition.inputSchema.required).not.toContain('projectKey');
    expect(definition.inputSchema.required).toHaveLength(1);
  });
});

describe('createIssue Handler', () => {
  it('should default projectKey to configured project when omitted', async () => {
    const client = mockClient('MYPROJECT');
    await handler(client, { summary: 'Test issue' });
    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ fields: expect.objectContaining({ project: { key: 'MYPROJECT' } }) })
    );
  });

  it('should accept projectKey when it matches the configured project', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { projectKey: 'TEST', summary: 'Test issue' });
    expect(result.isError).toBeUndefined();
    expect(client.sdk.issues.createIssue).toHaveBeenCalled();
  });

  it('should return isError: true when projectKey does not match configured project', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { projectKey: 'OTHER', summary: 'Test issue' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('"OTHER" is not allowed');
    expect(client.sdk.issues.createIssue).not.toHaveBeenCalled();
  });

  it('should be case-insensitive when comparing project keys', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { projectKey: 'test', summary: 'Test issue' });
    expect(result.isError).toBeUndefined();
  });
});
