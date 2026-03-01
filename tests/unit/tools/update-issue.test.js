/**
 * Unit Tests: updateIssue
 */

import { describe, it, expect, vi } from 'vitest';
import { definition, handler } from '../../../src/tools/update-issue.js';

const availableTransitions = [
  { id: '1', name: 'To Do', to: { name: 'To Do' } },
  { id: '2', name: 'In Progress', to: { name: 'In Progress' } },
  { id: '3', name: 'In Review', to: { name: 'In Review' } },
  { id: '4', name: 'Done', to: { name: 'Done' } },
];

const mockClient = (project = 'TEST') => ({
  project,
  sdk: {
    issues: {
      editIssue: vi.fn().mockResolvedValue({}),
      getTransitions: vi.fn().mockResolvedValue({ transitions: availableTransitions }),
      doTransition: vi.fn().mockResolvedValue({}),
    },
  },
  jiraFetch: vi.fn().mockResolvedValue({ key: `${project}-1` }),
});

describe('updateIssue Schema', () => {
  it('should have the correct tool name', () => {
    expect(definition.name).toBe('updateIssue');
  });

  it('should have an issueKey property of type string', () => {
    expect(definition.inputSchema.properties.issueKey.type).toBe('string');
  });

  it('should have optional summary, description, status, assigneeAccountId, labels, and storyPoints properties', () => {
    expect(definition.inputSchema.properties.summary.type).toBe('string');
    expect(definition.inputSchema.properties.description.type).toBe('string');
    expect(definition.inputSchema.properties.status.type).toBe('string');
    expect(definition.inputSchema.properties.assigneeAccountId.type).toBe('string');
    expect(definition.inputSchema.properties.labels.type).toBe('array');
    expect(definition.inputSchema.properties.labels.items.type).toBe('string');
    expect(definition.inputSchema.properties.storyPoints.type).toBe('number');
  });

  it('should only require issueKey', () => {
    expect(definition.inputSchema.required).toContain('issueKey');
    expect(definition.inputSchema.required).toHaveLength(1);
  });
});

describe('updateIssue Status Transitions', () => {
  it('should find transition by name (case-insensitive)', () => {
    const find = (status) =>
      availableTransitions.find(
        (t) =>
          t.name.toLowerCase() === status.toLowerCase() ||
          t.to.name.toLowerCase() === status.toLowerCase()
      );

    expect(find('In Progress')).toBeDefined();
    expect(find('in progress')).toBeDefined();
    expect(find('IN PROGRESS')).toBeDefined();
    expect(find('Done')).toBeDefined();
  });

  it('should return undefined for an invalid status', () => {
    const find = (status) =>
      availableTransitions.find(
        (t) =>
          t.name.toLowerCase() === status.toLowerCase() ||
          t.to.name.toLowerCase() === status.toLowerCase()
      );

    expect(find('Invalid Status')).toBeUndefined();
  });
});

describe('updateIssue Handler', () => {
  it('should call editIssue when summary is provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-1', summary: 'New Summary' });

    expect(client.sdk.issues.editIssue).toHaveBeenCalledWith({
      issueIdOrKey: 'TEST-1',
      fields: { summary: 'New Summary' },
    });
  });

  it('should call editIssue with assignee when assigneeAccountId is provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-1', assigneeAccountId: 'abc123' });

    expect(client.sdk.issues.editIssue).toHaveBeenCalledWith({
      issueIdOrKey: 'TEST-1',
      fields: { assignee: { accountId: 'abc123' } },
    });
  });

  it('should call editIssue with labels when provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-1', labels: ['backend', 'urgent'] });

    expect(client.sdk.issues.editIssue).toHaveBeenCalledWith({
      issueIdOrKey: 'TEST-1',
      fields: { labels: ['backend', 'urgent'] },
    });
  });

  it('should call editIssue with story_points when storyPoints is provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-1', storyPoints: 8 });

    expect(client.sdk.issues.editIssue).toHaveBeenCalledWith({
      issueIdOrKey: 'TEST-1',
      fields: { story_points: 8 },
    });
  });

  it('should set story_points to 0 when storyPoints is 0', async () => {
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-1', storyPoints: 0 });

    expect(client.sdk.issues.editIssue).toHaveBeenCalledWith({
      issueIdOrKey: 'TEST-1',
      fields: { story_points: 0 },
    });
  });

  it('should not call editIssue when no fields are provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-1', status: 'Done' });
    expect(client.sdk.issues.editIssue).not.toHaveBeenCalled();
  });

  it('should return isError: true when status is not available', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { issueKey: 'TEST-1', status: 'Nonexistent Status' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('"Nonexistent Status" not available');
  });

  it('should return isError: true when issue does not belong to configured project', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { issueKey: 'OTHER-1', summary: 'Updated' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('"OTHER-1" does not belong to project "TEST"');
    expect(client.sdk.issues.editIssue).not.toHaveBeenCalled();
  });

  it('should be case-insensitive when validating the project prefix', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { issueKey: 'test-1', summary: 'Updated' });
    expect(result.isError).toBeUndefined();
  });
});
