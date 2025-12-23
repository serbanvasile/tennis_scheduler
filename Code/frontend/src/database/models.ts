/**
 * WatermelonDB Models
 * 
 * Model classes for all database tables, matching the backend schema.
 * Uses getter/setter pattern for web compatibility (no decorators).
 */

import { Model } from '@nozbe/watermelondb';

// ============================================================================
// HELPER - Standard fields getter/setters
// ============================================================================

// All models have these standard tracking fields
const standardFieldGetters = {
  get guid() { return (this as any)._getRaw('guid') as string | null; },
  set guid(value: string | null) { (this as any)._setRaw('guid', value); },
  get createUser() { return (this as any)._getRaw('create_user') as string | null; },
  set createUser(value: string | null) { (this as any)._setRaw('create_user', value); },
  get createDate() { return (this as any)._getRaw('create_date') as number | null; },
  set createDate(value: number | null) { (this as any)._setRaw('create_date', value); },
  get updateUser() { return (this as any)._getRaw('update_user') as string | null; },
  set updateUser(value: string | null) { (this as any)._setRaw('update_user', value); },
  get updateDate() { return (this as any)._getRaw('update_date') as number | null; },
  set updateDate(value: number | null) { (this as any)._setRaw('update_date', value); },
  get deletedFlag() { return (this as any)._getRaw('deleted_flag') as number | null; },
  set deletedFlag(value: number | null) { (this as any)._setRaw('deleted_flag', value); },
};

// ============================================================================
// CORE MODELS
// ============================================================================

export class User extends Model {
  static table = 'users';

  get guid() { return this._getRaw('guid') as string | null; }
  get username() { return this._getRaw('username') as string; }
  set username(value: string) { this._setRaw('username', value); }
  get passwordHash() { return this._getRaw('password_hash') as string | null; }
  set passwordHash(value: string | null) { this._setRaw('password_hash', value); }
  get email() { return this._getRaw('email') as string | null; }
  set email(value: string | null) { this._setRaw('email', value); }
}

export class Sport extends Model {
  static table = 'sports';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get description() { return this._getRaw('description') as string | null; }
  set description(value: string | null) { this._setRaw('description', value); }
}

export class Team extends Model {
  static table = 'teams';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get teamColors() { return this._getRaw('team_colors') as string | null; }
  set teamColors(value: string | null) { this._setRaw('team_colors', value); }
  get logoUrl() { return this._getRaw('logo_url') as string | null; }
  set logoUrl(value: string | null) { this._setRaw('logo_url', value); }
  get logoSvg() { return this._getRaw('logo_svg') as string | null; }
  set logoSvg(value: string | null) { this._setRaw('logo_svg', value); }
}

export class League extends Model {
  static table = 'leagues';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get description() { return this._getRaw('description') as string | null; }
  set description(value: string | null) { this._setRaw('description', value); }
}

export class Member extends Model {
  static table = 'members';

  get guid() { return this._getRaw('guid') as string | null; }
  get firstName() { return this._getRaw('first_name') as string; }
  set firstName(value: string) { this._setRaw('first_name', value); }
  get lastName() { return this._getRaw('last_name') as string; }
  set lastName(value: string) { this._setRaw('last_name', value); }
  get displayName() { return this._getRaw('display_name') as string | null; }
  set displayName(value: string | null) { this._setRaw('display_name', value); }
  get gender() { return this._getRaw('gender') as string | null; }
  set gender(value: string | null) { this._setRaw('gender', value); }
  get birthDate() { return this._getRaw('birth_date') as number | null; }
  set birthDate(value: number | null) { this._setRaw('birth_date', value); }
  get dominantSide() { return this._getRaw('dominant_side') as string | null; }
  set dominantSide(value: string | null) { this._setRaw('dominant_side', value); }
  get share() { return this._getRaw('share') as number | null; }
  set share(value: number | null) { this._setRaw('share', value); }
  get shareType() { return this._getRaw('share_type') as string | null; }
  set shareType(value: string | null) { this._setRaw('share_type', value); }

  // Computed property for full name
  get fullName() {
    const display = this.displayName;
    if (display) return display;
    return `${this.firstName} ${this.lastName}`.trim();
  }
}

