import { Model, Query, Relation } from '@nozbe/watermelondb';

export class Player extends Model {
  static table = 'players';

  static associations = {
    availability: { type: 'has_many' as const, foreignKey: 'player_id' },
  };

  // Use getters instead of decorators for web compatibility
  get displayName() { return this._getRaw('display_name') as string; }
  set displayName(value: string) { this._setRaw('display_name', value); }

  get skill() { return this._getRaw('skill') as number; }
  set skill(value: number) { this._setRaw('skill', value); }

  get handed() { return this._getRaw('handed') as string; }
  set handed(value: string) { this._setRaw('handed', value); }

  get phone() { return this._getRaw('phone') as string || ''; }
  set phone(value: string) { this._setRaw('phone', value); }

  get email() { return this._getRaw('email') as string || ''; }
  set email(value: string) { this._setRaw('email', value); }

  get tags() { 
    const tagsStr = this._getRaw('tags') as string;
    return tagsStr ? JSON.parse(tagsStr) : []; 
  }
  set tags(value: string[]) { this._setRaw('tags', JSON.stringify(value)); }

  get share() { return this._getRaw('share') as number || 0; }
  set share(value: number) { this._setRaw('share', value); }

  get createdAt() { return new Date(this._getRaw('created_at') as number); }
  get updatedAt() { return new Date(this._getRaw('updated_at') as number); }
}

export class League extends Model {
  static table = 'leagues';

  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }

  get seasonStart() { return this._getRaw('season_start') as string; }
  set seasonStart(value: string) { this._setRaw('season_start', value); }

  get seasonEnd() { return this._getRaw('season_end') as string; }
  set seasonEnd(value: string) { this._setRaw('season_end', value); }

  get weekDays() { 
    const weekDaysStr = this._getRaw('week_days') as string;
    return weekDaysStr ? JSON.parse(weekDaysStr) : []; 
  }
  set weekDays(value: number[]) { this._setRaw('week_days', JSON.stringify(value)); }

  get visibility() { return this._getRaw('visibility') as string; }
  set visibility(value: string) { this._setRaw('visibility', value); }

  get rules() { 
    const rulesStr = this._getRaw('rules') as string;
    return rulesStr ? JSON.parse(rulesStr) : {}; 
  }
  set rules(value: any) { this._setRaw('rules', JSON.stringify(value)); }

  get adminDIDs() { 
    const adminDIDsStr = this._getRaw('admin_dids') as string;
    return adminDIDsStr ? JSON.parse(adminDIDsStr) : []; 
  }
  set adminDIDs(value: string[]) { this._setRaw('admin_dids', JSON.stringify(value)); }

  get createdBy() { return this._getRaw('created_by') as string; }
  set createdBy(value: string) { this._setRaw('created_by', value); }

  get createdAt() { return new Date(this._getRaw('created_at') as number); }
  get updatedAt() { return new Date(this._getRaw('updated_at') as number); }
}

export class Court extends Model {
  static table = 'courts';

  get leagueId() { return this._getRaw('league_id') as string; }
  set leagueId(value: string) { this._setRaw('league_id', value); }

  get label() { return this._getRaw('label') as string; }
  set label(value: string) { this._setRaw('label', value); }

  get location() { return this._getRaw('location') as string || ''; }
  set location(value: string) { this._setRaw('location', value); }

  get timeSlots() { 
    const timeSlotsStr = this._getRaw('time_slots') as string;
    return timeSlotsStr ? JSON.parse(timeSlotsStr) : []; 
  }
  set timeSlots(value: string[]) { this._setRaw('time_slots', JSON.stringify(value)); }

  get createdAt() { return new Date(this._getRaw('created_at') as number); }
  get updatedAt() { return new Date(this._getRaw('updated_at') as number); }
}

export class Week extends Model {
  static table = 'weeks';

