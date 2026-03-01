/**
 * Unit Tests: updateEpic
 */

import { describe, it, expect, vi } from 'vitest';
import { definition, handler } from '../../../src/tools/update-epic.js';

const availableTransitions = [
  { id: '1', name: 'To Do', to: { name: 'To Do' } },
  { id: '2', name: 'In Progress', to: { name: 'In Progress' } },
  { id: '3', name: 'Done', to: { name: 'Done' } },
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
  jiraFetch: vi.fn().mockResolvedValue({ key: `${project}-10` }),
});

describe('updateEpic Schema', () => {
  it('should have the correct tool name', () => {
    expect(definition.name).toBe('updateEpic');
  });

  it('should have an issueKey property of type string', () => {
    expect(definition.inputSchema.properties.issueKey.type).toBe('string');
  });

  it('should have optional summary, epicName, description, and status properties', () => {
    expect(definition.inputSchema.properties.summary.type).toBe('string');
    expect(definition.inputSchema.properties.epicName.type).toBe('string');
    expect(definition.inputSchema.properties.description.type).toBe('string');
    expect(definition.inputSchema.properties.status.type).toBe('string');
  });

  it('should only require issueKey', () => {
    expect(definition.inputSchema.required).toContain('issueKey');
    expect(definition.inputSchema.required).toHaveLength(1);
  });
});

describe('updateEpic Handler — Project Validation', () => {
  it('should return isError: true when issueKey does not belong to configured project', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { issueKey: 'OTHER-10' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('"OTHER-10" does not belong to project "TEST"');
    expect(client.sdk.issues.editIssue).not.toHaveBeenCalled();
  });

  it('should be case-insensitive when validating the project prefix', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { issueKey: 'test-10', summary: 'Updated' });
    expect(result.isError).toBeUndefined();
  });
});

describe('updateEpic Handler — Field Updates', () => {
  it('should call editIssue with summary when provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-10', summary: 'New Title' });

    expect(client.sdk.issues.editIssue).toHaveBeenCalledWith({
      issueIdOrKey: 'TEST-10',
      fields: { summary: 'New Title' },
    });
  });

  it('should call editIssue with customfield_10011 when epicName is provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-10', epicName: 'New Label' });

    expect(client.sdk.issues.editIssue).toHaveBeenCalledWith({
      issueIdOrKey: 'TEST-10',
      fields: { customfield_10011: 'New Label' },
    });
  });

  it('should not call editIssue when no fields are provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-10', status: 'Done' });
    expect(client.sdk.issues.editIssue).not.toHaveBeenCalled();
  });
});

describe('updateEpic Handler — Status Transitions', () => {
  it('should transition status when provided', async () => {
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-10', status: 'Done' });

    expect(client.sdk.issues.doTransition).toHaveBeenCalledWith({
      issueIdOrKey: 'TEST-10',
      transition: { id: '3' },
    });
  });

  it('should match status case-insensitively', async () => {
    const client = mockClient('TEST');
    await handler(client, { issueKey: 'TEST-10', status: 'in progress' });

    expect(client.sdk.issues.doTransition).toHaveBeenCalledWith(
      expect.objectContaining({ transition: { id: '2' } })
    );
  });

  it('should return isError: true when status is not available', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { issueKey: 'TEST-10', status: 'Nonexistent' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('"Nonexistent" not available');
  });

  it('should return the updated epic after changes', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { issueKey: 'TEST-10', summary: 'Updated' });

    expect(client.jiraFetch).toHaveBeenCalledWith('/rest/api/3/issue/TEST-10');
    expect(result.content[0].type).toBe('text');
  });
});
