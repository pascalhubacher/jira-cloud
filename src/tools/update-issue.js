/**
 * Tool: updateIssue
 * Update fields and/or status of an existing Jira issue
 */

export const definition = {
  name: 'updateIssue',
  description: 'Update fields of an existing Jira issue (summary, description, status, assignee)',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key (e.g., TEST-123)',
      },
      summary: {
        type: 'string',
        description: 'New issue title',
      },
      description: {
        type: 'string',
        description: 'New issue description',
      },
      status: {
        type: 'string',
        description: 'New status (e.g., "In Progress", "Done")',
      },
      assigneeAccountId: {
        type: 'string',
        description: 'Atlassian account ID of the assignee (e.g., "5b10ac8d82e05b22cc7d4ef5")',
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of labels to apply, replaces existing labels (e.g., ["backend", "urgent"])',
      },
      storyPoints: {
        type: 'number',
        description: 'Story point estimate (maps to story_points field; some instances use customfield_10016)',
      },
      parentKey: {
        type: 'string',
        description: 'New parent issue key to re-parent a subtask (e.g., TEST-10)',
      },
    },
    required: ['issueKey'],
  },
};

export async function handler(jiraClient, args) {
  const { issueKey, summary, description, status, assigneeAccountId, labels, storyPoints, parentKey } = args;

  if (!issueKey.toUpperCase().startsWith(`${jiraClient.project.toUpperCase()}-`)) {
    return {
      content: [{ type: 'text', text: `Issue "${issueKey}" does not belong to project "${jiraClient.project}".` }],
      isError: true,
    };
  }

  if (parentKey && !parentKey.toUpperCase().startsWith(`${jiraClient.project.toUpperCase()}-`)) {
    return {
      content: [{ type: 'text', text: `Parent issue "${parentKey}" does not belong to project "${jiraClient.project}".` }],
      isError: true,
    };
  }

  console.error(`Updating issue ${issueKey}`);

  // Update fields if any were provided
  const fields = {};
  if (summary) fields.summary = summary;
  if (description) fields.description = description;
  if (assigneeAccountId) fields.assignee = { accountId: assigneeAccountId };
  if (labels) fields.labels = labels;
  if (storyPoints != null) fields.story_points = storyPoints;
  if (parentKey) fields.parent = { key: parentKey };

  if (Object.keys(fields).length > 0) {
    await jiraClient.sdk.issues.editIssue({ issueIdOrKey: issueKey, fields });
    console.error(`Updated fields for ${issueKey}`);
  }

  // Handle status transition separately (requires workflow transition)
  if (status) {
    const transitions = await jiraClient.sdk.issues.getTransitions({
      issueIdOrKey: issueKey,
    });

    const transition = transitions.transitions.find(
      (t) =>
        t.name.toLowerCase() === status.toLowerCase() ||
        t.to.name.toLowerCase() === status.toLowerCase()
    );

    if (transition) {
      await jiraClient.sdk.issues.doTransition({
        issueIdOrKey: issueKey,
        transition: { id: transition.id },
      });
      console.error(`Transitioned ${issueKey} to ${status}`);
    } else {
      const available = transitions.transitions.map((t) => t.to.name).join(', ');
      return {
        content: [{ type: 'text', text: `Status "${status}" not available. Available: ${available}` }],
        isError: true,
      };
    }
  }

  const updatedIssue = await jiraClient.jiraFetch(`/rest/api/3/issue/${issueKey}`);
  return {
    content: [{ type: 'text', text: JSON.stringify(updatedIssue, null, 2) }],
  };
}
