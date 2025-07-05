import 'dotenv/config';

import type { PushEvent } from '@octokit/webhooks-types';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import * as fs from 'fs/promises';
import { compare } from 'fast-json-patch';

const GITHUB_APP_ID = process.env.GITHUB_APP_ID!;
const GITHUB_APP_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID!;
const GITHUB_APP_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET!;
const GITHUB_PRIVATE_KEY_PATH = process.env.GITHUB_PRIVATE_KEY_PATH!;
const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE!;
const TARGET_LOCALES = ['ru', 'ka', 'pl', 'ua', 'de', 'fr', 'es', 'it', 'pt', 'zh-CN', 'ja', 'ko'];
const LOCALES_FILE_PATH = process.env.LOCALES_FILE_PATH!;
const LOCALE_FILE_EXTENSION = process.env.LOCALE_FILE_EXTENSION!;

let octokit;

async function initializeOctokit({ installationId }) {
  const [{ createAppAuth }, { Octokit }] = await Promise.all([
    import('@octokit/auth-app'),
    import('@octokit/rest'),
  ]);

  console.log('GITHUB_APP_CLIENT_SECRET', GITHUB_APP_CLIENT_SECRET);
  console.log('GITHUB_PRIVATE_KEY_PATH', GITHUB_PRIVATE_KEY_PATH);

  const privateKey = await fs.readFile(GITHUB_PRIVATE_KEY_PATH, 'utf8').catch((err) => {
    console.error('Failed to read GitHub private key:', err);
    throw err;
  });

  const auth = createAppAuth({
    appId: GITHUB_APP_ID,
    privateKey,
    clientId: GITHUB_APP_CLIENT_ID,
    clientSecret: GITHUB_APP_CLIENT_SECRET,
  });

  const installationAuthentication = await auth({
    type: 'installation',
    installationId,
  });

  octokit = new Octokit({
    auth: installationAuthentication.token,
    userAgent: 'Locano GitHub SQS Consumer',
  });
}

