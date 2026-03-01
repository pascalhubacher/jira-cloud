/**
 * Tool: updateEpic
 * Update fields and/or status of an existing Epic
 */

export const definition = {
  name: 'updateEpic',
  description: 'Update fields of an existing Epic (summary, epicName, description, status)',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Epic key (e.g., TEST-42)',
      },
      summary: {
        type: 'string',
        description: 'New epic title',
      },
      epicName: {
        type: 'string',
        description: 'New short Epic name label (customfield_10011)',
      },
      description: {
        type: 'string',
        description: 'New epic description',
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
  const { issueKey, summary, epicName, description, status } = args;

  if (!issueKey.toUpperCase().startsWith(`${jiraClient.project.toUpperCase()}-`)) {
    return {
      content: [{ type: 'text', text: `Issue "${issueKey}" does not belong to project "${jiraClient.project}".` }],
      isError: true,
    };
  }

  console.error(`Updating epic ${issueKey}`);

  const fields = {};
  if (summary) fields.summary = summary;
  if (description) fields.description = description;
  if (epicName) fields.customfield_10011 = epicName;

  if (Object.keys(fields).length > 0) {
    await jiraClient.sdk.issues.editIssue({ issueIdOrKey: issueKey, fields });
    console.error(`Updated fields for ${issueKey}`);
  }

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

  const updatedEpic = await jiraClient.jiraFetch(`/rest/api/3/issue/${issueKey}`);
  return {
    content: [{ type: 'text', text: JSON.stringify(updatedEpic, null, 2) }],
  };
}