export class Role extends Model {
  static table = 'roles';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get description() { return this._getRaw('description') as string | null; }
  set description(value: string | null) { this._setRaw('description', value); }
}

export class Position extends Model {
  static table = 'positions';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get sportId() { return this._getRaw('sport_id') as string | null; }
  set sportId(value: string | null) { this._setRaw('sport_id', value); }
  get description() { return this._getRaw('description') as string | null; }
  set description(value: string | null) { this._setRaw('description', value); }
}

export class Color extends Model {
  static table = 'colors';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get hexCode() { return this._getRaw('hex_code') as string; }
  set hexCode(value: string) { this._setRaw('hex_code', value); }
}

export class Skill extends Model {
  static table = 'skills';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get sortOrder() { return this._getRaw('sort_order') as number | null; }
  set sortOrder(value: number | null) { this._setRaw('sort_order', value); }
}

export class Venue extends Model {
  static table = 'venues';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get address() { return this._getRaw('address') as string | null; }
  set address(value: string | null) { this._setRaw('address', value); }
  get latitude() { return this._getRaw('latitude') as number | null; }
  set latitude(value: number | null) { this._setRaw('latitude', value); }
  get longitude() { return this._getRaw('longitude') as number | null; }
  set longitude(value: number | null) { this._setRaw('longitude', value); }
  get geocodedData() { return this._getRaw('geocoded_data') as string | null; }
  set geocodedData(value: string | null) { this._setRaw('geocoded_data', value); }
  // Alias for compatibility with local-database-service
  get googleMapsData() { return this.geocodedData; }
  set googleMapsData(value: string | null) { this.geocodedData = value; }
  get details() { return this._getRaw('details') as string | null; }
  set details(value: string | null) { this._setRaw('details', value); }

  // Parse JSON fields
  get geocodedDataParsed() {
    const data = this.geocodedData;
    return data ? JSON.parse(data) : null;
  }
  get detailsParsed() {
    const data = this.details;
    return data ? JSON.parse(data) : null;
  }
}


export class Court extends Model {
  static table = 'courts';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get surface() { return this._getRaw('surface') as string | null; }
  set surface(value: string | null) { this._setRaw('surface', value); }
}

export class Field extends Model {
  static table = 'fields';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get surface() { return this._getRaw('surface') as string | null; }
  set surface(value: string | null) { this._setRaw('surface', value); }
}

export class Event extends Model {
  static table = 'events';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get startDate() { return this._getRaw('start_date') as number; }
  set startDate(value: number) { this._setRaw('start_date', value); }
  get endDate() { return this._getRaw('end_date') as number | null; }
  set endDate(value: number | null) { this._setRaw('end_date', value); }
  get description() { return this._getRaw('description') as string | null; }
  set description(value: string | null) { this._setRaw('description', value); }
  get status() { return this._getRaw('status') as string | null; }
  set status(value: string | null) { this._setRaw('status', value); }
  get isSeriesEvent() { return this._getRaw('is_series_event') as number | null; }
  set isSeriesEvent(value: number | null) { this._setRaw('is_series_event', value); }
  get seriesId() { return this._getRaw('series_id') as string | null; }
  set seriesId(value: string | null) { this._setRaw('series_id', value); }
  get repeatPeriod() { return this._getRaw('repeat_period') as string | null; }
  set repeatPeriod(value: string | null) { this._setRaw('repeat_period', value); }
  get repeatInterval() { return this._getRaw('repeat_interval') as number | null; }
  set repeatInterval(value: number | null) { this._setRaw('repeat_interval', value); }
  get totalEvents() { return this._getRaw('total_events') as number | null; }
  set totalEvents(value: number | null) { this._setRaw('total_events', value); }
  get lastEventDate() { return this._getRaw('last_event_date') as number | null; }
  set lastEventDate(value: number | null) { this._setRaw('last_event_date', value); }
  get lastEventTime() { return this._getRaw('last_event_time') as string | null; }
  set lastEventTime(value: string | null) { this._setRaw('last_event_time', value); }
}

export class UserPreference extends Model {
  static table = 'user_preferences';

