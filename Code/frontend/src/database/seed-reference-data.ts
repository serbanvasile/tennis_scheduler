/**
 * Seed Reference Data
 * 
 * Populates the local WatermelonDB with essential reference data.
 * Data matches the backend api-server.js seedReferenceData() function.
 */

import { database } from './index';
import { Q } from '@nozbe/watermelondb';
import {
    Color as ColorModel,
    Sport as SportModel,
    Skill as SkillModel,
    Role as RoleModel,
    EventType as EventTypeModel,
    System as SystemModel,
    ContactLabel as ContactLabelModel,
    Position as PositionModel,
    SkillSportXref,
} from './models';

const generateGuid = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// === REFERENCE DATA FROM BACKEND ===

const SPORTS = ['Tennis', 'Basketball', 'Soccer', 'Volleyball', 'Pickleball'];

const ROLES = ['Player', 'Captain', 'Coach', 'Admin', 'Reserve'];

const EVENT_TYPES = ['Match', 'Pickup', 'Practice', 'Meeting', 'Tournament'];

const SYSTEMS = ['Friendly', 'Round Robin', 'Playoff', 'Swiss', 'Elimination', 'League Play'];

const COLORS = [
    { name: 'Red', hex: '#FF0000' },
    { name: 'Blue', hex: '#0055FF' },
    { name: 'Green', hex: '#00AA00' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Gold', hex: '#FFD700' },
    { name: 'Silver', hex: '#C0C0C0' },
    { name: 'Orange', hex: '#FFA500' },
    { name: 'Purple', hex: '#800080' },
];

const CONTACT_LABELS = [
    { name: 'preferred', order: 1 },
    { name: 'emergency', order: 2 },
    { name: 'other', order: 3 },
    { name: 'expired', order: 4 },
    { name: 'do not use', order: 5 },
];

// Positions by sport
const POSITIONS_BY_SPORT: Record<string, string[]> = {
    'Tennis': ['Singles', 'Doubles'],
    'Pickleball': ['Singles', 'Doubles'],
    'Soccer': ['Goalie', 'Defender', 'Midfield', 'Forward'],
    'Basketball': ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
    'Volleyball': ['Setter', 'Libero', 'Middle Blocker', 'Outside Hitter', 'Opposite Hitter'],
};

// Skills - Tennis/Pickleball use numeric (3.0-5.5), others use general
const TENNIS_PICKLEBALL_SKILLS = ['3.0', '3.25', '3.5', '3.75', '4.0', '4.25', '4.5', '4.75', '5.0', '5.25', '5.5'];
const GENERAL_SKILLS = ['Amateur', 'Skilled Amateur', 'Fit Amateur', 'Semi-Pro', 'Pro'];

/**
 * Seeds the database with reference data if not already seeded.
 * Should be called once when the app starts.
 */
export async function seedReferenceData(): Promise<boolean> {
    try {
        // Check if already seeded
        const existingColors = await database.get<ColorModel>('colors').query().fetch();
        if (existingColors.length > 0) {
            console.log('📊 Reference data already exists, skipping seed');
            return false;
        }

        console.log('🌱 Seeding reference data...');
        const now = Date.now();

        await database.write(async () => {
            // 1. Seed Sports
            const sportRecords: Record<string, string> = {};
            for (const name of SPORTS) {
                const sport = await database.get<SportModel>('sports').create(s => {
                    (s as any)._setRaw('guid', generateGuid());
                    s.name = name;
                    (s as any)._setRaw('create_date', now);
                });
                sportRecords[name] = sport.id;
            }
            console.log(`  ✓ ${SPORTS.length} sports`);

            // 2. Seed Roles
            for (const name of ROLES) {
                await database.get<RoleModel>('roles').create(r => {
                    (r as any)._setRaw('guid', generateGuid());
                    r.name = name;
                    (r as any)._setRaw('create_date', now);
                });
            }
            console.log(`  ✓ ${ROLES.length} roles`);

            // 3. Seed Event Types
            for (const name of EVENT_TYPES) {
                await database.get<EventTypeModel>('event_types').create(e => {
                    (e as any)._setRaw('guid', generateGuid());
                    e.name = name;
                    (e as any)._setRaw('create_date', now);
                });
            }
            console.log(`  ✓ ${EVENT_TYPES.length} event types`);

            // 4. Seed Systems
            for (const name of SYSTEMS) {
                await database.get<SystemModel>('systems').create(s => {
                    (s as any)._setRaw('guid', generateGuid());
                    s.name = name;
                    (s as any)._setRaw('create_date', now);
                });
            }
            console.log(`  ✓ ${SYSTEMS.length} systems`);

            // 5. Seed Colors
            for (const color of COLORS) {
                await database.get<ColorModel>('colors').create(c => {
                    (c as any)._setRaw('guid', generateGuid());
                    c.name = color.name;
                    c.hexCode = color.hex;
                    (c as any)._setRaw('create_date', now);
                });
            }
            console.log(`  ✓ ${COLORS.length} colors`);

            // 6. Seed Contact Labels
            for (const label of CONTACT_LABELS) {
                await database.get<ContactLabelModel>('contact_labels').create(l => {
                    (l as any)._setRaw('guid', generateGuid());
                    l.name = label.name;
                    l.sortOrder = label.order;
                    (l as any)._setRaw('create_date', now);
                });
            }
            console.log(`  ✓ ${CONTACT_LABELS.length} contact labels`);

            // 7. Seed Positions (linked to sports)
            let positionCount = 0;
            for (const [sportName, positions] of Object.entries(POSITIONS_BY_SPORT)) {
                const sportId = sportRecords[sportName];
                if (sportId) {
                    for (const posName of positions) {
                        await database.get<PositionModel>('positions').create(p => {
                            (p as any)._setRaw('guid', generateGuid());
                            p.name = posName;
                            p.sportId = sportId;
                            (p as any)._setRaw('create_date', now);
                        });
                        positionCount++;
                    }
                }
            }
            console.log(`  ✓ ${positionCount} positions`);

            // 8. Seed Skills with sport links
            // Tennis/Pickleball skills (numeric ratings)
            const tennisPickleballIds = [sportRecords['Tennis'], sportRecords['Pickleball']].filter(Boolean);
            for (let i = 0; i < TENNIS_PICKLEBALL_SKILLS.length; i++) {
                const skill = await database.get<SkillModel>('skills').create(s => {
                    (s as any)._setRaw('guid', generateGuid());
                    s.name = TENNIS_PICKLEBALL_SKILLS[i];
                    s.sortOrder = i + 1;
                    (s as any)._setRaw('create_date', now);
                });

                // Link to Tennis and Pickleball
                for (const sportId of tennisPickleballIds) {
                    await database.get<SkillSportXref>('skill_sport_xref').create(x => {
                        x.skillId = skill.id;
                        x.sportId = sportId;
                        (x as any)._setRaw('create_date', now);
                    });
                }
            }

            // General skills for other sports
            const generalSportIds = [
                sportRecords['Basketball'],
                sportRecords['Soccer'],
                sportRecords['Volleyball']
            ].filter(Boolean);

            for (let i = 0; i < GENERAL_SKILLS.length; i++) {
                const skill = await database.get<SkillModel>('skills').create(s => {
                    (s as any)._setRaw('guid', generateGuid());
                    s.name = GENERAL_SKILLS[i];
                    s.sortOrder = i + 100; // Offset to separate from numeric skills
                    (s as any)._setRaw('create_date', now);
                });

                // Link to general sports
                for (const sportId of generalSportIds) {
                    await database.get<SkillSportXref>('skill_sport_xref').create(x => {
                        x.skillId = skill.id;
                        x.sportId = sportId;
                        (x as any)._setRaw('create_date', now);
                    });
                }
            }
            console.log(`  ✓ ${TENNIS_PICKLEBALL_SKILLS.length + GENERAL_SKILLS.length} skills`);
        });

        console.log('🌱 Reference data seeding complete!');
        return true;
    } catch (error) {
        console.error('❌ Failed to seed reference data:', error);
        return false;
    }
}

/**
 * Force re-seeds the database (clears existing reference data first)
 */
export async function reseedReferenceData(): Promise<boolean> {
    try {
        console.log('🔄 Clearing existing reference data...');

        await database.write(async () => {
            const tables = ['colors', 'sports', 'skills', 'roles', 'event_types', 'systems', 'contact_labels', 'positions', 'skill_sport_xref'];
            for (const table of tables) {
                const records = await database.get<any>(table).query().fetch();
                for (const r of records) await r.destroyPermanently();
            }
        });

        // Now seed fresh data
        return await seedReferenceData();
    } catch (error) {
        console.error('❌ Failed to reseed reference data:', error);
        return false;
    }
}
