/**
 * Unit Tests: createIssue
 */

import { describe, it, expect } from 'vitest';
import { definition } from '../../../src/tools/create-issue.js';

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

  it('should require projectKey and summary', () => {
    expect(definition.inputSchema.required).toContain('projectKey');
    expect(definition.inputSchema.required).toContain('summary');
    expect(definition.inputSchema.required).toHaveLength(2);
  });
});
