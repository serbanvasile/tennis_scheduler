/**
 * Web Database - WatermelonDB with LokiJS adapter
 * 
 * This file is web-specific, using LokiJS for browser storage.
 */

import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import { modelClasses } from './models';

// Web-only database setup using LokiJS
const adapter = new LokiJSAdapter({
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  dbName: 'TeamSports',
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