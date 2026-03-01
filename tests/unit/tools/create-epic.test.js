/**
 * Unit Tests: createEpic
 */

import { describe, it, expect, vi } from 'vitest';
import { definition, handler } from '../../../src/tools/create-epic.js';

const mockClient = (project = 'TEST') => ({
  project,
  sdk: {
    issues: {
      createIssue: vi.fn().mockResolvedValue({ key: `${project}-10`, id: '10010' }),
    },
  },
});

describe('createEpic Schema', () => {
  it('should have the correct tool name', () => {
    expect(definition.name).toBe('createEpic');
  });

  it('should have a summary property of type string', () => {
    expect(definition.inputSchema.properties.summary.type).toBe('string');
  });

  it('should have an epicName property of type string', () => {
    expect(definition.inputSchema.properties.epicName.type).toBe('string');
  });

  it('should have a description property of type string', () => {
    expect(definition.inputSchema.properties.description.type).toBe('string');
  });

  it('should only require summary', () => {
    expect(definition.inputSchema.required).toContain('summary');
    expect(definition.inputSchema.required).toHaveLength(1);
  });
});

describe('createEpic Handler', () => {
  it('should create an issue with issuetype Epic', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'My Epic' });

    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ issuetype: { name: 'Epic' } }),
      })
    );
  });

  it('should set the configured project key', async () => {
    const client = mockClient('SCRUM');
    await handler(client, { summary: 'My Epic' });

    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ project: { key: 'SCRUM' } }),
      })
    );
  });

  it('should default epicName (customfield_10011) to summary when omitted', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'My Epic' });

    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ customfield_10011: 'My Epic' }),
      })
    );
  });

  it('should use the provided epicName when given', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'Long Epic Title', epicName: 'Short Label' });

    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ customfield_10011: 'Short Label' }),
      })
    );
  });

  it('should include description when provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'My Epic', description: 'Details here' });

    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ description: 'Details here' }),
      })
    );
  });

  it('should not include description field when omitted', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'My Epic' });

    const callArgs = client.sdk.issues.createIssue.mock.calls[0][0];
    expect(callArgs.fields).not.toHaveProperty('description');
  });

  it('should return the created epic as JSON content', async () => {
    const mockResult = { key: 'TEST-10', id: '10010', self: 'https://...' };
    const client = {
      project: 'TEST',
      sdk: { issues: { createIssue: vi.fn().mockResolvedValue(mockResult) } },
    };

    const result = await handler(client, { summary: 'My Epic' });

    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
  });
});
