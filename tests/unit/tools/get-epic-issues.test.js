/**
 * Unit Tests: getEpicIssues
 */

import { describe, it, expect, vi } from 'vitest';
import { definition, handler } from '../../../src/tools/get-epic-issues.js';

const mockClient = (project = 'TEST') => ({
  project,
  jiraFetch: vi.fn().mockResolvedValue({ issues: [] }),
});

describe('getEpicIssues Schema', () => {
  it('should have the correct tool name', () => {
    expect(definition.name).toBe('getEpicIssues');
  });

  it('should have an epicKey property of type string', () => {
    expect(definition.inputSchema.properties.epicKey.type).toBe('string');
  });

  it('should have a maxResults property with default 50', () => {
    expect(definition.inputSchema.properties.maxResults.type).toBe('number');
    expect(definition.inputSchema.properties.maxResults.default).toBe(50);
  });

  it('should require epicKey', () => {
    expect(definition.inputSchema.required).toContain('epicKey');
    expect(definition.inputSchema.required).toHaveLength(1);
  });
});

describe('getEpicIssues Handler — Project Validation', () => {
  it('should return isError: true when epicKey does not belong to configured project', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { epicKey: 'OTHER-10' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('"OTHER-10" does not belong to project "TEST"');
    expect(client.jiraFetch).not.toHaveBeenCalled();
  });

  it('should be case-insensitive when validating the project prefix', async () => {
    const client = mockClient('TEST');
    const result = await handler(client, { epicKey: 'test-10' });
    expect(result.isError).toBeUndefined();
  });
});

describe('getEpicIssues Handler', () => {
  it('should use JQL with parent = epicKey', async () => {
    const client = mockClient('TEST');
    await handler(client, { epicKey: 'TEST-10' });

    const calledUrl = client.jiraFetch.mock.calls[0][0];
    const decodedJql = decodeURIComponent(calledUrl.split('jql=')[1].split('&')[0]);
    expect(decodedJql).toContain('parent = TEST-10');
  });

  it('should use default maxResults of 50', async () => {
    const client = mockClient('TEST');
    await handler(client, { epicKey: 'TEST-10' });

    const calledUrl = client.jiraFetch.mock.calls[0][0];
    expect(calledUrl).toContain('maxResults=50');
  });

  it('should respect a custom maxResults', async () => {
    const client = mockClient('TEST');
    await handler(client, { epicKey: 'TEST-10', maxResults: 20 });

    const calledUrl = client.jiraFetch.mock.calls[0][0];
    expect(calledUrl).toContain('maxResults=20');
  });

  it('should fetch full details for each child issue stub', async () => {
    const client = mockClient('TEST');
    client.jiraFetch
      .mockResolvedValueOnce({ issues: [{ id: '10001' }, { id: '10002' }] })
      .mockResolvedValueOnce({ id: '10001', key: 'TEST-11' })
      .mockResolvedValueOnce({ id: '10002', key: 'TEST-12' });

    const result = await handler(client, { epicKey: 'TEST-10' });
    const issues = JSON.parse(result.content[0].text);

    expect(issues).toHaveLength(2);
    expect(client.jiraFetch).toHaveBeenCalledTimes(3); // 1 search + 2 details
  });

  it('should return an empty array when epic has no child issues', async () => {
    const client = mockClient('TEST');
    client.jiraFetch.mockResolvedValueOnce({ issues: [] });

    const result = await handler(client, { epicKey: 'TEST-10' });
    const issues = JSON.parse(result.content[0].text);

    expect(issues).toHaveLength(0);
  });
});
