/**
 * Integration Tests for Jira Cloud MCP Server
 *
 * These tests run against a real Jira Cloud instance.
 * Make sure your .env file is configured correctly before running.
 *
 * Run with: npm run test:integration
 *
 * WARNING: These tests will create, modify, and read real Jira issues!
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Version3Client } from 'jira.js';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const TEST_PROJECT_KEY = 'SCRUM';
const TEST_ISSUE_TYPE_ID = '10003'; // Story

// Jira client setup (same as in index.js)
let jira;
let jiraFetch;
let jiraPost;

beforeAll(() => {
  // Verify environment variables are set
  if (!process.env.JIRA_HOST || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
    throw new Error('Missing required environment variables. Please configure .env file.');
  }

  jira = new Version3Client({
    host: process.env.JIRA_HOST,
    authentication: {
      basic: {
        email: process.env.JIRA_EMAIL,
        apiToken: process.env.JIRA_API_TOKEN,
      },
    },
  });

  const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

  jiraFetch = async (path) => {
    const response = await fetch(`${process.env.JIRA_HOST}${path}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });
    return response.json();
  };

  jiraPost = async (path, data) => {
    const response = await fetch(`${process.env.JIRA_HOST}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  };
});

// Helper to create a test issue
async function createTestIssue(summary) {
  const result = await jiraPost('/rest/api/3/issue', {
    fields: {
      project: { key: TEST_PROJECT_KEY },
      summary: summary,
      issuetype: { id: TEST_ISSUE_TYPE_ID },
    },
  });
  return result;
}

// Helper to delete a test issue
async function deleteTestIssue(issueKey) {
  try {
    await fetch(`${process.env.JIRA_HOST}/rest/api/3/issue/${issueKey}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
      },
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
    const myself = await jira.myself.getCurrentUser();

    expect(myself).toBeDefined();
    expect(myself.emailAddress).toBe(process.env.JIRA_EMAIL);
    console.log(`Connected as: ${myself.displayName}`);
  });
});

// =============================================================================
// getIssuesByJQL TESTS
// =============================================================================

describe('getIssuesByJQL', () => {
  it('should search for issues using JQL', async () => {
    const jql = `project = ${TEST_PROJECT_KEY} ORDER BY created DESC`;
    const encodedJql = encodeURIComponent(jql);
    const searchResult = await jiraFetch(
      `/rest/api/3/search/jql?jql=${encodedJql}&maxResults=10`
    );

    expect(searchResult).toBeDefined();
    expect(searchResult.issues).toBeDefined();
    expect(Array.isArray(searchResult.issues)).toBe(true);
    console.log(`Found ${searchResult.issues.length} issues`);
  });

  it('should fetch full issue details', async () => {
    const jql = `project = ${TEST_PROJECT_KEY} ORDER BY created DESC`;
    const encodedJql = encodeURIComponent(jql);
    const searchResult = await jiraFetch(
      `/rest/api/3/search/jql?jql=${encodedJql}&maxResults=1`
    );

    if (searchResult.issues && searchResult.issues.length > 0) {
      const issueId = searchResult.issues[0].id;
      const issue = await jiraFetch(`/rest/api/3/issue/${issueId}`);

      expect(issue).toBeDefined();
      expect(issue.key).toBeDefined();
      expect(issue.fields).toBeDefined();
      expect(issue.fields.summary).toBeDefined();
      console.log(`Fetched issue: ${issue.key} - ${issue.fields.summary}`);
    }
  });

  it('should handle empty search results', async () => {
    const jql = `project = NONEXISTENT_PROJECT_12345`;
    const encodedJql = encodeURIComponent(jql);
    const searchResult = await jiraFetch(
      `/rest/api/3/search/jql?jql=${encodedJql}&maxResults=10`
    );

    // Should return error or empty results
    expect(searchResult).toBeDefined();
  });

  it('should respect maxResults parameter', async () => {
    const jql = `project = ${TEST_PROJECT_KEY}`;
    const encodedJql = encodeURIComponent(jql);
    const searchResult = await jiraFetch(
      `/rest/api/3/search/jql?jql=${encodedJql}&maxResults=2`
    );

    expect(searchResult.issues.length).toBeLessThanOrEqual(2);
  });
});

// =============================================================================
// createIssue TESTS
// =============================================================================

describe('createIssue', () => {
  let createdIssueKey;

  it('should create a new issue', async () => {
    const issue = await createTestIssue(`[TEST] Integration Test Issue - ${new Date().toISOString()}`);

    expect(issue).toBeDefined();
    expect(issue.key).toBeDefined();
    expect(issue.key).toMatch(new RegExp(`^${TEST_PROJECT_KEY}-\\d+$`));

    createdIssueKey = issue.key;
    console.log(`Created issue: ${issue.key}`);
  });

  it('should fail when required fields are missing', async () => {
    const result = await jiraPost('/rest/api/3/issue', {
      fields: {
        project: { key: TEST_PROJECT_KEY },
        // Missing summary
        issuetype: { id: TEST_ISSUE_TYPE_ID },
      },
    });

    expect(result.errors || result.errorMessages).toBeDefined();
  });

  afterAll(async () => {
    if (createdIssueKey) {
      await deleteTestIssue(createdIssueKey);
    }
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
    const commentText = `Test comment added at ${new Date().toISOString()}`;

    const result = await jiraPost(`/rest/api/3/issue/${testIssueKey}/comment`, {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: commentText,
              },
            ],
          },
        ],
      },
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    console.log(`Added comment with ID: ${result.id}`);
  });

  it('should fail when adding comment to non-existent issue', async () => {
    const result = await jiraPost('/rest/api/3/issue/NONEXISTENT-99999/comment', {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test' }],
          },
        ],
      },
    });

    expect(result.errorMessages || result.errors).toBeDefined();
  });

  afterAll(async () => {
    if (testIssueKey) {
      await deleteTestIssue(testIssueKey);
    }
  });
});

// =============================================================================
// getComments TESTS
// =============================================================================

describe('getComments', () => {
  let testIssueKey;

  beforeAll(async () => {
    // Create a test issue with a comment
    const issue = await createTestIssue(`[TEST] Get Comments Test - ${new Date().toISOString()}`);
    testIssueKey = issue.key;

    // Add a comment using direct API
    await jiraPost(`/rest/api/3/issue/${testIssueKey}/comment`, {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test comment for getComments test' }],
          },
        ],
      },
    });
  });

  it('should get comments from an issue', async () => {
    const comments = await jiraFetch(`/rest/api/3/issue/${testIssueKey}/comment`);

    expect(comments).toBeDefined();
    expect(comments.comments).toBeDefined();
    expect(Array.isArray(comments.comments)).toBe(true);
    expect(comments.total).toBeGreaterThanOrEqual(1);
    console.log(`Found ${comments.total} comment(s)`);
  });

  it('should return empty comments for issue without comments', async () => {
    // Create a fresh issue without comments
    const issue = await createTestIssue(`[TEST] No Comments Test - ${new Date().toISOString()}`);

    const comments = await jiraFetch(`/rest/api/3/issue/${issue.key}/comment`);

    expect(comments.total).toBe(0);
    expect(comments.comments).toHaveLength(0);

    // Cleanup
    await deleteTestIssue(issue.key);
  });

  afterAll(async () => {
    if (testIssueKey) {
      await deleteTestIssue(testIssueKey);
    }
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

    await jira.issues.editIssue({
      issueIdOrKey: testIssueKey,
      fields: {
        summary: newSummary,
      },
    });

    // Verify the update
    const updatedIssue = await jiraFetch(`/rest/api/3/issue/${testIssueKey}`);
    expect(updatedIssue.fields.summary).toBe(newSummary);
    console.log(`Updated summary to: ${newSummary}`);
  });

  it('should get available transitions', async () => {
    const transitions = await jira.issues.getTransitions({
      issueIdOrKey: testIssueKey,
    });

    expect(transitions).toBeDefined();
    expect(transitions.transitions).toBeDefined();
    expect(Array.isArray(transitions.transitions)).toBe(true);

    console.log('Available transitions:');
    transitions.transitions.forEach((t) => {
      console.log(`  - ${t.name} -> ${t.to.name}`);
    });
  });

  it('should transition issue to a new status', async () => {
    // Get available transitions
    const transitions = await jira.issues.getTransitions({
      issueIdOrKey: testIssueKey,
    });

    // Find a transition (e.g., "In Progress")
    const targetTransition = transitions.transitions.find(
      (t) => t.to.name === 'In Progress'
    );

    if (targetTransition) {
      await jira.issues.doTransition({
        issueIdOrKey: testIssueKey,
        transition: { id: targetTransition.id },
      });

      // Verify the transition
      const updatedIssue = await jiraFetch(`/rest/api/3/issue/${testIssueKey}`);
      expect(updatedIssue.fields.status.name).toBe('In Progress');
      console.log(`Transitioned to: In Progress`);
    } else {
      console.log('Skipping transition test - "In Progress" not available');
    }
  });

  afterAll(async () => {
    if (testIssueKey) {
      await deleteTestIssue(testIssueKey);
    }
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('Error Handling', () => {
  it('should handle invalid issue key gracefully', async () => {
    const result = await jiraFetch('/rest/api/3/issue/INVALID-99999');
    expect(result).toBeDefined();
  });

  it('should handle invalid JQL gracefully', async () => {
    const result = await jiraFetch(
      '/rest/api/3/search/jql?jql=invalid_syntax_here!!!'
    );
    expect(result.errorMessages || result.errors).toBeDefined();
  });
});
