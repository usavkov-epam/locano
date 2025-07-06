import * as fs from 'fs/promises';

import { GitHubConfig, LocaleFile } from '../types';

const { createAppAuth } = require('@octokit/auth-app');
const octokitRest = require('@octokit/rest');

const LOCALES_FILE_PATH = process.env.LOCALES_FILE_PATH!;
const LOCALE_FILE_EXTENSION = process.env.LOCALE_FILE_EXTENSION!;

type Octokit = typeof octokitRest.Octokit;

export async function initializeOctokit(config: GitHubConfig): Promise<Octokit> {
  const { appId, clientId, clientSecret, privateKeyPath, installationId } = config;

  if (!appId || !clientId || !clientSecret || !privateKeyPath) {
    throw new Error('Missing required GitHub configuration parameters');
  }

  const privateKey = await fs.readFile(privateKeyPath, 'utf8').catch((err) => {
    console.error('Failed to read GitHub private key:', err);
    throw err;
  });

  const auth = createAppAuth({
    appId,
    privateKey,
    clientId,
    clientSecret,
    timeDifference: 0,
  });

  if (!installationId) {
    console.warn('Installation ID is not provided, attempting app-level authentication');
    const appAuthentication = await auth({ type: 'app' });
    return new octokitRest.Octokit({
      auth: appAuthentication.token,
      userAgent: 'Locano GitHub SQS Consumer',
    });
  }

  const installationAuthentication = await auth({
    type: 'installation',
    installationId,
  });

  return new octokitRest.Octokit({
    auth: installationAuthentication.token,
    userAgent: 'Locano GitHub SQS Consumer',
  });
}

export async function getLocaleFile(octokit: Octokit, owner: string, repo: string, path: string, ref: string): Promise<LocaleFile> {
  try {
    const response = await octokit.repos.getContent({ owner, repo, path, ref });
    const content = Buffer.from(response.data.content, 'base64').toString();
    return { path, content, sha: response.data.sha as string | undefined };
  } catch (error: any) {
    if (error.status === 404) {
      console.warn(`File ${path} not found for ref ${ref}, returning empty content`);
      return { path, content: '{}', sha: undefined };
    }
    throw error;
  }
}

export async function updateFile(octokit: Octokit, owner: string, repo: string, path: string, content: string, message: string, branch: string, sha?: string): Promise<void> {
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
    sha,
  });
}

export async function deleteFile(octokit: Octokit, owner: string, repo: string, path: string, message: string, branch: string, sha: string): Promise<void> {
  await octokit.repos.deleteFile({
    owner,
    repo,
    path,
    message,
    sha,
    branch,
  });
}

export async function createBranch(octokit: Octokit, owner: string, repo: string, newBranchName: string, sha: string): Promise<void> {
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranchName}`,
    sha,
  });
}

export async function getTree(octokit: Octokit, owner: string, repo: string, treeSha: string): Promise<string[]> {
  const { data } = await octokit.git.getTree({ owner, repo, tree_sha: treeSha, recursive: 'true' });
  return data.tree
    .filter((item): item is { path: string } => !!item.path && item.path.startsWith(`${LOCALES_FILE_PATH}/`) && item.path.endsWith(`.${LOCALE_FILE_EXTENSION}`))
    .map((item) => item.path);
}

export async function createPullRequest(octokit: Octokit, owner: string, repo: string, title: string, head: string, base: string, body: string): Promise<void> {
  await octokit.pulls.create({
    owner,
    repo,
    title,
    head,
    base,
    body,
  });
}
