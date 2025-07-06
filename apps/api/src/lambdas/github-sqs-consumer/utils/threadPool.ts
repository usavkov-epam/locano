import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { SyncContext, TranslationUpdate } from '../types';
import { processLocale, processObsoleteFiles } from './localeProcessor';

export async function processWithThreads(context: SyncContext): Promise<{ updates: TranslationUpdate[]; obsoleteFiles: string[] }> {
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

  const results: { updates: TranslationUpdate[]; obsoleteFiles: string[] } = { updates: [], obsoleteFiles: [] };
  const workerPromises: Promise<any>[] = [];

  for (let i = 0; i < numCPUs && i < localeChunks.length; i++) {
    const worker = new Worker(__filename, {
      workerData: { ...context, locales: localeChunks[i] },
    });
    workers.push(worker);

    workerPromises.push(
      new Promise((resolve) => {
        worker.on('message', (message: { updates: TranslationUpdate[]; obsoleteFiles: string[] }) => {
          results.updates.push(...message.updates);
          results.obsoleteFiles.push(...message.obsoleteFiles);
          resolve(null);
        });

        worker.on('error', (err) => {
          console.error(`Worker ${i} error:`, err);
          resolve(null);
        });

        worker.on('exit', (code) => {
          if (code !== 0) console.error(`Worker ${i} exited with code ${code}`);
          resolve(null);
        });
      })
    );
  }

  await Promise.all(workerPromises);
  // Дополнительно проверяем устаревшие файлы для всего списка
  const globalObsolete = await processObsoleteFiles(context);
  if (globalObsolete) results.obsoleteFiles.push(...globalObsolete);
  return results;
}

if (!isMainThread) {
  (async () => {
    const context = workerData as SyncContext;
    const updates: TranslationUpdate[] = [];
    const obsoleteFiles: string[] = [];

    for (const locale of context.locales) {
      const update = await processLocale(context, locale);
      if (update) updates.push(update);
    }

    parentPort?.postMessage({ updates, obsoleteFiles });
  })().catch((err) => {
    console.error(`[${workerData?.locales[0] || 'unknown'}] Worker error:`, err);
    process.exit(1);
  });
}