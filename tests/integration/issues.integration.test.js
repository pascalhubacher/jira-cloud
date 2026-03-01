/**
 * Integration Tests: Issues
 *
 * Tests for getIssuesByJQL, createIssue, addComment, getComments, updateIssue.
 * Runs against a real Jira Cloud instance — requires a valid .env file.
 *
 * Run with: npm run test:integration:issues
 *           npm run test:integration   (runs all integration tests)
 *           npm run test:all           (runs unit + all integration tests)
 *
 * WARNING: These tests create, modify, and delete real Jira issues!
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

async function createTestIssue(summary) {
  return jiraClient.jiraPost('/rest/api/3/issue', {
    fields: {
      project: { key: TEST_PROJECT_KEY },
      summary,
      issuetype: { id: TEST_ISSUE_TYPE_ID },
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
    console.log(`Cleaned up test issue: ${issueKey}`);
  } catch (err) {
    console.error(`Failed to clean up: ${err.message}`);
  }
}

// =============================================================================
// CONNECTION TEST
// =============================================================================

describe('Jira Connection', () => {
  it('should connect to Jira Cloud successfully', async () => {
    const myself = await jiraClient.sdk.myself.getCurrentUser();

    expect(myself).toBeDefined();
    expect(myself.emailAddress).toBe(config.jira.email);
    console.log(`Connected as: ${myself.displayName}`);
  });
});

// =============================================================================
// getIssuesByJQL TESTS
// =============================================================================

describe('getIssuesByJQL', () => {
  it('should search for issues using JQL', async () => {
    const jql = `project = ${TEST_PROJECT_KEY} ORDER BY created DESC`;
    const searchResult = await jiraClient.jiraFetch(
      `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=10`
    );

    expect(searchResult.issues).toBeDefined();
    expect(Array.isArray(searchResult.issues)).toBe(true);
    console.log(`Found ${searchResult.issues.length} issues`);
  });

  it('should fetch full issue details', async () => {
    const jql = `project = ${TEST_PROJECT_KEY} ORDER BY created DESC`;
    const searchResult = await jiraClient.jiraFetch(
      `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=1`
    );

    if (searchResult.issues?.length > 0) {
      const issue = await jiraClient.jiraFetch(`/rest/api/3/issue/${searchResult.issues[0].id}`);
      expect(issue.key).toBeDefined();
      expect(issue.fields.summary).toBeDefined();
      console.log(`Fetched issue: ${issue.key} - ${issue.fields.summary}`);
    }
  });

  it('should handle empty search results', async () => {
    const result = await jiraClient.jiraFetch(
      `/rest/api/3/search/jql?jql=${encodeURIComponent('project = NONEXISTENT_PROJECT_12345')}&maxResults=10`
    );
    expect(result).toBeDefined();
  });

  it('should respect maxResults parameter', async () => {
    const result = await jiraClient.jiraFetch(
      `/rest/api/3/search/jql?jql=${encodeURIComponent(`project = ${TEST_PROJECT_KEY}`)}&maxResults=2`
    );
    expect(result.issues.length).toBeLessThanOrEqual(2);
  });
});

// =============================================================================
// createIssue TESTS
// =============================================================================

describe('createIssue', () => {
  let createdIssueKey;

  it('should create a new issue', async () => {
    const issue = await createTestIssue(`[TEST] Integration Test Issue - ${new Date().toISOString()}`);

    expect(issue.key).toBeDefined();
    expect(issue.key).toMatch(new RegExp(`^${TEST_PROJECT_KEY}-\\d+$`));
    createdIssueKey = issue.key;
    console.log(`Created issue: ${issue.key}`);
  });

  it('should fail when required fields are missing', async () => {
    const result = await jiraClient.jiraPost('/rest/api/3/issue', {
      fields: {
        project: { key: TEST_PROJECT_KEY },
        issuetype: { id: TEST_ISSUE_TYPE_ID },
        // Missing summary
      },
    });
    expect(result.errors || result.errorMessages).toBeDefined();
  });

  afterAll(async () => {
    if (createdIssueKey) await deleteTestIssue(createdIssueKey);
  });
});

// =============================================================================
// addComment TESTS
// =============================================================================

describe('addComment', () => {
  let testIssueKey;

  beforeAll(async () => {
    const issue = await createTestIssue(`[TEST] Comment Test Issue - ${new Date().toISOString()}`);
    testIssueKey = issue.key;
    console.log(`Created test issue for comments: ${testIssueKey}`);
  });

  it('should add a comment to an issue', async () => {
    const result = await jiraClient.jiraPost(`/rest/api/3/issue/${testIssueKey}/comment`, {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: `Test comment - ${new Date().toISOString()}` }],
          },
        ],
      },
    });

    expect(result.id).toBeDefined();
    console.log(`Added comment with ID: ${result.id}`);
  });

  it('should fail when adding comment to non-existent issue', async () => {
    const result = await jiraClient.jiraPost('/rest/api/3/issue/NONEXISTENT-99999/comment', {
      body: {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test' }] }],
      },
    });
    expect(result.errorMessages || result.errors).toBeDefined();
  });

  afterAll(async () => {
    if (testIssueKey) await deleteTestIssue(testIssueKey);
  });
});

// =============================================================================
// getComments TESTS
// =============================================================================

describe('getComments', () => {
  let testIssueKey;

  beforeAll(async () => {
    const issue = await createTestIssue(`[TEST] Get Comments Test - ${new Date().toISOString()}`);
    testIssueKey = issue.key;

    await jiraClient.jiraPost(`/rest/api/3/issue/${testIssueKey}/comment`, {
      body: {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test comment' }] }],
      },
    });
  });

  it('should get comments from an issue', async () => {
    const comments = await jiraClient.jiraFetch(`/rest/api/3/issue/${testIssueKey}/comment`);

    expect(Array.isArray(comments.comments)).toBe(true);
    expect(comments.total).toBeGreaterThanOrEqual(1);
    console.log(`Found ${comments.total} comment(s)`);
  });

  it('should return empty comments for issue without comments', async () => {
    const issue = await createTestIssue(`[TEST] No Comments Test - ${new Date().toISOString()}`);
    const comments = await jiraClient.jiraFetch(`/rest/api/3/issue/${issue.key}/comment`);

    expect(comments.total).toBe(0);
    expect(comments.comments).toHaveLength(0);

    await deleteTestIssue(issue.key);
  });

  afterAll(async () => {
    if (testIssueKey) await deleteTestIssue(testIssueKey);
  });
});

// =============================================================================
// updateIssue TESTS
// =============================================================================

describe('updateIssue', () => {
  let testIssueKey;

  beforeAll(async () => {
    const issue = await createTestIssue(`[TEST] Update Test Issue - ${new Date().toISOString()}`);
    testIssueKey = issue.key;
    console.log(`Created test issue for update tests: ${testIssueKey}`);
  });

  it('should update issue summary', async () => {
    const newSummary = `[TEST] Updated Summary - ${new Date().toISOString()}`;

    await jiraClient.sdk.issues.editIssue({
      issueIdOrKey: testIssueKey,
      fields: { summary: newSummary },
    });

    const updatedIssue = await jiraClient.jiraFetch(`/rest/api/3/issue/${testIssueKey}`);
    expect(updatedIssue.fields.summary).toBe(newSummary);
    console.log(`Updated summary to: ${newSummary}`);
  });

  it('should assign issue to the current user', async () => {
    const myself = await jiraClient.sdk.myself.getCurrentUser();

    await jiraClient.sdk.issues.editIssue({
      issueIdOrKey: testIssueKey,
      fields: { assignee: { accountId: myself.accountId } },
    });

    const updatedIssue = await jiraClient.jiraFetch(`/rest/api/3/issue/${testIssueKey}`);
    expect(updatedIssue.fields.assignee).not.toBeNull();
    expect(updatedIssue.fields.assignee.accountId).toBe(myself.accountId);
    console.log(`Assigned ${testIssueKey} to: ${myself.displayName}`);
  });

  it('should set labels on an issue', async () => {
    await jiraClient.sdk.issues.editIssue({
      issueIdOrKey: testIssueKey,
      fields: { labels: ['integration-test', 'automated'] },
    });

    const updatedIssue = await jiraClient.jiraFetch(`/rest/api/3/issue/${testIssueKey}`);
    expect(Array.isArray(updatedIssue.fields.labels)).toBe(true);
    expect(updatedIssue.fields.labels).toContain('integration-test');
    expect(updatedIssue.fields.labels).toContain('automated');
    console.log(`Set labels on ${testIssueKey}: ${updatedIssue.fields.labels.join(', ')}`);
  });

  it('should get available transitions', async () => {
    const transitions = await jiraClient.sdk.issues.getTransitions({
      issueIdOrKey: testIssueKey,
    });

    expect(Array.isArray(transitions.transitions)).toBe(true);
    console.log('Available transitions:');
    transitions.transitions.forEach((t) => console.log(`  - ${t.name} -> ${t.to.name}`));
  });

  it('should transition issue to a new status', async () => {
    const transitions = await jiraClient.sdk.issues.getTransitions({
      issueIdOrKey: testIssueKey,
    });

    const targetTransition = transitions.transitions.find((t) => t.to.name === 'In Progress');

    if (targetTransition) {
      await jiraClient.sdk.issues.doTransition({
        issueIdOrKey: testIssueKey,
        transition: { id: targetTransition.id },
      });

      const updatedIssue = await jiraClient.jiraFetch(`/rest/api/3/issue/${testIssueKey}`);
      expect(updatedIssue.fields.status.name).toBe('In Progress');
      console.log('Transitioned to: In Progress');
    } else {
      console.log('Skipping - "In Progress" not available');
    }
  });

  afterAll(async () => {
    if (testIssueKey) await deleteTestIssue(testIssueKey);
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('Error Handling', () => {
  it('should handle invalid issue key gracefully', async () => {
    const result = await jiraClient.jiraFetch('/rest/api/3/issue/INVALID-99999');
    expect(result).toBeDefined();
  });

  it('should handle invalid JQL gracefully', async () => {
    const result = await jiraClient.jiraFetch(
      '/rest/api/3/search/jql?jql=invalid_syntax_here!!!'
    );
    expect(result.errorMessages || result.errors).toBeDefined();
  });
});
