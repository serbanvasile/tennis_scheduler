/**
 * Local Database Service
 * 
 * Replaces HTTP-based sqlite-service.ts with direct WatermelonDB operations.
 * Same interface for drop-in replacement in UI components.
 */

import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import {
    Team as TeamModel,
    Member as MemberModel,
    Venue as VenueModel,
    Event as EventModel,
    Court as CourtModel,
    Field as FieldModel,
    Sport as SportModel,
    Color as ColorModel,
    Skill as SkillModel,
    Role as RoleModel,
    EventType as EventTypeModel,
    System as SystemModel,
    Season as SeasonModel,
    Contact as ContactModel,
    UserPreference as UserPreferenceModel,
    ContactLabel as ContactLabelModel,
    TeamMemberXref,
    TeamColorXref,
    TeamSportXref,
    MemberContactXref,
    VenueCourtXref,
    VenueFieldXref,
    EventTeamXref,
    EventMemberXref,
    EventVenueXref,
    EventCourtXref,
    EventFieldXref,
    EventEventTypeXref,
    EventSystemXref,
    EventSeasonXref,
    SkillSportXref,
    MemberRoleXref,
    MemberPositionXref,
    // New v2 models
    AgeGroup as AgeGroupModel,
    Gender as GenderModel,
    Level as LevelModel,
    MatchType as MatchTypeModel,
    Membership as MembershipModel,
    PaidStatus as PaidStatusModel,
    EventAgeGroupXref,
    EventGenderXref,
    EventLevelXref,
    EventMatchTypeXref,
    MemberAgeGroupXref,
    MemberGenderXref,
    MemberMembershipXref,
    MemberPaidStatusXref,
} from './models';
import type { Member, Team, Venue, TennisEvent, Player, Color, Sport, Skill, Role, Position, System } from '../types';

// Helper to generate GUID
const generateGuid = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

class LocalDatabaseService {
    private isInitialized = false;

    async init(): Promise<void> {
        if (this.isInitialized) return;
        console.log('📱 Local database service initialized (WatermelonDB)');
        this.isInitialized = true;
    }

    // ============================================================================
    // LOOKUPS (aggregates reference data)
    // ============================================================================

    async getLookups(): Promise<any> {
        try {
            const [sports, roles, skillModels, eventTypes, systems, positions, skillSportXrefs, contactLabels,
                ageGroups, genders, levels, matchTypes, memberships, paidStatuses] = await Promise.all([
                    database.get<SportModel>('sports').query().fetch(),
                    database.get<RoleModel>('roles').query().fetch(),
                    database.get<SkillModel>('skills').query().fetch(),
                    database.get<EventTypeModel>('event_types').query().fetch(),
                    database.get<SystemModel>('systems').query().fetch(),
                    database.get<any>('positions').query().fetch(),
                    database.get<SkillSportXref>('skill_sport_xref').query().fetch(),
                    database.get<ContactLabelModel>('contact_labels').query().fetch(),
                    // New v2 lookups
                    database.get<AgeGroupModel>('age_groups').query().fetch(),
                    database.get<GenderModel>('genders').query().fetch(),
                    database.get<LevelModel>('levels').query().fetch(),
                    database.get<MatchTypeModel>('match_types').query().fetch(),
                    database.get<MembershipModel>('memberships').query().fetch(),
                    database.get<PaidStatusModel>('paid_statuses').query().fetch(),
                ]);

            console.log('[getLookups] Found', skillModels.length, 'skills,', skillSportXrefs.length, 'skill-sport links');

            // Build skills array with sport_id from xref
            // A skill can be linked to multiple sports, so create one entry per link
            // Use composite key (skill.id + sport_id) to ensure uniqueness for React rendering
            const skills: any[] = [];
            for (const xref of skillSportXrefs) {
                const skill = skillModels.find(s => s.id === xref.skillId);
                if (skill) {
                    skills.push({
                        skill_id: `${skill.id}_${xref.sportId}`, // Composite key for uniqueness
                        base_skill_id: skill.id, // Keep original for lookups
                        name: skill.name,
                        sort_order: skill.sortOrder,
                        sport_id: xref.sportId,
                    });
                }
            }
            console.log('[getLookups] Mapped', skills.length, 'skill-sport entries');
            // Debug: Check for duplicate IDs in ALL lookup types
            const checkDuplicates = (arr: any[], idField: string, name: string) => {
                const ids = arr.map(item => item[idField]);
                const uniqueIds = new Set(ids);
                if (uniqueIds.size !== ids.length) {
                    const dups = ids.filter((id, idx) => ids.indexOf(id) !== idx);
                    console.error(`[getLookups] DUPLICATE ${idField} in ${name}!`, dups);
                }
                // Also check for undefined/null IDs
                const badIds = ids.filter(id => id === undefined || id === null || id === '');
                if (badIds.length > 0) {
                    console.error(`[getLookups] UNDEFINED/NULL ${idField} in ${name}!`, badIds.length, 'items');
                }
            };

            const sportsData = sports.map((s: any) => ({ sport_id: s.id, name: s.name, description: s.description }));
            const rolesData = roles.map((r: any) => ({ role_id: r.id, name: r.name, description: r.description }));
            const eventTypesData = eventTypes.map((e: any) => ({ eventType_id: e.id, name: e.name, description: e.description }));
            const systemsData = systems.map((s: any) => ({ system_id: s.id, name: s.name, description: s.description }));
            const positionsData = positions.map((p: any) => ({ position_id: p.id, name: p.name, sport_id: p.sportId }));
            const contactLabelsData = contactLabels.map((l: any) => ({ label_id: l.id, name: l.name, sort_order: l.sortOrder }));

            // New v2 lookup data
            const ageGroupsData = ageGroups.map((a: any) => ({ age_group_id: a.id, name: a.name, sort_order: a.sortOrder }));
            const gendersData = genders.map((g: any) => ({ gender_id: g.id, name: g.name, sort_order: g.sortOrder }));
            const levelsData = levels.map((l: any) => ({ level_id: l.id, name: l.name, sort_order: l.sortOrder }));
            const matchTypesData = matchTypes.map((m: any) => ({ match_type_id: m.id, name: m.name, sport_id: m.sportId, sort_order: m.sortOrder }));
            const membershipsData = memberships.map((m: any) => ({ membership_id: m.id, name: m.name, sort_order: m.sortOrder }));
            const paidStatusesData = paidStatuses.map((p: any) => ({ paid_status_id: p.id, name: p.name, sort_order: p.sortOrder }));

            checkDuplicates(sportsData, 'sport_id', 'sports');
            checkDuplicates(rolesData, 'role_id', 'roles');
            checkDuplicates(skills, 'skill_id', 'skills');
            checkDuplicates(eventTypesData, 'eventType_id', 'eventTypes');
            checkDuplicates(systemsData, 'system_id', 'systems');
            checkDuplicates(positionsData, 'position_id', 'positions');
            checkDuplicates(contactLabelsData, 'label_id', 'contact_labels');

            console.log('[getLookups] Returning:', {
                sports: sportsData.length,
                roles: rolesData.length,
                skills: skills.length,
                eventTypes: eventTypesData.length,
                systems: systemsData.length,
                positions: positionsData.length,
                contact_labels: contactLabelsData.length,
                age_groups: ageGroupsData.length,
                genders: gendersData.length,
                levels: levelsData.length,
                match_types: matchTypesData.length,
                memberships: membershipsData.length,
                paid_statuses: paidStatusesData.length,
            });

            return {
                sports: sportsData,
                roles: rolesData,
                skills,
                eventTypes: eventTypesData,
                systems: systemsData,
                positions: positionsData,
                contact_labels: contactLabelsData,
                // New v2 lookups
                age_groups: ageGroupsData,
                genders: gendersData,
                levels: levelsData,
                match_types: matchTypesData,
                memberships: membershipsData,
                paid_statuses: paidStatusesData,
            };
        } catch (err) {
            console.error('getLookups failed', err);
            return {};
        }
    }


    // ============================================================================
    // PREFERENCES
    // ============================================================================

    async getPreferences(): Promise<any> {
        try {
            const prefs = await database.get<UserPreferenceModel>('user_preferences').query().fetch();
            if (prefs.length > 0) {
                return {
                    preview_first_count: prefs[0].previewFirstCount || 4,
                    preview_last_count: prefs[0].previewLastCount || 4,
                };
            }
            return { preview_first_count: 4, preview_last_count: 4 };
        } catch (err) {
            console.error('getPreferences failed', err);
            return { preview_first_count: 4, preview_last_count: 4 };
        }
    }

    async updatePreferences(previewFirst: number, previewLast: number): Promise<any> {
        try {
            await database.write(async () => {
                const prefs = await database.get<UserPreferenceModel>('user_preferences').query().fetch();
                if (prefs.length > 0) {
                    await prefs[0].update(p => {
                        p.previewFirstCount = previewFirst;
                        p.previewLastCount = previewLast;
                    });
                } else {
                    await database.get<UserPreferenceModel>('user_preferences').create(p => {
                        (p as any)._setRaw('guid', generateGuid());
                        p.previewFirstCount = previewFirst;
                        p.previewLastCount = previewLast;
                    });
                }
            });
            return { success: true };
        } catch (err) {
            console.error('updatePreferences failed', err);
            return { error: err };
        }
    }

    // ============================================================================
    // TEAMS
    // ============================================================================

