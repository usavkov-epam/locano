import { Injectable } from '@nestjs/common';
import { getChangedFiles, /* parseJsonDiff */ } from './github.utils';

@Injectable()
export class GithubService {
  async handlePush(payload: any) {
    const repo = payload.repository.full_name;
    const branch = payload.ref.replace('refs/heads/', '');
    const commits = payload.commits;

    console.log('payload', payload);

    const changedFiles = getChangedFiles(commits, ['locales/en/']);

    const changedJsonFiles = changedFiles.filter(f => f.endsWith('.json'));

    if (changedJsonFiles.length === 0) {
      return { status: 'no translation changes' };
    }

    // TODO: clone repo, read old/new file contents (or fetch via GitHub API)

    for (const file of changedJsonFiles) {
      // 1. получить old и new версии файла
      // 2. сравнить JSON и получить diff
      // 3. отдать измененные ключи в перевод
    }

    return { status: 'handled', files: changedJsonFiles };
  }
}
