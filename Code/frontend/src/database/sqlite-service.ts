/**
 * Database Service
 * 
 * This file now redirects to the local WatermelonDB service.
 * The original HTTP-based implementation has been archived as sqlite-service.deprecated.ts
 */

// Re-export the local database service
export { databaseService } from './local-database-service';