    async getTeams(): Promise<Team[]> {
        try {
            const teams = await database.get<TeamModel>('teams').query(
                Q.where('deleted_flag', Q.notEq(1))
            ).fetch();
            console.log('[getTeams] Found', teams.length, 'teams');

            // Enrich with sport and colors
            const enrichedTeams = await Promise.all(teams.map(async (team) => {
                // Get sport via xref
                const sportXrefs = await database.get<TeamSportXref>('team_sport_xref').query(
                    Q.where('team_id', team.id)
                ).fetch();

                let sportName = '';
                let sportId: string | undefined;
                if (sportXrefs.length > 0) {
                    try {
                        console.log('[getTeams] Team', team.name, 'has sport xref with sportId:', sportXrefs[0].sportId);
                        const sport = await database.get<SportModel>('sports').find(sportXrefs[0].sportId);
                        sportName = sport.name;
                        sportId = sport.id;
                        console.log('[getTeams] Found sport:', sportName);
                    } catch (e) {
                        console.error('[getTeams] Failed to find sport:', sportXrefs[0].sportId, e);
                    }
                } else {
                    console.log('[getTeams] Team', team.name, 'has no sport xref');
                }

                // Get colors via xref
                const colorXrefs = await database.get<TeamColorXref>('team_color_xref').query(
                    Q.where('team_id', team.id)
                ).fetch();

                const colors: Color[] = [];
                for (const xref of colorXrefs) {
                    try {
                        const color = await database.get<ColorModel>('colors').find(xref.colorId);
                        colors.push({
                            color_id: color.id,
                            guid: color.guid || '',
                            name: color.name,
                            hex_code: color.hexCode,
                        });
                    } catch { }
                }

                return {
                    team_id: team.id,
                    guid: team.guid || '',
                    name: team.name,
                    sport_id: sportId,
                    sport_name: sportName,
                    team_colors: team.teamColors,
                    logo_url: team.logoUrl,
                    colors,
                } as Team;
            }));

            return enrichedTeams;
        } catch (err) {
            console.error('getTeams failed', err);
            return [];
        }
    }

    async getColors(): Promise<Color[]> {
        try {
            const colors = await database.get<ColorModel>('colors').query().fetch();
            console.log('[getColors] Found', colors.length, 'colors');
            return colors.map(c => ({
                color_id: c.id,
                guid: c.guid || '',
                name: c.name,
                hex_code: c.hexCode,
            }));
        } catch (err) {
            console.error('getColors failed', err);
            return [];
        }
    }

    async createTeam(name: string, sportId?: number | string, teamColors?: string, colorIds?: (number | string)[], logoUrl?: string): Promise<any> {
        try {
            let teamId = '';
            await database.write(async () => {
                const team = await database.get<TeamModel>('teams').create(t => {
                    (t as any)._setRaw('guid', generateGuid());
                    t.name = name;
                    t.teamColors = teamColors || null;
                    t.logoUrl = logoUrl || null;
                    (t as any)._setRaw('create_date', Date.now());
                });
                teamId = team.id;

                // Link sport
                if (sportId) {
                    await database.get<TeamSportXref>('team_sport_xref').create(x => {
                        x.teamId = teamId;
                        x.sportId = sportId.toString();
                    });
                }

                // Link colors
                if (colorIds && colorIds.length > 0) {
                    for (const colorId of colorIds) {
                        await database.get<TeamColorXref>('team_color_xref').create(x => {
                            x.teamId = teamId;
                            x.colorId = colorId.toString();
                        });
                    }
                }
            });

            return { success: true, team_id: teamId };
        } catch (err) {
            console.error('createTeam failed', err);
            return { error: err };
        }
    }

    async updateTeam(teamId: number | string, name: string, sportId?: number | string, teamColors?: string, colorIds?: (number | string)[], logoUrl?: string): Promise<any> {
        try {
            await database.write(async () => {
                const team = await database.get<TeamModel>('teams').find(teamId.toString());
                await team.update(t => {
                    t.name = name;
                    t.teamColors = teamColors || null;
                    t.logoUrl = logoUrl || null;
                    (t as any)._setRaw('update_date', Date.now());
                });

                // Update sport xref - remove old, add new
                const oldSportXrefs = await database.get<TeamSportXref>('team_sport_xref').query(
                    Q.where('team_id', teamId.toString())
                ).fetch();
                for (const xref of oldSportXrefs) {
                    await xref.destroyPermanently();
                }
                if (sportId) {
                    await database.get<TeamSportXref>('team_sport_xref').create(x => {
                        x.teamId = teamId.toString();
                        x.sportId = sportId.toString();
                    });
                }

                // Update color xrefs
                const oldColorXrefs = await database.get<TeamColorXref>('team_color_xref').query(
                    Q.where('team_id', teamId.toString())
                ).fetch();
                for (const xref of oldColorXrefs) {
                    await xref.destroyPermanently();
                }
                if (colorIds && colorIds.length > 0) {
                    for (const colorId of colorIds) {
                        await database.get<TeamColorXref>('team_color_xref').create(x => {
                            x.teamId = teamId.toString();
                            x.colorId = colorId.toString();
                        });
                    }
                }
            });

            return { success: true };
        } catch (err) {
            console.error('updateTeam failed', err);
            return { error: err };
        }
    }

    async deleteTeam(teamId: number | string): Promise<any> {
        try {
            await database.write(async () => {
                const team = await database.get<TeamModel>('teams').find(teamId.toString());
                await team.update(t => {
                    (t as any)._setRaw('deleted_flag', 1);
                });
            });
            return { success: true };
        } catch (err) {
            console.error('deleteTeam failed', err);
            return { error: err };
        }
    }

    async deleteAllTeams(): Promise<any> {
        try {
            await database.write(async () => {
                const teams = await database.get<TeamModel>('teams').query().fetch();
                for (const team of teams) {
                    await team.update(t => {
                        (t as any)._setRaw('deleted_flag', 1);
                    });
                }
            });
            return { success: true };
        } catch (err) {
            console.error('deleteAllTeams failed', err);
            return { error: err };
        }
    }

    async deleteTeamsBatch(teamIds: (number | string)[]): Promise<any> {
        try {
            await database.write(async () => {
                for (const teamId of teamIds) {
                    const team = await database.get<TeamModel>('teams').find(teamId.toString());
                    await team.update(t => {
                        (t as any)._setRaw('deleted_flag', 1);
                    });
                }
            });
            return { success: true, deleted: teamIds.length };
        } catch (err) {
            console.error('deleteTeamsBatch failed', err);
            throw err;
        }
    }

    // ============================================================================
    // MEMBERS
    // ============================================================================

    async getPlayers(): Promise<Player[]> {
        return this.getMembers();
    }

    async getMembers(): Promise<Member[]> {
        try {
            const members = await database.get<MemberModel>('members').query(
                Q.where('deleted_flag', Q.notEq(1))
            ).fetch();

            const enrichedMembers = await Promise.all(members.map(async (member) => {
                // Get teams via xref
                const teamXrefs = await database.get<TeamMemberXref>('team_member_xref').query(
                    Q.where('member_id', member.id)
                ).fetch();

                const teams: any[] = [];
                for (const xref of teamXrefs) {
                    try {
                        const team = await database.get<TeamModel>('teams').find(xref.teamId);

                        // Get sport via team_sport_xref
                        let sportName = '';
                        const sportXrefs = await database.get<TeamSportXref>('team_sport_xref').query(
                            Q.where('team_id', team.id)
                        ).fetch();
                        if (sportXrefs.length > 0) {
                            try {
                                const sport = await database.get<SportModel>('sports').find(sportXrefs[0].sportId);
                                sportName = sport?.name || '';
                            } catch { }
                        }

                        // Get roles via member_role_xref (for this team context)
                        const roleXrefs = await database.get<any>('member_role_xref').query(
                            Q.and(
                                Q.where('member_id', member.id),
                                Q.where('context_table', 'teams'),
                                Q.where('context_id', team.id)
                            )
                        ).fetch();
                        const roleNames: string[] = [];
                        for (const rx of roleXrefs) {
                            try {
                                const role = await database.get<RoleModel>('roles').find(rx.roleId);
                                if (role) roleNames.push(role.name);
                            } catch { }
                        }

                        // Get positions via member_position_xref (for this team context)
                        const posXrefs = await database.get<any>('member_position_xref').query(
                            Q.and(
                                Q.where('member_id', member.id),
                                Q.where('context_table', 'teams'),
                                Q.where('context_id', team.id)
                            )
                        ).fetch();
                        const positionNames: string[] = [];
                        const positions: { id: string; name: string }[] = [];
                        for (const px of posXrefs) {
                            try {
                                const pos = await database.get<any>('positions').find(px.positionId);
                                if (pos) {
                                    positionNames.push(pos.name);
                                    positions.push({ id: pos.id, name: pos.name });
                                }
                            } catch { }
                        }

                        teams.push({
                            team_id: team.id,
                            team_name: team.name,
                            sport_name: sportName,
                            skill_id: xref.skillId,
                            level_id: xref.levelId, // Include level_id for filtering
                            // Contract fields (per-team)
                            share_type: xref.shareType,
                            share: xref.share,
                            membership_id: xref.membershipId,
                            paid_status_id: xref.paidStatusId,
                            paid_amount: xref.paidAmount,
                            role_names: roleNames.join(','),
                            position_names: positionNames.join(','),
                            positions, // Include structured positions for Match Type filtering
                        });
                    } catch { }
                }

                // Get contacts via xref
                const contactXrefs = await database.get<MemberContactXref>('member_contact_xref').query(
                    Q.where('member_id', member.id)
                ).fetch();

                let phone = '';
                let email = '';
                const contacts: any[] = [];
                for (const xref of contactXrefs) {
                    try {
                        const contact = await database.get<ContactModel>('contacts').find(xref.contactId);
                        if (contact.type === 'Phone') phone = contact.value;
                        if (contact.type === 'Email') email = contact.value;
                        contacts.push({
                            contact_id: contact.id,
                            value: contact.value,
                            type: contact.type,
                            label: contact.label,
                            is_primary: xref.isPrimary,
                        });
                    } catch { }
                }

                // Get age group xrefs (v2) - multi-select
                const ageGroupXrefs = await database.get<MemberAgeGroupXref>('member_age_group_xref').query(
                    Q.where('member_id', member.id)
                ).fetch();
                const ageGroupIds = ageGroupXrefs.map((x: any) => x.ageGroupId);

                // Get gender xrefs (v2) - multi-select
                const genderXrefs = await database.get<MemberGenderXref>('member_gender_xref').query(
                    Q.where('member_id', member.id)
                ).fetch();
                const genderCategoryIds = genderXrefs.map((x: any) => x.genderId);

                // Get membership xref (v2)
                const membershipXrefs = await database.get<MemberMembershipXref>('member_membership_xref').query(
                    Q.where('member_id', member.id)
                ).fetch();
                const membershipId = membershipXrefs.length > 0 ? membershipXrefs[0].membershipId : undefined;

                // Get paid status xref (v2)
                const paidStatusXrefs = await database.get<MemberPaidStatusXref>('member_paid_status_xref').query(
                    Q.where('member_id', member.id)
                ).fetch();
                const paidStatusId = paidStatusXrefs.length > 0 ? paidStatusXrefs[0].paidStatusId : undefined;

                return {
                    member_id: member.id, // Use string ID - parseInt fails on UUID strings
                    guid: member.guid || '',
                    first_name: member.firstName,
                    last_name: member.lastName,
                    display_name: member.displayName || `${member.firstName} ${member.lastName}`,
                    gender: member.gender,
                    dominant_side: member.dominantSide,
                    share: member.share,
                    share_type: member.shareType,
                    phone,
                    email,
                    teams,
                    contacts,
                    // New v2 fields
                    age_group_ids: ageGroupIds,
                    gender_category_ids: genderCategoryIds,
                    membership_id: membershipId,
                    paid_status_id: paidStatusId,
                    paid_amount: member.paidAmount,
                    country_of_origin: member.countryOfOrigin,
                } as Member;
            }));

            return enrichedMembers;
        } catch (err) {
            console.error('getMembers failed', err);
            return [];
        }
    }

