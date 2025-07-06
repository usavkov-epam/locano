const { Octokit } = require('@octokit/rest');

export interface GitHubConfig {
  appId: string;
  clientId: string;
  clientSecret: string;
  privateKeyPath: string;
  installationId?: number;
}

export interface LocaleFile {
  path: string;
  content: string;
  sha?: string;
}

export interface TranslationUpdate {
  locale: string;
  filePath: string;
  content: string;
  sha?: string;
}

export interface SyncContext {
  owner: string;
  repoName: string;
  branch: string;
  newBranchName: string;
  defaultLocaleFile: string;
  allKeys: string[];
  afterJson: Record<string, any>; // Пока оставим any для значений, можно уточнить позже
  existingLocaleFiles: string[];
  locales: string[];
  localesFilePath: string;
  localeFileExtension: string;
  installationId: number;
  octokit: typeof Octokit;
}
