import { workerData } from 'node:worker_threads';

import { SyncContext, TranslationUpdate } from '../types';

const pLimit = require('p-limit');

const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE;

export function generateTranslations(keys: string[], afterJson: Record<string, unknown>): Record<string, unknown> {
  const translations: Record<string, unknown> = {};
  keys.forEach((key) => {
    if (afterJson[key] !== undefined && afterJson[key] !== null) {
      translations[key] = afterJson[key];
    } else {
      console.warn(`[${workerData?.locales[0] || 'unknown'}] Undefined or null value for key ${key} in default locale, skipping.`);
    }
  });
  return translations;
}

export async function processLocale(context: SyncContext, locale: string): Promise<TranslationUpdate | null> {
  const { octokit, owner, repoName, branch, newBranchName, defaultLocaleFile, allKeys, afterJson, localesFilePath, localeFileExtension } = context;
  const limit = pLimit(5);

  const targetLocaleFile = `${locale}.${localeFileExtension}`;
  const targetPath = `${localesFilePath}/${targetLocaleFile}`;
  let existingContent = '{}';
  let sha: string | undefined;

  try {
    const targetResponse = await limit(() =>
      octokit.repos.getContent({
        owner,
        repo: repoName,
        path: targetPath,
        ref: branch,
      })
    );
    existingContent = Buffer.from((targetResponse.data as any).content, 'base64').toString(); // TODO: Уточнить тип
    sha = (targetResponse.data as any).sha;
    console.log(`[${locale}] Fetched SHA for ${targetPath} from ${branch}:`, sha);
  } catch (e: any) {
    if (e.status === 404) {
      console.log(`[${locale}] File ${targetPath} not found, creating new.`);
      sha = undefined;
    } else {
      console.error(`[${locale}] Error checking ${targetPath}: ${e.message}`);
      return null;
    }
  }

  let targetJson: Record<string, unknown>;
  try {
    targetJson = JSON.parse(existingContent);
  } catch (e) {
    console.error(`[${locale}] File ${targetPath} is not valid JSON, using empty object: ${e}`);
    targetJson = {};
  }

  const translations = generateTranslations(allKeys, afterJson);
  const updatedJson = { ...targetJson };
  Object.keys(updatedJson).forEach((key) => {
    if (!allKeys.includes(key)) {
      delete updatedJson[key];
      console.log(`[${locale}] Removed obsolete key '${key}' from ${targetPath}`);
    }
  });
  Object.assign(updatedJson, translations);

  let jsonString: string;
  try {
    jsonString = JSON.stringify(updatedJson, null, 2) + '\n';
    if (jsonString.includes(',}') || jsonString.includes(',]')) {
      throw new Error('Invalid JSON structure detected (trailing commas)');
    }
  } catch (e) {
    console.error(`[${locale}] Invalid JSON for ${targetPath}: ${e}`, { updatedJson });
    return null;
  }

  console.log(`[${locale}] Updated JSON for ${targetPath}:`, jsonString);

  await limit(() =>
    octokit.repos.createOrUpdateFileContents({
      owner: context.owner,
      repo: context.repoName,
      path: targetPath,
      message: `Sync translations for \`${targetLocaleFile}\``,
      content: Buffer.from(jsonString).toString('base64'),
      branch: newBranchName,
      sha,
    })
  );

  console.log(`[${locale}] Updated ${targetPath} with all keys from ${defaultLocaleFile} in branch ${newBranchName}`);
  if (locale === DEFAULT_LOCALE) {
    console.log(`[${locale}] Confirmed update for default locale ${defaultLocaleFile}`);
  }

  return { locale, filePath: targetPath, content: jsonString, sha };
}

export async function processObsoleteFiles(context: SyncContext, locale: string): Promise<void> {
  const { octokit, owner, repoName, branch, newBranchName, existingLocaleFiles, localesFilePath, localeFileExtension } = context;
  const limit = pLimit(5);

  for (const filePath of existingLocaleFiles) {
    const fileLocale = filePath.replace(`${localesFilePath}/`, '').replace(`.${localeFileExtension}`, '');
    if (fileLocale !== locale) continue; // Обрабатываем только файлы текущей локали

    if (!context.locales.includes(fileLocale)) {
      try {
        const fileResponse = await limit(() =>
          octokit.repos.getContent({
            owner,
            repo: repoName,
            path: filePath,
            ref: branch,
          })
        );
        const sha = (fileResponse.data as any).sha;
        await limit(() =>
          octokit.repos.deleteFile({
            owner,
            repo: repoName,
            path: filePath,
            message: `Remove obsolete locale file \`${filePath}\``,
            sha,
            branch: newBranchName,
          })
        );
        console.log(`[${locale}] Deleted obsolete file ${filePath} in branch ${newBranchName}`);
      } catch (e: any) {
        console.error(`[${locale}] Error deleting ${filePath}: ${e.message}`);
      }
    }
  }
}
