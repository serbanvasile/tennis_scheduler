import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'players',
      columns: [
        { name: 'display_name', type: 'string' },
        { name: 'skill', type: 'number' },
        { name: 'handed', type: 'string' },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'tags', type: 'string', isOptional: true }, // JSON string
        { name: 'share', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'leagues',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'season_start', type: 'string' },
        { name: 'season_end', type: 'string' },
        { name: 'week_days', type: 'string' }, // JSON array
        { name: 'visibility', type: 'string' },
        { name: 'rules', type: 'string' }, // JSON object
        { name: 'admin_dids', type: 'string' }, // JSON array
        { name: 'created_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'courts',
      columns: [
        { name: 'league_id', type: 'string', isIndexed: true },
        { name: 'label', type: 'string' },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'time_slots', type: 'string' }, // JSON array
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'weeks',
      columns: [
        { name: 'league_id', type: 'string', isIndexed: true },
        { name: 'index', type: 'number' },
        { name: 'date_iso', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'availability',
      columns: [
        { name: 'week_id', type: 'string', isIndexed: true },
        { name: 'player_id', type: 'string', isIndexed: true },
        { name: 'state', type: 'string' }, // 'yes', 'no', 'maybe'
        { name: 'signature', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'matches',
      columns: [
        { name: 'week_id', type: 'string', isIndexed: true },
        { name: 'court_id', type: 'string', isIndexed: true },
        { name: 'time_slot', type: 'string' },
        { name: 'team_a', type: 'string' }, // JSON array of player IDs
        { name: 'team_b', type: 'string' }, // JSON array of player IDs
        { name: 'generated_by', type: 'string' },
        { name: 'locked', type: 'boolean', isOptional: true },
        { name: 'skill_level', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'scores',
      columns: [
        { name: 'match_id', type: 'string', isIndexed: true },
        { name: 'set_scores', type: 'string' }, // JSON array of [number, number]
        { name: 'winner', type: 'string' }, // 'A', 'B', 'split', 'NA'
        { name: 'submitted_by', type: 'string' },
        { name: 'signature', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
  ]
});