    async getMemberDetails(memberId: number | string): Promise<Member> {
        const member = await database.get<MemberModel>('members').find(memberId.toString());

        // Get contacts
        const contactXrefs = await database.get<MemberContactXref>('member_contact_xref').query(
            Q.where('member_id', member.id)
        ).fetch();

        const contacts: any[] = [];
        let phone = '';
        let email = '';
        for (const xref of contactXrefs) {
            try {
                const contact = await database.get<ContactModel>('contacts').find(xref.contactId);
                contacts.push({
                    contact_id: contact.id,
                    value: contact.value,
                    type: contact.type,
                    label: contact.label,
                    is_primary: xref.isPrimary,
                });
                if (contact.type === 'Phone') phone = contact.value;
                if (contact.type === 'Email') email = contact.value;
            } catch { }
        }

        // Get teams
        const teamXrefs = await database.get<TeamMemberXref>('team_member_xref').query(
            Q.where('member_id', member.id)
        ).fetch();

        const teams: any[] = [];
        for (const xref of teamXrefs) {
            try {
                const team = await database.get<TeamModel>('teams').find(xref.teamId);

                // Get roles for this team
                const roleXrefs = await database.get<MemberRoleXref>('member_role_xref').query(
                    Q.and(
                        Q.where('member_id', member.id),
                        Q.where('context_table', 'teams'),
                        Q.where('context_id', team.id)
                    )
                ).fetch();
                const roles: any[] = [];
                for (const rx of roleXrefs) {
                    try {
                        const role = await database.get<RoleModel>('roles').find(rx.roleId);
                        if (role) roles.push({ role_id: role.id, name: role.name });
                    } catch { }
                }

                // Get positions for this team
                const posXrefs = await database.get<MemberPositionXref>('member_position_xref').query(
                    Q.and(
                        Q.where('member_id', member.id),
                        Q.where('context_table', 'teams'),
                        Q.where('context_id', team.id)
                    )
                ).fetch();
                const positions: any[] = [];
                for (const px of posXrefs) {
                    try {
                        const pos = await database.get<any>('positions').find(px.positionId);
                        if (pos) positions.push({ position_id: pos.id, name: pos.name });
                    } catch { }
                }

                teams.push({
                    team_id: team.id,
                    name: team.name,
                    skill_id: xref.skillId,
                    level_id: xref.levelId,
                    // Contract fields (per-team)
                    share_type: xref.shareType,
                    share: xref.share,
                    membership_id: xref.membershipId,
                    paid_status_id: xref.paidStatusId,
                    paid_amount: xref.paidAmount,
                    roles,
                    positions,
                });
            } catch { }
        }

        // Use first team's skill as the member's default skill
        const firstTeamSkillId = teams.length > 0 ? teams[0].skill_id : null;
        const skill = firstTeamSkillId ? parseFloat(firstTeamSkillId) : undefined;

        // Get age group xrefs (v2) - multi-select
        const ageGroupXrefs = await database.get<MemberAgeGroupXref>('member_age_group_xref').query(
            Q.where('member_id', member.id)
        ).fetch();
        const ageGroupIds = ageGroupXrefs.map((x: any) => x.ageGroupId);

        // Get gender xrefs (v2) - multi-select
        const genderXrefs = await database.get<MemberGenderXref>('member_gender_xref').query(
            Q.where('member_id', member.id)
        ).fetch();
        const genderCategoryIds = genderXrefs.map((x: any) => x.genderId);

        // Get membership xref (v2)
        const membershipXrefs = await database.get<MemberMembershipXref>('member_membership_xref').query(
            Q.where('member_id', member.id)
        ).fetch();
        const membershipId = membershipXrefs.length > 0 ? membershipXrefs[0].membershipId : undefined;

        // Get paid status xref (v2)
        const paidStatusXrefs = await database.get<MemberPaidStatusXref>('member_paid_status_xref').query(
            Q.where('member_id', member.id)
        ).fetch();
        const paidStatusId = paidStatusXrefs.length > 0 ? paidStatusXrefs[0].paidStatusId : undefined;

        console.log('[getMemberDetails] Returning:', {
            member_id: member.id,
            phone,
            email,
            skill,
            contacts: contacts.length,
            teams: teams.length,
            ageGroupIds,
            genderCategoryIds,
            membershipId,
            paidStatusId
        });

        return {
            member_id: member.id, // Use string ID - parseInt fails on UUID strings
            guid: member.guid || '',
            first_name: member.firstName,
            last_name: member.lastName,
            display_name: member.displayName || `${member.firstName} ${member.lastName}`,
            gender: member.gender,
            skill,
            dominant_side: member.dominantSide,
            share: member.share,
            share_type: member.shareType,
            phone,
            email,
            teams,
            contacts,
            // New v2 fields
            age_group_ids: ageGroupIds,
            gender_category_ids: genderCategoryIds,
            membership_id: membershipId,
            paid_status_id: paidStatusId,
            paid_amount: member.paidAmount,
            country_of_origin: member.countryOfOrigin,
            birth_date: member.birthDate,
        } as Member;
    }

