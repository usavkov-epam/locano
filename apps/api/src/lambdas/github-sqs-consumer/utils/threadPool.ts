import { isMainThread, parentPort, Worker, workerData } from 'worker_threads';

import { SyncContext, TranslationUpdate } from '../types';
import { initializeOctokit } from './gh';
import { processLocale, processObsoleteFiles } from './localeProcessor';

const GITHUB_APP_ID = process.env.GITHUB_APP_ID!;
const GITHUB_APP_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID!;
const GITHUB_APP_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET!;
const GITHUB_PRIVATE_KEY_PATH = process.env.GITHUB_PRIVATE_KEY_PATH!;

export async function processWithThreads(context: SyncContext): Promise<void> {
  if (!isMainThread) {
    throw new Error('This function should run in the main thread');
  }

  const numCPUs = require('os').cpus().length;
  console.log(`Using ${numCPUs} threads for processing`);
  const workers: Worker[] = [];
  const chunkSize = Math.ceil(context.locales.length / numCPUs);
  const localeChunks: string[][] = [];

  for (let i = 0; i < context.locales.length; i += chunkSize) {
    localeChunks.push(context.locales.slice(i, i + chunkSize));
  }

  for (let i = 0; i < numCPUs && i < localeChunks.length; i++) {
    const worker = new Worker(__filename, {
      workerData: { ...context, locales: localeChunks[i] },
    });
    workers.push(worker);

    worker.on('message', (message) => {
      console.log(`Worker ${i} message:`, message);
    });

    worker.on('error', (err) => {
      console.error(`Worker ${i} error:`, err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) console.error(`Worker ${i} exited with code ${code}`);
    });
  }

  await Promise.all(workers.map((worker) => new Promise((resolve) => worker.on('exit', resolve))));
}

if (!isMainThread) {
  (async () => {
    const context = workerData as SyncContext;
    const octokit = await initializeOctokit({
      appId: GITHUB_APP_ID,
      clientId: GITHUB_APP_CLIENT_ID,
      clientSecret: GITHUB_APP_CLIENT_SECRET,
      privateKeyPath: GITHUB_PRIVATE_KEY_PATH,
      installationId: context.installationId, // Должно передаваться через context
    });
    context.octokit = octokit;

    for (const locale of context.locales) {
      const update = await processLocale(context, locale);
      if (update) {
        await processObsoleteFiles(context, locale);
      }
    }

    parentPort?.postMessage('Worker completed');
  })().catch((err) => {
    console.error(`[${workerData?.locales[0] || 'unknown'}] Worker error:`, err);
    process.exit(1);
  });
}
