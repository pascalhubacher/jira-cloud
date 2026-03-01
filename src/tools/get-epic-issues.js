/**
 * Tool: getEpicIssues
 * Retrieve all child issues (Stories, Tasks, Bugs, etc.) belonging to an Epic
 */

export const definition = {
  name: 'getEpicIssues',
  description: 'Get all child issues (Stories, Tasks, Bugs, etc.) belonging to an Epic',
  inputSchema: {
    type: 'object',
    properties: {
      epicKey: {
        type: 'string',
        description: 'Epic key (e.g., TEST-42)',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of issues to return',
        default: 50,
      },
    },
    required: ['epicKey'],
  },
};

export async function handler(jiraClient, args) {
  const { epicKey, maxResults = 50 } = args;

  if (!epicKey.toUpperCase().startsWith(`${jiraClient.project.toUpperCase()}-`)) {
    return {
      content: [{ type: 'text', text: `Epic "${epicKey}" does not belong to project "${jiraClient.project}".` }],
      isError: true,
    };
  }

  const jql = `parent = ${epicKey} ORDER BY created ASC`;
  console.error(`Fetching issues for epic ${epicKey}`);

  const encodedJql = encodeURIComponent(jql);
  const searchResult = await jiraClient.jiraFetch(
    `/rest/api/3/search/jql?jql=${encodedJql}&maxResults=${maxResults}`
  );

  const issues = await Promise.all(
    (searchResult.issues || []).map((issue) =>
      jiraClient.jiraFetch(`/rest/api/3/issue/${issue.id}`)
    )
  );

  console.error(`Found ${issues.length} issues for epic ${epicKey}`);
  return {
    content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }],
  };
}
