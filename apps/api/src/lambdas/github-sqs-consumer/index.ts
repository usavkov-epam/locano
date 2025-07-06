import 'dotenv/config';

import { PushEvent } from '@octokit/webhooks-types';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { compare } from 'fast-json-patch';

import { SyncContext } from './types';
import { createBranch, createPullRequest,getLocaleFile, getTree, initializeOctokit } from './utils/gh';
import { processWithThreads } from './utils/threadPool';

const GITHUB_APP_ID = process.env.GITHUB_APP_ID!;
const GITHUB_APP_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID!;
const GITHUB_APP_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET!;
const GITHUB_PRIVATE_KEY_PATH = process.env.GITHUB_PRIVATE_KEY_PATH!;
const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE!;
const TARGET_LOCALES = ['ru', 'ka', 'pl', 'ua', 'de', 'fr', 'es', 'it', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'];
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

  const octokit = await initializeOctokit({
    appId: GITHUB_APP_ID,
    clientId: GITHUB_APP_CLIENT_ID,
    clientSecret: GITHUB_APP_CLIENT_SECRET,
    privateKeyPath: GITHUB_PRIVATE_KEY_PATH,
    installationId: payload.installation?.id,
  });
  console.log('Installation ID used:', payload.installation?.id);

  const [owner, repoName] = [repo.owner.name!, repo.name];
  const beforeCommit = payload.before;
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

  if (allKeys.length > 0) {
    const allLocales = [DEFAULT_LOCALE, ...TARGET_LOCALES];
    const newBranchName = `translation-update-${Date.now()}`;

    /*
      * Create a new branch for the translation updates.
      * This branch will be used to commit all changes and create a pull request.
      * The branch name is generated based on the current timestamp to ensure uniqueness.
    */
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
      octokit,
      installationId: payload.installation!.id,
    };

    console.log('Context for processing locales:', context)

    /*
      * Process all locales in parallel using worker threads.
      * Each thread will handle a subset of locales to update their translation files.
      * This allows us to efficiently update multiple locale files without blocking the main thread.
    */
    await processWithThreads(context);

    /*
      * Create a pull request with all translation updates.
      * The PR will be created from the new branch to the original branch.
      * The title and body of the PR will include information about the changes made. 
    */
    await createPullRequest(octokit, owner, repoName, `Sync translations for ${branch}`, newBranchName, branch, `Automated PR to sync translations with \`${defaultLocaleFile}\` keys: ${allKeys.map(k => `\`${k}\``).join(', ')}`);
    console.log(`PR created for branch ${newBranchName} with all translation updates`);
  } else {
    console.log('No keys to process for message');
  }
}