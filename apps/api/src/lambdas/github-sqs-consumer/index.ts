import 'dotenv/config';

import { PushEvent } from '@octokit/webhooks-types';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { compare } from 'fast-json-patch';

import { GitHubConfig, SyncContext, TranslationUpdate } from './types';
import { createBranch, createPullRequest,getLocaleFile, getTree, initializeOctokit } from './utils/gh';
import { processWithThreads } from './utils/threadPool';
import chalk from 'chalk';

const GITHUB_TARGET_BRANCH = process.env.GITHUB_TARGET_BRANCH!;
const GITHUB_APP_ID = process.env.GITHUB_APP_ID!;
const GITHUB_APP_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID!;
const GITHUB_APP_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET!;
const GITHUB_PRIVATE_KEY_PATH = process.env.GITHUB_PRIVATE_KEY_PATH!;
const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE!;
const TARGET_LOCALES = ['ru', 'ka', 'de', 'fr', 'es'];
const LOCALES_FILE_PATH = process.env.LOCALES_FILE_PATH!;
const LOCALE_FILE_EXTENSION = process.env.LOCALE_FILE_EXTENSION!;

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    try {
      const eventType = record.messageAttributes?.event?.stringValue ?? 'unknown';
      const body = JSON.parse(record.body);

      if (eventType !== 'push') {
        console.log(`Skipping event: ${eventType}`);
        continue;
      }

      const payload = body as PushEvent;

      if (payload.head_commit?.message?.startsWith('Sync translations')) {
        console.log(`Skipping self-triggered event from ${payload.ref}`);
        continue;
      }

      const branch = payload.ref.replace('refs/heads/', '');
      if (branch !== GITHUB_TARGET_BRANCH) {
        console.log(`Skipping push event from non-target branch ${branch}, target is ${GITHUB_TARGET_BRANCH}`);
        continue;
      }

      console.log(`Processing push event to ${payload.ref} on repo ${payload.repository.full_name}`);

      await handlePushEvent(payload);

      /* TODO: remove */
      return payload;
    } catch (err) {
      console.error('Failed to process message:', err);
      throw err;
    }
  }
};

async function handlePushEvent(payload: PushEvent): Promise<void> {
  const repo = payload.repository;
  const branch = payload.ref.replace('refs/heads/', '');
  const modifiedFiles = payload.head_commit?.modified ?? [];
  const defaultLocaleFile = modifiedFiles.find(
    (file) => file === `${LOCALES_FILE_PATH}/${DEFAULT_LOCALE}.${LOCALE_FILE_EXTENSION}`
  );

  console.log(`[${repo.full_name}] push to branch: ${branch}`);
  console.log(`Default locale ${defaultLocaleFile} modified:`, !!defaultLocaleFile);

  if (!defaultLocaleFile) {
    console.log(`No changes to default locale file ${LOCALES_FILE_PATH}/${DEFAULT_LOCALE}.${LOCALE_FILE_EXTENSION}. Skipping...`);
    return;
  }

  const gitHubConfig: GitHubConfig = {
    appId: GITHUB_APP_ID,
    clientId: GITHUB_APP_CLIENT_ID,
    clientSecret: GITHUB_APP_CLIENT_SECRET,
    privateKeyPath: GITHUB_PRIVATE_KEY_PATH,
    installationId: payload.installation?.id,
  };
  const octokit = await initializeOctokit(gitHubConfig);
  console.log('Installation ID used:', payload.installation?.id);

  const [owner, repoName] = [repo.owner.name!, repo.name];
  const beforeCommit = payload.before === '0000000000000000000000000000000000000000' ? payload.after : payload.before;
  const afterCommit = payload.after;

  const [beforeResponse, afterResponse] = await Promise.all([
    getLocaleFile(octokit, owner, repoName, defaultLocaleFile, beforeCommit),
    getLocaleFile(octokit, owner, repoName, defaultLocaleFile, afterCommit),
  ]);

  console.log(`File: ${defaultLocaleFile}`);
  console.log(`Before: ${beforeResponse.content.substring(0, 100)}...`);
  console.log(`After: ${afterResponse.content.substring(0, 100)}...`);

  let beforeJson, afterJson;
  try {
    beforeJson = JSON.parse(beforeResponse.content);
    afterJson = JSON.parse(afterResponse.content);
  } catch (e) {
    console.error(`File ${defaultLocaleFile} is not valid JSON: ${e}`);
    return;
  }

  const diff = compare(beforeJson, afterJson);
  console.log(`Diff: ${JSON.stringify(diff, null, 2)}`);

  const allKeys = Object.keys(afterJson);
  console.log(`All keys from default locale: ${allKeys.join(', ')}`);

  if (allKeys.length > 0) {
    const allLocales = [DEFAULT_LOCALE, ...TARGET_LOCALES];
    const newBranchName = `translation-update-${Date.now()}`;
    await createBranch(octokit, owner, repoName, newBranchName, afterCommit);

    const existingLocaleFiles = await getTree(octokit, owner, repoName, afterCommit);

    const context: SyncContext = {
      owner,
      repoName,
      branch,
      newBranchName,
      defaultLocaleFile,
      allKeys,
      afterJson,
      existingLocaleFiles,
      locales: allLocales,
      localesFilePath: LOCALES_FILE_PATH,
      localeFileExtension: LOCALE_FILE_EXTENSION,
      gitHubConfig,
    };

    const { updates, obsoleteFiles } = await processWithThreads(context);

    if (updates.length > 0 || obsoleteFiles.length > 0) {
      const baseTreeSha = await getCurrentTreeSha(octokit, owner, repoName, newBranchName);
      await createBatchCommit(octokit, owner, repoName, newBranchName, baseTreeSha, updates, obsoleteFiles);

      await createPullRequest(octokit, owner, repoName, `Sync translations for ${branch}`, newBranchName, branch, `Automated PR to sync translations with \`${defaultLocaleFile}\` keys: ${allKeys.map(k => `\`${k}\``).join(', ')}`);
      console.log(`PR created for branch ${newBranchName} with all translation updates and deletions`);
    } else {
      console.log(`No updates or deletions to process for message`);
    }
  } else {
    console.log(`No keys to process for message`);
  }
}

async function getCurrentTreeSha(octokit: any, owner: string, repo: string, branch: string): Promise<string> {
  const { data } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  return data.object.sha;
}

async function createBatchCommit(octokit: any, owner: string, repo: string, branch: string, baseTreeSha: string, updates: TranslationUpdate[], obsoleteFiles: string[]): Promise<void> {
  const treeItems = [
    ...updates.map((update) => ({
      path: update.filePath,
      mode: '100644',
      type: 'blob',
      content: update.content,
    })),
  ];

  // Добавляем удаление только для устаревших файлов
  const deletionItems = await Promise.all(obsoleteFiles.map(async (filePath) => {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: filePath, ref: branch });
      return {
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: null, // Указание null для удаления
      };
    } catch (e: any) {
      if (e.status !== 404) console.error(`Error fetching ${filePath} for deletion: ${e.message}`);
      return null;
    }
  })).then(items => items.filter(item => item !== null));

  treeItems.push(...(deletionItems as any));

  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    tree: treeItems,
    base_tree: baseTreeSha,
  });

  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: `Sync translations for multiple locales and remove obsolete files`,
    tree: newTree.sha,
    parents: [ref.object.sha],
  });

  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  console.log(`Batch commit created with SHA ${newCommit.sha} for branch ${branch}`);
}