  get guid() { return this._getRaw('guid') as string | null; }
  get userId() { return this._getRaw('user_id') as string | null; }
  set userId(value: string | null) { this._setRaw('user_id', value); }
  get previewFirstCount() { return this._getRaw('preview_first_count') as number | null; }
  set previewFirstCount(value: number | null) { this._setRaw('preview_first_count', value); }
  get previewLastCount() { return this._getRaw('preview_last_count') as number | null; }
  set previewLastCount(value: number | null) { this._setRaw('preview_last_count', value); }
}

export class EventType extends Model {
  static table = 'event_types';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get description() { return this._getRaw('description') as string | null; }
  set description(value: string | null) { this._setRaw('description', value); }
}

export class Season extends Model {
  static table = 'seasons';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get startDate() { return this._getRaw('start_date') as number | null; }
  set startDate(value: number | null) { this._setRaw('start_date', value); }
  get endDate() { return this._getRaw('end_date') as number | null; }
  set endDate(value: number | null) { this._setRaw('end_date', value); }
}

export class Contact extends Model {
  static table = 'contacts';

  get guid() { return this._getRaw('guid') as string | null; }
  get value() { return this._getRaw('value') as string; }
  set value(value: string) { this._setRaw('value', value); }
  get type() { return this._getRaw('type') as string; }
  set type(value: string) { this._setRaw('type', value); }
  get label() { return this._getRaw('label') as string | null; }
  set label(value: string | null) { this._setRaw('label', value); }
}

export class ContactLabel extends Model {
  static table = 'contact_labels';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get sortOrder() { return this._getRaw('sort_order') as number | null; }
  set sortOrder(value: number | null) { this._setRaw('sort_order', value); }
  get description() { return this._getRaw('description') as string | null; }
  set description(value: string | null) { this._setRaw('description', value); }
}

export class System extends Model {
  static table = 'systems';

  get guid() { return this._getRaw('guid') as string | null; }
  get name() { return this._getRaw('name') as string; }
  set name(value: string) { this._setRaw('name', value); }
  get description() { return this._getRaw('description') as string | null; }
  set description(value: string | null) { this._setRaw('description', value); }
  get config() { return this._getRaw('config') as string | null; }
  set config(value: string | null) { this._setRaw('config', value); }

  get configParsed() {
    const data = this.config;
    return data ? JSON.parse(data) : null;
  }
}

// ============================================================================
// CROSS-REFERENCE MODELS
// ============================================================================

export class SportLeagueXref extends Model {
  static table = 'sport_league_xref';
  get sportId() { return this._getRaw('sport_id') as string; }
  set sportId(value: string) { this._setRaw('sport_id', value); }
  get leagueId() { return this._getRaw('league_id') as string; }
  set leagueId(value: string) { this._setRaw('league_id', value); }
}

export class SkillSportXref extends Model {
  static table = 'skill_sport_xref';
  get skillId() { return this._getRaw('skill_id') as string; }
  set skillId(value: string) { this._setRaw('skill_id', value); }
  get sportId() { return this._getRaw('sport_id') as string; }
  set sportId(value: string) { this._setRaw('sport_id', value); }
}

export class TeamLeagueXref extends Model {
  static table = 'team_league_xref';
  get teamId() { return this._getRaw('team_id') as string; }
  set teamId(value: string) { this._setRaw('team_id', value); }
  get leagueId() { return this._getRaw('league_id') as string; }
  set leagueId(value: string) { this._setRaw('league_id', value); }
}

export class TeamSportXref extends Model {
  static table = 'team_sport_xref';
  get teamId() { return this._getRaw('team_id') as string; }
  set teamId(value: string) { this._setRaw('team_id', value); }
  get sportId() { return this._getRaw('sport_id') as string; }
  set sportId(value: string) { this._setRaw('sport_id', value); }
}

export class TeamColorXref extends Model {
  static table = 'team_color_xref';
  get teamId() { return this._getRaw('team_id') as string; }
  set teamId(value: string) { this._setRaw('team_id', value); }
  get colorId() { return this._getRaw('color_id') as string; }
  set colorId(value: string) { this._setRaw('color_id', value); }
}

