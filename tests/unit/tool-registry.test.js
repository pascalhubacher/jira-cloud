/**
 * Unit Tests: Tool Registry
 *
 * Imports schemas directly from the tool modules — no duplication.
 */

import { describe, it, expect } from 'vitest';
import { getToolDefinitions, getToolHandler } from '../../src/tools/index.js';

const tools = getToolDefinitions();

describe('Tool Registry', () => {
  it('should have 5 tools defined', () => {
    expect(tools).toHaveLength(5);
  });

  it('should have unique tool names', () => {
    const names = tools.map((t) => t.name);
    expect(names).toHaveLength(new Set(names).size);
  });

  it('each tool should have name, description, and inputSchema', () => {
    tools.forEach((tool) => {
      expect(tool.name).toBeTypeOf('string');
      expect(tool.description).toBeTypeOf('string');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    });
  });

  it('should return a handler for each registered tool', () => {
    tools.forEach((tool) => {
      const handler = getToolHandler(tool.name);
      expect(handler).toBeTypeOf('function');
    });
  });

  it('should throw for an unknown tool name', () => {
    expect(() => getToolHandler('nonExistentTool')).toThrow('Unknown tool: nonExistentTool');
  });
});
