/**
 * Tool: createEpic
 * Create a new Epic in the configured Jira project
 *
 * Note: Epics require an Epic Name field (customfield_10011) in addition to summary.
 */

export const definition = {
  name: 'createEpic',
  description: 'Create a new Epic in the configured Jira project',
  inputSchema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'Epic title',
      },
      epicName: {
        type: 'string',
        description: 'Short Epic name label (defaults to summary if omitted)',
      },
      description: {
        type: 'string',
        description: 'Epic details',
      },
    },
    required: ['summary'],
  },
};

export async function handler(jiraClient, args) {
  const { summary, epicName = summary, description } = args;

  console.error(`Creating epic in ${jiraClient.project}: ${summary}`);

  const fields = {
    project: { key: jiraClient.project },
    summary,
    issuetype: { name: 'Epic' },
    customfield_10011: epicName,
  };

  if (description) {
    fields.description = description;
  }

  const epic = await jiraClient.sdk.issues.createIssue({ fields });

  console.error(`Created epic: ${epic.key}`);
  return {
    content: [{ type: 'text', text: JSON.stringify(epic, null, 2) }],
  };
}