export class TeamMemberXref extends Model {
  static table = 'team_member_xref';
  get teamId() { return this._getRaw('team_id') as string; }
  set teamId(value: string) { this._setRaw('team_id', value); }
  get memberId() { return this._getRaw('member_id') as string; }
  set memberId(value: string) { this._setRaw('member_id', value); }
  get skillId() { return this._getRaw('skill_id') as string | null; }
  set skillId(value: string | null) { this._setRaw('skill_id', value); }
}

export class MemberRoleXref extends Model {
  static table = 'member_role_xref';
  get memberId() { return this._getRaw('member_id') as string; }
  set memberId(value: string) { this._setRaw('member_id', value); }
  get roleId() { return this._getRaw('role_id') as string; }
  set roleId(value: string) { this._setRaw('role_id', value); }
  get contextTable() { return this._getRaw('context_table') as string | null; }
  set contextTable(value: string | null) { this._setRaw('context_table', value); }
  get contextId() { return this._getRaw('context_id') as string | null; }
  set contextId(value: string | null) { this._setRaw('context_id', value); }
}

export class MemberPositionXref extends Model {
  static table = 'member_position_xref';
  get memberId() { return this._getRaw('member_id') as string; }
  set memberId(value: string) { this._setRaw('member_id', value); }
  get positionId() { return this._getRaw('position_id') as string; }
  set positionId(value: string) { this._setRaw('position_id', value); }
  get contextTable() { return this._getRaw('context_table') as string | null; }
  set contextTable(value: string | null) { this._setRaw('context_table', value); }
  get contextId() { return this._getRaw('context_id') as string | null; }
  set contextId(value: string | null) { this._setRaw('context_id', value); }
}

export class MemberContactXref extends Model {
  static table = 'member_contact_xref';
  get memberId() { return this._getRaw('member_id') as string; }
  set memberId(value: string) { this._setRaw('member_id', value); }
  get contactId() { return this._getRaw('contact_id') as string; }
  set contactId(value: string) { this._setRaw('contact_id', value); }
  get isPrimary() { return this._getRaw('is_primary') as number | null; }
  set isPrimary(value: number | null) { this._setRaw('is_primary', value); }
}

export class EventTeamXref extends Model {
  static table = 'event_team_xref';
  get guid() { return this._getRaw('guid') as string | null; }
  get eventId() { return this._getRaw('event_id') as string; }
  set eventId(value: string) { this._setRaw('event_id', value); }
  get teamId() { return this._getRaw('team_id') as string; }
  set teamId(value: string) { this._setRaw('team_id', value); }
  get outcome() { return this._getRaw('outcome') as string | null; }
  set outcome(value: string | null) { this._setRaw('outcome', value); }
  get score() { return this._getRaw('score') as string | null; }
  set score(value: string | null) { this._setRaw('score', value); }
}

export class EventMemberXref extends Model {
  static table = 'event_member_xref';
  get guid() { return this._getRaw('guid') as string | null; }
  get eventId() { return this._getRaw('event_id') as string; }
  set eventId(value: string) { this._setRaw('event_id', value); }
  get memberId() { return this._getRaw('member_id') as string; }
  set memberId(value: string) { this._setRaw('member_id', value); }
}

export class EventVenueXref extends Model {
  static table = 'event_venue_xref';
  get eventId() { return this._getRaw('event_id') as string; }
  set eventId(value: string) { this._setRaw('event_id', value); }
  get venueId() { return this._getRaw('venue_id') as string; }
  set venueId(value: string) { this._setRaw('venue_id', value); }
  get usageNotes() { return this._getRaw('usage_notes') as string | null; }
  set usageNotes(value: string | null) { this._setRaw('usage_notes', value); }
}

export class EventEventTypeXref extends Model {
  static table = 'event_event_type_xref';
  get eventId() { return this._getRaw('event_id') as string; }
  set eventId(value: string) { this._setRaw('event_id', value); }
  get eventTypeId() { return this._getRaw('event_type_id') as string; }
  set eventTypeId(value: string) { this._setRaw('event_type_id', value); }
}

