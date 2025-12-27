/**
 * Web Database - WatermelonDB with LokiJS adapter
 * 
 * This file is web-specific, using LokiJS for browser storage.
 */

import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import { modelClasses } from './models';

const DB_NAME = 'TeamSports';

// Check if database reset was requested via environment variable
const shouldResetDatabase = (): boolean => {
  // Check environment variable (set by restart-servers.bat --reset)
  const resetEnv = process.env.EXPO_PUBLIC_RESET_DATABASE;
  if (resetEnv === 'true') {
    console.log('[Database] Reset requested via EXPO_PUBLIC_RESET_DATABASE');
    return true;
  }

  // Also check URL parameter for convenience (e.g., ?reset=true)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === 'true') {
      console.log('[Database] Reset requested via URL parameter');
      return true;
    }
  }

  return false;
};

// Clear IndexedDB database if reset is requested
const clearDatabaseIfNeeded = async (): Promise<void> => {
  if (!shouldResetDatabase()) return;

  if (typeof window !== 'undefined' && window.indexedDB) {
    console.log('[Database] Clearing IndexedDB...');

    // Delete the LokiJS databases
    const dbNames = [
      DB_NAME,
      `${DB_NAME}_loki`,
      `${DB_NAME}_idb`,
      'loki__TeamSports',
      'loki__TeamSports_idb'
    ];

    for (const name of dbNames) {
      try {
        await new Promise<void>((resolve, reject) => {
          const req = window.indexedDB.deleteDatabase(name);
          req.onsuccess = () => {
            console.log(`[Database] Deleted: ${name}`);
            resolve();
          };
          req.onerror = () => reject(req.error);
          req.onblocked = () => {
            console.warn(`[Database] Delete blocked for: ${name}`);
            resolve();
          };
        });
      } catch (e) {
        console.warn(`[Database] Could not delete ${name}:`, e);
      }
    }

    // Also clear localStorage keys that might be related
    try {
      const keysToRemove = Object.keys(localStorage).filter(k =>
        k.includes('TeamSports') || k.includes('loki') || k.includes('watermelon')
      );
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log('[Database] Cleared localStorage keys:', keysToRemove);
    } catch (e) {
      console.warn('[Database] Could not clear localStorage:', e);
    }

    console.log('[Database] Reset complete. Refreshing page...');

    // Remove the reset parameter and refresh
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('reset');
      window.location.href = url.toString();
    }
  }
};

// Run reset check immediately (async)
clearDatabaseIfNeeded();

// Web-only database setup using LokiJS
const adapter = new LokiJSAdapter({
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  dbName: DB_NAME,
  onSetUpError: (error: any) => {
    console.error('Database setup error:', error);
  }
});

// Create database instance with all model classes
export const database = new Database({
  adapter,
  modelClasses,
});

// Re-export schema and models
export { schema } from './schema';
export * from './models';