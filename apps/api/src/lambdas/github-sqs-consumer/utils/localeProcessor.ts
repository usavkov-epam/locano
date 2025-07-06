import { workerData } from "node:worker_threads";
import { initializeOctokit } from "./gh";
import { SyncContext, TranslationUpdate } from "../types";

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
  const octokit = await initializeOctokit(context.gitHubConfig);
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(2);

  const targetLocaleFile = `${locale}.${context.localeFileExtension}`;
  const targetPath = `${context.localesFilePath}/${targetLocaleFile}`;
  let existingContent = '{}';
  let sha: string | undefined;

  try {
    const targetResponse = await limit(() =>
      octokit.repos.getContent({ owner: context.owner, repo: context.repoName, path: targetPath, ref: context.branch })
    );
    existingContent = Buffer.from(targetResponse.data.content, 'base64').toString();
    sha = targetResponse.data.sha as string | undefined;
    console.log(`[${locale}] Fetched SHA for ${targetPath} from ${context.branch}:`, sha);
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

  const translations = generateTranslations(context.allKeys, context.afterJson);
  const updatedJson = { ...targetJson };
  Object.keys(updatedJson).forEach((key) => {
    if (!context.allKeys.includes(key)) {
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

  console.log(`[${locale}] Calculated updated JSON for ${targetPath}:`, jsonString);
  return { locale, filePath: targetPath, content: jsonString, sha };
}

export async function processObsoleteFiles(context: SyncContext): Promise<string[] | null> {
  const octokit = await initializeOctokit(context.gitHubConfig);
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(2);
  const obsoleteFiles: string[] = [];

  for (const filePath of context.existingLocaleFiles) {
    const fileLocale = filePath.replace(`${context.localesFilePath}/`, '').replace(`.${context.localeFileExtension}`, '');
    if (!context.locales.includes(fileLocale)) {
      try {
        await limit(() =>
          octokit.repos.getContent({ owner: context.owner, repo: context.repoName, path: filePath, ref: context.branch })
        );
        obsoleteFiles.push(filePath);
        console.log(`Marked obsolete file ${filePath} for deletion`);
      } catch (e: any) {
        if (e.status !== 404) {
          console.error(`Error checking ${filePath}: ${e.message}`);
        }
      }
    }
  }
  return obsoleteFiles.length > 0 ? obsoleteFiles : null;
}