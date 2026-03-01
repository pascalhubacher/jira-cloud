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
    };
  });

  afterEach(() => {
    process.env.JIRA_HOST = originalEnv.JIRA_HOST;
    process.env.JIRA_EMAIL = originalEnv.JIRA_EMAIL;
    process.env.JIRA_API_TOKEN = originalEnv.JIRA_API_TOKEN;
  });

  it('should pass when all required env vars are set', () => {
    process.env.JIRA_HOST = 'https://test.atlassian.net';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'test-token';

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
});
