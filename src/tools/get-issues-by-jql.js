/**
 * Tool: getIssuesByJQL
 * Search for Jira issues using a JQL query
 */

export const definition = {
  name: 'getIssuesByJQL',
  description: 'Fetch Jira issues using a JQL query',
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: 'JQL string (e.g., project = TEST)',
      },
      maxResults: {
        type: 'number',
        description: 'Limit results',
        default: 50,
      },
    },
    required: ['jql'],
  },
};

export async function handler(jiraClient, args) {
  const { jql, maxResults = 50 } = args;

  // Automatically scope to the configured project if not already filtered by project
  const scopedJql = /\bproject\b/i.test(jql)
    ? jql
    : `project = ${jiraClient.project} AND ${jql}`;

  console.error(`Running JQL: ${scopedJql}`);

  // Use the new /rest/api/3/search/jql endpoint (old endpoint deprecated)
  const encodedJql = encodeURIComponent(scopedJql);
  const searchResult = await jiraClient.jiraFetch(
    `/rest/api/3/search/jql?jql=${encodedJql}&maxResults=${maxResults}`
  );

  // The new search endpoint only returns issue IDs, so we fetch full details
  const issues = await Promise.all(
    (searchResult.issues || []).map((issue) =>
      jiraClient.jiraFetch(`/rest/api/3/issue/${issue.id}`)
    )
  );

  console.error(`Found ${issues.length} issues`);
  return {
    content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }],
  };
}
