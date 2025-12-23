/**
 * Database Service Validation Utility
 * 
 * Validates that local-database-service returns data in the exact format
 * expected by the UI components. Run this after seeding to catch issues upfront.
 * 
 * Usage in browser console:
 *   import { validateDatabaseService } from './database/validate-database-service';
 *   validateDatabaseService();
 * 
 * Or call from App.tsx after seeding for automatic validation.
 */

import { databaseService } from './local-database-service';

interface ValidationResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
}

// Expected field contracts based on UI component requirements
const EXPECTED_FIELDS = {
    // From getLookups() - used by ImportScreen, RosterScreen, etc.
    sport: ['sport_id', 'name'],
    role: ['role_id', 'name'],
    skill: ['skill_id', 'name', 'sport_id'], // Skills must have sport_id for filtering
    eventType: ['eventType_id', 'name'],
    system: ['system_id', 'name'],
    position: ['position_id', 'name', 'sport_id'],

    // From getColors() - used by TeamsScreen
    color: ['color_id', 'name', 'hex_code'],

    // From getTeams() - used by TeamsScreen, ImportScreen
    team: ['team_id', 'name', 'sport_id', 'sport_name'],

    // From getMembers() - used by RosterScreen
    member: ['member_id', 'first_name', 'last_name', 'display_name'],
};

function validateFields(data: any[], expectedFields: string[], entityName: string, allowEmpty = false): string[] {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
        errors.push(`${entityName}: Expected array, got ${typeof data}`);
        return errors;
    }

    if (data.length === 0) {
        if (!allowEmpty) {
            errors.push(`${entityName}: Empty array - no data to validate (required for UI)`);
        }
        // If allowEmpty, we just skip validation - no error
        return errors;
    }

    // Check first item for expected fields
    const sample = data[0];
    for (const field of expectedFields) {
        if (!(field in sample)) {
            errors.push(`${entityName}: Missing required field '${field}'`);
        } else if (sample[field] === undefined || sample[field] === null) {
            errors.push(`${entityName}: Field '${field}' is null/undefined`);
        }
    }

    // Check for duplicate IDs (React key issues)
    const idField = expectedFields.find(f => f.endsWith('_id'));
    if (idField) {
        const ids = data.map(item => item[idField]);
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== ids.length) {
            const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
            errors.push(`${entityName}: Duplicate IDs found: ${[...new Set(duplicates)].join(', ')}`);
        }
    }

    return errors;
}

function validateIdTypes(data: any[], idField: string, entityName: string): string[] {
    const warnings: string[] = [];

    if (!Array.isArray(data) || data.length === 0) return warnings;

    // Check if IDs are consistent types
    const idTypes = new Set(data.map(item => typeof item[idField]));
    if (idTypes.size > 1) {
        warnings.push(`${entityName}: Mixed ID types for '${idField}': ${[...idTypes].join(', ')}`);
    }

    return warnings;
}

export async function validateDatabaseService(): Promise<ValidationResult> {
    console.log('🔍 Validating database service data structures...\n');

    const result: ValidationResult = {
        passed: true,
        errors: [],
        warnings: [],
    };

    try {
        // 1. Validate getLookups()
        console.log('Checking getLookups()...');
        const lookups = await databaseService.getLookups();

        if (!lookups || typeof lookups !== 'object') {
            result.errors.push('getLookups(): Did not return an object');
        } else {
            // Validate each lookup type
            result.errors.push(...validateFields(lookups.sports || [], EXPECTED_FIELDS.sport, 'sports'));
            result.errors.push(...validateFields(lookups.roles || [], EXPECTED_FIELDS.role, 'roles'));
            result.errors.push(...validateFields(lookups.skills || [], EXPECTED_FIELDS.skill, 'skills'));
            result.errors.push(...validateFields(lookups.eventTypes || [], EXPECTED_FIELDS.eventType, 'eventTypes'));
            result.errors.push(...validateFields(lookups.systems || [], EXPECTED_FIELDS.system, 'systems'));
            result.errors.push(...validateFields(lookups.positions || [], EXPECTED_FIELDS.position, 'positions'));

            // Check for duplicate skill IDs (common issue with skill-sport many-to-many)
            result.warnings.push(...validateIdTypes(lookups.skills || [], 'skill_id', 'skills'));

            console.log(`  ✓ sports: ${lookups.sports?.length || 0}`);
            console.log(`  ✓ roles: ${lookups.roles?.length || 0}`);
            console.log(`  ✓ skills: ${lookups.skills?.length || 0}`);
            console.log(`  ✓ eventTypes: ${lookups.eventTypes?.length || 0}`);
            console.log(`  ✓ systems: ${lookups.systems?.length || 0}`);
            console.log(`  ✓ positions: ${lookups.positions?.length || 0}`);
        }

        // 2. Validate getColors()
        console.log('Checking getColors()...');
        const colors = await databaseService.getColors();
        result.errors.push(...validateFields(colors || [], EXPECTED_FIELDS.color, 'colors'));
        console.log(`  ✓ colors: ${colors?.length || 0}`);

        // 3. Validate getTeams()
        console.log('Checking getTeams()...');
        const teams = await databaseService.getTeams();
        result.errors.push(...validateFields(teams || [], EXPECTED_FIELDS.team, 'teams', true)); // allowEmpty - teams are user-created

        // Additional team-specific checks
        for (const team of teams || []) {
            if (!team.sport_name && team.sport_id) {
                result.errors.push(`teams: Team '${team.name}' has sport_id but no sport_name`);
            }
        }
        console.log(`  ✓ teams: ${teams?.length || 0}`);

        // 4. Validate getMembers() if there are any
        console.log('Checking getMembers()...');
        const members = await databaseService.getMembers();
        if (members && members.length > 0) {
            result.errors.push(...validateFields(members, EXPECTED_FIELDS.member, 'members'));
        }
        console.log(`  ✓ members: ${members?.length || 0}`);

    } catch (err) {
        result.errors.push(`Validation failed with error: ${err}`);
    }

    // Summary
    result.passed = result.errors.length === 0;

    console.log('\n' + '='.repeat(50));
    if (result.passed) {
        console.log('✅ VALIDATION PASSED - All data structures match expected formats');
    } else {
        console.log('❌ VALIDATION FAILED - Found issues:');
        result.errors.forEach(err => console.log(`  ❌ ${err}`));
    }

    if (result.warnings.length > 0) {
        console.log('\n⚠️ WARNINGS:');
        result.warnings.forEach(warn => console.log(`  ⚠️ ${warn}`));
    }
    console.log('='.repeat(50) + '\n');

    return result;
}

// Quick function to run from console
export async function runValidation() {
    const result = await validateDatabaseService();
    return result;
}
