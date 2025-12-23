/**
 * WatermelonDB Database Initialization
 * 
 * Exports the appropriate database based on platform.
 * For web: uses web-database.ts with LokiJS
 * For native: uses SQLite adapter (not yet fully configured)
 */

import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';

// Use platform-specific database export
// On web, we use LokiJS adapter; on native, SQLite
let database: Database;

if (Platform.OS === 'web') {
  // Web uses LokiJS - import directly to avoid bundler issues with SQLite
  const webDb = require('./web-database');
  database = webDb.database;
} else {
  // Native platforms - for now, fall back to web database
  // TODO: Configure SQLite adapter for React Native
  const webDb = require('./web-database');
  database = webDb.database;
}

export { database };

// Re-export schema and models for convenience
export { schema } from './schema';
export * from './models';

// Database inspection utility (available in console as window.inspectDatabase)
export { inspectDatabase } from './inspect-database';