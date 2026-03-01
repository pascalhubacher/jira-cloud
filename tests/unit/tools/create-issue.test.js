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

  it('should have a labels property of type array', () => {
    expect(definition.inputSchema.properties.labels.type).toBe('array');
    expect(definition.inputSchema.properties.labels.items.type).toBe('string');
  });

  it('should have a storyPoints property of type number', () => {
    expect(definition.inputSchema.properties.storyPoints.type).toBe('number');
  });

  it('should have a parentKey property of type string', () => {
    expect(definition.inputSchema.properties.parentKey.type).toBe('string');
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

  it('should include labels when provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'Test issue', labels: ['backend', 'urgent'] });

    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ labels: ['backend', 'urgent'] }),
      })
    );
  });

  it('should not include labels field when omitted', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'Test issue' });

    const callArgs = client.sdk.issues.createIssue.mock.calls[0][0];
    expect(callArgs.fields).not.toHaveProperty('labels');
  });

  it('should include story_points when storyPoints is provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'Test issue', storyPoints: 5 });

    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ story_points: 5 }),
      })
    );
  });

  it('should include story_points: 0 when storyPoints is 0', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'Test issue', storyPoints: 0 });

    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ story_points: 0 }),
      })
    );
  });

  it('should not include story_points when storyPoints is omitted', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'Test issue' });

    const callArgs = client.sdk.issues.createIssue.mock.calls[0][0];
    expect(callArgs.fields).not.toHaveProperty('story_points');
  });

  it('should create a subtask with parent field and default issueType Subtask', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'My Subtask', parentKey: 'TEST-10' });

    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({
          parent: { key: 'TEST-10' },
          issuetype: { name: 'Subtask' },
        }),
      })
    );
  });

  it('should respect explicit issueType even when parentKey is set', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'My Subtask', parentKey: 'TEST-10', issueType: 'Bug' });

    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ issuetype: { name: 'Bug' } }),
      })
    );
  });

  it('should default issueType to Task when parentKey is omitted', async () => {
    const client = mockClient('TEST');
    await handler(client, { summary: 'Regular issue' });

    expect(client.sdk.issues.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ issuetype: { name: 'Task' } }),
      })
    );
  });

  it('should return isError: true when parentKey does not belong to configured project', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { summary: 'My Subtask', parentKey: 'OTHER-10' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('"OTHER-10" does not belong to project "TEST"');
    expect(client.sdk.issues.createIssue).not.toHaveBeenCalled();
  });
});
