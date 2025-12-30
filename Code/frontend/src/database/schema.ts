/**
 * WatermelonDB Schema
 * 
 * This schema mirrors the backend SQLite schema from api-server.js
 * All tables include standard tracking fields: create_user, create_date, update_user, update_date, deleted_flag
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

// Standard fields that exist on all tables (for reference, WatermelonDB handles timestamps internally)
// create_user, create_date, update_user, update_date, deleted_flag

export const schema = appSchema({
  version: 5,
  tables: [
    // ============================================================================
    // CORE TABLES
    // ============================================================================

    // 1. users
    tableSchema({
      name: 'users',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'username', type: 'string' },
        { name: 'password_hash', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 2. sports
    tableSchema({
      name: 'sports',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 3. teams
    tableSchema({
      name: 'teams',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'team_colors', type: 'string', isOptional: true },
        { name: 'logo_url', type: 'string', isOptional: true },
        { name: 'logo_svg', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 4. leagues
    tableSchema({
      name: 'leagues',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 5. members (People/Players)
    tableSchema({
      name: 'members',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'first_name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'display_name', type: 'string', isOptional: true },
        { name: 'gender', type: 'string', isOptional: true },
        { name: 'birth_date', type: 'number', isOptional: true },
        { name: 'dominant_side', type: 'string', isOptional: true }, // 'L', 'R', 'A'
        { name: 'share', type: 'number', isOptional: true },
        { name: 'share_type', type: 'string', isOptional: true },
        { name: 'paid_amount', type: 'number', isOptional: true },
        { name: 'country_of_origin', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 6. roles
    tableSchema({
      name: 'roles',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 7. positions
    tableSchema({
      name: 'positions',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'sport_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 8. colors
    tableSchema({
      name: 'colors',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'hex_code', type: 'string' },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 9. skills
    tableSchema({
      name: 'skills',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'sort_order', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 10. venues
    tableSchema({
      name: 'venues',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'geocoded_data', type: 'string', isOptional: true }, // JSON
        { name: 'details', type: 'string', isOptional: true }, // JSON
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 11. courts
    tableSchema({
      name: 'courts',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'surface', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 12. fields
    tableSchema({
      name: 'fields',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'surface', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 13. events
    tableSchema({
      name: 'events',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'start_date', type: 'number' },
        { name: 'end_date', type: 'number', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isOptional: true }, // 'scheduled'
        { name: 'is_series_event', type: 'number', isOptional: true },
        { name: 'series_id', type: 'string', isOptional: true },
        { name: 'repeat_period', type: 'string', isOptional: true }, // 'hours', 'days', 'weeks'
        { name: 'repeat_interval', type: 'number', isOptional: true },
        { name: 'total_events', type: 'number', isOptional: true },
        { name: 'last_event_date', type: 'number', isOptional: true },
        { name: 'last_event_time', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 14. user_preferences
    tableSchema({
      name: 'user_preferences',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
        { name: 'preview_first_count', type: 'number', isOptional: true },
        { name: 'preview_last_count', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 15. event_types
    tableSchema({
      name: 'event_types',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 16. seasons
    tableSchema({
      name: 'seasons',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'start_date', type: 'number', isOptional: true },
        { name: 'end_date', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 17. contacts
    tableSchema({
      name: 'contacts',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'value', type: 'string' },
        { name: 'type', type: 'string' }, // 'Email', 'Phone', 'Address'
        { name: 'label', type: 'string', isOptional: true }, // 'Home', 'Work'
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 18. contact_labels
    tableSchema({
      name: 'contact_labels',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'sort_order', type: 'number', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // 19. systems
    tableSchema({
      name: 'systems',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'config', type: 'string', isOptional: true }, // JSON
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // ============================================================================
    // CROSS-REFERENCE TABLES
    // ============================================================================

    // sport_league_xref
    tableSchema({
      name: 'sport_league_xref',
      columns: [
        { name: 'sport_id', type: 'string', isIndexed: true },
        { name: 'league_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // skill_sport_xref
    tableSchema({
      name: 'skill_sport_xref',
      columns: [
        { name: 'skill_id', type: 'string', isIndexed: true },
        { name: 'sport_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // team_league_xref
    tableSchema({
      name: 'team_league_xref',
      columns: [
        { name: 'team_id', type: 'string', isIndexed: true },
        { name: 'league_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // team_sport_xref
    tableSchema({
      name: 'team_sport_xref',
      columns: [
        { name: 'team_id', type: 'string', isIndexed: true },
        { name: 'sport_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // team_color_xref
    tableSchema({
      name: 'team_color_xref',
      columns: [
        { name: 'team_id', type: 'string', isIndexed: true },
        { name: 'color_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // team_member_xref
    tableSchema({
      name: 'team_member_xref',
      columns: [
        { name: 'team_id', type: 'string', isIndexed: true },
        { name: 'member_id', type: 'string', isIndexed: true },
        { name: 'skill_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'level_id', type: 'string', isOptional: true, isIndexed: true },
        // Contract fields (per-team)
        { name: 'share_type', type: 'string', isOptional: true },
        { name: 'share', type: 'number', isOptional: true },
        { name: 'membership_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'paid_status_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'paid_amount', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // member_role_xref
    tableSchema({
      name: 'member_role_xref',
      columns: [
        { name: 'member_id', type: 'string', isIndexed: true },
        { name: 'role_id', type: 'string', isIndexed: true },
        { name: 'context_table', type: 'string', isOptional: true },
        { name: 'context_id', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // member_position_xref
    tableSchema({
      name: 'member_position_xref',
      columns: [
        { name: 'member_id', type: 'string', isIndexed: true },
        { name: 'position_id', type: 'string', isIndexed: true },
        { name: 'context_table', type: 'string', isOptional: true },
        { name: 'context_id', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // member_contact_xref
    tableSchema({
      name: 'member_contact_xref',
      columns: [
        { name: 'member_id', type: 'string', isIndexed: true },
        { name: 'contact_id', type: 'string', isIndexed: true },
        { name: 'is_primary', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // event_team_xref
    tableSchema({
      name: 'event_team_xref',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'team_id', type: 'string', isIndexed: true },
        { name: 'outcome', type: 'string', isOptional: true }, // 'Win', 'Loss', 'Draw'
        { name: 'score', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // event_member_xref
    tableSchema({
      name: 'event_member_xref',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'member_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // event_venue_xref
    tableSchema({
      name: 'event_venue_xref',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'venue_id', type: 'string', isIndexed: true },
        { name: 'usage_notes', type: 'string', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // event_event_type_xref
    tableSchema({
      name: 'event_event_type_xref',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'event_type_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // event_system_xref
    tableSchema({
      name: 'event_system_xref',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'system_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // event_court_xref
    tableSchema({
      name: 'event_court_xref',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'court_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // event_field_xref
    tableSchema({
      name: 'event_field_xref',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'field_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // event_season_xref
    tableSchema({
      name: 'event_season_xref',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'season_id', type: 'string', isIndexed: true },
        { name: 'is_tournament', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // venue_court_xref
    tableSchema({
      name: 'venue_court_xref',
      columns: [
        { name: 'venue_id', type: 'string', isIndexed: true },
        { name: 'court_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // venue_field_xref
    tableSchema({
      name: 'venue_field_xref',
      columns: [
        { name: 'venue_id', type: 'string', isIndexed: true },
        { name: 'field_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // team_contact_xref
    tableSchema({
      name: 'team_contact_xref',
      columns: [
        { name: 'team_id', type: 'string', isIndexed: true },
        { name: 'contact_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // sport_season_xref
    tableSchema({
      name: 'sport_season_xref',
      columns: [
        { name: 'sport_id', type: 'string', isIndexed: true },
        { name: 'season_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // team_season_xref
    tableSchema({
      name: 'team_season_xref',
      columns: [
        { name: 'team_id', type: 'string', isIndexed: true },
        { name: 'season_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // ============================================================================
    // NEW MAPPING TABLES (v2)
    // ============================================================================

    // age_groups
    tableSchema({
      name: 'age_groups',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'sort_order', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // genders (Men, Women, Boys, Girls, Mixed, Open)
    tableSchema({
      name: 'genders',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'sort_order', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // levels (Amateur, Pro, Open)
    tableSchema({
      name: 'levels',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'sort_order', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // match_types (Singles, Doubles for racquet; Match for others)
    tableSchema({
      name: 'match_types',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'sport_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'sort_order', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // memberships (Member, Non-Member)
    tableSchema({
      name: 'memberships',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'sort_order', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // paid_statuses (Paid, Not Paid)
    tableSchema({
      name: 'paid_statuses',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'sort_order', type: 'number', isOptional: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // ============================================================================
    // NEW CROSS-REFERENCE TABLES (v2) - Events
    // ============================================================================

    // event_age_group_xref
    tableSchema({
      name: 'event_age_group_xref',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'age_group_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // event_gender_xref
    tableSchema({
      name: 'event_gender_xref',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'gender_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // event_level_xref
    tableSchema({
      name: 'event_level_xref',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'level_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // event_match_type_xref
    tableSchema({
      name: 'event_match_type_xref',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'match_type_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // ============================================================================
    // NEW CROSS-REFERENCE TABLES (v2) - Members
    // ============================================================================

    // member_age_group_xref
    tableSchema({
      name: 'member_age_group_xref',
      columns: [
        { name: 'member_id', type: 'string', isIndexed: true },
        { name: 'age_group_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // member_gender_xref (multi-select for eligible categories)
    tableSchema({
      name: 'member_gender_xref',
      columns: [
        { name: 'member_id', type: 'string', isIndexed: true },
        { name: 'gender_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // member_membership_xref
    tableSchema({
      name: 'member_membership_xref',
      columns: [
        { name: 'member_id', type: 'string', isIndexed: true },
        { name: 'membership_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // member_paid_status_xref
    tableSchema({
      name: 'member_paid_status_xref',
      columns: [
        { name: 'member_id', type: 'string', isIndexed: true },
        { name: 'paid_status_id', type: 'string', isIndexed: true },
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // ============================================================================
    // MATCHES TABLES (v5) - Match Assignments
    // ============================================================================

    // matches - stores match instances for events
    tableSchema({
      name: 'matches',
      columns: [
        { name: 'guid', type: 'string', isOptional: true },
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'court_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'field_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'match_type_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'status', type: 'string', isOptional: true }, // 'scheduled', 'in_progress', 'completed'
        { name: 'team_a_skill_avg', type: 'number', isOptional: true },
        { name: 'team_b_skill_avg', type: 'number', isOptional: true },
        { name: 'match_order', type: 'number', isOptional: true }, // Order of match on the court
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),

    // match_player_xref - links players to matches with position
    tableSchema({
      name: 'match_player_xref',
      columns: [
        { name: 'match_id', type: 'string', isIndexed: true },
        { name: 'member_id', type: 'string', isIndexed: true },
        { name: 'team_side', type: 'string' }, // 'A' or 'B'
        { name: 'position_slot', type: 'string', isOptional: true }, // e.g., 'deuce', 'ad', 'server'
        { name: 'create_user', type: 'string', isOptional: true },
        { name: 'create_date', type: 'number', isOptional: true },
        { name: 'update_user', type: 'string', isOptional: true },
        { name: 'update_date', type: 'number', isOptional: true },
        { name: 'deleted_flag', type: 'number', isOptional: true },
      ],
    }),
  ],
});