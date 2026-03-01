/**
 * Tool: getEpics
 * List all epics in the configured Jira project
 */

export const definition = {
  name: 'getEpics',
  description: 'List all epics in the configured Jira project',
  inputSchema: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'number',
        description: 'Maximum number of epics to return',
        default: 50,
      },
    },
    required: [],
  },
};

export async function handler(jiraClient, args) {
  const { maxResults = 50 } = args;

  const jql = `issuetype = Epic AND project = ${jiraClient.project} ORDER BY created DESC`;
  console.error(`Fetching epics with JQL: ${jql}`);

  const encodedJql = encodeURIComponent(jql);
  const searchResult = await jiraClient.jiraFetch(
    `/rest/api/3/search/jql?jql=${encodedJql}&maxResults=${maxResults}`
  );

  const epics = await Promise.all(
    (searchResult.issues || []).map((issue) =>
      jiraClient.jiraFetch(`/rest/api/3/issue/${issue.id}`)
    )
  );

  console.error(`Found ${epics.length} epics`);
  return {
    content: [{ type: 'text', text: JSON.stringify(epics, null, 2) }],
  };
}
