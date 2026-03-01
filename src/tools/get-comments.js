/**
 * Tool: getComments
 * Get all comments from a Jira issue
 */

export const definition = {
  name: 'getComments',
  description: 'Get all comments from a Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key (e.g., TEST-123)',
      },
    },
    required: ['issueKey'],
  },
};

export async function handler(jiraClient, args) {
  const { issueKey } = args;

  if (!issueKey.toUpperCase().startsWith(`${jiraClient.project.toUpperCase()}-`)) {
    return {
      content: [{ type: 'text', text: `Issue "${issueKey}" does not belong to project "${jiraClient.project}".` }],
      isError: true,
    };
  }

  console.error(`Getting comments for ${issueKey}`);

  const comments = await jiraClient.sdk.issueComments.getComments({
    issueIdOrKey: issueKey,
  });

  console.error(`Found ${comments.total} comments for ${issueKey}`);
  return {
    content: [{ type: 'text', text: JSON.stringify(comments, null, 2) }],
  };
}
