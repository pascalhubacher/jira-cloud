/**
 * Tool: createIssue
 * Create a new Jira issue
 */

export const definition = {
  name: 'createIssue',
  description: 'Create a new Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description: 'Project key (e.g., TEST). Defaults to the configured project if omitted.',
      },
      summary: {
        type: 'string',
        description: 'Issue title',
      },
      description: {
        type: 'string',
        description: 'Issue details',
      },
      issueType: {
        type: 'string',
        description: 'Type (Task, Bug, etc.)',
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of labels to apply (e.g., ["backend", "urgent"])',
      },
      storyPoints: {
        type: 'number',
        description: 'Story point estimate (maps to story_points field; some instances use customfield_10016)',
      },
    },
    required: ['summary'],
  },
};

export async function handler(jiraClient, args) {
  const { projectKey = jiraClient.project, summary, description, issueType = 'Task', labels, storyPoints } = args;

  if (projectKey.toUpperCase() !== jiraClient.project.toUpperCase()) {
    return {
      content: [{ type: 'text', text: `Project "${projectKey}" is not allowed. This server is scoped to project "${jiraClient.project}".` }],
      isError: true,
    };
  }

  console.error(`Creating issue in ${projectKey}`);

  const fields = {
    project: { key: projectKey },
    summary,
    description,
    issuetype: { name: issueType },
  };
  if (labels) fields.labels = labels;
  if (storyPoints != null) fields.story_points = storyPoints;

  const issue = await jiraClient.sdk.issues.createIssue({ fields });

  console.error(`Created issue: ${issue.key}`);
  return {
    content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
  };
}
