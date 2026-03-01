/**
 * Configuration module
 *
 * Single source of truth for all environment variables.
 * The only module that reads from process.env.
 */

export function validateConfig() {
  const host = process.env.JIRA_HOST;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const project = process.env.JIRA_PROJECT;
  if (!host || !email || !apiToken || !project) {
    throw new Error(
      'Missing required environment variables: JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT'
    );
  }
}

const config = {
  get jira() {
    return {
      host: process.env.JIRA_HOST,
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
      project: process.env.JIRA_PROJECT,
    };
  },
  server: {
    name: 'jira-cloud',
    version: '1.0.0',
  },
};

export default config;
