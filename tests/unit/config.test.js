/**
 * Unit Tests: Config Validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateConfig } from '../../src/config.js';

describe('validateConfig', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = {
      JIRA_HOST: process.env.JIRA_HOST,
      JIRA_EMAIL: process.env.JIRA_EMAIL,
      JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
      JIRA_PROJECT: process.env.JIRA_PROJECT,
    };
    // Set all vars so individual tests can selectively clear one
    process.env.JIRA_HOST = 'https://test.atlassian.net';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'test-token';
    process.env.JIRA_PROJECT = 'TEST';
  });

  afterEach(() => {
    process.env.JIRA_HOST = originalEnv.JIRA_HOST;
    process.env.JIRA_EMAIL = originalEnv.JIRA_EMAIL;
    process.env.JIRA_API_TOKEN = originalEnv.JIRA_API_TOKEN;
    process.env.JIRA_PROJECT = originalEnv.JIRA_PROJECT;
  });

  it('should pass when all required env vars are set', () => {
    expect(() => validateConfig()).not.toThrow();
  });

  it('should throw when JIRA_HOST is missing', () => {
    process.env.JIRA_HOST = '';
    expect(() => validateConfig()).toThrow('Missing required environment variables');
  });

  it('should throw when JIRA_EMAIL is missing', () => {
    process.env.JIRA_EMAIL = '';
    expect(() => validateConfig()).toThrow('Missing required environment variables');
  });

  it('should throw when JIRA_API_TOKEN is missing', () => {
    process.env.JIRA_API_TOKEN = '';
    expect(() => validateConfig()).toThrow('Missing required environment variables');
  });

  it('should throw when JIRA_PROJECT is missing', () => {
    process.env.JIRA_PROJECT = '';
    expect(() => validateConfig()).toThrow('Missing required environment variables');
  });
});