/*
  Accept SQS events from GitHub Webhook and process "push" events.
*/
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
    (file) => file === `${LOCALES_FILE_PATH}/${DEFAULT_LOCALE}.${LOCALE_FILE_EXTENSION}`,
  );

  console.log(`[${repo.full_name}] push to branch: ${branch}`);
  console.log(`Default locale ${defaultLocaleFile} modified:`, !!defaultLocaleFile);

  if (!defaultLocaleFile) {
    console.log(`No changes to default locale file ${LOCALES_FILE_PATH}/${DEFAULT_LOCALE}.${LOCALE_FILE_EXTENSION}. Skipping...`);
    return;
  }

  try {
    if (!octokit) await initializeOctokit({ installationId: payload.installation?.id });
    console.log('Installation ID used:', payload.installation?.id);
  } catch (err) {
    console.error('Failed to initialize Octokit:', err);
    return;
  }

  try {
    const [owner, repoName] = [repo.owner.name!, repo.name];
    const beforeCommit = payload.before;
    const afterCommit = payload.after;

    const [beforeResponse, afterResponse] = await Promise.all([
      octokit.repos.getContent({ owner, repo: repoName, path: defaultLocaleFile, ref: beforeCommit }),
      octokit.repos.getContent({ owner, repo: repoName, path: defaultLocaleFile, ref: afterCommit }),
    ]);

    const beforeData = Buffer.from((beforeResponse.data as any).content, 'base64').toString();
    const afterData = Buffer.from((afterResponse.data as any).content, 'base64').toString();

    console.log(`File: ${defaultLocaleFile}`);
    console.log(`Before: ${beforeData.substring(0, 100)}...`);
    console.log(`After: ${afterData.substring(0, 100)}...`);

    let beforeJson, afterJson;
    try {
      beforeJson = JSON.parse(beforeData);
      afterJson = JSON.parse(afterData);
    } catch (e) {
      console.error(`File ${defaultLocaleFile} is not valid JSON: ${e}`);
      return;
    }

    const diff = compare(beforeJson, afterJson);
    console.log(`Diff: ${JSON.stringify(diff, null, 2)}`);

    const allKeys = Object.keys(afterJson); // Все ключи из обновлённой дефолтной локали
    console.log(`All keys from default locale: ${allKeys.join(', ')}`);

    if (allKeys.length > 0) {
      // Включаем дефолтную локаль в список обрабатываемых файлов
      const allLocales = [DEFAULT_LOCALE, ...TARGET_LOCALES];
      const newBranchName = `translation-update-${Date.now()}`;
      await octokit.git.createRef({
        owner,
        repo: repoName,
        ref: `refs/heads/${newBranchName}`,
        sha: afterCommit,
      });

      // Получаем список всех файлов в директории LOCALES_FILE_PATH
      const { data: tree } = await octokit.git.getTree({
        owner,
        repo: repoName,
        tree_sha: afterCommit,
        recursive: 'true',
      });
      const existingLocaleFiles = tree.tree
        .filter((item) => item.path?.startsWith(`${LOCALES_FILE_PATH}/`) && item.path.endsWith(`.${LOCALE_FILE_EXTENSION}`))
        .map((item) => item.path);

      for (const locale of allLocales) {
        const targetLocaleFile = `${locale}.${LOCALE_FILE_EXTENSION}`;
        const targetPath = `${LOCALES_FILE_PATH}/${targetLocaleFile}`;
        let existingContent = '{}';
        let sha: string | undefined;

        try {
          const targetResponse = await octokit.repos.getContent({
            owner,
            repo: repoName,
            path: targetPath,
            ref: branch, // Используем целевую ветку для актуального SHA
          });
          existingContent = Buffer.from((targetResponse.data as any).content, 'base64').toString();
          sha = (targetResponse.data as any).sha;
          console.log(`Fetched SHA for ${targetPath} from ${branch}:`, sha);
        } catch (e: any) {
          if (e.status === 404) {
            console.log(`File ${targetPath} not found, creating new.`);
            sha = undefined; // SHA не нужен для нового файла
          } else {
            console.error(`Error checking ${targetPath}: ${e.message}`);
            continue;
          }
        }

        let targetJson;
        try {
          targetJson = JSON.parse(existingContent);
        } catch (e) {
          console.error(`File ${targetPath} is not valid JSON, using empty object: ${e}`);
          targetJson = {};
        }

        const translations = generateTranslations(allKeys, afterJson);
        // Удаляем лишние ключи, которых нет в afterJson
        const updatedJson = { ...targetJson };
        Object.keys(updatedJson).forEach((key) => {
          if (!allKeys.includes(key)) {
            delete updatedJson[key];
            console.log(`Removed obsolete key '${key}' from ${targetPath}`);
          }
        });
        // Добавляем или обновляем существующие ключи
        Object.assign(updatedJson, translations);

        // Улучшенная валидация и добавление новой строки
        let jsonString;
        try {
          jsonString = JSON.stringify(updatedJson, null, 2) + '\n';
          if (jsonString.includes(',}') || jsonString.includes(',]')) {
            throw new Error('Invalid JSON structure detected (trailing commas)');
          }
        } catch (e) {
          console.error(`Invalid JSON for ${targetPath}: ${e}`, { updatedJson });
          continue;
        }

        console.log(`[${locale}] Updated JSON for ${targetPath}:`, jsonString);

        // Создаём или обновляем файл в новой ветке
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo: repoName,
          path: targetPath,
          message: `Sync translations for \`${targetLocaleFile}\``,
          content: Buffer.from(jsonString).toString('base64'),
          branch: newBranchName,
          sha,
        });

        console.log(`Updated ${targetPath} with all keys from ${defaultLocaleFile} in branch ${newBranchName}`);
        if (locale === DEFAULT_LOCALE) {
          console.log(`Confirmed update for default locale ${defaultLocaleFile}`);
        }
      }

      // Удаляем файлы локалей, которые больше не нужны
      const currentLocales = new Set(allLocales);
      for (const filePath of existingLocaleFiles) {
        const locale = filePath.replace(`${LOCALES_FILE_PATH}/`, '').replace(`.${LOCALE_FILE_EXTENSION}`, '');
        if (!currentLocales.has(locale)) {
          try {
            const fileResponse = await octokit.repos.getContent({
              owner,
              repo: repoName,
              path: filePath,
              ref: branch,
            });
            const sha = (fileResponse.data as any).sha;
            await octokit.repos.deleteFile({
              owner,
              repo: repoName,
              path: filePath,
              message: `Remove obsolete locale file \`${filePath}\``,
              sha,
              branch: newBranchName,
            });
            console.log(`Deleted obsolete file ${filePath} in branch ${newBranchName}`);
          } catch (e: any) {
            console.error(`Error deleting ${filePath}: ${e.message}`);
          }
        }
      }

      // Создаём один PR для всех изменений
      await octokit.pulls.create({
        owner,
        repo: repoName,
        title: `Sync translations for ${branch}`,
        head: newBranchName,
        base: branch,
        body: `Automated PR to sync translations with \`${defaultLocaleFile}\` keys: ${allKeys.map(k => `\`${k}\``).join(', ')}`,
      });

      console.log(`PR created for branch ${newBranchName} with all translation updates`);
    } else {
      console.log(`No keys to process for message`);
    }
  } catch (err) {
    console.error('Failed to fetch file content:', err);
    return;
  }
}

function generateTranslations(keys: string[], afterJson: any): any {
  const translations = {};
  keys.forEach((key) => {
    if (afterJson[key] !== undefined && afterJson[key] !== null) {
      translations[key] = afterJson[key];
    } else {
      console.warn(`Undefined or null value for key ${key} in default locale, skipping.`);
    }
  });
  return translations;
}