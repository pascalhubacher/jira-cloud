/**
 * Tool: addComment
 * Add a comment to an existing Jira issue
 *
 * Note: Uses direct API instead of jira.js due to library bug with body parameter
 */

export const definition = {
  name: 'addComment',
  description: 'Add a comment to an existing Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key (e.g., TEST-123)',
      },
      comment: {
        type: 'string',
        description: 'Comment text to add',
      },
    },
    required: ['issueKey', 'comment'],
  },
};

export async function handler(jiraClient, args) {
  const { issueKey, comment } = args;

  if (!issueKey.toUpperCase().startsWith(`${jiraClient.project.toUpperCase()}-`)) {
    return {
      content: [{ type: 'text', text: `Issue "${issueKey}" does not belong to project "${jiraClient.project}".` }],
      isError: true,
    };
  }

  console.error(`Adding comment to ${issueKey}`);

  const result = await jiraClient.jiraPost(`/rest/api/3/issue/${issueKey}/comment`, {
    body: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: comment }],
        },
      ],
    },
  });

  console.error(`Comment added to ${issueKey}`);
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
