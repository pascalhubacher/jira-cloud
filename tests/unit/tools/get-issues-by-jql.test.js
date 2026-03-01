/**
 * Unit Tests: getIssuesByJQL
 */

import { describe, it, expect } from 'vitest';
import { definition } from '../../../src/tools/get-issues-by-jql.js';

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
