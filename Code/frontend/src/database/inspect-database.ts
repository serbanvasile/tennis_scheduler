/**
 * Database Inspection Utility
 * 
 * Run this in browser console to inspect WatermelonDB contents:
 * window.inspectDatabase()
 */

import { database } from './index';
import { Q } from '@nozbe/watermelondb';

async function getMemberDetails(memberId: string) {
    const member: any = await database.get('members').find(memberId);

    // Get contacts
    const contactXrefs = await database.get('member_contact_xref').query(
        Q.where('member_id', memberId)
    ).fetch();
    const contacts = [];
    for (const xref of contactXrefs) {
        try {
            const contact: any = await database.get('contacts').find(xref.contactId);
            contacts.push({
                type: contact.type,
                value: contact.value,
                label: contact.label || 'N/A',
                isPrimary: xref.isPrimary === 1
            });
        } catch (e) { }
    }

    // Get teams
    const teamXrefs = await database.get('team_member_xref').query(
        Q.where('member_id', memberId)
    ).fetch();
    const teams = [];
    for (const teamXref of teamXrefs) {
        try {
            const team: any = await database.get('teams').find(teamXref.teamId);

            // Get sport
            let sportName = 'N/A';
            const sportXrefs = await database.get('team_sport_xref').query(
                Q.where('team_id', team.id)
            ).fetch();
            if (sportXrefs.length > 0) {
                const sport: any = await database.get('sports').find(sportXrefs[0].sportId);
                sportName = sport.name;
            }

            // Get roles
            const roleXrefs = await database.get('member_role_xref').query(
                Q.and(
                    Q.where('member_id', memberId),
                    Q.where('context_table', 'teams'),
                    Q.where('context_id', team.id)
                )
            ).fetch();
            const roles = [];
            for (const rx of roleXrefs) {
                try {
                    const role: any = await database.get('roles').find(rx.roleId);
                    roles.push(role.name);
                } catch (e) { }
            }

            // Get positions
            const posXrefs = await database.get('member_position_xref').query(
                Q.and(
                    Q.where('member_id', memberId),
                    Q.where('context_table', 'teams'),
                    Q.where('context_id', team.id)
                )
            ).fetch();
            const positions = [];
            for (const px of posXrefs) {
                try {
                    const pos: any = await database.get('positions').find(px.positionId);
                    positions.push(pos.name);
                } catch (e) { }
            }

            teams.push({
                name: team.name,
                sport: sportName,
                skillId: teamXref.skillId || 'N/A',
                roles: roles.length > 0 ? roles : ['None'],
                positions: positions.length > 0 ? positions : ['None']
            });
        } catch (e) { }
    }

    return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        displayName: member.displayName || 'N/A',
        gender: member.gender || 'N/A',
        dominantSide: member.dominantSide || 'N/A',
        share: member.share || 0,
        shareType: member.shareType || 'N/A',
        contacts,
        teams
    };
}

export async function inspectDatabase() {
    console.log('=== DATABASE INSPECTION (Member-Centric View) ===\n');

    try {
        const members = await database.get('members').query().fetch();
        console.log(`� Found ${members.length} members\n`);

        if (members.length === 0) {
            console.log('⚠️ No members found in database!');
            return;
        }

        // Show first 3 members in detail (or all if less than 3)
        const membersToShow = members.slice(0, Math.min(3, members.length));

        for (let i = 0; i < membersToShow.length; i++) {
            const details = await getMemberDetails(membersToShow[i].id);

            console.log(`\n${'='.repeat(60)}`);
            console.log(`� MEMBER ${i + 1}: ${details.name}`);
            console.log(`${'='.repeat(60)}`);
            console.log(`  ID: ${details.id}`);
            console.log(`  Display Name: ${details.displayName}`);
            console.log(`  Gender: ${details.gender}`);
            console.log(`  Dominant Side: ${details.dominantSide}`);
            console.log(`  Share: ${details.share} (${details.shareType})`);

            console.log(`\n  📞 CONTACTS (${details.contacts.length}):`);
            if (details.contacts.length === 0) {
                console.log(`    ⚠️ NO CONTACTS FOUND - This is the problem!`);
            } else {
                details.contacts.forEach(c => {
                    console.log(`    ✓ ${c.type}: ${c.value} ${c.isPrimary ? '(PRIMARY)' : ''}`);
                });
            }

            console.log(`\n  🏆 TEAMS (${details.teams.length}):`);
            if (details.teams.length === 0) {
                console.log(`    ⚠️ Not assigned to any teams`);
            } else {
                details.teams.forEach(t => {
                    console.log(`    ✓ ${t.sport.toUpperCase()} • ${t.name}`);
                    console.log(`      Skill: ${t.skillId}`);
                    console.log(`      Roles: ${t.roles.join(', ')}`);
                    console.log(`      Positions: ${t.positions.join(', ')}`);
                });
            }
        }

        if (members.length > 3) {
            console.log(`\n... and ${members.length - 3} more members`);
        }

        // Summary
        const totalContacts = await database.get('contacts').query().fetch();
        const totalContactXrefs = await database.get('member_contact_xref').query().fetch();
        const totalTeamXrefs = await database.get('team_member_xref').query().fetch();

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 DATABASE SUMMARY`);
        console.log(`${'='.repeat(60)}`);
        console.log(`  Members: ${members.length}`);
        console.log(`  Contacts: ${totalContacts.length}`);
        console.log(`  Member-Contact Links: ${totalContactXrefs.length}`);
        console.log(`  Member-Team Links: ${totalTeamXrefs.length}`);

        if (totalContacts.length === 0) {
            console.log(`\n  ⚠️ ISSUE IDENTIFIED: No contacts in database!`);
            console.log(`     The import process is not creating contact records.`);
        } else if (totalContactXrefs.length === 0) {
            console.log(`\n  ⚠️ ISSUE IDENTIFIED: Contacts exist but aren't linked to members!`);
            console.log(`     The import process is not creating member_contact_xref records.`);
        }

        console.log('\n=== END INSPECTION ===');

    } catch (error) {
        console.error('Error inspecting database:', error);
    }
}

// Make it available globally for easy console access
if (typeof window !== 'undefined') {
    (window as any).inspectDatabase = inspectDatabase;
}
