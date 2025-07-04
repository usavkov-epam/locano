export function getChangedFiles(commits: any[], prefixFilter: string[] = []) {
  const allFiles = new Set<string>();

  for (const commit of commits) {
    [...commit.added, ...commit.modified].forEach(f => {
      if (
        prefixFilter.length === 0 ||
        prefixFilter.some(prefix => f.startsWith(prefix))
      ) {
        allFiles.add(f);
      }
    });
  }

  return Array.from(allFiles);
}