  get leagueId() { return this._getRaw('league_id') as string; }
  set leagueId(value: string) { this._setRaw('league_id', value); }

  get index() { return this._getRaw('index') as number; }
  set index(value: number) { this._setRaw('index', value); }

  get dateISO() { return this._getRaw('date_iso') as string; }
  set dateISO(value: string) { this._setRaw('date_iso', value); }

  get status() { return this._getRaw('status') as string; }
  set status(value: string) { this._setRaw('status', value); }

  get notes() { return this._getRaw('notes') as string || ''; }
  set notes(value: string) { this._setRaw('notes', value); }

  get createdAt() { return new Date(this._getRaw('created_at') as number); }
  get updatedAt() { return new Date(this._getRaw('updated_at') as number); }
}

export class Availability extends Model {
  static table = 'availability';

  get weekId() { return this._getRaw('week_id') as string; }
  set weekId(value: string) { this._setRaw('week_id', value); }

  get playerId() { return this._getRaw('player_id') as string; }
  set playerId(value: string) { this._setRaw('player_id', value); }

  get state() { return this._getRaw('state') as string; }
  set state(value: string) { this._setRaw('state', value); }

  get signature() { return this._getRaw('signature') as string || ''; }
  set signature(value: string) { this._setRaw('signature', value); }

  get createdAt() { return new Date(this._getRaw('created_at') as number); }
  get updatedAt() { return new Date(this._getRaw('updated_at') as number); }
}

export class Match extends Model {
  static table = 'matches';

  get weekId() { return this._getRaw('week_id') as string; }
  set weekId(value: string) { this._setRaw('week_id', value); }

  get courtId() { return this._getRaw('court_id') as string; }
  set courtId(value: string) { this._setRaw('court_id', value); }

  get timeSlot() { return this._getRaw('time_slot') as string; }
  set timeSlot(value: string) { this._setRaw('time_slot', value); }

  get teamA() { 
    const teamAStr = this._getRaw('team_a') as string;
    return teamAStr ? JSON.parse(teamAStr) : []; 
  }
  set teamA(value: string[]) { this._setRaw('team_a', JSON.stringify(value)); }

  get teamB() { 
    const teamBStr = this._getRaw('team_b') as string;
    return teamBStr ? JSON.parse(teamBStr) : []; 
  }
  set teamB(value: string[]) { this._setRaw('team_b', JSON.stringify(value)); }

  get generatedBy() { return this._getRaw('generated_by') as string; }
  set generatedBy(value: string) { this._setRaw('generated_by', value); }

  get locked() { return Boolean(this._getRaw('locked')); }
  set locked(value: boolean) { this._setRaw('locked', value); }

  get skillLevel() { return this._getRaw('skill_level') as number || 0; }
  set skillLevel(value: number) { this._setRaw('skill_level', value); }

  get createdAt() { return new Date(this._getRaw('created_at') as number); }
  get updatedAt() { return new Date(this._getRaw('updated_at') as number); }
}

export class Score extends Model {
  static table = 'scores';

  get matchId() { return this._getRaw('match_id') as string; }
  set matchId(value: string) { this._setRaw('match_id', value); }

  get setScores() { 
    const setScoresStr = this._getRaw('set_scores') as string;
    return setScoresStr ? JSON.parse(setScoresStr) : []; 
  }
  set setScores(value: [number, number][]) { this._setRaw('set_scores', JSON.stringify(value)); }

  get winner() { return this._getRaw('winner') as string; }
  set winner(value: string) { this._setRaw('winner', value); }

  get submittedBy() { return this._getRaw('submitted_by') as string; }
  set submittedBy(value: string) { this._setRaw('submitted_by', value); }

  get signature() { return this._getRaw('signature') as string || ''; }
  set signature(value: string) { this._setRaw('signature', value); }

  get createdAt() { return new Date(this._getRaw('created_at') as number); }
  get updatedAt() { return new Date(this._getRaw('updated_at') as number); }
}