/**
 * Integration Tests: Epics
 *
 * Tests for getEpics, createEpic, updateEpic, getEpicIssues.
 * Runs against a real Jira Cloud instance — requires a valid .env file.
 *
 * Run with: npm run test:integration:epics
 *           npm run test:integration   (runs all integration tests)
 *           npm run test:all           (runs unit + all integration tests)
 *
 * WARNING: These tests create, modify, and delete real Jira epics and issues!
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import config, { validateConfig } from '../../src/config.js';
import { createJiraClient } from '../../src/infrastructure/jira-client.js';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const TEST_PROJECT_KEY = 'SCRUM';
const TEST_ISSUE_TYPE_ID = '10003'; // Story

let jiraClient;

beforeAll(() => {
  validateConfig();
  jiraClient = createJiraClient(config);
});

async function createTestEpic(summary, epicName) {
  return jiraClient.sdk.issues.createIssue({
    fields: {
      project: { key: TEST_PROJECT_KEY },
      summary,
      issuetype: { name: 'Epic' },
      customfield_10011: epicName ?? summary,
    },
  });
}

async function deleteTestIssue(issueKey) {
  try {
    const auth = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString('base64');
    await fetch(`${config.jira.host}/rest/api/3/issue/${issueKey}`, {
      method: 'DELETE',
      headers: { Authorization: `Basic ${auth}` },
    });
    console.log(`Cleaned up: ${issueKey}`);
  } catch (err) {
    console.error(`Failed to clean up: ${err.message}`);
  }
}

// =============================================================================
// getEpics TESTS
// =============================================================================

describe('getEpics', () => {
  it('should list epics in the project', async () => {
    const jql = `issuetype = Epic AND project = ${TEST_PROJECT_KEY} ORDER BY created DESC`;
    const searchResult = await jiraClient.jiraFetch(
      `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=10`
    );

    expect(searchResult.issues).toBeDefined();
    expect(Array.isArray(searchResult.issues)).toBe(true);
    console.log(`Found ${searchResult.issues.length} epic(s)`);
  });

  it('should respect maxResults parameter', async () => {
    const jql = `issuetype = Epic AND project = ${TEST_PROJECT_KEY} ORDER BY created DESC`;
    const result = await jiraClient.jiraFetch(
      `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=1`
    );
    expect(result.issues.length).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// createEpic TESTS
// =============================================================================

describe('createEpic', () => {
  let createdEpicKey;

  it('should create a new epic', async () => {
    const epic = await createTestEpic(
      `[TEST] Integration Test Epic - ${new Date().toISOString()}`,
      'Test Epic Label'
    );

    expect(epic.key).toBeDefined();
    expect(epic.key).toMatch(new RegExp(`^${TEST_PROJECT_KEY}-\\d+$`));
    createdEpicKey = epic.key;
    console.log(`Created epic: ${epic.key}`);
  });

  it('should fetch the created epic and verify its type', async () => {
    if (!createdEpicKey) return;
    const epic = await jiraClient.jiraFetch(`/rest/api/3/issue/${createdEpicKey}`);
    expect(epic.fields.issuetype.name).toBe('Epic');
    console.log(`Verified epic type for: ${createdEpicKey}`);
  });

  afterAll(async () => {
    if (createdEpicKey) await deleteTestIssue(createdEpicKey);
  });
});

// =============================================================================
// updateEpic TESTS
// =============================================================================

describe('updateEpic', () => {
  let testEpicKey;

  beforeAll(async () => {
    const epic = await createTestEpic(
      `[TEST] Update Epic Test - ${new Date().toISOString()}`,
      'Original Label'
    );
    testEpicKey = epic.key;
    console.log(`Created test epic for update tests: ${testEpicKey}`);
  });

  it('should update epic summary', async () => {
    const newSummary = `[TEST] Updated Epic Summary - ${new Date().toISOString()}`;
    await jiraClient.sdk.issues.editIssue({
      issueIdOrKey: testEpicKey,
      fields: { summary: newSummary },
    });

    const updated = await jiraClient.jiraFetch(`/rest/api/3/issue/${testEpicKey}`);
    expect(updated.fields.summary).toBe(newSummary);
    console.log(`Updated epic summary: ${newSummary}`);
  });

  it('should update epic name (customfield_10011)', async () => {
    await jiraClient.sdk.issues.editIssue({
      issueIdOrKey: testEpicKey,
      fields: { customfield_10011: 'Updated Label' },
    });

    const updated = await jiraClient.jiraFetch(`/rest/api/3/issue/${testEpicKey}`);
    expect(updated.fields.customfield_10011).toBe('Updated Label');
    console.log(`Updated epic name to: Updated Label`);
  });

  it('should get available transitions for an epic', async () => {
    const transitions = await jiraClient.sdk.issues.getTransitions({
      issueIdOrKey: testEpicKey,
    });

    expect(Array.isArray(transitions.transitions)).toBe(true);
    console.log('Available epic transitions:');
    transitions.transitions.forEach((t) => console.log(`  - ${t.name} -> ${t.to.name}`));
  });

  afterAll(async () => {
    if (testEpicKey) await deleteTestIssue(testEpicKey);
  });
});

// =============================================================================
// getEpicIssues TESTS
// =============================================================================

describe('getEpicIssues', () => {
  let testEpicKey;
  let testChildKey;

  beforeAll(async () => {
    const epic = await createTestEpic(
      `[TEST] Epic with Children - ${new Date().toISOString()}`,
      'Children Test Epic'
    );
    testEpicKey = epic.key;

    const child = await jiraClient.jiraPost('/rest/api/3/issue', {
      fields: {
        project: { key: TEST_PROJECT_KEY },
        summary: `[TEST] Child of ${testEpicKey} - ${new Date().toISOString()}`,
        issuetype: { id: TEST_ISSUE_TYPE_ID },
        parent: { key: testEpicKey },
      },
    });
    testChildKey = child.key;
    console.log(`Created epic ${testEpicKey} with child ${testChildKey}`);
  });

  it('should find child issues using parent = epicKey JQL', async () => {
    const jql = `parent = ${testEpicKey}`;
    const result = await jiraClient.jiraFetch(
      `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50`
    );

    expect(Array.isArray(result.issues)).toBe(true);
    const childKeys = result.issues.map((i) => i.key);
    expect(childKeys).toContain(testChildKey);
    console.log(`Found ${result.issues.length} child issue(s) for ${testEpicKey}`);
  });

  it('should return empty results for an epic with no children', async () => {
    const emptyEpic = await createTestEpic(
      `[TEST] Empty Epic - ${new Date().toISOString()}`,
      'Empty Epic'
    );

    const jql = `parent = ${emptyEpic.key}`;
    const result = await jiraClient.jiraFetch(
      `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50`
    );
    expect(result.issues).toHaveLength(0);

    await deleteTestIssue(emptyEpic.key);
  });

  afterAll(async () => {
    if (testChildKey) await deleteTestIssue(testChildKey);
    if (testEpicKey) await deleteTestIssue(testEpicKey);
  });
});