    async createMember(data: any, teams?: any[], contacts?: any[]): Promise<any> {
        try {
            let memberId = '';
            await database.write(async () => {
                const member = await database.get<MemberModel>('members').create(m => {
                    (m as any)._setRaw('guid', generateGuid());
                    m.firstName = data.first_name || data.firstName || '';
                    m.lastName = data.last_name || data.lastName || '';
                    m.displayName = data.display_name || data.displayName || null;
                    m.gender = data.gender || null;
                    m.dominantSide = data.dominant_side || 'R';
                    m.share = data.share || 0;
                    m.shareType = data.share_type || 'R';
                    m.shareType = data.share_type || 'R';
                    m.paidAmount = data.paid_amount ?? data.paidAmount ?? null;
                    m.birthDate = data.birth_date ?? data.birthDate ?? null;
                    m.countryOfOrigin = data.country_of_origin ?? data.countryOfOrigin ?? null;
                    (m as any)._setRaw('create_date', Date.now());
                });
                memberId = member.id;

                // Create contacts from contacts array parameter (passed by ImportScreen)
                if (contacts && contacts.length > 0) {
                    for (const contactInfo of contacts) {
                        const contact = await database.get<ContactModel>('contacts').create(c => {
                            (c as any)._setRaw('guid', generateGuid());
                            c.value = contactInfo.value;
                            c.type = contactInfo.type === 'phone' ? 'Phone' : contactInfo.type === 'email' ? 'Email' : contactInfo.type;
                            c.label = contactInfo.label || null;
                        });
                        await database.get<MemberContactXref>('member_contact_xref').create(x => {
                            x.memberId = memberId;
                            x.contactId = contact.id;
                            x.isPrimary = contactInfo.isPrimary ? 1 : 0;
                        });
                    }
                } else {
                    // Fallback: create contacts from data.phone/email (for backward compatibility)
                    if (data.phone) {
                        const contact = await database.get<ContactModel>('contacts').create(c => {
                            (c as any)._setRaw('guid', generateGuid());
                            c.value = data.phone;
                            c.type = 'Phone';
                        });
                        await database.get<MemberContactXref>('member_contact_xref').create(x => {
                            x.memberId = memberId;
                            x.contactId = contact.id;
                            x.isPrimary = 1;
                        });
                    }

                    if (data.email) {
                        const contact = await database.get<ContactModel>('contacts').create(c => {
                            (c as any)._setRaw('guid', generateGuid());
                            c.value = data.email;
                            c.type = 'Email';
                        });
                        await database.get<MemberContactXref>('member_contact_xref').create(x => {
                            x.memberId = memberId;
                            x.contactId = contact.id;
                        });
                    }
                }

                // Link teams
                if (teams && teams.length > 0) {
                    for (const teamInfo of teams) {
                        const teamId = teamInfo.team_id?.toString() || teamInfo.teamId?.toString();

                        await database.get<TeamMemberXref>('team_member_xref').create(x => {
                            x.teamId = teamId;
                            x.memberId = memberId;
                            x.skillId = teamInfo.skill_id?.toString() || teamInfo.skillId?.toString() || null;
                            x.levelId = teamInfo.level_id?.toString() || teamInfo.levelId?.toString() || null;
                            // Contract fields (per-team)
                            x.shareType = teamInfo.share_type || teamInfo.shareType || null;
                            x.share = teamInfo.share ?? null;
                            x.membershipId = teamInfo.membership_id?.toString() || teamInfo.membershipId?.toString() || null;
                            x.paidStatusId = teamInfo.paid_status_id?.toString() || teamInfo.paidStatusId?.toString() || null;
                            x.paidAmount = teamInfo.paid_amount ?? teamInfo.paidAmount ?? null;
                        });

                        // Link roles for this team
                        const roleIds = teamInfo.role_ids || teamInfo.roleIds || [];
                        for (const roleId of roleIds) {
                            await database.get<MemberRoleXref>('member_role_xref').create(x => {
                                x.memberId = memberId;
                                x.roleId = roleId?.toString();
                                x.contextTable = 'teams';
                                x.contextId = teamId;
                            });
                        }

                        // Link positions for this team
                        const positionIds = teamInfo.position_ids || teamInfo.positionIds || [];
                        for (const positionId of positionIds) {
                            await database.get<MemberPositionXref>('member_position_xref').create(x => {
                                x.memberId = memberId;
                                x.positionId = positionId?.toString();
                                x.contextTable = 'teams';
                                x.contextId = teamId;
                            });
                        }
                    }
                }

                // Link age groups (v2) - multi-select
                const ageGroupIds = data.age_group_ids || data.ageGroupIds || [];
                for (const ageGroupId of ageGroupIds) {
                    await database.get<MemberAgeGroupXref>('member_age_group_xref').create(x => {
                        x.memberId = memberId;
                        x.ageGroupId = ageGroupId.toString();
                    });
                }

                // Link gender categories (v2) - multi-select
                const genderCategoryIds = data.gender_category_ids || data.genderCategoryIds || [];
                for (const genderId of genderCategoryIds) {
                    await database.get<MemberGenderXref>('member_gender_xref').create(x => {
                        x.memberId = memberId;
                        x.genderId = genderId.toString();
                    });
                }

                // Link membership (v2)
                if (data.membership_id || data.membershipId) {
                    const membershipId = data.membership_id || data.membershipId;
                    await database.get<MemberMembershipXref>('member_membership_xref').create(x => {
                        x.memberId = memberId;
                        x.membershipId = membershipId.toString();
                    });
                }

                // Link paid status (v2)
                if (data.paid_status_id || data.paidStatusId) {
                    const paidStatusId = data.paid_status_id || data.paidStatusId;
                    await database.get<MemberPaidStatusXref>('member_paid_status_xref').create(x => {
                        x.memberId = memberId;
                        x.paidStatusId = paidStatusId.toString();
                    });
                }
            });

            return { success: true, member_id: memberId };
        } catch (err) {
            console.error('createMember failed', err);
            return { error: err };
        }
    }

    async updateMember(memberId: number | string, data: any, teams: any[], contacts?: any[]): Promise<any> {
        try {
            await database.write(async () => {
                const member = await database.get<MemberModel>('members').find(memberId.toString());
                await member.update(m => {
                    m.firstName = data.first_name || data.firstName || m.firstName;
                    m.lastName = data.last_name || data.lastName || m.lastName;
                    m.displayName = data.display_name || data.displayName || m.displayName;
                    m.gender = data.gender || m.gender;
                    m.dominantSide = data.dominant_side || m.dominantSide;
                    m.share = data.share ?? m.share;
                    m.shareType = data.share_type || m.shareType;
                    m.shareType = data.share_type || m.shareType;
                    m.paidAmount = data.paid_amount ?? data.paidAmount ?? m.paidAmount;
                    m.birthDate = data.birth_date ?? data.birthDate ?? m.birthDate;
                    m.countryOfOrigin = data.country_of_origin ?? data.countryOfOrigin ?? m.countryOfOrigin;
                    (m as any)._setRaw('update_date', Date.now());
                });


                // Update contacts
                // First, delete all existing contact xrefs
                const oldContactXrefs = await database.get<MemberContactXref>('member_contact_xref').query(
                    Q.where('member_id', memberId.toString())
                ).fetch();
                for (const xref of oldContactXrefs) {
                    await xref.destroyPermanently();
                }

                // Create new contacts from contacts array parameter
                if (contacts && contacts.length > 0) {
                    for (const contactInfo of contacts) {
                        const contact = await database.get<ContactModel>('contacts').create(c => {
                            (c as any)._setRaw('guid', generateGuid());
                            c.value = contactInfo.value;
                            c.type = contactInfo.type === 'phone' ? 'Phone' : contactInfo.type === 'email' ? 'Email' : contactInfo.type;
                            c.label = contactInfo.label || null;
                        });
                        await database.get<MemberContactXref>('member_contact_xref').create(x => {
                            x.memberId = memberId.toString();
                            x.contactId = contact.id;
                            x.isPrimary = contactInfo.isPrimary ? 1 : 0;
                        });
                    }
                } else if (data.phone || data.email) {
                    // Fallback: create contacts from data.phone/email (for backward compatibility)
                    if (data.phone) {
                        const contact = await database.get<ContactModel>('contacts').create(c => {
                            (c as any)._setRaw('guid', generateGuid());
                            c.value = data.phone;
                            c.type = 'Phone';
                        });
                        await database.get<MemberContactXref>('member_contact_xref').create(x => {
                            x.memberId = memberId.toString();
                            x.contactId = contact.id;
                            x.isPrimary = 1;
                        });
                    }
                    if (data.email) {
                        const contact = await database.get<ContactModel>('contacts').create(c => {
                            (c as any)._setRaw('guid', generateGuid());
                            c.value = data.email;
                            c.type = 'Email';
                        });
                        await database.get<MemberContactXref>('member_contact_xref').create(x => {
                            x.memberId = memberId.toString();
                            x.contactId = contact.id;
                        });
                    }
                }

                // Update team xrefs (and associated roles/positions)
                // Delete old team xrefs
                const oldTeamXrefs = await database.get<TeamMemberXref>('team_member_xref').query(
                    Q.where('member_id', memberId.toString())
                ).fetch();
                for (const xref of oldTeamXrefs) {
                    await xref.destroyPermanently();
                }

                // Delete old role xrefs for all teams
                const oldRoleXrefs = await database.get<MemberRoleXref>('member_role_xref').query(
                    Q.where('member_id', memberId.toString())
                ).fetch();
                for (const xref of oldRoleXrefs) {
                    await xref.destroyPermanently();
                }

                // Delete old position xrefs for all teams
                const oldPosXrefs = await database.get<MemberPositionXref>('member_position_xref').query(
                    Q.where('member_id', memberId.toString())
                ).fetch();
                for (const xref of oldPosXrefs) {
                    await xref.destroyPermanently();
                }

                // Create new team xrefs with roles and positions
                if (teams && teams.length > 0) {
                    for (const teamInfo of teams) {
                        const teamId = teamInfo.team_id?.toString() || teamInfo.teamId?.toString();

                        // Create team membership
                        await database.get<TeamMemberXref>('team_member_xref').create(x => {
                            x.teamId = teamId;
                            x.memberId = memberId.toString();
                            x.skillId = teamInfo.skill_id?.toString() || teamInfo.skillId?.toString() || null;
                            x.levelId = teamInfo.level_id?.toString() || teamInfo.levelId?.toString() || null;
                            // Contract fields (per-team)
                            x.shareType = teamInfo.share_type || teamInfo.shareType || null;
                            x.share = teamInfo.share ?? null;
                            x.membershipId = teamInfo.membership_id?.toString() || teamInfo.membershipId?.toString() || null;
                            x.paidStatusId = teamInfo.paid_status_id?.toString() || teamInfo.paidStatusId?.toString() || null;
                            x.paidAmount = teamInfo.paid_amount ?? teamInfo.paidAmount ?? null;
                        });

                        // Link roles for this team
                        const roleIds = teamInfo.role_ids || teamInfo.roleIds || [];
                        for (const roleId of roleIds) {
                            await database.get<MemberRoleXref>('member_role_xref').create(x => {
                                x.memberId = memberId.toString();
                                x.roleId = roleId?.toString();
                                x.contextTable = 'teams';
                                x.contextId = teamId;
                            });
                        }

                        // Link positions for this team
                        const positionIds = teamInfo.position_ids || teamInfo.positionIds || [];
                        for (const positionId of positionIds) {
                            await database.get<MemberPositionXref>('member_position_xref').create(x => {
                                x.memberId = memberId.toString();
                                x.positionId = positionId?.toString();
                                x.contextTable = 'teams';
                                x.contextId = teamId;
                            });
                        }
                    }
                }

                // Delete and recreate age group xrefs (v2) - multi-select
                const oldAgeGroupXrefs = await database.get<MemberAgeGroupXref>('member_age_group_xref').query(
                    Q.where('member_id', memberId.toString())
                ).fetch();
                for (const xref of oldAgeGroupXrefs) {
                    await xref.destroyPermanently();
                }
                const ageGroupIds = data.age_group_ids || data.ageGroupIds || [];
                for (const ageGroupId of ageGroupIds) {
                    await database.get<MemberAgeGroupXref>('member_age_group_xref').create(x => {
                        x.memberId = memberId.toString();
                        x.ageGroupId = ageGroupId.toString();
                    });
                }

                // Delete and recreate gender category xrefs (v2) - multi-select
                const oldGenderXrefs = await database.get<MemberGenderXref>('member_gender_xref').query(
                    Q.where('member_id', memberId.toString())
                ).fetch();
                for (const xref of oldGenderXrefs) {
                    await xref.destroyPermanently();
                }
                const genderCategoryIds = data.gender_category_ids || data.genderCategoryIds || [];
                for (const genderId of genderCategoryIds) {
                    await database.get<MemberGenderXref>('member_gender_xref').create(x => {
                        x.memberId = memberId.toString();
                        x.genderId = genderId.toString();
                    });
                }

                // Delete and recreate membership xrefs (v2)
                const oldMembershipXrefs = await database.get<MemberMembershipXref>('member_membership_xref').query(
                    Q.where('member_id', memberId.toString())
                ).fetch();
                for (const xref of oldMembershipXrefs) {
                    await xref.destroyPermanently();
                }
                if (data.membership_id || data.membershipId) {
                    const membershipId = data.membership_id || data.membershipId;
                    await database.get<MemberMembershipXref>('member_membership_xref').create(x => {
                        x.memberId = memberId.toString();
                        x.membershipId = membershipId.toString();
                    });
                }

                // Delete and recreate paid status xrefs (v2)
                const oldPaidStatusXrefs = await database.get<MemberPaidStatusXref>('member_paid_status_xref').query(
                    Q.where('member_id', memberId.toString())
                ).fetch();
                for (const xref of oldPaidStatusXrefs) {
                    await xref.destroyPermanently();
                }
                if (data.paid_status_id || data.paidStatusId) {
                    const paidStatusId = data.paid_status_id || data.paidStatusId;
                    await database.get<MemberPaidStatusXref>('member_paid_status_xref').create(x => {
                        x.memberId = memberId.toString();
                        x.paidStatusId = paidStatusId.toString();
                    });
                }
            });

            return { success: true };
        } catch (err) {
            console.error('updateMember failed', err);
            return { error: err };
        }
    }

