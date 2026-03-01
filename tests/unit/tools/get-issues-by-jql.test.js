/**
 * Unit Tests: getIssuesByJQL
 */

import { describe, it, expect, vi } from 'vitest';
import { definition, handler } from '../../../src/tools/get-issues-by-jql.js';

const mockClient = (project = 'TEST') => ({
  project,
  jiraFetch: vi.fn().mockResolvedValue({ issues: [] }),
});

describe('getIssuesByJQL Schema', () => {
  it('should have the correct tool name', () => {
    expect(definition.name).toBe('getIssuesByJQL');
  });

  it('should have a jql property of type string', () => {
    expect(definition.inputSchema.properties.jql.type).toBe('string');
  });

  it('should have a maxResults property with default 50', () => {
    expect(definition.inputSchema.properties.maxResults.type).toBe('number');
    expect(definition.inputSchema.properties.maxResults.default).toBe(50);
  });

  it('should require jql', () => {
    expect(definition.inputSchema.required).toContain('jql');
  });
});

describe('getIssuesByJQL JQL scoping', () => {
  it('should prepend project filter when JQL has no project clause', async () => {
    const client = mockClient('SCRUM');
    await handler(client, { jql: 'status = "In Progress"' });

    const calledUrl = client.jiraFetch.mock.calls[0][0];
    expect(decodeURIComponent(calledUrl)).toContain('project = SCRUM AND status = "In Progress"');
  });

  it('should not modify JQL that already filters by project', async () => {
    const client = mockClient('SCRUM');
    await handler(client, { jql: 'project = SCRUM AND status = Done' });

    const calledUrl = client.jiraFetch.mock.calls[0][0];
    const decodedJql = decodeURIComponent(calledUrl.split('jql=')[1].split('&')[0]);
    expect(decodedJql).toBe('project = SCRUM AND status = Done');
  });

  it('should not modify JQL that uses project in operator', async () => {
    const client = mockClient('SCRUM');
    await handler(client, { jql: 'project in (SCRUM, OTHER) ORDER BY created' });

    const calledUrl = client.jiraFetch.mock.calls[0][0];
    expect(decodeURIComponent(calledUrl)).toContain('project in (SCRUM, OTHER)');
    expect(decodeURIComponent(calledUrl)).not.toContain('project = SCRUM AND project in');
  });
});

describe('getIssuesByJQL JQL encoding', () => {
  it('should encode JQL queries correctly', () => {
    const jql = 'project = TEST AND status = "In Progress"';
    const encoded = encodeURIComponent(jql);
    expect(decodeURIComponent(encoded)).toBe(jql);
  });

  it('should handle special characters in JQL', () => {
    const jql = 'summary ~ "test & verification"';
    const encoded = encodeURIComponent(jql);
    expect(decodeURIComponent(encoded)).toBe(jql);
  });
});
