import SQLite, { SQLiteDatabase, ResultSet } from 'react-native-sqlite-storage';
import NetInfo from '@react-native-community/netinfo';
import { QueuedSubmission, QueuedSubmissionPayload } from '../types';
import { submit } from './submissionService';
import { MAX_RETRY_COUNT } from '../config';

SQLite.enablePromise(true);

let _db: SQLiteDatabase | null = null;

/** Open (or create) the local database and ensure the queue table exists. */
async function getDb(): Promise<SQLiteDatabase> {
  if (_db) {
    return _db;
  }
  _db = await SQLite.openDatabase({
    name: 'mcrs_offline.db',
    location: 'default',
  });
  return _db;
}

/** Create the queued_submissions table if it does not already exist. */
export async function init(): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS queued_submissions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      payload     TEXT    NOT NULL,
      created_at  TEXT    NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0
    );`,
  );
}

/** Persist a submission payload for later upload. */
export async function enqueue(payload: QueuedSubmissionPayload): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    `INSERT INTO queued_submissions (payload, created_at, retry_count)
     VALUES (?, ?, 0);`,
    [JSON.stringify(payload), new Date().toISOString()],
  );
}

/** Return all pending queued submissions. */
export async function getAll(): Promise<QueuedSubmission[]> {
  const db = await getDb();
  const [result]: [ResultSet] = await db.executeSql(
    `SELECT id, payload, created_at, retry_count
     FROM queued_submissions
     ORDER BY id ASC;`,
  );
  const rows: QueuedSubmission[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i) as QueuedSubmission);
  }
  return rows;
}

/** Remove a successfully uploaded item by its row id. */
export async function remove(id: number): Promise<void> {
  const db = await getDb();
  await db.executeSql(`DELETE FROM queued_submissions WHERE id = ?;`, [id]);
}

/** Increment the retry counter for a failed item. */
async function incrementRetry(id: number): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    `UPDATE queued_submissions SET retry_count = retry_count + 1 WHERE id = ?;`,
    [id],
  );
}

/**
 * Attempt to upload every pending submission.
 * On success: remove the row.
 * On failure: increment retry_count; skip (and log) items that have exceeded MAX_RETRY_COUNT.
 * The original deviceTimestamp is NEVER regenerated — it is read from the stored payload.
 */
export async function processQueue(): Promise<void> {
  const items = await getAll();
  for (const item of items) {
    if (item.retry_count >= MAX_RETRY_COUNT) {
      console.warn(
        `[OfflineQueue] Skipping item ${item.id} – exceeded max retries (${MAX_RETRY_COUNT}).`,
        item.payload,
      );
      continue;
    }

    try {
      const parsed: QueuedSubmissionPayload = JSON.parse(item.payload);
      await submit({
        categoryId: parsed.categoryId,
        // Preserve original device_timestamp — never regenerate
        deviceTimestamp: parsed.deviceTimestamp,
        photos: parsed.photos,
      });
      await remove(item.id);
      console.info(`[OfflineQueue] Successfully uploaded queued item ${item.id}.`);
    } catch (err) {
      console.warn(`[OfflineQueue] Failed to upload item ${item.id}, incrementing retry.`, err);
      await incrementRetry(item.id);
    }
  }
}

/**
 * Register a NetInfo listener that drains the queue whenever connectivity
 * is restored. Returns an unsubscribe function.
 */
export function setupNetworkListener(): () => void {
  let wasConnected: boolean | null = null;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const isConnected = state.isConnected && state.isInternetReachable;

    // Trigger processQueue only on the transition from offline → online
    if (isConnected && wasConnected === false) {
      console.info('[OfflineQueue] Connection restored — draining queue.');
      processQueue().catch((err) =>
        console.error('[OfflineQueue] processQueue error:', err),
      );
    }

    wasConnected = !!isConnected;
  });

  return unsubscribe;
}