    async deleteMember(memberId: number | string): Promise<any> {
        try {
            await database.write(async () => {
                const member = await database.get<MemberModel>('members').find(memberId.toString());
                await member.update(m => {
                    (m as any)._setRaw('deleted_flag', 1);
                });
            });
            return { success: true };
        } catch (err) {
            console.error('deleteMember failed', err);
            return { error: err };
        }
    }

    async deleteAllMembers(): Promise<any> {
        try {
            await database.write(async () => {
                const members = await database.get<MemberModel>('members').query().fetch();
                for (const member of members) {
                    await member.update(m => {
                        (m as any)._setRaw('deleted_flag', 1);
                    });
                }
            });
            return { success: true };
        } catch (err) {
            console.error('deleteAllMembers failed', err);
            return { error: err };
        }
    }

    async deleteMembersBatch(memberIds: (number | string)[]): Promise<any> {
        try {
            await database.write(async () => {
                for (const memberId of memberIds) {
                    const member = await database.get<MemberModel>('members').find(memberId.toString());
                    await member.update(m => {
                        (m as any)._setRaw('deleted_flag', 1);
                    });
                }
            });
            return { success: true, deleted: memberIds.length };
        } catch (err) {
            console.error('deleteMembersBatch failed', err);
            throw err;
        }
    }

    // ============================================================================
    // VENUES
    // ============================================================================

    async getVenues(): Promise<Venue[]> {
        try {
            const venues = await database.get<VenueModel>('venues').query(
                Q.where('deleted_flag', Q.notEq(1))
            ).fetch();

            return venues.map(v => ({
                venue_id: v.id,  // Use string ID directly - UUIDs can't be parsed to int
                guid: v.guid || '',
                name: v.name,
                address: v.address ?? undefined,
                latitude: v.latitude ?? undefined,
                longitude: v.longitude ?? undefined,
                geocoded_data: v.geocodedData ?? undefined,
                details: v.detailsParsed,
            }));
        } catch (err) {
            console.error('getVenues failed', err);
            return [];
        }
    }

    async createVenue(name: string, address?: string, details?: any, latitude?: number, longitude?: number, geocoded_data?: any): Promise<any> {
        try {
            let venueId = '';
            await database.write(async () => {
                const venue = await database.get<VenueModel>('venues').create(v => {
                    (v as any)._setRaw('guid', generateGuid());
                    v.name = name;
                    v.address = address || null;
                    v.latitude = latitude || null;
                    v.longitude = longitude || null;
                    v.geocodedData = geocoded_data ? JSON.stringify(geocoded_data) : null;
                    v.details = details ? JSON.stringify(details) : null;
                    (v as any)._setRaw('create_date', Date.now());
                });
                venueId = venue.id;
            });

            return { success: true, venue_id: venueId };
        } catch (err) {
            console.error('createVenue failed', err);
            return { error: err };
        }
    }

    async updateVenue(venueId: number | string, name: string, address?: string, details?: any, latitude?: number, longitude?: number, geocoded_data?: any): Promise<any> {
        try {
            await database.write(async () => {
                const venue = await database.get<VenueModel>('venues').find(venueId.toString());
                await venue.update(v => {
                    v.name = name;
                    v.address = address || null;
                    v.latitude = latitude ?? v.latitude;
                    v.longitude = longitude ?? v.longitude;
                    if (geocoded_data) v.geocodedData = JSON.stringify(geocoded_data);
                    if (details) v.details = JSON.stringify(details);
                    (v as any)._setRaw('update_date', Date.now());
                });
            });

            return { success: true };
        } catch (err) {
            console.error('updateVenue failed', err);
            return { error: err };
        }
    }

    async deleteVenue(venueId: number | string): Promise<any> {
        try {
            await database.write(async () => {
                const venue = await database.get<VenueModel>('venues').find(venueId.toString());
                await venue.update(v => {
                    (v as any)._setRaw('deleted_flag', 1);
                });
            });
            return { success: true };
        } catch (err) {
            console.error('deleteVenue failed', err);
            return { error: err };
        }
    }

    async deleteAllVenues(): Promise<any> {
        try {
            await database.write(async () => {
                const venues = await database.get<VenueModel>('venues').query().fetch();
                for (const venue of venues) {
                    await venue.update(v => {
                        (v as any)._setRaw('deleted_flag', 1);
                    });
                }
            });
            return { success: true };
        } catch (err) {
            console.error('deleteAllVenues failed', err);
            return { error: err };
        }
    }

    async deleteVenuesBatch(venueIds: (number | string)[]): Promise<any> {
        try {
            await database.write(async () => {
                for (const venueId of venueIds) {
                    const venue = await database.get<VenueModel>('venues').find(venueId.toString());
                    await venue.update(v => {
                        (v as any)._setRaw('deleted_flag', 1);
                    });
                }
            });
            return { success: true, deleted: venueIds.length };
        } catch (err) {
            console.error('deleteVenuesBatch failed', err);
            throw err;
        }
    }

    // ============================================================================
    // EVENTS
    // ============================================================================

    async getAllEvents(): Promise<TennisEvent[]> {
        try {
            const events = await database.get<EventModel>('events').query(
                Q.where('deleted_flag', Q.notEq(1))
            ).fetch();

            const enrichedEvents = await Promise.all(events.map(async (event) => {
                // Get venues
                const venueXrefs = await database.get<EventVenueXref>('event_venue_xref').query(
                    Q.where('event_id', event.id)
                ).fetch();
                const venueNames: string[] = [];
                for (const xref of venueXrefs) {
                    try {
                        const venue = await database.get<VenueModel>('venues').find(xref.venueId);
                        venueNames.push(venue.name);
                    } catch { }
                }

                // Get teams
                const teamXrefs = await database.get<EventTeamXref>('event_team_xref').query(
                    Q.where('event_id', event.id)
                ).fetch();
                const teamNames: string[] = [];
                for (const xref of teamXrefs) {
                    try {
                        const team = await database.get<TeamModel>('teams').find(xref.teamId);
                        teamNames.push(team.name);
                    } catch { }
                }

                // Get event types
                const typeXrefs = await database.get<EventEventTypeXref>('event_event_type_xref').query(
                    Q.where('event_id', event.id)
                ).fetch();
                const typeNames: string[] = [];
                for (const xref of typeXrefs) {
                    try {
                        const eventType = await database.get<EventTypeModel>('event_types').find(xref.eventTypeId);
                        typeNames.push(eventType.name);
                    } catch { }
                }

                // Get systems
                const systemXrefs = await database.get<EventSystemXref>('event_system_xref').query(
                    Q.where('event_id', event.id)
                ).fetch();
                const systemNames: string[] = [];
                for (const xref of systemXrefs) {
                    try {
                        const system = await database.get<SystemModel>('systems').find(xref.systemId);
                        systemNames.push(system.name);
                    } catch { }
                }

                return {
                    event_id: event.id,  // Use string ID directly, don't parseInt UUIDs!
                    guid: event.guid || '',
                    name: event.name,
                    start_date: event.startDate,
                    end_date: event.endDate,
                    description: event.description,
                    status: event.status,
                    is_series_event: !!event.isSeriesEvent,
                    series_id: event.seriesId,
                    repeat_period: event.repeatPeriod as any,
                    repeat_interval: event.repeatInterval,
                    total_events: event.totalEvents,
                    venue_names: venueNames.join(', '),
                    team_names: teamNames.join(', '),
                    event_type_names: typeNames.join(', '),
                    system_names: systemNames.join(', '),
                } as TennisEvent;
            }));

            return enrichedEvents;
        } catch (err) {
            console.error('getAllEvents failed', err);
            return [];
        }
    }

