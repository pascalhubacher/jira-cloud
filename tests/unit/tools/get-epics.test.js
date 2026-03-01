/**
 * Unit Tests: getEpics
 */

import { describe, it, expect, vi } from 'vitest';
import { definition, handler } from '../../../src/tools/get-epics.js';

const mockClient = (project = 'TEST') => ({
  project,
  jiraFetch: vi.fn().mockResolvedValue({ issues: [] }),
});

describe('getEpics Schema', () => {
  it('should have the correct tool name', () => {
    expect(definition.name).toBe('getEpics');
  });

  it('should have a maxResults property with default 50', () => {
    expect(definition.inputSchema.properties.maxResults.type).toBe('number');
    expect(definition.inputSchema.properties.maxResults.default).toBe(50);
  });

  it('should have no required parameters', () => {
    expect(definition.inputSchema.required).toHaveLength(0);
  });
});

describe('getEpics Handler', () => {
  it('should search for epics using issuetype = Epic JQL', async () => {
    const client = mockClient('SCRUM');
    await handler(client, {});

    const calledUrl = client.jiraFetch.mock.calls[0][0];
    const decodedJql = decodeURIComponent(calledUrl.split('jql=')[1].split('&')[0]);
    expect(decodedJql).toContain('issuetype = Epic');
    expect(decodedJql).toContain('project = SCRUM');
  });

  it('should use default maxResults of 50', async () => {
    const client = mockClient('TEST');
    await handler(client, {});

    const calledUrl = client.jiraFetch.mock.calls[0][0];
    expect(calledUrl).toContain('maxResults=50');
  });

  it('should respect a custom maxResults', async () => {
    const client = mockClient('TEST');
    await handler(client, { maxResults: 10 });

    const calledUrl = client.jiraFetch.mock.calls[0][0];
    expect(calledUrl).toContain('maxResults=10');
  });

  it('should fetch full details for each epic stub', async () => {
    const client = mockClient('TEST');
    client.jiraFetch
      .mockResolvedValueOnce({ issues: [{ id: '10001' }, { id: '10002' }] })
      .mockResolvedValueOnce({ id: '10001', key: 'TEST-1' })
      .mockResolvedValueOnce({ id: '10002', key: 'TEST-2' });

    const result = await handler(client, {});
    const epics = JSON.parse(result.content[0].text);

    expect(epics).toHaveLength(2);
    expect(client.jiraFetch).toHaveBeenCalledTimes(3); // 1 search + 2 details
  });

  it('should return an empty array when no epics are found', async () => {
    const client = mockClient('TEST');
    client.jiraFetch.mockResolvedValueOnce({ issues: [] });

    const result = await handler(client, {});
    const epics = JSON.parse(result.content[0].text);

    expect(epics).toHaveLength(0);
  });
});