export class EventSystemXref extends Model {
  static table = 'event_system_xref';
  get eventId() { return this._getRaw('event_id') as string; }
  set eventId(value: string) { this._setRaw('event_id', value); }
  get systemId() { return this._getRaw('system_id') as string; }
  set systemId(value: string) { this._setRaw('system_id', value); }
}

export class EventCourtXref extends Model {
  static table = 'event_court_xref';
  get eventId() { return this._getRaw('event_id') as string; }
  set eventId(value: string) { this._setRaw('event_id', value); }
  get courtId() { return this._getRaw('court_id') as string; }
  set courtId(value: string) { this._setRaw('court_id', value); }
}

export class EventFieldXref extends Model {
  static table = 'event_field_xref';
  get eventId() { return this._getRaw('event_id') as string; }
  set eventId(value: string) { this._setRaw('event_id', value); }
  get fieldId() { return this._getRaw('field_id') as string; }
  set fieldId(value: string) { this._setRaw('field_id', value); }
}

export class EventSeasonXref extends Model {
  static table = 'event_season_xref';
  get eventId() { return this._getRaw('event_id') as string; }
  set eventId(value: string) { this._setRaw('event_id', value); }
  get seasonId() { return this._getRaw('season_id') as string; }
  set seasonId(value: string) { this._setRaw('season_id', value); }
  get isTournament() { return this._getRaw('is_tournament') as number | null; }
  set isTournament(value: number | null) { this._setRaw('is_tournament', value); }
}

export class VenueCourtXref extends Model {
  static table = 'venue_court_xref';
  get venueId() { return this._getRaw('venue_id') as string; }
  set venueId(value: string) { this._setRaw('venue_id', value); }
  get courtId() { return this._getRaw('court_id') as string; }
  set courtId(value: string) { this._setRaw('court_id', value); }
}

export class VenueFieldXref extends Model {
  static table = 'venue_field_xref';
  get venueId() { return this._getRaw('venue_id') as string; }
  set venueId(value: string) { this._setRaw('venue_id', value); }
  get fieldId() { return this._getRaw('field_id') as string; }
  set fieldId(value: string) { this._setRaw('field_id', value); }
}

export class TeamContactXref extends Model {
  static table = 'team_contact_xref';
  get teamId() { return this._getRaw('team_id') as string; }
  set teamId(value: string) { this._setRaw('team_id', value); }
  get contactId() { return this._getRaw('contact_id') as string; }
  set contactId(value: string) { this._setRaw('contact_id', value); }
}

export class SportSeasonXref extends Model {
  static table = 'sport_season_xref';
  get sportId() { return this._getRaw('sport_id') as string; }
  set sportId(value: string) { this._setRaw('sport_id', value); }
  get seasonId() { return this._getRaw('season_id') as string; }
  set seasonId(value: string) { this._setRaw('season_id', value); }
}

export class TeamSeasonXref extends Model {
  static table = 'team_season_xref';
  get teamId() { return this._getRaw('team_id') as string; }
  set teamId(value: string) { this._setRaw('team_id', value); }
  get seasonId() { return this._getRaw('season_id') as string; }
  set seasonId(value: string) { this._setRaw('season_id', value); }
}

// ============================================================================
// MODEL CLASSES ARRAY (for database initialization)
// ============================================================================

export const modelClasses = [
  // Core models
  User,
  Sport,
  Team,
  League,
  Member,
  Role,
  Position,
  Color,
  Skill,
  Venue,
  Court,
  Field,
  Event,
  UserPreference,
  EventType,
  Season,
  Contact,
  ContactLabel,
  System,
  // Xref models
  SportLeagueXref,
  SkillSportXref,
  TeamLeagueXref,
  TeamSportXref,
  TeamColorXref,
  TeamMemberXref,
  MemberRoleXref,
  MemberPositionXref,
  MemberContactXref,
  EventTeamXref,
  EventMemberXref,
  EventVenueXref,
  EventEventTypeXref,
  EventSystemXref,
  EventCourtXref,
  EventFieldXref,
  EventSeasonXref,
  VenueCourtXref,
  VenueFieldXref,
  TeamContactXref,
  SportSeasonXref,
  TeamSeasonXref,
];