    async getEventDetails(eventId: number | string): Promise<TennisEvent> {
        try {
            const event = await database.get<EventModel>('events').find(eventId.toString());

            // Get venue IDs
            const venueXrefs = await database.get<EventVenueXref>('event_venue_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const venueIds = venueXrefs.map((x: any) => x.venueId);  // UUIDs are strings

            // Get team IDs
            const teamXrefs = await database.get<EventTeamXref>('event_team_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const teamIds = teamXrefs.map((x: any) => x.teamId);  // UUIDs are strings

            // Get member IDs
            const memberXrefs = await database.get<EventMemberXref>('event_member_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const memberIds = memberXrefs.map((x: any) => x.memberId);  // UUIDs are strings

            // Get event type IDs
            const eventTypeXrefs = await database.get<EventEventTypeXref>('event_event_type_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const eventTypeIds = eventTypeXrefs.map((x: any) => x.eventTypeId);  // UUIDs are strings

            // Get system IDs
            const systemXrefs = await database.get<EventSystemXref>('event_system_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const systemIds = systemXrefs.map((x: any) => x.systemId);  // UUIDs are strings

            // Get court IDs
            const courtXrefs = await database.get<EventCourtXref>('event_court_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const courtIds = courtXrefs.map((x: any) => x.courtId);  // UUIDs are strings

            // Get field IDs
            const fieldXrefs = await database.get<EventFieldXref>('event_field_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const fieldIds = fieldXrefs.map((x: any) => x.fieldId);  // UUIDs are strings

            // Get season
            const seasonXrefs = await database.get<EventSeasonXref>('event_season_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const seasonId = seasonXrefs.length > 0 ? seasonXrefs[0].seasonId : undefined;  // UUIDs are strings
            const isTournament = seasonXrefs.length > 0 ? !!seasonXrefs[0].isTournament : undefined;

            // Get age group IDs (v2)
            const ageGroupXrefs = await database.get<EventAgeGroupXref>('event_age_group_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const ageGroupIds = ageGroupXrefs.map((x: any) => x.ageGroupId);

            // Get gender IDs (v2)
            const genderXrefs = await database.get<EventGenderXref>('event_gender_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const genderIds = genderXrefs.map((x: any) => x.genderId);

            // Get level IDs (v2)
            const levelXrefs = await database.get<EventLevelXref>('event_level_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const levelIds = levelXrefs.map((x: any) => x.levelId);

            // Get match type IDs (v2)
            const matchTypeXrefs = await database.get<EventMatchTypeXref>('event_match_type_xref').query(
                Q.where('event_id', event.id)
            ).fetch();
            const matchTypeIds = matchTypeXrefs.map((x: any) => x.matchTypeId);

            return {
                event_id: event.id,  // Use string ID directly
                guid: event.guid || '',
                name: event.name,
                start_date: event.startDate,
                end_date: event.endDate,
                description: event.description,
                status: event.status,
                is_series_event: !!event.isSeriesEvent,
                series_id: event.seriesId,
                repeat_period: event.repeatPeriod as any,
                repeat_interval: event.repeatInterval,
                total_events: event.totalEvents,
                venueIds,
                teamIds,
                memberIds,
                eventTypeIds,
                systemIds,
                courtIds,
                fieldIds,
                seasonId,
                isTournament,
                ageGroupIds,
                genderIds,
                levelIds,
                matchTypeIds,
            } as TennisEvent;
        } catch (err) {
            console.error('getEventDetails failed', err);
            throw err;
        }
    }


    async createEvent(eventData: {
        name: string;
        startDate: number;
        endDate?: number;
        description?: string;
        venueIds?: (number | string)[];
        teamIds?: (number | string)[];
        memberIds?: (number | string)[];
        eventTypeIds?: (number | string)[];
        systemIds?: (number | string)[];
        courtIds?: (number | string)[];
        fieldIds?: (number | string)[];
        seasonId?: number;
        isTournament?: boolean;
        // New v2 fields
        ageGroupIds?: (number | string)[];
        genderIds?: (number | string)[];
        levelIds?: (number | string)[];
        matchTypeIds?: (number | string)[];
        isSeriesEvent?: boolean;
        repeatPeriod?: 'hours' | 'days' | 'weeks';
        repeatInterval?: number;
        totalEvents?: number;
        lastEventDate?: number;
        lastEventTime?: string;
    }): Promise<any> {
        try {
            // If it's a series event, generate multiple events
            if (eventData.isSeriesEvent && eventData.repeatPeriod && eventData.repeatInterval) {
                const seriesId = generateGuid();
                const baseDate = new Date(eventData.startDate);
                const lastEventDateTime = eventData.lastEventDate ? new Date(eventData.lastEventDate) : null;
                const maxIterations = eventData.totalEvents || 1000;
                const createdEventIds: string[] = [];

                await database.write(async () => {
                    let i = 0;
                    while (i < maxIterations) {
                        // Calculate the date for this occurrence
                        let nextDate = new Date(baseDate);
                        switch (eventData.repeatPeriod) {
                            case 'hours':
                                nextDate.setHours(nextDate.getHours() + (i * eventData.repeatInterval!));
                                break;
                            case 'days':
                                nextDate.setDate(nextDate.getDate() + (i * eventData.repeatInterval!));
                                break;
                            case 'weeks':
                                nextDate.setDate(nextDate.getDate() + (i * eventData.repeatInterval! * 7));
                                break;
                        }

                        // Stop if we've passed the last event date/time
                        if (lastEventDateTime && nextDate > lastEventDateTime) break;

                        // Create the event for this occurrence
                        const event = await database.get<EventModel>('events').create(e => {
                            (e as any)._setRaw('guid', generateGuid());
                            e.name = eventData.name;
                            e.startDate = nextDate.getTime();
                            e.endDate = eventData.endDate || null;
                            e.description = eventData.description || null;
                            e.status = 'scheduled';
                            e.isSeriesEvent = 1;
                            e.seriesId = seriesId;
                            e.repeatPeriod = eventData.repeatPeriod ?? null;
                            e.repeatInterval = eventData.repeatInterval ?? null;
                            e.totalEvents = eventData.totalEvents || null;
                            e.lastEventDate = eventData.lastEventDate || null;
                            e.lastEventTime = eventData.lastEventTime || null;
                            (e as any)._setRaw('create_date', Date.now());
                        });
                        const eventId = event.id;
                        createdEventIds.push(eventId);

                        // Create all xrefs for this event
                        // Link venues
                        if (eventData.venueIds) {
                            for (const venueId of eventData.venueIds) {
                                await database.get<EventVenueXref>('event_venue_xref').create(x => {
                                    x.eventId = eventId;
                                    x.venueId = venueId.toString();
                                });
                            }
                        }

                        // Link teams
                        if (eventData.teamIds) {
                            for (const teamId of eventData.teamIds) {
                                await database.get<EventTeamXref>('event_team_xref').create(x => {
                                    (x as any)._setRaw('guid', generateGuid());
                                    x.eventId = eventId;
                                    x.teamId = teamId.toString();
                                });
                            }
                        }

                        // Link members
                        if (eventData.memberIds) {
                            for (const memberId of eventData.memberIds) {
                                await database.get<EventMemberXref>('event_member_xref').create(x => {
                                    (x as any)._setRaw('guid', generateGuid());
                                    x.eventId = eventId;
                                    x.memberId = memberId.toString();
                                });
                            }
                        }

                        // Link event types
                        if (eventData.eventTypeIds) {
                            for (const typeId of eventData.eventTypeIds) {
                                await database.get<EventEventTypeXref>('event_event_type_xref').create(x => {
                                    x.eventId = eventId;
                                    x.eventTypeId = typeId.toString();
                                });
                            }
                        }

                        // Link systems
                        if (eventData.systemIds) {
                            for (const systemId of eventData.systemIds) {
                                await database.get<EventSystemXref>('event_system_xref').create(x => {
                                    x.eventId = eventId;
                                    x.systemId = systemId.toString();
                                });
                            }
                        }

                        // Link courts
                        if (eventData.courtIds) {
                            for (const courtId of eventData.courtIds) {
                                await database.get<EventCourtXref>('event_court_xref').create(x => {
                                    x.eventId = eventId;
                                    x.courtId = courtId.toString();
                                });
                            }
                        }

                        // Link fields
                        if (eventData.fieldIds) {
                            for (const fieldId of eventData.fieldIds) {
                                await database.get<EventFieldXref>('event_field_xref').create(x => {
                                    x.eventId = eventId;
                                    x.fieldId = fieldId.toString();
                                });
                            }
                        }

                        // Link season
                        if (eventData.seasonId) {
                            await database.get<EventSeasonXref>('event_season_xref').create(x => {
                                x.eventId = eventId;
                                x.seasonId = eventData.seasonId!.toString();
                                x.isTournament = eventData.isTournament ? 1 : 0;
                            });
                        }

                        // Link age groups (v2)
                        if (eventData.ageGroupIds) {
                            for (const ageGroupId of eventData.ageGroupIds) {
                                await database.get<EventAgeGroupXref>('event_age_group_xref').create(x => {
                                    x.eventId = eventId;
                                    x.ageGroupId = ageGroupId.toString();
                                });
                            }
                        }

                        // Link genders (v2)
                        if (eventData.genderIds) {
                            for (const genderId of eventData.genderIds) {
                                await database.get<EventGenderXref>('event_gender_xref').create(x => {
                                    x.eventId = eventId;
                                    x.genderId = genderId.toString();
                                });
                            }
                        }

                        // Link levels (v2)
                        if (eventData.levelIds) {
                            for (const levelId of eventData.levelIds) {
                                await database.get<EventLevelXref>('event_level_xref').create(x => {
                                    x.eventId = eventId;
                                    x.levelId = levelId.toString();
                                });
                            }
                        }

                        // Link match types (v2)
                        if (eventData.matchTypeIds) {
                            for (const matchTypeId of eventData.matchTypeIds) {
                                await database.get<EventMatchTypeXref>('event_match_type_xref').create(x => {
                                    x.eventId = eventId;
                                    x.matchTypeId = matchTypeId.toString();
                                });
                            }
                        }

                        i++;
                    }
                });

                return { success: true, seriesId, eventIds: createdEventIds, count: createdEventIds.length };
            } else {
                // Single event creation
                let eventId = '';
                await database.write(async () => {
                    const event = await database.get<EventModel>('events').create(e => {
                        (e as any)._setRaw('guid', generateGuid());
                        e.name = eventData.name;
                        e.startDate = eventData.startDate;
                        e.endDate = eventData.endDate || null;
                        e.description = eventData.description || null;
                        e.status = 'scheduled';
                        e.isSeriesEvent = 0;
                        e.repeatPeriod = null;
                        e.repeatInterval = null;
                        e.totalEvents = null;
                        e.lastEventDate = null;
                        e.lastEventTime = null;
                        (e as any)._setRaw('create_date', Date.now());
                    });
                    eventId = event.id;

                    // Link venues
                    if (eventData.venueIds) {
                        for (const venueId of eventData.venueIds) {
                            await database.get<EventVenueXref>('event_venue_xref').create(x => {
                                x.eventId = eventId;
                                x.venueId = venueId.toString();
                            });
                        }
                    }

                    // Link teams
                    if (eventData.teamIds) {
                        for (const teamId of eventData.teamIds) {
                            await database.get<EventTeamXref>('event_team_xref').create(x => {
                                (x as any)._setRaw('guid', generateGuid());
                                x.eventId = eventId;
                                x.teamId = teamId.toString();
                            });
                        }
                    }

                    // Link members
                    if (eventData.memberIds) {
                        for (const memberId of eventData.memberIds) {
                            await database.get<EventMemberXref>('event_member_xref').create(x => {
                                (x as any)._setRaw('guid', generateGuid());
                                x.eventId = eventId;
                                x.memberId = memberId.toString();
                            });
                        }
                    }

                    // Link event types
                    if (eventData.eventTypeIds) {
                        for (const typeId of eventData.eventTypeIds) {
                            await database.get<EventEventTypeXref>('event_event_type_xref').create(x => {
                                x.eventId = eventId;
                                x.eventTypeId = typeId.toString();
                            });
                        }
                    }

                    // Link systems
                    if (eventData.systemIds) {
                        for (const systemId of eventData.systemIds) {
                            await database.get<EventSystemXref>('event_system_xref').create(x => {
                                x.eventId = eventId;
                                x.systemId = systemId.toString();
                            });
                        }
                    }

                    // Link courts
                    if (eventData.courtIds) {
                        for (const courtId of eventData.courtIds) {
                            await database.get<EventCourtXref>('event_court_xref').create(x => {
                                x.eventId = eventId;
                                x.courtId = courtId.toString();
                            });
                        }
                    }

                    // Link fields
                    if (eventData.fieldIds) {
                        for (const fieldId of eventData.fieldIds) {
                            await database.get<EventFieldXref>('event_field_xref').create(x => {
                                x.eventId = eventId;
                                x.fieldId = fieldId.toString();
                            });
                        }
                    }

                    // Link season
                    if (eventData.seasonId) {
                        await database.get<EventSeasonXref>('event_season_xref').create(x => {
                            x.eventId = eventId;
                            x.seasonId = eventData.seasonId!.toString();
                            x.isTournament = eventData.isTournament ? 1 : 0;
                        });
                    }

                    // Link age groups (v2)
                    if (eventData.ageGroupIds) {
                        for (const ageGroupId of eventData.ageGroupIds) {
                            await database.get<EventAgeGroupXref>('event_age_group_xref').create(x => {
                                x.eventId = eventId;
                                x.ageGroupId = ageGroupId.toString();
                            });
                        }
                    }

                    // Link genders (v2)
                    if (eventData.genderIds) {
                        for (const genderId of eventData.genderIds) {
                            await database.get<EventGenderXref>('event_gender_xref').create(x => {
                                x.eventId = eventId;
                                x.genderId = genderId.toString();
                            });
                        }
                    }

                    // Link levels (v2)
                    if (eventData.levelIds) {
                        for (const levelId of eventData.levelIds) {
                            await database.get<EventLevelXref>('event_level_xref').create(x => {
                                x.eventId = eventId;
                                x.levelId = levelId.toString();
                            });
                        }
                    }

                    // Link match types (v2)
                    if (eventData.matchTypeIds) {
                        for (const matchTypeId of eventData.matchTypeIds) {
                            await database.get<EventMatchTypeXref>('event_match_type_xref').create(x => {
                                x.eventId = eventId;
                                x.matchTypeId = matchTypeId.toString();
                            });
                        }
                    }
                });


                return { success: true, event_id: eventId };
            }
        } catch (err) {
            console.error('createEvent failed', err);
            return { error: err };
        }
    }

    async updateEvent(eventId: number | string, eventData: any): Promise<any> {
        try {
            await database.write(async () => {
                const event = await database.get<EventModel>('events').find(eventId.toString());

                // Update basic event fields
                await event.update(e => {
                    if (eventData.name !== undefined) e.name = eventData.name;
                    if (eventData.startDate !== undefined) e.startDate = eventData.startDate;
                    if (eventData.endDate !== undefined) e.endDate = eventData.endDate;
                    if (eventData.description !== undefined) e.description = eventData.description;
                    if (eventData.status !== undefined) e.status = eventData.status;
                    if (eventData.isSeriesEvent !== undefined) e.isSeriesEvent = eventData.isSeriesEvent ? 1 : 0;
                    if (eventData.repeatPeriod !== undefined) e.repeatPeriod = eventData.repeatPeriod;
                    if (eventData.repeatInterval !== undefined) e.repeatInterval = eventData.repeatInterval;
                    if (eventData.totalEvents !== undefined) e.totalEvents = eventData.totalEvents;
                    if (eventData.lastEventDate !== undefined) e.lastEventDate = eventData.lastEventDate;
                    if (eventData.lastEventTime !== undefined) e.lastEventTime = eventData.lastEventTime;
                    (e as any)._setRaw('update_date', Date.now());
                });

                // Delete and recreate venue xrefs
                const oldVenueXrefs = await database.get<EventVenueXref>('event_venue_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldVenueXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.venueIds) {
                    for (const venueId of eventData.venueIds) {
                        await database.get<EventVenueXref>('event_venue_xref').create((x: any) => {
                            x.eventId = eventId.toString();
                            x.venueId = venueId.toString();
                        });
                    }
                }

                // Delete and recreate team xrefs
                const oldTeamXrefs = await database.get<EventTeamXref>('event_team_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldTeamXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.teamIds) {
                    for (const teamId of eventData.teamIds) {
                        await database.get<EventTeamXref>('event_team_xref').create((x: any) => {
                            x._setRaw('guid', generateGuid());
                            x.eventId = eventId.toString();
                            x.teamId = teamId.toString();
                        });
                    }
                }

                // Delete and recreate member xrefs
                const oldMemberXrefs = await database.get<EventMemberXref>('event_member_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldMemberXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.memberIds) {
                    for (const memberId of eventData.memberIds) {
                        await database.get<EventMemberXref>('event_member_xref').create((x: any) => {
                            x._setRaw('guid', generateGuid());
                            x.eventId = eventId.toString();
                            x.memberId = memberId.toString();
                        });
                    }
                }

                // Delete and recreate event type xrefs
                const oldEventTypeXrefs = await database.get<EventEventTypeXref>('event_event_type_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldEventTypeXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.eventTypeIds) {
                    for (const typeId of eventData.eventTypeIds) {
                        await database.get<EventEventTypeXref>('event_event_type_xref').create((x: any) => {
                            x.eventId = eventId.toString();
                            x.eventTypeId = typeId.toString();
                        });
                    }
                }

                // Delete and recreate system xrefs
                const oldSystemXrefs = await database.get<EventSystemXref>('event_system_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldSystemXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.systemIds) {
                    for (const systemId of eventData.systemIds) {
                        await database.get<EventSystemXref>('event_system_xref').create((x: any) => {
                            x.eventId = eventId.toString();
                            x.systemId = systemId.toString();
                        });
                    }
                }

                // Delete and recreate court xrefs
                const oldCourtXrefs = await database.get<EventCourtXref>('event_court_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldCourtXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.courtIds) {
                    for (const courtId of eventData.courtIds) {
                        await database.get<EventCourtXref>('event_court_xref').create((x: any) => {
                            x.eventId = eventId.toString();
                            x.courtId = courtId.toString();
                        });
                    }
                }

                // Delete and recreate field xrefs
                const oldFieldXrefs = await database.get<EventFieldXref>('event_field_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldFieldXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.fieldIds) {
                    for (const fieldId of eventData.fieldIds) {
                        await database.get<EventFieldXref>('event_field_xref').create((x: any) => {
                            x.eventId = eventId.toString();
                            x.fieldId = fieldId.toString();
                        });
                    }
                }

                // Delete and recreate season xref
                const oldSeasonXrefs = await database.get<EventSeasonXref>('event_season_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldSeasonXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.seasonId) {
                    await database.get<EventSeasonXref>('event_season_xref').create((x: any) => {
                        x.eventId = eventId.toString();
                        x.seasonId = eventData.seasonId.toString();
                        x.isTournament = eventData.isTournament ? 1 : 0;
                    });
                }

                // Delete and recreate age group xrefs (v2)
                const oldAgeGroupXrefs = await database.get<EventAgeGroupXref>('event_age_group_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldAgeGroupXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.ageGroupIds) {
                    for (const ageGroupId of eventData.ageGroupIds) {
                        await database.get<EventAgeGroupXref>('event_age_group_xref').create((x: any) => {
                            x.eventId = eventId.toString();
                            x.ageGroupId = ageGroupId.toString();
                        });
                    }
                }

                // Delete and recreate gender xrefs (v2)
                const oldGenderXrefs = await database.get<EventGenderXref>('event_gender_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldGenderXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.genderIds) {
                    for (const genderId of eventData.genderIds) {
                        await database.get<EventGenderXref>('event_gender_xref').create((x: any) => {
                            x.eventId = eventId.toString();
                            x.genderId = genderId.toString();
                        });
                    }
                }

                // Delete and recreate level xrefs (v2)
                const oldLevelXrefs = await database.get<EventLevelXref>('event_level_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldLevelXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.levelIds) {
                    for (const levelId of eventData.levelIds) {
                        await database.get<EventLevelXref>('event_level_xref').create((x: any) => {
                            x.eventId = eventId.toString();
                            x.levelId = levelId.toString();
                        });
                    }
                }

                // Delete and recreate match type xrefs (v2)
                const oldMatchTypeXrefs = await database.get<EventMatchTypeXref>('event_match_type_xref').query(
                    Q.where('event_id', eventId.toString())
                ).fetch();
                for (const xref of oldMatchTypeXrefs) {
                    await xref.destroyPermanently();
                }
                if (eventData.matchTypeIds) {
                    for (const matchTypeId of eventData.matchTypeIds) {
                        await database.get<EventMatchTypeXref>('event_match_type_xref').create((x: any) => {
                            x.eventId = eventId.toString();
                            x.matchTypeId = matchTypeId.toString();
                        });
                    }
                }
            });


            return { success: true };
        } catch (err) {
            console.error('updateEvent failed', err);
            return { error: err };
        }
    }

    async deleteEvent(eventId: number | string, deleteSeries = false): Promise<any> {
        try {
            await database.write(async () => {
                const event = await database.get<EventModel>('events').find(eventId.toString());

                if (deleteSeries && event.seriesId) {
                    // Delete all events in series
                    const seriesEvents = await database.get<EventModel>('events').query(
                        Q.where('series_id', event.seriesId)
                    ).fetch();
                    for (const seriesEvent of seriesEvents) {
                        await seriesEvent.update(e => {
                            (e as any)._setRaw('deleted_flag', 1);
                        });
                    }
                } else {
                    // Delete single event
                    await event.update(e => {
                        (e as any)._setRaw('deleted_flag', 1);
                    });
                }
            });
            return { success: true };
        } catch (err) {
            console.error('deleteEvent failed', err);
            return { error: err };
        }
    }

    async deleteAllEvents(): Promise<any> {
        try {
            await database.write(async () => {
                const events = await database.get<EventModel>('events').query().fetch();
                for (const event of events) {
                    await event.update(e => {
                        (e as any)._setRaw('deleted_flag', 1);
                    });
                }
            });
            return { success: true };
        } catch (err) {
            console.error('deleteAllEvents failed', err);
            return { error: err };
        }
    }

    // ============================================================================
    // COURTS & FIELDS
    // ============================================================================

    async getVenueCourts(venueId: number | string): Promise<any[]> {
        try {
            const xrefs = await database.get<VenueCourtXref>('venue_court_xref').query(
                Q.where('venue_id', venueId.toString())
            ).fetch();

            const courts: any[] = [];
            for (const xref of xrefs) {
                try {
                    const court = await database.get<CourtModel>('courts').find(xref.courtId);
                    courts.push({
                        court_id: court.id,
                        name: court.name,
                        surface: court.surface,
                    });
                } catch { }
            }

            return courts;
        } catch (err) {
            console.error('getVenueCourts failed', err);
            return [];
        }
    }

    async createCourt(venueId: number | string, name: string, surface?: string): Promise<any> {
        try {
            let courtId = '';
            await database.write(async () => {
                const court = await database.get<CourtModel>('courts').create(c => {
                    (c as any)._setRaw('guid', generateGuid());
                    c.name = name;
                    c.surface = surface || null;
                });
                courtId = court.id;

                await database.get<VenueCourtXref>('venue_court_xref').create(x => {
                    x.venueId = venueId.toString();
                    x.courtId = courtId;
                });
            });

            return { success: true, court_id: courtId };
        } catch (err) {
            console.error('createCourt failed', err);
            return { error: err };
        }
    }

    async updateCourt(courtId: number | string, name: string, surface?: string): Promise<any> {
        try {
            await database.write(async () => {
                const court = await database.get<CourtModel>('courts').find(courtId.toString());
                await court.update(c => {
                    c.name = name;
                    if (surface !== undefined) c.surface = surface;
                });
            });
            return { success: true };
        } catch (err) {
            console.error('updateCourt failed', err);
            return { error: err };
        }
    }

    async deleteCourt(courtId: number | string): Promise<any> {
        try {
            await database.write(async () => {
                const court = await database.get<CourtModel>('courts').find(courtId.toString());
                await court.destroyPermanently();

                // Remove from venue xrefs
                const xrefs = await database.get<VenueCourtXref>('venue_court_xref').query(
                    Q.where('court_id', courtId.toString())
                ).fetch();
                for (const xref of xrefs) {
                    await xref.destroyPermanently();
                }
            });
            return { success: true };
        } catch (err) {
            console.error('deleteCourt failed', err);
            return { error: err };
        }
    }

    async getVenueFields(venueId: number | string): Promise<any[]> {
        try {
            const xrefs = await database.get<VenueFieldXref>('venue_field_xref').query(
                Q.where('venue_id', venueId.toString())
            ).fetch();

            const fields: any[] = [];
            for (const xref of xrefs) {
                try {
                    const field = await database.get<FieldModel>('fields').find(xref.fieldId);
                    fields.push({
                        field_id: field.id,
                        name: field.name,
                        surface: field.surface,
                    });
                } catch { }
            }

            return fields;
        } catch (err) {
            console.error('getVenueFields failed', err);
            return [];
        }
    }

    async createField(venueId: number | string, name: string, surface?: string): Promise<any> {
        try {
            let fieldId = '';
            await database.write(async () => {
                const field = await database.get<FieldModel>('fields').create(f => {
                    (f as any)._setRaw('guid', generateGuid());
                    f.name = name;
                    f.surface = surface || null;
                });
                fieldId = field.id;

                await database.get<VenueFieldXref>('venue_field_xref').create(x => {
                    x.venueId = venueId.toString();
                    x.fieldId = fieldId;
                });
            });

            return { success: true, field_id: fieldId };
        } catch (err) {
            console.error('createField failed', err);
            return { error: err };
        }
    }

    async updateField(fieldId: number | string, name: string, surface?: string): Promise<any> {
        try {
            await database.write(async () => {
                const field = await database.get<FieldModel>('fields').find(fieldId.toString());
                await field.update(f => {
                    f.name = name;
                    if (surface !== undefined) f.surface = surface;
                });
            });
            return { success: true };
        } catch (err) {
            console.error('updateField failed', err);
            return { error: err };
        }
    }

    async deleteField(fieldId: number | string): Promise<any> {
        try {
            await database.write(async () => {
                const field = await database.get<FieldModel>('fields').find(fieldId.toString());
                await field.destroyPermanently();

                const xrefs = await database.get<VenueFieldXref>('venue_field_xref').query(
                    Q.where('field_id', fieldId.toString())
                ).fetch();
                for (const xref of xrefs) {
                    await xref.destroyPermanently();
                }
            });
            return { success: true };
        } catch (err) {
            console.error('deleteField failed', err);
            return { error: err };
        }
    }

    // ============================================================================
    // LEGACY COMPATIBILITY
    // ============================================================================

    async addPlayer(player: any): Promise<string> {
        const result = await this.createMember({
            first_name: player.displayName?.split(' ')[0] || 'Unknown',
            last_name: player.displayName?.split(' ').slice(1).join(' ') || 'Player',
            display_name: player.displayName,
            gender: 'U',
        });
        return result.member_id?.toString() || '0';
    }

    async updatePlayer(): Promise<void> {
        console.warn('updatePlayer - use updateMember instead');
    }

    async deletePlayer(): Promise<void> {
        console.warn('deletePlayer - use deleteMember instead');
    }

    async clearAllPlayers(): Promise<void> {
        await this.deleteAllMembers();
    }

    parseClipboardData(text: string): any[] {
        // Legacy support
        return [];
    }
}

export const databaseService = new LocalDatabaseService();
