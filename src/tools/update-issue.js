/**
 * Tool: updateIssue
 * Update fields and/or status of an existing Jira issue
 */

export const definition = {
  name: 'updateIssue',
  description: 'Update fields of an existing Jira issue (summary, description, status)',
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
    },
    required: ['issueKey'],
  },
};

export async function handler(jiraClient, args) {
  const { issueKey, summary, description, status } = args;
  console.error(`Updating issue ${issueKey}`);

  // Update fields if any were provided
  const fields = {};
  if (summary) fields.summary = summary;
  if (description) fields.description = description;

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
