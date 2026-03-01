/**
 * Jira API Client (Infrastructure Layer)
 *
 * The only module that knows about jira.js, HTTP authentication, and
 * direct Jira REST API access. All other modules receive this client
 * as a dependency via function parameters.
 *
 * Returns an object with:
 *   - sdk:       jira.js Version3Client for operations supported by the library
 *   - jiraFetch: GET helper using the new REST API v3 endpoints
 *   - jiraPost:  POST helper for endpoints where jira.js has bugs/limitations
 */

import { Version3Client } from 'jira.js';

export function createJiraClient(config) {
  const { host, email, apiToken, project } = config.jira;
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

  const sdk = new Version3Client({
    host,
    authentication: {
      basic: { email, apiToken },
    },
  });

  const jiraFetch = async (path) => {
    const response = await fetch(`${host}${path}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });
    return response.json();
  };

  const jiraPost = async (path, data) => {
    const response = await fetch(`${host}${path}`, {
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

  return { sdk, jiraFetch, jiraPost, project };
}
